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

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 데이터 디렉토리 생성됨:', DATA_DIR);
}

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
        const { name, people, preference, date, time, phone, tables } = req.body;
        
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
            preference: preference || 'none',
            date,
            time,
            phone: phone || '',
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
        const { name, people, preference, date, time, phone, tables } = req.body;
        
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
            preference: preference || 'none',
            date,
            time,
            phone: phone || '',
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

// 서버 시작
app.listen(PORT, () => {
    console.log(`\n🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`📊 데이터 디렉토리: ${DATA_DIR}`);
    console.log(`🌐 접속 주소: http://localhost:${PORT}\n`);
});
