// 로컬 wrangler dev를 새 임시 DB로 띄워서 API를 처음부터 끝까지 확인한다.
// 실행: npm test   (Cloudflare 계정 없이 돈다)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = 'https://juhee77.github.io';
const WRANGLER = join(ROOT, 'node_modules', '.bin', 'wrangler');
let dev;
let dir;
let ipSeq = 0;

before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'tree-api-'));
    execFileSync(WRANGLER, ['d1', 'migrations', 'apply', 'advent-tree', '--local', '--persist-to', dir], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, CI: '1' } });
    dev = spawn(WRANGLER, ['dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', dir, '--var', 'ALLOW_DEV:1'], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, CI: '1' } });
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

// 요청마다 다른 가짜 IP를 써서 하루 제한에 걸리지 않게 한다 (제한 테스트는 같은 IP를 일부러 쓴다)
async function call(method, path, { body, token, now, ip, origin = ORIGIN } = {}) {
    const headers = { 'X-Dev-Ip': ip || `10.0.0.${++ipSeq}` };
    if (origin) headers.Origin = origin;
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (now) headers['X-Dev-Now'] = now;
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = res.status === 204 ? null : await res.json();
    return { status: res.status, data, headers: res.headers };
}

const state = (extra = {}) => ({ v: 1, waters: ['2026-12-01'], hung: [{ uid: 'a1', type: 'ball-red', slot: 2, src: 'self' }], tray: [], draws: {}, gifts: [], opened: false, ...extra });
const NOV = '2026-11-20T03:00:00Z';
const XMAS_EVE = '2026-12-24T14:59:00Z';   // 12/24 23:59 KST
const XMAS = '2026-12-24T15:00:00Z';       // 12/25 00:00 KST

async function makeTree(owner = '민수', mode = 'solo', extra = {}) {
    const r = await call('POST', '/trees', { body: { owner, mode, year: 2026, state: state(extra.state), ...(extra.id ? { id: extra.id } : {}) }, now: NOV });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data;
}

