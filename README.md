# 🎮 미니게임 천국 (Mini Game Paradise)

8가지 재미있는 미니게임을 즐길 수 있는 웹 게임 포털입니다!

## 🎯 게임 목록

1. **⚫⚪ 오목** - 5개를 먼저 연결하세요
2. **🔢 2048** - 타일을 합쳐 2048을 만드세요
3. **💣 지뢰찾기** - 지뢰를 피해 모든 칸을 열어보세요
4. **🪜 사다리 타기** - 랜덤 결정이 필요할 때
5. **🎰 룰렛** - 행운의 룰렛을 돌려보세요
6. **🍽️ 메뉴 추천** - 오늘 뭐 먹을지 고민될 때
7. **✅ 할일 추천** - 무엇을 할지 결정해드려요
8. **🔢 스도쿠** - 숫자 퍼즐의 정석

## 🚀 특징

- ✨ 현대적이고 아름다운 디자인
- 📱 반응형 웹 디자인 (모바일/데스크톱 지원)
- 🎨 다크 모드 테마
- 🎯 순수 HTML/CSS/JavaScript (프레임워크 없음)
- 🚫 광고 없음, 설치 불필요

## 🎮 플레이 방법

### 로컬에서 실행
```bash
# 저장소 클론
git clone https://github.com/[your-username]/simple_game.git
cd simple_game

# 간단한 HTTP 서버 실행
python3 -m http.server 8000

# 브라우저에서 http://localhost:8000 접속
```

### GitHub Pages에서 플레이
[여기를 클릭하여 플레이하세요!](https://[your-username].github.io/simple_game/)

## 🛠️ 기술 스택

- HTML5
- CSS3 (그라데이션, 애니메이션, Flexbox/Grid)
- Vanilla JavaScript (ES6+)
- Canvas API (룰렛, 사다리타기)
- Google Fonts (Outfit)

## 📂 프로젝트 구조

```
simple_game/
├── index.html              # 메인 페이지
├── games/                  # 게임 페이지들
│   ├── omok.html
│   ├── 2048.html
│   ├── minesweeper.html
│   ├── ladder.html
│   ├── roulette.html
│   ├── menu.html
│   ├── todo.html
│   └── sudoku.html
├── styles/                 # 스타일시트
│   ├── main.css
│   └── game-common.css
└── scripts/                # JavaScript 파일
    └── main.js
```

## 🎨 게임별 특징

### 오목
- 15x15 보드
- 흑/백 턴제
- 5목 승리 조건
- 무르기 기능

### 2048
- 4x4 그리드
- 키보드/터치 컨트롤
- 점수 저장
- 아름다운 타일 색상

### 지뢰찾기
- 3가지 난이도
- 타이머
- 깃발 표시
- 자동 열기

### 사다리 타기
- 동적 참가자/결과 입력
- 애니메이션 경로 추적
- 캔버스 렌더링

### 룰렛
- 커스텀 항목 추가
- 회전 애니메이션
- 결과 모달

### 메뉴 추천
- 30개 메뉴 데이터베이스
- 종류/가격/맵기 필터
- 스마트 추천 알고리즘

### 할일 추천
- 60개 이상 활동 데이터베이스
- 기분/시간 기반 필터
- 상세 팁 제공

### 스도쿠
- 자동 퍼즐 생성
- 3가지 난이도
- 힌트 기능
- 유효성 검사

## 📝 라이선스

MIT License - 자유롭게 사용하세요!

## 🤝 기여

버그 리포트나 기능 제안은 Issues에 올려주세요!

## 📧 연락처

프로젝트에 대한 질문이나 제안사항이 있으시면 언제든 연락주세요.

---

Made with ❤️ for fun | © 2024 Mini Game Paradise
