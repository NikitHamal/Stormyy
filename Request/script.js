// Global variables
let fetchWithTimeout = (url, options = {}) => {
    const { timeout = 8000, ...fetchOptions } = options;
    return Promise.race([
        fetch(url, fetchOptions),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
    ]);
};

// Array to store thinking events
let thinkingEvents = [];

// Function to update the thinking events display as continuous text
function updateThinkingEvents() {
    const thinkingEventsElement = document.querySelector('.thinking-events');
    if (!thinkingEventsElement) {
        console.log('No thinking events element found');
        return; // Exit if element not found
    }
    
    try {
        // Get all text generation events (k1)
        const generationEvents = thinkingEvents.filter(event => 
            event.event === 'k1' && 
            event.data && 
            event.data.text
        );
        
        if (generationEvents.length === 0) {
            thinkingEventsElement.innerHTML = 'Waiting for model to generate text...';
            return;
        }
        
        // Combine all tokens into a single flowing text
        const fullText = generationEvents.map(event => event.data.text).join('');
        
        // Update the thinking events element with just the flowing text
        thinkingEventsElement.innerHTML = fullText;
        
        // Auto-scroll to bottom
        thinkingEventsElement.scrollTop = thinkingEventsElement.scrollHeight;
    } catch (error) {
        console.error('Error updating thinking events:', error);
    }
}

// Define presets
const presets = {
    kimi: {
        url: "https://kimi.moonshot.cn/api/chat/cv2840f6o68qmpt16krg/completion/stream",
        method: "POST",
        headers: [
            { name: "accept", value: "application/json, text/plain, */*" },
            { name: "authorization", value: "Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc0NzA2NDMyMywiaWF0IjoxNzM5Mjg4MzIzLCJqdGkiOiJjdWxtdTBzcmlpY2RwZmo3c3FzMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJjdWg1cmdpYXYxZjNlcTE3Y2Y1MCIsInNwYWNlX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNGciLCJhYnN0cmFjdF91c2VyX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNDAiLCJkZXZpY2VfaWQiOiI3NDcwMTg2MjAzNjA2ODQwMzMzIn0.vIdmw4H-uLl5gYo1ERok62c3QC6KeAzi_RvU0h-1DVM7DGQkPSH-nGhNiKuPmNzucq2qtn5We52rO7kedXuC1A" },
            { name: "content-type", value: "application/json" },
            { name: "referer", value: "https://kimi.moonshot.cn/chat/cv2840f6o68qmpt16krg" },
            { name: "x-language", value: "en-US" },
            { name: "x-msh-device-id", value: "7470186203606840333" },
            { name: "x-msh-platform", value: "web" },
            { name: "x-msh-session-id", value: "1731130480464666566" },
            { name: "x-traffic-id", value: "cuh5rgiav1f3eq17cf50" }
        ],
        auth: {
            type: "bearer",
            token: "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc0NzA2NDMyMywiaWF0IjoxNzM5Mjg4MzIzLCJqdGkiOiJjdWxtdTBzcmlpY2RwZmo3c3FzMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJjdWg1cmdpYXYxZjNlcTE3Y2Y1MCIsInNwYWNlX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNGciLCJhYnN0cmFjdF91c2VyX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNDAiLCJkZXZpY2VfaWQiOiI3NDcwMTg2MjAzNjA2ODQwMzMzIn0.vIdmw4H-uLl5gYo1ERok62c3QC6KeAzi_RvU0h-1DVM7DGQkPSH-nGhNiKuPmNzucq2qtn5We52rO7kedXuC1A"
        },
        body: {
            contentType: "application/json",
            content: JSON.stringify({
                kimiplus_id: "kimi",
                extend: { sidebar: true },
                model: "kimi",
                use_research: false,
                use_search: true,
                messages: [{ role: "user", content: "hi, what are recent ai advancements" }],
                refs: [],
                history: [],
                scene_labels: []
            }, null, 2)
        },
        params: []
    }
};

const modelTypes = {
    k1: "Kimi 1.5",
    kimi: "Kimi"
};

// Define event type display names
const eventTypeNames = {
    req: "Request",
    ping: "Ping",
    resp: "Response",
    zone_set: "Zone Set",
    loading: "Loading",
    rename: "Rename",
    k1: "Generation",
    cmpl: "Completion",
    all_done: "Finished"
};

