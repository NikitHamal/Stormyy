// DOM Elements
const messagesContainer = document.querySelector('.messages-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const settingsBtn = document.querySelector('.settings-btn');
const deleteAllBtn = document.querySelector('.delete-all-btn');
const settingsModal = document.getElementById('settings-modal');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const closeModalBtns = document.querySelectorAll('.close-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const newChatBtn = document.querySelector('.new-chat-btn');
const conversationList = document.querySelector('.conversation-list');
const modelBadge = document.querySelector('.model-badge');
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
const closeSidebarBtn = document.querySelector('.close-sidebar-btn');
const sidebar = document.querySelector('.sidebar');
const typingStatus = document.querySelector('.typing-status');
const charCount = document.querySelector('.char-count');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const suggestionChips = document.querySelectorAll('.suggestion-chip');

// Utility functions
const fetchWithTimeout = (url, options = {}) => {
    const { timeout = 8000, ...fetchOptions } = options;
    return Promise.race([
        fetch(url, fetchOptions),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
    ]);
};

// Debounce function to prevent excessive function calls
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// Kimi API Configuration
let kimiConfig = {
    model: 'kimi',
    useSearch: true,
    useResearch: false,
    deviceId: '7470186203606840333',
    sessionId: '1731130480464666566',
    trafficId: 'cuh5rgiav1f3eq17cf50',
    endpoint: 'https://kimi.moonshot.cn/api/chat/completions',
    apiBaseUrl: 'https://kimi.moonshot.cn/api',
    useProxy: false,
    proxyEndpoint: 'http://localhost:3000/kimi-proxy',
    authorization: 'Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc0MzYwMTM5MywiaWF0IjoxNzQxMDA5MzkzLCJqdGkiOiJjdjJyM3NlczFyaDZrcDU5YmVhMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJjdWg1cmdpYXYxZjNlcTE3Y2Y1MCIsInNwYWNlX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNGciLCJhYnN0cmFjdF91c2VyX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNDAiLCJzc2lkIjoiMTczMTEzMDQ4MDQ2NDY2NjU2NiIsImRldmljZV9pZCI6Ijc0NzAxODYyMDM2MDY4NDAzMzMifQ.88AudKg4StX9pdMJeBW0Vmpcmfu5sTjBygADw5H74fz3fS1vZ_2W6hNKKkX-5Ar4Okd1MoE6IVr7o6sjC8a84w'
};

// App state
let conversations = [];
let currentConversation = null;
let isProcessing = false;
let shouldAutoScroll = true;
let userScrolled = false;
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp);

// Event listeners
function initializeApp() {
    // Check if device is iOS and add appropriate class
    if (isIOS) {
        document.body.classList.add('ios-device');
    }
    
    // Load saved settings
    loadSettings();
    
    // Load saved conversations
    loadConversations();
    
    // Create new conversation if none exists
    if (conversations.length === 0) {
        createNewConversation();
    } else {
        // Load the most recent conversation
        loadConversation(conversations[0].id);
    }
    
    // Add event listeners
    initEventListeners();
    
    // Auto-resize textarea
    userInput.addEventListener('input', autoResizeTextarea);
    
    // Handle scroll events
    messagesContainer.addEventListener('scroll', handleScroll);
    
    // Update model badge
    updateModelBadge();
    
    // Fix for iOS viewport height issues
    if (isIOS) {
        fixIOSViewportHeight();
        window.addEventListener('resize', fixIOSViewportHeight);
        window.addEventListener('orientationchange', fixIOSViewportHeight);
    }
    
    // Check if server is available if proxy is enabled
    if (kimiConfig.useProxy) {
        checkServerAvailability();
    }
    
    // Add a welcome message after a small delay for a better UX
    setTimeout(addWelcomeMessage, 100);
}

// iOS height fix
function fixIOSViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Initialize event listeners with iOS optimizations
function initEventListeners() {
    // User input events
    userInput.addEventListener('input', autoResizeTextarea);
    userInput.addEventListener('input', updateCharCount);
    userInput.addEventListener('keydown', handleInputKeydown);
    
    // Send button
    sendButton.addEventListener('click', handleSendMessage);
    
    // Sidebar toggle
    mobileNavToggle.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', toggleSidebar);
    }
    
    // New chat button
    newChatBtn.addEventListener('click', createNewConversation);
    
    // Suggestion chips - use touchend for iOS
    suggestionChips.forEach(chip => {
        if (isIOS) {
            chip.addEventListener('touchend', (e) => {
                e.preventDefault();
                userInput.value = chip.textContent;
                handleSendMessage();
            });
        } else {
        chip.addEventListener('click', () => {
            userInput.value = chip.textContent;
            handleSendMessage();
        });
        }
    });
    
    // Settings modal events
    settingsBtn.addEventListener('click', openSettingsModal);
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal.id === 'settings-modal') {
                closeSettingsModal();
            } else if (modal.id === 'delete-confirm-modal') {
                closeDeleteModal();
            }
        });
    });
    
    saveSettingsBtn.addEventListener('click', saveSettings);
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    }
    
    // Delete all chats button
    deleteAllBtn.addEventListener('click', openDeleteModal);
    
    // Delete confirmation modal events
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    confirmDeleteBtn.addEventListener('click', deleteAllChats);
    
    // Handle clicks outside sidebar on mobile
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            e.target !== mobileNavToggle) {
            toggleSidebar();
        }
    });
    
    // Prevent iOS rubber-banding/bouncing effect
    if (isIOS) {
        document.body.addEventListener('touchmove', function(e) {
            if (e.target.closest('.messages-container, .conversation-list, .modal-body')) {
                const scrollContainer = e.target.closest('.messages-container, .conversation-list, .modal-body');
                const isAtTop = scrollContainer.scrollTop <= 0;
                const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 1;
                
                if ((isAtTop && e.touches[0].screenY > e.touches[0].screenY) || 
                    (isAtBottom && e.touches[0].screenY < e.touches[0].screenY)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    }
}

// Handle scroll events for auto-scrolling
function handleScroll() {
    // Calculate if we're at the bottom
    const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 50;
    
    // If user scrolled up manually, disable auto-scrolling
    if (!isAtBottom && !userScrolled) {
        userScrolled = true;
        shouldAutoScroll = false;
    }
    
    // If user scrolled back to bottom, re-enable auto-scrolling
    if (isAtBottom && userScrolled) {
        userScrolled = false;
        shouldAutoScroll = true;
    }
}

// Auto-resize textarea as user types
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    const newHeight = Math.min(140, userInput.scrollHeight);
    userInput.style.height = newHeight + 'px';
}

// Handle Enter key to send message (but allow Shift+Enter for new lines)
function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
}

// Create a new chat conversation
function createNewConversation() {
    const newConversation = {
        id: generateId(),
        title: 'New Conversation',
        messages: [],
        created: new Date().toISOString(),
        kimiChatId: null // Add a field to store the Kimi chat ID
    };
    
    // Add to conversations array
    conversations.unshift(newConversation);
    
    // Save to localStorage
    saveConversations();
    
    // Update the UI
    updateConversationsList();
    
    // Load the new conversation
    loadConversation(newConversation.id);
    
    // Focus the input field - on iOS, delay focus to avoid keyboard issues
    if (isIOS) {
        setTimeout(() => userInput.focus(), 100);
    } else {
    userInput.focus();
    }
}

// Load a specific conversation
function loadConversation(id) {
    // Find the conversation
    currentConversation = conversations.find(conv => conv.id === id);
    
    if (!currentConversation) {
        console.error('Conversation not found:', id);
        // Create a new conversation if the requested one doesn't exist
        createNewConversation();
        return;
    }
    
    // Update active state in sidebar
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === id) {
            item.classList.add('active');
        }
    });
    
    // Clear messages container
    messagesContainer.innerHTML = '';
    
    // Add all messages to the container
    if (currentConversation.messages.length > 0) {
    currentConversation.messages.forEach(msg => {
        appendMessage(msg.role, msg.content);
    });
    } else {
        // Add welcome message if the conversation is empty
        setTimeout(addWelcomeMessage, 100);
    }
    
    // Scroll to bottom
    scrollToBottom();
    
    // Close sidebar on mobile after loading conversation
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }
}

