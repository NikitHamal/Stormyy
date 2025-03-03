// Global variables
let fetchWithTimeout = (url, options = {}) => {
    const { timeout = 30000, ...fetchOptions } = options;
    
    // Add CORS headers for Kimi API
    if (url.includes('kimi.moonshot.cn')) {
        // For Kimi API, we need to use different approach due to strict CORS policies
        // The fetch might still fail due to browser's security restrictions
        // Consider using fetch mode 'no-cors' as a fallback
        fetchOptions.headers = fetchOptions.headers || {};
        fetchOptions.headers = new Headers(fetchOptions.headers);
        
        // Only set if not already set
        if (!fetchOptions.headers.has('accept')) {
            fetchOptions.headers.set('accept', 'application/json, text/plain, */*');
        }
        if (!fetchOptions.headers.has('accept-language')) {
            fetchOptions.headers.set('accept-language', 'en-US,en;q=0.9');
        }
        
        // These headers might not be respected in CORS mode
        fetchOptions.headers.set('sec-fetch-dest', 'empty');
        fetchOptions.headers.set('sec-fetch-mode', 'cors');
        fetchOptions.headers.set('sec-fetch-site', 'same-origin');
        
        // We'll avoid credentials:include which can cause additional CORS issues
        fetchOptions.credentials = 'same-origin';
        
        // Ensure mode is properly set
        fetchOptions.mode = 'cors';
    }
    
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

// Helper function to create a proxy URL if needed
function createProxyUrl(originalUrl) {
    const useProxy = document.getElementById('use-proxy')?.checked;
    const proxyUrl = document.getElementById('proxy-url')?.value;
    
    if (useProxy && proxyUrl && proxyUrl.trim()) {
        // Remove trailing slash from proxy URL if present
        const cleanProxyUrl = proxyUrl.trim().replace(/\/$/, '');
        
        // For CORS-anywhere style proxies
        if (cleanProxyUrl.includes('cors-anywhere')) {
            return `${cleanProxyUrl}/${originalUrl}`;
        }
        
        // For custom proxies where the target URL is sent as a parameter
        return `${cleanProxyUrl}?url=${encodeURIComponent(originalUrl)}`;
    }
    
    return originalUrl;
}

// Main send request function
async function sendRequest() {
    document.querySelector('.response').style.display = 'none';
    document.querySelector('.loading').style.display = 'block';
    
    // Get URL and validate
    const originalUrl = document.getElementById('endpoint').value;
    let url = new URL(originalUrl);
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
        credentials: 'same-origin', // Changed from 'include' to 'same-origin'
        redirect: 'follow'
    };
    
    // Add request body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const contentType = document.getElementById('content-type').value;
        headers.set('Content-Type', contentType);
        
        let bodyContent = document.getElementById('request-body').value;
        
        // If this is a Kimi API call, process the body content
        if (url.toString().includes('kimi.moonshot.cn')) {
            try {
                const bodyData = JSON.parse(bodyContent);
                
                // Add Kimi options based on the form inputs
                if (document.getElementById('kimi-model')) {
                    bodyData.model = document.getElementById('kimi-model').value;
                }
                
                if (document.getElementById('kimi-use-search')) {
                    bodyData.use_search = document.getElementById('kimi-use-search').checked;
                }
                
                if (document.getElementById('kimi-use-research')) {
                    bodyData.use_research = document.getElementById('kimi-use-research').checked;
                }
                
                // Update request body
                bodyContent = JSON.stringify(bodyData);
                
                // Add required Kimi headers if the elements exist
                if (document.getElementById('kimi-device-id')) {
                    headers.set('x-msh-device-id', document.getElementById('kimi-device-id').value);
                }
                
                if (document.getElementById('kimi-session-id')) {
                    headers.set('x-msh-session-id', document.getElementById('kimi-session-id').value);
                }
                
                if (document.getElementById('kimi-traffic-id')) {
                    headers.set('x-traffic-id', document.getElementById('kimi-traffic-id').value);
                }
                
                // Common Kimi headers
                headers.set('x-language', 'en-US');
                headers.set('x-msh-platform', 'web');
                headers.set('referer', `https://kimi.moonshot.cn/chat/${url.pathname.split('/')[3]}`);
            } catch (e) {
                console.warn("Failed to parse request body to add Kimi options:", e);
            }
        }
        
        if (bodyContent) {
            options.body = bodyContent;
        }
    }
    
    let response;
    
    try {
        // Check if we should use a proxy
        const finalUrl = createProxyUrl(url.toString());
        const isUsingProxy = finalUrl !== url.toString();
        
        console.log(`Making request to: ${finalUrl} ${isUsingProxy ? '(via proxy)' : '(direct)'}`);
        console.log("With options:", JSON.stringify({
            method: options.method,
            mode: options.mode,
            credentials: options.credentials,
            headers: Array.from(headers.entries()),
            bodyLength: options.body ? options.body.length : 0
        }, null, 2));
        
        // If using a proxy, we might need to adjust some options
        if (isUsingProxy) {
            // Some proxies expect the target URL in a header
            headers.set('X-Target-URL', url.toString());
            options.mode = 'cors'; // Ensure CORS mode for proxy
        }
        
        // Try API call
        try {
            response = await fetchWithTimeout(finalUrl, options);
        } catch (directError) {
            console.error("Fetch failed:", directError);
            
            // If this is a CORS error and we're not already using a proxy, suggest using one
            if (!isUsingProxy && 
                directError instanceof TypeError && 
                directError.message.includes('Failed to fetch')) {
                
                console.log("CORS error detected, suggesting proxy");
                throw new Error(
                    "CORS policy blocked the direct request. " +
                    "Try enabling the 'Use Proxy' option in the settings " +
                    "and provide a CORS proxy URL like 'https://cors-anywhere.herokuapp.com/'"
                );
            } else if (isUsingProxy) {
                // If we're already using a proxy but still getting an error
                throw new Error(
                    `Request via proxy failed: ${directError.message}. ` +
                    "Check that your proxy URL is correct and working."
                );
            } else {
                // Re-throw other errors
                throw directError;
            }
        }
        
        // Handle streaming response if needed
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
            await processKimiStreamingResponse(response);
            return;
        }
        
        // Display response info for non-streaming responses
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

