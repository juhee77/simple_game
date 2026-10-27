# 방(room) 서버

여러 사람이 각자 자기 폰으로 같은 게임에 들어오게 해 주는 서버입니다 (#49).
프론트는 지금처럼 GitHub Pages에 두고, 게임은 [`scripts/room-client.js`](../scripts/room-client.js)로 이 서버에 붙습니다.

- Kotlin 2.3 · Spring Boot 4.1 (MVC + 가상 스레드) · JDK 21
- PostgreSQL + Flyway (방·참가자) / 메모리 (접속 중인 연결·공유 상태)
- WebSocket (STOMP 없이 JSON 메시지)

## 로컬에서 실행

Docker만 켜 두면 됩니다. Testcontainers가 Postgres를 띄워 줍니다.

```bash
./gradlew bootTestRun
```

- 서버: `http://localhost:8080` (`PORT` 환경 변수로 바꿀 수 있음)
- 기본 허용 출처: `https://juhee77.github.io`, `http://localhost:[*]`, `http://127.0.0.1:[*]`
- 정적 사이트를 `python3 -m http.server 8000`으로 띄우면 `room-client.js`가 `localhost:8080`에 자동으로 붙습니다.
  다른 포트의 서버에 붙이려면 페이지에 `<meta name="room-server" content="http://localhost:8081">`를 넣습니다.

테스트:

```bash
./gradlew test
```

## REST API

오류 응답은 `ProblemDetail`(`{"status":409,"detail":"방이 꽉 찼어요. (최대 12명)", ...}`)이고, `detail`은 화면에 그대로 띄울 수 있는 문장입니다.

| 요청 | 설명 |
|---|---|
| `POST /api/rooms` `{game, name?, nickname}` | 방 만들기. 만든 사람이 방장. `201 {room, you, token}` |
| `GET /api/rooms/{roomId}` | 방 정보와 참가자 목록 (접속 여부 포함) |
| `POST /api/rooms/{roomId}/members` `{nickname}` | 링크로 참여. `201 {room, you, token}` |
| `DELETE /api/rooms/{roomId}/members/me` | 나가기 (`Authorization: Bearer {token}`). 방장은 나갈 수 없음 |
| `DELETE /api/rooms/{roomId}` | 방 닫기 (방장 토큰) |
| `GET /actuator/health` | 상태 확인 |

- 방 ID는 128비트 랜덤 값(22자)입니다. 목록·검색 API는 없어서 링크를 아는 사람만 들어올 수 있습니다.
- `token`은 참여할 때 한 번만 받습니다. DB에는 SHA-256 해시만 남습니다.
- 방은 만든 뒤 7일이 지나면 정리 작업이 지웁니다 (`room.ttl`, `room.cleanup-interval`).
- 한 방에는 최대 12명까지 (`room.max-members`), 닉네임은 1~20자이고 방 안에서 겹칠 수 없습니다.

## WebSocket `/ws/rooms/{roomId}`

브라우저 WebSocket은 헤더를 붙일 수 없고, 주소에 토큰을 넣으면 접속 기록에 남습니다.
그래서 연결한 뒤 **첫 메시지로 인증**합니다. 인증 전에 다른 메시지를 보내면 연결이 끊깁니다.

클라이언트 → 서버

| 메시지 | 설명 |
|---|---|
| `{"type":"auth","token":"..."}` | 첫 메시지. 성공하면 `welcome` |
| `{"type":"broadcast","data":{...}}` | 나를 뺀 모두에게 |
| `{"type":"send","to":"memberId","data":{...}}` | 한 사람에게만 (역할 나눠 주기 등) |
| `{"type":"state","state":{...}}` | 방장만. 공유 상태를 바꾸고 모두에게 알림 |
| `{"type":"ping"}` | 연결 유지용 (`pong`으로 답함). 1분 넘게 조용하면 서버가 끊음 |

서버 → 클라이언트

| 메시지 | 설명 |
|---|---|
| `welcome` `{room, you, state}` | 인증 성공. 재연결할 때마다 다시 오므로 이때 화면 상태를 맞춤 |
| `message` `{from, to, data}` | 다른 참가자가 보낸 게임 메시지 (`to`가 있으면 귓속말) |
| `state` `{from, state}` | 방장이 바꾼 공유 상태 |
| `member_joined` / `member_left` / `presence` | 참가자 입장·퇴장·접속 상태 |
| `room_closed` `{reason}` | 방이 닫힘 (`closed` / `expired`) |
| `error` `{message}` | 잘못된 요청 안내 |

종료 코드 (클라이언트는 이 코드로 닫히면 다시 붙지 않음)

| 코드 | 뜻 |
|---|---|
| 4000 | 같은 참가자가 다른 탭·기기에서 다시 붙음 |
| 4001 | 방에서 나감 |
| 4003 | 인증 실패 |
| 4004 | 방이 닫힘 |

메시지 한 건은 16KB까지입니다 (`room.max-message-bytes`). 공유 상태와 접속 정보는 메모리에만 있어서 서버를 다시 띄우면 사라지고, 방·참가자 목록은 DB에 남습니다.

## 배포

`main`에 `server/` 변경이 들어오면 [Room Server 워크플로](../.github/workflows/server.yml)가 테스트한 뒤
`ghcr.io/juhee77/simple_game-room-server` 이미지(amd64·arm64)를 올립니다. Pages 배포에는 `server/`가 포함되지 않습니다.

서버 한 대(예: Oracle Cloud 무료 ARM VM)에서:

1. 도메인(또는 DuckDNS 같은 무료 서브도메인)의 A 레코드를 서버 IP로 맞추고 80·443 포트를 엽니다.
2. `deploy/` 폴더를 서버에 복사하고 `.env.example`을 `.env`로 복사해 값을 채웁니다. `.env`는 커밋하지 않습니다.
3. 실행합니다. Caddy가 HTTPS 인증서를 자동으로 받습니다.
   ```bash
   docker compose up -d
   ```
4. `scripts/room-client.js`의 `PRODUCTION_URL`에 `https://{도메인}`을 적습니다.

GHCR 패키지는 처음에 비공개로 만들어집니다. 서버에서 `docker login ghcr.io`를 하거나 패키지를 공개로 바꿔야 받을 수 있습니다.

## 아직 안 한 것

- 방 만들기 속도 제한 (Bucket4j) — 지금은 방당 인원과 메시지 크기만 제한
- 인증하지 않은 채 열려 있는 연결을 시간 제한으로 끊기 (지금은 1분 무응답 시 끊김)
- 실제 게임 연결 (2단계: 마피아/`imposter` 또는 `meetup-planner`)
