// Common logic for all games

// ── 저작권 검토로 잠시 닫아 둔 게임 ─────────────────────────
// 다른 게임의 고유 콘텐츠(설명서 문구·카드 구성)를 옮겼거나, 시판 보드게임의 규칙을 그대로 옮긴 게임이다.
// (이름만 겹치던 게임은 이름을 바꿔 다시 열었다: 네온 추리극장·늑대가 사는 마을·두 글자 추리)
// 목록에 있으면 게임 페이지로 직접 들어와도 메인으로 돌려보내고,
// 메인 목록과 오늘의 도전에서도 빠진다. 문제를 고친 뒤 여기서 지우면 바로 다시 열린다.
const BLOCKED_GAMES = {
    // 다른 게임의 문구·카드 구성을 그대로 옮김
    'bomb-defusal': { title: '폭탄 해체반', reason: 'Keep Talking and Nobody Explodes 설명서 규칙 문구를 옮겨 씀' },
    'royal-secret-letter': { title: '왕궁의 밀서', reason: 'Love Letter의 카드 이름·숫자·장수·효과 구성을 그대로 씀' },
    // 시판 보드게임의 고유 규칙·구성을 거의 그대로 옮긴 게임 (기획서에 모티브로 명시되었거나 구성이 같음)
    'tower-of-gods': { title: '신들의 탑', reason: '보드게임 Santorini 규칙 그대로' },
    'pocket-quilt': { title: '포켓 퀼트', reason: '보드게임 Patchwork 규칙 그대로 (단추·시간 트랙·조각 배치)' },
    'starlight-tuners': { title: '별빛 조율사', reason: '보드게임 Patchwork 규칙 그대로 (시간 트랙·9×9 보드·폴리오미노)' },
    'shadow-syndicate': { title: '그림자 상단', reason: '보드게임 7 Wonders Duel 구성 (3시대·카드 피라미드 드래프트·갈색 자원 카드)' },
    'agent-codebreaker': { title: '첩보원: 암호 해독', reason: '보드게임 Codenames Duet 규칙 그대로' },
    'arena-of-legends': { title: '아레나 오브 레전드', reason: '카드게임 Dominion / Star Realms 구성' },
    'relics-of-greed': { title: '탐욕의 유적', reason: '보드게임 Skull 규칙 그대로' }
};

function isGameBlocked(slug) {
    return Object.prototype.hasOwnProperty.call(BLOCKED_GAMES, slug);
}

// 게임 페이지는 이 스크립트를 <head>에서 불러오므로, 본문이 그려지기 전에 메인으로 보낸다
(function redirectIfBlocked() {
    const m = location.pathname.match(/\/games\/([a-z0-9-]+)\.html$/);
    if (m && isGameBlocked(m[1])) location.replace(`../index.html?closed=${m[1]}`);
})();

// 참가자가 입력한 이름·답변·문장을 innerHTML 템플릿에 넣기 전에 이스케이프한다.
// 이스케이프하지 않으면 이름에 '<' 하나만 들어가도 결과 목록이 통째로 깨진다.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

