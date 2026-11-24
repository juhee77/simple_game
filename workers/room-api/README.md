# 방(room) 서버 (Cloudflare Workers + Durable Objects)

여러 사람이 **각자 자기 폰으로** 같은 게임에 들어오게 해 주는 실시간 방 서버예요. 송년회 진행 키트의 "📱 각자 폰으로", 네온 고스트 등이 씁니다.
[`server/`](../../server/README.md)(Kotlin + Spring Boot)와 **주소 규칙·메시지 형식이 똑같아서** 화면 쪽 [`scripts/room-client.js`](../../scripts/room-client.js)를 그대로 써요. `room-client.js`의 `PRODUCTION_URL`이 이 서버를 가리켜요.

- 방 하나 = Durable Object 하나 (`idFromName(방ID)`), SQLite 저장소에 방 정보·참가자·공유 상태 저장
  - Worker가 다시 떠도 공유 상태가 남아요 (Kotlin 서버는 메모리라 사라졌어요).
- WebSocket은 Hibernation API: 조용한 연결은 요금이 붙지 않고, `{"type":"ping"}` → `{"type":"pong"}`은 객체를 깨우지 않는 자동 응답이에요.
- 참가자 토큰은 SHA-256 해시만 저장
- 무료 플랜: Durable Objects 요청 하루 10만. WebSocket으로 받는 메시지는 20개를 1요청으로 세고, 보내는 메시지는 세지 않아요.
- Pages 배포에는 이 폴더가 포함되지 않아요.

## 규칙
- 방 ID 128비트(base64url 22자), 7일 뒤 자동으로 사라짐 (알람)
- **최대 20명**, 닉네임 1~20자(방 안에서 중복 불가), 방 이름 40자, 게임 이름 `^[a-z0-9-]{1,40}$`, 메시지 16KB
- 방 만들기는 IP 해시 기준 하루 30개
- 도배 막기: 연결 하나당 10초에 60개까지. 넘으면 버리고 한 번 `error`로 알리고, 300개를 넘으면 연결을 끊어요(1008). ping 자동 응답은 세지 않아요.
- 허용 출처: 실제 서버는 `https://juhee77.github.io`만 받아요 (REST·WebSocket 모두). `npm run dev`와 테스트는 `localhost`·`127.0.0.1`도 받도록 `--var ALLOWED_ORIGINS`를 더해요.

## REST API
오류는 `{"status":409,"detail":"방이 꽉 찼어요. (최대 20명)"}` 형식이고, `detail`은 화면에 그대로 띄울 수 있어요.

| 요청 | 설명 |
|---|---|
| `POST /api/rooms` `{game, name?, nickname}` | 방 만들기. 만든 사람이 방장. `201 {room, you, token}` |
| `GET /api/rooms/{roomId}` | 방 정보와 참가자 목록 (접속 여부 포함) |
| `POST /api/rooms/{roomId}/members` `{nickname}` | 링크로 참여. `201 {room, you, token}` |
| `DELETE /api/rooms/{roomId}/members/me` | 나가기 (`Authorization: Bearer {token}`). 방장은 409 |
| `DELETE /api/rooms/{roomId}` | 방 닫기 (방장 토큰만, 아니면 403) |
| `GET /health` | 상태 확인 |

## WebSocket `/ws/rooms/{roomId}`
연결한 뒤 **첫 메시지로 인증**해요. 인증 전에 다른 메시지를 보내면 4003으로 끊어요.

| 클라이언트 → 서버 | 설명 |
|---|---|
| `{"type":"auth","token":"..."}` | 첫 메시지. 성공하면 `welcome` |
| `{"type":"broadcast","data":{...}}` | 나를 뺀 모두에게 |
| `{"type":"send","to":"memberId","data":{...}}` | 한 사람에게만. 상대가 접속해 있지 않으면 `error` |
| `{"type":"state","state":{...}}` | 방장만. 공유 상태를 저장하고 나를 뺀 모두에게 알림 |
| `{"type":"ping"}` | `pong` |

| 서버 → 클라이언트 | 설명 |
|---|---|
| `welcome` `{room, you, state}` | 인증 성공. 다시 붙을 때마다 와요 |
| `message` `{from, to, data}` | 다른 참가자가 보낸 메시지 (`to`가 있으면 귓속말) |
| `state` `{from, state}` | 방장이 바꾼 공유 상태 |
| `member_joined` / `member_left` / `presence` | 참가자 입장·퇴장·접속 상태 |
| `room_closed` `{reason}` | 방이 닫힘 (`closed` / `expired`) |
| `error` `{message}` | 잘못된 요청 안내 |

종료 코드: 4000 같은 참가자가 다른 탭에서 다시 붙음 · 4001 나감 · 4003 인증 실패 · 4004 방 닫힘 (클라이언트는 이 코드로 닫히면 다시 붙지 않아요)

## 로컬에서 실행 (계정 없이)
```bash
npm install
npm run dev     # http://localhost:8080 (room-client.js가 localhost에서 자동으로 붙는 주소)
npm test        # 임시 저장소로 wrangler dev를 따로 띄워 REST·WebSocket 전체 확인
```
`npm run dev`는 `ALLOW_DEV:1`로 띄워서 `X-Dev-Ip`(IP)·`X-Dev-Ttl`(방 보관 기간, ms) 머리글로 테스트할 수 있어요. 배포 환경에는 이 변수가 없어서 무시돼요.

## 배포
`wrangler login`이 되어 있으면 한 줄이에요. Durable Objects는 DB를 따로 만들 필요가 없어요.
```bash
npm run deploy   # → https://room-api.<계정 서브도메인>.workers.dev
```