// Handle fetch errors with more detailed information
function handleFetchError(error) {
    const statusElement = document.querySelector('.status-code');
    const responseHeaders = document.querySelector('.response-headers');
    const responseBody = document.querySelector('.response-body');
    const loadingIndicator = document.querySelector('.loading');
    
    if (statusElement) {
        statusElement.textContent = 'Error: ' + error.message;
        statusElement.className = 'status-code status-4xx';
    }
    
    if (responseHeaders) {
        responseHeaders.textContent = '';
    }
    
    if (responseBody) {
        let errorMessage = error.toString();
        
        // Add more context for common errors
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorMessage += '\n\nThis is a CORS (Cross-Origin Resource Sharing) error.\n\n';
            errorMessage += 'Unfortunately, making direct API calls to external services like Kimi\n';
            errorMessage += 'from a browser is often blocked by CORS policies.\n\n';
            
            errorMessage += 'Possible solutions:\n';
            errorMessage += '1. Use a server-side proxy (recommended)\n';
            errorMessage += '   - Create a simple server using Node.js/Express\n';
            errorMessage += '   - Have your server forward requests to the API\n';
            errorMessage += '   - Access your local server instead of the API directly\n\n';
            
            errorMessage += '2. Use a CORS proxy service (temporary/testing only)\n';
            errorMessage += '   - Example: https://cors-anywhere.herokuapp.com/\n';
            errorMessage += '   - Add the proxy URL before your API URL\n';
            errorMessage += '   - Note: Not recommended for production or sensitive data\n\n';
            
            errorMessage += '3. Browser extension to disable CORS (for development only)\n';
            errorMessage += '   - Not recommended for regular browsing\n\n';
            
            errorMessage += 'For more information on CORS:\n';
            errorMessage += 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS';
        } else if (error.name === 'AbortError') {
            errorMessage += '\n\nRequest timed out. The server took too long to respond.';
        }
        
        responseBody.innerHTML = `<pre class="error-message">${errorMessage}</pre>`;
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    document.querySelector('.response').style.display = 'block';
    console.error('Request error:', error);
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

// Add proxy settings to the UI
function addProxySettings() {
    // Find the settings section or create one if it doesn't exist
    let settingsSection = document.querySelector('.settings-section');
    
    if (!settingsSection) {
        // Create settings section
        settingsSection = document.createElement('div');
        settingsSection.className = 'settings-section';
        settingsSection.style.marginTop = '20px';
        settingsSection.style.padding = '15px';
        settingsSection.style.backgroundColor = '#f8f9fa';
        settingsSection.style.borderRadius = '4px';
        settingsSection.style.border = '1px solid #e2e8f0';
        
        // Create section header
        const settingsHeader = document.createElement('h3');
        settingsHeader.textContent = 'Advanced Settings';
        settingsHeader.style.marginTop = '0';
        settingsSection.appendChild(settingsHeader);
        
        // Add settings section to the page
        const container = document.querySelector('.container') || document.body;
        container.appendChild(settingsSection);
    }
    
    // Create proxy settings container
    const proxyContainer = document.createElement('div');
    proxyContainer.className = 'proxy-settings';
    proxyContainer.style.marginBottom = '15px';
    
    // Create proxy checkbox
    const proxyCheckboxContainer = document.createElement('div');
    proxyCheckboxContainer.className = 'form-group';
    proxyCheckboxContainer.style.marginBottom = '10px';
    
    const proxyCheckbox = document.createElement('input');
    proxyCheckbox.type = 'checkbox';
    proxyCheckbox.id = 'use-proxy';
    proxyCheckbox.style.marginRight = '8px';
    
    const proxyCheckboxLabel = document.createElement('label');
    proxyCheckboxLabel.htmlFor = 'use-proxy';
    proxyCheckboxLabel.textContent = 'Use CORS Proxy (for external APIs)';
    proxyCheckboxLabel.style.fontWeight = 'normal';
    
    proxyCheckboxContainer.appendChild(proxyCheckbox);
    proxyCheckboxContainer.appendChild(proxyCheckboxLabel);
    
    // Create proxy URL input
    const proxyUrlContainer = document.createElement('div');
    proxyUrlContainer.className = 'form-group';
    proxyUrlContainer.style.marginBottom = '10px';
    
    const proxyUrlLabel = document.createElement('label');
    proxyUrlLabel.htmlFor = 'proxy-url';
    proxyUrlLabel.textContent = 'Proxy URL:';
    proxyUrlLabel.style.display = 'block';
    proxyUrlLabel.style.marginBottom = '5px';
    
    const proxyUrlInput = document.createElement('input');
    proxyUrlInput.type = 'text';
    proxyUrlInput.id = 'proxy-url';
    proxyUrlInput.className = 'form-control';
    proxyUrlInput.placeholder = 'https://cors-anywhere.herokuapp.com/';
    proxyUrlInput.style.width = '100%';
    proxyUrlInput.style.padding = '8px';
    proxyUrlInput.style.border = '1px solid #ced4da';
    proxyUrlInput.style.borderRadius = '4px';
    
    // Initially disable the URL input
    proxyUrlInput.disabled = !proxyCheckbox.checked;
    
    // Enable/disable URL input based on checkbox
    proxyCheckbox.addEventListener('change', () => {
        proxyUrlInput.disabled = !proxyCheckbox.checked;
    });
    
    proxyUrlContainer.appendChild(proxyUrlLabel);
    proxyUrlContainer.appendChild(proxyUrlInput);
    
    // Add help text
    const helpText = document.createElement('p');
    helpText.className = 'help-text';
    helpText.textContent = 'A CORS proxy helps bypass browser security restrictions when calling external APIs directly.';
    helpText.style.fontSize = '0.85em';
    helpText.style.color = '#6c757d';
    helpText.style.marginTop = '5px';
    
    // Assemble the proxy settings
    proxyContainer.appendChild(proxyCheckboxContainer);
    proxyContainer.appendChild(proxyUrlContainer);
    proxyContainer.appendChild(helpText);
    
    // Add to settings section
    settingsSection.appendChild(proxyContainer);
}

// Call this function when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Add proxy settings
    addProxySettings();
});