// 메인 화면: 검색 · 분류 탭 · 인원/시간 필터 시트 · 즐겨찾기 · 최근 · 랜덤 추천
//
// 게임 목록의 원본은 index.html의 <a class="game-card"> 들이다(인원·시간·분류는 data-* 속성).
// 이 스크립트는 그 카드를 꾸미고(인원·시간 칩, 즐겨찾기 별) 보여 줄 카드만 고른다.
document.addEventListener('DOMContentLoaded', () => {
    const LAST_CATEGORY_KEY = 'lastCategory';   // 게임 페이지의 '← 메인'이 이 탭으로 돌아온다 (game-common.js)
    const FAV_KEY = 'favGames';
    const RECENT_KEY = 'recentGames';
    const RECENT_MAX = 16;
    const TABS = ['all', 'multi', 'pass', 'duo', 'classic', 'solo', 'sim', 'utility'];

    // 인원 필터: 게임이 지원하는 인원 구간과 겹치면 보여 준다
    const PLAYER_RANGES = { '1': [1, 1], '2': [2, 2], '3-5': [3, 5], '6+': [6, Infinity] };
    const PLAYER_LABEL = { all: '인원', '1': '혼자', '2': '2명', '3-5': '3~5명', '6+': '6명+' };
    const TIME_LABEL = { all: '시간', '5': '5분 이하', '15': '15분 이하', '15+': '길게' };
    // 아이콘 바탕색: 카드의 첫 번째 분류로 정한다
    const TINT = {
        utility: '#e7f3ff', multi: '#f1ecff', pass: '#fdeaf3', duo: '#e8f7ef',
        classic: '#fff3e2', solo: '#ece9ff', sim: '#e6f6f8', action: '#fdeaf3', party: '#f1ecff'
    };

    const $ = (sel) => document.querySelector(sel);
    const readList = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
    const writeList = (key, list) => { try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* 저장 실패는 무시 */ } };

    // ── 닫아 둔 게임은 목록에서 아예 뺀다 (BLOCKED_GAMES, game-common.js) ──
    const blocked = typeof isGameBlocked === 'function' ? isGameBlocked : () => false;
    const slugOf = (a) => ((a.getAttribute('href') || '').match(/games\/([a-z0-9-]+)\.html/) || [])[1];
    document.querySelectorAll('.game-card').forEach((card) => {
        const slug = slugOf(card);
        if (slug && blocked(slug)) card.remove();
    });

    const closedSlug = new URLSearchParams(location.search).get('closed');
    if (closedSlug && typeof BLOCKED_GAMES === 'object' && BLOCKED_GAMES[closedSlug]) {
        history.replaceState(null, '', location.pathname + location.hash);
        const msg = `'${BLOCKED_GAMES[closedSlug].title}'은(는) 저작권 검토 중이라 잠시 닫아 두었어요.`;
        setTimeout(() => (typeof gameAlert === 'function' ? gameAlert(msg) : alert(msg)), 300);
    }

    // ── 카드 꾸미기: 각 카드를 <div class="game-item">로 감싸고 칩·별을 붙인다 ──
    // 별 버튼은 링크(<a>) 안에 넣을 수 없어 카드 옆 형제로 둔다.
    const items = [...document.querySelectorAll('.game-card')].map((card) => {
        const slug = slugOf(card);
        const min = parseInt(card.dataset.minPlayers, 10) || 1;
        const max = parseInt(card.dataset.maxPlayers, 10) || 99;
        const time = parseInt(card.dataset.time, 10) || 0;
        const cats = (card.dataset.category || '').split(/\s+/).filter(Boolean);
        const title = card.querySelector('.game-title')?.textContent.trim() || '';
        const desc = card.querySelector('.game-description')?.textContent.trim() || '';
        const badgeEl = card.querySelector('.game-badge');
        const badge = badgeEl?.textContent.trim() || '';
        const icon = card.querySelector('.game-icon')?.textContent.trim() || '🎮';

        const wrap = document.createElement('div');
        wrap.className = 'game-item';
        card.replaceWith(wrap);
        wrap.appendChild(card);

        card.style.setProperty('--tint', TINT[cats[0]] || '#eef0ff');
        const meta = document.createElement('div');
        meta.className = 'game-meta';
        meta.innerHTML = `<span class="meta-chip">${playersText(min, max)}</span><span class="meta-chip">${time}분</span>`;
        card.appendChild(meta);
        if (badgeEl) {
            if (badge.toUpperCase() === 'NEW') badgeEl.classList.add('is-new');
            else badgeEl.hidden = true;   // 분류 글자는 검색에만 쓴다
        }

        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'fav-btn';
        star.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';
        wrap.appendChild(star);

        const haystack = `${title} ${desc} ${badge}`.toLowerCase();
        return { slug, wrap, card, star, min, max, time, cats, title, desc, icon, haystack };
    });

    function playersText(min, max) {
        if (min === max) return `${min}명`;
        return max >= 99 ? `${min}명 이상` : `${min}–${max}명`;
    }

    // ── 상태 ──
    const initialTab = location.hash.slice(1);
    const state = {
        view: 'home',                                    // home | favorites | recent
        tab: TABS.includes(initialTab) ? initialTab : 'all',
        query: '',
        players: 'all',
        time: 'all'
    };
    let favs = new Set(readList(FAV_KEY));
    let recent = readList(RECENT_KEY);

    const matchesPlayers = (it, key) => {
        if (key === 'all') return true;
        const [lo, hi] = PLAYER_RANGES[key];
        return it.min <= hi && it.max >= lo;
    };
    const matchesTime = (it, key) => {
        if (key === 'all') return true;
        if (key === '5') return it.time <= 5;
        if (key === '15') return it.time <= 15;
        return it.time > 15;
    };
    const filtered = (players, time) => items.filter((it) => matchesPlayers(it, players) && matchesTime(it, time));

    function remember(slug) {
        if (!slug) return;
        recent = [slug, ...recent.filter((s) => s !== slug)].slice(0, RECENT_MAX);
        writeList(RECENT_KEY, recent);
    }

    // ── 그리기 ──
    function render() {
        const q = state.query;
        let list;
        let title = '';
        if (q) {
            // 검색은 탭·보기와 상관없이 전체에서 찾는다
            list = items.filter((it) => it.haystack.includes(q));
            title = `‘${q}’ 검색 결과`;
        } else if (state.view === 'favorites') {
            list = items.filter((it) => favs.has(it.slug));
            title = '⭐ 즐겨찾기';
        } else if (state.view === 'recent') {
            const order = new Map(recent.map((s, i) => [s, i]));
            list = items.filter((it) => order.has(it.slug)).sort((a, b) => order.get(a.slug) - order.get(b.slug));
            title = '🕘 최근에 연 게임';
        } else {
            list = state.tab === 'all' ? items : items.filter((it) => it.cats.includes(state.tab));
        }
        list = list.filter((it) => matchesPlayers(it, state.players) && matchesTime(it, state.time));

        const shown = new Set(list);
        const orderOf = new Map(list.map((it, i) => [it, i]));
        items.forEach((it) => {
            it.wrap.hidden = !shown.has(it);
            it.wrap.style.order = state.view === 'recent' && !q ? String(orderOf.get(it) ?? 0) : '';
            const on = favs.has(it.slug);
            it.star.classList.toggle('on', on);
            it.star.setAttribute('aria-pressed', on ? 'true' : 'false');
            it.star.setAttribute('aria-label', `${it.title} 즐겨찾기`);
        });

        $('#list-count').textContent = `${list.length}개`;
        const titleEl = $('#list-title');
        titleEl.hidden = !title;
        titleEl.textContent = title;

        const empty = $('#no-results');
        empty.hidden = list.length > 0;
        if (!list.length) {
            if (!q && state.view === 'favorites' && !favs.size) {
                $('#empty-title').textContent = '아직 즐겨찾기가 없어요';
                $('#empty-desc').textContent = '게임 카드의 ☆를 누르면 여기에 모아 둘 수 있어요.';
            } else if (!q && state.view === 'recent' && !recent.length) {
                $('#empty-title').textContent = '최근에 연 게임이 없어요';
                $('#empty-desc').textContent = '게임을 열면 여기에 순서대로 남아요.';
            } else {
                $('#empty-title').textContent = '찾는 게임이 없어요';
                $('#empty-desc').textContent = '다른 검색어나 조건으로 찾아 보세요.';
            }
        }

        // 탭: 검색 중이거나 즐겨찾기·최근 보기에서는 선택 표시를 끈다
        document.querySelectorAll('#category-tabs .tab').forEach((t) => {
            const on = !q && state.view === 'home' && t.dataset.tab === state.tab;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        document.querySelectorAll('.nav-btn[data-view]').forEach((b) => {
            if (b.dataset.view === state.view && !q) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        });

        const pChip = $('#players-chip'), tChip = $('#time-chip');
        pChip.querySelector('span').textContent = PLAYER_LABEL[state.players];
        tChip.querySelector('span').textContent = TIME_LABEL[state.time];
        pChip.classList.toggle('active', state.players !== 'all');
        tChip.classList.toggle('active', state.time !== 'all');
        $('#reset-filters').hidden = state.players === 'all' && state.time === 'all';
    }

    // ── 탭 ──
    document.querySelectorAll('#category-tabs .tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            state.tab = tab.dataset.tab;
            state.view = 'home';
            clearSearch(false);
            try {
                if (state.tab === 'all') localStorage.removeItem(LAST_CATEGORY_KEY);
                else localStorage.setItem(LAST_CATEGORY_KEY, state.tab);
            } catch { /* 무시 */ }
            history.replaceState(null, '', state.tab === 'all' ? location.pathname + location.search : `#${state.tab}`);
            render();
            tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
    });

    // ── 하단 메뉴: 홈 / 즐겨찾기 / 최근 ──
    document.querySelectorAll('.nav-btn[data-view]').forEach((btn) => {
        btn.addEventListener('click', () => {
            state.view = btn.dataset.view;
            clearSearch(false);
            render();
            if (state.view === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
            else $('.list').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // ── 검색 ──
    const searchInput = $('#game-search');
    const clearBtn = $('#clear-search');
    function clearSearch(doRender = true) {
        searchInput.value = '';
        state.query = '';
        clearBtn.hidden = true;
        if (doRender) render();
    }
    searchInput.addEventListener('input', () => {
        state.query = searchInput.value.trim().toLowerCase();
        clearBtn.hidden = !state.query;
        render();
    });
    clearBtn.addEventListener('click', () => { clearSearch(); searchInput.focus(); });

    // ── 즐겨찾기 별 · 최근 기록 ──
    items.forEach((it) => {
        it.star.addEventListener('click', () => {
            if (favs.has(it.slug)) favs.delete(it.slug); else favs.add(it.slug);
            writeList(FAV_KEY, [...favs]);
            render();
        });
        it.card.addEventListener('click', () => remember(it.slug));
    });
    // 바로가기로 연 도구도 최근에 남긴다
    document.querySelectorAll('.shortcut').forEach((a) => a.addEventListener('click', () => remember(slugOf(a))));

    // ── 필터 시트 / 랜덤 추천 ──
    const backdrop = $('#sheet-backdrop');
    const filterSheet = $('#filter-sheet');
    const pickSheet = $('#pick-result');
    const applyBtn = $('#sheet-apply');
    let sheetMode = 'filter';   // filter: 목록 거르기 / pick: 조건 안에서 하나 뽑기
    const draft = { players: 'all', time: 'all' };
    let lastFocus = null;
    let openSheetEl = null;

    function syncSheet() {
        filterSheet.querySelectorAll('[data-players]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.players === draft.players ? 'true' : 'false'));
        filterSheet.querySelectorAll('[data-time]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.time === draft.time ? 'true' : 'false'));
        const n = filtered(draft.players, draft.time).length;
        applyBtn.disabled = n === 0;
        applyBtn.textContent = n === 0 ? '맞는 게임이 없어요'
            : (sheetMode === 'pick' ? `${n}개 중에 하나 골라 줘` : `게임 ${n}개 보기`);
        $('#sheet-title').textContent = sheetMode === 'pick' ? '지금 어떤 상황이에요?' : '어떤 게임을 찾나요?';
    }

    function showSheet(el) {
        if (openSheetEl && openSheetEl !== el) {
            openSheetEl.classList.remove('show');
            openSheetEl.hidden = true;
        }
        if (!lastFocus) lastFocus = document.activeElement;
        openSheetEl = el;
        backdrop.hidden = false;
        el.hidden = false;
        document.body.classList.add('sheet-open');
        requestAnimationFrame(() => {
            backdrop.classList.add('show');
            el.classList.add('show');
            (el.querySelector('[aria-pressed="true"], .btn-primary') || el).focus();
        });
    }

    function closeSheet() {
        if (!openSheetEl) return;
        const el = openSheetEl;
        openSheetEl = null;
        el.classList.remove('show');
        backdrop.classList.remove('show');
        document.body.classList.remove('sheet-open');
        setTimeout(() => {
            if (openSheetEl !== el) el.hidden = true;
            if (!openSheetEl) backdrop.hidden = true;
        }, 200);
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        lastFocus = null;
    }

    function openFilterSheet(mode) {
        sheetMode = mode;
        draft.players = state.players;
        draft.time = state.time;
        syncSheet();
        showSheet(filterSheet);
    }

    document.querySelectorAll('[data-open-sheet]').forEach((b) => {
        b.addEventListener('click', () => openFilterSheet(b.dataset.openSheet));
    });
    document.querySelectorAll('[data-close-sheet]').forEach((b) => b.addEventListener('click', closeSheet));
    backdrop.addEventListener('click', closeSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openSheetEl) closeSheet(); });

    filterSheet.querySelectorAll('[data-players]').forEach((b) => b.addEventListener('click', () => { draft.players = b.dataset.players; syncSheet(); }));
    filterSheet.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => { draft.time = b.dataset.time; syncSheet(); }));
    $('#sheet-reset').addEventListener('click', () => { draft.players = 'all'; draft.time = 'all'; syncSheet(); });

    let pickPool = [];
    let lastPick = null;
    function pickOne() {
        if (!pickPool.length) return;
        const pool = pickPool.length > 1 ? pickPool.filter((it) => it !== lastPick) : pickPool;
        const it = pool[Math.floor(Math.random() * pool.length)];
        lastPick = it;
        const icon = $('#pick-icon');
        icon.textContent = it.icon;
        icon.style.setProperty('--tint', TINT[it.cats[0]] || '#eef0ff');
        $('#pick-name').textContent = it.title;
        $('#pick-desc').textContent = it.desc;
        $('#pick-meta').textContent = `${playersText(it.min, it.max)} · ${it.time}분`;
        const go = $('#pick-go');
        go.href = it.card.getAttribute('href');
        go.onclick = () => remember(it.slug);
    }

    applyBtn.addEventListener('click', () => {
        if (sheetMode === 'pick') {
            // 고른 조건은 목록에도 그대로 남겨, 시트를 닫으면 그 조건의 게임들이 보이게 한다
            state.players = draft.players;
            state.time = draft.time;
            render();
            pickPool = filtered(draft.players, draft.time);
            lastPick = null;
            pickOne();
            showSheet(pickSheet);
            return;
        }
        state.players = draft.players;
        state.time = draft.time;
        closeSheet();
        render();
    });
    $('#pick-again').addEventListener('click', pickOne);

    $('#reset-filters').addEventListener('click', () => {
        state.players = 'all';
        state.time = 'all';
        render();
    });

    // 같은 페이지에서 주소의 #만 바뀌어도(뒤로 가기 등) 그 탭을 보여 준다
    window.addEventListener('hashchange', () => {
        const tab = location.hash.slice(1);
        state.tab = TABS.includes(tab) ? tab : 'all';
        state.view = 'home';
        clearSearch(false);
        render();
    });

    render();
});
