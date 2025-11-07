// 음식점 예약 시스템 - 프론트엔드 로직

// 전역 변수
let reservations = [];
let soundEnabled = true;
let lastNotificationTime = 0;
let selectedTables = new Set();
const API_BASE = '';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // 기본값 설정
    const dateInput = document.getElementById('date');
    const statusDateInput = document.getElementById('statusDate');
    
    if (dateInput) dateInput.value = getCurrentDate();
    if (statusDateInput) statusDateInput.value = getCurrentDate();
    
    // 소리 설정 로드
    const savedSoundSetting = localStorage.getItem('soundEnabled');
    if (savedSoundSetting !== null) {
        soundEnabled = savedSoundSetting === 'true';
        updateSoundButtonUI();
    }
    
    // 테이블 레이아웃 초기화
    initializeTableLayout();
    
    // 날짜/시간 변경 시 테이블 가용성 업데이트
    if (dateInput) dateInput.addEventListener('change', updateTableAvailability);
    const timeInput = document.getElementById('time');
    if (timeInput) timeInput.addEventListener('change', updateTableAvailability);
    
    // 데이터 로드
    await loadReservations();
    
    // 15분 전 알림 체크 시작
    setInterval(checkUpcomingReservations, 60000);
    
    // 연결 상태 주기적 확인
    setInterval(checkConnectionStatus, 30000);
    
    // 새 예약 주기적 확인
    setInterval(checkForNewReservations, 100000);
    
    // 초기 UI 업데이트
    updateStatus();
    updateAllReservationTable();
    
    console.log('✅ 예약 시스템이 초기화되었습니다.');
});

// =========================
// 테이블 레이아웃 관련
// =========================

// 17개 테이블 레이아웃 초기화 (이미지 기준)
function initializeTableLayout() {
    const container = document.getElementById('table-selection');
    if (!container) return;
    
    // 테이블 레이아웃 (이미지 구조 기준)
    // Row 1: 6  5     4  3     2     1
    // Row 2:          12       11          10
    // Row 3:          9        8           7
    // Row 4: 17 16             15 14       13
    
    // 변경
    const layout = [
        [13, '', 10, 7, '', 1],
        [14, '', 11, 8, '', 2],
        [15, '', '', '', '', 3],
        [16, '', 12, 9, '', 4],
        [17, '', '', '', '', 5],
        ['', '', '', '', '', 6]
    ];
    
    const tableLayout = document.createElement('div');
    tableLayout.className = 'table-layout';
    
    layout.forEach(row => {
        row.forEach(tableNum => {
            const tableItem = document.createElement('div');
            tableItem.className = 'table-item';
            
            if (tableNum === '') {
                tableItem.classList.add('empty');
            } else {
                tableItem.textContent = `T${tableNum}`;
                tableItem.setAttribute('data-table', `table-${tableNum}`);
                tableItem.onclick = () => toggleTableSelection(`table-${tableNum}`);
            }
            
            tableLayout.appendChild(tableItem);
        });
    });
    
    container.innerHTML = '';
    container.appendChild(tableLayout);
}

// 테이블 선택/해제
function toggleTableSelection(tableId) {
    const tableBtn = document.querySelector(`[data-table="${tableId}"]`);
    
    if (tableBtn && tableBtn.classList.contains('disabled')) {
        showAlert('이미 예약된 테이블입니다.', 'error');
        return;
    }
    
    if (selectedTables.has(tableId)) {
        selectedTables.delete(tableId);
        if (tableBtn) tableBtn.classList.remove('selected');
    } else {
        selectedTables.add(tableId);
        if (tableBtn) tableBtn.classList.add('selected');
    }
    
    document.getElementById('selectedTables').value = Array.from(selectedTables).join(',');
}

