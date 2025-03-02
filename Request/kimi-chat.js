// DOM Elements
const messagesContainer = document.querySelector('.messages-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const settingsBtn = document.querySelector('.settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.querySelector('.close-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const newChatBtn = document.querySelector('.new-chat-btn');
const conversationList = document.querySelector('.conversation-list');
const modelBadge = document.querySelector('.model-badge');

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
    } else {
        // Load the most recent conversation
        loadConversation(conversations[0].id);
    }
    
    // Add event listeners
    userInput.addEventListener('keydown', handleInputKeydown);
    sendButton.addEventListener('click', handleSendMessage);
    settingsBtn.addEventListener('click', openSettingsModal);
    closeModal.addEventListener('click', closeSettingsModal);
    saveSettingsBtn.addEventListener('click', saveSettings);
    newChatBtn.addEventListener('click', createNewConversation);
    
    // Auto-resize textarea
    userInput.addEventListener('input', autoResizeTextarea);
    
    // Add scroll listener for auto-scrolling
    messagesContainer.addEventListener('scroll', handleScroll);
    
    // Update model badge
    updateModelBadge();
    
    // Check if server is available if proxy is enabled
    if (kimiConfig.useProxy) {
        checkServerAvailability();
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
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.dataset.id = conv.id;
        item.textContent = conv.title;
        item.addEventListener('click', () => loadConversation(conv.id));
        
        if (currentConversation && conv.id === currentConversation.id) {
            item.classList.add('active');
        }
        
        conversationList.appendChild(item);
    });
}

// Append a message to the UI
function appendMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : 'K';
    
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

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message assistant thinking-indicator';
    indicator.innerHTML = `
        <div class="message-avatar">K</div>
        <div class="message-content">
            <div class="thinking-dots">
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(indicator);
    scrollToBottom();
    return indicator;
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
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Process complete SSE lines
                let newBuffer = '';
                const lines = buffer.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // If this is not the last line (which might be incomplete)
                    if (i < lines.length - 1 || buffer.endsWith('\n')) {
                        if (line.startsWith('data:')) {
                            try {
                                // Extract the JSON data
                                const data = line.substring(5).trim();
                                const parsed = JSON.parse(data);
                                
                                // Handle response based on event type
                                if (parsed.event === 'cmpl' && parsed.text !== undefined) {
                                    assistantMessage += parsed.text;
                                    
                                    // Use a global reference to the typing indicator passed from handleSendMessage
                                    if (typingIndicator && typingIndicator.querySelector('.message-content')) {
                                        typingIndicator.querySelector('.message-content').innerHTML = formatMessage(assistantMessage);
                                        
                                        // Auto-scroll if enabled
                                        if (shouldAutoScroll) {
                                            scrollToBottom();
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                            }
                        }
                    } else {
                        // This might be an incomplete line, keep it for the next chunk
                        newBuffer = line;
                    }
                }
                
                buffer = newBuffer;
            }
            
            // If no message content received, throw an error
            if (!assistantMessage) {
                throw new Error('No response content received');
            }
            
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
    const savedConversations = localStorage.getItem('kimiConversations');
    if (savedConversations) {
        try {
            conversations = JSON.parse(savedConversations);
            updateConversationsList();
        } catch (error) {
            console.error('Error loading conversations:', error);
            conversations = [];
        }
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

// Initialize the app
window.addEventListener('load', () => {
    console.log('Kimi Chat interface loaded');
}); 