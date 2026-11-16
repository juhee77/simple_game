// ════════════════════════════════════════════════════════════
//  방(room) 서버 — Cloudflare Workers + Durable Objects
//  server/(Kotlin + Spring Boot)와 주소 규칙·메시지 형식이 똑같아서
//  scripts/room-client.js를 그대로 쓴다. (송년회 진행 키트, 네온 고스트의 "각자 폰으로")
//
//  - 방 하나 = Durable Object 하나 (idFromName(방ID)). 방 정보·참가자·공유 상태는 그 객체의 SQLite 저장소에 둔다.
//  - WebSocket은 Hibernation API로 받아서, 조용한 연결은 요금이 붙지 않는다. ping/pong은 자동 응답.
//  - 참가자 토큰은 SHA-256 해시만 저장한다.
//  - 오류 응답은 { detail } 이고, detail은 화면에 그대로 띄울 수 있는 문장이다.
// ════════════════════════════════════════════════════════════
import { DurableObject } from 'cloudflare:workers';

const DAY = 24 * 3600 * 1000;
const KST = 9 * 3600 * 1000;
const TTL = 7 * DAY;
const MAX_MEMBERS = 20;
const MAX_MESSAGE_BYTES = 16 * 1024;
const ROOMS_PER_DAY = 30;   // IP당 하루 방 만들기
const ID_RE = /^[A-Za-z0-9_-]{22}$/;
const GAME_RE = /^[a-z0-9-]{1,40}$/;
const CLOSE = { REPLACED: [4000, 'replaced'], LEFT: [4001, 'left'], UNAUTHORIZED: [4003, 'unauthorized'], ROOM_CLOSED: [4004, 'room_closed'] };

const MSG = {
    notFound: '방이 없거나 기간이 지나 사라졌어요.',
    unauthorized: '이 방의 참가자 정보가 맞지 않아요. 다시 참여해 주세요.',
    full: `방이 꽉 찼어요. (최대 ${MAX_MEMBERS}명)`,
    dupNick: '이미 같은 닉네임이 있어요. 다른 이름으로 들어와 주세요.',
    hostLeave: '방장은 나갈 수 없어요. 방을 닫아 주세요.',
    hostOnlyClose: '방장만 방을 닫을 수 있어요.',
    badGame: '게임 이름이 올바르지 않아요.',
    badRoomName: '방 이름은 40자까지 쓸 수 있어요.',
    badNick: '닉네임은 1~20자로 적어 주세요.',
    badJson: '요청 형식이 맞지 않아요.',
    tooMany: '오늘은 방을 더 만들 수 없어요. 내일 다시 시도해 주세요.'
};

class HttpError extends Error {
    constructor(status, detail) {
        super(detail);
        this.status = status;
        this.detail = detail;
    }
}

const json = (data, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const problem = (e) => json({ status: e.status, detail: e.detail }, e.status);

// ── 무작위·해시 ──
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const newId = () => b64u(crypto.getRandomValues(new Uint8Array(16)));        // 128비트 → 22자
const newSecret = () => b64u(crypto.getRandomValues(new Uint8Array(32)));    // 256비트 → 43자
async function sha256(text) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readJson(req) {
    const text = await req.text();
    if (text.length > MAX_MESSAGE_BYTES) throw new HttpError(413, '보낸 내용이 너무 커요.');
    try {
        const v = text ? JSON.parse(text) : {};
        if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('obj');
        return v;
    } catch {
        throw new HttpError(400, MSG.badJson);
    }
}

function validNickname(v) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (!s || s.length > 20) throw new HttpError(400, MSG.badNick);
    return s;
}

function bearer(req) {
    const h = req.headers.get('Authorization') || '';
    const t = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
    if (!t) throw new HttpError(401, MSG.unauthorized);
    return t;
}

const devOn = (env) => env.ALLOW_DEV === '1';

