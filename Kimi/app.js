// DOM Elements
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const settingsBtn = document.querySelector('.settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.querySelector('.close-modal');
const saveSettings = document.getElementById('save-settings');
const newChatBtn = document.querySelector('.new-chat');
const chatHistory = document.querySelector('.chat-history');

// Kimi API Configuration
let kimiConfig = {
    model: 'kimi',
    useSearch: true,
    useResearch: false,
    deviceId: '7470186203606840333',
    sessionId: '1731130480464666566',
    trafficId: 'cuh5rgiav1f3eq17cf50',
    endpoint: 'https://kimi.moonshot.cn/api/chat/completion/stream', // Direct endpoint as fallback
    useProxy: false, // Set to true when using proxy
    proxyEndpoint: 'http://localhost:3000/kimi-proxy' // Proxy endpoint
};

// Chat state
let currentChatId = generateChatId();
let chatMessages = [];
let isProcessing = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeChat);
userInput.addEventListener('keydown', handleInputKeydown);
sendButton.addEventListener('click', handleSendMessage);
settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
closeModal.addEventListener('click', () => settingsModal.classList.remove('active'));
saveSettings.addEventListener('click', saveSettingsHandler);
newChatBtn.addEventListener('click', startNewChat);

// Initialize chat
function initializeChat() {
    loadSettings();
    adjustTextareaHeight();
    loadChatHistory();
    checkServerStatus();
}

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch(kimiConfig.proxyEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Target-URL': 'https://kimi.moonshot.cn/api/ping'
            },
            body: JSON.stringify({})
        });
        
        if (response.ok) {
            console.log('Proxy server is available');
            kimiConfig.useProxy = true;
            return true;
        } else {
            console.log('Proxy server returned an error:', response.status);
            kimiConfig.useProxy = false;
            showProxyWarning();
            return false;
        }
    } catch (error) {
        console.log('Could not connect to proxy server:', error);
        kimiConfig.useProxy = false;
        showProxyWarning();
        return false;
    }
}

// Show proxy server warning
function showProxyWarning() {
    const warning = document.createElement('div');
    warning.style.backgroundColor = '#fff3cd';
    warning.style.color = '#856404';
    warning.style.padding = '10px';
    warning.style.borderRadius = '8px';
    warning.style.margin = '10px 0';
    warning.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    warning.innerHTML = `
        <strong>Proxy Server Not Available</strong>
        <p>The proxy server is not running. Please start the server with:</p>
        <pre style="background:#f8f9fa;padding:8px;border-radius:4px;margin-top:8px;">node server.js</pre>
        <p>The server.js file should be created with the following content:</p>
        <button id="show-server-code" style="background:#3498db;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;margin-top:5px;">Show Server Code</button>
    `;
    
    // Insert after welcome message or at the beginning
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.parentNode.insertBefore(warning, welcomeMessage.nextSibling);
    } else {
        messagesContainer.insertBefore(warning, messagesContainer.firstChild);
    }
    
    // Add event listener for the button
    document.getElementById('show-server-code').addEventListener('click', showServerCode);
}

