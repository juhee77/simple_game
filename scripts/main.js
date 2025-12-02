// Main page animations and interactions
document.addEventListener('DOMContentLoaded', () => {
    // Add hover sound effect (optional)
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.setProperty('--hover-scale', '1.02');
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--hover-scale', '1');
        });
    });

    // Add ripple effect on click
    gameCards.forEach(card => {
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
