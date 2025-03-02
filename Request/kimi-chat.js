// DOM Elements
const messagesContainer = document.querySelector('.messages-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const settingsBtn = document.querySelector('.settings-btn');
const deleteAllBtn = document.querySelector('.delete-all-btn');
const settingsModal = document.getElementById('settings-modal');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const closeModal = document.querySelectorAll('.close-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const newChatBtn = document.querySelector('.new-chat-btn');
const conversationList = document.querySelector('.conversation-list');
const modelBadge = document.querySelector('.model-badge');
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
const sidebar = document.querySelector('.sidebar');
const typingStatus = document.querySelector('.typing-status');
const charCount = document.querySelector('.char-count');

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

// Kimi API Configuration
let kimiConfig = {
    model: 'kimi',
    useSearch: true,
    useResearch: false,
    deviceId: '7470186203606840333',
    sessionId: '1731130480464666566',
    trafficId: 'cuh5rgiav1f3eq17cf50',
    endpoint: 'https://kimi.moonshot.cn/api/chat/completions',
    useProxy: false,
    proxyEndpoint: 'http://localhost:3000/kimi-proxy'
};

// App state
let conversations = [];
let currentConversation = null;
let isProcessing = false;
let shouldAutoScroll = true;
let userScrolled = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp);

// Event listeners
function initializeApp() {
    // Load saved settings
    loadSettings();
    
    // Load saved conversations
    loadConversations();
    
    // Create new conversation if none exists
    if (conversations.length === 0) {
        createNewConversation();
        addWelcomeMessage();
    } else {
        // Load the most recent conversation
        loadConversation(conversations[0].id);
    }
    
    // Add event listeners
    userInput.addEventListener('keydown', handleInputKeydown);
    sendButton.addEventListener('click', handleSendMessage);
    settingsBtn.addEventListener('click', openSettingsModal);
    closeModal.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    saveSettingsBtn.addEventListener('click', saveSettings);
    newChatBtn.addEventListener('click', createNewConversation);
    
    // Auto-resize textarea
    userInput.addEventListener('input', autoResizeTextarea);
    messagesContainer.addEventListener('scroll', handleScroll);
    updateModelBadge();
    
    // Check if server is available if proxy is enabled
    if (kimiConfig.useProxy) {
        checkServerAvailability();
    }
    
    // Mobile navigation toggle
    mobileNavToggle.addEventListener('click', toggleSidebar);
    
    // Click outside sidebar to close on mobile
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            e.target !== mobileNavToggle) {
            toggleSidebar();
        }
    });
    
    // Delete all chats functionality
    deleteAllBtn.addEventListener('click', openDeleteModal);
    confirmDeleteBtn.addEventListener('click', deleteAllChats);
    
    // Character counter
    userInput.addEventListener('input', updateCharCount);
    
    // Check if device is iOS and add appropriate class
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        document.body.classList.add('ios-device');
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
    userInput.style.height = userInput.scrollHeight + 'px';
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
        created: new Date().toISOString()
    };
    
    // Add to conversations array
    conversations.unshift(newConversation);
    
    // Save to localStorage
    saveConversations();
    
    // Update the UI
    updateConversationsList();
    
    // Load the new conversation
    loadConversation(newConversation.id);
    
    // Focus the input field
    userInput.focus();
}

// Load a specific conversation
function loadConversation(id) {
    // Find the conversation
    currentConversation = conversations.find(conv => conv.id === id);
    
    if (!currentConversation) {
        console.error('Conversation not found:', id);
        return;
    }
    
    // Update active state in sidebar
    updateActiveConversation(id);
    
    // Clear messages container
    messagesContainer.innerHTML = '';
    
    // Add all messages to the container
    currentConversation.messages.forEach(msg => {
        appendMessage(msg.role, msg.content);
    });
    
    // Scroll to bottom
    scrollToBottom();
}

// Update which conversation is active in the sidebar
function updateActiveConversation(id) {
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === id) {
            item.classList.add('active');
        }
    });
}

// Update the conversation list in the sidebar
function updateConversationsList() {
    conversationList.innerHTML = '';
    
    conversations.forEach(conv => {
        const convEl = document.createElement('div');
        convEl.className = 'conversation-item';
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
        
        convEl.addEventListener('click', () => {
            loadConversation(conv.id);
        });
        
        // Add delete button event listener
        convEl.querySelector('.delete-conversation').addEventListener('click', (e) => {
            deleteConversation(conv.id, e);
        });
        
        conversationList.appendChild(convEl);
    });
}

// Append a message to the UI
function appendMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'Y' : 'K';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Format content if it's from the assistant
    if (role === 'assistant') {
        messageContent.innerHTML = formatMessage(content);
    } else {
        messageContent.textContent = content;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    scrollToBottom();
}