// Update the formatEventData function just in case we need it elsewhere
function formatEventData(eventObj) {
    // We're not using this function for the thinking events display anymore,
    // but keeping it in case it's needed elsewhere
    try {
        // Extract the most important fields based on event type
        let output = '';
        
        switch(eventObj.event) {
            case 'k1':
                return eventObj.text || '';
                
            case 'req':
                return eventObj.content || '';
                
            case 'resp':
                return 'Model response starting...';
                
            case 'all_done':
                return 'Response complete.';
                
            default:
                return '';
        }
    } catch (e) {
        return '';
    }
}

// Load a preset
function loadPreset() {
    const presetSelect = document.getElementById('presets');
    const presetName = presetSelect.value;
    
    if (!presetName) return;
    
    const preset = presets[presetName];
    if (!preset) return;
    
    // Set URL
    document.getElementById('endpoint').value = preset.url;
    
    // Set method
    document.getElementById('method').value = preset.method;
    
    // Clear existing headers and add preset headers
    const headersContainer = document.getElementById('headers-container');
    headersContainer.innerHTML = '';
    
    preset.headers.forEach(header => {
        const headerRow = document.createElement('div');
        headerRow.className = 'header-row';
        headerRow.innerHTML = `
            <input type="text" placeholder="Header Name" class="header-name" value="${header.name}">
            <input type="text" placeholder="Header Value" class="header-value" value="${header.value}">
            <button class="btn-remove" onclick="removeHeader(this)">Remove</button>
        `;
        headersContainer.appendChild(headerRow);
    });
    
    // Set auth
    if (preset.auth) {
        document.getElementById('auth-type').value = preset.auth.type;
        document.getElementById('auth-type').dispatchEvent(new Event('change'));
        
        if (preset.auth.type === 'basic') {
            document.getElementById('username').value = preset.auth.username || '';
            document.getElementById('password').value = preset.auth.password || '';
        } else if (preset.auth.type === 'bearer') {
            document.getElementById('token').value = preset.auth.token || '';
        } else if (preset.auth.type === 'apikey') {
            document.getElementById('apikey-name').value = preset.auth.keyName || '';
            document.getElementById('apikey-value').value = preset.auth.keyValue || '';
            document.getElementById('apikey-location').value = preset.auth.keyLocation || 'header';
        }
    }
    
    // Set body
    if (preset.body) {
        document.getElementById('content-type').value = preset.body.contentType;
        document.getElementById('request-body').value = preset.body.content;
    }
    
    // Clear existing params and add preset params
    const paramsContainer = document.getElementById('params-container');
    paramsContainer.innerHTML = '';
    
    if (preset.params && preset.params.length > 0) {
        preset.params.forEach(param => {
            const paramRow = document.createElement('div');
            paramRow.className = 'header-row';
            paramRow.innerHTML = `
                <input type="text" placeholder="Parameter Name" class="param-name" value="${param.name}">
                <input type="text" placeholder="Parameter Value" class="param-value" value="${param.value || ''}">
                <button class="btn-remove" onclick="removeParam(this)">Remove</button>
            `;
            paramsContainer.appendChild(paramRow);
        });
    } else {
        // Add one empty param row
        addParam();
    }
    
    // Set Kimi-specific options if this is the Kimi preset
    if (presetName === 'kimi') {
        // Select the Kimi options tab
        document.querySelector('.tab[data-tab="kimi-options"]').click();
        
        try {
            // Parse the request body to get Kimi options
            const bodyContent = JSON.parse(preset.body.content);
            
            // Set the values in the Kimi options tab
            document.getElementById('kimi-model').value = bodyContent.model || 'k1';
            document.getElementById('kimi-use-search').checked = bodyContent.use_search === true;
            document.getElementById('kimi-use-research').checked = bodyContent.use_research === true;
            
            // Set device and session IDs from the headers
            const deviceHeader = preset.headers.find(h => h.name === 'x-msh-device-id');
            if (deviceHeader) {
                document.getElementById('kimi-device-id').value = deviceHeader.value;
            }
            
            const sessionHeader = preset.headers.find(h => h.name === 'x-msh-session-id');
            if (sessionHeader) {
                document.getElementById('kimi-session-id').value = sessionHeader.value;
            }
            
            const trafficHeader = preset.headers.find(h => h.name === 'x-traffic-id');
            if (trafficHeader) {
                document.getElementById('kimi-traffic-id').value = trafficHeader.value;
            }
        } catch (e) {
            console.error('Error setting Kimi options:', e);
        }
    }
}

