document.addEventListener('DOMContentLoaded', function() {
    // Initialize components page functionality
    initComponentsPage();
});

function initComponentsPage() {
    // Mobile sidebar toggle
    initMobileSidebar();
    
    // Code toggle functionality
    initCodeToggles();
    
    // Code tabs functionality
    initCodeTabs();
    
    // Copy button functionality
    initCopyButtons();
    
    // Initialize code editors
    initCodeEditors();
    
    // Initialize sidebar active links
    initSidebarActiveLinks();
}

// Mobile sidebar functionality
function initMobileSidebar() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.components-sidebar');
    const sidebarClose = document.querySelector('.sidebar-close');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.add('active');
        });
        
        if (sidebarClose) {
            sidebarClose.addEventListener('click', function() {
                sidebar.classList.remove('active');
            });
        }
        
        // Close sidebar when clicking outside
        document.addEventListener('click', function(event) {
            if (!sidebar.contains(event.target) && 
                !menuToggle.contains(event.target) && 
                sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }
}

// Code toggle functionality
function initCodeToggles() {
    const codeToggles = document.querySelectorAll('.btn-code-toggle');
    
    codeToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const demoBlock = this.closest('.component-demo');
            const codeBlock = demoBlock.querySelector('.demo-code');
            
            if (codeBlock) {
                codeBlock.classList.toggle('active');
                
                // Update toggle text
                if (codeBlock.classList.contains('active')) {
                    this.innerHTML = '<span class="material-icons">visibility_off</span> Hide Code';
                } else {
                    this.innerHTML = '<span class="material-icons">code</span> View Code';
                }
                
                // Initialize editor if code is shown for the first time
                if (codeBlock.classList.contains('active')) {
                    const editorInput = codeBlock.querySelector('.editor-input');
                    const activeCodeBlock = codeBlock.querySelector('.code-block.active');
                    
                    if (editorInput && activeCodeBlock) {
                        const codeContent = activeCodeBlock.querySelector('code').textContent;
                        editorInput.value = codeContent;
                    }
                }
            }
        });
    });
}

// Code tabs functionality
function initCodeTabs() {
    const codeTabs = document.querySelectorAll('.code-tab');
    
    codeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabsContainer = this.closest('.code-tabs');
            const codeContent = this.closest('.demo-code').querySelector('.code-content');
            const tabType = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            tabsContainer.querySelectorAll('.code-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all code blocks
            codeContent.querySelectorAll('.code-block').forEach(block => {
                block.classList.remove('active');
            });
            
            // Show selected code block
            const targetBlock = codeContent.querySelector(`.code-block[data-tab-content="${tabType}"]`);
            if (targetBlock) {
                targetBlock.classList.add('active');
                
                // Update editor content
                const editorInput = this.closest('.demo-code').querySelector('.editor-input');
                if (editorInput) {
                    const codeContent = targetBlock.querySelector('code').textContent;
                    editorInput.value = codeContent;
                }
            }
        });
    });
}

// Copy button functionality
function initCopyButtons() {
    const copyButtons = document.querySelectorAll('.btn-copy');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const codeBlock = this.closest('.demo-code').querySelector('.code-block.active');
            
            if (codeBlock) {
                const code = codeBlock.querySelector('code').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    // Show copied indicator
                    const originalIcon = this.innerHTML;
                    this.innerHTML = '<span class="material-icons">check</span>';
                    
                    setTimeout(() => {
                        this.innerHTML = originalIcon;
                    }, 2000);
                });
            }
        });
    });
}

// Initialize code editors
function initCodeEditors() {
    const runButtons = document.querySelectorAll('.btn-run');
    
    runButtons.forEach(button => {
        button.addEventListener('click', function() {
            const editor = this.closest('.code-editor');
            const input = editor.querySelector('.editor-input');
            const preview = editor.querySelector('.preview-content');
            
            if (input && preview) {
                // Get the active tab
                const activeTab = this.closest('.demo-code').querySelector('.code-tab.active');
                const tabType = activeTab ? activeTab.getAttribute('data-tab') : 'html';
                
                if (tabType === 'html') {
                    // For HTML, just update the innerHTML
                    preview.innerHTML = input.value;
                    
                    // Apply theme-specific styles to any buttons in the preview
                    applyThemeToPreview(preview);
                } else if (tabType === 'css') {
                    // For CSS, create or update a style element
                    let styleEl = editor.querySelector('.preview-style');
                    
                    if (!styleEl) {
                        styleEl = document.createElement('style');
                        styleEl.className = 'preview-style';
                        editor.appendChild(styleEl);
                    }
                    
                    styleEl.textContent = input.value;
                }
            }
        });
    });
}

