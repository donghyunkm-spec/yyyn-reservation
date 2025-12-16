// server.js - 간단한 예약 시스템 (17개 테이블, 각 4명)
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 데이터 파일 경로 (Railway Volume 사용)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');
const INVENTORY_ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const INVENTORY_CURRENT_FILE = path.join(DATA_DIR, 'inventory.json');
const INVENTORY_USAGE_FILE = path.join(DATA_DIR, 'daily_usage.json');
const INVENTORY_ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const INVENTORY_HOLIDAYS_FILE = path.join(DATA_DIR, 'holidays.json');
const INVENTORY_LAST_ORDERS_FILE = path.join(DATA_DIR, 'last_orders.json');
const INVENTORY_HISTORY_FILE = path.join(DATA_DIR, 'inventory_history.json');

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 데이터 디렉토리 생성됨:', DATA_DIR);
}

// 재고관리 초기 데이터 생성
function initializeInventoryData() {
    // 품목 데이터 초기화
    if (!fs.existsSync(INVENTORY_ITEMS_FILE)) {
        const initialItems = {
            '삼시세끼': [
                { 품목명: '부추', 중요도: '상', 발주단위: '단' },
                { 품목명: '배추', 중요도: '상', 발주단위: '망' },
                { 품목명: '무', 중요도: '상', 발주단위: '박스' },
                { 품목명: '업소용 대파', 중요도: '상', 발주단위: '단' },
                { 품목명: '오이', 중요도: '상', 발주단위: '개' },
                { 품목명: '상추', 중요도: '중', 발주단위: '박스' },
                { 품목명: '양파', 중요도: '중', 발주단위: '망' },
                { 품목명: '쪽파', 중요도: '중', 발주단위: '단' },
                { 품목명: '청양고추', 중요도: '하', 발주단위: 'kg' },
                { 품목명: '당근', 중요도: '하', 발주단위: '박스' },
                { 품목명: '적채', 중요도: '하', 발주단위: '개' },
                { 품목명: '호박고구마', 중요도: '하', 발주단위: '박스' },
                { 품목명: '판두부', 중요도: '상', 발주단위: '판' },
                { 품목명: '곱슬이 콩나물', 중요도: '상', 발주단위: '박스' },
                { 품목명: '굴(생굴)', 중요도: '중', 발주단위: 'kg' },
                { 품목명: '쌀', 중요도: '중', 발주단위: '포대' },
                { 품목명: '라면사리', 중요도: '하', 발주단위: '박스' },
                { 품목명: '신라면', 중요도: '하', 발주단위: '박스' },
                { 품목명: '떡국떡', 중요도: '하', 발주단위: '봉지' },
                { 품목명: '계란', 중요도: '상', 발주단위: '판' },
                { 품목명: '계란 지단', 중요도: '하', 발주단위: '개' },
                { 품목명: '마늘(깐마늘)', 중요도: '상', 발주단위: '봉지' },
                { 품목명: '다진마늘(냉동)', 중요도: '중', 발주단위: '봉지' },
                { 품목명: '백설/해표 참기름', 중요도: '하', 발주단위: '통' },
                { 품목명: '들깨가루(껍질없는)', 중요도: '하', 발주단위: '봉지' },
                { 품목명: '와사비분', 중요도: '하', 발주단위: '개' },
                { 품목명: '와사비믹스간장', 중요도: '하', 발주단위: '봉지' },
                { 품목명: '간장(몽고/말통)', 중요도: '하', 발주단위: '통' },
                { 품목명: '쌈장(양념)', 중요도: '하', 발주단위: '박스' },
                { 품목명: '식용유', 중요도: '하', 발주단위: '통' },
                { 품목명: '굵은소금', 중요도: '하', 발주단위: '포대' },
                { 품목명: '설탕', 중요도: '하', 발주단위: '개' },
                { 품목명: '통후추', 중요도: '하', 발주단위: '통' },
                { 품목명: '월계수잎', 중요도: '하', 발주단위: '통' },
                { 품목명: '파슬리가루', 중요도: '하', 발주단위: '통' },
                { 품목명: '쇠고기다시다', 중요도: '하', 발주단위: '봉지' },
                { 품목명: '재래식된장(트리오)', 중요도: '하', 발주단위: '통' },
                { 품목명: '중국산 배추김치', 중요도: '중', 발주단위: '박스' },
                { 품목명: '냉면용 흰김치', 중요도: '중', 발주단위: '팩' },
                { 품목명: '홀 흰 쌈무', 중요도: '하', 발주단위: '팩' },
                { 품목명: '스위트콘', 중요도: '중', 발주단위: '박스' },
                { 품목명: '미역줄기', 중요도: '중', 발주단위: '박스' },
                { 품목명: '마요네즈', 중요도: '하', 발주단위: '개' },
                { 품목명: '건포도', 중요도: '하', 발주단위: '개' },
                { 품목명: '김가루', 중요도: '하', 발주단위: '개' },
                { 품목명: '볶음참깨', 중요도: '하', 발주단위: '봉지' },
                { 품목명: '곰표 밀가루', 중요도: '하', 발주단위: '봉지' },
                { 품목명: '생수 500ml', 중요도: '상', 발주단위: '개' },
                { 품목명: '물티슈', 중요도: '상', 발주단위: '박스' },
                { 품목명: '네프킨/냅킨', 중요도: '상', 발주단위: '박스' },
                { 품목명: '종이컵', 중요도: '상', 발주단위: '박스' },
                { 품목명: '라텍스장갑', 중요도: '중', 발주단위: '개' },
                { 품목명: '종량제봉투', 중요도: '하', 발주단위: '묶음' },
                { 품목명: '목장갑', 중요도: '하', 발주단위: '묶음' },
                { 품목명: '랩', 중요도: '하', 발주단위: '개' },
                { 품목명: '파란봉지', 중요도: '하', 발주단위: '묶음' },
                { 품목명: '핸드타올', 중요도: '하', 발주단위: '박스' },
                { 품목명: '위생장갑', 중요도: '하', 발주단위: '개' },
                { 품목명: '롤밧', 중요도: '하', 발주단위: '개' },
                { 품목명: '분무기', 중요도: '하', 발주단위: '개' },
                { 품목명: '퐁퐁 펌프통', 중요도: '하', 발주단위: '개' },
                { 품목명: '세탁세제', 중요도: '하', 발주단위: '통' },
                { 품목명: '고기만두', 중요도: '하', 발주단위: '봉지' },
                { 품목명: '김치만두', 중요도: '하', 발주단위: '봉지' }
            ],
            'SPC': [
                { 품목명: '삼겹살(양은이네/20kg/냉동/수입산)', 발주단위: 'kg' },
                { 품목명: '[6통]동태(양은이네/20kg/냉동/수입산)', 발주단위: 'box' },
                { 품목명: '손질오징어(양은이네/30미/냉동/수입산)', 발주단위: 'box' },
                { 품목명: '냉면육수(양은이네/10kg/상온)', 발주단위: 'box' },
                { 품목명: '덩어리편육(양은이네/300g/냉동/국내산)', 발주단위: 'pak' },
                { 품목명: '돌돌김치다대기(양은이네/10kg/냉장/국내산)', 발주단위: 'box' },
                { 품목명: '초무침소스(양은이네/10kg/냉장/국내산)', 발주단위: 'box' },
                { 품목명: '춘천막국수(양은이네/20kg/냉동/국내산)', 발주단위: 'box' },
                { 품목명: '동태탕시즈닝(양은이네/10kg/상온/국내산)', 발주단위: 'box' },
                { 품목명: '명태곤이(양은이네/22.5kg/냉동/수입산)', 발주단위: 'box' },
                { 품목명: '명란(양은이네/22.5kg/냉동/수입산)', 발주단위: 'box' },
                { 품목명: '보쌈무생채(양은이네/10kg/냉동/국내산)', 발주단위: 'box' },
                { 품목명: '어리굴젓(양은이네/8kg/냉동/국내산)', 발주단위: 'box' },
                { 품목명: '불냉면소스(양은이네/10kg/냉장/국내산)', 발주단위: 'box' },
                { 품목명: '명태회무침(양은이네/10kg/냉장/국내산)', 발주단위: 'box' },
                { 품목명: '무생채양념소스(양은이네/10kg/냉장/국내산)', 발주단위: 'box' }
            ],
            '기타': [
                { 품목명: '굴', 발주단위: 'kg' },
                { 품목명: '도시락용기', 발주단위: '개' }
            ]
        };
        
        fs.writeFileSync(INVENTORY_ITEMS_FILE, JSON.stringify(initialItems, null, 2), 'utf8');
        console.log('✅ 재고관리 품목 데이터 초기화 완료');
    }
    
    // 빈 파일들 생성
    if (!fs.existsSync(INVENTORY_CURRENT_FILE)) {
        fs.writeFileSync(INVENTORY_CURRENT_FILE, JSON.stringify({}, null, 2), 'utf8');
    }
    if (!fs.existsSync(INVENTORY_USAGE_FILE)) {
        fs.writeFileSync(INVENTORY_USAGE_FILE, JSON.stringify({}, null, 2), 'utf8');
    }
    if (!fs.existsSync(INVENTORY_ORDERS_FILE)) {
        fs.writeFileSync(INVENTORY_ORDERS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
    if (!fs.existsSync(INVENTORY_HOLIDAYS_FILE)) {
        // 업체별 휴일 관리
        const initialHolidays = {
            'store': [],
            '삼시세끼': [],
            'SPC': [],
            '기타': []
        };
        fs.writeFileSync(INVENTORY_HOLIDAYS_FILE, JSON.stringify(initialHolidays, null, 2), 'utf8');
    }
    if (!fs.existsSync(INVENTORY_LAST_ORDERS_FILE)) {
        fs.writeFileSync(INVENTORY_LAST_ORDERS_FILE, JSON.stringify({}, null, 2), 'utf8');
    }
    if (!fs.existsSync(INVENTORY_HISTORY_FILE)) {
        fs.writeFileSync(INVENTORY_HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
    }
}

initializeInventoryData();

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 시간 겹침 확인 함수
function isTimeOverlap(time1, time2) {
    if (time1 === time2) return true;
    
    const [hour1, minute1] = time1.split(':').map(Number);
    const [hour2, minute2] = time2.split(':').map(Number);
    
    const startTime1 = hour1 * 60 + minute1;
    const endTime1 = startTime1 + 180; // 3시간 이용
    
    const startTime2 = hour2 * 60 + minute2;
    const endTime2 = startTime2 + 180; // 3시간 이용
    
    return (startTime1 < endTime2 && startTime2 < endTime1);
}

// 테이블 충돌 검사 함수
function checkTableConflict(newReservation, existingReservations) {
    const conflictingReservations = existingReservations.filter(r => 
        r.status === 'active' && 
        r.date === newReservation.date && 
        isTimeOverlap(r.time, newReservation.time)
    );
    
    const usedTables = new Set();
    conflictingReservations.forEach(r => {
        if (r.tables) {
            r.tables.forEach(t => usedTables.add(t));
        }
    });
    
    const conflictTables = newReservation.tables.filter(t => usedTables.has(t));
    
    return conflictTables;
}

// 예약 데이터 로드
function loadReservations() {
    try {
        if (fs.existsSync(RESERVATIONS_FILE)) {
            const data = fs.readFileSync(RESERVATIONS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('예약 데이터 로드 실패:', error);
        return [];
    }
}

// 예약 데이터 저장
function saveReservations(reservations) {
    try {
        fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(reservations, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('예약 데이터 저장 실패:', error);
        return false;
    }
}

// 시간 더하기 함수
function addHours(timeStr, hours) {
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr);
    hour = (hour + hours) % 24;
    return `${hour.toString().padStart(2, '0')}:${minuteStr}`;
}

// 선호도 텍스트 변환
function getPreferenceText(preference) {
    switch(preference) {
        case 'room': return '룸 선호';
        case 'hall': return '홀 선호';
        default: return '관계없음';
    }
}

// API: 모든 예약 조회
app.get('/api/reservations', (req, res) => {
    try {
        const reservations = loadReservations();
        res.json({ success: true, reservations });
    } catch (error) {
        console.error('예약 조회 오류:', error);
        res.status(500).json({ success: false, error: '예약 조회 실패' });
    }
});

// API: 새 예약 생성
app.post('/api/reservations', async (req, res) => {
    try {
        const { name, people, date, time, phone, requests, tables } = req.body;
        
        // 유효성 검사
        if (!name || !people || !date || !time || !tables || tables.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: '필수 정보를 모두 입력해주세요.' 
            });
        }
        
        const reservations = loadReservations();
        
        // 테이블 충돌 검사
        const newReservation = { date, time, tables };
        const conflictTables = checkTableConflict(newReservation, reservations);
        
        if (conflictTables.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `선택한 테이블 중 이미 예약된 테이블이 있습니다: ${conflictTables.join(', ')}` 
            });
        }
        
        // 새 예약 생성
        const reservation = {
            id: Date.now().toString(),
            name,
            people: parseInt(people),
            date,
            time,
            phone: phone || '',
            requests: requests || '',
            tables,
            status: 'active',
            timestamp: new Date().toISOString()
        };
        
        reservations.push(reservation);
        
        if (!saveReservations(reservations)) {
            return res.status(500).json({ 
                success: false, 
                error: '예약 저장 실패' 
            });
        }
        
        console.log(`✅ 새 예약: ${name}님 ${people}명, 테이블: ${tables.join(', ')}`);
        
        res.json({ 
            success: true, 
            reservation
        });
        
    } catch (error) {
        console.error('예약 생성 오류:', error);
        res.status(500).json({ 
            success: false, 
            error: '예약 생성 중 오류가 발생했습니다.' 
        });
    }
});

// API: 예약 수정
app.put('/api/reservations/:id', async (req, res) => {
    try {
        const reservationId = req.params.id;
        const { name, people, date, time, phone, requests, tables } = req.body;
        
        if (!tables || tables.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: '테이블을 선택해주세요.' 
            });
        }
        
        const reservations = loadReservations();
        const index = reservations.findIndex(r => r.id === reservationId);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                error: '예약을 찾을 수 없습니다.' 
            });
        }
        
        // 다른 예약들과 충돌 검사
        const otherReservations = reservations.filter(r => r.id !== reservationId);
        const updatedReservation = { date, time, tables };
        const conflictTables = checkTableConflict(updatedReservation, otherReservations);
        
        if (conflictTables.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `선택한 테이블 중 이미 예약된 테이블이 있습니다: ${conflictTables.join(', ')}` 
            });
        }
        
        // 예약 업데이트
        reservations[index] = {
            ...reservations[index],
            name,
            people: parseInt(people),
            date,
            time,
            phone: phone || '',
            requests: requests || '',
            tables,
            updatedAt: new Date().toISOString()
        };
        
        if (!saveReservations(reservations)) {
            return res.status(500).json({ 
                success: false, 
                error: '예약 수정 저장 실패' 
            });
        }
        
        console.log(`✏️ 예약 수정: ${name}님 ${people}명, 테이블: ${tables.join(', ')}`);
        
        res.json({ 
            success: true, 
            reservation: reservations[index]
        });
        
    } catch (error) {
        console.error('예약 수정 오류:', error);
        res.status(500).json({ 
            success: false, 
            error: '예약 수정 중 오류가 발생했습니다.' 
        });
    }
});

