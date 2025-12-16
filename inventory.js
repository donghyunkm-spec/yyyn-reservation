// 재고관리 시스템 - 프론트엔드 로직 (개선 버전)

// 전역 변수
let currentVendor = '삼시세끼';
let currentStandardVendor = '삼시세끼';
let items = {};
let inventory = {};
let dailyUsage = {}; // 하루 사용량 (기존 standardInventory 대체)
let holidays = {
    'store': [],
    '삼시세끼': [],
    'SPC': [],
    '기타': []
};
let lastOrderDates = {};

const API_BASE = '';
const PASSWORD = '1234'; // 실제 운영시 변경 필요

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
    renderInventoryForm();
    renderStandardForm();
    loadHolidays();
}

// 데이터 로드
async function loadData() {
    try {
        // 품목 정보 로드
        const itemsRes = await fetch(`${API_BASE}/api/inventory/items`);
        const itemsData = await itemsRes.json();
        if (itemsData.success) {
            items = itemsData.items;
        }
        
        // 현재 재고 로드
        const inventoryRes = await fetch(`${API_BASE}/api/inventory/current`);
        const inventoryData = await inventoryRes.json();
        if (inventoryData.success) {
            inventory = inventoryData.inventory;
        }
        
        // 하루 사용량 로드
        const usageRes = await fetch(`${API_BASE}/api/inventory/daily-usage`);
        const usageData = await usageRes.json();
        if (usageData.success) {
            dailyUsage = usageData.usage;
        }
        
        // 마지막 발주일 로드
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
        renderInventoryForm();
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

// 업체 선택 (재고입력)
function selectVendor(vendor) {
    currentVendor = vendor;
    document.querySelectorAll('#inventory-tab .vendor-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    renderInventoryForm();
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

// 재고 입력 폼 렌더링
function renderInventoryForm() {
    const formContainer = document.getElementById('inventoryForm');
    if (!formContainer) return;
    
    const vendorItems = items[currentVendor] || [];
    
    if (vendorItems.length === 0) {
        formContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">품목이 없습니다.</p>';
        return;
    }
    
    let html = '';
    vendorItems.forEach(item => {
        const itemKey = `${currentVendor}_${item.품목명}`;
        const currentStock = inventory[itemKey] || 0;
        const usage = dailyUsage[itemKey] || 0;
        
        html += `
            <div class="item-group">
                <div class="item-header">
                    <span class="item-name">${item.품목명}</span>
                    ${item.중요도 ? `<span class="item-importance importance-${item.중요도}">${item.중요도}</span>` : ''}
                </div>
                <div class="item-inputs">
                    <div class="input-group">
                        <label>현재 재고</label>
                        <input type="number" 
                               id="current_${itemKey}" 
                               value="${currentStock}" 
                               min="0" 
                               step="0.1"
                               inputmode="decimal">
                        <div class="unit-display">${item.발주단위}</div>
                    </div>
                    <div class="input-group">
                        <label>하루 사용량</label>
                        <input type="text" 
                               value="${usage} ${item.발주단위}" 
                               readonly 
                               style="background: #f8f9fa;">
                    </div>
                </div>
            </div>
        `;
    });
    
    formContainer.innerHTML = html;
}

// 하루 사용량 설정 폼 렌더링
function renderStandardForm() {
    const formContainer = document.getElementById('standardForm');
    if (!formContainer) return;
    
    const vendorItems = items[currentStandardVendor] || [];
    
    if (vendorItems.length === 0) {
        formContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">품목이 없습니다.</p>';
        return;
    }
    
    let html = '';
    vendorItems.forEach(item => {
        const itemKey = `${currentStandardVendor}_${item.품목명}`;
        const usage = dailyUsage[itemKey] || 0;
        
        html += `
            <div class="item-group">
                <div class="item-header">
                    <span class="item-name">${item.품목명}</span>
                    ${item.중요도 ? `<span class="item-importance importance-${item.중요도}">${item.중요도}</span>` : ''}
                </div>
                <div class="item-inputs">
                    <div class="input-group">
                        <label>하루 사용량</label>
                        <input type="number" 
                               id="usage_${itemKey}" 
                               value="${usage}" 
                               min="0" 
                               step="0.1"
                               inputmode="decimal">
                        <div class="unit-display">${item.발주단위}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    formContainer.innerHTML = html;
}

// 재고 저장 및 발주 확인
async function saveInventory() {
    try {
        // 모든 업체의 재고 데이터 수집
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
        
        // 서버에 저장 (재고 + 히스토리)
        const response = await fetch(`${API_BASE}/api/inventory/current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventory: newInventory })
        });
        
        const result = await response.json();
        
        if (result.success) {
            inventory = newInventory;
            showAlert('재고가 저장되었습니다.', 'success');
            
            // 발주 확인 프로세스 시작
            await checkOrderConfirmation();
        } else {
            showAlert('재고 저장 실패', 'error');
        }
    } catch (error) {
        console.error('재고 저장 오류:', error);
        showAlert('재고 저장 중 오류 발생', 'error');
    }
}

// ✅ 개선된 함수: 다음 배송일까지 필요한 일수 계산
function getDaysUntilNextDelivery(vendor) {
    const today = new Date();
    let daysCount = 0;
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + 1); // 내일(배송일)부터 체크
    
    // 최대 7일까지만 체크 (무한루프 방지)
    for (let i = 0; i < 7; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dow = checkDate.getDay();
        
        // 가게 휴무 체크 (가게 쉬면 소비 없음!)
        const isStoreHoliday = holidays['store'] && holidays['store'].includes(dateStr);
        
        // 업체 휴무 체크
        const isSundayForVendor = (vendor === '삼시세끼' || vendor === 'SPC') && dow === 0;
        const isVendorHoliday = holidays[vendor] && holidays[vendor].includes(dateStr);
        
        // 업체가 휴무인 경우
        if (isSundayForVendor || isVendorHoliday) {
            // 가게가 영업하면 재고가 필요하므로 일수 추가
            if (!isStoreHoliday) {
                daysCount++;
            }
            // 다음 날 체크 계속
            checkDate.setDate(checkDate.getDate() + 1);
            continue;
        }
        
        // 업체가 영업하는 날 (배송 가능일)
        // 가게가 영업하면 일수 추가
        if (!isStoreHoliday) {
            daysCount++;
        }
        
        // 배송 가능일 도달 -> 종료
        break;
    }
    
    // 최소 1일 보장 (혹시 모를 경우 대비)
    return Math.max(1, daysCount);
}

