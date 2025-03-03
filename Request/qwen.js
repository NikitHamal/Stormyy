document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');

    // Qwen API Configuration
    const qwenConfig = {
        endpoint: 'https://chat.qwen.ai/api/chat/completions',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhiYjQ1NjVmLTk3NjUtNDQwNi04OWQ5LTI3NmExMTIxMjBkNiIsImV4cCI6MTc0MzU5NzcxNX0.bmfoLSnGgHx5wbxRzkagRKn8tTTh0VetWLbBkcPIpr8',
        model: 'qwen-max-latest',
        sessionId: '1731130480464666566',
        chatId: '0021ab2e-5e4c-43c5-b881-5868bf04e48d',
        deviceId: '7470186203606840333',
        trafficId: 'cuh5rgiav1f3eq17cf50'
    };

    // Initialize conversation
    let currentConversation = {
        messages: []
    };

    // Utility function for fetch with timeout
    const fetchWithTimeout = (url, options = {}) => {
        const { timeout = 60000, ...fetchOptions } = options;
        return Promise.race([
            fetch(url, fetchOptions),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timed out')), timeout)
            )
        ]);
    };

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Create thinking container
    function createThinkingContainer() {
        const container = document.createElement('div');
        container.className = 'thinking-container';
        container.style.display = 'block';
        
        const header = document.createElement('div');
        header.className = 'thinking-header';
        
        const icon = document.createElement('span');
        icon.className = 'material-icons-outlined';
        icon.textContent = 'psychology';
        
        const text = document.createElement('span');
        text.textContent = 'Thinking completed';
        
        header.appendChild(icon);
        header.appendChild(text);
        
        const content = document.createElement('div');
        content.className = 'thinking-content';
        
        container.appendChild(header);
        container.appendChild(content);
        
        return container;
    }

    // Process streaming response
    async function processStreamingResponse(response, typingIndicator) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantMessage = '';
        let thinkingContent = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() && line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.choices && data.choices[0].delta) {
                                const delta = data.choices[0].delta;
                                
                                if (delta.role === 'assistant') {
                                    continue;
                                }

                                if (delta.content) {
                                    if (thinkingContent.length === 0 && delta.content.includes('<think>')) {
                                        thinkingContent = delta.content.replace('<think>', '');
                                    } else if (thinkingContent.length > 0 && !delta.content.includes('</think>')) {
                                        thinkingContent += delta.content;
                                        updateThinkingProcess(typingIndicator, thinkingContent);
                                    } else if (delta.content.includes('</think>')) {
                                        thinkingContent += delta.content.split('</think>')[0];
                                        updateThinkingProcess(typingIndicator, thinkingContent);
                                        
                                        const actualResponse = delta.content.split('</think>')[1];
                                        if (actualResponse) {
                                            assistantMessage += actualResponse;
                                            updateResponseContent(typingIndicator, assistantMessage);
                                        }
                                    } else {
                                        assistantMessage += delta.content;
                                        updateResponseContent(typingIndicator, assistantMessage);
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e, line);
                        }
                    }
                }
            }
            return assistantMessage;
        } catch (error) {
            console.error('Error processing streaming response:', error);
            throw error;
        } finally {
            reader.releaseLock();
        }
    }

    // Update thinking process display
    function updateThinkingProcess(container, content) {
        if (!container) return;
        const thinkingContent = container.querySelector('.thinking-content');
        if (thinkingContent) {
            thinkingContent.textContent = content;
            container.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    // Update response content
    function updateResponseContent(container, content) {
        if (!container) return;
        const responseContent = container.querySelector('.response-content');
        if (!responseContent) {
            const newResponseContent = document.createElement('div');
            newResponseContent.className = 'response-content';
            container.appendChild(newResponseContent);
            updateResponseContent(container, content);
        } else {
            responseContent.innerHTML = formatMessage(content);
            container.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    // Send message to Qwen API
    async function sendToQwen(message) {
        const requestId = crypto.randomUUID();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en-GB;q=0.9,en;q=0.8',
            'Authorization': qwenConfig.authorization,
            'Origin': 'https://chat.qwen.ai',
            'Referer': `https://chat.qwen.ai/c/${qwenConfig.chatId}`,
            'x-request-id': requestId,
            'bx-v': '2.5.28',
            'priority': 'u=1, i',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
        };

        const requestBody = {
            stream: true,
            incremental_output: true,
            chat_type: 't2t',
            model: qwenConfig.model,
            messages: [
                {
                    role: 'user',
                    content: message,
                    chat_type: 't2t',
                    extra: {},
                    feature_config: {
                        thinking_enabled: true
                    }
                }
            ],
            session_id: qwenConfig.sessionId,
            chat_id: qwenConfig.chatId,
            request_id: requestId
        };

        try {
            // First, get the cookies from the current document
            const cookies = document.cookie;
            
            const response = await fetchWithTimeout(qwenConfig.endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                credentials: 'include',
                mode: 'cors',
                cache: 'no-cache'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    error: errorText
                });
                throw new Error(`API returned ${response.status} ${response.statusText}`);
            }

            // Store any new cookies from the response
            const newCookies = response.headers.get('set-cookie');
            if (newCookies) {
                newCookies.split(',').forEach(cookie => {
                    document.cookie = cookie.split(';')[0];
                });
            }

            return response;
        } catch (error) {
            console.error('Error calling Qwen API:', error);
            throw error;
        }
    }

    // Handle message sending
    async function handleSendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, 'user');
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Create and show thinking container
        const thinkingContainer = createThinkingContainer();
        chatMessages.appendChild(thinkingContainer);

        try {
            // Send message to API
            const response = await sendToQwen(message);
            
            // Process streaming response
            const assistantMessage = await processStreamingResponse(response, thinkingContainer);
            
            // Remove thinking container after response is complete
            if (thinkingContainer) {
                setTimeout(() => {
                    thinkingContainer.remove();
                }, 1000);
            }

            // Add final message to chat
            if (assistantMessage) {
                addMessage(assistantMessage, 'assistant');
            }

        } catch (error) {
            console.error('Error handling message:', error);
            if (thinkingContainer) {
                thinkingContainer.remove();
            }
            addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
        }
    }

    // Format message with markdown-like styling
    function formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.innerHTML = formatMessage(text);
        chatMessages.appendChild(messageDiv);
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    // Event listeners
    sendButton.addEventListener('click', handleSendMessage);
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Add welcome message
    setTimeout(() => {
        addMessage("Hello! I'm Qwen. How can I assist you today?", 'assistant');
    }, 500);
}); 