test('상태 확인과 CORS', async () => {
    const ok = await call('GET', '/health');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
    const local = await call('GET', '/health', { origin: 'http://localhost:8765' });
    assert.equal(local.headers.get('access-control-allow-origin'), 'http://localhost:8765');
    const bad = await call('GET', '/health', { origin: 'https://evil.example' });
    assert.equal(bad.status, 403);
    const pre = await fetch(`${BASE}/trees`, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(pre.status, 204);
});

test('트리 만들기·토큰 인증·저장 충돌', async () => {
    const t = await makeTree();
    assert.match(t.id, /^[0-9a-z]{16}$/);
    const wrong = await call('PUT', `/trees/${t.id}`, { token: 'x'.repeat(43), body: { state: state(), rev: 1 } });
    assert.equal(wrong.status, 403);
    const put = await call('PUT', `/trees/${t.id}`, { token: t.token, body: { state: state({ waters: ['2026-12-01', '2026-12-02'] }), rev: 1 } });
    assert.equal(put.status, 200);
    assert.equal(put.data.rev, 2);
    const stale = await call('PUT', `/trees/${t.id}`, { token: t.token, body: { state: state(), rev: 1 } });
    assert.equal(stale.status, 409);
    assert.equal(stale.data.tree.rev, 2);
    assert.deepEqual(stale.data.tree.state.waters, ['2026-12-01', '2026-12-02']);
    // 선물 200개(받을 수 있는 최대)를 바구니에 둔 트리도 저장된다
    const gifts = Array.from({ length: 200 }, (_, i) => ({ uid: `u${String(i).padStart(5, '0')}`, type: 'e.6🐶', src: 'gift', from: '친구이름열자까지다', gid: `g${String(i).padStart(11, '0')}`, sv: 1, hasMsg: true }));
    const full = await call('PUT', `/trees/${t.id}`, { token: t.token, body: { state: state({ tray: gifts, gifts: gifts.map((g) => g.gid) }), rev: 2 } });
    assert.equal(full.status, 200);
    const big = await call('PUT', `/trees/${t.id}`, { token: t.token, body: { state: state({ pad: 'x'.repeat(70000) }), rev: 3 } });
    assert.equal(big.status, 413);
    const dup = await call('POST', '/trees', { body: { id: t.id, owner: '누구', mode: 'solo', year: 2026, state: state() }, now: NOV });
    assert.equal(dup.status, 409);
    const migrated = await makeTree('옮김', 'solo', { id: 'abc123def4' });
    assert.equal(migrated.id, 'abc123def4');
    const badName = await call('POST', '/trees', { body: { owner: '', mode: 'solo', year: 2026, state: state() }, now: NOV });
    assert.equal(badName.status, 400);
});

test('선물: 공개 조회엔 메시지가 없고, 25일(KST) 전에는 주인에게도 잠김', async () => {
    const t = await makeTree();
    const g = await call('POST', `/trees/${t.id}/gifts`, { body: { type: 'g-cat', sender: '지은', message: '메리 크리스마스!' } });
    assert.equal(g.status, 201);
    const bad = await call('POST', `/trees/${t.id}/gifts`, { body: { type: 'gold-star', sender: '지은' } });
    assert.equal(bad.status, 400);
    const long = await call('POST', `/trees/${t.id}/gifts`, { body: { type: 'g-cat', sender: '지은', message: 'x'.repeat(81) } });
    assert.equal(long.status, 400);

    const pub = await call('GET', `/trees/${t.id}`);
    assert.equal(pub.status, 200);
    assert.ok(!JSON.stringify(pub.data).includes('메리'), '공개 조회에 메시지가 있으면 안 된다');
    assert.equal(pub.data.tree, undefined);

    const eve = await call('GET', `/trees/${t.id}/private`, { token: t.token, now: XMAS_EVE });
    assert.equal(eve.data.gifts.length, 1);
    assert.equal(eve.data.gifts[0].hasMessage, true);
    assert.equal(eve.data.gifts[0].message, undefined);
    const xmas = await call('GET', `/trees/${t.id}/private`, { token: t.token, now: XMAS });
    assert.equal(xmas.data.gifts[0].message, '메리 크리스마스!');
    const noTok = await call('GET', `/trees/${t.id}/private`);
    assert.equal(noTok.status, 403);
});

test('선물: 이모지 장식은 이모지 한 글자만 받음', async () => {
    const t = await makeTree();
    const okTypes = ['e.0🎅', 'e.b👍🏽', 'e.5❄️', 'e.a👩\u200d🍳', 'e.3🇰🇷'];
    for (const type of okTypes) {
        const r = await call('POST', `/trees/${t.id}/gifts`, { ip: '10.7.7.7', body: { type, sender: '지은' } });
        assert.equal(r.status, 201, type);
    }
    const badTypes = ['e.0', 'e.c🎅', 'e.0a', 'e.0🎅<b>', 'e.0🎅 ', 'e.0<script>', 'e.0' + '🎅'.repeat(9), 'x.0🎅', 'e.0#'];
    for (const type of badTypes) {
        const r = await call('POST', `/trees/${t.id}/gifts`, { ip: '10.7.7.7', body: { type, sender: '지은' } });
        assert.equal(r.status, 400, type);
    }
    const priv = await call('GET', `/trees/${t.id}/private`, { token: t.token, now: XMAS_EVE });
    assert.deepEqual(priv.data.gifts.map((g) => g.type), okTypes);
});

test('선물 하루 제한 (같은 IP 30개)', async () => {
    const t = await makeTree();
    for (let i = 0; i < 30; i++) {
        const r = await call('POST', `/trees/${t.id}/gifts`, { ip: '10.9.9.9', body: { type: 'g-dog', sender: '도배' } });
        assert.equal(r.status, 201);
    }
    const over = await call('POST', `/trees/${t.id}/gifts`, { ip: '10.9.9.9', body: { type: 'g-dog', sender: '도배' } });
    assert.equal(over.status, 429);
});

test('짝꿍: 초대 코드로 연결, 재사용·이미 짝·모드 검사', async () => {
    const a = await makeTree('지은', 'couple');
    const b = await makeTree('현우', 'solo');
    const c = await makeTree('세번째', 'couple');
    const soloCode = await call('POST', `/trees/${b.id}/pair-code`, { token: b.token });
    assert.equal(soloCode.status, 409);
    const code = await call('POST', `/trees/${a.id}/pair-code`, { token: a.token, now: NOV });
    assert.equal(code.status, 200);
    const wrong = await call('POST', `/trees/${b.id}/pair`, { token: b.token, body: { partnerId: a.id, code: 'nope' }, now: NOV });
    assert.equal(wrong.status, 403);
    const ok = await call('POST', `/trees/${b.id}/pair`, { token: b.token, body: { partnerId: a.id, code: code.data.code }, now: NOV });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.partner.id, a.id);
    const pa = await call('GET', `/trees/${a.id}`);
    assert.equal(pa.data.partnerId, b.id);
    assert.equal(pa.data.partnerName, '현우');
    const pb = await call('GET', `/trees/${b.id}`);
    assert.equal(pb.data.mode, 'couple');
    const again = await call('POST', `/trees/${c.id}/pair`, { token: c.token, body: { partnerId: a.id, code: code.data.code }, now: NOV });
    assert.equal(again.status, 409);
    const priv = await call('GET', `/trees/${a.id}/private`, { token: a.token });
    assert.equal(priv.data.partner.id, b.id);
    const modeChange = await call('PUT', `/trees/${a.id}`, { token: a.token, body: { state: state(), rev: 1, mode: 'solo' } });
    assert.equal(modeChange.status, 409);
});