// Handle tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Handle auth type change
document.getElementById('auth-type').addEventListener('change', function() {
    document.querySelectorAll('.auth-section').forEach(section => {
        section.style.display = 'none';
    });
    
    const selectedType = this.value;
    if (selectedType === 'basic') {
        document.getElementById('basic-auth').style.display = 'block';
    } else if (selectedType === 'bearer') {
        document.getElementById('bearer-auth').style.display = 'block';
    } else if (selectedType === 'apikey') {
        document.getElementById('apikey-auth').style.display = 'block';
    }
});

// Add Header
function addHeader() {
    const container = document.getElementById('headers-container');
    const headerRow = document.createElement('div');
    headerRow.className = 'header-row';
    headerRow.innerHTML = `
        <input type="text" placeholder="Header Name" class="header-name">
        <input type="text" placeholder="Header Value" class="header-value">
        <button class="btn-remove" onclick="removeHeader(this)">Remove</button>
    `;
    container.appendChild(headerRow);
}

// Remove Header
function removeHeader(button) {
    const headerRow = button.parentElement;
    headerRow.remove();
}

// Add Parameter
function addParam() {
    const container = document.getElementById('params-container');
    const paramRow = document.createElement('div');
    paramRow.className = 'header-row';
    paramRow.innerHTML = `
        <input type="text" placeholder="Parameter Name" class="param-name">
        <input type="text" placeholder="Parameter Value" class="param-value">
        <button class="btn-remove" onclick="removeParam(this)">Remove</button>
    `;
    container.appendChild(paramRow);
}

// Remove Parameter
function removeParam(button) {
    const paramRow = button.parentElement;
    paramRow.remove();
}

// Main send request function
async function sendRequest() {
    document.querySelector('.response').style.display = 'none';
    document.querySelector('.loading').style.display = 'block';
    
    // Get URL and validate
    const url = new URL(document.getElementById('endpoint').value);
    const method = document.getElementById('method').value;
    
    // Create headers
        const headers = new Headers();
    document.querySelectorAll('#headers-container .header-row').forEach(row => {
        const name = row.querySelector('.header-name').value.trim();
        const value = row.querySelector('.header-value').value.trim();
        if (name && value) {
            headers.set(name, value);
        }
    });
    
    // Add authorization headers
        const authType = document.getElementById('auth-type').value;
        if (authType === 'basic') {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
        const credentials = btoa(`${username}:${password}`);
        headers.set('Authorization', `Basic ${credentials}`);
        } else if (authType === 'bearer') {
            const token = document.getElementById('token').value;
        headers.set('Authorization', `Bearer ${token}`);
        } else if (authType === 'apikey') {
            const keyName = document.getElementById('apikey-name').value;
            const keyValue = document.getElementById('apikey-value').value;
        const keyLocation = document.getElementById('apikey-location').value;
        
        if (keyLocation === 'header') {
            headers.set(keyName, keyValue);
        } else if (keyLocation === 'query') {
                url.searchParams.append(keyName, keyValue);
            }
        }
        
    // Add query parameters
    document.querySelectorAll('#params-container .header-row').forEach(row => {
        const name = row.querySelector('.param-name').value.trim();
        const value = row.querySelector('.param-value').value.trim();
        if (name && value) {
            url.searchParams.append(name, value);
        }
    });
    
    // Build request options
        const options = {
            method: method,
            headers: headers,
            mode: 'cors',
            cache: 'no-cache',
        redirect: 'follow'
        };
        
    // Add request body for methods that support it
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const contentType = document.getElementById('content-type').value;
        headers.set('Content-Type', contentType);
        
        const bodyContent = document.getElementById('request-body').value;
        if (bodyContent) {
            options.body = bodyContent;
        }
    }
    
        let response;
    
        try {
        // Check if we need to use our proxy for Kimi
            if (url.toString().includes('kimi.moonshot.cn')) {
            console.log("Using kimi-proxy for Kimi API");
            const proxyUrl = 'http://localhost:3000/kimi-proxy';
            
            // Set target URL header for proxy
            headers.set('Target-URL', url.toString());
            
            // If this is a POST with a JSON body, check for Kimi options
                if (method === 'POST' && options.body) {
                    try {
                        const bodyData = JSON.parse(options.body);
                        
                    // Add Kimi options based on the form inputs
                    bodyData.model = document.getElementById('kimi-model').value;
                    bodyData.use_search = document.getElementById('kimi-use-search').checked;
                    bodyData.use_research = document.getElementById('kimi-use-research').checked;
                    
                    // Add device and session IDs
                    headers.set('x-msh-device-id', document.getElementById('kimi-device-id').value);
                    headers.set('x-msh-session-id', document.getElementById('kimi-session-id').value);
                    headers.set('x-traffic-id', document.getElementById('kimi-traffic-id').value);
                    
                    // Update request body
                        options.body = JSON.stringify(bodyData);
                    } catch (e) {
                    console.warn("Failed to parse request body to add Kimi options:", e);
                    }
                }

            // Send the request to our proxy
                response = await fetch(proxyUrl, {
                    method: method,
                    headers: headers,
                    body: options.body,
                    mode: 'cors'
                });
                
            // Handle streaming response if needed
            if (response.headers.get('content-type')?.includes('text/event-stream')) {
                await processKimiStreamingResponse(response);
                return;
            }
        } else {
            // For regular endpoints, use normal fetch
            response = await fetch(url.toString(), options);
        }
            
            // Display response info
            displayResponseInfo(response);
    } catch (error) {
        handleFetchError(error);
    }
}