// API: 예약 삭제
app.delete('/api/reservations/:id', async (req, res) => {
    try {
        const reservationId = req.params.id;
        const reservations = loadReservations();
        const index = reservations.findIndex(r => r.id === reservationId);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                error: '예약을 찾을 수 없습니다.' 
            });
        }
        
        const deletedReservation = reservations[index];
        reservations.splice(index, 1);
        
        if (!saveReservations(reservations)) {
            return res.status(500).json({ 
                success: false, 
                error: '예약 삭제 저장 실패' 
            });
        }
        
        console.log(`🗑️ 예약 삭제: ${deletedReservation.name}님`);
        
        res.json({ 
            success: true
        });
        
    } catch (error) {
        console.error('예약 삭제 오류:', error);
        res.status(500).json({ 
            success: false, 
            error: '예약 삭제 중 오류가 발생했습니다.' 
        });
    }
});

// API: 예약 상태 변경
app.patch('/api/reservations/:id/status', async (req, res) => {
    try {
        const reservationId = req.params.id;
        const { status } = req.body;
        
        const reservations = loadReservations();
        const index = reservations.findIndex(r => r.id === reservationId);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                error: '예약을 찾을 수 없습니다.' 
            });
        }
        
        reservations[index].status = status;
        
        if (!saveReservations(reservations)) {
            return res.status(500).json({ 
                success: false, 
                error: '상태 변경 저장 실패' 
            });
        }
        
        console.log(`📝 예약 상태 변경: ${reservations[index].name}님 -> ${status}`);
        
        res.json({ 
            success: true, 
            reservation: reservations[index]
        });
        
    } catch (error) {
        console.error('상태 변경 오류:', error);
        res.status(500).json({ 
            success: false, 
            error: '상태 변경 중 오류가 발생했습니다.' 
        });
    }
});

