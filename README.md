# 음식점 예약 시스템 (17개 테이블)

## 개요
- 17개 테이블 (각 4명까지 수용)
- 룸 없음 (홀만 운영)
- 수동 테이블 배정 방식
- 파일 기반 데이터 저장

## 시스템 구성

### 1. 테이블 구조
- 총 17개 테이블 (table-1 ~ table-17)
- 각 테이블: 4명까지 수용 가능
- 레이아웃: 이미지 '양은이네_테이블구조_Claude.png' 참고

### 2. 핵심 기능
- ✅ 예약 등록 (성함, 인원수, 날짜, 시간, 연락처, 테이블 선택)
- ✅ 예약 현황 확인 (시간대별, 테이블별)
- ✅ 예약 수정/삭제
- ✅ 테이블 가용성 실시간 확인
- ✅ 예약 15분 전 알림
- ✅ 모바일 최적화 UI

### 3. 파일 구조
```
/
├── server.js           # Express 서버
├── package.json        # 의존성 관리
├── index.html          # 메인 페이지
├── app.js              # 프론트엔드 로직
├── style.css           # 스타일
└── data/
    └── reservations.json  # 예약 데이터 (자동 생성)
```

## 설치 및 실행

### 로컬 환경
```bash
# 1. 의존성 설치
npm install

# 2. 서버 실행
npm start

# 3. 브라우저에서 접속
http://localhost:3000
```

### Railway 배포

1. Railway 계정 생성 및 프로젝트 생성
2. GitHub 저장소 연결
3. 환경변수 설정:
   - `DATA_DIR=/data` (Railway Volume 경로)
4. Volume 생성:
   - Path: `/data`
   - Size: 1GB
5. Deploy

## API 엔드포인트

### GET /api/reservations
- 모든 예약 조회

### POST /api/reservations
- 새 예약 생성
- Body: { name, people, preference, date, time, phone, tables }

### PUT /api/reservations/:id
- 예약 수정
- Body: { name, people, preference, date, time, phone, tables }

### DELETE /api/reservations/:id
- 예약 삭제

### PATCH /api/reservations/:id/status
- 예약 상태 변경
- Body: { status }

## 주요 특징

### 1. 간단한 구조
- 자동 배정 알고리즘 없음
- 관리자가 직접 테이블 선택
- 구글 캘린더 연동 없음

### 2. 실시간 테이블 가용성
- 날짜/시간 선택 시 사용 가능한 테이블 표시
- 이미 예약된 테이블은 비활성화

### 3. 모바일 친화적 UI
- 큰 버튼과 입력 필드
- 터치 최적화
- 반응형 디자인

### 4. 데이터 안정성
- 파일 기반 저장
- Railway Volume을 통한 데이터 영속성
- 간단한 백업/복원

## 개발 지침

### 변경 금지 사항
- 테이블 개수 (17개 고정)
- 테이블 수용 인원 (4명 고정)
- 파일 기반 저장 방식

### 커스터마이징 가능 항목
- UI 색상 및 스타일
- 알림 메시지
- 예약 시간 간격
- 이용 시간 (현재 3시간)

## 문제 해결

### 데이터가 저장되지 않음
- `data` 디렉토리 권한 확인
- Railway Volume 연결 확인

### 테이블 레이아웃이 이상함
- 브라우저 캐시 삭제
- CSS 파일 새로고침

### 예약이 충돌함
- 시간 겹침 로직 확인
- 기존 예약 데이터 확인

## 라이선스
MIT

## 문의
프로젝트 관련 문의는 GitHub Issues를 통해 남겨주세요.
