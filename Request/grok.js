document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');

    // Grok API Configuration
    const grokConfig = {
        proxyEndpoint: 'http://localhost:3000/grok-proxy',
        targetNewConversationEndpoint: 'https://grok.com/rest/app-chat/conversations/new',
        targetResponsesEndpoint: 'https://grok.com/rest/app-chat/conversations/{conversationId}/responses',
        modelName: 'grok-3'
    };

    // Store conversation data
    let conversationData = {
        conversationId: null,
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
        text.textContent = 'Waiting for response...';
        
        header.appendChild(icon);
        header.appendChild(text);
        
        const content = document.createElement('div');
        content.className = 'thinking-content';
        
        container.appendChild(header);
        container.appendChild(content);
        
        return container;
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

    // Check server health before making requests
    async function checkServerHealth() {
        try {
            const healthUrl = 'http://localhost:3000/health';
            console.log('Checking proxy server health:', healthUrl);
            
            const response = await fetchWithTimeout(healthUrl, {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Proxy server health check response:', data);
                return data.status === 'ok';
            }
            
            return false;
        } catch (error) {
            console.error('Proxy server health check failed:', error);
            return false;
        }
    }

    // Send message to start a new Grok conversation via proxy
    async function sendNewConversation(message) {
        // Check if proxy server is running
        const isServerHealthy = await checkServerHealth();
        if (!isServerHealthy) {
            throw new Error('Proxy server is not running. Please start the server using "node server.js"');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Target-URL': grokConfig.targetNewConversationEndpoint
        };

        // Using exact request body format from the browser
        const requestBody = {
            temporary: false,
            modelName: grokConfig.modelName,
            message: message,
            fileAttachments: [],
            imageAttachments: [],
            disableSearch: false,
            enableImageGeneration: true,
            returnImageBytes: false,
            returnRawGrokInXaiRequest: false,
            enableImageStreaming: true,
            imageGenerationCount: 2,
            forceConcise: false,
            toolOverrides: {
                imageGen: false,
                webSearch: false,
                xSearch: false,
                xMediaSearch: false,
                trendsSearch: false,
                xPostAnalyze: false
            },
            enableSideBySide: true,
            isPreset: false,
            sendFinalMetadata: true,
            customInstructions: "",
            deepsearchPreset: "default",
            isReasoning: false
        };

        try {
            console.log('Sending new conversation request via proxy:', {
                url: grokConfig.proxyEndpoint,
                targetUrl: grokConfig.targetNewConversationEndpoint,
                body: requestBody
            });

            const response = await fetchWithTimeout(grokConfig.proxyEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Proxy API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    error: errorText
                });
                throw new Error(`Proxy API returned ${response.status} ${response.statusText}`);
            }

            // Parse the response to get conversation ID
            const data = await response.json();
            console.log('New conversation response from proxy:', data);
            
            // Extract conversation ID
            if (data && data.conversationId) {
                conversationData.conversationId = data.conversationId;
                console.log('Conversation ID:', conversationData.conversationId);
                return data;
            } else {
                throw new Error('No conversation ID in response from proxy');
            }
        } catch (error) {
            console.error('Error starting new conversation via proxy:', error);
            throw error;
        }
    }

    // Poll for responses via proxy
    async function pollForResponses(conversationId, typingIndicator) {
        const maxAttempts = 30; // Maximum number of polling attempts
        const pollingInterval = 2000; // Polling interval in milliseconds
        let attempts = 0;
        let lastResponseCount = 0;
        let assistantResponse = '';

        // Check if proxy server is running
        const isServerHealthy = await checkServerHealth();
        if (!isServerHealthy) {
            throw new Error('Proxy server is not running. Please start the server using "node server.js"');
        }

        try {
            while (attempts < maxAttempts) {
                const targetResponsesUrl = grokConfig.targetResponsesEndpoint.replace('{conversationId}', conversationId);
                
                console.log(`Polling for responses via proxy (attempt ${attempts + 1}/${maxAttempts}):`, {
                    proxyUrl: grokConfig.proxyEndpoint,
                    targetUrl: targetResponsesUrl
                });
                
                const response = await fetchWithTimeout(grokConfig.proxyEndpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Target-URL': targetResponsesUrl
                    }
                });

                if (!response.ok) {
                    console.error(`Error polling responses via proxy: ${response.status} ${response.statusText}`);
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, pollingInterval));
                    continue;
                }

                const data = await response.json();
                console.log('Responses data from proxy:', data);

                if (data && data.responses && data.responses.length > lastResponseCount) {
                    // Find the most recent assistant response
                    const assistantResponses = data.responses.filter(r => r.sender === 'ASSISTANT');
                    
                    if (assistantResponses.length > 0) {
                        const latestResponse = assistantResponses[assistantResponses.length - 1];
                        assistantResponse = latestResponse.message || '';
                        
                        // Update the typing indicator
                        if (assistantResponse) {
                            updateResponseContent(typingIndicator, assistantResponse);
                        }
                        
                        // Check if the response is complete
                        if (!latestResponse.partial) {
                            console.log('Final response received from proxy:', latestResponse);
                            return assistantResponse;
                        }
                    }
                    
                    lastResponseCount = data.responses.length;
                }

                attempts++;
                await new Promise(resolve => setTimeout(resolve, pollingInterval));
            }

            throw new Error('Maximum polling attempts reached');
        } catch (error) {
            console.error('Error polling for responses via proxy:', error);
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
            // Start new conversation or continue existing one
            let conversationData;
            if (!window.currentConversationId) {
                // Start new conversation
                conversationData = await sendNewConversation(message);
                window.currentConversationId = conversationData.conversationId;
            } else {
                // TODO: Implement continuing existing conversation
                // For now, just start a new one each time
                conversationData = await sendNewConversation(message);
                window.currentConversationId = conversationData.conversationId;
            }
            
            // Poll for responses
            const assistantMessage = await pollForResponses(window.currentConversationId, thinkingContainer);
            
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
            
            // Show error message
            if (error.message.includes('Proxy server is not running')) {
                addMessage(`${error.message}. Make sure you've started the proxy server by running "node server.js" in your terminal.`, 'assistant');
            } else {
                addMessage(`Sorry, I encountered an error: ${error.message}`, 'assistant');
            }
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
        addMessage("Hello! I'm Grok. To use this chat, please make sure you've started the proxy server by running 'node server.js' in your terminal first.", 'assistant');
    }, 500);
}); 