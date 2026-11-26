// ════════════════════════════════════════════════════════════
//  어드벤트 트리 API (Cloudflare Workers + D1)
//  화면은 GitHub Pages(games/advent-tree.html)에 있고, 이 Worker는 트리·선물·짝꿍·숲 데이터만 다룬다.
//
//  원칙
//  - 주인 토큰은 SHA-256 해시로만 저장한다. 토큰을 아는 기기만 그 트리를 고칠 수 있다.
//  - 공개 조회(GET /trees/:id, GET /forests/:id)에는 메시지를 절대 넣지 않는다.
//  - 메시지는 그해 12월 25일 0시(한국 시간) 이후에만 주인에게 내려준다.
//  - 오류 응답은 { detail } 이고, detail은 화면에 그대로 띄울 수 있는 문장이다.
// ════════════════════════════════════════════════════════════

const KST = 9 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;
const MAX_STATE = 64 * 1024;   // 선물 200개(장식 하나 약 120자)도 들어가게
const MAX_FOREST = 12;
const MAX_GIFTS = 200;
const MAX_VISITS = 1500;   // 주인에게 내려주는 발자국 수 (한 시즌)
const PAIR_TTL = 7 * DAY;
const LIMITS = { tree: 20, gift: 30, forest: 10, pair: 20, visit: 120 };   // IP당 하루
const GIFT_TYPES = new Set(['g-present', 'g-letter', 'g-cocoa', 'g-cupcake', 'g-poinsettia', 'g-cat', 'g-dog', 'g-bunny', 'g-wand', 'g-candle', 'g-macaron', 'g-mistletoe']);
// 이모지 장식: "e." + 꾸밈 번호(0~b) + 이모지 한 글자. 이모지 문자만 받는다(글자·기호·공백 X).
const EMO_OK = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\u200d|\ufe0f|[\u{e0020}-\u{e007f}])+$/u;
const PICTO = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
function isGiftType(t) {
    if (GIFT_TYPES.has(t)) return true;
    const m = typeof t === 'string' && t.length <= 24 && /^e\.[0-9ab](.+)$/u.exec(t);
    return Boolean(m && m[1].length <= 16 && EMO_OK.test(m[1]) && PICTO.test(m[1]));
}
const MODES = new Set(['solo', 'couple', 'forest']);
const ID_RE = /^[0-9a-z]{6,20}$/;

class HttpError extends Error {
    constructor(status, detail, extra = {}) {
        super(detail);
        this.status = status;
        this.detail = detail;
        this.extra = extra;
    }
}

const json = (data, status = 200, headers = {}) => new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
});

// ── 시간 ──
// 배포 환경에는 ALLOW_DEV 변수가 없으므로 X-Dev-* 머리글은 무시된다. 로컬 테스트에서만 날짜·IP를 바꿀 수 있다.
const devOn = (env) => env.ALLOW_DEV === '1';
function nowOf(req, env) {
    const d = devOn(env) && req.headers.get('X-Dev-Now');
    if (d) {
        const t = Date.parse(d);
        if (Number.isFinite(t)) return t;
    }
    return Date.now();
}
const kstDay = (ms) => new Date(ms + KST).toISOString().slice(0, 10);
const kstParts = (ms) => { const d = new Date(ms + KST); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const unlockAt = (year) => Date.UTC(year, 11, 25) - KST;   // 그해 12/25 00:00 KST

// ── 무작위·해시 ──
function rid(n) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    const buf = crypto.getRandomValues(new Uint8Array(n));
    return [...buf].map((b) => chars[b % 36]).join('');
}
function token() {
    const buf = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256(text) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── 입력 ──
async function body(req) {
    const text = await req.text();
    if (text.length > MAX_STATE + 2048) throw new HttpError(413, '보낸 내용이 너무 커요.');
    if (!text) return {};
    try {
        const v = JSON.parse(text);
        if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('obj');
        return v;
    } catch {
        throw new HttpError(400, '요청 형식이 맞지 않아요.');
    }
}
function str(v, max, label, { required = true } = {}) {
    const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
    if (required && !s) throw new HttpError(400, `${label}을(를) 적어 주세요.`);
    if (s.length > max) throw new HttpError(400, `${label}은(는) ${max}자까지예요.`);
    return s;
}
function idOf(v, label = '아이디') {
    if (typeof v !== 'string' || !ID_RE.test(v)) throw new HttpError(400, `${label} 형식이 맞지 않아요.`);
    return v;
}
function yearOf(v, now) {
    const y = Number(v);
    const cur = kstParts(now).y;
    if (!Number.isInteger(y) || y < cur - 1 || y > cur + 1) throw new HttpError(400, '연도가 맞지 않아요.');
    return y;
}
function stateText(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, '트리 상태가 맞지 않아요.');
    if (!Array.isArray(v.waters) || !Array.isArray(v.hung) || !Array.isArray(v.tray)) throw new HttpError(400, '트리 상태가 맞지 않아요.');
    const text = JSON.stringify(v);
    if (text.length > MAX_STATE) throw new HttpError(413, '트리 정보가 너무 커요.');
    return text;
}