// 발주 확인 프로세스
async function checkOrderConfirmation() {
    const confirmItems = {
        '삼시세끼': [],
        'SPC': [],
        '기타': []
    };
    
    // 각 업체별 확인 필요 품목 체크
    for (const vendor in items) {
        const vendorItems = items[vendor];
        const daysNeeded = getDaysUntilNextDelivery(vendor);
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const currentStock = inventory[itemKey] || 0;
            const usage = dailyUsage[itemKey] || 0;
            const neededTotal = usage * daysNeeded;
            const orderAmount = Math.max(0, neededTotal - currentStock);
            const lastOrderDate = lastOrderDates[itemKey] || '';
            
            // 발주 확인 로직
            let needsConfirmation = false;
            let reason = '';
            
            if (vendor === '삼시세끼') {
                if (orderAmount === 0) {
                    if (item.중요도 === '상' || item.중요도 === '중') {
                        needsConfirmation = true;
                        reason = `중요도 ${item.중요도} 품목 미발주`;
                    } else if (item.중요도 === '하') {
                        const daysSinceLastOrder = getDaysSince(lastOrderDate);
                        if (daysSinceLastOrder > 7) {
                            needsConfirmation = true;
                            reason = `마지막 발주 후 ${daysSinceLastOrder}일 경과`;
                        }
                    }
                }
            } else if (vendor === 'SPC') {
                if (orderAmount === 0) {
                    needsConfirmation = true;
                    reason = 'SPC 품목 미발주';
                }
            } else if (vendor === '기타') {
                if (orderAmount > 0) {
                    needsConfirmation = true;
                    reason = '발주 확인 필요';
                }
            }
            
            if (needsConfirmation) {
                confirmItems[vendor].push({
                    ...item,
                    itemKey,
                    currentStock,
                    usage,
                    daysNeeded,
                    orderAmount,
                    lastOrderDate,
                    reason
                });
            }
        });
    }
    
    // 확인 필요한 항목이 있으면 모달 표시
    const hasConfirmItems = Object.values(confirmItems).some(arr => arr.length > 0);
    
    if (hasConfirmItems) {
        showConfirmModal(confirmItems);
    } else {
        // 바로 발주서로 이동
        proceedToOrder();
    }
}

