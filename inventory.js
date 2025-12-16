// 재고관리 시스템 - 프론트엔드 로직 (최종 버전)

// 전역 변수
let currentStandardVendor = '삼시세끼';
let items = {};
let inventory = {};
let dailyUsage = {};
let holidays = {
    'store': [],
    '삼시세끼': [],
    'SPC': [],
    '기타': []
};
let lastOrderDates = {};

const API_BASE = '';
const PASSWORD = '1234';

// 요일 한글 변환
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
});

// 로그인 체크
function checkLogin() {
    const loggedIn = sessionStorage.getItem('inventoryLoggedIn');
    if (loggedIn === 'true') {
        showMainScreen();
    }
}

// 로그인
function login() {
    const password = document.getElementById('loginPassword').value;
    if (password === PASSWORD) {
        sessionStorage.setItem('inventoryLoggedIn', 'true');
        showMainScreen();
        showAlert('로그인 성공!', 'success');
    } else {
        showAlert('비밀번호가 올바르지 않습니다.', 'error');
    }
}

// 로그아웃
function logout() {
    sessionStorage.removeItem('inventoryLoggedIn');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('loginPassword').value = '';
}

// 메인 화면 표시
async function showMainScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'block';
    
    await loadData();
    renderUnifiedInventoryForm();
    renderStandardForm();
    loadHolidays();
}

// 데이터 로드
async function loadData() {
    try {
        const itemsRes = await fetch(`${API_BASE}/api/inventory/items`);
        const itemsData = await itemsRes.json();
        if (itemsData.success) {
            items = itemsData.items;
        }
        
        const inventoryRes = await fetch(`${API_BASE}/api/inventory/current`);
        const inventoryData = await inventoryRes.json();
        if (inventoryData.success) {
            inventory = inventoryData.inventory;
        }
        
        const usageRes = await fetch(`${API_BASE}/api/inventory/daily-usage`);
        const usageData = await usageRes.json();
        if (usageData.success) {
            dailyUsage = usageData.usage;
        }
        
        const lastOrderRes = await fetch(`${API_BASE}/api/inventory/last-orders`);
        const lastOrderData = await lastOrderRes.json();
        if (lastOrderData.success) {
            lastOrderDates = lastOrderData.lastOrders;
        }
        
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        showAlert('데이터 로드 실패', 'error');
    }
}

// 탭 전환
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'inventory') {
        renderUnifiedInventoryForm();
    } else if (tabName === 'standard') {
        renderStandardForm();
    } else if (tabName === 'holidays') {
        loadHolidays();
    } else if (tabName === 'inventoryHistory') {
        loadInventoryHistory();
    } else if (tabName === 'orderHistory') {
        loadOrderHistory();
    }
}