// ========================================
// 재고관리 API
// ========================================

// 품목 정보 조회
app.get('/api/inventory/items', (req, res) => {
    try {
        const data = fs.readFileSync(INVENTORY_ITEMS_FILE, 'utf8');
        const items = JSON.parse(data);
        res.json({ success: true, items });
    } catch (error) {
        console.error('품목 조회 오류:', error);
        res.status(500).json({ success: false, error: '품목 조회 실패' });
    }
});

// 현재 재고 조회
app.get('/api/inventory/current', (req, res) => {
    try {
        const data = fs.readFileSync(INVENTORY_CURRENT_FILE, 'utf8');
        const inventory = JSON.parse(data);
        res.json({ success: true, inventory });
    } catch (error) {
        console.error('재고 조회 오류:', error);
        res.status(500).json({ success: false, error: '재고 조회 실패' });
    }
});

// 현재 재고 저장
app.post('/api/inventory/current', (req, res) => {
    try {
        const { inventory } = req.body;
        fs.writeFileSync(INVENTORY_CURRENT_FILE, JSON.stringify(inventory, null, 2), 'utf8');
        
        // 재고 히스토리 저장
        let history = [];
        if (fs.existsSync(INVENTORY_HISTORY_FILE)) {
            const data = fs.readFileSync(INVENTORY_HISTORY_FILE, 'utf8');
            history = JSON.parse(data);
        }
        
        const now = new Date();
        const historyRecord = {
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0].substring(0, 5),
            inventory: {}
        };
        
        // 업체별로 재고 분류
        for (const itemKey in inventory) {
            const vendor = itemKey.split('_')[0];
            if (!historyRecord.inventory[vendor]) {
                historyRecord.inventory[vendor] = {};
            }
            historyRecord.inventory[vendor][itemKey] = inventory[itemKey];
        }
        
        history.push(historyRecord);
        
        // 최근 100개만 유지
        if (history.length > 100) {
            history = history.slice(-100);
        }
        
        fs.writeFileSync(INVENTORY_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
        
        res.json({ success: true });
    } catch (error) {
        console.error('재고 저장 오류:', error);
        res.status(500).json({ success: false, error: '재고 저장 실패' });
    }
});

