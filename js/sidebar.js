/* Sidebar Navigation JavaScript */

class Sidebar {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('.main-content');
        this.toggleBtn = document.querySelector('.sidebar-toggle');
        this.overlay = document.querySelector('.sidebar-overlay');
        this.navItems = document.querySelectorAll('.sidebar-nav-item');
        this.themeToggle = document.querySelector('.sidebar-theme-toggle');
        
        this.isCollapsed = false;
        this.isMobile = window.innerWidth <= 768;
        
        this.init();
    }

    init() {
        if (!this.sidebar) return;

        // Toggle button click
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Overlay click (mobile)
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeMobile());
        }

        // Nav item click
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleNavClick(e));
        });

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Set active nav item on page load
        this.setActiveNav();

        // Close sidebar when clicking outside (mobile)
        document.addEventListener('click', (e) => {
            if (this.isMobile && 
                this.sidebar.classList.contains('open') &&
                !this.sidebar.contains(e.target) &&
                !this.toggleBtn?.contains(e.target)) {
                this.closeMobile();
            }
        });

        // Load theme preference
        this.loadThemePreference();
    }

    toggle() {
        if (this.isMobile) {
            this.toggleMobile();
        } else {
            this.toggleDesktop();
        }
    }

    toggleDesktop() {
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            this.sidebar.classList.add('collapsed');
        } else {
            this.sidebar.classList.remove('collapsed');
        }

        // Save preference
        localStorage.setItem('sidebarCollapsed', this.isCollapsed);
    }

    toggleMobile() {
        this.sidebar.classList.toggle('open');
    }

    closeMobile() {
        if (this.isMobile && this.sidebar.classList.contains('open')) {
            this.sidebar.classList.remove('open');
        }
    }

    handleNavClick(e) {
        // Remove active from all items
        this.navItems.forEach(item => {
            item.classList.remove('active');
        });

        // Add active to clicked item
        e.currentTarget.classList.add('active');

        // Close mobile sidebar after click
        if (this.isMobile) {
            setTimeout(() => this.closeMobile(), 300);
        }

        // Save active nav item
        const href = e.currentTarget.getAttribute('href');
        localStorage.setItem('activeNavItem', href);
    }

    setActiveNav() {
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop() || 'index.html';
        
        this.navItems.forEach(item => {
            const href = item.getAttribute('href');
            const itemFile = href.split('/').pop();
            
            if (currentFile === itemFile || (currentFile === '' && href.includes('index'))) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        document.body.classList.toggle('dark-mode');
        
        // Save preference
        localStorage.setItem('darkMode', isDark);
        
        // Update icon
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        if (!this.themeToggle) return;
        
        const isDark = document.documentElement.classList.contains('dark');
        const icon = this.themeToggle.querySelector('i');
        
        if (icon) {
            if (isDark) {
                icon.className = 'fas fa-moon';
            } else {
                icon.className = 'fas fa-sun';
            }
        }
    }

    loadThemePreference() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark-mode');
            this.updateThemeIcon();
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        if (wasMobile && !this.isMobile) {
            // Desktop now
            this.sidebar.classList.remove('open');
        }

        // Restore collapsed state on desktop
        if (!this.isMobile) {
            const wasCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (wasCollapsed) {
                this.sidebar.classList.add('collapsed');
            }
        }
    }

    // Public methods
    open() {
        this.sidebar.classList.add('open');
    }

    close() {
        this.sidebar.classList.remove('open');
    }

    expand() {
        this.isCollapsed = false;
        this.sidebar.classList.remove('collapsed');
        localStorage.setItem('sidebarCollapsed', false);
    }

    collapse() {
        this.isCollapsed = true;
        this.sidebar.classList.add('collapsed');
        localStorage.setItem('sidebarCollapsed', true);
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    new Sidebar();
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            const target = document.querySelector(href);
            const offsetTop = target.offsetTop - 100;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});