// Show server code
function showServerCode() {
    const serverCode = `// server.js - Kimi API Proxy Server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Cookies storage
const COOKIES_FILE = path.join(__dirname, 'cookies.json');

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Set cookies
app.post('/set-cookies', (req, res) => {
    const { cookies } = req.body;
    if (!cookies) {
        return res.status(400).json({ error: 'No cookies provided' });
    }
    
    fs.writeFileSync(COOKIES_FILE, JSON.stringify({ cookie: cookies }));
    res.json({ status: 'Cookies saved successfully' });
});

// Get cookies
app.get('/get-cookies', (req, res) => {
    try {
        if (fs.existsSync(COOKIES_FILE)) {
            const cookiesData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
            res.json(cookiesData);
        } else {
            res.json({ cookie: null });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Kimi API proxy
app.post('/kimi-proxy', async (req, res) => {
    const targetUrl = req.headers['target-url'];
    if (!targetUrl) {
        return res.status(400).send('Target URL is required');
    }
    
    // Get request headers and body
    const headers = {};
    for (const key in req.headers) {
        if (key !== 'host' && key !== 'target-url' && key !== 'content-length') {
            headers[key] = req.headers[key];
        }
    }
    
    // Add stored cookies if available
    try {
        if (fs.existsSync(COOKIES_FILE)) {
            const cookiesData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
            if (cookiesData.cookie) {
                headers['cookie'] = cookiesData.cookie;
            }
        }
    } catch (error) {
        console.error('Error reading cookies:', error);
    }
    
    // Authentication headers
    headers['authorization'] = \`Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc0NzA2NDMyMywiaWF0IjoxNzM5Mjg4MzIzLCJqdGkiOiJjdWxtdTBzcmlpY2RwZmo3c3FzMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJjdWg1cmdpYXYxZjNlcTE3Y2Y1MCIsInNwYWNlX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNGciLCJhYnN0cmFjdF91c2VyX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNDAiLCJkZXZpY2VfaWQiOiI3NDcwMTg2MjAzNjA2ODQwMzMzIn0.vIdmw4H-uLl5gYo1ERok62c3QC6KeAzi_RvU0h-1DVM7DGQkPSH-nGhNiKuPmNzucq2qtn5We52rO7kedXuC1A\`;
    
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(req.body)
        });
        
        // Handle streaming response
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
            res.setHeader('Content-Type', 'text/event-stream');
            response.body.pipe(res);
        } else {
            // Handle regular response
            const contentType = response.headers.get('content-type');
            if (contentType) {
                res.setHeader('Content-Type', contentType);
            }
            
            const data = await response.text();
            res.send(data);
        }
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Proxy error: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(\`
=========================================
✅ Kimi Proxy Server is running!
🌐 http://localhost:\${PORT}

📱 You can access the chat interface at:
   http://localhost:\${PORT}/index.html

💡 If you see any errors, make sure you've installed
   all the required packages with:
   npm install express body-parser cors node-fetch@2

=========================================
\`);
});`;

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.padding = '20px';
    
    const content = document.createElement('div');
    content.style.backgroundColor = 'white';
    content.style.borderRadius = '8px';
    content.style.maxWidth = '800px';
    content.style.width = '100%';
    content.style.maxHeight = '90vh';
    content.style.overflow = 'auto';
    content.style.padding = '20px';
    content.style.position = 'relative';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'none';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    
    const title = document.createElement('h2');
    title.textContent = 'Server.js Code';
    title.style.marginBottom = '20px';
    
    const instructions = document.createElement('div');
    instructions.innerHTML = `
        <div style="background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
            <strong>Error Fix:</strong> The error occurs because the required Node.js packages are not installed.
        </div>
        <p style="margin-bottom: 10px;"><strong>Option 1 (Recommended):</strong> Use the package.json file</p>
        <ol style="margin-bottom: 15px;">
            <li>Make sure a valid <code>package.json</code> file exists in your Kimi folder</li>
            <li>Run <code>npm install</code> to install all dependencies</li>
            <li>Run <code>npm start</code> to start the server</li>
        </ol>
        <p style="margin-bottom: 10px;"><strong>Option 2:</strong> Install packages manually</p>
        <p>Run this command to install the specific packages:</p>
        <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 15px; overflow-x: auto;">npm install express body-parser cors node-fetch@2</pre>
        <p><strong>Important:</strong> You must use node-fetch version 2 (not version 3)</p>
    `;
    instructions.style.marginBottom = '20px';
    
    const pre = document.createElement('pre');
    pre.style.backgroundColor = '#f8f9fa';
    pre.style.padding = '15px';
    pre.style.borderRadius = '4px';
    pre.style.overflowX = 'auto';
    pre.style.fontSize = '14px';
    pre.style.lineHeight = '1.5';
    pre.textContent = serverCode;
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy Code';
    copyBtn.style.backgroundColor = '#3498db';
    copyBtn.style.color = 'white';
    copyBtn.style.border = 'none';
    copyBtn.style.padding = '8px 16px';
    copyBtn.style.borderRadius = '4px';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.marginTop = '15px';
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(serverCode);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy Code';
        }, 2000);
    });
    
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(instructions);
    content.appendChild(pre);
    content.appendChild(copyBtn);
    modal.appendChild(content);
    
    document.body.appendChild(modal);
}