// Show typing indicator with thinking process for Kimi 1.5
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message assistant thinking-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'K';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    // Add thinking process container for Kimi 1.5
    if (kimiConfig.model === 'k1') {
        content.innerHTML = `
            <div class="thinking-process">
                <div class="thinking-header">
                    <span class="thinking-title">Thinking Process</span>
                    <span class="thinking-toggle">▼</span>
                </div>
                <div class="thinking-content">
                    <div class="thinking-events"></div>
                </div>
            </div>
        `;
    } else {
        content.innerHTML = `<div class="typing-indicator"><span>•</span><span>•</span><span>•</span></div>`;
    }
    
    indicator.appendChild(avatar);
    indicator.appendChild(content);
    messagesContainer.appendChild(indicator);
    scrollToBottom();
    return indicator;
}

// Update thinking process for Kimi 1.5
function updateThinkingProcess(indicator, event) {
    if (!indicator || !event || kimiConfig.model !== 'k1') return;
    
    const thinkingEvents = indicator.querySelector('.thinking-events');
    if (!thinkingEvents) return;
    
    // Handle different types of thinking events
    if (event.type === 'thinking') {
        const thoughtElement = document.createElement('div');
        thoughtElement.className = 'thinking-step';
        thoughtElement.textContent = event.content;
        thinkingEvents.appendChild(thoughtElement);
        scrollToBottom();
    }
}

// Process streaming response with thinking events
async function processStreamingResponse(response, typingIndicator) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantMessage = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        let newBuffer = '';
        
        for (const line of lines) {
            if (line.trim()) {
                try {
                    if (line.startsWith('data:')) {
                        const data = JSON.parse(line.substring(5));
                        
                        if (data.event === 'cmpl' && data.text) {
                            assistantMessage += data.text;
                            if (typingIndicator) {
                                const content = typingIndicator.querySelector('.message-content');
                                if (content) {
                                    if (kimiConfig.model === 'k1') {
                                        const thinkingProcess = content.querySelector('.thinking-process');
                                        if (thinkingProcess) {
                                            thinkingProcess.insertAdjacentHTML('beforebegin', formatMessage(data.text));
                                        }
                                    } else {
                                        content.innerHTML = formatMessage(assistantMessage);
                                    }
                                }
                            }
                        } else if (data.event === 'thinking' && kimiConfig.model === 'k1') {
                            updateThinkingProcess(typingIndicator, data);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing SSE data:', e);
                }
            }
        }
        
        if (shouldAutoScroll) {
            scrollToBottom();
        }
    }
    
    return assistantMessage;
}

// Format message with markdown-like styling
function formatMessage(text) {
    return text
        // Bold text with **
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text with *
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks with ```
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Inline code with `
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Headers with #
        .replace(/^# (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*?)$/gm, '<h4>$1</h4>')
        .replace(/^### (.*?)$/gm, '<h5>$1</h5>')
        // Lists
        .replace(/^- (.*?)$/gm, '• $1<br>')
        .replace(/^(\d+)\. (.*?)$/gm, '$1. $2<br>')
        // Paragraphs with two newlines
        .replace(/\n\n/g, '<br><br>')
        // Single newlines
        .replace(/\n/g, '<br>');
}

// Scroll the messages container to the bottom
function scrollToBottom() {
    if (shouldAutoScroll) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 0);
    }
}

// Handle sending a message
async function handleSendMessage() {
    if (isProcessing || !userInput.value.trim()) return;
    
    const userMessage = userInput.value.trim();
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Add user message to UI
    appendMessage('user', userMessage);
    
    // Add user message to conversation
    if (currentConversation) {
        currentConversation.messages.push({
            role: 'user',
            content: userMessage
        });
        
        // Update conversation title if it's the first message
        if (currentConversation.messages.length === 1) {
            currentConversation.title = userMessage.length > 30 
                ? userMessage.substring(0, 30) + '...' 
                : userMessage;
            updateConversationsList();
        }
        
        // Save to localStorage
        saveConversations();
    }
    
    // Enable auto-scrolling for the response
    shouldAutoScroll = true;
    userScrolled = false;
    
    // Process the message
    isProcessing = true;
    const typingIndicator = showTypingIndicator();
    
    try {
        const response = await sendToKimi(userMessage, typingIndicator);
        
        // Remove typing indicator
        typingIndicator.remove();
        
        // Add assistant response to UI
        appendMessage('assistant', response.content);
        
        // Add assistant response to conversation
        if (currentConversation) {
            currentConversation.messages.push({
                role: 'assistant',
                content: response.content
            });
            
            // Save to localStorage
            saveConversations();
        }
    } catch (error) {
        console.error('Error handling message:', error);
        
        // Remove typing indicator
        typingIndicator.remove();
        
        // Show error message if not already shown (prevent duplicates)
        if (!document.querySelector('.system-message.error')) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'system-message error';
            errorDiv.innerHTML = `<p>Error: ${error.message}</p>
                               <p>Please check your settings and try again.</p>`;
            messagesContainer.appendChild(errorDiv);
            scrollToBottom();
        }
    } finally {
        isProcessing = false;
    }
}

