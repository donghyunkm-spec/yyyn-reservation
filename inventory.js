// 재고관리 시스템 - 프론트엔드 로직 (통합 최종 수정 버전)

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

// ==========================================================
// 추가된 전역 변수
// ==========================================================
let yesterdayInventory = {}; // 어제 재고
let currentSortOrder = 'default'; // 정렬 순서: 'default' 또는 'lastOrder'
let allItemsWithInfo = []; // 정렬용 전체 품목 리스트


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
    await loadYesterdayInventory(); // 이 줄 추가
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
        console.error('데이터 로드 실패 (로컬 모드일 수 있음):', error);
        // showAlert('데이터 로드 실패', 'error'); 
        // 데이터가 없어도 UI 렌더링을 위해 진행
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
    
    // 버튼 활성화 처리
    const btn = document.querySelector(`button[onclick="showTab('${tabName}')"]`);
    if(btn) btn.classList.add('active');

    // 탭 내용 활성화
    const content = document.getElementById(`${tabName}-tab`);
    if(content) content.classList.add('active');
    
    // 탭별 초기화 로직
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
    } else if (tabName === 'manageItems') {
        // [NEW] 품목 관리 탭 진입 시 렌더링
        renderManageItems();
    }
}

// 업체 섹션으로 스크롤
function scrollToVendor(vendor) {
    const section = document.getElementById(`vendor-section-${vendor}`);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ==========================================================
// 수정된 재고 입력 폼 렌더링 (어제 재고 + 마지막 발주일 + 정렬)
// ==========================================================
function renderUnifiedInventoryForm() {
    const formContainer = document.getElementById('inventoryForm');
    if (!formContainer) return;
    
    let html = '';
    const vendorOrder = ['삼시세끼', 'SPC', '기타'];
    
    // 정렬 로직
    if (currentSortOrder === 'lastOrder') {
        // 모든 품목을 하나의 배열로 모아서 마지막 발주일 기준으로 정렬
        allItemsWithInfo = [];
        
        for (const vendor of vendorOrder) {
            const vendorItems = items[vendor] || [];
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const lastOrderDate = lastOrderDates[itemKey] || '';
                const daysSince = lastOrderDate ? getDaysSince(lastOrderDate) : 999;
                
                allItemsWithInfo.push({
                    vendor,
                    item,
                    itemKey,
                    lastOrderDate,
                    daysSince
                });
            });
        }
        
        // 발주일 오래된 순으로 정렬
        allItemsWithInfo.sort((a, b) => b.daysSince - a.daysSince);
        
        // 렌더링
        html += `<div class="vendor-section"><h3 style="margin-bottom:10px; color:#4CAF50;">📅 발주일 오래된 순</h3>`;
        
        allItemsWithInfo.forEach(({vendor, item, itemKey, lastOrderDate, daysSince}) => {
            html += renderItemGroup(vendor, item, itemKey, lastOrderDate, daysSince);
        });
        
        html += `</div>`;
        
    } else {
        // 기본 순서 (업체별)
        vendorOrder.forEach(vendor => {
            const vendorItems = items[vendor] || [];
            if (vendorItems.length === 0) return;
            
            html += `<div id="vendor-section-${vendor}" class="vendor-section">`;
            html += `<h3 style="margin-bottom:10px; color:#4CAF50;">📦 ${vendor}</h3>`;
            
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const lastOrderDate = lastOrderDates[itemKey] || '';
                const daysSince = lastOrderDate ? getDaysSince(lastOrderDate) : 999;
                
                html += renderItemGroup(vendor, item, itemKey, lastOrderDate, daysSince);
            });
            
            html += `</div>`;
        });
    }
    
    if (!html) html = '<p style="text-align: center; color: #999; padding: 30px;">품목이 없습니다.</p>';
    formContainer.innerHTML = html;
}

