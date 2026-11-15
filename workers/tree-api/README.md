# 어드벤트 트리 API (Cloudflare Workers + D1)

[`games/advent-tree.html`](../../games/advent-tree.html)의 나만의·커플·숲 트리를 저장하는 서버예요 (#72 확장 ④).
화면은 그대로 GitHub Pages에 있고, 이 Worker는 데이터만 주고받아요. Pages 배포에는 이 폴더가 포함되지 않아요.

- 순수 JS 모듈 Worker (빌드 없음), D1(SQLite)
- 무료 플랜 한도: 요청 하루 10만, D1 읽기 하루 500만 행·쓰기 10만 행. 넘으면 그날만 멈추고 과금은 없어요.

## 무엇을 저장하나
| 테이블 | 내용 |
|---|---|
| `trees` | 트리 상태(장식·물 준 날), 주인 이름, 모드, 짝꿍·숲 연결. 주인 토큰은 SHA-256 해시만 |
| `gifts` | 친구가 단 장식과 메시지. 메시지는 **그해 12/25 0시(KST) 전에는 주인에게도 내려주지 않음** |
| `forests` | 숲 이름·연도 |
| `limits` | IP 해시 기준 하루 횟수 제한 (트리 20, 선물 30, 숲 10, 짝꿍 코드 20) |

공개 조회(`GET /trees/:id`, `GET /forests/:id`)에는 메시지·선물 ID·바구니가 들어가지 않아요. 매일 크론이 2월이 지난 지난 시즌 데이터를 지워요.

## API
| 요청 | 인증 | 설명 |
|---|---|---|
| `POST /trees` `{id?, owner, mode, year, state}` | — | 만들기 → `{id, token, rev}` (`id`는 기기에 있던 트리 옮기기용) |
| `GET /trees/:id` | — | 공개 보기 (+ `partnerName`, `forestName`) |
| `GET /trees/:id/private` | 토큰 | 전체 상태 + 선물(25일 이후 메시지) + 짝꿍 공개 보기 |
| `PUT /trees/:id` `{state, rev, owner?, mode?}` | 토큰 | 저장. `rev`가 낡으면 409 + 최신 상태 |
| `POST /trees/:id/gifts` `{type, sender, message}` | — | 친구가 장식 달기 (선물용 12종, 메시지 80자) |
| `POST /trees/:id/pair-code` | 토큰 | 커플 초대 코드 (7일) |
| `POST /trees/:id/pair` `{partnerId, code}` 또는 `{partnerId, legacy:true}` | 토큰 | 짝 맺기 |
| `POST /forests` `{treeId, name, year, id?}` | 트리 토큰 | 숲 만들고 합류 |
| `POST /forests/:id/members` `{treeId}` | 트리 토큰 | 숲 합류 (12그루까지) |
| `GET /forests/:id` | — | 숲 + 멤버 공개 보기 |
| `DELETE /forests/:id/members/:treeId` | 토큰 | 숲 나가기 |

토큰은 `Authorization: Bearer {token}` 머리글로 보내요. 오류는 `{ "detail": "화면에 띄울 문장" }` 형식이에요.

## 로컬에서 실행 (계정 없이)
```bash
npm install
npm run dev     # 로컬 D1에 테이블 만들고 http://localhost:8787 로 띄움
npm test        # 임시 DB로 wrangler dev를 따로 띄워 API 전체 확인
```
- `npm run dev`는 `ALLOW_DEV:1`로 띄워서 `X-Dev-Now`(날짜)·`X-Dev-Ip`(IP) 머리글로 테스트할 수 있어요. 배포 환경에는 이 변수가 없어서 머리글이 무시돼요.
- 화면은 사이트를 `localhost`에서 열면 실제 서버 대신 `http://localhost:8787`(로컬 Worker)에 붙어요. `?api=off`는 서버 없이, `?api=prod`는 실제 서버로 붙어요.

## 배포 (처음 한 번)
1. [Cloudflare 가입](https://dash.cloudflare.com/sign-up) (무료)
2. 로그인: 브라우저가 열리면 허용
   ```bash
   npx wrangler login
   ```
3. DB 만들기: 출력된 `database_id`를 `wrangler.toml`에 넣기
   ```bash
   npx wrangler d1 create advent-tree
   ```
4. 테이블 만들기
   ```bash
   npm run db:remote
   ```
5. 배포: 출력된 `https://advent-tree-api.<계정 서브도메인>.workers.dev` 주소 확인 (지금: `https://advent-tree-api.lahezy.workers.dev`)
   ```bash
   npm run deploy
   ```
6. 사이트 연결: `games/advent-tree.html`의 `<meta name="tree-api" content="">`에 5번 주소를 넣고 Pages에 배포

다음부터는 코드를 바꾸면 `npm run deploy`, 테이블을 바꾸면 `migrations/`에 새 파일을 추가하고 `npm run db:remote`를 실행해요.
