// ── 방(room) 서버 클라이언트 ───────────────────────────────
// 여러 사람이 각자 자기 폰으로 같은 게임에 들어오게 해 주는 공용 모듈이다 (#49, 서버는 server/).
// 서버 주소가 없거나 서버가 꺼져 있을 수 있으므로, 게임은 RoomClient.isAvailable()과
// 연결 상태를 보고 기존처럼 폰 한 대로 하는 오프라인 모드로 돌아갈 수 있어야 한다.
//
// 사용 예)
//   const { room } = await RoomClient.create('werewolf', '방장');      // 방 만들기
//   location.hash = 'room=' + room.id;                                   // 공유 링크: RoomClient.shareUrl(room.id)
//   await RoomClient.join(RoomClient.roomIdFromHash(), '손님');          // 링크로 들어온 사람
//   const conn = RoomClient.connect(room.id, {
//       onWelcome(msg) { ... },              // 연결·재연결할 때마다: 방 정보, 내 정보, 공유 상태
//       onMessage(data, from, msg) { ... },  // 다른 참가자가 보낸 게임 메시지 (msg.to가 있으면 나에게만 온 것)
//       onState(state, from) { ... },        // 방장이 바꾼 공유 상태
//       onMembers(msg) { ... },              // 참가자 입장·퇴장·접속 상태 변화
//       onStatus(status, reason) { ... },    // connecting | online | offline | ended
//   });
//   conn.broadcast({ ... }); conn.sendTo(memberId, { ... }); conn.setState({ ... });
//
// 끊긴 동안 보낸 메시지는 버려진다. 다시 붙으면 onWelcome이 다시 오므로 그때 상태를 맞춘다.
const RoomClient = (() => {
    // 서버를 배포하면 여기에 https 주소를 적는다. 페이지에 <meta name="room-server" content="...">가 있으면 그쪽이 먼저다.
    const PRODUCTION_URL = '';
    const LOCAL_URL = 'http://localhost:8080';
    const SESSION_KEY = 'room-session:';
    const PING_INTERVAL_MS = 25_000;
    const MAX_RETRY_DELAY_MS = 30_000;

    // 서버가 이 코드로 닫으면 다시 붙어도 소용없으므로 재연결하지 않는다
    const FINAL_CLOSE = {
        4000: 'replaced',       // 같은 참가자가 다른 탭·기기에서 다시 붙음
        4001: 'left',           // 방에서 나감
        4003: 'unauthorized',   // 토큰이 틀림 (방이 지워졌거나 기록이 오래됨)
        4004: 'room_closed'     // 방장이 닫았거나 기간이 지남
    };

    function serverUrl() {
        const meta = document.querySelector('meta[name="room-server"]')?.content;
        if (meta) return meta.replace(/\/$/, '');
        if (['localhost', '127.0.0.1'].includes(location.hostname)) return LOCAL_URL;
        return PRODUCTION_URL;
    }

    function isAvailable() {
        return Boolean(serverUrl());
    }

    // 실패하면 서버가 준 안내 문장(detail)을 message로 담아 던진다. 화면에 그대로 띄워도 된다.
    async function api(method, path, body, token) {
        const base = serverUrl();
        if (!base) throw new Error('방 서버가 아직 준비되지 않았어요.');
        const headers = {};
        if (body) headers['Content-Type'] = 'application/json';
        if (token) headers.Authorization = `Bearer ${token}`;
        let res;
        try {
            res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
        } catch {
            throw new Error('방 서버에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.');
        }
        if (res.status === 204) return null;
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const err = new Error(data?.detail || `요청이 실패했어요. (${res.status})`);
            err.status = res.status;
            throw err;
        }
        return data;
    }

    // 토큰은 방마다 이 기기에 보관해, 새로고침해도 같은 참가자로 다시 붙는다
    function saveSession(roomId, session) {
        try { localStorage.setItem(SESSION_KEY + roomId, JSON.stringify(session)); } catch { /* 저장 실패는 무시 */ }
    }

    function loadSession(roomId) {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY + roomId) || 'null'); } catch { return null; }
    }

    function forgetSession(roomId) {
        try { localStorage.removeItem(SESSION_KEY + roomId); } catch { /* 무시 */ }
    }

    function remember(joined) {
        saveSession(joined.room.id, { token: joined.token, memberId: joined.you.id });
        return joined;
    }

    async function create(game, nickname, name = '') {
        return remember(await api('POST', '/api/rooms', { game, nickname, name }));
    }

    async function join(roomId, nickname) {
        return remember(await api('POST', `/api/rooms/${encodeURIComponent(roomId)}/members`, { nickname }));
    }

    function get(roomId) {
        return api('GET', `/api/rooms/${encodeURIComponent(roomId)}`);
    }

    async function leave(roomId) {
        await api('DELETE', `/api/rooms/${encodeURIComponent(roomId)}/members/me`, null, loadSession(roomId)?.token);
        forgetSession(roomId);
    }

    async function closeRoom(roomId) {
        await api('DELETE', `/api/rooms/${encodeURIComponent(roomId)}`, null, loadSession(roomId)?.token);
        forgetSession(roomId);
    }

    /** 이 기기가 그 방에 이미 참여했는지 (참여했으면 join 없이 바로 connect하면 된다) */
    function hasJoined(roomId) {
        return Boolean(loadSession(roomId)?.token);
    }

    function roomIdFromHash() {
        return location.hash.match(/^#room=([A-Za-z0-9_-]{22})$/)?.[1] || null;
    }

    function shareUrl(roomId) {
        return `${location.origin}${location.pathname}#room=${roomId}`;
    }

    function connect(roomId, handlers = {}) {
        const session = loadSession(roomId);
        if (!session?.token) throw new Error('이 방에 참여한 기록이 없어요. 먼저 참여해 주세요.');

        let ws = null;
        let stopped = false;
        let retry = 0;
        let pingTimer = null;
        let retryTimer = null;

        // 게임 쪽 핸들러가 던져도 연결 처리는 계속되게 한다
        const emit = (name, ...args) => {
            try { handlers[name]?.(...args); } catch (e) { console.error(e); }
        };

        function send(message) {
            if (ws?.readyState !== WebSocket.OPEN) return false;
            ws.send(JSON.stringify(message));
            return true;
        }

        function open() {
            clearTimeout(retryTimer);
            emit('onStatus', 'connecting');
            ws = new WebSocket(`${serverUrl().replace(/^http/, 'ws')}/ws/rooms/${roomId}`);
            // 브라우저 WebSocket은 헤더를 못 붙이므로 연결 직후 첫 메시지로 인증한다
            ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: session.token }));
            ws.onmessage = (event) => {
                let msg;
                try { msg = JSON.parse(event.data); } catch { return; }
                switch (msg.type) {
                    case 'welcome':
                        retry = 0;
                        emit('onStatus', 'online');
                        emit('onWelcome', msg);
                        break;
                    case 'message': emit('onMessage', msg.data, msg.from, msg); break;
                    case 'state': emit('onState', msg.state, msg.from); break;
                    case 'member_joined':
                    case 'member_left':
                    case 'presence': emit('onMembers', msg); break;
                    case 'error': emit('onError', msg.message); break;
                    default: break;   // pong, room_closed(뒤이은 종료 코드로 처리)
                }
            };
            ws.onclose = (event) => {
                clearInterval(pingTimer);
                if (stopped) return;
                const reason = FINAL_CLOSE[event.code];
                if (reason) {
                    stop();
                    if (reason !== 'replaced') forgetSession(roomId);
                    emit('onStatus', 'ended', reason);
                    return;
                }
                emit('onStatus', 'offline');
                // 1초, 2초, 4초 … 최대 30초 간격으로 다시 붙는다. 여러 기기가 한꺼번에 몰리지 않게 조금 흩뜨린다.
                const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** retry++) + Math.random() * 500;
                retryTimer = setTimeout(open, delay);
            };
            clearInterval(pingTimer);
            pingTimer = setInterval(() => send({ type: 'ping' }), PING_INTERVAL_MS);
        }

        // 폰 화면을 껐다 켜거나 네트워크가 돌아오면 기다리지 않고 바로 다시 붙인다
        function reconnectNow() {
            if (stopped || document.visibilityState === 'hidden') return;
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
            retry = 0;
            open();
        }

        function stop() {
            stopped = true;
            clearTimeout(retryTimer);
            clearInterval(pingTimer);
            document.removeEventListener('visibilitychange', reconnectNow);
            window.removeEventListener('online', reconnectNow);
        }

        document.addEventListener('visibilitychange', reconnectNow);
        window.addEventListener('online', reconnectNow);
        open();

        return {
            memberId: session.memberId,
            get connected() { return ws?.readyState === WebSocket.OPEN; },
            /** 나를 뺀 모두에게. 연결이 끊겨 있으면 false */
            broadcast: (data) => send({ type: 'broadcast', data }),
            /** 한 사람에게만 (역할 나눠 주기 등) */
            sendTo: (memberId, data) => send({ type: 'send', to: memberId, data }),
            /** 방장만. 늦게 들어오거나 다시 붙은 사람은 onWelcome의 msg.state로 받는다 */
            setState: (state) => send({ type: 'state', state }),
            close() {
                stop();
                ws?.close(1000);
            }
        };
    }

    return {
        serverUrl, isAvailable,
        create, join, get, leave, closeRoom, hasJoined,
        connect, roomIdFromHash, shareUrl
    };
})();