// 테이블 가용성 업데이트
async function updateTableAvailability() {
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    
    if (!date || !time) {
        // 모든 테이블 활성화
        document.querySelectorAll('.table-item').forEach(btn => {
            btn.classList.remove('disabled');
        });
        return;
    }
    
    // 해당 시간대의 예약 확인
    const conflictingReservations = reservations.filter(r => 
        r.status === 'active' && 
        r.date === date && 
        isTimeOverlap(r.time, time)
    );
    
    const usedTables = new Set();
    conflictingReservations.forEach(r => {
        if (r.tables) {
            r.tables.forEach(t => usedTables.add(t));
        }
    });
    
    // 모든 테이블 버튼 상태 업데이트
    document.querySelectorAll('.table-item').forEach(btn => {
        const tableId = btn.getAttribute('data-table');
        if (tableId && usedTables.has(tableId)) {
            btn.classList.add('disabled');
            btn.classList.remove('selected');
            selectedTables.delete(tableId);
        } else if (tableId) {
            btn.classList.remove('disabled');
        }
    });
    
    document.getElementById('selectedTables').value = Array.from(selectedTables).join(',');
}

// =========================
// UI 헬퍼 함수들
// =========================

function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showTab(tabName) {
    // 모든 탭 비활성화
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'status') {
        updateStatus();
    } else if (tabName === 'table') {
        updateAllReservationTable();
    }
}

function changePeople(delta) {
    const input = document.getElementById('people');
    let value = parseInt(input.value) || 2;
    value = Math.max(1, Math.min(68, value + delta));
    input.value = value;
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${type}`;
        alertDiv.textContent = message;
        
        alertContainer.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

function showNotification(message, type = 'success') {
    const now = Date.now();
    if (now - lastNotificationTime < 1000) return;
    lastNotificationTime = now;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    playNotificationSound();
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    updateSoundButtonUI();
    localStorage.setItem('soundEnabled', soundEnabled);
}

function updateSoundButtonUI() {
    const soundIcon = document.getElementById('soundIcon');
    if (soundIcon) {
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    }
}

function playNotificationSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.6);
    } catch (error) {
        console.log('알림음 재생 실패:', error);
    }
}

// =========================
// API 통신
// =========================

async function loadReservations() {
    try {
        const response = await fetch(`${API_BASE}/api/reservations`);
        const data = await response.json();
        
        if (data.success) {
            reservations = data.reservations;
            updateStatus();
            updateAllReservationTable();
        }
    } catch (error) {
        console.error('예약 로드 실패:', error);
        showAlert('예약 데이터를 불러오는데 실패했습니다.', 'error');
    }
}

async function submitReservation(event) {
    event.preventDefault();
    
    if (selectedTables.size === 0) {
        showAlert('테이블을 선택해주세요.', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ 처리 중...</span>';
    
    const formData = {
        name: document.getElementById('name').value,
        people: parseInt(document.getElementById('people').value),
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        phone: document.getElementById('phone').value || '',
        requests: document.getElementById('requests').value || '',
        tables: Array.from(selectedTables)
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('예약이 완료되었습니다! 🎉', 'success');
            
            // 폼 초기화
            event.target.reset();
            selectedTables.clear();
            document.querySelectorAll('.table-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            document.getElementById('selectedTables').value = '';
            document.getElementById('date').value = getCurrentDate();
            document.getElementById('people').value = 2;
            
            // 데이터 새로고침
            await loadReservations();
        } else {
            showAlert(result.error, 'error');
        }
    } catch (error) {
        console.error('예약 생성 오류:', error);
        showAlert('예약 중 오류가 발생했습니다.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function deleteReservation(id) {
    if (!confirm('정말 이 예약을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/reservations/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('예약이 삭제되었습니다.', 'success');
            await loadReservations();
        } else {
            showAlert(result.error, 'error');
        }
    } catch (error) {
        console.error('예약 삭제 오류:', error);
        showAlert('예약 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// =========================
// 예약현황 업데이트
// =========================

function updateStatus() {
    const selectedDate = document.getElementById('statusDate').value;
    const todayReservations = reservations.filter(r => 
        r.status === 'active' && r.date === selectedDate
    );
    
    // 통계 업데이트
    document.getElementById('totalReservations').textContent = todayReservations.length;
    
    const totalPeople = todayReservations.reduce((sum, r) => sum + r.people, 0);
    document.getElementById('totalPeople').textContent = totalPeople;
    
    const usedTablesSet = new Set();
    todayReservations.forEach(r => {
        if (r.tables) {
            r.tables.forEach(t => usedTablesSet.add(t));
        }
    });
    document.getElementById('usedTables').textContent = `${usedTablesSet.size}/17`;
    
    // 시간대별 예약 표시
    displayTimeSlots(todayReservations);
    
    // 예약 목록 테이블 업데이트
    updateReservationTable(todayReservations);
}

function displayTimeSlots(reservations) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (!timeSlotsContainer) return;
    
    // 시간대별로 그룹화
    const groupedByTime = {};
    reservations.forEach(r => {
        if (!groupedByTime[r.time]) {
            groupedByTime[r.time] = [];
        }
        groupedByTime[r.time].push(r);
    });
    
    // 시간순 정렬
    const sortedTimes = Object.keys(groupedByTime).sort();
    
    if (sortedTimes.length === 0) {
        timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">예약이 없습니다.</p>';
        return;
    }
    
    let html = '';
    sortedTimes.forEach(time => {
        const reservationsAtTime = groupedByTime[time];
        
        html += `
            <div class="time-slot">
                <div class="time-slot-header">⏰ ${time} (${reservationsAtTime.length}팀)</div>
                <div class="time-slot-reservations">
        `;
        
        reservationsAtTime.forEach(r => {
            const tableDisplay = r.tables.map(t => 
                t.replace('table-', 'T')
            ).join(', ');
            
            html += `
                <div class="reservation-card">
                    <div class="reservation-tables">${tableDisplay}</div>
                    <div class="reservation-info">
                        <div class="reservation-name">${r.name}님</div>
                        <div class="reservation-details">
                            👥 ${r.people}명 
                            ${r.phone ? `| 📞 ${r.phone}` : ''}
                            ${r.requests ? `<br>📝 ${r.requests}` : ''}
                        </div>
                    </div>
                    <div class="reservation-actions">
                        <button class="btn btn-edit" onclick="editReservation('${r.id}')">수정</button>
                        <button class="btn btn-delete" onclick="deleteReservation('${r.id}')">삭제</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    timeSlotsContainer.innerHTML = html;
}

