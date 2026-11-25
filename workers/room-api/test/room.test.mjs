// 로컬 wrangler dev를 새 임시 저장소로 띄워서 방 서버 규칙을 처음부터 끝까지 확인한다.
// server/(Kotlin)와 같은 규칙이어야 scripts/room-client.js가 그대로 붙는다.
// 실행: npm test   (Cloudflare 계정 없이 돈다, Node 내장 WebSocket 사용)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pathJoin, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = pathJoin(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8798;
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = 'https://juhee77.github.io';
const WRANGLER = pathJoin(ROOT, 'node_modules', '.bin', 'wrangler');
let dev;
let dir;
let ipSeq = 0;

before(async () => {
    dir = mkdtempSync(pathJoin(tmpdir(), 'room-api-'));
    dev = spawn(WRANGLER, ['dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', dir, '--var', 'ALLOW_DEV:1', '--var', 'HOST_GRACE_MS:1500', '--var', 'ALLOWED_ORIGINS:https://juhee77.github.io,http://localhost:*,http://127.0.0.1:*'], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, CI: '1' } });
    for (let i = 0; i < 120; i++) {
        try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* 아직 안 뜸 */ }
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('wrangler dev가 뜨지 않았어요');
});

after(() => {
    dev?.kill();
    rmSync(dir, { recursive: true, force: true });
});

async function call(method, path, { body, token, ip, ttl, origin = ORIGIN, headers = {} } = {}) {
    const h = { 'X-Dev-Ip': ip || `10.0.0.${++ipSeq}`, ...headers };
    if (origin) h.Origin = origin;
    if (body) h['Content-Type'] = 'application/json';
    if (token) h.Authorization = `Bearer ${token}`;
    if (ttl) h['X-Dev-Ttl'] = String(ttl);
    const res = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const data = res.status === 204 || res.status === 101 ? null : await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
}