// Apply theme to preview elements
function applyThemeToPreview(preview) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
    // Apply theme attribute to the preview container
    preview.setAttribute('data-theme', currentTheme);
    
    // Find all buttons in the preview and apply theme-specific styles
    const buttons = preview.querySelectorAll('.btn');
    buttons.forEach(button => {
        // Make sure buttons use the current theme variables
        button.style.setProperty('--primary', getComputedStyle(document.documentElement).getPropertyValue('--primary'));
        button.style.setProperty('--on-primary', getComputedStyle(document.documentElement).getPropertyValue('--on-primary'));
    });
}

// Initialize sidebar active links
function initSidebarActiveLinks() {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default hash navigation
            
            // Extract component ID from the href attribute
            const componentId = this.getAttribute('href').substring(1);
            
            // Load the component
            loadComponent(componentId);
            
            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // On mobile, close the sidebar after clicking a link
            const sidebar = document.querySelector('.components-sidebar');
            if (window.innerWidth <= 1024 && sidebar) {
                sidebar.classList.remove('active');
            }
        });
    });
}

// Handle component navigation links
document.addEventListener('click', function(e) {
    // Check if clicked element is a component navigation link
    if (e.target.classList.contains('prev-component') || 
        e.target.classList.contains('next-component') ||
        e.target.parentElement.classList.contains('prev-component') ||
        e.target.parentElement.classList.contains('next-component')) {
        
        e.preventDefault();
        const link = e.target.closest('a');
        if (link) {
            const componentId = link.getAttribute('href').substring(1);
            loadComponent(componentId);
        }
    }
});

// Load initial component based on URL hash
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components page functionality
    initMobileSidebar();
    initSidebarActiveLinks();
    updateRgbVariables();
    
    // Load component based on hash or default to buttons
    const hash = window.location.hash.substring(1); // Remove #
    loadComponent(hash || 'buttons');
    
    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', function() {
        const newHash = window.location.hash.substring(1);
        if (newHash) {
            loadComponent(newHash);
        }
    });
});

// Update RGB variables when theme changes
function updateRgbVariables() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    
    if (theme === 'dark') {
        document.documentElement.style.setProperty('--primary-rgb', '187, 134, 252');
    } else {
        document.documentElement.style.setProperty('--primary-rgb', '98, 0, 238');
    }
}

// Listen for theme changes to update RGB variables
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'data-theme') {
            updateRgbVariables();
            
            // Update any open previews
            const previews = document.querySelectorAll('.preview-content');
            previews.forEach(preview => {
                applyThemeToPreview(preview);
            });
        }
    });
});

observer.observe(document.documentElement, { attributes: true });

// Initialize RGB variables on load
updateRgbVariables();

// Cache for loaded components
const componentCache = {};

// Function to load component content
function loadComponent(componentId) {
    // Show loading indicator
    const container = document.getElementById('component-container');
    container.innerHTML = `
        <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading component...</p>
        </div>
    `;
    
    // Get component file path
    const componentPath = `components/${componentId}.html`;
    
    // Check cache first
    if (componentCache[componentId]) {
        container.innerHTML = componentCache[componentId];
        initComponentFunctionality();
        return;
    }
    
    // Fetch the component
    fetch(componentPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Component not found: ${componentId}`);
            }
            return response.text();
        })
        .then(html => {
            // Cache the component
            componentCache[componentId] = html;
            
            // Update the container
            container.innerHTML = html;
            
            // Initialize component functionality
            initComponentFunctionality();
            
            // Update URL hash without scrolling
            const currentHash = window.location.hash;
            if (currentHash !== `#${componentId}`) {
                history.pushState(null, null, `#${componentId}`);
            }
        })
        .catch(error => {
            console.error(error);
            container.innerHTML = `
                <div class="component-error">
                    <h2>Component Not Found</h2>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="loadComponent('buttons')">
                        Go to Buttons
                    </button>
                </div>
            `;
        });
}

// Function to initialize component functionality after loading
function initComponentFunctionality() {
    // These are the existing functions from your components.js
    initCodeToggles();
    initCodeTabs();
    initCopyButtons();
    initCodeEditors();
    
    // Update sidebar active state
    updateSidebarActiveState();
}

// Update sidebar active state based on current component
function updateSidebarActiveState() {
    const hash = window.location.hash.substring(1); // Remove #
    if (hash) {
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${hash}`) {
                link.classList.add('active');
            }
        });
    }
} 