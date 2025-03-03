document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navButtons = document.querySelector('.nav-buttons');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            // Create mobile menu if it doesn't exist
            if (!document.querySelector('.mobile-menu')) {
                const mobileMenu = document.createElement('div');
                mobileMenu.className = 'mobile-menu';
                
                // Clone navigation links and buttons
                const navLinksClone = navLinks.cloneNode(true);
                const navButtonsClone = navButtons.cloneNode(true);
                
                mobileMenu.appendChild(navLinksClone);
                mobileMenu.appendChild(navButtonsClone);
                
                // Add close button
                const closeButton = document.createElement('button');
                closeButton.className = 'menu-close';
                closeButton.innerHTML = '<span class="material-icons">close</span>';
                mobileMenu.prepend(closeButton);
                
                document.body.appendChild(mobileMenu);
                
                // Add event listener to close button
                closeButton.addEventListener('click', function() {
                    mobileMenu.classList.remove('active');
                    setTimeout(() => {
                        mobileMenu.remove();
                    }, 300);
                });
                
                // Prevent immediate animation
                setTimeout(() => {
                    mobileMenu.classList.add('active');
                }, 10);
            } else {
                // Toggle existing mobile menu
                const mobileMenu = document.querySelector('.mobile-menu');
                mobileMenu.classList.toggle('active');
            }
        });
    }
    
    // Add scroll animation for navbar
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };
        
        window.addEventListener('scroll', handleScroll);
        
        // Check initial scroll position
        handleScroll();
    }
    
    // Add hover effects for kit cards
    const kitCards = document.querySelectorAll('.kit-card');
    
    kitCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('hover');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('hover');
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80, // Adjust for navbar height
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add additional CSS for mobile menu
    const style = document.createElement('style');
    style.textContent = `
        .mobile-menu {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background-color: var(--surface);
            z-index: 2000;
            display: flex;
            flex-direction: column;
            padding: var(--spacing-xl);
            transform: translateX(-100%);
            transition: transform 0.3s ease;
        }
        
        .mobile-menu.active {
            transform: translateX(0);
        }
        
        .mobile-menu .nav-links,
        .mobile-menu .nav-buttons {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--spacing-lg);
            margin-top: var(--spacing-xl);
        }
        
        .mobile-menu .nav-links a {
            font-size: 1.25rem;
        }
        
        .mobile-menu .nav-buttons {
            margin-top: var(--spacing-xl);
        }
        
        .mobile-menu .nav-buttons .btn {
            width: 100%;
        }
        
        .menu-close {
            position: absolute;
            top: var(--spacing-lg);
            right: var(--spacing-lg);
            background: none;
            border: none;
            color: var(--on-surface);
            font-size: 1.5rem;
            cursor: pointer;
        }
        
        .navbar.scrolled {
            padding: var(--spacing-sm) 0;
            background-color: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
        }
        
        .kit-card.hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-3);
        }
    `;
    
    document.head.appendChild(style);

    // Create starry background
    function createStars() {
        const starsContainer = document.createElement('div');
        starsContainer.className = 'stars-container';
        
        // Create stars with different sizes and animation delays
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random position
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            
            // Random size
            const size = Math.random() * 2;
            
            // Random animation delay
            const delay = Math.random() * 5;
            
            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.animationDelay = `${delay}s`;
            
            starsContainer.appendChild(star);
        }
        
        document.body.appendChild(starsContainer);
    }

    // Add more CSS for space theme
    const spaceStyles = document.createElement('style');
    spaceStyles.textContent = `
        .stars-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        }
        
        .star {
            position: absolute;
            width: 1px;
            height: 1px;
            background-color: white;
            border-radius: 50%;
            animation: twinkle 4s infinite ease-in-out;
        }
        
        /* Glow effects for elements */
        [data-theme="dark"] .logo, 
        [data-theme="dark"] h1, 
        [data-theme="dark"] h2, 
        [data-theme="dark"] .btn-primary {
            text-shadow: 0 0 10px rgba(187, 134, 252, 0.3);
        }
        
        .kit-card, .feature-card {
            position: relative;
            overflow: hidden;
        }
        
        [data-theme="dark"] .kit-card::after, 
        [data-theme="dark"] .feature-card::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle at center, rgba(187, 134, 252, 0.1), transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        
        [data-theme="light"] .kit-card::after, 
        [data-theme="light"] .feature-card::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle at center, rgba(98, 0, 238, 0.05), transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        
        .kit-card:hover::after, .feature-card:hover::after {
            opacity: 1;
        }
        
        /* Subtle gradient overlay for sections */
        section {
            position: relative;
            z-index: 1;
        }
        
        /* Theme transition */
        * {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
    `;

    document.head.appendChild(spaceStyles);
    createStars();

    // Theme switcher functionality
    function setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Function to set theme
        const setTheme = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            // Update stars visibility based on theme
            if (theme === 'dark') {
                createStarsIfNeeded();
            }
        };
        
        // Check for saved theme preference or use OS preference
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            // Use OS preference
            setTheme(prefersDarkScheme.matches ? 'dark' : 'light');
        }
        
        // Handle click on theme toggle
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                setTheme(currentTheme === 'dark' ? 'light' : 'dark');
            });
        }
        
        // Listen for OS theme changes
        prefersDarkScheme.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // Create stars only if needed (for dark theme)
    function createStarsIfNeeded() {
        if (!document.querySelector('.stars-container') && 
            document.documentElement.getAttribute('data-theme') === 'dark') {
            createStars();
        }
    }

    setupThemeToggle();
    enhanceNavbarScroll();
}); 