const create = async (nickname = '방장', extra = {}) => {
    const r = await call('POST', '/api/rooms', { body: { game: 'year-end-kit', name: '테스트 방', nickname }, ...extra });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data;
};
const join = async (roomId, nickname) => {
    const r = await call('POST', `/api/rooms/${roomId}/members`, { body: { nickname } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data;
};

// WebSocket 도우미: 받은 메시지를 줄 세워 두고 type으로 꺼낸다
function connect(roomId) {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws/rooms/${roomId}`);
    const queue = [];
    const waiters = [];
    ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        const i = waiters.findIndex((w) => !w.type || w.type === m.type);
        if (i >= 0) waiters.splice(i, 1)[0].resolve(m); else queue.push(m);
    };
    const closed = new Promise((r) => { ws.onclose = (e) => r({ code: e.code, reason: e.reason }); });
    const opened = new Promise((r, j) => { ws.onopen = () => r(); ws.onerror = (e) => j(e); });
    return {
        ws, closed, opened,
        send: (o) => ws.send(typeof o === 'string' ? o : JSON.stringify(o)),
        next(type, ms = 3000) {
            const i = queue.findIndex((m) => !type || m.type === type);
            if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
            return new Promise((res, rej) => {
                const t = setTimeout(() => rej(new Error(`기다린 메시지가 안 옴: ${type}`)), ms);
                waiters.push({ type, resolve: (m) => { clearTimeout(t); res(m); } });
            });
        },
        async none(type, ms = 400) {
            await new Promise((r) => setTimeout(r, ms));
            return !queue.some((m) => m.type === type);
        }
    };
}

async function authed(roomId, token) {
    const c = connect(roomId);
    await c.opened;
    c.send({ type: 'auth', token });
    const welcome = await c.next('welcome');
    return { c, welcome };
}

test('상태 확인·CORS·출처 확인', async () => {
    const ok = await call('GET', '/health');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
    const local = await call('GET', '/health', { origin: 'http://localhost:8765' });
    assert.equal(local.headers.get('access-control-allow-origin'), 'http://localhost:8765');
    assert.equal((await call('GET', '/health', { origin: 'https://evil.example' })).status, 403);
    const pre = await fetch(`${BASE}/api/rooms`, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(pre.status, 204);
    const r = await create();
    // fetch는 Upgrade 머리글을 못 보내서 http로 직접 WebSocket 업그레이드를 요청한다
    const upgradeStatus = (origin) => new Promise((resolve, reject) => {
        const req = httpRequest({
            host: '127.0.0.1', port: PORT, path: `/ws/rooms/${r.room.id}`,
            headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', Origin: origin }
        });
        req.on('upgrade', (res, socket) => { socket.destroy(); resolve(res.statusCode); });
        req.on('response', (res) => { res.resume(); resolve(res.statusCode); });
        req.on('error', reject);
        req.end();
    });
    assert.equal(await upgradeStatus('https://evil.example'), 403);
    assert.equal(await upgradeStatus(ORIGIN), 101);
});

test('REST: 만들기·참가·조회·나가기·닫기 (Kotlin 서버와 같은 규칙)', async () => {
    const host = await create('지은');
    assert.match(host.room.id, /^[A-Za-z0-9_-]{22}$/);
    assert.match(host.you.id, /^[A-Za-z0-9_-]{22}$/);
    assert.ok(host.token.length >= 40);
    assert.equal(host.you.host, true);
    assert.equal(host.room.game, 'year-end-kit');
    assert.equal(host.room.name, '테스트 방');
    assert.ok(Date.parse(host.room.expiresAt) - Date.parse(host.room.createdAt) >= 7 * 24 * 3600 * 1000 - 1000);

    const badGame = await call('POST', '/api/rooms', { body: { game: 'Bad Game!', nickname: 'x' } });
    assert.equal(badGame.status, 400);
    const badNick = await call('POST', `/api/rooms/${host.room.id}/members`, { body: { nickname: '   ' } });
    assert.equal(badNick.status, 400);
    assert.equal(badNick.data.detail, '닉네임은 1~20자로 적어 주세요.');

    const g = await join(host.room.id, '민수');
    assert.equal(g.you.host, false);
    assert.equal(g.room.members.length, 2);
    const dup = await call('POST', `/api/rooms/${host.room.id}/members`, { body: { nickname: '민수' } });
    assert.equal(dup.status, 409);

    const info = await call('GET', `/api/rooms/${host.room.id}`);
    assert.equal(info.status, 200);
    assert.deepEqual(info.data.members.map((m) => [m.nickname, m.host, m.online]), [['지은', true, false], ['민수', false, false]]);

    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}/members/me`, { token: host.token })).status, 409, '방장은 못 나감');
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}/members/me`)).status, 401, '토큰 없음');
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}/members/me`, { token: 'x'.repeat(43) })).status, 401, '틀린 토큰');
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}`, { token: g.token })).status, 403, '방장만 닫기');
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}/members/me`, { token: g.token })).status, 204);
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}`, { token: host.token })).status, 204);
    const gone = await call('GET', `/api/rooms/${host.room.id}`);
    assert.equal(gone.status, 404);
    assert.equal(gone.data.detail, '방이 없거나 기간이 지나 사라졌어요.');
    assert.equal((await call('GET', '/api/rooms/not-a-room')).status, 404);
});

test('REST: 최대 20명', async () => {
    const host = await create('방장');
    for (let i = 1; i < 20; i++) await join(host.room.id, `멤버${i}`);
    const full = await call('POST', `/api/rooms/${host.room.id}/members`, { body: { nickname: '스물한번째' } });
    assert.equal(full.status, 409);
    assert.equal(full.data.detail, '방이 꽉 찼어요. (최대 20명)');
});

test('WebSocket: 인증 규칙과 welcome', async () => {
    const host = await create('지은');
    const noAuth = connect(host.room.id);
    await noAuth.opened;
    noAuth.send({ type: 'broadcast', data: { a: 1 } });
    assert.equal((await noAuth.closed).code, 4003);

    const wrong = connect(host.room.id);
    await wrong.opened;
    wrong.send({ type: 'auth', token: 'nope' });
    assert.equal((await wrong.closed).code, 4003);

    const missing = connect('AAAAAAAAAAAAAAAAAAAAAA');
    await missing.opened;
    missing.send({ type: 'auth', token: host.token });
    assert.equal((await missing.closed).code, 4003, '없는 방은 인증 실패');

    const { c, welcome } = await authed(host.room.id, host.token);
    assert.equal(welcome.you.id, host.you.id);
    assert.equal(welcome.you.online, true);
    assert.equal(welcome.state, null);
    assert.equal(welcome.room.members[0].online, true);
    c.send({ type: 'auth', token: host.token });
    assert.equal((await c.next('error')).message, '이미 인증했어요.');
    c.send({ type: 'ping' });
    assert.equal((await c.next('pong')).type, 'pong');
    c.send('{"type":"ping"}');
    assert.equal((await c.next('pong')).type, 'pong');
    c.send('not json');
    assert.equal((await c.next('error')).message, 'JSON 형식이 아니에요.');
    c.send({ type: 'broadcast', data: 'x'.repeat(17 * 1024) });
    assert.match((await c.next('error')).message, /16KB/);
    c.ws.close();
});

test('WebSocket: broadcast·send·state·presence·member 이벤트', async () => {
    const host = await create('지은');
    const a = await join(host.room.id, '민수');
    const { c: H } = await authed(host.room.id, host.token);
    const { c: A, welcome: aw } = await authed(host.room.id, a.token);
    assert.equal(aw.room.members.filter((m) => m.online).length, 2);
    const p = await H.next('presence');
    assert.deepEqual([p.memberId, p.online], [a.you.id, true]);

    // broadcast: 나 빼고
    A.send({ type: 'broadcast', data: { hello: 1 } });
    const got = await H.next('message');
    assert.deepEqual([got.from, got.to, got.data], [a.you.id, null, { hello: 1 }]);
    assert.ok(await A.none('message'), '보낸 사람은 안 받음');

    // send: 귓속말, 오프라인 상대는 error
    H.send({ type: 'send', to: a.you.id, data: { secret: 'card' } });
    const w = await A.next('message');
    assert.deepEqual([w.from, w.to, w.data], [host.you.id, a.you.id, { secret: 'card' }]);
    H.send({ type: 'send', to: 'nobody', data: {} });
    assert.equal((await H.next('error')).message, '상대가 접속해 있지 않아요.');
    H.send({ type: 'broadcast' });
    assert.equal((await H.next('error')).message, "'data' 값이 필요해요.");

    // state: 방장만, 늦게 온 사람은 welcome으로
    A.send({ type: 'state', state: { phase: 'x' } });
    assert.equal((await A.next('error')).message, '방장만 공유 상태를 바꿀 수 있어요.');
    H.send({ type: 'state', state: { phase: 'input', n: 1 } });
    const st = await A.next('state');
    assert.deepEqual([st.from, st.state], [host.you.id, { phase: 'input', n: 1 }]);
    assert.ok(await H.none('state'), '방장은 자기 state를 안 받음');

    // REST 참가 → member_joined, 늦게 온 사람 welcome에 state
    const b = await join(host.room.id, '현우');
    const mj = await H.next('member_joined');
    assert.deepEqual([mj.member.nickname, mj.member.online], ['현우', false]);
    const { c: B, welcome: bw } = await authed(host.room.id, b.token);
    assert.deepEqual(bw.state, { phase: 'input', n: 1 });

    // 같은 참가자가 다른 탭에서 다시 붙으면 예전 연결은 4000
    const { c: B2 } = await authed(host.room.id, b.token);
    assert.equal((await B.closed).code, 4000);

    // 연결이 끊기면 presence false (그 전에 온 online true들은 건너뛴다)
    B2.ws.close();
    let off = await H.next('presence');
    while (off.online) off = await H.next('presence');
    assert.equal(off.memberId, b.you.id);

    // 나가기 → 그 연결 4001, 남은 사람에게 member_left
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}/members/me`, { token: a.token })).status, 204);
    assert.equal((await A.closed).code, 4001);
    assert.equal((await H.next('member_left')).memberId, a.you.id);

    // 방 닫기 → room_closed + 4004
    const { c: B3 } = await authed(host.room.id, b.token);
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}`, { token: host.token })).status, 204);
    assert.equal((await B3.next('room_closed')).reason, 'closed');
    assert.equal((await B3.closed).code, 4004);
    assert.equal((await H.closed).code, 4004);
});

test('공유 상태는 저장소에 남는다 (모두 나갔다 다시 붙어도)', async () => {
    const host = await create('지은');
    const { c: H } = await authed(host.room.id, host.token);
    H.send({ type: 'state', state: { phase: 'show', at: 3 } });
    await new Promise((r) => setTimeout(r, 200));
    H.ws.close();
    await H.closed;
    const { welcome } = await authed(host.room.id, host.token);
    assert.deepEqual(welcome.state, { phase: 'show', at: 3 });
});

test('기간이 지나면 room_closed expired + 4004, 이후 404', async () => {
    const host = await create('지은', { ttl: 1500 });
    const { c } = await authed(host.room.id, host.token);
    assert.equal((await c.next('room_closed', 8000)).reason, 'expired');
    assert.equal((await c.closed).code, 4004);
    assert.equal((await call('GET', `/api/rooms/${host.room.id}`)).status, 404);
});

test('방 만들기 하루 제한 (같은 IP 30개)', async () => {
    for (let i = 0; i < 30; i++) {
        const r = await call('POST', '/api/rooms', { ip: '10.9.9.9', body: { game: 'imposter', nickname: `n${i}` } });
        assert.equal(r.status, 201);
    }
    const over = await call('POST', '/api/rooms', { ip: '10.9.9.9', body: { game: 'imposter', nickname: 'over' } });
    assert.equal(over.status, 429);
});

test('도배 막기: 10초에 60개 넘으면 버리고 알림, 300개 넘으면 연결 끊기(1008)', async () => {
    const host = await create('방장');
    const a = await join(host.room.id, '받는사람');
    const { c: H } = await authed(host.room.id, host.token);
    const { c: A } = await authed(host.room.id, a.token);
    await H.next('presence');
    let got = 0;
    A.ws.addEventListener('message', (e) => { if (JSON.parse(e.data).type === 'message') got++; });
    for (let i = 0; i < 70; i++) H.send({ type: 'broadcast', data: { i } });
    assert.match((await H.next('error')).message, /너무 빨리/);
    await new Promise((r) => setTimeout(r, 500));
    assert.ok(got <= 60, `60개까지만 전달돼야 하는데 ${got}개`);
    assert.ok(await H.none('error', 200), '알림은 한 번만');
    for (let i = 0; i < 300; i++) H.send({ type: 'broadcast', data: { i } });
    assert.equal((await H.closed).code, 1008);
    // ping 자동 응답은 세지 않는다
    const { c: P } = await authed(host.room.id, host.token);
    for (let i = 0; i < 80; i++) P.send('{"type":"ping"}');
    assert.ok(await P.none('error', 300), 'ping은 제한에 걸리지 않음');
    P.ws.close();
    A.ws.close();   // 열린 연결이 남으면 테스트 프로세스가 끝나지 않는다
});

test('비밀 보관함(vault): 방장만 쓰고 방장 welcome에만 온다', async () => {
    const host = await create('방장');
    const a = await join(host.room.id, '민수');
    const { c: H, welcome: hw } = await authed(host.room.id, host.token);
    assert.equal(hw.vault, null);
    assert.equal(hw.hostOfflineMs, null);
    const { c: A, welcome: aw } = await authed(host.room.id, a.token);
    assert.ok(!('vault' in aw), '참가자 welcome에는 vault가 없다');
    A.send({ type: 'vault', data: { x: 1 } });
    assert.equal((await A.next('error')).message, '방장만 할 수 있어요.');
    // 16KB를 넘어도 vault는 64KB까지 받는다 (다른 메시지는 16KB)
    const big = 'ㄱ'.repeat(10_000);   // 30KB
    H.send({ type: 'vault', data: { answers: big } });
    H.send({ type: 'broadcast', data: { big } });
    assert.match((await H.next('error')).message, /너무 커요/);
    H.ws.close();
    await H.closed;
    const { c: H2, welcome: hw2 } = await authed(host.room.id, host.token);
    assert.equal(hw2.vault.answers.length, 10_000);
    H2.send({ type: 'vault', data: 'ㄱ'.repeat(30_000) });   // 90KB
    assert.match((await H2.next('error')).message, /너무 커요/);
    H2.ws.close();
    A.ws.close();
});

test('방장 넘기기(transfer): 접속한 참가자에게, 새 방장만 vault를 받는다', async () => {
    const host = await create('방장');
    const a = await join(host.room.id, '민수');
    const b = await join(host.room.id, '현우');
    const { c: H } = await authed(host.room.id, host.token);
    const { c: A } = await authed(host.room.id, a.token);
    H.send({ type: 'vault', data: { secret: 42 } });
    H.send({ type: 'transfer', to: b.you.id });   // 현우는 아직 안 붙음
    assert.equal((await H.next('error')).message, '상대가 접속해 있지 않아요.');
    A.send({ type: 'transfer', to: a.you.id });
    assert.equal((await A.next('error')).message, '방장만 할 수 있어요.');

    H.send({ type: 'transfer', to: a.you.id });
    const toOld = await H.next('host_changed');
    const toNew = await A.next('host_changed');
    assert.deepEqual([toOld.from, toOld.to, toOld.reason], [host.you.id, a.you.id, 'transfer']);
    assert.ok(!('vault' in toOld), '예전 방장은 vault를 안 받는다');
    assert.deepEqual(toNew.vault, { secret: 42 });

    // 이제 예전 방장은 state를 못 바꾸고 나갈 수 있다. 새 방장은 state를 바꾸고 방을 닫을 수 있다.
    H.send({ type: 'state', state: { p: 1 } });
    assert.equal((await H.next('error')).message, '방장만 공유 상태를 바꿀 수 있어요.');
    A.send({ type: 'state', state: { p: 2 } });
    assert.deepEqual((await H.next('state')).state, { p: 2 });
    const info = await call('GET', `/api/rooms/${host.room.id}`);
    assert.deepEqual(info.data.members.filter((m) => m.host).map((m) => m.id), [a.you.id]);
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}`, { token: host.token })).status, 403);
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}/members/me`, { token: host.token })).status, 204);
    assert.equal((await H.closed).code, 4001);
    assert.equal((await call('DELETE', `/api/rooms/${host.room.id}`, { token: a.token })).status, 204);
    assert.equal((await A.closed).code, 4004);
});

test('방장 이어받기(claim_host): 방장이 끊긴 지 HOST_GRACE_MS가 지나야', async () => {
    const host = await create('방장');
    const a = await join(host.room.id, '민수');
    const b = await join(host.room.id, '현우');
    const { c: H } = await authed(host.room.id, host.token);
    const { c: A } = await authed(host.room.id, a.token);
    const { c: B } = await authed(host.room.id, b.token);
    H.send({ type: 'vault', data: { votes: [1, 2] } });
    A.send({ type: 'claim_host' });
    assert.equal((await A.next('error')).message, '방장이 아직 접속해 있어요.');

    H.ws.close();
    await H.closed;
    let off = await A.next('presence');
    while (off.memberId !== host.you.id || off.online) off = await A.next('presence');
    A.send({ type: 'claim_host' });
    assert.match((await A.next('error')).message, /기다리는 중이에요/);
    // 늦게 붙은 사람도 welcome으로 방장이 끊긴 걸 안다
    const { c: B2, welcome: bw } = await authed(host.room.id, b.token);
    assert.equal(bw.hostGraceMs, 1500);
    assert.ok(bw.hostOfflineMs >= 0 && bw.hostOfflineMs < 1500, String(bw.hostOfflineMs));
    await B.closed;

    await new Promise((r) => setTimeout(r, 1600));
    A.send({ type: 'claim_host' });
    B2.send({ type: 'claim_host' });   // 동시에 눌러도 한 사람만
    const got = await A.next('host_changed');
    assert.deepEqual([got.from, got.to, got.reason, got.vault], [host.you.id, a.you.id, 'claim', { votes: [1, 2] }]);
    const seen = await B2.next('host_changed');
    assert.equal(seen.to, a.you.id);
    assert.ok(!('vault' in seen));
    assert.equal((await B2.next('error')).message, '방장이 아직 접속해 있어요.');

    // 예전 방장이 돌아오면 참가자로 붙는다 (vault 없음)
    const { c: H2, welcome: hw } = await authed(host.room.id, host.token);
    assert.equal(hw.you.host, false);
    assert.ok(!('vault' in hw));
    assert.equal(hw.hostOfflineMs, null);
    H2.ws.close(); A.ws.close(); B2.ws.close();
});