// 하루 사용량 조회
app.get('/api/inventory/daily-usage', (req, res) => {
    try {
        const data = fs.readFileSync(INVENTORY_USAGE_FILE, 'utf8');
        const usage = JSON.parse(data);
        res.json({ success: true, usage });
    } catch (error) {
        console.error('하루 사용량 조회 오류:', error);
        res.status(500).json({ success: false, error: '하루 사용량 조회 실패' });
    }
});

// 하루 사용량 저장
app.post('/api/inventory/daily-usage', (req, res) => {
    try {
        const { usage } = req.body;
        fs.writeFileSync(INVENTORY_USAGE_FILE, JSON.stringify(usage, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        console.error('하루 사용량 저장 오류:', error);
        res.status(500).json({ success: false, error: '하루 사용량 저장 실패' });
    }
});

// 마지막 발주일 조회
app.get('/api/inventory/last-orders', (req, res) => {
    try {
        const data = fs.readFileSync(INVENTORY_LAST_ORDERS_FILE, 'utf8');
        const lastOrders = JSON.parse(data);
        res.json({ success: true, lastOrders });
    } catch (error) {
        console.error('마지막 발주일 조회 오류:', error);
        res.status(500).json({ success: false, error: '마지막 발주일 조회 실패' });
    }
});

// 발주 저장
app.post('/api/inventory/orders', (req, res) => {
    try {
        const orderRecord = req.body;
        
        // 기존 발주 내역 로드
        let orders = [];
        if (fs.existsSync(INVENTORY_ORDERS_FILE)) {
            const data = fs.readFileSync(INVENTORY_ORDERS_FILE, 'utf8');
            orders = JSON.parse(data);
        }
        
        // 새 발주 추가
        orders.push(orderRecord);
        fs.writeFileSync(INVENTORY_ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
        
        // 마지막 발주일 업데이트
        let lastOrders = {};
        if (fs.existsSync(INVENTORY_LAST_ORDERS_FILE)) {
            const data = fs.readFileSync(INVENTORY_LAST_ORDERS_FILE, 'utf8');
            lastOrders = JSON.parse(data);
        }
        
        const today = orderRecord.date;
        for (const vendor in orderRecord.orders) {
            orderRecord.orders[vendor].forEach(item => {
                const itemKey = `${vendor}_${item.품목명}`;
                lastOrders[itemKey] = today;
            });
        }
        
        fs.writeFileSync(INVENTORY_LAST_ORDERS_FILE, JSON.stringify(lastOrders, null, 2), 'utf8');
        
        console.log(`📦 발주 저장: ${orderRecord.date}`);
        res.json({ success: true });
    } catch (error) {
        console.error('발주 저장 오류:', error);
        res.status(500).json({ success: false, error: '발주 저장 실패' });
    }
});

// 발주 내역 조회
app.get('/api/inventory/orders', (req, res) => {
    try {
        const { period = 30, vendor = 'all' } = req.query;
        
        const data = fs.readFileSync(INVENTORY_ORDERS_FILE, 'utf8');
        let orders = JSON.parse(data);
        
        // 기간 필터링
        const periodDays = parseInt(period);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - periodDays);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        
        orders = orders.filter(order => order.date >= cutoffStr);
        
        // 업체 필터링
        if (vendor !== 'all') {
            orders = orders.map(order => ({
                ...order,
                orders: { [vendor]: order.orders[vendor] || [] }
            })).filter(order => order.orders[vendor] && order.orders[vendor].length > 0);
        }
        
        // 최신순 정렬
        orders.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        });
        
        res.json({ success: true, orders });
    } catch (error) {
        console.error('발주 내역 조회 오류:', error);
        res.status(500).json({ success: false, error: '발주 내역 조회 실패' });
    }
});

