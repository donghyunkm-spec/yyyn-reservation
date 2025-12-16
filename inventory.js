// 재고관리 시스템 - 프론트엔드 로직

// 전역 변수
let currentVendor = '삼시세끼';
let currentStandardVendor = '삼시세끼';
let items = {};
let inventory = {};
let standardInventory = {};
let holidays = [];
let currentInventoryData = {};
let lastOrderDates = {};

const API_BASE = '';
const PASSWORD = '1234'; // 실제 운영시 변경 필요

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
        
        // 적정 재고 로드
        const standardRes = await fetch(`${API_BASE}/api/inventory/standard`);
        const standardData = await standardRes.json();
        if (standardData.success) {
            standardInventory = standardData.standard;
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
    } else if (tabName === 'history') {
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

// 업체 선택 (적정재고)
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
        const standardStock = standardInventory[itemKey] || 0;
        
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
                        <label>적정 재고</label>
                        <input type="text" 
                               value="${standardStock} ${item.발주단위}" 
                               readonly 
                               style="background: #f8f9fa;">
                    </div>
                </div>
            </div>
        `;
    });
    
    formContainer.innerHTML = html;
}

// 적정 재고 설정 폼 렌더링
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
        const standardStock = standardInventory[itemKey] || 0;
        
        html += `
            <div class="item-group">
                <div class="item-header">
                    <span class="item-name">${item.품목명}</span>
                    ${item.중요도 ? `<span class="item-importance importance-${item.중요도}">${item.중요도}</span>` : ''}
                </div>
                <div class="item-inputs">
                    <div class="input-group">
                        <label>적정 재고량</label>
                        <input type="number" 
                               id="standard_${itemKey}" 
                               value="${standardStock}" 
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
        
        // 서버에 저장
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

// 발주 확인 프로세스
async function checkOrderConfirmation() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일요일, 5=금요일
    
    const confirmItems = {
        '삼시세끼': [],
        'SPC': [],
        '기타': []
    };
    
    // 각 업체별 확인 필요 품목 체크
    for (const vendor in items) {
        const vendorItems = items[vendor];
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const currentStock = inventory[itemKey] || 0;
            const standardStock = standardInventory[itemKey] || 0;
            const orderAmount = Math.max(0, standardStock - currentStock);
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
                    standardStock,
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
    currentInventoryData = confirmItems;
    
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
                        권장 발주량: ${item.orderAmount} ${item.발주단위}
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
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일요일, 5=금요일
    
    // 발주량 계산
    const orderData = {
        '삼시세끼': [],
        'SPC': [],
        '기타': []
    };
    
    for (const vendor in items) {
        const vendorItems = items[vendor];
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const currentStock = inventory[itemKey] || 0;
            let standardStock = standardInventory[itemKey] || 0;
            
            // 금요일 발주시 주말 소비량 추가 (삼시세끼만)
            if (vendor === '삼시세끼' && dayOfWeek === 5) {
                standardStock = standardStock * 1.5; // 주말 50% 추가
            }
            
            // 업체 휴일 전날 처리 (추후 구현)
            
            let orderAmount = Math.max(0, standardStock - currentStock);
            orderAmount = Math.round(orderAmount * 10) / 10; // 소수점 1자리
            
            if (orderAmount > 0) {
                orderData[vendor].push({
                    ...item,
                    orderAmount
                });
            }
        });
    }
    
    // 발주 내역 저장
    const orderRecord = {
        date: today.toISOString().split('T')[0],
        time: today.toTimeString().split(' ')[0],
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
                    <h3>${vendor}</h3>
                    <div class="order-items" id="order_${vendor}">
            `;
            
            items.forEach(item => {
                html += `${item.품목명} ${item.orderAmount}${item.발주단위}\n`;
            });
            
            html += `
                    </div>
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

// 적정 재고 저장
async function saveStandard() {
    try {
        const newStandard = {};
        
        for (const vendor in items) {
            const vendorItems = items[vendor];
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const inputElement = document.getElementById(`standard_${itemKey}`);
                if (inputElement) {
                    newStandard[itemKey] = parseFloat(inputElement.value) || 0;
                }
            });
        }
        
        const response = await fetch(`${API_BASE}/api/inventory/standard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ standard: newStandard })
        });
        
        const result = await response.json();
        
        if (result.success) {
            standardInventory = newStandard;
            showAlert('적정 재고가 저장되었습니다.', 'success');
        } else {
            showAlert('저장 실패', 'error');
        }
    } catch (error) {
        console.error('적정 재고 저장 오류:', error);
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
            renderHolidays();
        }
    } catch (error) {
        console.error('휴일 로드 실패:', error);
    }
}

// 휴일 렌더링
function renderHolidays() {
    const container = document.getElementById('holidayList');
    if (!container) return;
    
    if (holidays.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">등록된 휴일이 없습니다.</p>';
        return;
    }
    
    let html = '';
    holidays.forEach((holiday, index) => {
        html += `
            <div class="holiday-item">
                <span class="holiday-date">${holiday}</span>
                <button class="btn-danger" onclick="removeHoliday(${index})">삭제</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 휴일 추가
async function addHoliday() {
    const dateInput = document.getElementById('holidayDate');
    const date = dateInput.value;
    
    if (!date) {
        showAlert('날짜를 선택하세요.', 'error');
        return;
    }
    
    if (holidays.includes(date)) {
        showAlert('이미 등록된 날짜입니다.', 'error');
        return;
    }
    
    holidays.push(date);
    holidays.sort();
    
    try {
        const response = await fetch(`${API_BASE}/api/inventory/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holidays })
        });
        
        const result = await response.json();
        if (result.success) {
            dateInput.value = '';
            renderHolidays();
            showAlert('휴일이 추가되었습니다.', 'success');
        }
    } catch (error) {
        console.error('휴일 추가 오류:', error);
        showAlert('휴일 추가 실패', 'error');
    }
}

// 휴일 삭제
async function removeHoliday(index) {
    if (!confirm('이 휴일을 삭제하시겠습니까?')) return;
    
    holidays.splice(index, 1);
    
    try {
        const response = await fetch(`${API_BASE}/api/inventory/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holidays })
        });
        
        const result = await response.json();
        if (result.success) {
            renderHolidays();
            showAlert('휴일이 삭제되었습니다.', 'success');
        }
    } catch (error) {
        console.error('휴일 삭제 오류:', error);
        showAlert('휴일 삭제 실패', 'error');
    }
}

// 발주 내역 로드
async function loadOrderHistory() {
    try {
        const period = document.getElementById('periodFilter').value;
        const vendor = document.getElementById('vendorFilter').value;
        
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
    const container = document.getElementById('historyList');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">발주 내역이 없습니다.</p>';
        return;
    }
    
    let html = '';
    orders.forEach(order => {
        for (const vendor in order.orders) {
            const items = order.orders[vendor];
            if (items.length > 0) {
                html += `
                    <div class="history-item">
                        <div class="history-header">
                            <span class="history-date">${order.date} ${order.time}</span>
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
