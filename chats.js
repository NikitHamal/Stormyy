const textarea = document.querySelector('textarea');
const sendButton = document.querySelector('.send-button');
const chatContainer = document.querySelector('.chat-container');

// Auto-resize textarea
textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

// Send message on button click or Enter (without Shift)
function sendMessage() {
    const message = textarea.value.trim();
    if (message) {
        // Add user message
        addMessage(message, true);
        // Clear input
        textarea.value = '';
        textarea.style.height = 'auto';
        // Simulate assistant response
        setTimeout(() => {
            addMessage("I'm an AI assistant. I received your message: " + message, false);
        }, 1000);
    }
}

function addMessage(content, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
        <div class="avatar ${isUser ? 'user-avatar' : ''}">${isUser ? 'U' : 'A'}</div>
        <div class="message-content">${content}</div>
    `;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

sendButton.addEventListener('click', sendMessage);
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// New chat button functionality
document.querySelector('.new-chat').addEventListener('click', () => {
    chatContainer.innerHTML = '';
    addMessage('Hello! How can I help you today?', false);
});

// Add new functionality
const backButton = document.querySelector('.back-button');
const toggleSidebarButton = document.querySelector('.toggle-sidebar');
const searchButton = document.querySelector('.search-button');
const settingsButton = document.querySelector('.settings-button');
const sidebar = document.querySelector('.sidebar');
const searchContainer = document.querySelector('.search-container');
const settingsPanel = document.querySelector('.settings-panel');

backButton.addEventListener('click', () => {
    window.history.back();
});

toggleSidebarButton.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
});

searchButton.addEventListener('click', () => {
    searchContainer.classList.toggle('active');
    settingsPanel.classList.remove('active');
});

settingsButton.addEventListener('click', () => {
    settingsPanel.classList.toggle('active');
    searchContainer.classList.remove('active');
});

// Close panels when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container') && 
        !e.target.closest('.search-button')) {
        searchContainer.classList.remove('active');
    }
    if (!e.target.closest('.settings-panel') && 
        !e.target.closest('.settings-button')) {
        settingsPanel.classList.remove('active');
    }
});

// Search functionality
const searchInput = document.querySelector('.search-input');
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const messages = document.querySelectorAll('.message-content');
    
    messages.forEach(message => {
        const text = message.textContent.toLowerCase();
        const messageElement = message.closest('.message');
        messageElement.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
});

// Settings functionality
const themeSelect = document.querySelector('.theme-select');
const fontSizeSelect = document.querySelector('.font-size-select');

themeSelect.addEventListener('change', (e) => {
    document.body.setAttribute('data-theme', e.target.value);
    // Add theme switching logic here
});

fontSizeSelect.addEventListener('change', (e) => {
    document.body.style.fontSize = {
        'small': '14px',
        'medium': '16px',
        'large': '18px'
    }[e.target.value];
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !e.target.closest('.sidebar') && 
        !e.target.closest('.toggle-sidebar')) {
        sidebar.classList.add('hidden');
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('hidden');
    }
});

// Initialize sidebar state
if (window.innerWidth <= 768) {
    sidebar.classList.add('hidden');
}