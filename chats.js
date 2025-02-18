// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const loadingOverlay = document.getElementById('loadingOverlay');

// Conversation Management
const STORAGE_KEY = 'chat_conversations';
let conversations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let currentConversationId = null;

// Generate a unique conversation ID
function generateUniqueId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// UI Elements
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const conversationsList = document.getElementById('conversationsList');
const backButton = document.getElementById('backButton');
const toggleSidebarButton = document.getElementById('toggleSidebar');
const settingsModal = document.getElementById('settingsModal');
const welcomeScreen = document.getElementById('welcomeScreen');
const conversationTitle = document.querySelector('.conversation-title');

// API Endpoints
const GPT4O_API_URL = 'https://api.paxsenix.us.kg/ai/gpt4o';
const GPT4O_MINI_API_URL = 'https://api.paxsenix.us.kg/ai/gpt4omini';
const GEMINI_REALTIME_API_URL = 'https://api.paxsenix.us.kg/ai/gemini-realtime';
const GEMINI_FLASH_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';
const GEMINI_FLASH_API_KEY = 'AIzaSyBlvhpuRx-ispBO9mCxnMNu78FQ4rLnmrI';
const CLAUDE_SONNET_API_URL = 'https://api.paxsenix.us.kg/ai/claudeSonnet';
const MIXTRAL_API_URL = 'https://api.paxsenix.us.kg/ai/mixtral';
const LLAMA3_API_URL = 'https://api.paxsenix.us.kg/ai/llama3';
const GEMMA_API_URL = 'https://api.paxsenix.us.kg/ai/gemma';
const LLAMA3_70B_API_URL = 'https://api.paxsenix.us.kg/ai/llama3-1-70B';

// Chat state management
const MAX_HISTORY = 15;
let chatHistory = [];
let messageHistory = new Map();
let currentVersions = new Map();
let isSending = false;

// Rate limiting
const RATE_LIMIT_DELAY = 2000;
let lastRequestTime = 0;

// Initialize model selection
let currentModel = localStorage.getItem('current_model') || 'gemini_flash';

// Initialize the UI
function initializeUI() {
    renderConversationsList();
    setupEventListeners();
    
    // Check for conversation ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('id');
    
    if (conversationId) {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            loadConversation(conversation);
        } else {
            startNewConversation();
        }
    } else {
        showWelcomeScreen();
    }
    
    // Set initial model selection
    const savedModel = localStorage.getItem('current_model') || 'gemini_flash';
    const modelInput = document.querySelector(`input[value="${savedModel}"]`);
    if (modelInput) {
        modelInput.checked = true;
    }

    // Handle mobile view
    if (window.innerWidth <= 768) {
        sidebar.classList.add('hidden');
        document.querySelector('.main-content').classList.add('full-width');
    }

    // Add swipe gesture for mobile sidebar
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        const swipeThreshold = 100;
        if (touchEndX - touchStartX > swipeThreshold) {
            // Swipe right - open sidebar
            sidebar.classList.add('active');
            sidebarBackdrop.classList.add('active');
        } else if (touchStartX - touchEndX > swipeThreshold) {
            // Swipe left - close sidebar
            sidebar.classList.remove('active');
            sidebarBackdrop.classList.remove('active');
        }
    }
}

function setupEventListeners() {
    // Sidebar toggle
    toggleSidebarButton.addEventListener('click', toggleSidebar);
    sidebarBackdrop.addEventListener('click', toggleSidebar);

    // Back button
    backButton.addEventListener('click', () => {
        startNewConversation();
    });

    // Settings
    document.querySelector('.settings-btn').addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    document.querySelector('.close-settings').addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !toggleSidebarButton.contains(e.target)) {
            toggleSidebar();
        }
    });

    // Delete all conversations
    document.querySelector('.delete-all-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all conversations?')) {
            conversations = [];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
            renderConversationsList();
            startNewConversation();
        }
    });

    // New chat button
    document.querySelector('.new-chat-btn').addEventListener('click', startNewConversation);

    // Example prompts
    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.textContent.replace(/['"]/g, '');
            chatInput.value = prompt;
            sendMessage();
        });
    });

    // Model selection in settings
    document.querySelectorAll('.model-option input').forEach(input => {
        input.addEventListener('change', (e) => {
            currentModel = e.target.value;
            localStorage.setItem('current_model', currentModel);
            settingsModal.classList.remove('active');
            
            // Show feedback toast
            showToast(`Model switched to ${e.target.closest('label').querySelector('.model-name').textContent}`);
        });
    });
}

