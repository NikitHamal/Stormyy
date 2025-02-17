document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const backButton = document.querySelector('.back-button');
    const settingsButton = document.querySelector('.settings-button');
    const MAX_HISTORY = 25;
    let currentChatId = null;
    let chatHistory = [];
    let allChats = loadChatsFromStorage();
    let selectedModel = 'gemini';
    const MAX_CHATS = 15;

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Send message on Enter (but allow Shift+Enter for new line)
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Send button click handler
    sendButton.addEventListener('click', sendMessage);

    // Mobile sidebar handling
    let isMobile = window.innerWidth <= 768;
    
    window.addEventListener('resize', () => {
        isMobile = window.innerWidth <= 768;
        if (!isMobile && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            document.querySelector('.chat-container').style.marginLeft = 'var(--sidebar-width)';
        }
    });

    // Update sidebar toggle for mobile
    sidebarToggle.addEventListener('click', function() {
        if (isMobile) {
            sidebar.classList.toggle('active');
            // Add overlay when sidebar is active
            if (sidebar.classList.contains('active')) {
                const overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.remove();
                });
                document.body.appendChild(overlay);
            } else {
                document.querySelector('.sidebar-overlay')?.remove();
            }
        } else {
            // Existing desktop behavior
            sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
            document.querySelector('.chat-container').style.marginLeft = 
                sidebar.style.display === 'none' ? '0' : 'var(--sidebar-width)';
            document.querySelector('.mdc-top-app-bar').style.left = 
                sidebar.style.display === 'none' ? '0' : 'var(--sidebar-width)';
        }
    });

    // Add settings popup to the body
    document.body.insertAdjacentHTML('beforeend', `
        <div class="settings-popup">
            <div class="settings-content">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <button class="close-settings">&times;</button>
                </div>
                <div class="settings-section">
                    <h3>Select AI Model</h3>
                    <div class="model-options">
                        <label class="model-option">
                            <input type="radio" name="ai-model" value="gemini" checked>
                            <span>Gemini Chat</span>
                        </label>
                        <label class="model-option">
                            <input type="radio" name="ai-model" value="geminivision">
                            <span>Gemini Vision</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `);

    const settingsPopup = document.querySelector('.settings-popup');
    const closeSettings = document.querySelector('.close-settings');

    // Settings button handler
    settingsButton.addEventListener('click', () => {
        settingsPopup.style.display = 'flex';
    });

    // Close settings handlers
    closeSettings.addEventListener('click', () => {
        settingsPopup.style.display = 'none';
    });

    settingsPopup.addEventListener('click', (e) => {
        if (e.target === settingsPopup) {
            settingsPopup.style.display = 'none';
        }
    });

    // Back button handler
    backButton.addEventListener('click', function() {
        window.history.back();
    });

    // Load chats from localStorage
    function loadChatsFromStorage() {
        const saved = localStorage.getItem('stormy_chats');
        return saved ? JSON.parse(saved) : [];
    }

    // Save chats to localStorage
    function saveChatsToStorage() {
        localStorage.setItem('stormy_chats', JSON.stringify(allChats));
    }

    // Create a new chat
    function createNewChat() {
        if (allChats.length >= MAX_CHATS) {
            // Remove oldest chat
            allChats.pop();
        }
        
        const chatId = Date.now().toString();
        const newChat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            timestamp: Date.now()
        };
        
        allChats.unshift(newChat);
        saveChatsToStorage();
        currentChatId = chatId;
        chatHistory = [];
        chatMessages.innerHTML = '';
        updateSidebar();
    }

    // Update sidebar with chat history
    function updateSidebar() {
        const chatsList = document.querySelector('.chats-list');
        chatsList.innerHTML = allChats.map(chat => `
            <div class="chat-item ${chat.id === currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
                <div class="chat-item-content">
                    <span class="chat-title">${chat.title}</span>
                    <span class="chat-timestamp">${formatDate(chat.timestamp)}</span>
                </div>
                <button class="delete-chat" data-chat-id="${chat.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Add click handlers for chat items
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-chat')) {
                    loadChat(item.dataset.chatId);
                }
            });
        });

        // Add click handlers for delete buttons
        document.querySelectorAll('.delete-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(btn.dataset.chatId);
            });
        });
    }

    // Load a specific chat
    function loadChat(chatId) {
        const chat = allChats.find(c => c.id === chatId);
        if (chat) {
            currentChatId = chatId;
            chatHistory = [...chat.messages];
            chatMessages.innerHTML = '';
            chat.messages.forEach(msg => {
                addMessageToChat(msg.role, msg.content, false);
            });
            updateSidebar();
        }
    }

    // Delete a chat
    function deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            allChats = allChats.filter(c => c.id !== chatId);
            saveChatsToStorage();
            if (currentChatId === chatId) {
                if (allChats.length > 0) {
                    loadChat(allChats[0].id);
                } else {
                    createNewChat();
                }
            } else {
                updateSidebar();
            }
        }
    }

    // Format date for sidebar
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Enhanced message display
    function addMessageToChat(role, content, save = true) {
        if (save) {
            // Add to current chat history
            chatHistory.push({ role, content });
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory.shift();
            }

            // Save to storage
            const chatIndex = allChats.findIndex(c => c.id === currentChatId);
            if (chatIndex !== -1) {
                allChats[chatIndex].messages = chatHistory;
                // Update chat title if it's the first message
                if (allChats[chatIndex].messages.length === 1 && role === 'user') {
                    allChats[chatIndex].title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
                }
                allChats[chatIndex].timestamp = Date.now();
                saveChatsToStorage();
                updateSidebar();
            }
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Parse markdown if it's an assistant message
        if (role === 'assistant') {
            const messageWrapper = document.createElement('div');
            messageWrapper.className = 'assistant-message-wrapper';
            
            // Add model name and content
            contentDiv.innerHTML = `
                <span class="model-name">${selectedModel.toUpperCase()}</span>
                ${marked.parse(content)}
            `;
            
            // Create tools div with updated layout
            const toolsDiv = document.createElement('div');
            toolsDiv.className = 'message-tools';
            toolsDiv.innerHTML = `
                <div class="tools-container">
                    <div class="primary-tools">
                        <button class="tool-btn thumbs-up" title="Like">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                        </button>
                        <button class="tool-btn copy-btn" title="Copy to clipboard">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                            <span class="copy-tooltip">Copy</span>
                        </button>
                        <button class="tool-btn regenerate-btn" title="Regenerate response">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>
                        </button>
                    </div>
                    <div class="secondary-tools">
                        <button class="tool-btn menu-dots" title="More options">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Add tool functionality with improved UX
            const copyBtn = toolsDiv.querySelector('.copy-btn');
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(content);
                    const tooltip = copyBtn.querySelector('.copy-tooltip');
                    tooltip.textContent = 'Copied!';
                    setTimeout(() => {
                        tooltip.textContent = 'Copy';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            });
            
            const thumbsUpBtn = toolsDiv.querySelector('.thumbs-up');
            thumbsUpBtn.addEventListener('click', function() {
                this.classList.toggle('active');
            });
            
            toolsDiv.querySelector('.regenerate-btn').addEventListener('click', () => {
                // Implement regenerate logic
                console.log('Regenerate clicked');
            });
            
            messageWrapper.appendChild(contentDiv);
            messageWrapper.appendChild(toolsDiv);
            messageDiv.appendChild(messageWrapper);
        } else {
            contentDiv.textContent = content;
            messageDiv.appendChild(contentDiv);
        }
        
        chatMessages.appendChild(messageDiv);
        
        // Smooth scroll to bottom
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Show loading indicator
    function showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant-message';
        loadingDiv.innerHTML = `
            <div class="message-loading">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        `;
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
        return loadingDiv;
    }

    // Update sendMessage function to handle context better
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message && selectedModel !== 'geminivision') return;
        if (selectedModel === 'geminivision' && !uploadedImageUrl) {
            alert('Please upload an image first');
            return;
        }

        // Create new chat if none exists
        if (!currentChatId) {
            createNewChat();
        }

        // Add user message to chat
        addMessageToChat('user', message + (uploadedImageUrl ? ' [Image attached]' : ''));
        
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        const loadingIndicator = showLoadingIndicator();

        try {
            let response;
            if (selectedModel === 'geminivision') {
                // Use Gemini Vision API
                const visionEndpoint = `https://api.paxsenix.biz.id/ai/geminivision?text=${encodeURIComponent(message)}&url=${encodeURIComponent(uploadedImageUrl)}`;
                response = await fetch(visionEndpoint);
            } else {
                // Use regular Gemini API with context
                const endpoint = 'https://api.paxsenix.biz.id/ai/gemini';
                
                // Format context content from chat history
                let contextContent = '';
                if (chatHistory.length > 0) {
                    contextContent = chatHistory.slice(-15).map(msg => 
                        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
                    ).join('\n');
                }

                // Prepare the message with context
                let messageText = message;
                if (contextContent) {
                    messageText = `Previous conversation:\n${contextContent}\n\nUser's new message: ${message}`;
                }

                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "gemini-2.0-flash-thinking-exp",
                        contents: [{
                            role: "user",
                            parts: [{ text: messageText }]
                        }]
                    })
                });
            }

            loadingIndicator.remove();
            
            const data = await handleResponse(response);
            
            if (data.ok) {
                let responseText = '';
                if (data.message && Array.isArray(data.message)) {
                    responseText = data.message.map(msg => msg.text).join('\n');
                } else {
                    responseText = data.message || data.answer || data.result || data.text;
                }
                
                addMessageToChat('assistant', responseText);
                
                // Clear image upload if it was used
                if (selectedModel === 'geminivision') {
                    imagePreview.innerHTML = '';
                    imagePreview.style.display = 'none';
                    uploadedImageUrl = null;
                    imageUpload.value = '';
                }
            } else {
                throw new Error(data.message || 'Failed to get response');
            }
        } catch (error) {
            loadingIndicator.remove();
            console.error('Error:', error);
            addMessageToChat('assistant', '❌ Sorry, I encountered an error. Please try again.');
        }
    }

    // Update handleResponse function to better handle different response formats
    async function handleResponse(response) {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        } else if (contentType && contentType.includes("text/html")) {
            const text = await response.text();
            throw new Error("Received HTML instead of JSON. Server might be returning an error page.");
        } else {
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                // If the text is not JSON, wrap it in a response-like object
                return {
                    ok: true,
                    message: text
                };
            }
        }
    }

    // Initialize marked.js with syntax highlighting
    marked.setOptions({
        highlight: function(code, language) {
            if (language && hljs.getLanguage(language)) {
                return hljs.highlight(code, { language: language }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        langPrefix: 'hljs language-'
    });

    // Add these styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Add a function to clear chat history
    function clearChat() {
        chatHistory = [];
        chatMessages.innerHTML = '';
    }

    // Update new chat button to clear history
    document.querySelector('.new-chat-btn').addEventListener('click', clearChat);

    // Update new chat button handler
    document.querySelector('.new-chat-btn').addEventListener('click', createNewChat);

    // Initialize the first chat if none exists
    if (allChats.length === 0) {
        createNewChat();
    } else {
        loadChat(allChats[0].id);
    }

    // Add styles for chat items
    const chatStyles = document.createElement('style');
    chatStyles.textContent = `
        .chat-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.2s;
        }

        .chat-item:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }

        .chat-item.active {
            background-color: rgba(33, 150, 243, 0.1);
        }

        .chat-item-content {
            flex: 1;
            min-width: 0;
        }

        .chat-title {
            display: block;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-timestamp {
            display: block;
            font-size: 12px;
            color: #666;
        }

        .delete-chat {
            opacity: 0;
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: #666;
            transition: opacity 0.2s;
        }

        .chat-item:hover .delete-chat {
            opacity: 1;
        }

        .delete-chat:hover {
            color: #f44336;
        }
    `;
    document.head.appendChild(chatStyles);

    // Add image upload container to chat input
    const chatInputContainer = document.querySelector('.chat-input-container');
    chatInputContainer.insertAdjacentHTML('afterbegin', `
        <div class="image-upload-container" style="display: none;">
            <input type="file" id="imageUpload" accept="image/*" style="display: none;">
            <button class="upload-image-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
                </svg>
            </button>
            <div class="image-preview"></div>
        </div>
    `);

    // Add model selection handler
    document.querySelectorAll('input[name="ai-model"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedModel = e.target.value;
            document.querySelector('.image-upload-container').style.display = 
                selectedModel === 'geminivision' ? 'flex' : 'none';
        });
    });

    // Image upload handling
    const imageUpload = document.getElementById('imageUpload');
    const uploadBtn = document.querySelector('.upload-image-btn');
    const imagePreview = document.querySelector('.image-preview');
    let uploadedImageUrl = null;

    uploadBtn.addEventListener('click', () => imageUpload.click());

    imageUpload.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            try {
                // Create FormData and upload to your server
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetch('YOUR_UPLOAD_ENDPOINT', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                uploadedImageUrl = data.url; // Store the uploaded image URL
                
                // Show preview
                imagePreview.innerHTML = `
                    <img src="${URL.createObjectURL(file)}" alt="Preview">
                    <button class="remove-image">&times;</button>
                `;
                imagePreview.style.display = 'flex';
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Failed to upload image. Please try again.');
            }
        }
    });

    // Replace the incorrect event listener with this correct version
    document.querySelector('.image-preview').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-image')) {
            imagePreview.innerHTML = '';
            imagePreview.style.display = 'none';
            uploadedImageUrl = null;
            imageUpload.value = '';
        }
    });

    // Add delete all conversations function
    function deleteAllConversations() {
        if (confirm('Are you sure you want to delete ALL conversations?')) {
            localStorage.removeItem('stormy_chats');
            allChats = [];
            createNewChat();
            updateSidebar();
        }
    }

    // Update sidebar HTML to add delete all button
    document.querySelector('.sidebar').insertAdjacentHTML('beforeend', `
        <div class="sidebar-footer">
            <button class="delete-all-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete All Chats
            </button>
        </div>
    `);

    // Add delete all button handler
    document.querySelector('.delete-all-btn').addEventListener('click', deleteAllConversations);

});