test('짝꿍 코드 만료 (7일)', async () => {
    const a = await makeTree('가', 'couple');
    const b = await makeTree('나', 'couple');
    const code = await call('POST', `/trees/${a.id}/pair-code`, { token: a.token, now: NOV });
    const late = await call('POST', `/trees/${b.id}/pair`, { token: b.token, body: { partnerId: a.id, code: code.data.code }, now: '2026-11-28T03:00:00Z' });
    assert.equal(late.status, 403);
});

test('짝꿍 옮기기(legacy): 서로 짝으로 적혀 있어야만 연결', async () => {
    const a = await makeTree('옛A', 'couple', { id: 'legacya001', state: { couple: { id: 'legacyb001' } } });
    const b = await makeTree('옛B', 'couple', { id: 'legacyb001', state: { couple: { id: 'legacya001' } } });
    const x = await makeTree('남', 'couple', { id: 'legacyx001', state: { couple: { id: 'someoneelse' } } });
    const deny = await call('POST', `/trees/${x.id}/pair`, { token: x.token, body: { partnerId: a.id, legacy: true } });
    assert.equal(deny.status, 403);
    const ok = await call('POST', `/trees/${b.id}/pair`, { token: b.token, body: { partnerId: a.id, legacy: true } });
    assert.equal(ok.status, 200);
    const again = await call('POST', `/trees/${a.id}/pair`, { token: a.token, body: { partnerId: b.id, legacy: true } });
    assert.equal(again.status, 200, '이미 짝이면 다시 불러도 괜찮다');
});

test('숲: 만들기·합류·12그루 제한·커플 거절·나가기', async () => {
    const host = await makeTree('숲장', 'forest');
    const f = await call('POST', '/forests', { token: host.token, body: { treeId: host.id, name: '우리 동네 숲', year: 2026 }, now: NOV });
    assert.equal(f.status, 201);
    const members = [];
    for (let i = 0; i < 11; i++) {
        const t = await makeTree(`멤버${i}`, 'solo');
        const j = await call('POST', `/forests/${f.data.id}/members`, { token: t.token, body: { treeId: t.id } });
        assert.equal(j.status, 200, JSON.stringify(j.data));
        members.push(t);
    }
    const thirteenth = await makeTree('늦은', 'solo');
    const full = await call('POST', `/forests/${f.data.id}/members`, { token: thirteenth.token, body: { treeId: thirteenth.id } });
    assert.equal(full.status, 409);
    const view = await call('GET', `/forests/${f.data.id}`);
    assert.equal(view.data.members.length, 12);
    assert.equal(view.data.forest.name, '우리 동네 숲');
    assert.equal(view.data.members[1].mode, 'forest');

    const left = await call('DELETE', `/forests/${f.data.id}/members/${members[0].id}`, { token: members[0].token });
    assert.equal(left.status, 204);
    const nowJoin = await call('POST', `/forests/${f.data.id}/members`, { token: thirteenth.token, body: { treeId: thirteenth.id } });
    assert.equal(nowJoin.status, 200);

    // 커플로 짝 맺은 트리는 숲에 못 들어감
    const a = await makeTree('커A', 'couple');
    const b = await makeTree('커B', 'couple');
    const code = await call('POST', `/trees/${a.id}/pair-code`, { token: a.token, now: NOV });
    await call('POST', `/trees/${b.id}/pair`, { token: b.token, body: { partnerId: a.id, code: code.data.code }, now: NOV });
    const f2 = await call('POST', '/forests', { token: host.token, body: { treeId: host.id, name: '두번째', year: 2026 }, now: NOV });
    assert.equal(f2.status, 409, '이미 숲에 있으면 새 숲을 못 만듦');
    const coupleJoin = await call('POST', `/forests/${f.data.id}/members`, { token: a.token, body: { treeId: a.id } });
    assert.equal(coupleJoin.status, 409);

    // 링크 방식 숲 옮기기: 같은 숲 ID로 만들고, 이미 있으면 409 → 합류
    const m1 = await makeTree('옮1', 'forest');
    const m2 = await makeTree('옮2', 'forest');
    const mf = await call('POST', '/forests', { token: m1.token, body: { treeId: m1.id, id: 'oldforest01', name: '옛 숲', year: 2026 }, now: NOV });
    assert.equal(mf.status, 201);
    const mf2 = await call('POST', '/forests', { token: m2.token, body: { treeId: m2.id, id: 'oldforest01', name: '옛 숲', year: 2026 }, now: NOV });
    assert.equal(mf2.status, 409);
    const mj = await call('POST', '/forests/oldforest01/members', { token: m2.token, body: { treeId: m2.id } });
    assert.equal(mj.status, 200);
});