// ── 사진 업로드 ────────────────────────────────────────────
// 폰 원본 사진(12MP 이상)을 data URL로 통째로 들고 있으면 장당 수십 MB를 먹는다.
// 여러 장을 한꺼번에 고르면 모바일 브라우저가 메모리 부족으로 탭을 다시 띄워
// "사진을 넣었더니 새로고침되며 초기화"되는 일이 생겼다.
// 그래서 읽는 즉시 긴 변 기준으로 줄인 JPEG data URL로 바꾸고 원본 디코딩 결과는 바로 버린다.
// 호출하는 쪽은 여러 장을 forEach로 동시에 돌리지 말고 for...of + await로 한 장씩 처리해야
// 메모리 정점이 한 장 분량으로 유지된다. width/height는 축소 전 원본 크기다.
// thumbEdge를 주면 목록·지도 마커용 작은 썸네일(thumbUrl)도 함께 만든다.
// 작게 보이는 자리에도 큰 사진을 쓰면 브라우저가 장당 수 MB짜리 비트맵을 펼쳐 둔다.
async function loadPhotoFile(file, maxEdge = 2400, quality = 0.9, thumbEdge = 0) {
    let source = null;
    let url = null;
    try {
        if (typeof createImageBitmap === 'function') {
            try {
                source = await createImageBitmap(file, { imageOrientation: 'from-image' });
            } catch {
                source = null;   // 옵션을 모르는 브라우저나 HEIC 등은 <img> 경로로 다시 시도한다
            }
        }
        if (!source) {
            url = URL.createObjectURL(file);
            source = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`이미지를 읽을 수 없습니다: ${file.name}`));
                img.src = url;
            });
        }

        const width = source.naturalWidth || source.width;
        const height = source.naturalHeight || source.height;
        const k = Math.min(1, maxEdge / Math.max(width, height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(width * k));
        c.height = Math.max(1, Math.round(height * k));
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';   // 투명 PNG가 JPEG로 바뀌며 검게 변하지 않도록
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(source, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL('image/jpeg', quality);
        const thumbUrl = thumbEdge > 0 ? makeThumbnail(c, thumbEdge) : null;
        const accent = dominantColor(c);
        c.width = c.height = 0;   // iOS는 캔버스 메모리를 늦게 돌려주므로 직접 비운다
        return { dataUrl, thumbUrl, accent, width, height };
    } finally {
        if (source && typeof source.close === 'function') source.close();
        if (url) URL.revokeObjectURL(url);
    }
}

// 이미 그려진 이미지·캔버스에서 긴 변 edge px짜리 JPEG 썸네일을 만든다
function makeThumbnail(source, edge = 320, quality = 0.82) {
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;
    const k = Math.min(1, edge / Math.max(w, h));
    const t = document.createElement('canvas');
    t.width = Math.max(1, Math.round(w * k));
    t.height = Math.max(1, Math.round(h * k));
    const ctx = t.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, t.width, t.height);
    const url = t.toDataURL('image/jpeg', quality);
    t.width = t.height = 0;
    return url;
}

// 사진의 대표 색을 뽑아 테두리·강조색으로 쓸 수 있게 한다 (#rrggbb).
// 흰 벽·검은 그림자·회색 하늘이 면적상 가장 넓은 경우가 많아, 채도 있는 색을 색상환 구간별로
// 모아 가장 비중이 큰 구간을 고른다. 테두리로 잘 보이도록 밝기와 채도는 일정 범위로 맞춘다.
// 쓸 만한 색이 없으면(흑백 사진 등) fallback을 돌려준다.
function dominantColor(source, fallback = null) {
    const S = 32;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    try {
        ctx.drawImage(source, 0, 0, S, S);
    } catch {
        return fallback;
    }
    const data = ctx.getImageData(0, 0, S, S).data;
    const bins = Array.from({ length: 18 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const d = max - min;
        if (d < 0.08 || l < 0.1 || l > 0.93) continue;   // 무채색·너무 어둡거나 밝은 픽셀 제외
        const sat = d / (1 - Math.abs(2 * l - 1));
        let h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
        const bin = bins[Math.floor(h / 20)];
        const w = sat * (1 - Math.abs(2 * l - 1) * 0.5);   // 선명하고 중간 밝기일수록 가중
        bin.w += w; bin.r += data[i] * w; bin.g += data[i + 1] * w; bin.b += data[i + 2] * w;
    }
    const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
    if (best.w < 1.5) return fallback;   // 32×32 중 채도 있는 픽셀이 거의 없음

    // 평균색을 HSL로 바꿔 테두리용으로 밝기·채도를 맞춘다
    const r = best.r / best.w / 255, g = best.g / best.w / 255, b = best.b / best.w / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
    }
    const sat = Math.max(0.55, Math.min(0.9, d / (1 - Math.abs(max + min - 1) || 1)));
    const light = 0.6;
    const a = sat * Math.min(light, 1 - light);
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const v = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(v * 255).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// 만든 이미지·GIF를 사진첩(갤러리)에 넣는다.
// 휴대폰에서 <a download>로 받으면 '파일/다운로드' 폴더로만 가고 사진 앱에는 안 보인다.
// 공유 시트(Web Share)로 넘기면 아이폰은 '이미지 저장', 안드로이드는 갤러리·메신저로 바로 보낼 수 있다.
// 공유 시트를 못 쓰는 환경(대부분의 PC 브라우저)에서는 일반 다운로드로 대신한다.
// 사파리는 클릭 직후에만 공유를 허락하므로, blob은 미리 만들어 두고 클릭 핸들러에서 바로 부른다.
async function saveToGallery(blob, filename) {
    const file = new File([blob], filename, { type: blob.type || 'image/gif' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file] });
            return 'shared';
        } catch (err) {
            if (err && err.name === 'AbortError') return 'cancelled';   // 사용자가 공유 창을 닫음
        }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'downloaded';
}

