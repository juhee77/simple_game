// Main page animations and interactions
document.addEventListener('DOMContentLoaded', () => {
    const categoryView = document.getElementById('category-view');
    const gameView = document.getElementById('game-view');
    const categoryCards = document.querySelectorAll('.category-card');
    const backBtn = document.getElementById('back-to-categories');
    const gameCards = document.querySelectorAll('.game-card');
    const currentCategoryTitle = document.getElementById('current-category-title');
    
    const searchInput = document.getElementById('game-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const noResultsPlaceholder = document.getElementById('no-results');
    
    const filterBtns = document.querySelectorAll('.filter-btn');

    const LAST_CATEGORY_KEY = 'lastCategory';
    
    let state = {
        category: null,
        searchQuery: '',
        players: 'all',
        time: 'all'
    };

    // Initialize state
    const initialHash = window.location.hash.substring(1);
    const rememberedCategory = localStorage.getItem(LAST_CATEGORY_KEY);
    if (initialHash || rememberedCategory) {
        state.category = initialHash || rememberedCategory;
    }

    function getCardTitle(card) {
        return card?.querySelector('.category-title')?.textContent || '게임';
    }

    function getCategoryCard(category) {
        return document.querySelector(`.category-card[data-category="${category}"]`);
    }

    function clearCategoryState() {
        state.category = null;
        localStorage.removeItem(LAST_CATEGORY_KEY);
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    // 카드는 지원 인원의 하한/상한을 모두 선언한다. 예전에는 "2+" 한 값만 있어
    // 상한을 100으로 가정했고, 그 탓에 2인 전용 게임이 대인원 필터에 걸렸다.
    function parsePlayers(card) {
        const min = parseInt(card.dataset.minPlayers, 10);
        const max = parseInt(card.dataset.maxPlayers, 10);
        return [Number.isFinite(min) ? min : 1, Number.isFinite(max) ? max : 99];
    }

    // 필터가 요구하는 인원 구간과 게임이 지원하는 구간이 겹치는지 본다.
    const PLAYER_RANGES = {
        '1': [1, 1],
        '2': [2, 2],
        '3-4': [3, 4],
        '5-7': [5, 7],
        '8+': [8, Infinity]
    };

    // --- Core Display Logic ---
    function updateDisplay() {
        let isGameView = false;
        let matchedCount = 0;
        
        // Determine view mode
        if (state.searchQuery.length > 0) {
            isGameView = true;
            currentCategoryTitle.textContent = `검색 결과: "${state.searchQuery}"`;
            backBtn.style.display = 'none';
        } else if (state.category) {
            isGameView = true;
            const catCard = getCategoryCard(state.category);
            currentCategoryTitle.textContent = getCardTitle(catCard);
            backBtn.style.display = 'flex';
            localStorage.setItem(LAST_CATEGORY_KEY, state.category);
            history.replaceState(null, '', `#${state.category}`);
        } else if (state.players !== 'all' || state.time !== 'all') {
            isGameView = true;
            currentCategoryTitle.textContent = `조건에 맞는 게임`;
            backBtn.style.display = 'flex';
            clearCategoryState();
        } else {
            isGameView = false;
            clearCategoryState();
        }

        if (!isGameView) {
            gameView.classList.add('view-hidden');
            categoryView.classList.remove('view-hidden');
            return;
        }

        categoryView.classList.add('view-hidden');
        gameView.classList.remove('view-hidden');

        // Apply filters
        gameCards.forEach(card => {
            let show = true;
            
            // 1. Category check
            if (!state.searchQuery && state.category) {
                const cardCategories = card.dataset.category.split(' ');
                if (!cardCategories.includes(state.category)) show = false;
            }
            
            // 2. Search check
            if (state.searchQuery) {
                const title = card.querySelector('.game-title')?.textContent.toLowerCase() || '';
                const desc = card.querySelector('.game-description')?.textContent.toLowerCase() || '';
                const badge = card.querySelector('.game-badge')?.textContent.toLowerCase() || '';
                if (!(title.includes(state.searchQuery) || desc.includes(state.searchQuery) || badge.includes(state.searchQuery))) {
                    show = false;
                }
            }
            
            // 3. Player filter check
            if (show && state.players !== 'all') {
                const [minP, maxP] = parsePlayers(card);
                const range = PLAYER_RANGES[state.players];
                if (range && !(minP <= range[1] && maxP >= range[0])) show = false;
            }

            // 4. Time filter check
            if (show && state.time !== 'all') {
                const t = parseInt(card.dataset.time || '0', 10);
                if (state.time === '5' && t > 5) show = false;
                else if (state.time === '15' && (t <= 5 || t > 15)) show = false;
                else if (state.time === '15+' && t <= 15) show = false;
            }

            card.style.display = show ? 'flex' : 'none';
            if (show) matchedCount++;
        });

        if (matchedCount === 0) {
            noResultsPlaceholder.classList.remove('view-hidden');
        } else {
            noResultsPlaceholder.classList.add('view-hidden');
            // Animate visible cards
            const visibleCards = Array.from(gameCards).filter(c => c.style.display !== 'none');
            visibleCards.forEach((c, i) => {
                c.style.animationDelay = `${Math.min(i * 0.05, 0.4)}s`;
                c.classList.remove('fadeInUp');
                void c.offsetWidth;
                c.classList.add('fadeInUp');
            });
        }
    }

    // --- Event Listeners ---
    
    categoryCards.forEach(card => {
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        const trigger = () => {
            state.category = card.dataset.category;
            state.searchQuery = '';
            if(searchInput) searchInput.value = '';
            if(clearSearchBtn) clearSearchBtn.style.display = 'none';
            updateDisplay();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        card.addEventListener('click', trigger);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trigger();
            }
        });
    });

    backBtn.addEventListener('click', () => {
        state.category = null;
        state.searchQuery = '';
        state.players = 'all';
        state.time = 'all';
        if(searchInput) searchInput.value = '';
        if(clearSearchBtn) clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filterValue === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        updateDisplay();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            state.searchQuery = searchInput.value.trim().toLowerCase();
            clearSearchBtn.style.display = state.searchQuery.length > 0 ? 'block' : 'none';
            updateDisplay();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            state.searchQuery = '';
            clearSearchBtn.style.display = 'none';
            
            const remembered = localStorage.getItem(LAST_CATEGORY_KEY);
            if (remembered && getCategoryCard(remembered)) {
                state.category = remembered;
            } else {
                state.category = null;
            }
            updateDisplay();
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.filterType;
            const val = btn.dataset.filterValue;
            
            document.querySelectorAll(`.filter-btn[data-filter-type="${type}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (type === 'players') state.players = val;
            if (type === 'time') state.time = val;
            
            updateDisplay();
        });
    });

    [...gameCards, ...categoryCards].forEach(card => {
        card.addEventListener('click', (e) => {
            const ripple = document.createElement('div');
            ripple.className = 'ripple';
            card.appendChild(ripple);
            
            const rect = card.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const pointerX = e.clientX || rect.left + rect.width / 2;
            const pointerY = e.clientY || rect.top + rect.height / 2;
            const x = pointerX - rect.left - size / 2;
            const y = pointerY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Initial render
    updateDisplay();
});
