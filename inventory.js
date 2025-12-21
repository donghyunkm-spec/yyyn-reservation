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
let recentHistory = []; 

// ==========================================================
// 추가된 전역 변수
// ==========================================================
let yesterdayInventory = {}; 
let currentSortOrder = 'default'; 
let allItemsWithInfo = []; 
let currentWarnings = {}; 
let showWeeklyForced = false; // 주간 품목 강제 표시 상태

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
    await loadRecentInventory(); 
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
    
    const btn = document.querySelector(`button[onclick="showTab('${tabName}')"]`);
    if(btn) btn.classList.add('active');

    const content = document.getElementById(`${tabName}-tab`);
    if(content) content.classList.add('active');
    
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
        renderManageItems();
    }
}

function scrollToVendor(vendor) {
    const section = document.getElementById(`vendor-section-${vendor}`);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// [NEW] 주간 품목 표시 토글 함수
function toggleWeeklyItems() {
    showWeeklyForced = !showWeeklyForced;
    
    const btn = document.getElementById('toggleWeeklyBtn');
    if (showWeeklyForced) {
        btn.classList.add('active');
        btn.innerHTML = '✅ 주간 품목 표시 중';
        btn.style.backgroundColor = '#FF9800'; // 주황색으로 강조
        btn.style.borderColor = '#F57C00';
        btn.style.color = 'white';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '🔄 주간 품목 표시 (화요일 외)';
        btn.style.backgroundColor = ''; // 원래대로
        btn.style.borderColor = '';
        btn.style.color = '';
    }
    
    renderUnifiedInventoryForm(); // 리스트 다시 그리기
}


// [수정] renderUnifiedInventoryForm 함수 (요일 및 강제표시 로직 적용)
function renderUnifiedInventoryForm() {
    const formContainer = document.getElementById('inventoryForm');
    if (!formContainer) return;
    
    let html = '';
    const vendorOrder = ['삼시세끼', 'SPC', '기타'];
    
    // 오늘 요일 확인 (화요일 = 2)
    const today = new Date();
    const isTuesday = today.getDay() === 2;
    
    // 정렬 로직 (기존과 동일하되 필터링 조건만 변경)
    if (currentSortOrder === 'lastOrder') {
        allItemsWithInfo = [];
        
        for (const vendor of vendorOrder) {
            const vendorItems = items[vendor] || [];
            vendorItems.forEach(item => {
                // [핵심 로직 변경] 
                // 주간 관리 품목이고, 오늘이 화요일이 아니고, 강제 표시 버튼도 안 눌렀으면 -> 건너뜀
                if (item.관리주기 === 'weekly' && !isTuesday && !showWeeklyForced) {
                    return;
                }

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
        
        allItemsWithInfo.sort((a, b) => b.daysSince - a.daysSince);
        
        html += `<div class="vendor-section"><h3 style="margin-bottom:10px; color:#4CAF50;">📅 발주일 오래된 순</h3>`;
        allItemsWithInfo.forEach(({vendor, item, itemKey, lastOrderDate, daysSince}) => {
            html += renderItemGroup(vendor, item, itemKey, lastOrderDate, daysSince);
        });
        html += `</div>`;
        
    } else {
        // 일반 업체별 보기
        vendorOrder.forEach(vendor => {
            const vendorItems = items[vendor] || [];
            if (vendorItems.length === 0) return;
            
            // 필터링 적용
            const visibleItems = vendorItems.filter(item => {
                // [핵심 로직 변경]
                if (item.관리주기 === 'weekly' && !isTuesday && !showWeeklyForced) {
                    return false;
                }
                return true;
            });

            if (visibleItems.length === 0) return;

            html += `<div id="vendor-section-${vendor}" class="vendor-section">`;
            html += `<h3 style="margin-bottom:10px; color:#4CAF50;">📦 ${vendor}</h3>`;
            
            visibleItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const lastOrderDate = lastOrderDates[itemKey] || '';
                const daysSince = lastOrderDate ? getDaysSince(lastOrderDate) : 999;
                
                html += renderItemGroup(vendor, item, itemKey, lastOrderDate, daysSince);
            });
            
            html += `</div>`;
        });
    }
    
    if (!html) html = '<p style="text-align: center; color: #999; padding: 30px;">오늘 입력할 품목이 없습니다.</p>';
    formContainer.innerHTML = html;
}

// [수정] renderItemGroup 함수 (배지가 더 잘 보이도록 스타일 개선)
function renderItemGroup(vendor, item, itemKey, lastOrderDate, daysSince) {
    const currentStock = inventory[itemKey] || 0;
    const usage = dailyUsage[itemKey] || 0;
    
    let yesterdayStock = null;
    const todayStr = new Date().toISOString().split('T')[0];
    const lastRecord = recentHistory.find(r => r.date !== todayStr);
    
    if (lastRecord && lastRecord.inventory[vendor]) {
         const val = lastRecord.inventory[vendor][itemKey];
         if (val !== undefined) yesterdayStock = val;
    }

    let displayUnit = item.발주단위;
    if (vendor === 'SPC') {
        const spcInfo = getSPCInfo(item.품목명);
        displayUnit = spcInfo.inputUnit;
    }
    
    const displayStockValue = (currentStock === 0) ? '' : currentStock;
    
    let lastOrderDisplay = '';
    if (lastOrderDate) {
        const daysColor = daysSince > 10 ? '#f44336' : (daysSince > 7 ? '#ef6c00' : '#999');
        lastOrderDisplay = `<span style="font-size:11px; font-weight:normal; color:${daysColor}; margin-left:8px;">📅 ${daysSince}일전</span>`;
    } else {
         lastOrderDisplay = `<span style="font-size:11px; font-weight:normal; color:#bbb; margin-left:8px;">(발주없음)</span>`;
    }

    let prevValueDisplay = '-';
    let btnDisabled = 'disabled';
    let btnClass = 'btn-same disabled';
    let btnOnClick = '';

    if (yesterdayStock !== null) {
        prevValueDisplay = yesterdayStock;
        btnDisabled = '';
        btnClass = 'btn-same';
        btnOnClick = `onclick="setStockValue('${itemKey}', ${yesterdayStock})"`;
    }

    // [NEW] 관리주기 뱃지 표시 강화
    let cycleBadge = '';
    if (item.관리주기 === 'weekly') {
        // 눈에 잘 띄는 파란색 배경으로 설정
        cycleBadge = `<span style="background-color:#E3F2FD; color:#1565C0; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:6px; border: 1px solid #BBDEFB; font-weight:bold;">매주 화요일</span>`;
    }

    let html = `
        <div class="item-group compact-group">
            <div class="item-header-compact">
                <span class="item-name" style="display: flex; align-items: center; flex-wrap: wrap;">
                    ${item.품목명}
                    ${cycleBadge} ${lastOrderDisplay}
                </span>
                ${item.중요도 ? `<span class="item-importance importance-${item.중요도}">${item.중요도}</span>` : ''}
            </div>

            <div class="inventory-row-controls">
                <div class="control-cell prev-cell">
                    <span class="cell-label">전일재고</span>
                    <div class="prev-value-box">
                        <span class="value">${prevValueDisplay}</span>
                        <span class="unit">${displayUnit}</span>
                    </div>
                </div>

                <div class="control-cell btn-cell">
                    <span class="cell-label">어제값</span>
                    <button type="button" class="${btnClass}" ${btnOnClick} ${btnDisabled} title="전일 재고와 동일하게 입력">
                        ↑
                    </button>
                </div>

                <div class="control-cell input-cell">
                    <span class="cell-label">현재재고</span>
                    <div class="input-wrapper">
                        <input type="number" id="current_${itemKey}" value="${displayStockValue}" 
                               min="0" step="0.1" inputmode="decimal" placeholder="0">
                        <span class="unit">${displayUnit}</span>
                    </div>
                </div>
                
                <div class="control-cell usage-cell">
                    <span class="cell-label">하루사용</span>
                    <div class="usage-wrapper">
                        <span class="usage-value">${usage}</span>
                        <span class="unit">${displayUnit}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    return html;
}


// 1. [NEW] 현재 화면에 보이는 입력값들을 전역 변수(dailyUsage)에 동기화하는 함수
function captureStandardInput() {
    const vendorItems = items[currentStandardVendor] || [];
    
    vendorItems.forEach(item => {
        const itemKey = `${currentStandardVendor}_${item.품목명}`;
        const inputElement = document.getElementById(`usage_${itemKey}`);
        
        // 화면에 입력창이 존재한다면, 그 값을 dailyUsage에 업데이트
        if (inputElement) {
            const val = inputElement.value.trim();
            dailyUsage[itemKey] = val === '' ? 0 : parseFloat(val);
        }
    });
}

// 2. [수정] 업체 탭 변경 함수
function selectStandardVendor(vendor) {
    // 탭을 바꾸기 전에, 현재 입력된 값들을 먼저 저장(캡처)함
    captureStandardInput();

    currentStandardVendor = vendor;
    
    // 버튼 스타일 업데이트
    document.querySelectorAll('#standard-tab .vendor-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.vendor === vendor) btn.classList.add('active');
    });
    
    renderStandardForm();
}

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
                    ${item.관리주기 === 'weekly' ? '<span style="font-size:10px; color:#0288D1; margin-left:4px;">[화]</span>' : ''}
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

async function saveInventory() {
    try {
        const newInventory = { ...inventory };
        
        for (const vendor in items) {
            const vendorItems = items[vendor];
            vendorItems.forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                const inputElement = document.getElementById(`current_${itemKey}`);
                
                // [중요] 화면에 렌더링된 항목만 저장 (화요일이 아니어서 숨겨진 항목은 기존 값 유지)
                if (inputElement) {
                    const val = inputElement.value.trim();
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
        inventory = newInventory;
        showAlert('재고가 저장되었습니다(로컬).', 'success');
        await checkOrderConfirmation();
    }
}

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

// [수정됨] 발주 확인 (경고 로직에서 주간 항목 제외)
async function checkOrderConfirmation() {
    const confirmItems = { '삼시세끼': [], 'SPC': [], '기타': [] };
    
    const todayStr = new Date().toISOString().split('T')[0];
    const pastRecords = recentHistory.filter(r => r.date !== todayStr);
    
    const recordD1 = pastRecords[0]; 
    const recordD2 = pastRecords[1]; 
    
    for (const vendor in items) {
        const vendorItems = items[vendor];
        const daysNeeded = getDaysUntilNextDelivery(vendor);
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            const inputEl = document.getElementById(`current_${itemKey}`);
            
            // 화면에 없는 품목(오늘 입력 안하는 주간 품목)은 체크 패스
            if (!inputEl) return;

            const currentInputValue = inputEl.value === '' ? 0 : parseFloat(inputEl.value);
            const usage = dailyUsage[itemKey] || 0;
            const neededTotal = usage * daysNeeded;
            
            let orderAmountRaw = Math.max(0, neededTotal - currentInputValue);
            let displayQty = 0;
            let displayUnit = item.발주단위;

            if (vendor === 'SPC') {
                const spcInfo = getSPCInfo(item.품목명);
                displayUnit = spcInfo.unit; 
                if (orderAmountRaw > 0) {
                    const packsNeeded = Math.ceil(orderAmountRaw / spcInfo.weight);
                    if (spcInfo.type === 'weight' && spcInfo.unit === 'kg') {
                        displayQty = packsNeeded * spcInfo.weight; 
                    } else {
                        displayQty = packsNeeded; 
                    }
                }
            } else if (vendor === '삼시세끼') {
                if (orderAmountRaw > 0) displayQty = Math.ceil(orderAmountRaw);
            } else {
                displayQty = Math.round(orderAmountRaw * 10) / 10;
            }
            
            const lastOrderDate = lastOrderDates[itemKey] || '';
            let needsConfirmation = false;
            let reason = '';
            
            if (displayQty === 0 && (item.중요도 === '상' || item.중요도 === '중')) {
                needsConfirmation = true; reason = `중요 품목 미발주`;
            }
            if (vendor === 'SPC' && displayQty === 0) {
                 needsConfirmation = true; reason = 'SPC 품목 미발주';
            }

            // [NEW] 3일 연속 동일 재고 체크 (주간 품목은 제외)
            if (item.관리주기 !== 'weekly' && currentInputValue > 0 && recordD1 && recordD2) {
                const stockD1 = recordD1.inventory[vendor] ? recordD1.inventory[vendor][itemKey] : undefined;
                const stockD2 = recordD2.inventory[vendor] ? recordD2.inventory[vendor][itemKey] : undefined;

                if (stockD1 !== undefined && stockD2 !== undefined) {
                    if (currentInputValue === stockD1 && currentInputValue === stockD2) {
                        needsConfirmation = true;
                        reason = reason ? `${reason}, 3일간 재고 동일` : '⚠️ 3일간 재고값 동일';
                    }
                }
            }
            
            if (needsConfirmation || displayQty > 0) {
                confirmItems[vendor].push({
                    ...item,
                    itemKey,
                    currentStock: currentInputValue,
                    orderAmount: displayQty,
                    displayUnit,
                    reason,
                    lastOrderDate
                });
            }
        });
    }
    
    const hasConfirmItems = Object.values(confirmItems).some(arr => arr.length > 0);

    currentWarnings = {};
    if (hasConfirmItems) {
        currentWarnings = JSON.parse(JSON.stringify(confirmItems));
        showConfirmModal(confirmItems);
    } else {
        proceedToOrder();
    }
}

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
            
            html += `</tbody></table></div>`;
        }
    }
    
    if (!html) html = '<p style="text-align: center; color: #999;">확인이 필요한 항목이 없습니다.</p>';
    
    content.innerHTML = html;
    modal.classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

async function proceedToOrder() {
    closeConfirmModal();
    
    const orderData = { '삼시세끼': [], 'SPC': [], '기타': [] };
    const currentInventoryCopy = {};
    
    for (const key in inventory) {
        currentInventoryCopy[key] = inventory[key];
    }
    
    for (const vendor in items) {
        const vendorItems = items[vendor];
        const daysNeeded = getDaysUntilNextDelivery(vendor);
        
        vendorItems.forEach(item => {
            const itemKey = `${vendor}_${item.품목명}`;
            // 화면에 렌더링된 input이 있으면 그 값을, 없으면(주간품목 등) 저장된 값 사용
            const inputEl = document.getElementById(`current_${itemKey}`);
            const currentStock = inputEl ? (inputEl.value === '' ? 0 : parseFloat(inputEl.value)) : (inventory[itemKey] || 0);

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
                if (orderAmountRaw > 0) finalQty = Math.ceil(orderAmountRaw);
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
        inventory: currentInventoryCopy,
        warnings: currentWarnings 
    };

    try {
        await fetch(`${API_BASE}/api/inventory/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderRecord)
        });
        currentWarnings = {}; 
        showOrderModal(orderData);
    } catch (error) {
        console.error(error);
        showOrderModal(orderData);
    }
}