// 재고 내역 조회
app.get('/api/inventory/history', (req, res) => {
    try {
        const { period = 30, vendor = 'all' } = req.query;
        
        const data = fs.readFileSync(INVENTORY_HISTORY_FILE, 'utf8');
        let history = JSON.parse(data);
        
        // 기간 필터링
        const periodDays = parseInt(period);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - periodDays);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        
        history = history.filter(record => record.date >= cutoffStr);
        
        // 업체 필터링
        if (vendor !== 'all') {
            history = history.map(record => ({
                ...record,
                inventory: { [vendor]: record.inventory[vendor] || {} }
            })).filter(record => record.inventory[vendor] && Object.keys(record.inventory[vendor]).length > 0);
        }
        
        // 최신순 정렬
        history.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        });
        
        res.json({ success: true, history });
    } catch (error) {
        console.error('재고 내역 조회 오류:', error);
        res.status(500).json({ success: false, error: '재고 내역 조회 실패' });
    }
});

// 휴일 조회
app.get('/api/inventory/holidays', (req, res) => {
    try {
        const data = fs.readFileSync(INVENTORY_HOLIDAYS_FILE, 'utf8');
        const holidays = JSON.parse(data);
        res.json({ success: true, holidays });
    } catch (error) {
        console.error('휴일 조회 오류:', error);
        res.status(500).json({ success: false, error: '휴일 조회 실패' });
    }
});

// 휴일 저장
app.post('/api/inventory/holidays', (req, res) => {
    try {
        const { holidays } = req.body;
        fs.writeFileSync(INVENTORY_HOLIDAYS_FILE, JSON.stringify(holidays, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        console.error('휴일 저장 오류:', error);
        res.status(500).json({ success: false, error: '휴일 저장 실패' });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`\n🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`📊 데이터 디렉토리: ${DATA_DIR}`);
    console.log(`🌐 접속 주소: http://localhost:${PORT}\n`);
});