// Update the conversation list in the sidebar
function updateConversationsList() {
    conversationList.innerHTML = '';
    
    conversations.forEach(conv => {
        const convEl = document.createElement('div');
        convEl.className = 'conversation-item';
        convEl.dataset.id = conv.id;
        
        if (currentConversation && conv.id === currentConversation.id) {
            convEl.classList.add('active');
        }
        
        convEl.innerHTML = `
            <span class="conversation-title">${conv.title}</span>
            <button class="delete-conversation" aria-label="Delete conversation">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        // Add click event for loading conversation
        convEl.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-conversation')) {
                loadConversation(conv.id);
            }
        });
        
        // Add delete button event listener
        convEl.querySelector('.delete-conversation').addEventListener('click', (e) => {
            deleteConversation(conv.id, e);
        });
        
        conversationList.appendChild(convEl);
    });
}

// Append a message to the chat
function appendMessage(role, content) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    
    // Create a simpler message structure
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Add role indicator (just for user messages to keep UI cleaner)
    if (role === 'user') {
        const roleIndicator = document.createElement('div');
        roleIndicator.className = 'message-role';
        roleIndicator.textContent = 'You';
        messageEl.appendChild(roleIndicator);
    }
    
    // Format the content
    messageContent.innerHTML = formatMessage(content);
    
    messageEl.appendChild(messageContent);
    messagesContainer.appendChild(messageEl);
    
    // Scroll to the new message
    if (shouldAutoScroll) {
    scrollToBottom();
    }
}

// Show typing indicator while waiting for response
function showTypingIndicator() {
    // Create a typing indicator element
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message assistant thinking-bubble';
    typingIndicator.innerHTML = `
        <div class="message-content">
            <div class="thinking-dots">
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
            </div>
        </div>
    `;
    
    // Add to messages container
    messagesContainer.appendChild(typingIndicator);
    
    // Scroll to show the typing indicator
    scrollToBottom();
    
    // Return the element so it can be removed later
    return typingIndicator;
}

// Format message with Markdown-like syntax
function formatMessage(text) {
    // Basic formatting for code, bold, italic, etc.
    // This is a simplified version - for production, use a proper Markdown parser
    
    // Process code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Process inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Process bold text
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Process italic text
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Process links - simplified
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Process paragraphs (double newlines)
    text = text.replace(/\n\n/g, '</p><p>');
    
    // Wrap in paragraph tags
    return `<p>${text}</p>`;
}

// Scroll to the bottom of the messages container
function scrollToBottom() {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Handle sending a message
async function handleSendMessage() {
    const message = userInput.value.trim();
    
    // Don't send empty messages
    if (!message || isProcessing) {
        return;
    }
    
    // Disable input during processing
    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;
    
    // On iOS, blur the input to hide keyboard
    if (isIOS) {
        userInput.blur();
    }
    
    // Clear the input field
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Reset char count
    updateCharCount();
    
    // Remove welcome message if it exists
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    // Add user message to UI
    appendMessage('user', message);
    
    // Add to conversation
    if (!currentConversation) {
        createNewConversation();
    }
    
        currentConversation.messages.push({
            role: 'user',
        content: message
        });
        
    // Update conversation title if this is the first message
        if (currentConversation.messages.length === 1) {
        currentConversation.title = message.length > 30 ? message.substring(0, 30) + '...' : message;
            updateConversationsList();
        
        // Create a new chat session with Kimi API for first message
        try {
            const chatId = await createKimiChatSession(message);
            if (chatId) {
                currentConversation.kimiChatId = chatId;
                console.log(`Created new Kimi chat session with ID: ${chatId}`);
                saveConversations();
            }
        } catch (error) {
            console.error('Failed to create Kimi chat session:', error);
        }
        }
        
        // Save to localStorage
        saveConversations();
    
    // Show typing indicator
    const typingIndicator = showTypingIndicator();
    
    try {
        // Send to Kimi API
        await sendToKimi(message, typingIndicator);
    } catch (error) {
        console.error('Error during Kimi communication:', error);
        
        // Remove typing indicator
        if (typingIndicator.parentNode) {
            messagesContainer.removeChild(typingIndicator);
        }
        
        // Add error message
        appendMessage('assistant', 'I apologize, but there was an error processing your request. Please try again later.');
        
        // Add to conversation
                currentConversation.messages.push({
                    role: 'assistant',
            content: 'I apologize, but there was an error processing your request. Please try again later.'
                });
                
        // Save conversation with error
                saveConversations();
            }
    
    // Re-enable input
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    
    // On mobile, focus with a delay to avoid iOS issues
    if (window.innerWidth > 768 || !isIOS) {
        userInput.focus();
    }
}

// Create a new chat session with Kimi API
async function createKimiChatSession(firstMessage) {
    try {
        const endpoint = kimiConfig.useProxy ? 
            `${kimiConfig.proxyEndpoint}/chat` : 
            `${kimiConfig.apiBaseUrl}/chat`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': kimiConfig.authorization,
            'x-msh-device-id': kimiConfig.deviceId,
            'x-msh-session-id': kimiConfig.sessionId,
            'x-traffic-id': kimiConfig.trafficId,
            'x-msh-platform': 'web',
            'x-language': 'en-US',
            'r-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        const payload = {
            "name": firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage,
            "born_from": "chat",
            "kimiplus_id": kimiConfig.model === 'k1' ? 'k1' : 'kimi',
            "is_example": false,
            "source": "web",
            "tags": []
        };
        
        const response = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create chat session: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Return the chat ID
        return data.id;
    } catch (error) {
        console.error('Error creating chat session:', error);
        throw error;
    }
}

// Send message to Kimi API
async function sendToKimi(message, typingIndicator) {
    try {
        // Prepare the API request
        const endpoint = kimiConfig.useProxy ? kimiConfig.proxyEndpoint : kimiConfig.endpoint;
        
        // Use chat ID if available
        let chatEndpoint = endpoint;
        if (currentConversation && currentConversation.kimiChatId) {
            chatEndpoint = kimiConfig.useProxy ? 
                `${kimiConfig.proxyEndpoint}/chat/${currentConversation.kimiChatId}/completion/stream` : 
                `${kimiConfig.apiBaseUrl}/chat/${currentConversation.kimiChatId}/completion/stream`;
        }
    
    const headers = {
        'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': kimiConfig.authorization,
            'x-msh-device-id': kimiConfig.deviceId,
            'x-msh-session-id': kimiConfig.sessionId,
            'x-traffic-id': kimiConfig.trafficId,
            'x-msh-platform': 'web',
            'x-language': 'en-US'
        };
    
    // Build message history from current conversation
    const messageHistory = [];
    
    if (currentConversation && currentConversation.messages.length > 0) {
        const recentMessages = currentConversation.messages.slice(-10);
        recentMessages.forEach(msg => {
            messageHistory.push({
                role: msg.role,
                content: msg.content
            });
        });
    }
    
        const requestData = {
        messages: messageHistory,
            model: kimiConfig.model === 'k1' ? 'k1' : 'kimi',
        stream: true,
            use_search: kimiConfig.useSearch,
            use_research: kimiConfig.useResearch
        };
        
        // Show typing status
        typingStatus.textContent = 'Kimi is typing...';
        
        // Make the API request
        const response = await fetchWithTimeout(chatEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData),
            timeout: 30000 // 30-second timeout
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        // Process streaming response
        await processStreamingResponse(response, typingIndicator);
        
        // Clear typing status
        typingStatus.textContent = '';
        
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Process streaming response from the API
async function processStreamingResponse(response, typingIndicator) {
    // Get a reader from the response body
    const reader = response.body.getReader();
    let accumulator = '';
    let responseText = '';
    
    // Create a new assistant message element
    const messageEl = document.createElement('div');
    messageEl.className = 'message assistant';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = '<p></p>';
    
    messageEl.appendChild(messageContent);
    
    // Process the stream
    try {
        let firstChunk = true;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }
            
            // Convert the chunk to text
            const chunk = new TextDecoder('utf-8').decode(value);
            accumulator += chunk;
            
            // Split by data: prefixes (SSE format)
            const dataItems = accumulator.split('data: ');
            
            // Process complete data items
            for (let i = 0; i < dataItems.length - 1; i++) {
                let dataItem = dataItems[i].trim();
                
                if (dataItem) {
                    try {
                        const jsonData = JSON.parse(dataItem);
                        console.log("Received data:", jsonData);
                        
                        // Handle different event types
                        if (jsonData.event === 'cmpl' && jsonData.text) {
                            responseText += jsonData.text;
                            
                            // On first chunk, replace the typing indicator with the actual message
                            if (firstChunk) {
                                messagesContainer.replaceChild(messageEl, typingIndicator);
                                firstChunk = false;
                            }
                            
                            // Update the message content with formatted text
                            messageContent.innerHTML = formatMessage(responseText);
                            
                            // Scroll to bottom if needed
                            if (shouldAutoScroll) {
        scrollToBottom();
                            }
                        } else if (jsonData.event === 'done' || jsonData.event === 'all_done') {
                            console.log("Stream completed");
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e, dataItem);
                    }
                }
            }
            
            // Keep the incomplete part
            accumulator = dataItems[dataItems.length - 1];
        }
        
        // If we never received any content, remove the typing indicator
        if (firstChunk) {
            messagesContainer.removeChild(typingIndicator);
        }
        
        // Add the final message to the conversation
        if (responseText) {
            currentConversation.messages.push({
                role: 'assistant',
                content: responseText
            });
            
            // Save to localStorage
            saveConversations();
        }
        
    } catch (error) {
        console.error('Error processing stream:', error);
        
        // Remove the typing indicator
        if (typingIndicator.parentNode) {
            messagesContainer.removeChild(typingIndicator);
        }
        
        throw error;
    }
}

// Settings functions
function openSettingsModal() {
    loadSettingsToForm();
    settingsModal.classList.add('active');
}

function closeSettingsModal() {
    settingsModal.classList.remove('active');
}

function loadSettingsToForm() {
    document.getElementById('model-select').value = kimiConfig.model;
    document.getElementById('web-search').checked = kimiConfig.useSearch;
    document.getElementById('research-mode').checked = kimiConfig.useResearch;
    document.getElementById('device-id').value = kimiConfig.deviceId;
    document.getElementById('session-id').value = kimiConfig.sessionId;
    document.getElementById('traffic-id').value = kimiConfig.trafficId;
    document.getElementById('use-proxy').checked = kimiConfig.useProxy;
    document.getElementById('proxy-endpoint').value = kimiConfig.proxyEndpoint;
}

function saveSettings() {
    kimiConfig.model = document.getElementById('model-select').value;
    kimiConfig.useSearch = document.getElementById('web-search').checked;
    kimiConfig.useResearch = document.getElementById('research-mode').checked;
    kimiConfig.deviceId = document.getElementById('device-id').value;
    kimiConfig.sessionId = document.getElementById('session-id').value;
    kimiConfig.trafficId = document.getElementById('traffic-id').value;
    kimiConfig.useProxy = document.getElementById('use-proxy').checked;
    kimiConfig.proxyEndpoint = document.getElementById('proxy-endpoint').value;
    
    // Save to localStorage
    localStorage.setItem('kimiConfig', JSON.stringify(kimiConfig));
    
    // Update UI
    updateModelBadge();
    
    // Close modal
    closeSettingsModal();
}

function updateModelBadge() {
    modelBadge.textContent = kimiConfig.model === 'k1' ? 'Kimi 1.5' : 'Kimi';
}

// Load settings from localStorage
function loadSettings() {
    const savedConfig = localStorage.getItem('kimiConfig');
    if (savedConfig) {
        try {
            const parsedConfig = JSON.parse(savedConfig);
            kimiConfig = { ...kimiConfig, ...parsedConfig };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

// Load conversations from localStorage
function loadConversations() {
    try {
        const savedConversations = localStorage.getItem('kimiConversations');
        conversations = savedConversations ? JSON.parse(savedConversations) : [];
        
        if (conversations.length > 0) {
            updateConversationsList();
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
        conversations = [];
    }
}

// Save conversations to localStorage
function saveConversations() {
    localStorage.setItem('kimiConversations', JSON.stringify(conversations));
}

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Check if the server is available
async function checkServerAvailability() {
    console.log('Checking server availability...');
    
    // If proxy is not enabled, no need to check
    if (!kimiConfig.useProxy) {
        console.log('Proxy server not in use, using direct API access');
        return true;
    }
    
    try {
        const response = await fetchWithTimeout(kimiConfig.proxyEndpoint + '/health', {
            method: 'GET',
            timeout: 3000 // Short timeout for quick checks
        });
        
        if (response.ok) {
            console.log('Proxy server is available');
            return true;
        } else {
            console.warn('Proxy server responded with error:', response.status);
            // Automatically switch to direct API access
            kimiConfig.useProxy = false;
            updateSettingsUI();
            return false;
        }
    } catch (error) {
        console.error('Failed to connect to proxy server:', error);
        // Automatically switch to direct API access
        kimiConfig.useProxy = false;
        updateSettingsUI();
        
        // Show notification to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'system-message warning';
        errorDiv.innerHTML = `<p>Proxy server is not available. Switched to direct API access.</p>`;
        messagesContainer.appendChild(errorDiv);
        scrollToBottom();
        
        return false;
    }
}

// Update settings UI elements based on current config
function updateSettingsUI() {
    // Update UI elements to reflect current configuration
    document.getElementById('model-select').value = kimiConfig.model;
    document.getElementById('web-search').checked = kimiConfig.useSearch;
    document.getElementById('research-mode').checked = kimiConfig.useResearch;
    document.getElementById('device-id').value = kimiConfig.deviceId;
    document.getElementById('session-id').value = kimiConfig.sessionId;
    document.getElementById('traffic-id').value = kimiConfig.trafficId;
    document.getElementById('use-proxy').checked = kimiConfig.useProxy;
    document.getElementById('proxy-endpoint').value = kimiConfig.proxyEndpoint;
    
    // Update model badge
    updateModelBadge();
    
    // Save settings to localStorage
    localStorage.setItem('kimiConfig', JSON.stringify(kimiConfig));
}

// Toggle sidebar with proper iOS support
function toggleSidebar() {
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
    
    console.log('Sidebar toggle clicked, new state:', sidebar.classList.contains('active') ? 'open' : 'closed');
    
    // For iOS, ensure proper scroll behavior when toggling
    if (isIOS && sidebar.classList.contains('active')) {
        // Prevent background scrolling when sidebar is open
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    } else if (isIOS) {
        // Restore scrolling when sidebar is closed
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }
}

// Delete a specific conversation
function deleteConversation(id, event) {
    event.stopPropagation(); // Prevent triggering conversation selection
    
    // Filter out the conversation to delete from the global conversations array
    conversations = conversations.filter(conv => conv.id !== id);
    
    // Save to localStorage
    saveConversations();
    
    // Update UI
    updateConversationsList();
    
    // If it was the active conversation, create a new one
    if (currentConversation && currentConversation.id === id) {
        createNewConversation();
    }
}

// Open delete confirmation modal
function openDeleteModal() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Close delete confirmation modal
function closeDeleteModal() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Delete all chats
function deleteAllChats() {
    try {
        // Clear localStorage
        localStorage.removeItem('kimiConversations');
        
        // Reset conversations array
        conversations = [];
        currentConversation = null;
        
        // Clear UI
        conversationList.innerHTML = '';
        messagesContainer.innerHTML = '';
        
        // Create new conversation
        createNewConversation();
        
        // Add welcome message
        addWelcomeMessage();
        
        // Close modal
        closeDeleteModal();
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    } catch (error) {
        console.error('Error deleting all chats:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message system-message error';
        errorMessage.innerHTML = `<p>Error deleting chats: ${error.message}</p>`;
        messagesContainer.appendChild(errorMessage);
        scrollToBottom();
    }
}

// Add welcome message
function addWelcomeMessage() {
    if (!messagesContainer.querySelector('.welcome-message') && 
        (!currentConversation || currentConversation.messages.length === 0)) {
        const welcome = document.createElement('div');
        welcome.className = 'welcome-message';
        welcome.innerHTML = `
            <h2>Welcome to Kimi Chat</h2>
            <p>I'm your AI assistant, ready to help with any questions or tasks you have.</p>
            <div class="suggestion-chips">
                <button class="suggestion-chip">Tell me about yourself</button>
                <button class="suggestion-chip">What can you do?</button>
                <button class="suggestion-chip">Help me with coding</button>
        </div>
    `;
    
    // Add event listeners to suggestion chips
        welcome.querySelectorAll('.suggestion-chip').forEach(chip => {
            if (isIOS) {
                chip.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    userInput.value = chip.textContent;
                    handleSendMessage();
                });
            } else {
        chip.addEventListener('click', () => {
            userInput.value = chip.textContent;
            handleSendMessage();
        });
            }
    });
        
        messagesContainer.appendChild(welcome);
    }
}

// Update character count with safety indicators
function updateCharCount() {
    const count = userInput.value.length;
    charCount.textContent = `${count}/4000`;
    
    // Add warning class when approaching limit
    if (count > 3800) {
        charCount.classList.add('error');
        charCount.classList.remove('warning');
    } else if (count > 3500) {
        charCount.classList.add('warning');
        charCount.classList.remove('error');
    } else {
        charCount.classList.remove('warning', 'error');
    }
}

// Initialize the app
window.addEventListener('load', () => {
    console.log('Kimi Chat interface loaded');
}); 