function showOrderModal(orderData) {
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderContent');
    
    let html = '';
    
    for (const vendor in orderData) {
        const items = orderData[vendor];
        if (items.length > 0) {
            let actionBtn = '';
            if (vendor === 'SPC') {
                actionBtn = `<button onclick="goToOrderHistory()" class="btn-goto-history">📂 내역 보러가기</button>`;
            } else {
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
    modal.classList.add('active');
}

function goToOrderHistory() {
    closeOrderModal();
    document.getElementById('orderDateFilter').valueAsDate = new Date();
    showTab('orderHistory'); 
    loadOrderHistory();      
}

function copyVendorOrder(vendor) {
    const itemContainer = document.getElementById(`order_${vendor}`);
    if (!itemContainer) return;

    const itemsText = itemContainer.textContent.trim();
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    
    let copyText = '';

    if (vendor === '삼시세끼') {
        copyText = `안녕하세요 양은이네 오창점 발주하겠습니다.\n\n`;
        copyText += `${month}월 ${date}일\n\n`;
        copyText += itemsText;
        copyText += `\n\n감사합니다.`;
    } else {
        copyText = `[${vendor} 발주] ${month}/${date}\n\n${itemsText}`;
    }
    
    navigator.clipboard.writeText(copyText).then(() => {
        showAlert(`${vendor} 발주서 복사 완료!`, 'success');
    }).catch(err => {
        console.error('복사 실패:', err);
        showAlert('복사 실패', 'error');
    });
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
    renderUnifiedInventoryForm();
}

// inventory.js - 기존 copyToKakao 함수 교체
function copyToKakao() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const time = `${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')}`;

    let copyText = `📦 [발주 리스트 복사]\n📅 ${month}/${date} (${time})\n----------------------------\n`;
    
    // 화면에 렌더링된 데이터를 기반으로 텍스트 생성
    const orderSections = document.querySelectorAll('.order-section');
    
    orderSections.forEach(section => {
        const vendor = section.querySelector('h3').textContent.split('(')[0].trim(); // 업체명만 추출
        const itemsText = section.querySelector('.order-items').innerText; // 내부 텍스트 가져오기
        
        copyText += `\n■ ${vendor}\n`;
        
        // 기존 텍스트(품목명 3kg)를 한 줄씩 처리
        const lines = itemsText.split('\n');
        lines.forEach(line => {
            if(line.trim()) {
                // "▫️ 품목명 : 3kg" 형태로 변환
                // 현재 innerText가 "양파 3망" 형태라면 보기 좋게 꾸밈
                copyText += `▫️ ${line.trim()}\n`; 
            }
        });
    });
    
    copyText += `\n----------------------------\n양은이네 재고관리`;

    navigator.clipboard.writeText(copyText).then(() => {
        showAlert('영수증 형태로 복사 완료! 📋', 'success');
    }).catch(err => {
        console.error('복사 실패:', err);
        showAlert('복사 실패', 'error');
    });
}

// 3. [수정] 하루 사용량 저장 함수
async function saveStandard() {
    // 저장 버튼 누르는 순간의 입력값도 확실하게 캡처
    captureStandardInput();

    try {
        // 이제 dailyUsage 변수에는 모든 업체의 수정된 값이 다 들어있음
        const response = await fetch(`${API_BASE}/api/inventory/daily-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usage: dailyUsage }) // dailyUsage 전체 전송
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('하루 사용량이 저장되었습니다.', 'success');
        } else {
            showAlert('저장 실패', 'error');
        }
    } catch (error) {
        console.error('하루 사용량 저장 오류 (로컬):', error);
        showAlert('저장되었습니다(로컬).', 'success');
    }
}

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

function renderAllHolidays() {
    renderHolidayList('store', 'storeHolidayList');
    renderHolidayList('삼시세끼', 'samsiHolidayList');
    renderHolidayList('SPC', 'spcHolidayList');
    renderHolidayList('기타', 'etcHolidayList');
}

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

async function loadInventoryHistory() {
    try {
        let dateInput = document.getElementById('invHistoryDate');
        if (!dateInput.value) {
            dateInput.valueAsDate = new Date();
        }
        const selectedDate = dateInput.value;
        const vendor = document.getElementById('invHistoryVendor').value;
        
        const response = await fetch(`${API_BASE}/api/inventory/history?period=90&vendor=${vendor}`);
        const result = await response.json();
        
        if (result.success) {
            const historyRecord = result.history.find(r => r.date === selectedDate);
            renderInventoryHistory(historyRecord, vendor);
        }
    } catch (error) {
        console.error('재고 내역 로드 실패:', error);
        showAlert('재고 내역 로드 실패', 'error');
    }
}

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
    const vendorOrder = ['삼시세끼', 'SPC', '기타'];
    
    vendorOrder.forEach(vendorName => {
        if (vendorFilter !== 'all' && vendorFilter !== vendorName) return;

        if (record.inventory[vendorName]) {
            const vendorInventory = record.inventory[vendorName];
            const masterItems = items[vendorName] || [];

            masterItems.forEach(item => {
                const itemKey = `${vendorName}_${item.품목명}`;
                if (vendorInventory[itemKey] !== undefined) {
                    hasData = true;
                    const stock = vendorInventory[itemKey];
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

function getSPCInfo(itemName) {
    let info = {
        type: 'weight', 
        weight: 1,      
        unit: 'kg',     
        inputUnit: 'kg' 
    };

    if (itemName.includes('손질오징어')) {
        info.type = 'count_box'; 
        info.weight = 30;        
        info.unit = 'box';       
        info.inputUnit = '개';   
        return info;
    }

    if (itemName.includes('덩어리편육')) {
        info.type = 'count_pack';
        info.weight = 1;         
        info.unit = 'pak';
        info.inputUnit = '개';   
        return info;
    }

    const weightMatch = itemName.match(/\/(\d+(?:\.\d+)?)kg\//);
    if (weightMatch) {
        info.weight = parseFloat(weightMatch[1]);
    }

    const unitMatch = itemName.match(/(box|pak|kg|통|ea)$/i);
    if (unitMatch) {
        info.unit = unitMatch[1].toLowerCase();
    } else {
        info.unit = 'kg'; 
    }

    return info;
}

// ==========================================================
// [수정됨] 품목 관리 (관리주기, 중요도 추가 표시)
// ==========================================================
function renderManageItems() {
    const vendorSelect = document.getElementById('manageVendorSelect');
    if (!vendorSelect) return; 
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
        // 1. 관리주기 텍스트 표시 로직 강화
        let cycleBadge = '';
        if (item.관리주기 === 'weekly') {
            cycleBadge = `<span style="background:#E1F5FE; color:#0288D1; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:4px;">매주 화</span>`;
        } else {
            // daily인 경우도 명시적으로 보고 싶다면 아래 주석 해제
            // cycleBadge = `<span style="background:#f5f5f5; color:#666; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:4px;">매일</span>`;
        }
        
        // 2. 중요도 텍스트
        const imp = item.중요도 || '중';
        let impColor = '#ef6c00'; // 중
        if (imp === '상') impColor = '#c62828';
        if (imp === '하') impColor = '#2e7d32';
        
        const impBadge = `<span style="font-size:11px; color:${impColor}; font-weight:bold; margin-left:4px;">(${imp})</span>`;
        
        html += `
            <li class="manage-li">
                <div class="manage-controls">
                    <button class="btn-move" onclick="moveItem('${vendor}', ${index}, -1)">▲</button>
                    <button class="btn-move" onclick="moveItem('${vendor}', ${index}, 1)">▼</button>
                </div>
                <div class="manage-info">
                    <span class="manage-name">
                        ${item.품목명}
                        ${impBadge}
                        ${cycleBadge}
                    </span>
                    <span class="manage-unit">${item.발주단위}</span>
                </div>
                <div class="manage-actions">
                    <button class="btn-edit" onclick="openEditItemModal('${vendor}', ${index})">수정</button>
                    <button class="btn-delete" onclick="deleteItem('${vendor}', ${index})">삭제</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

function moveItem(vendor, index, direction) {
    const list = items[vendor];
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= list.length) return; 
    
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;
    
    renderManageItems(); 
}

function deleteItem(vendor, index) {
    if (!confirm('정말 이 품목을 삭제하시겠습니까? (재고 데이터도 함께 사라질 수 있습니다)')) return;
    
    items[vendor].splice(index, 1);
    renderManageItems();
}

// [수정됨] 새 품목 추가 (중요도, 관리주기 받기)
function addNewItem() {
    const vendor = document.getElementById('newItemVendor').value;
    const name = document.getElementById('newItemName').value.trim();
    const unit = document.getElementById('newItemUnit').value.trim();
    // [NEW] 입력값 가져오기
    const importance = document.getElementById('newItemImportance').value;
    const cycle = document.getElementById('newItemCycle').value;
    
    if (!name) {
        showAlert('품목명을 입력하세요', 'error');
        return;
    }
    
    if (!items[vendor]) items[vendor] = [];
    
    const exists = items[vendor].some(i => i.품목명 === name);
    if (exists) {
        showAlert('이미 존재하는 품목입니다.', 'error');
        return;
    }
    
    items[vendor].push({
        "품목명": name,
        "발주단위": unit || '개',
        "중요도": importance, // [NEW]
        "관리주기": cycle     // [NEW] (daily or weekly)
    });
    
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemUnit').value = '';
    
    showAlert(`'${name}' 추가되었습니다.`, 'success');
    
    if (document.getElementById('manageVendorSelect').value === vendor) {
        renderManageItems();
    }
}

// [NEW] 수정 모달 열기
function openEditItemModal(vendor, index) {
    const item = items[vendor][index];
    if (!item) return;

    document.getElementById('editVendor').value = vendor;
    document.getElementById('editIndex').value = index;
    
    document.getElementById('editName').value = item.품목명;
    document.getElementById('editUnit').value = item.발주단위;
    document.getElementById('editImportance').value = item.중요도 || '중';
    document.getElementById('editCycle').value = item.관리주기 || 'daily';

    document.getElementById('editItemModal').classList.add('active');
}

// [NEW] 수정 모달 닫기
function closeEditItemModal() {
    document.getElementById('editItemModal').classList.remove('active');
}

// [NEW] 수정사항 저장
function saveEditItem() {
    const vendor = document.getElementById('editVendor').value;
    const index = parseInt(document.getElementById('editIndex').value);
    
    const newName = document.getElementById('editName').value.trim();
    const newUnit = document.getElementById('editUnit').value.trim();
    const newImp = document.getElementById('editImportance').value;
    const newCycle = document.getElementById('editCycle').value;

    if (!newName) {
        showAlert('품목명을 입력해주세요.', 'error');
        return;
    }

    // 데이터 업데이트
    items[vendor][index] = {
        ...items[vendor][index],
        "품목명": newName,
        "발주단위": newUnit,
        "중요도": newImp,
        "관리주기": newCycle
    };

    closeEditItemModal();
    renderManageItems(); // 리스트 새로고침
    showAlert('수정되었습니다. 하단의 [저장] 버튼을 눌러 확정하세요.', 'success');
}

async function saveItemChanges() {
    try {
        await fetch(`${API_BASE}/api/inventory/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items })
        });
        showAlert('품목 순서 및 변경사항이 저장되었습니다.', 'success');
        
        renderUnifiedInventoryForm(); 
    } catch (e) {
        console.error(e);
        showAlert('저장되었습니다 (로컬).', 'success');
        renderUnifiedInventoryForm();
    }
}

async function loadRecentInventory() {
    try {
        const response = await fetch(`${API_BASE}/api/inventory/history?period=5&vendor=all`);
        const result = await response.json();
        
        if (result.success && result.history) {
            recentHistory = result.history; 
        }
    } catch (error) {
        console.error('최근 재고 로드 실패:', error);
    }
}

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
            
            html += `</tbody></table></div>`;
        }
    }
    
    if (!html) {
        html = '<p style="text-align: center; color: #999; padding: 30px;">해당 기간의 미발주 품목이 없습니다.</p>';
    }
    
    content.innerHTML = html;
}

function setStockValue(itemKey, value) {
    const input = document.getElementById(`current_${itemKey}`);
    if (input) {
        input.value = value;
        input.style.backgroundColor = '#e8f5e9';
        setTimeout(() => {
            input.style.backgroundColor = 'white';
        }, 300);
    }
}