// Process Kimi streaming response
async function processKimiStreamingResponse(response, options = { isPreset: false }) {
    // Get all UI elements we'll be updating
    const responseContainer = document.querySelector('.response');
    const loadingIndicator = document.querySelector('.loading');
    const responseBody = document.querySelector('.response-body');
    const statusElement = document.querySelector('.status-code');
    const headersElement = document.querySelector('.response-headers');
    const thinkingBubble = document.querySelector('.thinking-bubble');
    const thinkingEventsElement = document.querySelector('.thinking-events');
    
    // Show response container and hide loading indicator
    if (responseContainer) responseContainer.style.display = 'block';
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    // Reset thinking events array
    thinkingEvents = [];
    
    // Clear thinking bubble content
    if (thinkingEventsElement) {
        thinkingEventsElement.innerHTML = 'Waiting for model to generate text...';
    }
    
    // Show thinking bubble only for Kimi 1.5 responses
    if (thinkingBubble) {
        thinkingBubble.style.display = 'none';
    }
    
    // Reset response area
    if (responseBody) responseBody.innerHTML = '';
    if (statusElement) statusElement.textContent = 'Processing...';
    if (headersElement) headersElement.innerHTML = '';
    
    // Auto-scroll related variables
    let shouldAutoScroll = true;
    let userScrolled = false;
    
    // Create scroll event listener to detect manual scrolling
    if (responseBody) {
        responseBody.addEventListener('scroll', function() {
            // Calculate if we're at the bottom
            const isAtBottom = responseBody.scrollHeight - responseBody.scrollTop <= responseBody.clientHeight + 50;
            
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
        });
    }
    
    // Display initial response status
    const statusCode = response.status;
    if (statusElement) {
        statusElement.textContent = `Status: ${statusCode} ${response.statusText}`;
        statusElement.className = 'status-code';
        if (statusCode >= 200 && statusCode < 300) {
            statusElement.classList.add('status-2xx');
        } else if (statusCode >= 400 && statusCode < 500) {
            statusElement.classList.add('status-4xx');
        } else if (statusCode >= 500 && statusCode < 600) {
            statusElement.classList.add('status-5xx');
        } else if (statusCode >= 300 && statusCode < 400) {
            statusElement.classList.add('status-3xx');
        }
    }
    
    // Display response headers
    if (headersElement) {
        const headers = Array.from(response.headers.entries())
            .map(([key, value]) => `<span class="header-name">${key}:</span> <span class="header-value">${value}</span>`)
            .join('\n');
        headersElement.innerHTML = headers;
    }
    
    // Process the streaming response body
    if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Create a container for the response text with appropriate styling
        const messageContainer = document.createElement('div');
        messageContainer.style.fontFamily = 'var(--font-monospace, monospace)';
        messageContainer.style.whiteSpace = 'pre-wrap';
        messageContainer.id = 'formatted-response';
        if (responseBody) responseBody.appendChild(messageContainer);
        
        // Create container for raw response (initially hidden)
        const rawContainer = document.createElement('pre');
        rawContainer.id = 'raw-response';
        rawContainer.style.display = 'none';
        rawContainer.style.fontFamily = 'monospace';
        rawContainer.style.whiteSpace = 'pre-wrap';
        rawContainer.style.overflowX = 'auto';
        rawContainer.style.backgroundColor = '#f8f9fa';
        rawContainer.style.padding = '15px';
        rawContainer.style.borderRadius = '4px';
        rawContainer.style.maxHeight = '400px';
        rawContainer.style.overflow = 'auto';
        rawContainer.style.border = '1px solid #e2e8f0';
        if (responseBody) responseBody.appendChild(rawContainer);
        
        // Tracking variables for Kimi streaming response
        let messageContent = '';
        let rawResponseData = [];
        let modelType = null;
        let buffer = '';
        
        try {
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
                                // Store raw data
                                rawResponseData.push(line);
                                
                                // Extract the JSON data
                                const data = line.substring(5).trim();
                                const parsed = JSON.parse(data);
                                
                                // Handle response based on event type
                                switch (parsed.event) {
                                    case 'resp':
                                        // Extract model information
                                        if (parsed.model) {
                                            modelType = parsed.model;
                                            
                                            // For Kimi 1.5, show the thinking bubble
                                            if (modelType === 'k1' && thinkingBubble) {
                                                thinkingBubble.style.display = 'block';
                                            }
                                        }
                                        break;
                                        
                                    case 'k1':
                                        // Thinking process event - only add to thinking events
                                        if (parsed.text !== undefined) {
                                            // Store for thinking events display
                                            thinkingEvents.push({
                                                event: parsed.event,
                                                data: parsed,
                                                timestamp: new Date().toISOString()
                                            });
                                            
                                            // Update thinking panel
                                            updateThinkingEvents();
                                        }
                                        break;
                                        
                                    case 'cmpl':
                                        // Actual response text content
                                        if (parsed.text !== undefined) {
                                            // Add to message content
                                            messageContent += parsed.text;
                                            if (messageContainer) {
                                                messageContainer.innerHTML = formatAIResponse(messageContent);
                                                
                                                // Auto-scroll to the bottom if enabled
                                                if (shouldAutoScroll && responseBody) {
                                                    responseBody.scrollTop = responseBody.scrollHeight;
                                                }
                                            }
                                        }
                                        break;
                                        
                                    default:
                                        // Store other events for potential debugging
                                        console.log('Other event:', parsed.event);
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e, 'Line was:', line);
                                // Continue even if we can't parse a line
                            }
                        }
                    } else {
                        // This might be an incomplete line, keep it for the next chunk
                        newBuffer = line;
                    }
                }
                
                buffer = newBuffer;
            }
            
            // Add raw response data to the container
            if (rawContainer && rawResponseData.length > 0) {
                rawContainer.textContent = rawResponseData.join('\n');
            }
            
            // Add response control buttons
            if (responseBody) {
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'response-controls';
                
                // Copy button
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-button';
                copyButton.textContent = 'Copy Response';
                copyButton.onclick = () => copyToClipboard(messageContent, copyButton);
                
                // View toggle button
                const toggleButton = document.createElement('button');
                toggleButton.className = 'toggle-button';
                toggleButton.textContent = 'Show Raw Response';
                toggleButton.onclick = () => {
                    const formattedView = document.getElementById('formatted-response');
                    const rawView = document.getElementById('raw-response');
                    
                    if (formattedView.style.display !== 'none') {
                        // Switch to raw view
                        formattedView.style.display = 'none';
                        rawView.style.display = 'block';
                        toggleButton.textContent = 'Show Formatted Response';
                    } else {
                        // Switch to formatted view
                        formattedView.style.display = 'block';
                        rawView.style.display = 'none';
                        toggleButton.textContent = 'Show Raw Response';
                    }
                };
                
                // Add raw response copy button 
                const rawCopyButton = document.createElement('button');
                rawCopyButton.className = 'copy-button';
                rawCopyButton.textContent = 'Copy Raw Data';
                rawCopyButton.onclick = () => copyToClipboard(rawResponseData.join('\n'), rawCopyButton);
                
                // Add buttons to container
                buttonContainer.appendChild(copyButton);
                buttonContainer.appendChild(toggleButton);
                buttonContainer.appendChild(rawCopyButton);
                
                // Add the button container to the response
                responseBody.appendChild(buttonContainer);
            }
            
        } catch (error) {
            console.error('Error reading stream:', error);
            if (responseBody) {
                responseBody.innerHTML += `<div style="color: #721c24; background-color: #f8d7da; padding: 10px; border-radius: 4px; margin-top: 10px;">Error reading stream: ${error.message}</div>`;
            }
        }
    }
}

