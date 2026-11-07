# 🧭 미니게임 천국 (simple_game) 개발 & 운영 공통 가이드라인

> 이 문서는 Antigravity, Gemini, Claude 등 AI 코딩 어시스턴트 및 모든 기여자가 준수해야 할 프로젝트 공통 개발 규정 및 표준 작업 절차를 정의합니다.
> `CLAUDE.md`는 본 파일(`GEMINI.md`)을 심볼릭 링크(바로가기)로 참조합니다.

---

## 1. 🏗️ 프로젝트 개요 및 핵심 철학

- **프로젝트명**: 미니게임 천국 (Mini Game Paradise)
- **저장소**: [juhee77/simple_game](https://github.com/juhee77/simple_game)
- **실제 서비스**: [https://juhee77.github.io/simple_game/](https://juhee77.github.io/simple_game/)
- **기술 스택**: 순수 Vanilla HTML5, CSS3, Modern JavaScript (ES6+), Canvas API, Web Audio API
- **설치 및 빌드 불필요 (Standalone Static Web)**:
  - npm build, 번들러(Webpack/Vite 등) 없이 브라우저에서 직접 실행되는 정적 웹입니다.
  - 외부 프레임워크(React, Vue 등) 도입을 지양하고 가볍고 빠른 단일 파일 실행 방식을 유지합니다.
- **모바일 퍼스트 & 반응형**:
  - 대부분의 사용자가 모바일 환경(카카오톡 인앱 브라우저, 사파리, 크롬)에서 접속합니다.
  - Safe-area(`viewport-fit=cover`), 모바일 터치 최적화, 주소창 높이 가변 대응(`100dvh` 또는 flex 레이아웃)을 준수합니다.

---

## 2. 🎮 서브페이지 (신규 게임 및 도구) 추가 규칙

신규 게임이나 유틸리티 도구를 만들 때는 아래 규칙을 반드시 준수합니다.

### 2.1 파일 위치 및 명명
- 경로: `games/{slug}.html`
- 파일명은 영문 소문자와 하이픈(`-`)으로만 구성된 **kebab-case**를 사용합니다. (예: `midpoint-finder.html`, `gold-ship.html`)

### 2.2 필수 리소스 포함
모든 게임 페이지의 `<head>`에는 통일된 폰트와 디자인 시스템이 로드되어야 합니다:
```html
<link rel="stylesheet" href="../styles/pretendard.css">
<link rel="stylesheet" href="../styles/design-system.css">
<script src="../scripts/game-common.js"></script>
```

### 2.3 상단 헤더 및 네비게이션
- 상단에는 메인 포털로 돌아갈 수 있는 `← 메인` 뒤로가기 버튼과 게임 제목을 배치합니다.
- 게임 방법 설명(`?` 도움말 모달 또는 팝업)을 필수로 제공하여 누구나 규칙을 쉽게 이해할 수 있어야 합니다.

### 2.4 오디오 & 하드웨어 센서 정책
- 브라우저의 오디오 자동재생 제한 정책에 따라, `AudioContext`는 첫 사용자 터치/클릭 인터랙션 시 활성화(`audioCtx.resume()`)합니다.
- 진동(`navigator.vibrate`)이나 센서 API 사용 시 미지원 기기에서 에러가 발생하지 않도록 예외 처리(`if ('vibrate' in navigator)`)를 필수 적용합니다.

---

## 3. 🏷️ 메인 페이지(`index.html`) 등록 및 NEW 뱃지 자동화 규칙

새로운 게임을 추가한 후에는 메인 포털의 게임 그리드(`#games-container`)에 카드를 등록해야 합니다.

### 3.1 카드 HTML 규격
```html
<a href="games/{slug}.html" class="game-card" 
   data-min-players="{최소인원}" 
   data-max-players="{최대인원}" 
   data-time="{예상소요시간(분)}" 
   data-category="{카테고리 태그}" 
   data-date="YYYY-MM-DD">
    <div class="game-icon">{대표 이모지}</div>
    <h2 class="game-title">{게임 제목}</h2>
    <p class="game-description">{핵심 한 줄 설명}</p>
    <div class="game-badge">{장르/분류}</div>
</a>
```
- **카테고리 태그(`data-category`)**: `solo`(혼자), `duo`(둘이서), `multi`(파티), `pass`(폰 넘기기), `classic`(퍼즐), `sim`(3D/시뮬), `utility`(도구) 중 해당되는 태그들을 공백으로 구분하여 기입.

### 3.2 🌟 `data-date` 기반 자동 NEW 뱃지 규칙 (핵심)
- 게임 카드에 추가 시점의 날짜인 **`data-date="YYYY-MM-DD"`** 속성을 반드시 지정합니다.
- **자동 계산 방식**:
  - `scripts/main.js`가 페이지 로드 시 현재 날짜와 `data-date`를 비교하여 **추가된 지 7일 이내(0~7일)**인 게임에만 동적으로 `NEW` 뱃지를 부여합니다.
  - **7일이 경과하면 별도의 코드 수정 없이도 자동으로 뱃지가 숨김 처리**됩니다.
  - 따라서 HTML 내부에 `<div class="game-badge">NEW</div>`를 수동으로 하드코딩하지 마십시오.

### 3.3 공용 에셋 캐시 버스팅 (`stamp-assets.mjs`)
- `scripts/main.js`, `styles/main.css`, `scripts/game-common.js` 등 공용 자산을 수정했을 경우, 브라우저 캐시 문제를 방지하기 위해 다음 명령어를 반드시 실행합니다:
  ```bash
  node scripts/stamp-assets.mjs
  ```

---

## 4. 📝 README.md 업데이트 규칙

신규 게임 추가 또는 기존 게임의 대규모 리뉴얼이 발생할 경우, **`README.md`를 함께 업데이트**해야 합니다.

1. **게임 총 개수 갱신**: 상단 타이틀 및 설명의 `N가지 미니게임 & 유틸리티`, `(N종)` 숫자 최신화.
2. **카테고리별 테이블 추가**: 해당되는 카테고리 테이블에 순번, 게임명, 한 줄 설명 추가.
3. **프로젝트 구조 트리 반영**: `games/` 하위 파일 목록 및 신규 주요 게임 표시.
4. **주요 게임 하이라이트**: 특별한 신규 대표작이 추가된 경우 하단 하이라이트 섹션에 소개 추가.

---

## 5. 🛡️ 저작권 및 상표권 보호 규칙

- 실존 상용 게임명(예: 부루마블, 할리갈리, 넷플릭스, 마피아42 등)이나 기업 상표권을 직접 사용하는 것은 엄격히 금지됩니다.
- 모티브를 얻은 게임은 독자적인 네이밍(예: 젠가 ➔ 네온 타워, 할리갈리 ➔ 스피드 과일 벨 등)과 고유의 비주얼 테마를 적용해야 합니다.
- 저작권 이슈 등으로 임시 조치가 필요한 경우 `scripts/game-common.js`의 `BLOCKED_GAMES` 목록에 slug를 등록하여 안전하게 잠금 안내를 제공합니다.

---

## 6. 🚀 Git 커밋 & CI/CD 배포 규칙

### 6.1 커밋 메시지 컨벤션
Angular / Conventional Commits 규격을 따릅니다:
- `feat(slug)`: 신규 게임 추가 또는 주요 기능 추가 (예: `feat(midpoint): 퇴근길 삼각 계산 모드 추가`)
- `fix(slug)`: 게임 버그 및 오작동 수정 (예: `fix(maze): 벽 충돌 판정 오차 수정`)
- `docs`: README.md, 개발 가이드라인 등 문서 수정
- `style`: 디자인 시스템, CSS, 레이아웃 스타일 개선
- `refactor`: 코드 구조 개선 및 최적화
- `ci`: GitHub Actions 워크플로우 수정

### 6.2 배포 파이프라인 (GitHub Actions)
- 본 저장소는 `.github/workflows/deploy.yml`을 통해 `main` 브랜치 푸시 시 GitHub Pages로 자동 배포됩니다.
- 배포 안정성을 위해 `build` 잡과 `deploy` 잡이 분리되어 있으므로, 푸시 후 GitHub Actions 실행 결과(`success`)를 반드시 확인합니다.
- 푸시 전 로컬에서 문법 오류를 점검합니다:
  ```bash
  node --check scripts/main.js
  node scripts/stamp-assets.mjs --check
  ```

---

## 7. 🤖 AI 어시스턴트 작업 수칙

1. 사용자의 요청을 최우선으로 반영하되, 기존에 작성된 다른 게임의 동작이나 디자인 토큰을 훼손하지 않습니다.
2. 사용자에게 작업 완료를 보고할 때는 관련된 주요 파일 링크(`file:///...`)를 마크다운 링크 형식으로 함께 제공합니다.
3. 새로운 게임을 만들었거나 기존 게임을 수정했을 때는 `data-date` 반영, `README.md` 동기화, `node scripts/stamp-assets.mjs` 실행 여부를 점검합니다.
