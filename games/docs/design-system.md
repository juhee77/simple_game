# 🎨 디자인 시스템

> **기준: `styles/design-system.css`**
> 메인 화면과 모든 게임 페이지가 이 파일 하나를 함께 씁니다.
> 색·글꼴·모서리·그림자를 바꾸고 싶으면 이 파일만 고치면 사이트 전체가 바뀝니다.

---

## 원칙

- **화면은 밝게.** 페이지 바탕은 옅은 회색, 카드는 흰색, 글자는 짙은 남색입니다.
- **게임이 돌아가는 판만 어둡게.** 캔버스·네온 보드처럼 어두워야 사는 영역은
  '어두운 무대'로 표시합니다. 무대 색도 이 파일에서 정합니다.
- **색을 직접 찍지 말 것.** 페이지는 토큰을 `var()`로 씁니다.
  예외는 게임 고유의 색(플레이어 색, 카드 무늬, 돌 색 등)뿐입니다.

---

## 토큰

| 토큰 | 쓰임 |
|---|---|
| `--bg` | 페이지 바탕 |
| `--surface` | 카드·패널 |
| `--surface-2` | 카드 안의 칸·입력창 |
| `--surface-3` | 눌린 칸·진한 칸 |
| `--line` / `--line-strong` | 테두리·구분선 |
| `--text` / `--text-2` / `--muted` | 본문 / 보조 / 설명 글자 (흰 바탕 위 4.5:1 이상) |
| `--accent` / `--accent-ink` / `--accent-soft` / `--on-accent` | 강조색 / 강조색 글자 / 옅은 강조 바탕 / 강조색 위 글자 |
| `--ok` `--warn` `--bad` (+ `-soft`) | 성공·주의·실패 |
| `--tint-1` ~ `--tint-3` | 겹쳐 까는 반투명 (무대 안에서는 흰 반투명으로 뒤집힘) |
| `--scrim` / `--veil` | 모달 뒤 가림막 / 화면을 통째로 덮는 안내 화면 |
| `--shadow-sm/md/lg` | 그림자 |
| `--r-sm/md/lg/pill`, `--gap-xs~lg` | 모서리·간격 |
| `--font` | Pretendard |
| `--stage-*` | 어두운 무대의 값 |

예전 이름(`--panel`, `--border`, `--bg-primary`, `--text-primary`, `--text-muted`,
`--border-color`, `--success` …)은 위 토큰으로 이어 두었습니다. 옛 게임도 그대로 따라 바뀝니다.

---

## 어두운 무대

```html
<!-- 일부만 무대: 캔버스나 게임판에 class="stage" -->
<canvas class="stage" id="board"></canvas>
<div class="grid stage">…</div>

<!-- 화면 전체가 무대: <html>에 data-stage -->
<html lang="ko" data-stage>
```

- 무대 안에서는 같은 토큰(`var(--surface)`, `var(--text)` …)이 어두운 값으로 바뀝니다.
  무대 전용 색을 따로 만들 필요가 없습니다.
- 화면 전체가 무대일 때 `<body>`가 아니라 `<html>`에 표시하는 이유: 페이지가 `:root`에
  만든 변수(`--panel-bg: var(--surface)` 같은)는 루트에서 계산되므로, 루트 자체가 무대여야
  그 변수도 어두운 값이 됩니다.
- 규칙(?) 버튼과 규칙 창은 무대 위에서도 밝게 유지됩니다. 무대 안에 밝은 카드가 필요하면
  `class="chrome"`을 붙입니다.
- 지금 화면 전체가 무대인 게임: 블랙잭 듀얼, 손가락 룰렛, 불꽃놀이 메이커, 플루이드 아트,
  네온 밸런스, 네온 듀얼, 파티클 시뮬레이터, 태양계.

---

## 게임 고유 색은 덮어쓰세요

강조색만 바꾸고 싶으면 자기 `:root`에서 `--accent`를 덮어씁니다.
밝은 바탕에서 글자로도 읽히도록 짝이 되는 값도 함께 정해 주세요.

```css
:root {
    --accent: #fbbf24;        /* 버튼 바탕 */
    --accent-ink: #86650f;    /* 같은 색 계열의 글자 (흰 바탕 4.5:1 이상) */
    --accent-soft: #fbf5e4;   /* 옅은 바탕 */
    --on-accent: #141a2a;     /* 버튼 위 글자 — 밝은 강조색이면 짙은 글자 */
}
```

---

## 새 게임 만들 때

1. `<head>`에 공용 자산을 이 순서로 링크합니다.

   ```html
   <script src="../scripts/game-common.js"></script>
   <link rel="stylesheet" href="../styles/pretendard.css">
   <link rel="stylesheet" href="../styles/design-system.css">
   <link rel="stylesheet" href="../styles/game-common.css">
   ```

2. 색은 토큰으로 씁니다. 캔버스나 어두운 게임판은 `class="stage"`.

3. 파일을 저장한 뒤 **반드시** 버전 스탬프를 갱신합니다.

   ```bash
   node scripts/stamp-assets.mjs
   ```

   공용 자산과 HTML은 짝을 이루기 때문에, 이걸 빼먹으면 브라우저가 옛 자산을
   캐시에서 꺼내 써서 기능이 통째로 죽습니다.

---

## 아직 남은 것

- 게임 안의 강조색(플레이어 색 등)은 각 게임에 그대로 남아 있습니다. 어두운 바탕용으로 고른
  색 중 글자로 쓰인 것은 같은 색 계열에서 진하게 바꿔 두었지만, 게임마다 미세한 차이가 있습니다.
- `border-radius`는 아직 대부분 하드코딩입니다. 게임을 손볼 때마다 `--r-*`로 바꿔 나가면 됩니다.