// ════════════════════════════════════════════════════════════
//  Room: 방 하나
// ════════════════════════════════════════════════════════════
export class Room extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        // ping은 객체를 깨우지 않고 바로 pong (room-client.js가 25초마다 보낸다)
        ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'));
    }

    // ── 저장소 ──
    async room() {
        const r = await this.ctx.storage.get('room');
        if (!r) return null;
        if (r.expiresAt <= Date.now()) { await this.expire(); return null; }
        return r;
    }
    async members() { return (await this.ctx.storage.get('members')) || []; }
    async liveRoom() {
        const r = await this.room();
        if (!r) throw new HttpError(404, MSG.notFound);
        return r;
    }

    // ── 접속 ──
    sockets() {
        return this.ctx.getWebSockets().map((ws) => ({ ws, memberId: ws.deserializeAttachment()?.memberId || null }));
    }
    online() { return new Set(this.sockets().filter((s) => s.memberId).map((s) => s.memberId)); }
    send(ws, message) { try { ws.send(JSON.stringify(message)); } catch { /* 이미 닫힘 */ } }
    close(ws, [code, reason]) { try { ws.close(code, reason); } catch { /* 이미 닫힘 */ } }
    broadcast(message, except = null) {
        const text = JSON.stringify(message);
        this.sockets().forEach(({ ws, memberId }) => {
            if (memberId && memberId !== except) { try { ws.send(text); } catch { /* 무시 */ } }
        });
    }

    memberResponse(m, online) { return { id: m.id, nickname: m.nickname, host: m.host, online: online.has(m.id) }; }
    roomResponse(room, members, online = this.online()) {
        return {
            id: room.id, game: room.game, name: room.name,
            createdAt: new Date(room.createdAt).toISOString(), expiresAt: new Date(room.expiresAt).toISOString(),
            members: members.map((m) => this.memberResponse(m, online))
        };
    }

    async addMember(room, nickname, host) {
        const token = newSecret();
        const member = { id: newId(), nickname, tokenHash: await sha256(token), host, joinedAt: Date.now() };
        const members = [...(await this.members()), member];
        await this.ctx.storage.put('members', members);
        const online = this.online();
        this.broadcast({ type: 'member_joined', member: this.memberResponse(member, online) });
        return json({ room: this.roomResponse(room, members, online), you: this.memberResponse(member, online), token }, 201);
    }

    async requireMember(req) {
        const room = await this.liveRoom();
        const hash = await sha256(bearer(req));
        const member = (await this.members()).find((m) => m.tokenHash === hash);
        if (!member) throw new HttpError(401, MSG.unauthorized);
        return { room, member };
    }

    // ── 요청 ──
    async fetch(req) {
        const url = new URL(req.url);
        try {
            if (url.pathname === '/ws') return this.upgrade();
            if (req.method === 'POST' && url.pathname === '/create') return await this.create(req);
            if (req.method === 'GET' && url.pathname === '/info') {
                const room = await this.liveRoom();
                return json(this.roomResponse(room, await this.members()));
            }
            if (req.method === 'POST' && url.pathname === '/join') return await this.join(req);
            if (req.method === 'DELETE' && url.pathname === '/leave') return await this.leave(req);
            if (req.method === 'DELETE' && url.pathname === '/close') return await this.closeRoom(req);
            throw new HttpError(404, '없는 주소예요.');
        } catch (e) {
            if (e instanceof HttpError) return problem(e);
            throw e;
        }
    }

    async create(req) {
        const b = await readJson(req);
        if (await this.ctx.storage.get('room')) throw new HttpError(409, '이미 있는 방이에요.');
        if (typeof b.game !== 'string' || !GAME_RE.test(b.game)) throw new HttpError(400, MSG.badGame);
        const name = typeof b.name === 'string' ? b.name.trim() : '';
        if (name.length > 40) throw new HttpError(400, MSG.badRoomName);
        const nickname = validNickname(b.nickname);
        const now = Date.now();
        const ttl = Number(b.ttl) > 0 ? Number(b.ttl) : TTL;
        const room = { id: b.id, game: b.game, name, createdAt: now, expiresAt: now + ttl };
        await this.ctx.storage.put('room', room);
        await this.ctx.storage.setAlarm(room.expiresAt);
        return this.addMember(room, nickname, true);
    }

    async join(req) {
        const b = await readJson(req);
        const nickname = validNickname(b.nickname);
        const room = await this.liveRoom();
        const members = await this.members();
        if (members.length >= MAX_MEMBERS) throw new HttpError(409, MSG.full);
        if (members.some((m) => m.nickname === nickname)) throw new HttpError(409, MSG.dupNick);
        return this.addMember(room, nickname, false);
    }

    async leave(req) {
        const { member } = await this.requireMember(req);
        if (member.host) throw new HttpError(409, MSG.hostLeave);
        await this.ctx.storage.put('members', (await this.members()).filter((m) => m.id !== member.id));
        this.sockets().filter((s) => s.memberId === member.id).forEach(({ ws }) => {
            ws.serializeAttachment({ memberId: null, left: true });
            this.close(ws, CLOSE.LEFT);
        });
        this.broadcast({ type: 'member_left', memberId: member.id });
        return json(null, 204);
    }

    async closeRoom(req) {
        const { member } = await this.requireMember(req);
        if (!member.host) throw new HttpError(403, MSG.hostOnlyClose);
        await this.shutdown('closed');
        return json(null, 204);
    }

    async shutdown(reason) {
        const text = JSON.stringify({ type: 'room_closed', reason });
        this.sockets().forEach(({ ws, memberId }) => {
            if (memberId) { try { ws.send(text); } catch { /* 무시 */ } }
            ws.serializeAttachment({ memberId: null, closed: true });
            this.close(ws, CLOSE.ROOM_CLOSED);
        });
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
    }

    async expire() { await this.shutdown('expired'); }
    async alarm() { if (await this.ctx.storage.get('room')) await this.expire(); }

    upgrade() {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({ memberId: null });
        return new Response(null, { status: 101, webSocket: client });
    }

    // ── WebSocket 메시지 ──
    async webSocketMessage(ws, raw) {
        if (typeof raw !== 'string') { this.send(ws, { type: 'error', message: 'JSON 형식이 아니에요.' }); return; }
        if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) {
            this.send(ws, { type: 'error', message: '메시지가 너무 커요. (16KB까지)' });
            return;
        }
        let node;
        try {
            node = JSON.parse(raw);
            if (!node || typeof node !== 'object') throw new Error('obj');
        } catch {
            this.send(ws, { type: 'error', message: 'JSON 형식이 아니에요.' });
            return;
        }
        const type = node.type;
        const memberId = ws.deserializeAttachment()?.memberId;
        if (!memberId) {
            if (type === 'auth') await this.authenticate(ws, typeof node.token === 'string' ? node.token : '');
            else this.close(ws, CLOSE.UNAUTHORIZED);
            return;
        }
        const room = await this.room();
        if (!room) { this.close(ws, CLOSE.ROOM_CLOSED); return; }
        const members = await this.members();
        const member = members.find((m) => m.id === memberId);
        if (!member) { this.close(ws, CLOSE.LEFT); return; }

        const need = (field) => {
            if (node[field] === undefined || node[field] === null) { this.send(ws, { type: 'error', message: `'${field}' 값이 필요해요.` }); return false; }
            return true;
        };
        switch (type) {
            case 'ping': this.send(ws, { type: 'pong' }); break;
            case 'broadcast':
                if (need('data')) this.broadcast({ type: 'message', from: memberId, to: null, data: node.data }, memberId);
                break;
            case 'send': {
                if (!need('data')) break;
                const to = typeof node.to === 'string' ? node.to : '';
                const target = this.sockets().find((s) => s.memberId === to);
                if (!target) { this.send(ws, { type: 'error', message: '상대가 접속해 있지 않아요.' }); break; }
                this.send(target.ws, { type: 'message', from: memberId, to, data: node.data });
                break;
            }
            case 'state':
                if (!member.host) { this.send(ws, { type: 'error', message: '방장만 공유 상태를 바꿀 수 있어요.' }); break; }
                if (!need('state')) break;
                await this.ctx.storage.put('state', node.state);
                this.broadcast({ type: 'state', from: memberId, state: node.state }, memberId);
                break;
            case 'auth': this.send(ws, { type: 'error', message: '이미 인증했어요.' }); break;
            default: this.send(ws, { type: 'error', message: `알 수 없는 메시지예요: ${type}` });
        }
    }

    async authenticate(ws, token) {
        const room = await this.room();
        if (!room || !token) { this.close(ws, CLOSE.UNAUTHORIZED); return; }   // 없는 방·만료된 방도 서버(Kotlin)처럼 인증 실패로 닫는다
        const hash = await sha256(token);
        const members = await this.members();
        const member = members.find((m) => m.tokenHash === hash);
        if (!member) { this.close(ws, CLOSE.UNAUTHORIZED); return; }
        // 같은 참가자의 예전 연결(다른 탭 등)은 끊는다
        this.sockets().forEach((s) => {
            if (s.memberId === member.id && s.ws !== ws) {
                s.ws.serializeAttachment({ memberId: null, replaced: true });
                this.close(s.ws, CLOSE.REPLACED);
            }
        });
        ws.serializeAttachment({ memberId: member.id });
        const online = this.online();
        const state = (await this.ctx.storage.get('state')) ?? null;
        this.send(ws, { type: 'welcome', room: this.roomResponse(room, members, online), you: this.memberResponse(member, online), state });
        this.broadcast({ type: 'presence', memberId: member.id, online: true }, member.id);
    }

    async webSocketClose(ws, code, reason) {
        await this.gone(ws);
        // 닫기 응답을 돌려줘야 상대가 기다리지 않는다. 1005·1006·1015는 보낼 수 없는 예약 코드라 1000으로 답한다.
        const reply = code >= 1000 && code < 5000 && ![1005, 1006, 1015].includes(code) ? code : 1000;
        try { ws.close(reply, reason); } catch { /* 이미 닫힘 */ }
    }

    async webSocketError(ws) { await this.gone(ws); }

    // 이 연결이 그 참가자의 마지막 연결이었으면 오프라인이 됐다고 알린다
    async gone(ws) {
        const memberId = ws.deserializeAttachment()?.memberId;
        if (!memberId) return;
        ws.serializeAttachment({ memberId: null });
        const still = this.sockets().some((s) => s.ws !== ws && s.memberId === memberId);
        if (!still) this.broadcast({ type: 'presence', memberId, online: false });
    }
}