// Format AI response for better readability
function formatAIResponse(text) {
    // Basic markdown-style formatting
    let formatted = text
        // Bold text with **
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text with *
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks with ```
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Inline code with `
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Headers with # (h1-h3)
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
    
    return formatted;
}

// Add this after window.onload to set up the thinking bubble toggle
window.addEventListener('DOMContentLoaded', function() {
    const thinkingHeader = document.querySelector('.thinking-header');
    const thinkingBubble = document.querySelector('.thinking-bubble');
    
    if (thinkingHeader && thinkingBubble) {
        thinkingHeader.addEventListener('click', function() {
            thinkingBubble.classList.toggle('collapsed');
        });
    }
    
    // Initialize with the bubble expanded
    if (thinkingBubble) {
        thinkingBubble.classList.remove('collapsed');
    }
});

// Display response info
function displayResponseInfo(response) {
    const startTime = performance.now();
        const statusCode = response.status;
        const statusElement = document.querySelector('.status-code');
        statusElement.textContent = `Status: ${statusCode} ${response.statusText}`;
        statusElement.className = 'status-code';
        if (statusCode >= 200 && statusCode < 300) {
            statusElement.classList.add('status-2xx');
        } else if (statusCode >= 400 && statusCode < 500) {
            statusElement.classList.add('status-4xx');
    } else if (statusCode >= 500 && statusCode < 600) {
            statusElement.classList.add('status-5xx');
    } else if (statusCode >= 300 && statusCode < 400) {
        statusElement.classList.add('status-3xx');
    }

    // Add response time
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    const responseTimeClass = responseTime < 500 ? 'fast' : responseTime > 1000 ? 'slow' : '';
    
    statusElement.insertAdjacentHTML('afterend', 
        `<span class="response-time ${responseTimeClass}">${responseTime}ms</span>`);

    // Format response body if it's JSON
    response.text().then(text => {
        try {
            const json = JSON.parse(text);
            const formattedJSON = formatJSON(json);
            const responseBody = document.querySelector('.response-body');
            responseBody.classList.add('formatted');
            responseBody.innerHTML = `
                <pre><code>${formattedJSON}</code></pre>
                <button class="copy-button" onclick="copyToClipboard(${JSON.stringify(text)}, this)">Copy</button>
            `;
        } catch (e) {
            document.querySelector('.response-body').textContent = text;
        }
    });

    // Format headers
    const headers = Array.from(response.headers.entries())
        .map(([key, value]) => `<span class="header-name">${key}:</span> <span class="header-value">${value}</span>`)
        .join('\n');
    document.querySelector('.response-headers').innerHTML = headers;
}