// ── 영상(MP4) 저장 ───────────────────────────────────────
// 캔버스 장면을 WebCodecs(H.264)로 인코딩하고 mp4-muxer로 MP4 파일에 담는다.
// 아이폰 사진 앱은 WebM을 못 읽으므로 MP4로 만든다. 인코더 라이브러리는 영상을 만들 때만 불러온다.
// 사용: const w = await createMp4Writer(가로, 세로); await w.addFrame(canvas, 반복수); const blob = await w.finish();
function canRecordMp4() {
    return typeof VideoEncoder === 'function' && typeof VideoFrame === 'function';
}

let mp4MuxerModule = null;
function loadMp4Muxer() {
    if (!mp4MuxerModule) {
        mp4MuxerModule = import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/build/mp4-muxer.mjs')
            .catch((err) => { mp4MuxerModule = null; throw err; });
    }
    return mp4MuxerModule;
}

// 프레임 사이에 잠깐 쉬어 화면이 멈추지 않게 한다.
// setTimeout은 탭이 뒤로 가면 1초 이상으로 늦춰져 생성이 수십 배 느려지므로 MessageChannel을 쓴다.
function yieldToBrowser() {
    return new Promise((resolve) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = () => resolve();
        ch.port2.postMessage(0);
    });
}

async function createMp4Writer(width, height, { fps = 30, bitrate } = {}) {
    const config = {
        codec: 'avc1.4d0028',   // H.264 Main, 1080p까지
        width,
        height,
        bitrate: bitrate || Math.round(Math.min(8e6, Math.max(1.5e6, width * height * fps * 0.12))),
        framerate: fps
    };
    if (!canRecordMp4() || !(await VideoEncoder.isConfigSupported(config)).supported) {
        throw new Error('이 브라우저는 영상 저장을 지원하지 않아요. 최신 크롬이나 사파리에서 열어 주세요.');
    }
    let mux;
    try {
        mux = await loadMp4Muxer();
    } catch {
        throw new Error('영상 인코더를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
    }
    const muxer = new mux.Muxer({
        target: new mux.ArrayBufferTarget(),
        video: { codec: 'avc', width, height, frameRate: fps },
        fastStart: 'in-memory'
    });
    let error = null;
    const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => { error = e; }
    });
    encoder.configure(config);

    const frameUs = 1e6 / fps;
    let count = 0;
    return {
        // 같은 그림을 repeat 프레임 동안 보여 준다 (멈춘 장면은 용량이 거의 늘지 않는다)
        async addFrame(source, repeat = 1) {
            for (let r = 0; r < repeat; r++) {
                const vf = new VideoFrame(source, { timestamp: Math.round(count * frameUs), duration: Math.round(frameUs) });
                // 키프레임은 용량을 많이 먹어 4초에 한 번만 넣는다
                encoder.encode(vf, { keyFrame: count % (fps * 4) === 0 });
                vf.close();
                count++;
                // 인코더가 밀리면 잠깐 기다려 메모리에 프레임이 쌓이지 않게 한다
                while (encoder.encodeQueueSize > 8) await yieldToBrowser();
            }
            if (error) throw error;
        },
        async finish() {
            await encoder.flush();
            if (error) throw error;
            encoder.close();
            muxer.finalize();
            return new Blob([muxer.target.buffer], { type: 'video/mp4' });
        },
        cancel() {
            try { encoder.close(); } catch { /* 이미 닫힘 */ }
        }
    };
}