// ── 횟수 제한 (IP는 해시로만 다룬다) ──
async function limit(env, req, kind, now) {
    const ip = (devOn(env) && req.headers.get('X-Dev-Ip')) || req.headers.get('CF-Connecting-IP') || 'local';
    const day = kstDay(now);
    const key = `${kind}:${(await sha256(`${ip}|${day}`)).slice(0, 24)}:${day}`;
    const row = await env.DB.prepare('INSERT INTO limits (key, day, count) VALUES (?1, ?2, 1) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count')
        .bind(key, day).first();
    if (row.count > LIMITS[kind]) throw new HttpError(429, '오늘은 더 할 수 없어요. 내일 다시 시도해 주세요.');
}

// ── 트리 ──
async function loadTree(env, id) {
    const row = await env.DB.prepare('SELECT * FROM trees WHERE id = ?1').bind(id).first();
    if (!row) throw new HttpError(404, '트리를 찾을 수 없어요.');
    return row;
}
async function authTree(env, req, id) {
    const row = await loadTree(env, id);
    const m = (req.headers.get('Authorization') || '').match(/^Bearer\s+([A-Za-z0-9_-]{20,})$/);
    if (!m || (await sha256(m[1])) !== row.token_hash) throw new HttpError(403, '이 트리를 고칠 수 있는 기기가 아니에요.');
    return row;
}

const SRC = new Set(['self', 'gift', 'heart']);
const THEMES = new Set(['green', 'snow', 'pink', 'gold']);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
// 장식 하나의 공개 모양: 표면 좌표(a 각도·h 높이, 3D 트리) 또는 예전 칸 번호(slot)
function publicOrn(o) {
    if (!o || typeof o.type !== 'string' || o.type.length > 24) return null;
    let pos;
    if (isInt(o.a, 0, 359) && isInt(o.h, 0, 1000)) {
        pos = { a: o.a, h: o.h };
        if (isInt(o.z, 0, 2) && o.z !== 1) pos.z = o.z;
        if (isInt(o.r, -30, 30) && o.r !== 0) pos.r = o.r;
    } else if (isInt(o.slot, 0, 29)) {
        pos = { slot: o.slot };
    } else return null;
    return { ...pos, type: o.type, src: SRC.has(o.src) ? o.src : 'self', ...(o.src === 'gift' && typeof o.from === 'string' ? { from: o.from.slice(0, 10) } : {}) };
}

// 공개 보기: 주인 state에서 그림에 필요한 것만 골라낸다. 메시지·선물ID·바구니는 빼고, 선물 보낸 사람 닉네임만 남긴다.
function publicView(row, extra = {}) {
    let st = {};
    try { st = JSON.parse(row.state); } catch { st = {}; }
    const waters = (Array.isArray(st.waters) ? st.waters : []).filter((k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k)).slice(0, 40);
    const hung = (Array.isArray(st.hung) ? st.hung : []).slice(0, 40)
        .map(publicOrn)
        .filter(Boolean);
    return {
        id: row.id,
        owner: row.owner,
        mode: row.mode,
        year: row.year,
        waters,
        hung,
        opened: Boolean(st.opened),
        face: Number.isInteger(st.face) && st.face >= 0 && st.face < 360 ? st.face : 0,
        theme: THEMES.has(st.theme) ? st.theme : 'green',
        lights: Boolean(st.forest && st.forest.goalDone),
        partnerId: row.partner_id || null,
        forestId: row.forest_id || null,
        updatedAt: row.updated_at,
        ...extra
    };
}