// Handle fetch errors
function handleFetchError(error) {
        document.querySelector('.status-code').textContent = 'Error: ' + error.message;
        document.querySelector('.status-code').className = 'status-code status-4xx';
        document.querySelector('.response-headers').textContent = '';
        document.querySelector('.response-body').textContent = error.toString();
        document.querySelector('.response').style.display = 'block';
        document.querySelector('.loading').style.display = 'none';
    }

// Check server status
async function checkServerStatus() {
    const statusElement = document.getElementById('server-status-cookies');
    if (!statusElement) {
        const statusElement = document.createElement('div');
        statusElement.id = 'server-status-global';
        statusElement.style.padding = '10px';
        statusElement.style.marginTop = '10px';
        statusElement.style.borderRadius = '4px';
        statusElement.style.fontWeight = 'bold';
        document.body.insertBefore(statusElement, document.body.firstChild);
        statusElement.textContent = 'Checking server connection...';
        statusElement.style.backgroundColor = '#f8f9fa';
    }
    
    try {
        const response = await fetchWithTimeout('http://localhost:3000/test', { timeout: 5000 });
        if (response.ok) {
            statusElement.textContent = 'Server is running ✓';
            statusElement.style.backgroundColor = '#d4edda';
            statusElement.style.color = '#155724';
            
            // Also check if cookies are already set
            const cookiesResponse = await fetchWithTimeout('http://localhost:3000/get-cookies', { timeout: 5000 });
            const cookiesData = await cookiesResponse.json();
            if (cookiesData && cookiesData.cookie) {
                document.getElementById('cookies-status').textContent = 'Cookies already set ✓';
                document.getElementById('cookies-status').style.color = '#155724';
            }
            return true;
        } else {
            statusElement.textContent = 'Server error: ' + response.status + ' ' + response.statusText;
            statusElement.style.backgroundColor = '#f8d7da';
            statusElement.style.color = '#721c24';
            return false;
        }
    } catch (error) {
        statusElement.textContent = 'Server is not running ✗ - Start the server with "node server.js"';
        statusElement.style.backgroundColor = '#f8d7da';
        statusElement.style.color = '#721c24';
        console.error('Error checking server status:', error);
        return false;
    }
}