// 드롭 영역을 살짝 벗어난 곳에 사진을 놓으면 브라우저가 페이지를 그 이미지로 바꿔 버려
// 작업 중이던 내용이 통째로 날아간다. 파일 드래그일 때만 기본 동작을 막는다.
['dragover', 'drop'].forEach((type) => {
    window.addEventListener(type, (e) => {
        const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
        if (types.includes('Files')) e.preventDefault();
    });
});

// 최고 기록 저장. 클래식 퍼즐 중 일부만 기록이 남아 있어 카테고리 안에서도
// 어떤 게임은 기록이 쌓이고 어떤 게임은 사라지는 불일치가 있었다.
function loadBestRecord(key) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;   // 프라이빗 모드 등에서 접근이 막혀도 게임은 계속되어야 한다
    }
}

// 기록을 갱신했으면 true. lowerIsBetter=false면 점수처럼 높을수록 좋은 기록.
function saveBestRecord(key, value, lowerIsBetter = true) {
    if (!Number.isFinite(value)) return false;
    const prev = loadBestRecord(key);
    const better = prev === null || (lowerIsBetter ? value < prev : value > prev);
    if (better) {
        try { localStorage.setItem(key, String(value)); } catch { /* 저장 실패는 무시 */ }
    }
    return better;
}

// ── 오늘의 도전 ────────────────────────────────────────────
// 허브(daily-challenge)가 "이 게임을 오늘 실제로 끝냈는지" 알아야 하는데,
// 게임마다 페이지가 따로라 상태를 공유할 방법이 없다. 그래서 각 게임이
// 완료 시점에 여기로 날짜를 남기고, 허브는 그 날짜만 읽는다.
// 자기 신고 버튼 대신 실제 완료를 신호로 쓰기 위한 장치다.
function todayKey(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function markGameCompleted(slug) {
    try { localStorage.setItem(`daily-play:${slug}`, todayKey()); } catch { /* 저장 실패는 무시 */ }
}

function gameCompletedToday(slug) {
    try { return localStorage.getItem(`daily-play:${slug}`) === todayKey(); } catch { return false; }
}

// ── 규칙 안내 ──────────────────────────────────────────────
// 게임 대부분에 규칙 화면이 없어, 오프라인에서 폰을 넘기며 할 때 진행이 자주 막혔다.
// 각 게임은 <script type="application/json" id="game-rules">에 규칙만 선언하고,
// 버튼과 모달은 여기서 한 번만 만든다.
// 게임마다 스타일시트가 제각각이라(공용 CSS를 안 쓰는 페이지가 많다)
// 규칙 패널 스타일은 스크립트에서 한 번만 주입한다.

// ── 알림 ───────────────────────────────────────────────────
// 게임 결과와 입력 검증에 브라우저 기본 alert()를 쓰고 있었다. alert은 화면을
// 가리고 모바일에서 흐름을 끊으므로, 게임 톤에 맞는 모달로 대체한다.
// 닫으면 resolve되는 Promise를 돌려주므로 "알림 후 이동"도 그대로 표현할 수 있다.
function gameAlert(message) {
    injectRulesStyles();   // 모달 스타일을 공유한다
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'rules-overlay';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');

        const box = document.createElement('div');
        box.className = 'rules-box game-alert-box';

        const text = document.createElement('p');
        text.className = 'game-alert-text';
        text.textContent = String(message ?? '');
        box.appendChild(text);

        const ok = document.createElement('button');
        ok.type = 'button';
        ok.className = 'rules-close';
        ok.textContent = '확인';
        box.appendChild(ok);
        overlay.appendChild(box);

        let settled = false;
        const close = () => {
            if (settled) return;
            settled = true;
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            resolve();
        };
        const onKey = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); }
        };
        ok.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', onKey);

        document.body.appendChild(overlay);
        ok.focus();
    });
}