// Handle input height adjustment
function adjustTextareaHeight() {
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });
}

// Generate unique chat ID
function generateChatId() {
    return 'chat_' + Date.now();
}

// Start new chat
function startNewChat() {
    currentChatId = generateChatId();
    chatMessages = [];
    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <h1>Welcome to Kimi Chat</h1>
            <p>Your AI assistant powered by advanced language models</p>
        </div>
    `;
    saveChatToHistory();
}

// Save chat to history
function saveChatToHistory() {
    const chatPreview = chatMessages.length > 0 
        ? chatMessages[chatMessages.length - 1].content.substring(0, 30) + '...'
        : 'New Chat';
    
    const historyItem = document.createElement('div');
    historyItem.className = 'chat-history-item';
    historyItem.dataset.chatId = currentChatId;
    historyItem.innerHTML = `
        <i class="fas fa-comment"></i>
        <span>${chatPreview}</span>
    `;
    historyItem.onclick = () => loadChat(currentChatId);
    
    chatHistory.insertBefore(historyItem, chatHistory.firstChild);
}

// Chat history storage
function saveChatToStorage(chatId, messages) {
    const chats = JSON.parse(localStorage.getItem('kimiChats') || '{}');
    chats[chatId] = {
        id: chatId,
        messages: messages,
        lastUpdated: Date.now()
    };
    localStorage.setItem('kimiChats', JSON.stringify(chats));
}

// Load chat history from storage
function loadChatHistory() {
    const chats = JSON.parse(localStorage.getItem('kimiChats') || '{}');
    chatHistory.innerHTML = '';
    
    Object.values(chats)
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
        .forEach(chat => {
            const lastMessage = chat.messages[chat.messages.length - 1];
            const preview = lastMessage ? lastMessage.content.substring(0, 30) + '...' : 'New Chat';
            
            const historyItem = document.createElement('div');
            historyItem.className = 'chat-history-item';
            if (chat.id === currentChatId) {
                historyItem.classList.add('active');
            }
            
            historyItem.innerHTML = `
                <i class="fas fa-comment"></i>
                <span>${preview}</span>
            `;
            historyItem.onclick = () => loadChat(chat.id);
            
            chatHistory.appendChild(historyItem);
        });
}

// Load specific chat
function loadChat(chatId) {
    const chats = JSON.parse(localStorage.getItem('kimiChats') || '{}');
    const chat = chats[chatId];
    
    if (chat) {
        currentChatId = chatId;
        chatMessages = chat.messages;
        
        messagesContainer.innerHTML = '';
        chatMessages.forEach(msg => {
            appendMessage(msg.role, msg.content, msg.rawResponse);
        });
        
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            }
        });
    }
}

// Handle input keydown
function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
}

// Append message with raw response support
function appendMessage(role, content, rawResponse = null) {
    const message = document.createElement('div');
    message.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    const messageActions = document.createElement('div');
    messageActions.className = 'message-actions';
    
    if (rawResponse) {
        const viewRawBtn = document.createElement('button');
        viewRawBtn.className = 'message-action-btn';
        viewRawBtn.innerHTML = '<i class="fas fa-code"></i> View Raw';
        viewRawBtn.onclick = () => toggleRawResponse(message);
        messageActions.appendChild(viewRawBtn);
        
        const rawResponseDiv = document.createElement('div');
        rawResponseDiv.className = 'raw-response';
        rawResponseDiv.textContent = JSON.stringify(rawResponse, null, 2);
        messageContent.appendChild(messageActions);
        messageContent.appendChild(rawResponseDiv);
    }
    
    message.appendChild(avatar);
    message.appendChild(messageContent);
    
    if (messagesContainer.querySelector('.welcome-message')) {
        messagesContainer.innerHTML = '';
    }
    
    messagesContainer.appendChild(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    chatMessages.push({ role, content, rawResponse });
    saveChatToStorage(currentChatId, chatMessages);
}

// Toggle raw response visibility
function toggleRawResponse(messageElement) {
    const rawResponse = messageElement.querySelector('.raw-response');
    const button = messageElement.querySelector('.message-action-btn');
    
    if (rawResponse.classList.contains('visible')) {
        rawResponse.classList.remove('visible');
        button.innerHTML = '<i class="fas fa-code"></i> View Raw';
    } else {
        rawResponse.classList.add('visible');
        button.innerHTML = '<i class="fas fa-code"></i> Hide Raw';
    }
}

// Show thinking animation
function showThinking() {
    const thinking = document.createElement('div');
    thinking.className = 'thinking';
    thinking.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <span>Kimi is thinking</span>
        <div class="thinking-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    messagesContainer.appendChild(thinking);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return thinking;
}

// Show reasoning animation
function showReasoning() {
    const reasoning = document.createElement('div');
    reasoning.className = 'reasoning';
    reasoning.innerHTML = `
        <i class="fas fa-cog"></i>
        <span>Processing with advanced reasoning...</span>
    `;
    messagesContainer.appendChild(reasoning);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return reasoning;
}

// Modified sendToKimi function
async function sendToKimi(message) {
    const thinking = showThinking();
    let reasoning = null;
    
    // Use the appropriate endpoint based on proxy availability
    const endpoint = kimiConfig.useProxy ? kimiConfig.proxyEndpoint : kimiConfig.endpoint;
    
    // Debug message
    console.log(`Sending message to ${endpoint}. Using proxy: ${kimiConfig.useProxy}`);
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Add proxy-specific headers
    if (kimiConfig.useProxy) {
        headers['Target-URL'] = 'https://kimi.moonshot.cn/api/chat/completion/stream';
    } else {
        // Direct API headers
        headers['authorization'] = 'Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc0NzA2NDMyMywiaWF0IjoxNzM5Mjg4MzIzLCJqdGkiOiJjdWxtdTBzcmlpY2RwZmo3c3FzMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJjdWg1cmdpYXYxZjNlcTE3Y2Y1MCIsInNwYWNlX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNGciLCJhYnN0cmFjdF91c2VyX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNDAiLCJkZXZpY2VfaWQiOiI3NDcwMTg2MjAzNjA2ODQwMzMzIn0.vIdmw4H-uLl5gYo1ERok62c3QC6KeAzi_RvU0h-1DVM7DGQkPSH-nGhNiKuPmNzucq2qtn5We52rO7kedXuC1A';
    }
    
    if (kimiConfig.deviceId) {
        headers['x-msh-device-id'] = kimiConfig.deviceId;
    }
    if (kimiConfig.sessionId) {
        headers['x-msh-session-id'] = kimiConfig.sessionId;
    }
    if (kimiConfig.trafficId) {
        headers['x-traffic-id'] = kimiConfig.trafficId;
    }
    
    const body = {
        model: kimiConfig.model,
        stream: true,
        messages: [{ role: 'user', content: message }]
    };
    
    // Log request for debugging
    console.log('Request headers:', JSON.stringify(headers, null, 2));
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    try {
        // Use fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Log response details for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()]), null, 2));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 100)}`);
        }
        
        // Check if we received a streaming response or regular JSON
        const contentType = response.headers.get('content-type');
        console.log('Content type:', contentType);
        
        if (contentType && contentType.includes('text/event-stream')) {
            // Handle SSE streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            let rawResponse = [];
            let buffer = '';
            
            // Remove thinking animation after 1 second
            setTimeout(() => {
                thinking.remove();
                if (kimiConfig.model === 'k1') {
                    reasoning = showReasoning();
                }
            }, 1000);
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Process complete events from buffer
                let bufferProcessed = false;
                
                while (buffer.includes('\n\n')) {
                    bufferProcessed = true;
                    const eventEnd = buffer.indexOf('\n\n');
                    const event = buffer.substring(0, eventEnd);
                    buffer = buffer.substring(eventEnd + 2);
                    
                    // Process the event
                    if (event.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(event.substring(6));
                            rawResponse.push(data);
                            
                            console.log('Received event:', data.event, data);
                            
                            if (data.event === 'k1' && data.text) {
                                if (reasoning) {
                                    reasoning.remove();
                                    reasoning = null;
                                }
                                assistantMessage += data.text;
                                updateAssistantMessage(assistantMessage, rawResponse);
                            } else if (data.event === 'all_done') {
                                console.log('Stream completed');
                            }
                        } catch (e) {
                            console.warn('Error parsing SSE data:', e, 'Event was:', event);
                        }
                    } else {
                        console.log('Non-data event:', event);
                    }
                }
                
                // If we processed the buffer and still have content, try to display it
                if (!bufferProcessed && buffer.length > 0) {
                    console.log('Buffer not processed but has content:', buffer);
                    // Try to find data: lines in the buffer
                    const dataMatch = buffer.match(/data: (.*)/);
                    if (dataMatch && dataMatch[1]) {
                        try {
                            const data = JSON.parse(dataMatch[1]);
                            if (data.text) {
                                assistantMessage += data.text;
                                updateAssistantMessage(assistantMessage, [data]);
                            }
                        } catch (e) {
                            console.warn('Error parsing partial data:', e);
                        }
                    }
                }
            }
            
            if (reasoning) {
                reasoning.remove();
            }
            
            // If we got no content at all, show an error
            if (!assistantMessage) {
                console.error('No assistant message content received');
                throw new Error('No response content received from Kimi API');
            }
            
            return { content: assistantMessage, rawResponse };
        } else {
            // Handle regular JSON response
            const jsonResponse = await response.json();
            console.log('JSON response:', jsonResponse);
            
            thinking.remove();
            
            // Extract the message from the JSON response
            let assistantMessage = '';
            
            if (jsonResponse.answer) {
                assistantMessage = jsonResponse.answer;
            } else if (jsonResponse.response) {
                assistantMessage = jsonResponse.response;
            } else if (jsonResponse.text) {
                assistantMessage = jsonResponse.text;
            } else if (jsonResponse.content) {
                assistantMessage = jsonResponse.content;
            } else {
                console.error('Unknown JSON response format:', jsonResponse);
                throw new Error('Unexpected response format from API');
            }
            
            updateAssistantMessage(assistantMessage, [jsonResponse]);
            return { content: assistantMessage, rawResponse: [jsonResponse] };
        }
    } catch (error) {
        if (thinking) thinking.remove();
        if (reasoning) reasoning.remove();
        
        let errorMessage = error.message;
        
        // Handle specific error types
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. The server took too long to respond.';
        } else if (error.message.includes('404')) {
            if (kimiConfig.useProxy) {
                // Try to reconnect without proxy
                kimiConfig.useProxy = false;
                showProxyWarning();
                errorMessage = 'Proxy server is not available. Please start the proxy server or try again later.';
            } else {
                errorMessage = 'API endpoint not found. Please check your connection and API configuration.';
            }
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
            errorMessage = 'Network error. Please check your internet connection.';
        }
        
        console.error('Error sending message to Kimi:', error);
        throw new Error(errorMessage);
    }
}