// ════════════════════════════════════════════════════════════
//  Limiter: 날짜(KST)별 하나. IP 해시별 방 만들기 횟수
// ════════════════════════════════════════════════════════════
export class Limiter extends DurableObject {
    async fetch(req) {
        const { key } = await req.json();
        const n = ((await this.ctx.storage.get(key)) || 0) + 1;
        await this.ctx.storage.put(key, n);
        if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + 2 * DAY);
        return json({ count: n });
    }
    async alarm() { await this.ctx.storage.deleteAll(); }
}

// ════════════════════════════════════════════════════════════
//  입구: CORS·출처 확인 후 방 객체로 넘긴다
// ════════════════════════════════════════════════════════════
function allowedOrigin(origin, env) {
    if (!origin) return null;
    const list = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const ok = list.some((pat) => {
        if (!pat.includes('*')) return pat === origin;
        const re = new RegExp(`^${pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '\\d+')}$`);
        return re.test(origin);
    });
    return ok ? origin : null;
}

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
    };
}

async function limitCreate(req, env) {
    const ip = (devOn(env) && req.headers.get('X-Dev-Ip')) || req.headers.get('CF-Connecting-IP') || 'local';
    const day = new Date(Date.now() + KST).toISOString().slice(0, 10);
    const stub = env.LIMITS.get(env.LIMITS.idFromName(`rooms:${day}`));
    const key = (await sha256(`${ip}|${day}`)).slice(0, 24);
    const { count } = await (await stub.fetch('https://limits/hit', { method: 'POST', body: JSON.stringify({ key }) })).json();
    if (count > ROOMS_PER_DAY) throw new HttpError(429, MSG.tooMany);
}

