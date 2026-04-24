// Common logic for all games
document.addEventListener('DOMContentLoaded', () => {
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
