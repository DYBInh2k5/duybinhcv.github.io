// Smooth scroll behavior for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Parallax scroll effect
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    parallaxElements.forEach(element => {
        const speed = element.dataset.parallax || 0.5;
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// Add scroll-triggered animations
const animateElementsOnScroll = () => {
    const elements = document.querySelectorAll('[data-scroll-animate]');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        const viewportHeight = window.innerHeight;
        
        if (elementTop < viewportHeight && elementBottom > 0) {
            element.classList.add('animate-fade-in-up');
        }
    });
};

window.addEventListener('scroll', animateElementsOnScroll);
window.addEventListener('load', animateElementsOnScroll);