// 업체 섹션으로 스크롤
function scrollToVendor(vendor) {
    const section = document.getElementById(`vendor-section-${vendor}`);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 2. 통합 재고 입력 폼 렌더링 (CSS 클래스 적용)
function renderUnifiedInventoryForm() {
    const formContainer = document.getElementById('inventoryForm');
    if (!formContainer) return;
    
    let html = '';
    const vendorOrder = ['삼시세끼', 'SPC', '기타'];
    
    vendorOrder.forEach(vendor => {
        const vendorItems = items[vendor] || [];
        if (vendorItems.length === 0) return;
        
        // 업체명 헤더 없이 바로 아이템 나열 (모바일 최적화)
        // SPC 여부에 따라 단위 결정 (SPC는 무조건 kg 입력)
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const currentStock = inventory[itemKey] || 0;
            const usage = dailyUsage[itemKey] || 0;
            
            // 표기는 품목의 원래 단위를 따르되, SPC는 입력 시 kg 기준임을 인지
            let displayUnit = item.발주단위;
            if (vendor === 'SPC') displayUnit = 'kg';

            html += `
                <div class="item-group">
                    <div class="item-header">
                        <span class="item-name">${item.품목명}</span>
                        ${item.중요도 ? `<span class="item-importance importance-${item.중요도}">${item.중요도}</span>` : ''}
                    </div>
                    <div class="item-inputs-inline">
                        <div class="input-inline">
                            <label>현재재고</label>
                            <div class="input-wrapper">
                                <input type="number" id="current_${itemKey}" value="${currentStock}" min="0" step="0.1" inputmode="decimal">
                                <span class="unit-text">${displayUnit}</span>
                            </div>
                        </div>
                        <div class="input-inline">
                            <label>하루사용량</label>
                            <div class="input-wrapper">
                                <input type="text" value="${usage}" readonly style="background: #f9f9f9; color: #666;">
                                <span class="unit-text">${displayUnit}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    });
    
    if (!html) html = '<p style="text-align: center; color: #999; padding: 30px;">품목이 없습니다.</p>';
    formContainer.innerHTML = html;
}

// ✅ SPC 박스 크기 추출 (발주 계산용)
function getSPCBoxSize(itemName) {
    // "삼겹살(양은이네/20kg/냉동/수입산)" → 20
    const match = itemName.match(/\/(\d+)kg\//);
    if (match) {
        return parseInt(match[1]);
    }
    return 20; // 기본값
}

// 업체 선택 (하루사용량)
function selectStandardVendor(vendor) {
    currentStandardVendor = vendor;
    document.querySelectorAll('#standard-tab .vendor-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    renderStandardForm();
}

// 하루 사용량 설정 폼 렌더링
// 3. 하루 사용량 설정 폼 (✅ 한 줄 리스트 형태로 개선)
function renderStandardForm() {
    const formContainer = document.getElementById('standardForm');
    if (!formContainer) return;
    
    const vendorItems = items[currentStandardVendor] || [];
    
    if (vendorItems.length === 0) {
        formContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">품목이 없습니다.</p>';
        return;
    }
    
    // 모바일 리스트 스타일 시작
    let html = '<div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid #eee;">';
    
    vendorItems.forEach(item => {
        const itemKey = `${currentStandardVendor}_${item.품목명}`;
        const usage = dailyUsage[itemKey] || 0;
        
        // SPC는 kg만 표시
        let displayUnit = item.발주단위;
        if (currentStandardVendor === 'SPC') {
            displayUnit = 'kg';
        }
        
        html += `
            <div class="standard-row">
                <div class="standard-name">
                    ${item.품목명}
                    ${item.중요도 ? `<span style="font-size:10px; color:#ef6c00; margin-left:4px;">(${item.중요도})</span>` : ''}
                </div>
                <div class="standard-input-area">
                    <div class="input-wrapper">
                        <input type="number" id="usage_${itemKey}" value="${usage}" min="0" step="0.1" inputmode="decimal">
                        <span class="unit-text">${displayUnit}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    formContainer.innerHTML = html;
}

// 재고 저장 및 발주 확인
async function saveInventory() {
    try {
        const newInventory = {};
        
        for (const vendor in items) {
            const vendorItems = items[vendor];
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const inputElement = document.getElementById(`current_${itemKey}`);
                if (inputElement) {
                    newInventory[itemKey] = parseFloat(inputElement.value) || 0;
                }
            });
        }
        
        const response = await fetch(`${API_BASE}/api/inventory/current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventory: newInventory })
        });
        
        const result = await response.json();
        
        if (result.success) {
            inventory = newInventory;
            showAlert('재고가 저장되었습니다.', 'success');
            await checkOrderConfirmation();
        } else {
            showAlert('재고 저장 실패', 'error');
        }
    } catch (error) {
        console.error('재고 저장 오류:', error);
        showAlert('재고 저장 중 오류 발생', 'error');
    }
}

// 다음 배송일까지 필요한 일수 계산
function getDaysUntilNextDelivery(vendor) {
    const today = new Date();
    let daysCount = 0;
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + 1);
    
    for (let i = 0; i < 7; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dow = checkDate.getDay();
        
        const isStoreHoliday = holidays['store'] && holidays['store'].includes(dateStr);
        const isSundayForVendor = (vendor === '삼시세끼' || vendor === 'SPC') && dow === 0;
        const isVendorHoliday = holidays[vendor] && holidays[vendor].includes(dateStr);
        
        if (isSundayForVendor || isVendorHoliday) {
            if (!isStoreHoliday) {
                daysCount++;
            }
            checkDate.setDate(checkDate.getDate() + 1);
            continue;
        }
        
        if (!isStoreHoliday) {
            daysCount++;
        }
        
        break;
    }
    
    return Math.max(1, daysCount);
}

// 배송 정보 계산
function getDeliveryInfo(vendor) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const daysNeeded = getDaysUntilNextDelivery(vendor);
    const endDate = new Date(tomorrow);
    endDate.setDate(endDate.getDate() + daysNeeded - 1);
    
    const tomorrowStr = `${tomorrow.getMonth()+1}/${tomorrow.getDate()}(${WEEKDAYS[tomorrow.getDay()]})`;
    const endDateStr = `${endDate.getMonth()+1}/${endDate.getDate()}(${WEEKDAYS[endDate.getDay()]})`;
    
    return {
        deliveryDate: tomorrowStr,
        endDate: endDateStr,
        days: daysNeeded
    };
}

// 4. 발주 확인 계산 로직 (✅ 단위 및 배수 처리 개선)
async function checkOrderConfirmation() {
    const confirmItems = { '삼시세끼': [], 'SPC': [], '기타': [] };
    
    for (const vendor in items) {
        const vendorItems = items[vendor];
        const daysNeeded = getDaysUntilNextDelivery(vendor);
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const currentStock = inventory[itemKey] || 0;
            const usage = dailyUsage[itemKey] || 0;
            const neededTotal = usage * daysNeeded;
            
            // 순수 부족분 (kg)
            let orderAmountKg = Math.max(0, neededTotal - currentStock);
            
            let displayQty = 0;
            let displayUnit = item.발주단위;

            if (vendor === 'SPC') {
                const spcInfo = getSPCInfo(item.품목명);
                
                if (orderAmountKg > 0) {
                    // 부족분(kg)을 포장단위(weight)로 나누어 필요한 팩 수 계산 (올림)
                    // 예: 삼겹살(20kg) -> 5kg 부족 -> 0.25 -> 1팩(20kg) 발주
                    const packsNeeded = Math.ceil(orderAmountKg / spcInfo.weight);
                    
                    if (spcInfo.unit === 'kg') {
                        // 발주단위가 kg이면: 팩수 * 무게로 표시 (예: 20kg, 40kg...)
                        displayQty = packsNeeded * spcInfo.weight;
                        displayUnit = 'kg';
                    } else {
                        // 발주단위가 box/pak이면: 팩수로 표시 (예: 1box, 2box...)
                        displayQty = packsNeeded;
                        displayUnit = spcInfo.unit;
                    }
                }
            } else {
                // 일반 업체는 소수점 첫째자리까지
                displayQty = Math.round(orderAmountKg * 10) / 10;
            }
            
            const lastOrderDate = lastOrderDates[itemKey] || '';
            let needsConfirmation = false;
            let reason = '';
            
            // (기존 확인 조건 유지)
            if (vendor === '삼시세끼') {
                if (displayQty === 0 && (item.중요도 === '상' || item.중요도 === '중')) {
                    needsConfirmation = true; reason = `중요도 ${item.중요도} 품목 미발주`;
                }
            } else if (vendor === 'SPC') {
                if (displayQty === 0) {
                    needsConfirmation = true; reason = 'SPC 품목 미발주';
                }
            }
            
            if (needsConfirmation || (vendor === '기타' && displayQty > 0)) {
                confirmItems[vendor].push({
                    ...item,
                    itemKey,
                    currentStock,
                    orderAmount: displayQty,
                    displayUnit,
                    reason,
                    lastOrderDate
                });
            }
        });
    }
    
    const hasConfirmItems = Object.values(confirmItems).some(arr => arr.length > 0);
    if (hasConfirmItems) showConfirmModal(confirmItems);
    else proceedToOrder();
}

// 발주 확인 모달 표시 (테이블 형태)
function showConfirmModal(confirmItems) {
    const modal = document.getElementById('confirmModal');
    const content = document.getElementById('confirmContent');
    
    let html = '';
    
    for (const vendor in confirmItems) {
        const items = confirmItems[vendor];
        if (items.length > 0) {
            const deliveryInfo = getDeliveryInfo(vendor);
            
            html += `
                <div class="delivery-info-box">
                    <h3>📦 ${vendor}</h3>
                    <p>📅 배송일: ${deliveryInfo.deliveryDate} (내일)</p>
                    <p>📊 사용기간: ${deliveryInfo.deliveryDate} ~ ${deliveryInfo.endDate} (${deliveryInfo.days}일)</p>
                </div>
                
                <div class="confirm-table-wrapper">
                    <table class="confirm-table">
                        <thead>
                            <tr>
                                <th>품목명</th>
                                <th>사유</th>
                                <th>마지막발주</th>
                                <th>현재재고</th>
                                <th>권장발주</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            items.forEach(item => {
                html += `
                    <tr>
                        <td><strong>${item.품목명}</strong></td>
                        <td style="color: #f44336;">${item.reason}</td>
                        <td>${item.lastOrderDate || '-'}</td>
                        <td>${item.currentStock} ${item.displayUnit}</td>
                        <td><strong>${Math.round(item.orderAmount * 10) / 10} ${item.displayUnit}</strong></td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
    
    if (!html) {
        html = '<p style="text-align: center; color: #999;">확인이 필요한 항목이 없습니다.</p>';
    }
    
    content.innerHTML = html;
    modal.classList.add('active');
}

// 발주 확인 모달 닫기
function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

// 5. 최종 발주 진행 (✅ 로직 동일 적용)
async function proceedToOrder() {
    closeConfirmModal();
    
    const orderData = { '삼시세끼': [], 'SPC': [], '기타': [] };
    
    for (const vendor in items) {
        const vendorItems = items[vendor];
        const daysNeeded = getDaysUntilNextDelivery(vendor);
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const currentStock = inventory[itemKey] || 0;
            const usage = dailyUsage[itemKey] || 0;
            const neededTotal = usage * daysNeeded;
            let orderAmountKg = Math.max(0, neededTotal - currentStock);
            
            let finalQty = 0;
            let finalUnit = item.발주단위;

            if (vendor === 'SPC') {
                const spcInfo = getSPCInfo(item.품목명);
                
                if (orderAmountKg > 0) {
                    const packsNeeded = Math.ceil(orderAmountKg / spcInfo.weight);
                    
                    if (spcInfo.unit === 'kg') {
                        finalQty = packsNeeded * spcInfo.weight; // 20, 40kg...
                        finalUnit = 'kg';
                    } else {
                        finalQty = packsNeeded; // 1, 2 box...
                        finalUnit = spcInfo.unit;
                    }
                }
            } else {
                finalQty = Math.round(orderAmountKg * 10) / 10;
            }
            
            if (finalQty > 0) {
                orderData[vendor].push({
                    ...item,
                    orderAmount: finalQty,
                    daysNeeded,
                    displayUnit: finalUnit
                });
            }
        });
    }
    
    // (서버 전송 로직 생략 - 기존과 동일)
    const today = new Date();
    const orderRecord = {
        date: today.toISOString().split('T')[0],
        time: today.toTimeString().split(' ')[0].substring(0, 5),
        orders: orderData
    };

    try {
        await fetch(`${API_BASE}/api/inventory/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderRecord)
        });
        showOrderModal(orderData);
    } catch (error) {
        console.error(error);
        showOrderModal(orderData);
    }
}

// 발주서 모달 표시
function showOrderModal(orderData) {
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderContent');
    
    let html = '';
    
    for (const vendor in orderData) {
        const items = orderData[vendor];
        if (items.length > 0) {
            html += `
                <div class="order-section">
                    <h3>${vendor} (${items[0].daysNeeded}일치)</h3>
                    <div class="order-items" id="order_${vendor}">`;
            
            items.forEach(item => {
                html += `${item.품목명} ${item.orderAmount}${item.displayUnit}\n`;
            });
            
            html += `</div>
                </div>
            `;
        }
    }
    
    if (!html) {
        html = '<p style="text-align: center; color: #999;">발주할 품목이 없습니다.</p>';
    }
    
    content.innerHTML = html;
    modal.classList.add('active');
}

// 발주서 모달 닫기
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
    renderUnifiedInventoryForm();
}