async function createTree(req, env) {
    const now = nowOf(req, env);
    const b = await body(req);
    const owner = str(b.owner, 10, '이름');
    const mode = MODES.has(b.mode) ? b.mode : 'solo';
    const year = yearOf(b.year, now);
    const state = stateText(b.state);
    const id = b.id == null ? rid(16) : idOf(b.id, '트리 아이디');
    await limit(env, req, 'tree', now);
    const tk = token();
    const res = await env.DB.prepare('INSERT INTO trees (id, token_hash, owner, mode, year, state, rev, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7) ON CONFLICT(id) DO NOTHING')
        .bind(id, await sha256(tk), owner, mode, year, state, now).run();
    if (!res.meta.changes) throw new HttpError(409, '이미 있는 트리 아이디예요.');
    return json({ id, token: tk, rev: 1 }, 201);
}

async function getTree(req, env, id) {
    const row = await loadTree(env, id);
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE tree_id = ?1 AND day = ?2').bind(id, kstDay(nowOf(req, env))).first();
    const extra = { visitsToday: n };
    if (row.partner_id) {
        const p = await env.DB.prepare('SELECT owner FROM trees WHERE id = ?1').bind(row.partner_id).first();
        if (p) extra.partnerName = p.owner;
    }
    if (row.forest_id) {
        const f = await env.DB.prepare('SELECT name FROM forests WHERE id = ?1').bind(row.forest_id).first();
        if (f) extra.forestName = f.name;
    }
    return json(publicView(row, extra));
}

async function getPrivate(req, env, id) {
    const now = nowOf(req, env);
    const row = await authTree(env, req, id);
    const open = now >= unlockAt(row.year);
    const gifts = (await env.DB.prepare('SELECT id, type, sender, message, created_at FROM gifts WHERE tree_id = ?1 ORDER BY created_at').bind(id).all()).results
        .map((g) => ({ id: g.id, type: g.type, sender: g.sender, hasMessage: Boolean(g.message), createdAt: g.created_at, ...(open && g.message ? { message: g.message } : {}) }));
    const visits = (await env.DB.prepare('SELECT day, nick FROM visits WHERE tree_id = ?1 ORDER BY created_at LIMIT ?2').bind(id, MAX_VISITS).all()).results
        .map((v) => [v.day, v.nick]);
    const out = { tree: { id: row.id, owner: row.owner, mode: row.mode, year: row.year, rev: row.rev, state: JSON.parse(row.state), partnerId: row.partner_id, forestId: row.forest_id }, gifts, visits, unlockAt: unlockAt(row.year), now };
    if (row.partner_id) {
        const p = await env.DB.prepare('SELECT * FROM trees WHERE id = ?1').bind(row.partner_id).first();
        if (p) out.partner = publicView(p);
    }
    return json(out);
}

async function putTree(req, env, id) {
    const now = nowOf(req, env);
    const row = await authTree(env, req, id);
    const b = await body(req);
    const state = stateText(b.state);
    const owner = b.owner == null ? row.owner : str(b.owner, 10, '이름');
    let mode = row.mode;
    if (b.mode != null && b.mode !== row.mode) {
        if (!MODES.has(b.mode)) throw new HttpError(400, '모드가 맞지 않아요.');
        if (row.partner_id || row.forest_id) throw new HttpError(409, '짝꿍이나 숲에 연결된 트리는 모드를 바꿀 수 없어요.');
        mode = b.mode;
    }
    const res = await env.DB.prepare('UPDATE trees SET state = ?1, owner = ?2, mode = ?3, rev = rev + 1, updated_at = ?4 WHERE id = ?5 AND rev = ?6')
        .bind(state, owner, mode, now, id, Number(b.rev)).run();
    if (!res.meta.changes) {
        const cur = await loadTree(env, id);
        throw new HttpError(409, '다른 기기에서 먼저 바뀌었어요.', { tree: { rev: cur.rev, state: JSON.parse(cur.state), mode: cur.mode, owner: cur.owner } });
    }
    return json({ rev: Number(b.rev) + 1 });
}