// Modified updateAssistantMessage function
function updateAssistantMessage(content, rawResponse) {
    const lastMessage = messagesContainer.querySelector('.message:last-child');
    if (lastMessage && lastMessage.classList.contains('assistant')) {
        const messageContent = lastMessage.querySelector('.message-content');
        messageContent.textContent = content;
        
        // Update raw response
        if (rawResponse) {
            let actionsDiv = lastMessage.querySelector('.message-actions');
            if (!actionsDiv) {
                actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-actions';
                messageContent.appendChild(actionsDiv);
                
                const viewRawBtn = document.createElement('button');
                viewRawBtn.className = 'message-action-btn';
                viewRawBtn.innerHTML = '<i class="fas fa-code"></i> View Raw';
                viewRawBtn.onclick = () => toggleRawResponse(lastMessage);
                actionsDiv.appendChild(viewRawBtn);
                
                const rawResponseDiv = document.createElement('div');
                rawResponseDiv.className = 'raw-response';
                rawResponseDiv.textContent = JSON.stringify(rawResponse, null, 2);
                messageContent.appendChild(rawResponseDiv);
            }
        }
    } else {
        appendMessage('assistant', content, rawResponse);
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Modified handleSendMessage function
async function handleSendMessage() {
    if (isProcessing || !userInput.value.trim()) return;
    
    const userMessage = userInput.value.trim();
    userInput.value = '';
    userInput.style.height = 'auto';
    
    appendMessage('user', userMessage);
    isProcessing = true;
    
    try {
        const response = await sendToKimi(userMessage);
        handleKimiResponse(response);
    } catch (error) {
        console.error('Error:', error);
        appendMessage('assistant', 'Sorry, there was an error processing your request.');
    } finally {
        isProcessing = false;
    }
}

// Modified handleKimiResponse function
function handleKimiResponse(response) {
    if (!response || !response.content) {
        appendMessage('assistant', 'Sorry, I couldn\'t process your request.');
        return;
    }
    
    // Response is already handled in real-time by updateAssistantMessage
}

// Save settings
function saveSettingsHandler() {
    kimiConfig = {
        ...kimiConfig,
        model: document.getElementById('model-select').value,
        useSearch: document.getElementById('web-search').checked,
        useResearch: document.getElementById('research-mode').checked,
        deviceId: document.getElementById('device-id').value,
        sessionId: document.getElementById('session-id').value,
        trafficId: document.getElementById('traffic-id').value,
        useProxy: document.getElementById('use-proxy').checked,
        proxyEndpoint: document.getElementById('proxy-endpoint').value
    };
    
    localStorage.setItem('kimiConfig', JSON.stringify(kimiConfig));
    settingsModal.classList.remove('active');
    
    // Check server connection after settings change
    checkServerStatus();
}

// Load settings
function loadSettings() {
    const savedConfig = localStorage.getItem('kimiConfig');
    if (savedConfig) {
        try {
            const parsedConfig = JSON.parse(savedConfig);
            kimiConfig = { ...kimiConfig, ...parsedConfig };
            
            document.getElementById('model-select').value = kimiConfig.model;
            document.getElementById('web-search').checked = kimiConfig.useSearch;
            document.getElementById('research-mode').checked = kimiConfig.useResearch;
            document.getElementById('device-id').value = kimiConfig.deviceId;
            document.getElementById('session-id').value = kimiConfig.sessionId;
            document.getElementById('traffic-id').value = kimiConfig.trafficId;
            
            // Set proxy settings if available
            if (document.getElementById('use-proxy')) {
                document.getElementById('use-proxy').checked = kimiConfig.useProxy;
            }
            if (document.getElementById('proxy-endpoint') && kimiConfig.proxyEndpoint) {
                document.getElementById('proxy-endpoint').value = kimiConfig.proxyEndpoint;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

// Add debug mode toggle to help troubleshoot
function toggleDebugMode() {
    const debugMode = localStorage.getItem('kimiDebugMode') === 'true';
    localStorage.setItem('kimiDebugMode', (!debugMode).toString());
    alert(`Debug mode ${!debugMode ? 'enabled' : 'disabled'}. Check the console for detailed logs.`);
    location.reload();
}

// Add this to the end of initializeChat function
function enhanceInitializeChat() {
    const originalInit = initializeChat;
    
    return function() {
        originalInit.apply(this, arguments);
        
        // Add debug button if debug mode is enabled
        if (localStorage.getItem('kimiDebugMode') === 'true') {
            const debugBtn = document.createElement('button');
            debugBtn.textContent = 'Toggle Debug';
            debugBtn.style.position = 'fixed';
            debugBtn.style.bottom = '10px';
            debugBtn.style.right = '10px';
            debugBtn.style.zIndex = '9999';
            debugBtn.style.background = '#e74c3c';
            debugBtn.style.color = 'white';
            debugBtn.style.border = 'none';
            debugBtn.style.padding = '8px 12px';
            debugBtn.style.borderRadius = '4px';
            debugBtn.style.cursor = 'pointer';
            debugBtn.addEventListener('click', toggleDebugMode);
            document.body.appendChild(debugBtn);
            
            console.log('Kimi Chat debug mode enabled');
        }
        
        // Add debug keybinding (Ctrl+Shift+D)
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                toggleDebugMode();
            }
        });
    };
}

// Replace initializeChat with enhanced version
initializeChat = enhanceInitializeChat();

// Additional debug info
console.log('Kimi Chat interface loaded.');
console.log('Press Ctrl+Shift+D to toggle debug mode.'); 