const roomStub = (env, id) => env.ROOMS.get(env.ROOMS.idFromName(id));

async function route(req, env) {
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const M = req.method;
    if (M === 'GET' && p[0] === 'health') return json({ ok: true });

    // WebSocket /ws/rooms/{id}
    if (p[0] === 'ws' && p[1] === 'rooms' && p.length === 3) {
        if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') throw new HttpError(426, 'WebSocket 연결이 필요해요.');
        const id = ID_RE.test(p[2]) ? p[2] : newId();   // 형식이 틀린 방은 빈 객체로 보내 인증에서 4003으로 닫힌다
        return roomStub(env, id).fetch(new Request('https://room/ws', req));
    }

    if (p[0] === 'api' && p[1] === 'rooms') {
        if (p.length === 2 && M === 'POST') {
            const body = await readJson(req);
            await limitCreate(req, env);
            const id = newId();
            const ttl = devOn(env) && Number(req.headers.get('X-Dev-Ttl')) > 0 ? Number(req.headers.get('X-Dev-Ttl')) : undefined;
            return roomStub(env, id).fetch('https://room/create', { method: 'POST', body: JSON.stringify({ ...body, id, ttl }) });
        }
        const id = p[2];
        if (!ID_RE.test(id || '')) throw new HttpError(404, MSG.notFound);
        const forward = (path, method) => roomStub(env, id).fetch(`https://room${path}`, { method, headers: req.headers, body: method === 'GET' || method === 'DELETE' ? undefined : req.body });
        if (p.length === 3 && M === 'GET') return forward('/info', 'GET');
        if (p.length === 3 && M === 'DELETE') return forward('/close', 'DELETE');
        if (p.length === 4 && p[3] === 'members' && M === 'POST') return forward('/join', 'POST');
        if (p.length === 5 && p[3] === 'members' && p[4] === 'me' && M === 'DELETE') return forward('/leave', 'DELETE');
    }
    throw new HttpError(404, '없는 주소예요.');
}

export default {
    async fetch(req, env) {
        const origin = req.headers.get('Origin');
        const allowed = allowedOrigin(origin, env);
        if (req.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: allowed ? corsHeaders(allowed) : {} });
        if (origin && !allowed) return json({ status: 403, detail: '허용되지 않은 사이트에서 온 요청이에요.' }, 403);
        let res;
        try {
            res = await route(req, env);
        } catch (e) {
            if (e instanceof HttpError) res = problem(e);
            else {
                console.error(e);
                res = json({ status: 500, detail: '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.' }, 500);
            }
        }
        if (res.status === 101 || !allowed) return res;
        const out = new Response(res.body, res);
        Object.entries(corsHeaders(allowed)).forEach(([k, v]) => out.headers.set(k, v));
        return out;
    }
};