// 카카오톡 복사
function copyToKakao() {
    let copyText = '📦 발주 리스트\n\n';
    
    const orderSections = document.querySelectorAll('.order-section');
    orderSections.forEach(section => {
        const vendor = section.querySelector('h3').textContent;
        const items = section.querySelector('.order-items').textContent;
        copyText += `[${vendor}]\n${items}\n`;
    });
    
    copyText += `\n발주일시: ${new Date().toLocaleString('ko-KR')}`;
    
    navigator.clipboard.writeText(copyText).then(() => {
        showAlert('카카오톡 복사 완료! 📋', 'success');
    }).catch(err => {
        console.error('복사 실패:', err);
        showAlert('복사 실패', 'error');
    });
}

// 하루 사용량 저장
async function saveStandard() {
    try {
        const newUsage = {};
        
        for (const vendor in items) {
            const vendorItems = items[vendor];
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const inputElement = document.getElementById(`usage_${itemKey}`);
                if (inputElement) {
                    newUsage[itemKey] = parseFloat(inputElement.value) || 0;
                }
            });
        }
        
        const response = await fetch(`${API_BASE}/api/inventory/daily-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usage: newUsage })
        });
        
        const result = await response.json();
        
        if (result.success) {
            dailyUsage = newUsage;
            showAlert('하루 사용량이 저장되었습니다.', 'success');
        } else {
            showAlert('저장 실패', 'error');
        }
    } catch (error) {
        console.error('하루 사용량 저장 오류:', error);
        showAlert('저장 중 오류 발생', 'error');
    }
}

// 휴일 로드
async function loadHolidays() {
    try {
        const response = await fetch(`${API_BASE}/api/inventory/holidays`);
        const result = await response.json();
        
        if (result.success) {
            holidays = result.holidays;
            renderAllHolidays();
        }
    } catch (error) {
        console.error('휴일 로드 실패:', error);
    }
}

// 모든 휴일 렌더링
function renderAllHolidays() {
    renderHolidayList('store', 'storeHolidayList');
    renderHolidayList('삼시세끼', 'samsiHolidayList');
    renderHolidayList('SPC', 'spcHolidayList');
    renderHolidayList('기타', 'etcHolidayList');
}

// 휴일 리스트 렌더링
function renderHolidayList(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const holidayList = holidays[type] || [];
    
    if (holidayList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 15px;">등록된 휴일이 없습니다.</p>';
        return;
    }
    
    let html = '';
    holidayList.forEach((dateStr, index) => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = WEEKDAYS[date.getDay()];
        
        html += `
            <div class="holiday-item">
                <span class="holiday-date">${dateStr}(${dayOfWeek})</span>
                <button class="btn-danger" onclick="removeHoliday('${type}', ${index})">삭제</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 휴일 추가
async function addHoliday(type) {
    let dateInput;
    if (type === 'store') {
        dateInput = document.getElementById('storeHolidayDate');
    } else if (type === '삼시세끼') {
        dateInput = document.getElementById('samsiHolidayDate');
    } else if (type === 'SPC') {
        dateInput = document.getElementById('spcHolidayDate');
    } else if (type === '기타') {
        dateInput = document.getElementById('etcHolidayDate');
    }
    
    const date = dateInput.value;
    
    if (!date) {
        showAlert('날짜를 선택하세요.', 'error');
        return;
    }
    
    if (!holidays[type]) {
        holidays[type] = [];
    }
    
    if (holidays[type].includes(date)) {
        showAlert('이미 등록된 날짜입니다.', 'error');
        return;
    }
    
    holidays[type].push(date);
    holidays[type].sort();
    
    try {
        const response = await fetch(`${API_BASE}/api/inventory/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holidays })
        });
        
        const result = await response.json();
        if (result.success) {
            dateInput.value = '';
            renderAllHolidays();
            showAlert('휴일이 추가되었습니다.', 'success');
        }
    } catch (error) {
        console.error('휴일 추가 오류:', error);
        showAlert('휴일 추가 실패', 'error');
    }
}

// 휴일 삭제
async function removeHoliday(type, index) {
    if (!confirm('이 휴일을 삭제하시겠습니까?')) return;
    
    holidays[type].splice(index, 1);
    
    try {
        const response = await fetch(`${API_BASE}/api/inventory/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holidays })
        });
        
        const result = await response.json();
        if (result.success) {
            renderAllHolidays();
            showAlert('휴일이 삭제되었습니다.', 'success');
        }
    } catch (error) {
        console.error('휴일 삭제 오류:', error);
        showAlert('휴일 삭제 실패', 'error');
    }
}