function injectRulesStyles() {
    if (document.getElementById('rules-panel-styles')) return;
    const style = document.createElement('style');
    style.id = 'rules-panel-styles';
    style.textContent = `
.rules-fab{position:fixed;right:16px;bottom:16px;z-index:9998;width:44px;height:44px;
 border-radius:50%;border:1px solid var(--line,#e3e7ef);background:var(--surface,#fff);
 color:var(--text,#141a2a);font-size:1.25rem;font-weight:800;cursor:pointer;line-height:1;
 box-shadow:var(--shadow-md,0 6px 20px rgba(20,26,42,.1))}
.rules-fab:hover{background:var(--accent-soft,#eef0ff);color:var(--accent-ink,#3730a3)}
.rules-fab:focus-visible{outline:3px solid var(--focus,#a5b4fc);outline-offset:2px}
.rules-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;
 justify-content:center;padding:20px;background:var(--scrim,rgba(15,20,35,.55));overflow-y:auto}
.rules-overlay[hidden]{display:none}
.rules-box{max-width:440px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;
 border-radius:var(--r-lg,20px);background:var(--surface,#fff);color:var(--text,#141a2a);border:none;
 font-family:inherit;text-align:left;box-shadow:var(--shadow-lg,0 18px 44px rgba(20,26,42,.16))}
.rules-heading{margin:0 0 6px;font-size:1.35rem;font-weight:800;color:var(--text,#141a2a)}
.rules-meta{margin:0 0 14px;font-size:.85rem;color:var(--muted,#5f6b7a)}
.rules-goal{margin:0 0 16px;padding:10px 14px;border-radius:12px;font-size:.95rem;
 background:var(--accent-soft,#eef0ff);border:none;color:var(--accent-ink,#3730a3)}
.rules-steps{margin:0;padding-left:1.3em;display:flex;flex-direction:column;gap:9px;
 font-size:.95rem;line-height:1.6;color:var(--text,#141a2a)}
.rules-steps li::marker{color:var(--accent,#4f46e5);font-weight:700}
.rules-tips{margin:16px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;
 gap:7px;font-size:.88rem;color:var(--text-2,#4b5565);line-height:1.55}
.rules-close{margin-top:20px;width:100%;padding:12px;border:none;border-radius:var(--r-md,14px);
 background:var(--accent,#4f46e5);color:var(--on-accent,#fff);font-size:1rem;
 font-weight:700;font-family:inherit;cursor:pointer}
.rules-close:focus-visible{outline:3px solid var(--focus,#a5b4fc);outline-offset:2px}
.game-alert-box{max-width:360px;text-align:center}
.game-alert-text{margin:4px 0 8px;font-size:1.05rem;line-height:1.65;color:var(--text,#141a2a);white-space:pre-line}
@media (max-width:480px){.rules-box{padding:20px}.rules-fab{right:12px;bottom:12px}}
`;
    document.head.appendChild(style);
}