function toggleSidebar() {
    sidebar.classList.toggle('active');
    sidebarBackdrop.classList.toggle('active');
    document.querySelector('.main-content').classList.toggle('full-width');
}

function showWelcomeScreen() {
    welcomeScreen.style.display = 'block';
    chatMessages.querySelectorAll('.message').forEach(msg => msg.remove());
}

function hideWelcomeScreen() {
    welcomeScreen.style.display = 'none';
}

function startNewConversation() {
    // Reset state without creating an ID
    currentConversationId = null;
    chatHistory = [];
    messageHistory = new Map();
    currentVersions = new Map();
    conversationTitle.textContent = 'New Chat';
    showWelcomeScreen();
    
    // Clear URL parameters
    const url = new URL(window.location);
    url.searchParams.delete('id');
    window.history.pushState({}, '', url);
    
    // Update conversations list
    renderConversationsList();
}

function updateConversationsList() {
    if (chatHistory.length > 0) {
        const firstMessage = chatHistory[0].content;
        const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
        
        // Convert Maps to arrays of objects for storage
        const messageHistoryArray = Array.from(messageHistory.entries()).map(([key, value]) => ({
            position: key,
            versions: value,
            metadata: {
                timestamps: value.map((_, index) => {
                    const msg = chatHistory.find(m => !m.isUser && m.metadata?.position === key && m.metadata?.currentVersion === index);
                    return msg?.timestamp || Date.now();
                }),
                models: value.map((_, index) => {
                    const msg = chatHistory.find(m => !m.isUser && m.metadata?.position === key && m.metadata?.currentVersion === index);
                    return msg?.model || currentModel;
                })
            }
        }));
        
        const currentVersionsArray = Array.from(currentVersions.entries()).map(([key, value]) => ({
            position: key,
            version: value
        }));

        const conversation = {
            id: currentConversationId,
            title,
            messages: chatHistory.map(msg => ({
                ...msg,
                metadata: {
                    ...msg.metadata,
                    versions: msg.isUser ? undefined : messageHistory.get(msg.metadata?.position)
                }
            })),
            messageHistory: messageHistoryArray,
            currentVersions: currentVersionsArray,
            metadata: {
                createdAt: conversations.find(c => c.id === currentConversationId)?.metadata?.createdAt || Date.now(),
                lastUpdated: Date.now(),
                messageCount: chatHistory.length,
                modelUsage: chatHistory
                    .filter(msg => !msg.isUser)
                    .reduce((acc, msg) => {
                        acc[msg.model] = (acc[msg.model] || 0) + 1;
                        return acc;
                    }, {}),
                totalRegenerations: Array.from(messageHistory.values())
                    .reduce((sum, versions) => sum + Math.max(0, versions.length - 1), 0)
            }
        };

        const existingIndex = conversations.findIndex(c => c.id === currentConversationId);
        if (existingIndex !== -1) {
            conversations[existingIndex] = conversation;
        } else {
            conversations.unshift(conversation);
        }

        // Keep only last 50 conversations
        if (conversations.length > 50) {
            conversations = conversations.slice(0, 50);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        renderConversationsList();
    }
}

function renderConversationsList() {
    conversationsList.innerHTML = '';
    conversations.sort((a, b) => b.lastUpdated - a.lastUpdated).forEach(conv => {
        const item = document.createElement('div');
        item.className = `conversation-item${conv.id === currentConversationId ? ' active' : ''}`;
        
        // Create title element
        const title = document.createElement('div');
        title.className = 'conversation-title';
        title.textContent = conv.title || 'New Chat';
        
        // Create timestamp element
        const timestamp = document.createElement('div');
        timestamp.className = 'conversation-timestamp';
        timestamp.textContent = formatTimestamp(conv.lastUpdated);
        
        item.appendChild(title);
        item.appendChild(timestamp);
        item.addEventListener('click', () => loadConversation(conv));
        conversationsList.appendChild(item);
    });
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

function loadConversation(conversation) {
    currentConversationId = conversation.id;
    chatHistory = conversation.messages;
    
    // Update URL with conversation ID
    const url = new URL(window.location);
    url.searchParams.set('id', conversation.id);
    window.history.pushState({}, '', url);
    
    // Restore message history Map with enhanced data
    messageHistory = new Map();
    if (conversation.messageHistory) {
        conversation.messageHistory.forEach(item => {
            messageHistory.set(item.position, item.versions);
        });
    }
    
    // Restore current versions Map
    currentVersions = new Map();
    if (conversation.currentVersions) {
        conversation.currentVersions.forEach(item => {
            currentVersions.set(item.position, item.version);
        });
    }
    
    // Update conversation title
    const title = conversation.title || 'New Chat';
    conversationTitle.textContent = title;
    chatMessages.innerHTML = '';
    
    // Reconstruct the chat UI with enhanced message data
    chatHistory.forEach((msg, index) => {
        const position = msg.isUser ? null : (msg.metadata?.position || Date.now() + index * 1000);
        const messageDiv = appendMessage(msg.content, msg.isUser, {
            model: msg.model,
            metadata: msg.metadata
        }, position);
        
        // If it's a bot message and has multiple versions, update the version navigation
        if (!msg.isUser && position && messageHistory.has(position)) {
            const versions = messageHistory.get(position);
            if (versions && versions.length > 1) {
                const currentVersion = currentVersions.get(position) || 0;
                const versionNav = messageDiv.querySelector('.version-nav');
                if (versionNav) {
                    updateVersionNavigation(versionNav, versions.length, currentVersion);
                }
            }
        }
    });
    
    hideWelcomeScreen();
    renderConversationsList();
    
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

// Helper function to update version navigation
function updateVersionNavigation(versionNav, totalVersions, currentVersion) {
    const counter = versionNav.querySelector('.version-counter');
    const prevBtn = versionNav.querySelector('[data-action="prev"]');
    const nextBtn = versionNav.querySelector('[data-action="next"]');
    
    if (counter) counter.textContent = `${currentVersion + 1}/${totalVersions}`;
    if (prevBtn) {
        prevBtn.disabled = currentVersion === 0;
        prevBtn.classList.toggle('active', currentVersion > 0);
    }
    if (nextBtn) {
        nextBtn.disabled = currentVersion === totalVersions - 1;
        nextBtn.classList.toggle('active', currentVersion < totalVersions - 1);
    }
}

// Event Listeners
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage);

// Auto-resize textarea
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    const maxHeight = 200;
    if (this.scrollHeight > maxHeight) {
        this.style.height = maxHeight + 'px';
        this.style.overflowY = 'auto';
    } else {
        this.style.overflowY = 'hidden';
    }
});