// 재고 내역 로드
async function loadInventoryHistory() {
    try {
        const period = document.getElementById('invHistoryPeriod').value;
        const vendor = document.getElementById('invHistoryVendor').value;
        
        const response = await fetch(`${API_BASE}/api/inventory/history?period=${period}&vendor=${vendor}`);
        const result = await response.json();
        
        if (result.success) {
            renderInventoryHistory(result.history);
        }
    } catch (error) {
        console.error('재고 내역 로드 실패:', error);
        showAlert('재고 내역 로드 실패', 'error');
    }
}

// 재고 내역 렌더링
// 4. 재고 내역 렌더링 수정 (중복 제거 및 UI 개선)
function renderInventoryHistory(history) {
    const container = document.getElementById('inventoryHistoryList');
    if (!container) return;
    
    if (!history || history.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">기록이 없습니다.</p>';
        return;
    }

    // ✅ 날짜별 최신 데이터만 필터링 (하루에 한 세트만)
    const distinctHistory = {};
    history.forEach(record => {
        // 날짜를 키로 사용하여 덮어씌움 -> 자연스럽게 가장 마지막(최신) 시간대 데이터만 남음
        distinctHistory[record.date] = record;
    });

    // 최신 날짜순 정렬
    const sortedDates = Object.keys(distinctHistory).sort().reverse();
    
    let html = '';
    
    sortedDates.forEach(dateStr => {
        const record = distinctHistory[dateStr];
        const dateObj = new Date(dateStr);
        const dayOfWeek = WEEKDAYS[dateObj.getDay()];

        // 이 날짜의 데이터에 포함된 모든 업체 아이템을 표시
        let itemsHtml = '';
        let hasItems = false;

        for (const vendor in items) {
            // 해당 레코드에 이 업체 데이터가 있는지 확인
            const vendorItems = items[vendor] || [];
            
            // 이 업체의 아이템 중 하나라도 기록이 있으면 표시
            const recordedItems = vendorItems.filter(item => {
                const key = `${vendor}_${item.품목명}`;
                return record.inventory[key] !== undefined;
            });

            if (recordedItems.length > 0) {
                hasItems = true;
                itemsHtml += `
                    <tr>
                        <td colspan="2" style="background:#f9f9f9; padding:8px 4px; font-weight:bold; color:#666;">
                            📦 ${vendor}
                        </td>
                    </tr>
                `;
                
                recordedItems.forEach(item => {
                    const itemKey = `${vendor}_${item.품목명}`;
                    const stock = record.inventory[itemKey];
                    const unit = vendor === 'SPC' ? 'kg' : item.발주단위; // 재고는 항상 kg 유지
                    
                    itemsHtml += `
                        <tr>
                            <td style="padding-left: 10px;">${item.품목명}</td>
                            <td>${stock} ${unit}</td>
                        </tr>
                    `;
                });
            }
        }

        if (hasItems) {
            html += `
                <div class="history-card">
                    <div class="history-card-header">
                        <span style="font-weight:bold; font-size:1.1em;">📅 ${dateStr} (${dayOfWeek})</span>
                        <span class="history-time-badge">마지막 저장 ${record.time}</span>
                    </div>
                    <table class="history-table">
                        ${itemsHtml}
                    </table>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

// 발주 내역 로드
async function loadOrderHistory() {
    try {
        const period = document.getElementById('orderPeriodFilter').value;
        const vendor = document.getElementById('orderVendorFilter').value;
        
        const response = await fetch(`${API_BASE}/api/inventory/orders?period=${period}&vendor=${vendor}`);
        const result = await response.json();
        
        if (result.success) {
            renderOrderHistory(result.orders);
        }
    } catch (error) {
        console.error('발주 내역 로드 실패:', error);
        showAlert('발주 내역 로드 실패', 'error');
    }
}

// 발주 내역 렌더링
function renderOrderHistory(orders) {
    const container = document.getElementById('orderHistoryList');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">발주 내역이 없습니다.</p>';
        return;
    }
    
    let html = '';
    orders.forEach(order => {
        const date = new Date(order.date + 'T' + order.time);
        const dayOfWeek = WEEKDAYS[date.getDay()];
        
        for (const vendor in order.orders) {
            const items = order.orders[vendor];
            if (items.length > 0) {
                html += `
                    <div class="history-item">
                        <div class="history-header">
                            <span class="history-date">${order.date}(${dayOfWeek}) ${order.time}</span>
                            <span class="history-vendor">${vendor}</span>
                        </div>
                        <div class="history-items">
                `;
                
                items.forEach(item => {
                    const displayUnit = item.displayUnit || item.발주단위;
                    html += `${item.품목명}: ${item.orderAmount}${displayUnit}<br>`;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
        }
    });
    
    container.innerHTML = html;
}

// 유틸리티 함수
function getDaysSince(dateString) {
    if (!dateString) return 999;
    const lastDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}


// 1. SPC 품목 정보 파싱 (로직 정교화)
function getSPCInfo(itemName) {
    let info = {
        weight: 1,      // 포장 단위 무게 (기본 1kg)
        unit: 'kg'      // 발주 단위
    };

    // 1. 무게 추출 (예: /20kg/, /10kg/)
    const weightMatch = itemName.match(/\/(\d+(?:\.\d+)?)kg\//);
    if (weightMatch) {
        info.weight = parseFloat(weightMatch[1]);
    }

    // 2. 단위 추출 (문자열 끝부분 box, pak, kg, ea, 통 등)
    // SPC발주품목.txt 패턴: ...box, ...pak, ...kg
    const unitMatch = itemName.match(/(box|pak|kg|통|ea)$/i);
    if (unitMatch) {
        info.unit = unitMatch[1].toLowerCase();
    } else {
        info.unit = 'kg'; 
    }

    return info;
}