function initRulesPanel() {
    const data = document.getElementById('game-rules');
    if (!data) return;

    let rules;
    try {
        rules = JSON.parse(data.textContent);
    } catch {
        return;   // 규칙 데이터가 깨져도 게임 자체는 정상 동작해야 한다
    }
    if (!rules || !Array.isArray(rules.steps)) return;

    injectRulesStyles();

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'rules-fab';
    openBtn.setAttribute('aria-label', '게임 규칙 보기');
    openBtn.textContent = '?';

    const overlay = document.createElement('div');
    overlay.className = 'rules-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.hidden = true;

    const box = document.createElement('div');
    box.className = 'rules-box';

    const heading = document.createElement('h2');
    heading.className = 'rules-heading';
    heading.textContent = rules.title || '게임 규칙';
    box.appendChild(heading);

    if (rules.players || rules.time) {
        const meta = document.createElement('p');
        meta.className = 'rules-meta';
        meta.textContent = [rules.players, rules.time].filter(Boolean).join(' · ');
        box.appendChild(meta);
    }

    if (rules.goal) {
        const goal = document.createElement('p');
        goal.className = 'rules-goal';
        goal.textContent = `🎯 ${rules.goal}`;
        box.appendChild(goal);
    }

    const list = document.createElement('ol');
    list.className = 'rules-steps';
    rules.steps.forEach((step) => {
        const li = document.createElement('li');
        li.textContent = step;
        list.appendChild(li);
    });
    box.appendChild(list);

    if (Array.isArray(rules.tips) && rules.tips.length) {
        const tips = document.createElement('ul');
        tips.className = 'rules-tips';
        rules.tips.forEach((tip) => {
            const li = document.createElement('li');
            li.textContent = `💡 ${tip}`;
            tips.appendChild(li);
        });
        box.appendChild(tips);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'rules-close';
    closeBtn.textContent = '닫기';
    box.appendChild(closeBtn);
    overlay.appendChild(box);

    const setOpen = (open) => {
        overlay.hidden = !open;
        if (open) closeBtn.focus();
        else openBtn.focus();
    };
    openBtn.addEventListener('click', () => setOpen(true));
    closeBtn.addEventListener('click', () => setOpen(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) setOpen(false); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.hidden) setOpen(false);
    });

    document.body.appendChild(openBtn);
    document.body.appendChild(overlay);
}


// onclick만 달린 div/span은 마우스로는 눌리지만 키보드로는 갈 수도, 누를 수도 없다.
// 게임마다 button으로 바꾸면 기존 스타일이 깨지므로, 여기서 한 번에 보완한다.
// 이미 button/a이거나 tabindex를 직접 지정한 요소는 건드리지 않는다.
function makeClickablesFocusable(root = document) {
    const NATIVE = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'];

    root.querySelectorAll('[onclick]').forEach((el) => {
        if (NATIVE.includes(el.tagName)) return;
        if (el.hasAttribute('tabindex')) return;
        if (el.dataset.kbReady) return;

        el.dataset.kbReady = '1';
        el.tabIndex = 0;
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');

        el.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            // 스페이스로 화면이 스크롤되지 않게 막는다
            e.preventDefault();
            el.click();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initRulesPanel();
    makeClickablesFocusable();
    // 1. Dynamic Back Button Logic
    // 메인 페이지도 이 스크립트를 불러오므로(닫힌 게임 목록), 게임 페이지에서만 동작하게 한다.
    // 메인의 '카테고리로 돌아가기' 버튼도 .back-btn이라 여기 걸리면 엉뚱한 주소로 이동한다.
    const onGamePage = /\/games\/[^/]+\.html$/.test(location.pathname);
    const backBtn = onGamePage ? document.querySelector('.back-button, .back-btn, .back') : null;
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            const lastCategory = localStorage.getItem('lastCategory');
            if (lastCategory) {
                e.preventDefault();
                // Redirect to index.html with hash
                const target = backBtn.getAttribute('href') || '../index.html';
                const baseUrl = target.split('#')[0];
                window.location.href = baseUrl + '#' + lastCategory;
            }
        });
    }

    // 게임이 진행 중에 그려 넣는 요소들도 키보드로 쓸 수 있게 이어서 보완한다
    if (typeof MutationObserver === 'function') {
        let pending = false;
        new MutationObserver(() => {
            if (pending) return;
            pending = true;
            // rAF는 탭이 화면에 없으면 실행되지 않아 늦게 그려진 요소를 놓친다
            setTimeout(() => { pending = false; makeClickablesFocusable(); }, 0);
        }).observe(document.body, { childList: true, subtree: true });
    }
});