function updateReservationTable(todayReservations) {
    const tbody = document.getElementById('reservationTableBody');
    if (!tbody) return;
    
    if (todayReservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">예약이 없습니다.</td></tr>';
        return;
    }
    
    // 시간순 정렬
    const sortedReservations = [...todayReservations].sort((a, b) => 
        a.time.localeCompare(b.time)
    );
    
    let html = '';
    sortedReservations.forEach(r => {
        const tableDisplay = r.tables.map(t => 
            t.replace('table-', 'T')
        ).join(', ');
        
        html += `
            <tr>
                <td>${r.time}</td>
                <td>${r.name}</td>
                <td>${r.people}명</td>
                <td>${tableDisplay}</td>
                <td>${r.phone || '-'}</td>
                <td>
                    <button class="btn btn-edit" onclick="editReservation('${r.id}')">수정</button>
                    <button class="btn btn-delete" onclick="deleteReservation('${r.id}')">삭제</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// =========================
// 예약현황(표) 탭 업데이트
// =========================

function updateAllReservationTable() {
    const tbody = document.getElementById('allReservationTableBody');
    if (!tbody) return;
    
    const today = getCurrentDate();
    
    // 당일부터 미래 예약만 필터링
    const futureReservations = reservations.filter(r => 
        r.status === 'active' && r.date >= today
    );
    
    if (futureReservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">예약이 없습니다.</td></tr>';
        return;
    }
    
    // 날짜, 시간순 정렬
    const sortedReservations = [...futureReservations].sort((a, b) => {
        if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
        }
        return a.time.localeCompare(b.time);
    });
    
    let html = '';
    sortedReservations.forEach(r => {
        const tableDisplay = r.tables.map(t => 
            t.replace('table-', 'T')
        ).join(', ');
        
        html += `
            <tr>
                <td>${r.date}</td>
                <td>${r.time}</td>
                <td>${r.name}</td>
                <td>${r.people}명</td>
                <td>${tableDisplay}</td>
                <td>${r.phone || '-'}</td>
                <td>${r.requests || '-'}</td>
                <td>
                    <button class="btn btn-edit" onclick="editReservation('${r.id}')">수정</button>
                    <button class="btn btn-delete" onclick="deleteReservation('${r.id}')">삭제</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// =========================
// 예약 수정
// =========================

function editReservation(id) {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) {
        showAlert('예약을 찾을 수 없습니다.', 'error');
        return;
    }
    
    // 시간 옵션 생성
    const timeOptions = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
                        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', 
                        '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
    const timeOptionsHtml = timeOptions.map(t => 
        `<option value="${t}" ${t === reservation.time ? 'selected' : ''}>${t}</option>`
    ).join('');
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>📝 예약 수정</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="editForm" onsubmit="updateReservation(event, '${id}')">
                <div class="form-group">
                    <label for="editName">성함 <span class="required">*</span></label>
                    <input type="text" id="editName" value="${reservation.name}" required>
                </div>
                
                <div class="form-group">
                    <label for="editPeople">인원수 <span class="required">*</span></label>
                    <div class="number-input">
                        <button type="button" class="number-btn" onclick="changeEditPeople(-1)">-</button>
                        <input type="number" id="editPeople" value="${reservation.people}" min="1" max="68" required readonly>
                        <button type="button" class="number-btn" onclick="changeEditPeople(1)">+</button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="editDate">예약일자 <span class="required">*</span></label>
                    <input type="date" id="editDate" value="${reservation.date}" required onchange="updateEditTableAvailability()">
                </div>
                
                <div class="form-group">
                    <label for="editTime">시간 <span class="required">*</span></label>
                    <select id="editTime" required onchange="updateEditTableAvailability()">
                        ${timeOptionsHtml}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="editPhone">연락처</label>
                    <input type="tel" id="editPhone" value="${reservation.phone || ''}">
                </div>
                
                <div class="form-group">
                    <label for="editRequests">예약 요구사항</label>
                    <textarea id="editRequests" rows="3">${reservation.requests || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>테이블 선택 <span class="required">*</span></label>
                    <div id="editTableSelection"></div>
                    <input type="hidden" id="editSelectedTables" required>
                </div>
                
                <button type="submit" class="submit-btn">
                    <span>✨ 수정 완료</span>
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 수정용 테이블 레이아웃 초기화
    initializeEditTableLayout(reservation.tables, id);
    updateEditTableAvailability();
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

let editSelectedTables = new Set();
let currentEditId = '';

function initializeEditTableLayout(selectedTableIds, reservationId) {
    editSelectedTables = new Set(selectedTableIds);
    currentEditId = reservationId;
    
    const container = document.getElementById('editTableSelection');
    if (!container) return;
    
    // 변경 (동일하게)
    const layout = [
        [13, '', 10, 7, '', 1],
        [14, '', 11, 8, '', 2],
        [15, '', '', '', '', 3],
        [16, '', 12, 9, '', 4],
        [17, '', '', '', '', 5],
        ['', '', '', '', '', 6]
    ];
    
    const tableLayout = document.createElement('div');
    tableLayout.className = 'table-layout';
    
    layout.forEach(row => {
        row.forEach(tableNum => {
            const tableItem = document.createElement('div');
            tableItem.className = 'table-item';
            
            if (tableNum === '') {
                tableItem.classList.add('empty');
            } else {
                const tableId = `table-${tableNum}`;
                tableItem.textContent = `T${tableNum}`;
                tableItem.setAttribute('data-table', tableId);
                tableItem.onclick = () => toggleEditTableSelection(tableId);
                
                if (editSelectedTables.has(tableId)) {
                    tableItem.classList.add('selected');
                }
            }
            
            tableLayout.appendChild(tableItem);
        });
    });
    
    container.innerHTML = '';
    container.appendChild(tableLayout);
    
    document.getElementById('editSelectedTables').value = Array.from(editSelectedTables).join(',');
}

function toggleEditTableSelection(tableId) {
    const tableBtn = document.querySelector(`#editTableSelection [data-table="${tableId}"]`);
    
    if (tableBtn && tableBtn.classList.contains('disabled')) {
        showAlert('이미 예약된 테이블입니다.', 'error');
        return;
    }
    
    if (editSelectedTables.has(tableId)) {
        editSelectedTables.delete(tableId);
        if (tableBtn) tableBtn.classList.remove('selected');
    } else {
        editSelectedTables.add(tableId);
        if (tableBtn) tableBtn.classList.add('selected');
    }
    
    document.getElementById('editSelectedTables').value = Array.from(editSelectedTables).join(',');
}

function updateEditTableAvailability() {
    const date = document.getElementById('editDate').value;
    const time = document.getElementById('editTime').value;
    
    if (!date || !time) {
        document.querySelectorAll('#editTableSelection .table-item').forEach(btn => {
            btn.classList.remove('disabled');
        });
        return;
    }
    
    const conflictingReservations = reservations.filter(r => 
        r.status === 'active' && 
        r.id !== currentEditId &&
        r.date === date && 
        isTimeOverlap(r.time, time)
    );
    
    const usedTables = new Set();
    conflictingReservations.forEach(r => {
        if (r.tables) {
            r.tables.forEach(t => usedTables.add(t));
        }
    });
    
    document.querySelectorAll('#editTableSelection .table-item').forEach(btn => {
        const tableId = btn.getAttribute('data-table');
        if (tableId && usedTables.has(tableId)) {
            btn.classList.add('disabled');
            btn.classList.remove('selected');
            editSelectedTables.delete(tableId);
        } else if (tableId) {
            btn.classList.remove('disabled');
        }
    });
    
    document.getElementById('editSelectedTables').value = Array.from(editSelectedTables).join(',');
}

function changeEditPeople(delta) {
    const input = document.getElementById('editPeople');
    let value = parseInt(input.value) || 2;
    value = Math.max(1, Math.min(68, value + delta));
    input.value = value;
}

async function updateReservation(event, id) {
    event.preventDefault();
    
    if (editSelectedTables.size === 0) {
        showAlert('테이블을 선택해주세요.', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ 처리 중...</span>';
    
    const updatedData = {
        name: document.getElementById('editName').value,
        people: parseInt(document.getElementById('editPeople').value),
        date: document.getElementById('editDate').value,
        time: document.getElementById('editTime').value,
        phone: document.getElementById('editPhone').value || '',
        requests: document.getElementById('editRequests').value || '',
        tables: Array.from(editSelectedTables)
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/reservations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.querySelector('.modal').remove();
            showNotification('예약이 수정되었습니다.', 'success');
            await loadReservations();
        } else {
            showAlert(result.error, 'error');
        }
    } catch (error) {
        console.error('예약 수정 오류:', error);
        showAlert('예약 수정 중 오류가 발생했습니다.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// =========================
// 유틸리티 함수
// =========================

function isTimeOverlap(time1, time2) {
    if (time1 === time2) return true;
    
    const [hour1, minute1] = time1.split(':').map(Number);
    const [hour2, minute2] = time2.split(':').map(Number);
    
    const startTime1 = hour1 * 60 + minute1;
    const endTime1 = startTime1 + 180;
    
    const startTime2 = hour2 * 60 + minute2;
    const endTime2 = startTime2 + 180;
    
    return (startTime1 < endTime2 && startTime2 < endTime1);
}

async function checkConnectionStatus() {
    try {
        await fetch(`${API_BASE}/api/reservations`);
        document.getElementById('connectionStatus').innerHTML = '🟢 연결됨';
    } catch (error) {
        document.getElementById('connectionStatus').innerHTML = '🔴 연결 끊김';
    }
}

async function checkForNewReservations() {
    const currentLength = reservations.length;
    await loadReservations();
    
    if (reservations.length > currentLength) {
        showNotification('새로운 예약이 등록되었습니다!', 'info');
    }
}

function checkUpcomingReservations() {
    const now = new Date();
    const currentDate = getCurrentDate();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    reservations.forEach(r => {
        if (r.status === 'active' && r.date === currentDate) {
            const [rHour, rMinute] = r.time.split(':').map(Number);
            const [cHour, cMinute] = currentTime.split(':').map(Number);
            
            const reservationMinutes = rHour * 60 + rMinute;
            const currentMinutes = cHour * 60 + cMinute;
            const diff = reservationMinutes - currentMinutes;
            
            if (diff > 0 && diff <= 15 && !r.notified) {
                showNotification(`⏰ ${r.name}님 예약 15분 전입니다! (${r.time})`, 'info');
                r.notified = true;
            }
        }
    });
}