// Test Kimi connection
async function testKimiConnection() {
    document.getElementById('cookies-status').textContent = 'Testing Kimi connection...';
    document.getElementById('cookies-status').style.color = '#856404';
    document.getElementById('cookies-status').style.backgroundColor = '#fff3cd';
    document.getElementById('cookies-status').style.padding = '10px';
    document.getElementById('cookies-status').style.borderRadius = '4px';
    
    // First check if the proxy server is running
    try {
        const serverRunning = await checkServerStatus();
        if (!serverRunning) {
            document.getElementById('cookies-status').textContent = 'Server is not running! Start it with "node server.js"';
            document.getElementById('cookies-status').style.color = '#721c24';
            document.getElementById('cookies-status').style.backgroundColor = '#f8d7da';
            return;
        }
        
        // Test ping endpoint
        const response = await fetchWithTimeout('http://localhost:3000/kimi-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Target-URL': 'https://kimi.moonshot.cn/api/ping'
            },
            body: JSON.stringify({}),
            timeout: 10000
        });
        
        const data = await response.text();
        
        if (response.ok) {
            document.getElementById('cookies-status').textContent = 'Kimi connection successful ✓';
            document.getElementById('cookies-status').style.color = '#155724';
            document.getElementById('cookies-status').style.backgroundColor = '#d4edda';
            
            document.getElementById('current-cookies').textContent = `Ping response: ${data}`;
            document.getElementById('current-cookies').style.display = 'block';
        } else {
            document.getElementById('cookies-status').textContent = `Kimi connection failed: ${response.status} ${response.statusText}`;
            document.getElementById('cookies-status').style.color = '#721c24';
            document.getElementById('cookies-status').style.backgroundColor = '#f8d7da';
            
            document.getElementById('current-cookies').textContent = `Error response: ${data}`;
            document.getElementById('current-cookies').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('cookies-status').textContent = `Connection error: ${error.message}`;
        document.getElementById('cookies-status').style.color = '#721c24';
        document.getElementById('cookies-status').style.backgroundColor = '#f8d7da';
        console.error('Kimi connection test error:', error);
    }
}

