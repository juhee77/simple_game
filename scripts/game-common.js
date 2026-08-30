// Common logic for all games

// 참가자가 입력한 이름·답변·문장을 innerHTML 템플릿에 넣기 전에 이스케이프한다.
// 이스케이프하지 않으면 이름에 '<' 하나만 들어가도 결과 목록이 통째로 깨진다.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

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
 border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(15,23,42,.85);
 color:#fff;font-size:1.25rem;font-weight:800;cursor:pointer;line-height:1;
 box-shadow:0 4px 14px rgba(0,0,0,.4);backdrop-filter:blur(4px)}
.rules-fab:hover{background:rgba(99,102,241,.9)}
.rules-fab:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}
.rules-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;
 justify-content:center;padding:20px;background:rgba(2,6,23,.78);overflow-y:auto}
.rules-overlay[hidden]{display:none}
.rules-box{max-width:440px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;
 border-radius:20px;background:#0f172a;color:#e2e8f0;border:1px solid rgba(255,255,255,.16);
 font-family:inherit;text-align:left;box-shadow:0 20px 50px rgba(0,0,0,.55)}
.rules-heading{margin:0 0 6px;font-size:1.35rem;font-weight:800;color:#fff}
.rules-meta{margin:0 0 14px;font-size:.85rem;color:#94a3b8}
.rules-goal{margin:0 0 16px;padding:10px 14px;border-radius:12px;font-size:.95rem;
 background:rgba(99,102,241,.16);border:1px solid rgba(129,140,248,.35);color:#c7d2fe}
.rules-steps{margin:0;padding-left:1.3em;display:flex;flex-direction:column;gap:9px;
 font-size:.95rem;line-height:1.6}
.rules-steps li::marker{color:#818cf8;font-weight:700}
.rules-tips{margin:16px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;
 gap:7px;font-size:.88rem;color:#94a3b8;line-height:1.55}
.rules-close{margin-top:20px;width:100%;padding:12px;border:none;border-radius:12px;
 background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:1rem;
 font-weight:700;font-family:inherit;cursor:pointer}
.rules-close:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}
.game-alert-box{max-width:360px;text-align:center}
.game-alert-text{margin:4px 0 8px;font-size:1.05rem;line-height:1.65;color:#f1f5f9;white-space:pre-line}
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

document.addEventListener('DOMContentLoaded', () => {
    initRulesPanel();
    // 1. Dynamic Back Button Logic
    const backBtn = document.querySelector('.back-button, .back-btn, .back');
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

    // 2. Additional common game utilities can be added here
    // (e.g., global volume control, high score saving, etc.)
});
