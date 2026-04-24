// Main page animations and interactions
// Main page animations and interactions
document.addEventListener('DOMContentLoaded', () => {
    const categoryView = document.getElementById('category-view');
    const gameView = document.getElementById('game-view');
    const categoryCards = document.querySelectorAll('.category-card');
    const backBtn = document.getElementById('back-to-categories');
    const gameCards = document.querySelectorAll('.game-card');
    const currentCategoryTitle = document.getElementById('current-category-title');

    // Category Card Click
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            const title = card.querySelector('.category-title').textContent;
            
            // Save last category
            localStorage.setItem('lastCategory', category);
            showCategory(category, title);
        });
    });

    // Back Button Click
    backBtn.addEventListener('click', () => {
        gameView.classList.add('view-hidden');
        categoryView.classList.remove('view-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Clear hash and storage when returning to the very beginning
        localStorage.removeItem('lastCategory');
        history.replaceState(null, null, ' ');
    });

    // Handle initial hash on load
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
        const card = document.querySelector(`.category-card[data-category="${initialHash}"]`);
        if (card) {
            const title = card.querySelector('.category-title').textContent;
            showCategory(initialHash, title);
        }
    }

    function showCategory(category, title) {
        currentCategoryTitle.textContent = title;
        
        // Filter games
        gameCards.forEach(card => {
            const cardCategories = card.dataset.category.split(' ');
            if (cardCategories.includes(category)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });

        // Toggle Views
        categoryView.classList.add('view-hidden');
        gameView.classList.remove('view-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Reveal animation for filtered cards
        const visibleCards = Array.from(gameCards).filter(c => c.style.display !== 'none');
        visibleCards.forEach((c, i) => {
            c.style.animationDelay = `${i * 0.1}s`;
            c.classList.remove(' fadeInUp'); // reset
            void c.offsetWidth; // trigger reflow
            c.classList.add(' fadeInUp');
        });
    }

    // Add ripple effect on click for all cards
    [...gameCards, ...categoryCards].forEach(card => {
        card.addEventListener('click', (e) => {
            const ripple = document.createElement('div');
            ripple.className = 'ripple';
            card.appendChild(ripple);
            
            const rect = card.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
});