// ── 선물: 친구가 링크에서 바로 단다 ──
async function addGift(req, env, id) {
    const now = nowOf(req, env);
    const row = await loadTree(env, id);
    const b = await body(req);
    if (!isGiftType(b.type)) throw new HttpError(400, '보낼 수 없는 장식이에요.');
    const sender = str(b.sender, 10, '보내는 사람');
    const message = str(b.message, 80, '메시지', { required: false });
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM gifts WHERE tree_id = ?1').bind(id).first();
    if (n >= MAX_GIFTS) throw new HttpError(409, '이 트리는 장식을 더 받을 수 없어요.');
    await limit(env, req, 'gift', now);
    const gid = rid(12);
    await env.DB.prepare('INSERT INTO gifts (id, tree_id, type, sender, message, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(gid, row.id, b.type, sender, message, now).run();
    return json({ id: gid }, 201);
}

// ── 다녀간 발자국: 하루 한 번, 닉네임은 비워도 된다 ──
async function addVisit(req, env, id) {
    const now = nowOf(req, env);
    const row = await loadTree(env, id);
    const b = await body(req);
    const nick = str(b.nick, 10, '이름', { required: false });
    const vid = typeof b.vid === 'string' && /^[0-9a-z]{8,24}$/.test(b.vid) ? b.vid : '';
    const ip = (devOn(env) && req.headers.get('X-Dev-Ip')) || req.headers.get('CF-Connecting-IP') || 'local';
    const vkey = (await sha256(`${row.id}|${vid || `ip:${ip}`}`)).slice(0, 24);
    const day = kstDay(now);
    await limit(env, req, 'visit', now);
    const res = await env.DB.prepare('INSERT OR IGNORE INTO visits (tree_id, day, vkey, nick, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(row.id, day, vkey, nick, now).run();
    // 오늘 이미 남겼으면 닉네임만 고친다
    if (!res.meta.changes) await env.DB.prepare('UPDATE visits SET nick = ?1 WHERE tree_id = ?2 AND day = ?3 AND vkey = ?4').bind(nick, row.id, day, vkey).run();
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE tree_id = ?1 AND day = ?2').bind(row.id, day).first();
    return json({ visitsToday: n, day }, res.meta.changes ? 201 : 200);
}

// ── 짝꿍 ──
async function pairCode(req, env, id) {
    const now = nowOf(req, env);
    const row = await authTree(env, req, id);
    if (row.mode !== 'couple') throw new HttpError(409, '커플 트리에서만 짝꿍을 초대할 수 있어요.');
    if (row.partner_id) throw new HttpError(409, '이미 짝꿍이 있어요.');
    await limit(env, req, 'pair', now);
    const code = rid(12);
    const exp = now + PAIR_TTL;
    await env.DB.prepare('UPDATE trees SET pair_code_hash = ?1, pair_code_exp = ?2 WHERE id = ?3').bind(await sha256(code), exp, id).run();
    return json({ code, exp });
}

async function pair(req, env, id) {
    const now = nowOf(req, env);
    const me = await authTree(env, req, id);
    const b = await body(req);
    const partnerId = idOf(b.partnerId, '짝꿍 아이디');
    if (partnerId === id) throw new HttpError(400, '내 트리와는 짝을 맺을 수 없어요.');
    const p = await loadTree(env, partnerId);
    if (me.partner_id === partnerId && p.partner_id === id) return json({ partner: publicView(p) });   // 이미 짝 (다시 눌러도 괜찮게)
    if (me.partner_id || p.partner_id) throw new HttpError(409, '둘 중 한 명은 이미 다른 짝꿍이 있어요.');
    if (me.forest_id || p.forest_id) throw new HttpError(409, '숲에 있는 트리는 짝을 맺을 수 없어요.');
    if (p.mode !== 'couple') throw new HttpError(409, '상대 트리가 커플 트리가 아니에요.');
    if (b.legacy) {
        // 링크 방식에서 이미 서로 짝이었던 트리를 옮길 때: 둘 다 상대를 짝으로 적어 두었어야 한다
        const sp = JSON.parse(p.state);
        const sm = JSON.parse(me.state);
        if (sp?.couple?.id !== id || sm?.couple?.id !== partnerId) throw new HttpError(403, '서로 짝꿍으로 등록된 트리가 아니에요.');
    } else {
        const code = typeof b.code === 'string' ? b.code : '';
        if (!p.pair_code_hash || !code || (await sha256(code)) !== p.pair_code_hash || (p.pair_code_exp || 0) < now) {
            throw new HttpError(403, '초대 코드가 맞지 않거나 기간이 지났어요. 새 초대 링크를 받아 주세요.');
        }
    }
    await env.DB.batch([
        env.DB.prepare("UPDATE trees SET partner_id = ?1, mode = 'couple', updated_at = ?3 WHERE id = ?2 AND partner_id IS NULL").bind(partnerId, id, now),
        env.DB.prepare('UPDATE trees SET partner_id = ?1, pair_code_hash = NULL, pair_code_exp = NULL, updated_at = ?3 WHERE id = ?2 AND partner_id IS NULL').bind(id, partnerId, now)
    ]);
    const fresh = await loadTree(env, partnerId);
    if (fresh.partner_id !== id) {
        // 그사이 상대가 다른 짝과 맺어졌으면 내 쪽 연결만 되돌린다
        await env.DB.prepare('UPDATE trees SET partner_id = NULL WHERE id = ?1 AND partner_id = ?2').bind(id, partnerId).run();
        throw new HttpError(409, '짝을 맺지 못했어요. 다시 시도해 주세요.');
    }
    return json({ partner: publicView(fresh) });
}

// ── 숲 ──
async function createForest(req, env) {
    const now = nowOf(req, env);
    const b = await body(req);
    const treeId = idOf(b.treeId, '트리 아이디');
    const tree = await authTree(env, req, treeId);
    if (tree.partner_id) throw new HttpError(409, '커플 트리는 숲을 만들 수 없어요.');
    if (tree.forest_id) throw new HttpError(409, '이미 숲에 있어요.');
    const name = str(b.name, 16, '숲 이름');
    const year = yearOf(b.year, now);
    const id = b.id == null ? rid(16) : idOf(b.id, '숲 아이디');
    await limit(env, req, 'forest', now);
    const res = await env.DB.prepare('INSERT INTO forests (id, name, year, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO NOTHING').bind(id, name, year, now).run();
    if (!res.meta.changes) throw new HttpError(409, '이미 있는 숲이에요. 합류해 주세요.');
    await env.DB.prepare("UPDATE trees SET forest_id = ?1, mode = 'forest', updated_at = ?2 WHERE id = ?3").bind(id, now, treeId).run();
    return json({ id, name, year }, 201);
}

async function joinForest(req, env, forestId) {
    const now = nowOf(req, env);
    const b = await body(req);
    const treeId = idOf(b.treeId, '트리 아이디');
    const tree = await authTree(env, req, treeId);
    const forest = await env.DB.prepare('SELECT * FROM forests WHERE id = ?1').bind(forestId).first();
    if (!forest) throw new HttpError(404, '숲을 찾을 수 없어요.');
    if (tree.forest_id === forestId) return json({ id: forest.id, name: forest.name, year: forest.year });
    if (tree.partner_id) throw new HttpError(409, '커플 트리는 숲에 들어갈 수 없어요.');
    if (tree.forest_id) throw new HttpError(409, '이미 다른 숲에 있어요. 먼저 나와 주세요.');
    // 12그루 제한을 넘지 않을 때만 들어간다 (동시에 들어와도 넘지 않도록 한 문장으로)
    const res = await env.DB.prepare("UPDATE trees SET forest_id = ?1, mode = 'forest', updated_at = ?2 WHERE id = ?3 AND forest_id IS NULL AND (SELECT COUNT(*) FROM trees WHERE forest_id = ?1) < ?4")
        .bind(forestId, now, treeId, MAX_FOREST).run();
    if (!res.meta.changes) throw new HttpError(409, `숲은 ${MAX_FOREST}그루까지예요.`);
    return json({ id: forest.id, name: forest.name, year: forest.year });
}

async function getForest(env, forestId) {
    const forest = await env.DB.prepare('SELECT * FROM forests WHERE id = ?1').bind(forestId).first();
    if (!forest) throw new HttpError(404, '숲을 찾을 수 없어요.');
    const rows = (await env.DB.prepare('SELECT * FROM trees WHERE forest_id = ?1 ORDER BY created_at LIMIT ?2').bind(forestId, MAX_FOREST).all()).results;
    return json({ forest: { id: forest.id, name: forest.name, year: forest.year }, members: rows.map((r) => publicView(r)) });
}

async function leaveForest(req, env, forestId, treeId) {
    const tree = await authTree(env, req, treeId);
    if (tree.forest_id !== forestId) throw new HttpError(409, '이 숲에 있지 않아요.');
    await env.DB.prepare("UPDATE trees SET forest_id = NULL, mode = 'solo', updated_at = ?1 WHERE id = ?2").bind(nowOf(req, env), treeId).run();
    return json(null, 204);
}

// ── 매일 정리: 2월이 되면 지난 시즌 데이터를 지운다 ──
export async function cleanup(env, now) {
    const { y, m } = kstParts(now);
    const lastYear = m >= 2 ? y - 1 : y - 2;   // 이 연도까지 지운다
    const day = kstDay(now - 2 * DAY);
    await env.DB.batch([
        env.DB.prepare('DELETE FROM gifts WHERE tree_id IN (SELECT id FROM trees WHERE year <= ?1)').bind(lastYear),
        env.DB.prepare('DELETE FROM visits WHERE tree_id IN (SELECT id FROM trees WHERE year <= ?1)').bind(lastYear),
        env.DB.prepare('DELETE FROM trees WHERE year <= ?1').bind(lastYear),
        env.DB.prepare('DELETE FROM forests WHERE year <= ?1').bind(lastYear),
        env.DB.prepare('DELETE FROM limits WHERE day < ?1').bind(day)
    ]);
    return { lastYear };
}

// ── 라우터 ──
async function route(req, env) {
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const M = req.method;
    if (M === 'GET' && p[0] === 'health') return json({ ok: true });
    if (p[0] === 'trees') {
        if (p.length === 1 && M === 'POST') return createTree(req, env);
        const id = idOf(p[1], '트리 아이디');
        if (p.length === 2 && M === 'GET') return getTree(req, env, id);
        if (p.length === 2 && M === 'PUT') return putTree(req, env, id);
        if (p.length === 3 && p[2] === 'private' && M === 'GET') return getPrivate(req, env, id);
        if (p.length === 3 && p[2] === 'gifts' && M === 'POST') return addGift(req, env, id);
        if (p.length === 3 && p[2] === 'visits' && M === 'POST') return addVisit(req, env, id);
        if (p.length === 3 && p[2] === 'pair-code' && M === 'POST') return pairCode(req, env, id);
        if (p.length === 3 && p[2] === 'pair' && M === 'POST') return pair(req, env, id);
    }
    if (p[0] === 'forests') {
        if (p.length === 1 && M === 'POST') return createForest(req, env);
        const id = idOf(p[1], '숲 아이디');
        if (p.length === 2 && M === 'GET') return getForest(env, id);
        if (p.length === 3 && p[2] === 'members' && M === 'POST') return joinForest(req, env, id);
        if (p.length === 4 && p[2] === 'members' && M === 'DELETE') return leaveForest(req, env, id, idOf(p[3], '트리 아이디'));
    }
    if (devOn(env) && M === 'POST' && p[0] === '__cleanup') return json(await cleanup(env, nowOf(req, env)));
    throw new HttpError(404, '없는 주소예요.');
}

// ── CORS: 허용한 사이트에서만 브라우저 호출을 받는다 ──
function allowedOrigin(origin, env) {
    if (!origin) return null;
    const list = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const ok = list.some((pat) => {
        if (!pat.includes('*')) return pat === origin;
        const re = new RegExp(`^${pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*|\*/g, '\\d+')}$`);
        return re.test(origin);
    });
    return ok ? origin : null;
}

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Dev-Now',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
    };
}

export default {
    async fetch(req, env) {
        const origin = req.headers.get('Origin');
        const allowed = allowedOrigin(origin, env);
        const cors = allowed ? corsHeaders(allowed) : {};
        if (req.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors });
        if (origin && !allowed) return json({ detail: '허용되지 않은 사이트에서 온 요청이에요.' }, 403);
        let res;
        try {
            res = await route(req, env);
        } catch (e) {
            if (e instanceof HttpError) res = json({ detail: e.detail, ...e.extra }, e.status);
            else {
                console.error(e);
                res = json({ detail: '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.' }, 500);
            }
        }
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        return res;
    },
    async scheduled(_event, env, ctx) {
        ctx.waitUntil(cleanup(env, Date.now()));
    }
};