// Set cookies
async function setCookies() {
    const cookies = document.getElementById('cookies-input').value.trim();
    if (!cookies) {
        document.getElementById('cookies-status').textContent = 'No cookies provided';
        document.getElementById('cookies-status').style.color = '#721c24';
        return;
    }
    
    document.getElementById('cookies-status').textContent = 'Setting cookies...';
    document.getElementById('cookies-status').style.color = '#856404';
    document.getElementById('cookies-status').style.backgroundColor = '#fff3cd';
    document.getElementById('cookies-status').style.padding = '10px';
    document.getElementById('cookies-status').style.borderRadius = '4px';
    
    // Check if server is running first
    try {
        const serverRunning = await checkServerStatus();
        if (!serverRunning) {
            document.getElementById('cookies-status').textContent = 'Server is not running! Start it with "node server.js"';
            document.getElementById('cookies-status').style.color = '#721c24';
            document.getElementById('cookies-status').style.backgroundColor = '#f8d7da';
            return;
        }
        
        const response = await fetchWithTimeout('http://localhost:3000/set-cookies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookies }),
            timeout: 5000
        });
        
        // Check if response is HTML (indicates an error page)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Server returned HTML instead of JSON. The server might be running but not properly handling the request.');
        }
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('cookies-status').textContent = 'Cookies set successfully ✓';
            document.getElementById('cookies-status').style.color = '#155724';
            document.getElementById('cookies-status').style.backgroundColor = '#d4edda';
        } else {
            document.getElementById('cookies-status').textContent = `Failed to set cookies: ${data.error}`;
            document.getElementById('cookies-status').style.color = '#721c24';
            document.getElementById('cookies-status').style.backgroundColor = '#f8d7da';
        }
    } catch (error) {
        if (error.message.includes('JSON')) {
            document.getElementById('cookies-status').textContent = `Error parsing response: ${error.message}. Make sure the server is handling the request correctly.`;
        } else {
            document.getElementById('cookies-status').textContent = `Connection error: ${error.message}`;
        }
        document.getElementById('cookies-status').style.color = '#721c24';
        document.getElementById('cookies-status').style.backgroundColor = '#f8d7da';
        console.error('Set cookies error:', error);
    }
}
async function getCookies() {
    document.getElementById('cookies-status').textContent = 'Fetching current cookies...';
    document.getElementById('cookies-status').style.color = '#856404';
    document.getElementById('cookies-status').style.backgroundColor = '#fff3cd';
    document.getElementById('cookies-status').style.padding = '10px';
    document.getElementById('cookies-status').style.borderRadius = '4px';

    try {
        const response = await fetchWithTimeout('http://localhost:3000/get-cookies', {
            timeout: 5000
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Server returned HTML instead of JSON');
        }

        const data = await response.json();

        if (response.ok) {
            const currentCookies = document.getElementById('current-cookies');
            currentCookies.textContent = data.cookies || 'No cookies set';
            currentCookies.style.display = 'block';
            document.getElementById('cookies-status').textContent = 'Current cookies retrieved ✓';
            document.getElementById('cookies-status').style.color = '#155724';
            document.getElementById('cookies-status').style.backgroundColor = '#d4edda';
        } else {
            throw new Error(data.error || 'Failed to get cookies');
        }
    } catch (error) {
        document.getElementById('cookies-status').textContent = `Error getting cookies: ${error.message}`;
        document.getElementById('cookies-status').style.color = '#721c24';
        document.getElementById('cookies-status').style.backgroundColor = '#f8d7da';
        console.error('Get cookies error:', error);
    }
}

async function testKimiConnection() {
    document.getElementById('server-status-cookies').textContent = 'Testing connection...';
    document.getElementById('server-status-cookies').style.color = '#856404';
    document.getElementById('server-status-cookies').style.backgroundColor = '#fff3cd';

    try {
        const response = await fetchWithTimeout('http://localhost:3000/test-kimi', {
            timeout: 8000
        });

        const data = await response.json();

        if (response.ok && data.success) {
            document.getElementById('server-status-cookies').textContent = '✓ Connected to Kimi successfully';
            document.getElementById('server-status-cookies').style.color = '#155724';
            document.getElementById('server-status-cookies').style.backgroundColor = '#d4edda';
        } else {
            throw new Error(data.error || 'Connection test failed');
        }
    } catch (error) {
        document.getElementById('server-status-cookies').textContent = `✗ Connection failed: ${error.message}`;
        document.getElementById('server-status-cookies').style.color = '#721c24';
        document.getElementById('server-status-cookies').style.backgroundColor = '#f8d7da';
        console.error('Kimi connection test error:', error);
    }
}

async function checkServerStatus() {
    try {
        const response = await fetchWithTimeout('http://localhost:3000/health', {
            timeout: 2000
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}