// Message handling functions
function appendMessage(content, isUser, options = {}, position = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'} fade-in`;
    
    if (!isUser) {
        // Add model label
        const modelLabel = document.createElement('div');
        modelLabel.className = 'model-label';
        modelLabel.textContent = currentModel.replace(/_/g, ' ');
        messageDiv.appendChild(modelLabel);
        
        if (!content) {
            // Add simple thinking text
            const thinkingText = document.createElement('div');
            thinkingText.className = 'thinking';
            thinkingText.textContent = 'AI is thinking';
            messageDiv.appendChild(thinkingText);
            messageDiv.classList.add('thinking');
        } else {
            // Store message position if not provided
            position = position || Date.now();
            
            // Only initialize message history when regenerating
            // Don't create version history for new messages
            if (messageHistory.has(position)) {
                messageHistory.get(position).push(content);
                currentVersions.set(position, messageHistory.get(position).length - 1);
            }
            
            // Store position in chat history for this message
            const historyIndex = chatHistory.findIndex(msg => !msg.isUser && msg.content === content);
            if (historyIndex !== -1) {
                chatHistory[historyIndex].position = position;
            }
            
            // Create content wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'message-content-wrapper';
            
            // Add message content
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.innerHTML = marked.parse(content);
            
            contentWrapper.appendChild(messageContent);
            messageDiv.appendChild(contentWrapper);
            
            addMessageTools(messageDiv, content, position);
        }
    } else {
        // User message content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content-wrapper';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = marked.parse(content);
        
        contentWrapper.appendChild(messageContent);
        messageDiv.appendChild(contentWrapper);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Trigger fade-in animation
    requestAnimationFrame(() => {
        messageDiv.classList.add('visible');
    });

    return messageDiv;
}

function addMessageTools(messageDiv, content, position) {
    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'message-tools';
    
    const hasError = content.toLowerCase().includes('error') || content.toLowerCase().includes('failed');
    const versions = messageHistory.get(position) || [];
    const currentVersion = currentVersions.get(position) || 0;
    // Only show version navigation if there are actually multiple versions
    const hasMultipleVersions = versions.length > 1;
    
    // Create left and right sections
    const leftSection = document.createElement('div');
    leftSection.className = 'message-tools-left';
    
    const rightSection = document.createElement('div');
    rightSection.className = 'message-tools-right';
    
    // Add tools to left section
    leftSection.innerHTML = `
            <button class="tool-button" title="Like">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
            </button>
            <button class="tool-button" title="Play audio">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
            </button>
            <button class="tool-button" title="Copy">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
            <button class="tool-button" title="${hasError ? 'Retry' : 'Regenerate'}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6"></path>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
            </button>
            ${hasMultipleVersions ? `
            <div class="version-nav">
                <button class="nav-button ${currentVersion > 0 ? 'active' : ''}" 
                        data-action="prev" 
                        ${currentVersion === 0 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <span class="version-counter">${currentVersion + 1}/${versions.length}</span>
                <button class="nav-button ${currentVersion < versions.length - 1 ? 'active' : ''}" 
                        data-action="next" 
                        ${currentVersion === versions.length - 1 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
        ` : ''}`;

    // Add more options button to right section
    rightSection.innerHTML = `
        <button class="tool-button more-options-btn" title="More options">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                </svg>
            </button>
            <div class="more-options">
                <div class="more-option" data-action="delete">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                Delete Message
                </div>
        </div>`;
    
    toolsDiv.appendChild(leftSection);
    toolsDiv.appendChild(rightSection);
    messageDiv.appendChild(toolsDiv);

    // Add audio player container
    const audioPlayerContainer = document.createElement('div');
    audioPlayerContainer.className = 'audio-player';
    audioPlayerContainer.innerHTML = `
            <div class="audio-controls">
                <button class="play-pause-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>
            <div class="seekbar-container">
                <div class="seekbar">
                    <div class="seekbar-fill"></div>
                </div>
                <div class="time-display">
                    <span class="current-time">0:00</span>
                    <span class="total-time">0:00</span>
                </div>
            </div>
            <button class="close-audio">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
    messageDiv.appendChild(audioPlayerContainer);

    // Add event listeners
    toolsDiv.addEventListener('click', async (e) => {
        const target = e.target.closest('.tool-button, .more-option');
        if (!target) return;
    
        e.stopPropagation();

        if (target.classList.contains('tool-button')) {
            const action = target.getAttribute('title')?.toLowerCase();
            switch (action) {
                case 'like':
                    target.classList.toggle('active');
                    break;
                case 'play audio':
                    const formattedText = messageDiv.querySelector('.message-content').textContent;
                    const utterance = new SpeechSynthesisUtterance(formattedText);
                    audioPlayerContainer.classList.add('active');
                    speechSynthesis.speak(utterance);
                    
                    utterance.onend = () => {
                        audioPlayerContainer.classList.remove('active');
                    };
                    break;
                case 'copy':
                    const textToCopy = messageDiv.querySelector('.message-content').textContent;
                    await navigator.clipboard.writeText(textToCopy);
                    target.classList.add('active');
                    setTimeout(() => target.classList.remove('active'), 1000);
                    break;
                case 'retry':
                case 'regenerate':
                    regenerateResponse(content, position);
                    break;
                case 'more options':
                    const moreOptions = target.nextElementSibling;
                    if (moreOptions) {
                        moreOptions.classList.toggle('active');
                    }
                    break;
            }
        } else if (target.classList.contains('more-option')) {
            const action = target.dataset.action;
            if (action === 'delete') {
                const deletePopup = document.createElement('div');
                deletePopup.className = 'delete-popup';
                deletePopup.innerHTML = `
                    <p>Are you sure you want to delete this message?</p>
                    <button class="confirm-delete">Yes</button>
                    <button class="cancel-delete">No</button>
                `;
                
                const moreOptions = target.closest('.more-options');
                moreOptions.appendChild(deletePopup);
                deletePopup.classList.add('active');
                
                // Handle delete
                const confirmDelete = deletePopup.querySelector('.confirm-delete');
                const cancelDelete = deletePopup.querySelector('.cancel-delete');
                
                confirmDelete.addEventListener('click', () => {
                    deleteMessage(messageDiv, position);
                    deletePopup.remove();
                    moreOptions.classList.remove('active');
                });
                
                cancelDelete.addEventListener('click', () => {
                    deletePopup.remove();
                });
            }
        }
    });

    // Handle version navigation
    if (hasMultipleVersions) {
        const versionNav = toolsDiv.querySelector('.version-nav');
        if (versionNav) {
            versionNav.addEventListener('click', (e) => {
                const button = e.target.closest('.nav-button');
                if (!button || button.disabled) return;

                e.stopPropagation();
                const action = button.dataset.action;
                const currentVersion = currentVersions.get(position) || 0;

                if (action === 'prev' && currentVersion > 0) {
                    switchVersion(messageDiv, position, currentVersion - 1);
                } else if (action === 'next' && currentVersion < versions.length - 1) {
                    switchVersion(messageDiv, position, currentVersion + 1);
                }
            });
        }
    }

    // Close audio player
    audioPlayerContainer.querySelector('.close-audio').addEventListener('click', () => {
        audioPlayerContainer.classList.remove('active');
        speechSynthesis.cancel();
    });

    return toolsDiv;
}

function switchVersion(messageDiv, position, newVersion) {
    const versions = messageHistory.get(position);
    if (!versions || newVersion < 0 || newVersion >= versions.length) return;

    // Update content
    const messageContent = messageDiv.querySelector('.message-content');
    if (messageContent) {
        messageContent.innerHTML = marked.parse(versions[newVersion]);
    }
    
    // Update version counter and navigation buttons
    const versionNav = messageDiv.querySelector('.version-nav');
    if (versionNav) {
        const versionCounter = versionNav.querySelector('.version-counter');
        const prevBtn = versionNav.querySelector('[data-action="prev"]');
        const nextBtn = versionNav.querySelector('[data-action="next"]');
        
        if (versionCounter) {
            versionCounter.textContent = `${newVersion + 1}/${versions.length}`;
        }
        
        if (prevBtn) {
            const canGoPrev = newVersion > 0;
            prevBtn.classList.toggle('active', canGoPrev);
            prevBtn.disabled = !canGoPrev;
        }
        
        if (nextBtn) {
            const canGoNext = newVersion < versions.length - 1;
            nextBtn.classList.toggle('active', canGoNext);
            nextBtn.disabled = !canGoNext;
        }
    }
    
    // Update current version in the map
    currentVersions.set(position, newVersion);
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || isSending) return;

    hideWelcomeScreen();
    
    // Create new conversation immediately if this is the first message
    if (!currentConversationId) {
        currentConversationId = generateUniqueId();
        
        // Create initial conversation object with the message as title
        const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
        conversationTitle.textContent = title;
        
        // Create and save initial conversation object
        const conversation = {
            id: currentConversationId,
            title: title,
            messages: [],
            messageHistory: [],
            currentVersions: [],
            timestamp: Date.now(),
            lastUpdated: Date.now()
        };
        conversations.unshift(conversation);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        
        // Update URL with new conversation ID
        const url = new URL(window.location);
        url.searchParams.set('id', currentConversationId);
        window.history.pushState({}, '', url);
        
        // Update conversations list in sidebar
        renderConversationsList();
    }
    
    isSending = true;
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Add user message
    appendMessage(message, true);
    const thinkingMessage = appendMessage('', false);

    try {
        let apiUrl, options;

        if (currentModel === 'gemini_flash') {
            apiUrl = `${GEMINI_FLASH_API_URL}?key=${GEMINI_FLASH_API_KEY}`;
            
            // Include full conversation history for context
            const conversationText = chatHistory.length > 0 ? 
                `Previous conversation:\n${chatHistory
                    .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`)
                    .join('\n')}\n\n` : '';

            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a helpful AI assistant. Please help with the following:\n\n${conversationText}User message:\n${message}`
                        }]
                    }]
                })
            };
        } else {
            // Handle rate limiting for non-Gemini models
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;
            
            if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
                throw new Error(`Please wait ${Math.ceil((RATE_LIMIT_DELAY - timeSinceLastRequest) / 1000)} seconds before sending another message.`);
            }
            
            lastRequestTime = now;
            apiUrl = getApiUrlForModel(currentModel, message, chatHistory);
            options = {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const response = await fetch(apiUrl, options);
        if (!response.ok) {
            throw new Error(response.status === 429 ? 
                'Rate limit exceeded. Please wait a moment before sending another message.' :
                `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const botResponse = getBotResponse(data);
        
        // Remove thinking message and append actual response
        thinkingMessage.remove();
        appendMessage(botResponse, false);
        
        // Add messages to chat history with metadata
        const messageData = { 
            content: message, 
            isUser: true, 
            timestamp: Date.now(),
            type: 'user_message',
            metadata: {
                conversationId: currentConversationId,
                position: Date.now()
            }
        };

        const responseData = { 
            content: botResponse, 
            isUser: false, 
            timestamp: Date.now(),
            type: 'bot_message',
            model: currentModel,
            metadata: {
                conversationId: currentConversationId,
                position: position || Date.now(),
                modelVersion: currentModel,
                regenerationCount: messageHistory.get(position)?.length || 0,
                versions: messageHistory.get(position) || [botResponse],
                currentVersion: currentVersions.get(position) || 0,
                apiResponse: data, // Store the full API response
                requestData: {
                    prompt: message,
                    options: options,
                    timestamp: Date.now()
                }
            }
        };
        
        chatHistory.push(messageData, responseData);
        
        // Trim chat history if needed
        if (chatHistory.length > MAX_HISTORY) {
            chatHistory = chatHistory.slice(-MAX_HISTORY);
        }

        // Save to localStorage
        updateConversationsList();

    } catch (error) {
        console.error('Error:', error);
        thinkingMessage.remove();
        appendMessage(error.message.includes('Rate limit') ? 
            'The AI is a bit busy. Please wait a few seconds and try again.' :
            `Error: ${error.message}`, false);
    } finally {
        isSending = false;
    }
}

// Update getApiUrlForModel to include context
function getApiUrlForModel(model, message, history = []) {
    const encodedMessage = encodeURIComponent(message);
    
    // Only include context for Gemini Flash
    const context = model === 'gemini_flash' && history.length > 0 ? 
        encodeURIComponent(history.map(msg => 
            `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')) : '';
    
    const baseUrl = {
        'claude_sonnet': CLAUDE_SONNET_API_URL,
        'mixtral': MIXTRAL_API_URL,
        'llama3': LLAMA3_API_URL,
        'gemma': GEMMA_API_URL,
        'llama3_70b': LLAMA3_70B_API_URL,
        'gpt4o': GPT4O_API_URL,
        'gpt4omini': GPT4O_MINI_API_URL
    }[model] || GEMINI_REALTIME_API_URL;

    // Only append context parameter if it's not empty
    return context ? 
        `${baseUrl}?text=${encodedMessage}&context=${context}` :
        `${baseUrl}?text=${encodedMessage}`;
}

function getBotResponse(data) {
    if (currentModel === 'gemini_flash') {
        if (data.error) throw new Error(data.error.message || 'API Error');
        return data.candidates[0].content.parts[0].text;
    }
    return data.response || data.message || 'No response from API';
}

async function regenerateResponse(content, position, switchModel = false) {
    if (isSending) return;
    
    isSending = true;

    try {
        // Find the message div and its corresponding user message
        let messageDiv = null;
        let userMessage = null;

        // First try: Find by exact position and content match
        if (position) {
            messageDiv = Array.from(document.querySelectorAll('.message.bot-message')).find(div => {
                const messageContent = div.querySelector('.message-content');
                return messageContent && messageContent.textContent.trim() === content.trim();
            });

            if (messageDiv) {
                // Find the preceding user message in chat history
                const botIndex = chatHistory.findIndex(msg => !msg.isUser && msg.content === content);
                if (botIndex > 0) {
                    userMessage = chatHistory[botIndex - 1].content;
                }
            }
        }

        // Second try: Find by content anywhere in the chat
        if (!messageDiv) {
            const allMessages = Array.from(document.querySelectorAll('.message.bot-message'));
            messageDiv = allMessages.find(div => {
                const messageContent = div.querySelector('.message-content');
                return messageContent && messageContent.textContent.trim() === content.trim();
            });

            if (messageDiv) {
                // Find the preceding user message in DOM
                const messages = Array.from(document.querySelectorAll('.message'));
                const currentIndex = messages.indexOf(messageDiv);
                if (currentIndex > 0) {
                    const userMessageDiv = messages[currentIndex - 1];
                    if (userMessageDiv.classList.contains('user-message')) {
                        userMessage = userMessageDiv.querySelector('.message-content').textContent.trim();
                    }
                }
            }
        }

        if (!messageDiv || !userMessage) {
            throw new Error('Could not find message to regenerate. Please try refreshing the page.');
        }

        // Add thinking state to the message
        messageDiv.classList.add('thinking');
        const messageContent = messageDiv.querySelector('.message-content');
        if (messageContent) {
            messageContent.innerHTML = '<div class="thinking">AI is thinking</div>';
        }

        // Send the request
        let apiUrl, options;

        if (currentModel === 'gemini_flash') {
            apiUrl = `${GEMINI_FLASH_API_URL}?key=${GEMINI_FLASH_API_KEY}`;
            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a helpful AI assistant. Please help with the following:\n\nUser message:\n${userMessage}`
                        }]
                    }]
                })
            };
        } else {
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;
            
            if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
                throw new Error(`Please wait ${Math.ceil((RATE_LIMIT_DELAY - timeSinceLastRequest) / 1000)} seconds before regenerating.`);
            }
            
            lastRequestTime = now;
            apiUrl = getApiUrlForModel(currentModel, userMessage);
            options = {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const response = await fetch(apiUrl, options);
        if (!response.ok) {
            throw new Error(response.status === 429 ? 
                'Rate limit exceeded. Please wait a moment before regenerating.' :
                `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const newResponse = getBotResponse(data);
        
        // Create position if it doesn't exist
        if (!position) {
            position = Date.now();
        }
        
        // Update message history for this position
        if (!messageHistory.has(position)) {
            messageHistory.set(position, [content]); // Store the original content as first version
        }
        messageHistory.get(position).push(newResponse);
        const newVersionIndex = messageHistory.get(position).length - 1;
        currentVersions.set(position, newVersionIndex);

        // Update the message content
        messageDiv.classList.remove('thinking');
        if (messageContent) {
            messageContent.innerHTML = marked.parse(newResponse);
        }

        // Remove existing version navigation if it exists
        const existingVersionNav = messageDiv.querySelector('.version-nav');
        if (existingVersionNav) {
            existingVersionNav.remove();
        }

        // Add new version navigation
        const versions = messageHistory.get(position);
        if (versions && versions.length > 1) {
            const toolsDiv = messageDiv.querySelector('.message-tools');
            if (toolsDiv) {
                const leftSection = toolsDiv.querySelector('.message-tools-left');
                const versionNav = document.createElement('div');
                versionNav.className = 'version-nav';
                versionNav.innerHTML = `
                    <button class="nav-button active" data-action="prev">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <span class="version-counter">${versions.length}/${versions.length}</span>
                    <button class="nav-button" data-action="next" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                `;
                
                // Add version navigation event listeners
                versionNav.addEventListener('click', (e) => {
                    const button = e.target.closest('.nav-button');
                    if (!button || button.disabled) return;

                    e.stopPropagation();
                    const action = button.dataset.action;
                    const currentVersion = currentVersions.get(position) || 0;

                    if (action === 'prev' && currentVersion > 0) {
                        switchVersion(messageDiv, position, currentVersion - 1);
                    } else if (action === 'next' && currentVersion < versions.length - 1) {
                        switchVersion(messageDiv, position, currentVersion + 1);
                    }
                });

                leftSection.appendChild(versionNav);
            }
        }

        // Update chat history
        const historyIndex = chatHistory.findIndex(msg => !msg.isUser && msg.content === content);
        if (historyIndex !== -1) {
            chatHistory[historyIndex] = {
                content: newResponse,
                isUser: false,
                timestamp: Date.now(),
                type: 'bot_message',
                model: currentModel,
                metadata: {
                    ...chatHistory[historyIndex].metadata,
                    position: position,
                    regenerationCount: messageHistory.get(position).length,
                    versions: messageHistory.get(position),
                    currentVersion: newVersionIndex,
                    apiResponse: data,
                    requestData: {
                        prompt: userMessage,
                        options: options,
                        timestamp: Date.now()
                    }
                }
            };
        }

        // Save to localStorage
        updateConversationsList();

        if (switchModel) {
            currentModel = data.model || currentModel;
            localStorage.setItem('current_model', currentModel);
            showToast(`Switched to ${currentModel.replace(/_/g, ' ')}`);
        }

    } catch (error) {
        console.error('Regeneration error:', error);
        const messageDiv = document.querySelector('.message.bot-message.thinking');
        if (messageDiv) {
            messageDiv.classList.remove('thinking');
            const messageContent = messageDiv.querySelector('.message-content');
            if (messageContent) {
                messageContent.innerHTML = marked.parse(error.message);
            }
        }
    } finally {
        isSending = false;
    }
}

// Initialize marked options
marked.setOptions({
    breaks: true,
    gfm: true
});

// Mobile optimizations
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    // Prevent double-tap zoom on buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.click();
        });
    });

    // Improve scroll behavior on mobile
    chatMessages.style.WebkitOverflowScrolling = 'touch';

    // Handle mobile keyboard
    chatInput.addEventListener('focus', () => {
        setTimeout(() => {
            window.scrollTo(0, document.body.scrollHeight);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 300);
    });

    window.addEventListener('resize', () => {
        if (document.activeElement === chatInput) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
});

// Add toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    });
}

// Add toast styles to CSS
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 2000;
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
`;
document.head.appendChild(style);

function deleteMessage(messageDiv, position) {
    // Find the user message that preceded this bot message
    const messages = Array.from(chatMessages.querySelectorAll('.message'));
    const currentIndex = messages.indexOf(messageDiv);
    const userMessageDiv = messages[currentIndex - 1];

    // Remove the messages from DOM
    if (userMessageDiv) {
        userMessageDiv.remove();
    }
    messageDiv.remove();

    // Clean up message history and versions
    if (position) {
        messageHistory.delete(position);
        currentVersions.delete(position);
    }

    // Update chat history
    const content = messageDiv.querySelector('.message-content')?.textContent;
    if (content) {
        // Remove both the bot message and its corresponding user message
        const botMessageIndex = chatHistory.findIndex(msg => !msg.isUser && msg.content === content);
        if (botMessageIndex > 0) { // Ensure there's a message before this one
            chatHistory.splice(botMessageIndex - 1, 2); // Remove both messages
        }
    }

    // Update the conversation in localStorage
    updateConversationsList();
}