test('정리: 2월이 되면 지난 시즌 데이터 삭제', async () => {
    const t = await makeTree('지난해');
    await call('POST', `/trees/${t.id}/gifts`, { body: { type: 'g-cat', sender: '지은', message: 'hi' } });
    const jan = await call('POST', '/__cleanup', { now: '2027-01-20T03:00:00Z' });
    assert.equal(jan.data.lastYear, 2025);
    assert.equal((await call('GET', `/trees/${t.id}`)).status, 200, '1월에는 아직 남아 있다');
    const feb = await call('POST', '/__cleanup', { now: '2027-02-02T03:00:00Z' });
    assert.equal(feb.data.lastYear, 2026);
    assert.equal((await call('GET', `/trees/${t.id}`)).status, 404);
});

test('공개 보기: 3D 장식 위치(a·h·z·r)와 예전 칸 번호를 함께 통과, 잘못된 값은 거름', async () => {
    const hung = [
        { uid: 'a1', type: 'ball-red', slot: 2, src: 'self' },
        { uid: 'a2', type: 'bell', a: 123, h: 456, z: 2, r: -15, src: 'self' },
        { uid: 'a3', type: 'g-cat', a: 10, h: 900, z: 1, r: 0, src: 'gift', from: '민지민지민지민지민지민지' },
        { uid: 'a4', type: 'candy', a: 360, h: 100, src: 'self' },
        { uid: 'a5', type: 'candy', a: 10, h: 1001, src: 'self' },
        { uid: 'a6', type: 'candy', a: 10, h: 500, z: 5, r: 90, src: 'self' },
        { uid: 'a7', type: 'candy', slot: 30, src: 'self' }
    ];
    const t = await makeTree('지우', 'solo', { state: { hung, face: 200, theme: 'pink' } });
    const v = await call('GET', `/trees/${t.id}`);
    assert.equal(v.status, 200);
    assert.equal(v.data.face, 200);
    assert.equal(v.data.theme, 'pink');
    const t2 = await makeTree('지우2', 'solo', { state: { theme: '<script>' } });
    assert.equal((await call('GET', `/trees/${t2.id}`)).data.theme, 'green');
    assert.deepEqual(v.data.hung, [
        { slot: 2, type: 'ball-red', src: 'self' },
        { a: 123, h: 456, z: 2, r: -15, type: 'bell', src: 'self' },
        { a: 10, h: 900, type: 'g-cat', src: 'gift', from: '민지민지민지민지민지' },
        { a: 10, h: 500, type: 'candy', src: 'self' }
    ]);
    assert.ok(v.data.hung.every((o) => !('uid' in o)));
});

test('없는 주소·잘못된 아이디', async () => {
    assert.equal((await call('GET', '/nope')).status, 404);
    assert.equal((await call('GET', '/trees/BAD!')).status, 400);
    assert.equal((await call('GET', '/trees/zzzzzzzzzz')).status, 404);
});