// 개별 품목 렌더링 함수 (어제 재고 표시 포함)
function renderItemGroup(vendor, item, itemKey, lastOrderDate, daysSince) {
    const currentStock = inventory[itemKey] || 0;
    const usage = dailyUsage[itemKey] || 0;
    const yesterdayStock = yesterdayInventory[itemKey] || null;
    
    let displayUnit = item.발주단위;
    if (vendor === 'SPC') {
        const spcInfo = getSPCInfo(item.품목명);
        displayUnit = spcInfo.inputUnit;
    }
    
    const displayStockValue = (currentStock === 0) ? '' : currentStock;
    
    // 마지막 발주일 표시
    let lastOrderDisplay = '';
    if (lastOrderDate) {
        const daysColor = daysSince > 10 ? '#f44336' : (daysSince > 7 ? '#ef6c00' : '#666');
        lastOrderDisplay = `<span style="font-size:11px; color:${daysColor}; margin-left:8px;">📅 ${lastOrderDate} (${daysSince}일전)</span>`;
    } else {
        lastOrderDisplay = `<span style="font-size:11px; color:#999; margin-left:8px;">📅 발주기록없음</span>`;
    }
    
    // 어제 재고 표시
    let yesterdayDisplay = '';
    if (yesterdayStock !== null) {
        yesterdayDisplay = `<span style="font-size:10px; color:#999; margin-left:5px;">(어제: ${yesterdayStock})</span>`;
    }
    
    let html = `
        <div class="item-group">
            <div class="item-header">
                <span class="item-name">${item.품목명}${lastOrderDisplay}</span>
                ${item.중요도 ? `<span class="item-importance importance-${item.중요도}">${item.중요도}</span>` : ''}
            </div>
            <div class="item-inputs-inline">
                <div class="input-inline">
                    <label>현재재고${yesterdayDisplay}</label>
                    <div class="input-wrapper">
                        <input type="number" id="current_${itemKey}" value="${displayStockValue}" min="0" step="0.1" inputmode="decimal" placeholder="0">
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
    
    return html;
}



// 업체 선택 (하루사용량)
function selectStandardVendor(vendor) {
    currentStandardVendor = vendor;
    document.querySelectorAll('#standard-tab .vendor-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.vendor === vendor) btn.classList.add('active');
    });
    renderStandardForm();
}

// 3. 하루 사용량 설정 폼 (수정됨: SPC 단위 동적 처리)
function renderStandardForm() {
    const formContainer = document.getElementById('standardForm');
    if (!formContainer) return;
    
    const vendorItems = items[currentStandardVendor] || [];
    
    if (vendorItems.length === 0) {
        formContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">품목이 없습니다.</p>';
        return;
    }
    
    let html = '<div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid #eee;">';
    
    vendorItems.forEach(item => {
        const itemKey = `${currentStandardVendor}_${item.품목명}`;
        const usage = dailyUsage[itemKey] || 0;
        
        // [수정] SPC 단위 동적 처리
        let displayUnit = item.발주단위;
        if (currentStandardVendor === 'SPC') {
            const spcInfo = getSPCInfo(item.품목명);
            displayUnit = spcInfo.inputUnit;
        }
        
        const displayUsageValue = (usage === 0) ? '' : usage;

        html += `
            <div class="standard-row">
                <div class="standard-name">
                    ${item.품목명}
                    ${item.중요도 ? `<span style="font-size:10px; color:#ef6c00; margin-left:4px;">(${item.중요도})</span>` : ''}
                </div>
                <div class="standard-input-area">
                    <div class="input-wrapper">
                        <input type="number" id="usage_${itemKey}" value="${displayUsageValue}" min="0" step="0.1" inputmode="decimal" placeholder="0">
                        <span class="unit-text">${displayUnit}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    formContainer.innerHTML = html;
}

