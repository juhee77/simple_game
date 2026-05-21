// Main page animations and interactions
document.addEventListener('DOMContentLoaded', () => {
    const categoryView = document.getElementById('category-view');
    const gameView = document.getElementById('game-view');
    const categoryCards = document.querySelectorAll('.category-card');
    const backBtn = document.getElementById('back-to-categories');
    const gameCards = document.querySelectorAll('.game-card');
    const currentCategoryTitle = document.getElementById('current-category-title');
    const LAST_CATEGORY_KEY = 'lastCategory';

    function getCardTitle(card) {
        return card?.querySelector('.category-title')?.textContent || '게임';
    }

    function getCategoryCard(category) {
        return document.querySelector(`.category-card[data-category="${category}"]`);
    }

    function clearCategoryState() {
        localStorage.removeItem(LAST_CATEGORY_KEY);
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    function openCategory(card) {
        const category = card.dataset.category;
        const title = getCardTitle(card);
        localStorage.setItem(LAST_CATEGORY_KEY, category);
        showCategory(category, title);
    }

    categoryCards.forEach(card => {
        card.tabIndex = 0;
        card.setAttribute('role', 'button');

        card.addEventListener('click', () => {
            openCategory(card);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCategory(card);
            }
        });
    });

    backBtn.addEventListener('click', () => {
        gameView.classList.add('view-hidden');
        categoryView.classList.remove('view-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        clearCategoryState();
        
        // Reset search on returning to category list
        if (searchInput) {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            noResultsPlaceholder.classList.add('view-hidden');
        }
    });

    const initialHash = window.location.hash.substring(1);
    const rememberedCategory = localStorage.getItem(LAST_CATEGORY_KEY);
    const initialCategory = initialHash || rememberedCategory;

    if (initialCategory) {
        const card = getCategoryCard(initialCategory);
        if (card) {
            showCategory(initialCategory, getCardTitle(card));
        } else {
            clearCategoryState();
        }
    }

    function showCategory(category, title) {
        currentCategoryTitle.textContent = title;
        localStorage.setItem(LAST_CATEGORY_KEY, category);
        history.replaceState(null, '', `#${category}`);
        
        gameCards.forEach(card => {
            const cardCategories = card.dataset.category.split(' ');
            card.style.display = cardCategories.includes(category) ? 'flex' : 'none';
        });

        categoryView.classList.add('view-hidden');
        gameView.classList.remove('view-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const visibleCards = Array.from(gameCards).filter(c => c.style.display !== 'none');
        visibleCards.forEach((c, i) => {
            c.style.animationDelay = `${i * 0.1}s`;
            c.classList.remove('fadeInUp');
            void c.offsetWidth;
            c.classList.add('fadeInUp');
        });
    }

    // Search logic implementation
    const searchInput = document.getElementById('game-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const noResultsPlaceholder = document.getElementById('no-results');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            
            if (query.length > 0) {
                clearSearchBtn.style.display = 'block';
                currentCategoryTitle.textContent = `검색 결과: "${searchInput.value}"`;
                
                categoryView.classList.add('view-hidden');
                gameView.classList.remove('view-hidden');
                backBtn.style.display = 'none'; // Hide back btn to prevent nested state confusion
                
                let matchedCount = 0;
                
                gameCards.forEach(card => {
                    const title = card.querySelector('.game-title')?.textContent.toLowerCase() || '';
                    const desc = card.querySelector('.game-description')?.textContent.toLowerCase() || '';
                    const badge = card.querySelector('.game-badge')?.textContent.toLowerCase() || '';
                    
                    if (title.includes(query) || desc.includes(query) || badge.includes(query)) {
                        card.style.display = 'flex';
                        matchedCount++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                if (matchedCount === 0) {
                    noResultsPlaceholder.classList.remove('view-hidden');
                } else {
                    noResultsPlaceholder.classList.add('view-hidden');
                    
                    const visibleCards = Array.from(gameCards).filter(c => c.style.display !== 'none');
                    visibleCards.forEach((c, i) => {
                        c.style.animationDelay = `${Math.min(i * 0.05, 0.4)}s`;
                        c.classList.remove('fadeInUp');
                        void c.offsetWidth;
                        c.classList.add('fadeInUp');
                    });
                }
            } else {
                resetSearch();
            }
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            resetSearch();
        });

        function resetSearch() {
            clearSearchBtn.style.display = 'none';
            noResultsPlaceholder.classList.add('view-hidden');
            backBtn.style.display = 'block';
            
            const rememberedCategory = localStorage.getItem(LAST_CATEGORY_KEY);
            if (rememberedCategory) {
                const card = getCategoryCard(rememberedCategory);
                if (card) {
                    showCategory(rememberedCategory, getCardTitle(card));
                    return;
                }
            }
            
            // Return to categories if no prior state
            gameView.classList.add('view-hidden');
            categoryView.classList.remove('view-hidden');
            clearCategoryState();
        }
    }

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
});