// 발주 확인 모달 표시
function showConfirmModal(confirmItems) {
    const modal = document.getElementById('confirmModal');
    const content = document.getElementById('confirmContent');
    
    let html = '';
    
    for (const vendor in confirmItems) {
        const items = confirmItems[vendor];
        if (items.length > 0) {
            html += `
                <div class="confirm-section">
                    <h3>⚠️ ${vendor}</h3>
            `;
            
            items.forEach(item => {
                html += `
                    <div class="confirm-item">
                        <strong>${item.품목명}</strong><br>
                        ${item.reason}<br>
                        마지막 발주: ${item.lastOrderDate || '기록 없음'}<br>
                        현재 재고: ${item.currentStock} ${item.발주단위}<br>
                        하루 사용량: ${item.usage} ${item.발주단위}<br>
                        필요 일수: ${item.daysNeeded}일<br>
                        권장 발주량: ${Math.round(item.orderAmount * 10) / 10} ${item.발주단위}
                    </div>
                `;
            });
            
            html += `</div>`;
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

// 발주서로 진행
async function proceedToOrder() {
    closeConfirmModal();
    
    // 발주량 계산
    const orderData = {
        '삼시세끼': [],
        'SPC': [],
        '기타': []
    };
    
    for (const vendor in items) {
        const vendorItems = items[vendor];
        const daysNeeded = getDaysUntilNextDelivery(vendor);
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const currentStock = inventory[itemKey] || 0;
            const usage = dailyUsage[itemKey] || 0;
            
            const neededTotal = usage * daysNeeded;
            let orderAmount = Math.max(0, neededTotal - currentStock);
            orderAmount = Math.round(orderAmount * 10) / 10; // 소수점 1자리
            
            if (orderAmount > 0) {
                orderData[vendor].push({
                    ...item,
                    orderAmount,
                    daysNeeded
                });
            }
        });
    }
    
    // 발주 내역 저장
    const today = new Date();
    const orderRecord = {
        date: today.toISOString().split('T')[0],
        time: today.toTimeString().split(' ')[0].substring(0, 5),
        orders: orderData
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/inventory/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderRecord)
        });
        
        const result = await response.json();
        if (result.success) {
            showOrderModal(orderData);
        }
    } catch (error) {
        console.error('발주 저장 오류:', error);
        // 오류가 있어도 발주서는 표시
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
                html += `${item.품목명} ${item.orderAmount}${item.발주단위}\n`;
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
    // 재고 화면 갱신
    renderInventoryForm();
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
    
    // 클립보드에 복사
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

// 휴일 리스트 렌더링 (요일 포함)
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
function renderInventoryHistory(history) {
    const container = document.getElementById('inventoryHistoryList');
    if (!container) return;
    
    if (!history || history.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">재고 내역이 없습니다.</p>';
        return;
    }
    
    let html = '';
    history.forEach(record => {
        const date = new Date(record.date + 'T' + record.time);
        const dayOfWeek = WEEKDAYS[date.getDay()];
        
        for (const vendor in record.inventory) {
            const vendorItems = items[vendor] || [];
            if (vendorItems.length === 0) continue;
            
            html += `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-date">${record.date}(${dayOfWeek}) ${record.time}</span>
                        <span class="history-vendor">${vendor}</span>
                    </div>
                    <div class="history-items">
            `;
            
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const stock = record.inventory[itemKey] || 0;
                if (stock > 0 || true) { // 모든 품목 표시
                    html += `${item.품목명}: ${stock}${item.발주단위}<br>`;
                }
            });
            
            html += `
                    </div>
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
                    html += `${item.품목명}: ${item.orderAmount}${item.발주단위}<br>`;
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