// Send message to Kimi API
async function sendToKimi(message, typingIndicator) {
    // Check server availability first
    await checkServerAvailability();
    
    // Ensure we're using the correct endpoint
    const baseEndpoint = kimiConfig.useProxy ? kimiConfig.proxyEndpoint : 'https://kimi.moonshot.cn/api/chat/cv2840f6o68qmpt16krg/completion/stream';
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Add proxy-specific headers
    if (kimiConfig.useProxy) {
        headers['Target-URL'] = 'https://kimi.moonshot.cn/api/chat/cv2840f6o68qmpt16krg/completion/stream';
    } else {
        // Direct API headers
        headers['Origin'] = 'https://kimi.moonshot.cn';
        headers['Referer'] = 'https://kimi.moonshot.cn/chat/cv2840f6o68qmpt16krg';
        headers['x-language'] = 'en-US';
        headers['x-msh-platform'] = 'web';
        // Add authorization token for direct API access
        headers['Authorization'] = 'Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc0NzA2NDMyMywiaWF0IjoxNzM5Mjg4MzIzLCJqdGkiOiJjdWxtdTBzcmlpY2RwZmo3c3FzMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJjdWg1cmdpYXYxZjNlcTE3Y2Y1MCIsInNwYWNlX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNGciLCJhYnN0cmFjdF91c2VyX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNDAiLCJkZXZpY2VfaWQiOiI3NDcwMTg2MjAzNjA2ODQwMzMzIn0.vIdmw4H-uLl5gYo1ERok62c3QC6KeAzi_RvU0h-1DVM7DGQkPSH-nGhNiKuPmNzucq2qtn5We52rO7kedXuC1A';
    }
    
    // Add Kimi-specific headers
    if (kimiConfig.deviceId) {
        headers['x-msh-device-id'] = kimiConfig.deviceId;
    }
    if (kimiConfig.sessionId) {
        headers['x-msh-session-id'] = kimiConfig.sessionId;
    }
    if (kimiConfig.trafficId) {
        headers['x-traffic-id'] = kimiConfig.trafficId;
    }
    
    // Build message history from current conversation
    const messageHistory = [];
    
    // Include conversation history (limit to last 10 messages for performance)
    if (currentConversation && currentConversation.messages.length > 0) {
        const recentMessages = currentConversation.messages.slice(-10);
        recentMessages.forEach(msg => {
            messageHistory.push({
                role: msg.role,
                content: msg.content
            });
        });
    } else {
        // Add the current message if no history exists
        messageHistory.push({
            role: 'user',
            content: message
        });
    }
    
    // Prepare the request body according to Kimi API format
    const body = {
        model: kimiConfig.model,
        stream: true,
        messages: messageHistory,
        parameters: {
            temperature: 0.7,
            top_p: 0.9,
            presence_penalty: 0,
            frequency_penalty: 0,
            use_search: kimiConfig.useSearch,
            use_research: kimiConfig.useResearch
        }
    };
    
    // Log request details
    console.log('Sending request to:', baseEndpoint);
    console.log('Headers:', headers);
    console.log('Body:', body);
    
    // For streaming response
    let assistantMessage = '';
    
    // For handling errors
    try {
        // First check if endpoint is reachable
        let response;
        try {
            console.log('Attempting to connect to:', baseEndpoint);
            response = await fetchWithTimeout(baseEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
                timeout: 15000 // Allow more time for the actual API call
            });
        } catch (networkError) {
            console.error('Network error:', networkError);
            // Show detailed error in chat
            const errorDiv = document.createElement('div');
            errorDiv.className = 'system-message error';
            if (networkError.message.includes('timeout')) {
                errorDiv.innerHTML = `<p>Request timed out. The server took too long to respond.</p>
                                    <p>Please try again or check your connection.</p>`;
            } else if (networkError.message.includes('Failed to fetch')) {
                errorDiv.innerHTML = `<p>Unable to connect to Kimi API.</p>
                                    <p>Please check your internet connection and ensure the endpoint is accessible.</p>
                                    <p>Endpoint: ${baseEndpoint}</p>`;
            } else {
                errorDiv.innerHTML = `<p>Network error: ${networkError.message}</p>
                                    <p>Please check your connection and try again.</p>`;
            }
            messagesContainer.appendChild(errorDiv);
            scrollToBottom();
            throw new Error(`Failed to connect to Kimi API: ${networkError.message}`);
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Kimi API error: HTTP ${response.status}`, errorText);
            
            // Display detailed error message based on status code
            const errorDiv = document.createElement('div');
            errorDiv.className = 'system-message error';
            
            switch (response.status) {
                case 404:
                    errorDiv.innerHTML = `<p>Error 404: API endpoint not found</p>
                                        <p>The requested endpoint does not exist: ${baseEndpoint}</p>
                                        <p>Please check your API configuration.</p>`;
                    break;
                case 401:
                    errorDiv.innerHTML = `<p>Error 401: Unauthorized</p>
                                        <p>Please check your API token or authentication settings.</p>`;
                    break;
                case 403:
                    errorDiv.innerHTML = `<p>Error 403: Forbidden</p>
                                        <p>You don't have permission to access this resource.</p>`;
                    break;
                case 429:
                    errorDiv.innerHTML = `<p>Error 429: Too Many Requests</p>
                                        <p>Please wait a moment before trying again.</p>`;
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    errorDiv.innerHTML = `<p>Error ${response.status}: Server Error</p>
                                        <p>The Kimi API server is experiencing issues. Please try again later.</p>`;
                    break;
                default:
                    errorDiv.innerHTML = `<p>Error from Kimi API: ${response.status} ${response.statusText}</p>
                                        <p>Response: ${errorText}</p>
                                        <p>Try refreshing the page or checking your settings.</p>`;
            }
            
            messagesContainer.appendChild(errorDiv);
            scrollToBottom();
            
            throw new Error(`Failed to get response: HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        // Check if we have a streaming response
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
            assistantMessage = await processStreamingResponse(response, typingIndicator);
            
            return { content: assistantMessage };
        } else {
            // Handle non-streaming response
            const data = await response.json();
            return { content: data.message || 'No content available' };
        }
    } catch (error) {
        console.error('Kimi API error:', error);
        throw new Error(`Failed to get response: ${error.message}`);
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

// Toggle sidebar on mobile
function toggleSidebar() {
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
}

// Delete a specific conversation
function deleteConversation(id, event) {
    event.stopPropagation(); // Prevent triggering conversation selection
    
    // Get conversations from localStorage
    let conversations = JSON.parse(localStorage.getItem('kimiConversations') || '[]');
    
    // Filter out the conversation to delete
    conversations = conversations.filter(conv => conv.id !== id);
    
    // Save back to localStorage
    localStorage.setItem('kimiConversations', JSON.stringify(conversations));
    
    // Update UI
    updateConversationsList();
    
    // If it was the active conversation, create a new one
    if (currentConversation && currentConversation.id === id) {
        createNewConversation();
    }
}

// Open delete confirmation modal
function openDeleteModal() {
    deleteConfirmModal.classList.add('active');
}

// Close delete confirmation modal
function closeDeleteModal() {
    deleteConfirmModal.classList.remove('active');
}

// Delete all chats
function deleteAllChats() {
    // Clear localStorage conversations
    localStorage.removeItem('kimiConversations');
    
    // Clear conversation list UI
    conversationList.innerHTML = '';
    
    // Create a new conversation
    createNewConversation();
    
    // Clear messages
    messagesContainer.innerHTML = '';
    
    // Add welcome message
    addWelcomeMessage();
    
    // Close modal
    closeDeleteModal();
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// Add welcome message
function addWelcomeMessage() {
    const welcomeHtml = `
        <div class="welcome-message">
            <h2>Welcome to Kimi Chat</h2>
            <p>Start a conversation with Kimi, your AI assistant.</p>
            <div class="suggestion-chips">
                <button class="suggestion-chip">What can you help me with?</button>
                <button class="suggestion-chip">Show me an example</button>
            </div>
        </div>
    `;
    messagesContainer.innerHTML = welcomeHtml;
    
    // Add event listeners to suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            userInput.value = chip.textContent;
            handleSendMessage();
        });
    });
}

// Character counter
function updateCharCount() {
    const maxChars = 4000;
    const currentChars = userInput.value.length;
    charCount.textContent = `${currentChars}/${maxChars}`;
    
    // Add warning color when approaching limit
    if (currentChars > maxChars * 0.9) {
        charCount.style.color = 'var(--color-warning)';
    } else if (currentChars > maxChars) {
        charCount.style.color = 'var(--color-error)';
    } else {
        charCount.style.color = 'var(--color-text-lighter)';
    }
}

// Initialize the app
window.addEventListener('load', () => {
    console.log('Kimi Chat interface loaded');
}); 