// 재고 저장 및 발주 확인 (수정됨: 빈 칸을 0으로 처리하여 저장)
async function saveInventory() {
    try {
        const newInventory = { ...inventory }; // 기존 데이터 복사
        
        for (const vendor in items) {
            const vendorItems = items[vendor];
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const inputElement = document.getElementById(`current_${itemKey}`);
                if (inputElement) {
                    const val = inputElement.value.trim();
                    // 빈 칸이면 0으로 저장
                    newInventory[itemKey] = val === '' ? 0 : parseFloat(val);
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
        console.error('재고 저장 오류 (로컬 모드):', error);
        // API 실패 시에도 진행 (테스트용)
        inventory = newInventory;
        showAlert('재고가 저장되었습니다(로컬).', 'success');
        await checkOrderConfirmation();
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

// 4. 발주 확인 계산 로직 (수정됨: 삼시세끼 올림 처리 / SPC 팩 단위 계산)
// 4. 발주 확인 계산 로직 (수정됨: 오징어/편육 계산 로직 추가)
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
            
            // 순수 부족분 (입력 단위 기준: kg 또는 개)
            let orderAmountRaw = Math.max(0, neededTotal - currentStock);
            
            let displayQty = 0;
            let displayUnit = item.발주단위;

            if (vendor === 'SPC') {
                const spcInfo = getSPCInfo(item.품목명);
                displayUnit = spcInfo.unit; // 최종 발주 단위 (box, pak, kg)

                if (orderAmountRaw > 0) {
                    // spcInfo.weight는 오징어의 경우 30, 일반 품목은 무게
                    // 부족분 / 기준값 -> 올림 처리
                    const packsNeeded = Math.ceil(orderAmountRaw / spcInfo.weight);
                    
                    if (spcInfo.type === 'weight' && spcInfo.unit === 'kg') {
                        // 무게 단위 발주 품목 (예: 삼겹살 20kg)
                        displayQty = packsNeeded * spcInfo.weight;
                    } else {
                        // 갯수 단위 발주 (오징어 box, 편육 pak, 동태 box 등)
                        displayQty = packsNeeded;
                    }
                }
            } else if (vendor === '삼시세끼') {
                if (orderAmountRaw > 0) {
                    displayQty = Math.ceil(orderAmountRaw);
                }
            } else {
                displayQty = Math.round(orderAmountRaw * 10) / 10;
            }
            
            const lastOrderDate = lastOrderDates[itemKey] || '';
            let needsConfirmation = false;
            let reason = '';
            
            if (vendor === '삼시세끼' || vendor === 'SPC') {
                // 중요 품목인데 0개면 확인 필요
                if (displayQty === 0 && (item.중요도 === '상' || item.중요도 === '중')) {
                    needsConfirmation = true; reason = `중요 품목 미발주`;
                }
                // SPC는 무조건 확인 (원하시면 제거 가능)
                if (vendor === 'SPC' && displayQty === 0) {
                     needsConfirmation = true; reason = 'SPC 품목 미발주';
                }
            }
            
            if (needsConfirmation || displayQty > 0) {
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

// ==========================================================
// 발주 진행 시 중복 방지 및 재고 저장
// ==========================================================
async function proceedToOrder() {
    closeConfirmModal();
    
    const orderData = { '삼시세끼': [], 'SPC': [], '기타': [] };
    const currentInventoryCopy = {};  // 현재 재고 복사본
    
    // 현재 재고 복사
    for (const key in inventory) {
        currentInventoryCopy[key] = inventory[key];
    }
    
    for (const vendor in items) {
        const vendorItems = items[vendor];
        const daysNeeded = getDaysUntilNextDelivery(vendor);
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const currentStock = inventory[itemKey] || 0;
            const usage = dailyUsage[itemKey] || 0;
            const neededTotal = usage * daysNeeded;
            let orderAmountRaw = Math.max(0, neededTotal - currentStock);
            
            let finalQty = 0;
            let finalUnit = item.발주단위;

            if (vendor === 'SPC') {
                const spcInfo = getSPCInfo(item.품목명);
                finalUnit = spcInfo.unit;

                if (orderAmountRaw > 0) {
                    const packsNeeded = Math.ceil(orderAmountRaw / spcInfo.weight);
                    
                    if (spcInfo.type === 'weight' && spcInfo.unit === 'kg') {
                        finalQty = packsNeeded * spcInfo.weight; 
                    } else {
                        finalQty = packsNeeded; 
                    }
                }
            } else if (vendor === '삼시세끼') {
                if (orderAmountRaw > 0) {
                    finalQty = Math.ceil(orderAmountRaw);
                }
            } else {
                finalQty = Math.round(orderAmountRaw * 10) / 10;
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
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const orderRecord = {
        date: todayStr,
        time: today.toTimeString().split(' ')[0].substring(0, 5),
        orders: orderData,
        inventory: currentInventoryCopy  // 현재 재고 추가
    };

    try {
        // 기존 발주 내역 조회
        const existingResponse = await fetch(`${API_BASE}/api/inventory/orders?vendor=all`);
        const existingData = await existingResponse.json();
        
        let allOrders = [];
        if (existingData.success && existingData.orders) {
            // 같은 날짜의 기록 제거 (최신 것만 유지)
            allOrders = existingData.orders.filter(order => order.date !== todayStr);
        }
        
        // 새 기록 추가
        allOrders.push(orderRecord);
        
        // 전체 저장
        await fetch(`${API_BASE}/api/inventory/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: allOrders })
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
    const footer = modal.querySelector('.modal-footer');
    
    let html = '';
    
    for (const vendor in orderData) {
        const items = orderData[vendor];
        if (items.length > 0) {
            // 버튼 결정 로직
            let actionBtn = '';
            
            if (vendor === 'SPC') {
                // SPC: 내역 탭으로 이동 버튼
                actionBtn = `<button onclick="goToOrderHistory()" class="btn-goto-history">📂 내역 보러가기</button>`;
            } else {
                // 삼시세끼, 기타: 복사 버튼
                actionBtn = `<button onclick="copyVendorOrder('${vendor}')" class="btn-mini-kakao">💬 복사</button>`;
            }

            html += `
                <div class="order-section">
                    <div class="order-section-header">
                        <h3>${vendor} (${items[0].daysNeeded}일치)</h3>
                        ${actionBtn}
                    </div>
                    <div class="order-items" id="order_${vendor}">`;
            
            items.forEach(item => {
                const displayUnit = item.displayUnit || item.발주단위;
                html += `${item.품목명} ${item.orderAmount}${displayUnit}\n`;
            });
            
            html += `</div>
                </div>
            `;
        }
    }
    
    if (!html) html = '<p style="text-align: center; color: #999;">발주할 품목이 없습니다.</p>';
    
    content.innerHTML = html;
    // 하단 버튼은 기존 html 유지
    modal.classList.add('active');
}

// SPC 전용: 모달 닫고 발주내역 탭으로 이동하는 함수
function goToOrderHistory() {
    closeOrderModal();
    // 오늘 날짜로 설정하고 내역 탭 열기
    document.getElementById('orderDateFilter').valueAsDate = new Date();
    showTab('orderHistory'); // 탭 이동
    loadOrderHistory();      // 데이터 로드
}

// 업체별 복사 기능
function copyVendorOrder(vendor) {
    const itemContainer = document.getElementById(`order_${vendor}`);
    if (!itemContainer) return;

    const itemsText = itemContainer.textContent.trim(); // 공백 제거
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    
    let copyText = '';

    if (vendor === '삼시세끼') {
        // 삼시세끼 전용 포맷
        copyText = `안녕하세요 양은이네 오창점 발주하겠습니다.\n\n`;
        copyText += `${month}월 ${date}일\n\n`;
        copyText += itemsText;
        copyText += `\n\n감사합니다.`;
    } else {
        // 기타 업체
        copyText = `[${vendor} 발주] ${month}/${date}\n\n${itemsText}`;
    }
    
    navigator.clipboard.writeText(copyText).then(() => {
        showAlert(`${vendor} 발주서 복사 완료!`, 'success');
    }).catch(err => {
        console.error('복사 실패:', err);
        showAlert('복사 실패', 'error');
    });
}

// 발주서 모달 닫기
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
    renderUnifiedInventoryForm();
}

// 카카오톡 복사 (전체 복사)
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

// 하루 사용량 저장 (수정됨: 빈 칸 0 처리)
async function saveStandard() {
    try {
        const newUsage = { ...dailyUsage };
        
        for (const vendor in items) {
            const vendorItems = items[vendor];
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const inputElement = document.getElementById(`usage_${itemKey}`);
                if (inputElement) {
                    const val = inputElement.value.trim();
                    newUsage[itemKey] = val === '' ? 0 : parseFloat(val);
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
        console.error('하루 사용량 저장 오류 (로컬):', error);
        dailyUsage = newUsage; // 로컬 반영
        showAlert('저장되었습니다(로컬).', 'success');
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

// 재고 내역 로드 (수정됨: 날짜 선택 방식)
async function loadInventoryHistory() {
    try {
        let dateInput = document.getElementById('invHistoryDate');
        // 날짜가 선택 안 되어있으면 오늘 날짜로 기본 설정
        if (!dateInput.value) {
            dateInput.valueAsDate = new Date();
        }
        const selectedDate = dateInput.value;
        const vendor = document.getElementById('invHistoryVendor').value;
        
        // 서버에는 넉넉하게 최근 90일치 데이터를 요청하고, 프론트에서 날짜로 필터링합니다.
        const response = await fetch(`${API_BASE}/api/inventory/history?period=90&vendor=${vendor}`);
        const result = await response.json();
        
        if (result.success) {
            // 선택한 날짜와 일치하는 기록 찾기
            const historyRecord = result.history.find(r => r.date === selectedDate);
            renderInventoryHistory(historyRecord, vendor);
        }
    } catch (error) {
        console.error('재고 내역 로드 실패:', error);
        showAlert('재고 내역 로드 실패', 'error');
    }
}

// 재고 내역 렌더링 (수정됨: 발주내역과 동일한 표 스타일)
function renderInventoryHistory(record, vendorFilter) {
    const container = document.getElementById('inventoryHistoryList');
    if (!container) return;
    
    if (!record) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">해당 날짜의 저장된 재고 기록이 없습니다.</p>';
        return;
    }

    let html = `
        <div class="history-card-header" style="margin-bottom: 15px;">
            <span style="font-weight:bold; font-size:1.1em;">📅 ${record.date} 재고 현황</span>
            <span class="history-time-badge">저장 시간: ${record.time}</span>
        </div>
        <table class="excel-table">
            <thead>
                <tr>
                    <th style="width: 100px;">업체</th>
                    <th>품목명</th>
                    <th style="width: 100px;">재고수량</th>
                </tr>
            </thead>
            <tbody>
    `;

    let hasData = false;

    // 업체 순서 고정 (삼시세끼 -> SPC -> 기타)
    const vendorOrder = ['삼시세끼', 'SPC', '기타'];
    
    vendorOrder.forEach(vendorName => {
        // 필터가 'all'이거나 해당 업체일 때만 표시
        if (vendorFilter !== 'all' && vendorFilter !== vendorName) return;

        // 해당 업체의 재고 데이터가 있는지 확인
        if (record.inventory[vendorName]) {
            const vendorInventory = record.inventory[vendorName];
            // 아이템 목록 가져오기 (전역 items 변수 활용)
            const masterItems = items[vendorName] || [];

            masterItems.forEach(item => {
                const itemKey = `${vendorName}_${item.품목명}`;
                // 기록된 재고가 있는 경우에만 표시 (0이라도 기록되었으면 표시)
                if (vendorInventory[itemKey] !== undefined) {
                    hasData = true;
                    const stock = vendorInventory[itemKey];
                    // 단위 표시 (SPC는 kg/box 등 구분, 나머지는 발주단위)
                    let displayUnit = item.발주단위;
                    if (vendorName === 'SPC') {
                        const spcInfo = getSPCInfo(item.품목명);
                        displayUnit = spcInfo.inputUnit;
                    }

                    html += `
                        <tr>
                            <td style="font-weight:bold; color:#555;">${vendorName}</td>
                            <td class="text-left">${item.품목명}</td>
                            <td>${stock} ${displayUnit}</td>
                        </tr>
                    `;
                }
            });
        }
    });

    html += `</tbody></table>`;
    
    if (!hasData) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">해당 조건의 재고 데이터가 없습니다.</p>';
    } else {
        container.innerHTML = html;
    }
}

// 발주 내역 로드
async function loadOrderHistory() {
    try {
        let dateInput = document.getElementById('orderDateFilter');
        if (!dateInput.value) {
            dateInput.valueAsDate = new Date();
        }
        const selectedDate = dateInput.value;
        const vendorFilter = document.getElementById('orderVendorFilter').value;
        
        const response = await fetch(`${API_BASE}/api/inventory/orders?vendor=${vendorFilter}`);
        const result = await response.json(); 
        
        if (result.success) {
            const filteredOrders = result.orders.filter(order => {
                return (order.date === selectedDate);
            });
            renderOrderHistory(filteredOrders, vendorFilter);
        }
    } catch (error) {
        console.error('발주 내역 로드 실패:', error);
    }
}

// ==========================================================
// 발주 내역 렌더링 (재고 추가)
// ==========================================================
function renderOrderHistory(orders, vendorFilter) {
    const container = document.getElementById('orderHistoryList');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">해당 날짜의 발주 내역이 없습니다.</p>';
        return;
    }
    
    let html = `
        <table class="excel-table">
            <thead>
                <tr>
                    <th style="width: 80px;">시간</th>
                    <th style="width: 80px;">업체</th>
                    <th>품목명</th>
                    <th style="width: 80px;">수량</th>
                    <th style="width: 80px;">현재재고</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let hasData = false;

    orders.forEach(order => {
        const vendorsToShow = (vendorFilter === 'all') 
            ? Object.keys(order.orders) 
            : [vendorFilter];

        vendorsToShow.forEach(vendorName => {
            const items = order.orders[vendorName];
            if (items && items.length > 0) {
                hasData = true;
                items.forEach(item => {
                    const displayUnit = item.displayUnit || item.발주단위;
                    const itemKey = `${vendorName}_${item.품목명}`;
                    const currentStock = order.inventory ? (order.inventory[itemKey] || 0) : '-';
                    
                    html += `
                        <tr>
                            <td>${order.time}</td>
                            <td style="font-weight:bold;">${vendorName}</td>
                            <td class="text-left">${item.품목명}</td>
                            <td>${item.orderAmount} ${displayUnit}</td>
                            <td>${currentStock} ${displayUnit}</td>
                        </tr>
                    `;
                });
            }
        });
    });

    html += `</tbody></table>`;
    
    if (!hasData) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">선택한 업체의 발주 내역이 없습니다.</p>';
    } else {
        container.innerHTML = html;
    }
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



// SPC 품목 정보 파싱 (수정됨: 오징어/편육 예외처리 추가)
function getSPCInfo(itemName) {
    let info = {
        type: 'weight', // 기본은 무게 기준
        weight: 1,      // 나누는 기준 값 (무게 또는 갯수)
        unit: 'kg',     // 발주 단위
        inputUnit: 'kg' // 입력 단위 (화면에 보여줄 단위)
    };

    // 1. [예외] 손질오징어 (30미 = 1box)
    if (itemName.includes('손질오징어')) {
        info.type = 'count_box'; // 갯수로 세서 박스로 발주
        info.weight = 30;        // 1박스에 30개
        info.unit = 'box';       // 발주 단위
        info.inputUnit = '개';   // 입력 단위
        return info;
    }

    // 2. [예외] 덩어리편육 (300g = 1pak) -> 팩 단위 관리
    if (itemName.includes('덩어리편육')) {
        info.type = 'count_pack';
        info.weight = 1;         // 1개 부족하면 1개 발주
        info.unit = 'pak';
        info.inputUnit = '개';   // 입력 단위 (팩)
        return info;
    }

    // 3. 기본 로직 (무게 기준)
    // 무게 추출 (예: /20kg/, /10kg/)
    const weightMatch = itemName.match(/\/(\d+(?:\.\d+)?)kg\//);
    if (weightMatch) {
        info.weight = parseFloat(weightMatch[1]);
    }

    // 단위 추출
    const unitMatch = itemName.match(/(box|pak|kg|통|ea)$/i);
    if (unitMatch) {
        info.unit = unitMatch[1].toLowerCase();
    } else {
        info.unit = 'kg'; 
    }

    return info;
}

// ==========================================================
// [NEW] 품목 관리 (추가 / 삭제 / 위치변경) 기능
// ==========================================================

// 품목 관리 리스트 렌더링
function renderManageItems() {
    // 관리할 업체 선택값 확인
    const vendorSelect = document.getElementById('manageVendorSelect');
    if (!vendorSelect) return; // 탭이 로드되지 않았을 경우 방어
    const vendor = vendorSelect.value;
    
    const container = document.getElementById('manageItemsList');
    if (!container) return;

    const vendorItems = items[vendor] || [];
    
    if (vendorItems.length === 0) {
        container.innerHTML = '<p style="padding:20px; text-align:center; color:#999;">등록된 품목이 없습니다.</p>';
        return;
    }
    
    let html = '<ul class="manage-ul">';
    vendorItems.forEach((item, index) => {
        html += `
            <li class="manage-li">
                <div class="manage-controls">
                    <button class="btn-move" onclick="moveItem('${vendor}', ${index}, -1)">▲</button>
                    <button class="btn-move" onclick="moveItem('${vendor}', ${index}, 1)">▼</button>
                </div>
                <div class="manage-info">
                    <span class="manage-name">${item.품목명}</span>
                    <span class="manage-unit">${item.발주단위}</span>
                </div>
                <button class="btn-delete" onclick="deleteItem('${vendor}', ${index})">삭제</button>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

// 품목 순서 변경
function moveItem(vendor, index, direction) {
    const list = items[vendor];
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= list.length) return; // 범위 벗어남
    
    // 배열 요소 교환 (Swap)
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;
    
    renderManageItems(); // 리렌더링
}

// 품목 삭제
function deleteItem(vendor, index) {
    if (!confirm('정말 이 품목을 삭제하시겠습니까? (재고 데이터도 함께 사라질 수 있습니다)')) return;
    
    items[vendor].splice(index, 1);
    renderManageItems();
}

// 새 품목 추가
function addNewItem() {
    const vendor = document.getElementById('newItemVendor').value;
    const name = document.getElementById('newItemName').value.trim();
    const unit = document.getElementById('newItemUnit').value.trim();
    
    if (!name) {
        showAlert('품목명을 입력하세요', 'error');
        return;
    }
    
    if (!items[vendor]) items[vendor] = [];
    
    // 중복 체크
    const exists = items[vendor].some(i => i.품목명 === name);
    if (exists) {
        showAlert('이미 존재하는 품목입니다.', 'error');
        return;
    }
    
    items[vendor].push({
        "품목명": name,
        "발주단위": unit || '개', // 기본값
        "중요도": "중" // 기본값
    });
    
    // 입력창 초기화
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemUnit').value = '';
    
    showAlert(`'${name}' 추가되었습니다.`, 'success');
    
    // 만약 현재 보고 있는 리스트가 해당 업체라면 갱신
    if (document.getElementById('manageVendorSelect').value === vendor) {
        renderManageItems();
    }
}

// 변경사항 저장 (순서 및 추가/삭제 내역)
async function saveItemChanges() {
    try {
        await fetch(`${API_BASE}/api/inventory/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items })
        });
        showAlert('품목 순서 및 변경사항이 저장되었습니다.', 'success');
        
        // 재고 입력 폼 등 다른 탭들도 갱신해줘야 함 (순서가 바뀌었으므로)
        renderUnifiedInventoryForm(); 
    } catch (e) {
        console.error(e);
        showAlert('저장되었습니다 (로컬).', 'success');
        renderUnifiedInventoryForm();
    }
}



// ==========================================================
// 어제 재고 로드 함수
// ==========================================================
async function loadYesterdayInventory() {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const response = await fetch(`${API_BASE}/api/inventory/history?period=1&vendor=all`);
        const result = await response.json();
        
        if (result.success && result.history) {
            const yesterdayRecord = result.history.find(r => r.date === yesterdayStr);
            if (yesterdayRecord) {
                yesterdayInventory = yesterdayRecord.inventory;
            }
        }
    } catch (error) {
        console.error('어제 재고 로드 실패:', error);
    }
}

// ==========================================================
// 발주일 오래된 순 정렬 토글
// ==========================================================
function toggleSortOrder() {
    currentSortOrder = (currentSortOrder === 'default') ? 'lastOrder' : 'default';
    
    const btn = document.getElementById('sortOrderBtn');
    if (currentSortOrder === 'lastOrder') {
        btn.classList.add('active');
        btn.textContent = '📅 기본 순서로';
    } else {
        btn.classList.remove('active');
        btn.textContent = '📅 발주일 오래된 순';
    }
    
    renderUnifiedInventoryForm();
}

// ==========================================================
// 장기 미발주 품목 확인 모달
// ==========================================================
let currentNoOrderPeriod = 5;

function showLongTermNoOrder() {
    currentNoOrderPeriod = 5;
    const modal = document.getElementById('noOrderModal');
    modal.classList.add('active');
    filterNoOrderPeriod(5);
}

function closeNoOrderModal() {
    document.getElementById('noOrderModal').classList.remove('active');
}

function filterNoOrderPeriod(days) {
    currentNoOrderPeriod = days;
    
    // 버튼 활성화 상태 변경
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const content = document.getElementById('noOrderContent');
    const today = new Date();
    let html = '';
    
    for (const vendor in items) {
        const vendorItems = items[vendor] || [];
        const longTermItems = [];
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const lastOrderDate = lastOrderDates[itemKey];
            
            if (!lastOrderDate) {
                longTermItems.push({...item, daysSince: 999, lastOrderDate: '기록없음'});
            } else {
                const daysSince = getDaysSince(lastOrderDate);
                if (daysSince >= days) {
                    longTermItems.push({...item, daysSince, lastOrderDate});
                }
            }
        });
        
        if (longTermItems.length > 0) {
            longTermItems.sort((a, b) => b.daysSince - a.daysSince);
            
            html += `
                <div class="no-order-vendor-section">
                    <h4>📦 ${vendor}</h4>
                    <table class="no-order-table">
                        <thead>
                            <tr>
                                <th>품목명</th>
                                <th>마지막 발주</th>
                                <th>경과일</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            longTermItems.forEach(item => {
                html += `
                    <tr>
                        <td>${item.품목명}</td>
                        <td>${item.lastOrderDate}</td>
                        <td style="color: ${item.daysSince > 10 ? '#f44336' : '#ef6c00'}; font-weight: bold;">
                            ${item.daysSince === 999 ? '-' : item.daysSince + '일'}
                        </td>
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
        html = '<p style="text-align: center; color: #999; padding: 30px;">해당 기간의 미발주 품목이 없습니다.</p>';
    }
    
    content.innerHTML = html;
}


