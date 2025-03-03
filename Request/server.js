const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Environment configuration
const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    proxyTimeout: parseInt(process.env.PROXY_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 1000,
    debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'
};

// Ensure directories exist
const BASE_DIR = path.join(__dirname);
const COOKIES_DIR = path.join(BASE_DIR, 'cookies');

if (!fs.existsSync(COOKIES_DIR)) {
    fs.mkdirSync(COOKIES_DIR, { recursive: true });
    console.log('Created cookies directory');
}

// Configure axios defaults
axios.defaults.timeout = config.proxyTimeout;
axios.defaults.maxRedirects = 5;

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Add request logging in development
if (config.debug) {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });
}

// Serve static files from the current directory
app.use(express.static(__dirname));

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ status: 'ok' });
});

// Serve the main page for root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'request.html'));
});

// Cookie files
const KIMI_COOKIES_FILE = path.join(COOKIES_DIR, 'kimi.json');
const GROK_COOKIES_FILE = path.join(COOKIES_DIR, 'grok.json');
const DEEPSEEK_SESSION_FILE = path.join(__dirname, 'deepseek_session.json');

// Helper function to save cookies
function saveCookies(cookies, file) {
  try {
    fs.writeFileSync(file, JSON.stringify(cookies, null, 2));
    console.log('Cookies saved successfully to', file);
    return true;
  } catch (error) {
    console.error('Error saving cookies:', error);
    return false;
  }
}

// Helper function to load cookies
function loadCookies(file) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading cookies:', error);
  }
  return {};
}

// Endpoint to set cookies
app.post('/set-cookies', (req, res) => {
  console.log('Received request to set cookies');
  try {
    const file = req.body.type === 'grok' ? GROK_COOKIES_FILE : KIMI_COOKIES_FILE;
    const cookies = req.body.cookies;
    if (!cookies) {
      return res.status(400).json({ error: 'No cookies provided' });
    }
    const saved = saveCookies({ cookie: cookies }, file);
    console.log(`Saved ${req.body.type || 'default'} cookies`);
    res.json({ message: 'Cookies saved successfully', success: true });
  } catch (error) {
    console.error('Error saving cookies:', error);
    res.status(500).json({
      error: 'Failed to save cookies',
      message: error.message
    });
  }
});

// Endpoint to get current cookies
app.get('/get-cookies', (req, res) => {
  const type = req.query.type || 'kimi';
  const file = type === 'grok' ? GROK_COOKIES_FILE : KIMI_COOKIES_FILE;
  const cookies = loadCookies(file);
  res.json(cookies);
});

// Endpoint to set Grok cookies
app.post('/set-grok-cookies', (req, res) => {
    console.log('Received request to set Grok cookies');
    try {
        const cookies = req.body.cookies;
        if (!cookies) {
            return res.status(400).json({ error: 'No cookies provided' });
        }

        // Ensure the cookies directory exists
        if (!fs.existsSync(path.join(BASE_DIR, 'cookies'))) {
            fs.mkdirSync(path.join(BASE_DIR, 'cookies'), { recursive: true });
        }

        // Save the cookies
        const saved = saveCookies({ cookie: cookies }, GROK_COOKIES_FILE);
        console.log('Saved Grok cookies');
        
        res.json({ message: 'Grok cookies saved successfully', success: true });
    } catch (error) {
        console.error('Error saving Grok cookies:', error);
        res.status(500).json({
            error: 'Failed to save Grok cookies',
            message: error.message
        });
    }
});

// Endpoint to get Grok cookies
app.get('/get-grok-cookies', (req, res) => {
    console.log('Received request for Grok cookies');
    try {
        if (!fs.existsSync(GROK_COOKIES_FILE)) {
            console.log('No Grok cookies file exists');
            return res.json({ message: 'No Grok cookies saved' });
        }

        const cookiesData = loadCookies(GROK_COOKIES_FILE);
        console.log('Successfully loaded Grok cookies');
        
        res.json({
            cookies: cookiesData?.cookie || '',
            message: 'Grok cookies retrieved successfully'
        });
    } catch (error) {
        console.error('Error retrieving Grok cookies:', error);
        res.status(500).json({
            error: 'Failed to retrieve Grok cookies',
            message: error.message
        });
    }
});

// Generic proxy endpoint
app.post('/proxy', async (req, res) => {
    const targetUrl = req.headers['target-url'];
    if (!targetUrl) {
        return res.status(400).json({ error: 'Target URL is required' });
    }

    try {
        console.log(`Proxying request to: ${targetUrl}`);
        
        // Parse the target URL
        const parsedUrl = new URL(targetUrl);
        
        // Create a more browser-like headers object
        const headers = {
            ...req.headers,
            'host': parsedUrl.host,
            'origin': parsedUrl.origin,
            'referer': req.headers.referer || parsedUrl.origin,
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'connection': 'keep-alive'
        };

        // Remove proxy-specific headers
        delete headers['target-url'];
        delete headers['host'];  // We'll set this automatically
        delete headers['content-length'];  // Let axios handle this

        console.log('Request headers:', headers);
        console.log('Request body:', req.body);

        // Make the request with retries
        let retries = 3;
        let lastError = null;

        while (retries > 0) {
            try {
                const response = await axios({
                    method: req.method,
                    url: targetUrl,
                    data: req.body,
                    headers: headers,
                    maxRedirects: 5,
                    timeout: 30000, // 30 second timeout
                    validateStatus: function (status) {
                        return status >= 200 && status < 600; // Accept a wider range of status codes
                    }
                });

                // Log response details
                console.log(`Response status: ${response.status}`);
                console.log('Response headers:', response.headers);

                // Forward the response
                res.status(response.status).json(response.data);
                return;

            } catch (error) {
                lastError = error;
                console.error(`Attempt ${4-retries} failed:`, error.message);
                if (error.response) {
                    console.error('Response status:', error.response.status);
                    console.error('Response headers:', error.response.headers);
                }
                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                }
            }
        }

        // If we get here, all retries failed
        console.error('All retry attempts failed');
        res.status(500).json({
            error: 'Proxy request failed after multiple attempts',
            message: lastError?.message || 'Unknown error',
            details: lastError?.response?.data || {}
        });

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data || {},
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Kimi API proxy endpoint
app.post('/kimi-proxy', async (req, res) => {
  try {
    // Get the target URL from the header
    const targetUrl = req.headers['target-url'];
    if (!targetUrl) {
      return res.status(400).json({
        error: 'Missing target-url header',
        message: 'The target-url header is required for Kimi API proxy'
      });
    }
    
    console.log(`Kimi proxy to: ${targetUrl}`);
    
    // Copy all headers except a few problematic ones
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!['host', 'connection', 'content-length', 'target-url'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }
    
    // Add required Kimi headers
    headers['Origin'] = 'https://kimi.moonshot.cn';
    headers['Referer'] = 'https://kimi.moonshot.cn/';
    
    // Add cookies if we have them stored
    const cookiesData = loadCookies(KIMI_COOKIES_FILE);
    if (cookiesData && cookiesData.cookie) {
      headers['Cookie'] = cookiesData.cookie;
      console.log('Added stored cookies to request');
    }
    
    console.log('Sending with headers:', headers);
    
    const response = await axios({
      method: 'POST',
      url: targetUrl,
      data: req.body,
      headers: headers
    });
    
    // Send back the response
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Kimi proxy error:', error);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// Support OPTIONS requests for kimi-proxy
app.options('/kimi-proxy', cors());

// Grok-specific proxy endpoint
app.all('/grok-proxy', async (req, res) => {
    const targetUrl = req.headers['target-url'] || 'https://grok.com/rest/app-chat/conversations/new';
    const method = req.method;

    try {
        console.log(`Grok proxy ${method} request:`, {
            url: targetUrl,
            method: method,
            body: method === 'POST' ? req.body : null,
            headers: req.headers
        });
        
        // Grok-specific headers
        const headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'origin': 'https://grok.com',
            'referer': 'https://grok.com/',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'baggage': 'sentry-environment=production,sentry-release=tWwe9kTlCRJqrL0FTk4Hc,sentry-public_key=b311e0f2690c81f25e2c4cf6d4f7ce1c,sentry-trace_id=7cc1dee8efd047ac85d2c25037f54653,sentry-sample_rate=0,sentry-sampled=false',
            'sentry-trace': '7cc1dee8efd047ac85d2c25037f54653-9f76dec9fe92634c-0'
        };
        
        // Add cookies from the request if they exist
        if (req.headers.cookie) {
            headers.cookie = req.headers.cookie;
        } else {
            // If no cookies provided, try to load saved cookies
            try {
                const cookiesData = loadCookies(GROK_COOKIES_FILE);
                if (cookiesData && cookiesData.cookie) {
                    headers.cookie = cookiesData.cookie;
                    console.log('Using saved Grok cookies');
                } else {
                    // If no saved cookies, use default ones
                    headers.cookie = '_ga=GA1.1.1409377758.1740204883; _ga_8FEWB057YH=GS1.1.1740999512.21.1.1741002769.0.0.0; cf_clearance=q8U.7.5tNPFrEjUrWY97CT22HBf0guv8ac_MU4.JczM-1741002754-1.2.1.1-KRyOm1mxsa5nOBFzLhXpqQzEYF3ttcC0HvaapVfJk64UZ.KzYd.Y7dJgu.yq6Cuz1LAkECuDhOABRhl39cCtcIwmVDn3CdmSUjpMHhpi1AB0Ud5fUR6LJAOSFI1CWmZoaX3mvr1uIHcY6AddF6nC8Zz61QGerdOM059amfcCFfPCpGe6Zg80Y7ApSvc4xe6n0QtP0CaPdqeNLD5U5TiTmy8nvJiqvTvssQtc97CbSdAz94svdnJPYlCd8n7L1.3zb9lWNP9bXam_3Ww7AdrUZOIegoXMBuMVdJlXQ1R2jdZNQRgcDu6cyMweCfnZICJvnc_O44CeHsVBpJ6nVAkYyUvZeEo60ru_J7Pywz7Nu0qtwd1g9OHvi5wIU..Fb9_8nQyCU._.CwCPJfCqlpDbRs0hV6E1smcEHVTpI.oPw7M; sso=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiMzJkMzEwYjUtNDAwNi00M2Y3LWJkMGUtNzA1ODNlMWViNjFkIn0.NawsRQEQc_T34tQrAKJvdd85DycuB3UgfWZD44ThuFI; sso-rw=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiMzJkMzEwYjUtNDAwNi00M2Y3LWJkMGUtNzA1ODNlMWViNjFkIn0.NawsRQEQc_T34tQrAKJvdd85DycuB3UgfWZD44ThuFI';
                    console.log('Using default Grok cookies');
                }
            } catch (error) {
                console.error('Error loading Grok cookies:', error);
                // Fallback to default cookies
                headers.cookie = '_ga=GA1.1.1409377758.1740204883; _ga_8FEWB057YH=GS1.1.1740999512.21.1.1741002769.0.0.0; cf_clearance=q8U.7.5tNPFrEjUrWY97CT22HBf0guv8ac_MU4.JczM-1741002754-1.2.1.1-KRyOm1mxsa5nOBFzLhXpqQzEYF3ttcC0HvaapVfJk64UZ.KzYd.Y7dJgu.yq6Cuz1LAkECuDhOABRhl39cCtcIwmVDn3CdmSUjpMHhpi1AB0Ud5fUR6LJAOSFI1CWmZoaX3mvr1uIHcY6AddF6nC8Zz61QGerdOM059amfcCFfPCpGe6Zg80Y7ApSvc4xe6n0QtP0CaPdqeNLD5U5TiTmy8nvJiqvTvssQtc97CbSdAz94svdnJPYlCd8n7L1.3zb9lWNP9bXam_3Ww7AdrUZOIegoXMBuMVdJlXQ1R2jdZNQRgcDu6cyMweCfnZICJvnc_O44CeHsVBpJ6nVAkYyUvZeEo60ru_J7Pywz7Nu0qtwd1g9OHvi5wIU..Fb9_8nQyCU._.CwCPJfCqlpDbRs0hV6E1smcEHVTpI.oPw7M; sso=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiMzJkMzEwYjUtNDAwNi00M2Y3LWJkMGUtNzA1ODNlMWViNjFkIn0.NawsRQEQc_T34tQrAKJvdd85DycuB3UgfWZD44ThuFI; sso-rw=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiMzJkMzEwYjUtNDAwNi00M2Y3LWJkMGUtNzA1ODNlMWViNjFkIn0.NawsRQEQc_T34tQrAKJvdd85DycuB3UgfWZD44ThuFI';
            }
        }

        // Make the request with retries
        let retries = config.maxRetries;
        let lastError = null;

        while (retries > 0) {
            try {
                const axiosConfig = {
                    method: method,
                    url: targetUrl,
                    headers: headers,
                    maxRedirects: 5,
                    timeout: config.proxyTimeout,
                    validateStatus: function (status) {
                        return status >= 200 && status < 600;
                    },
                    httpsAgent: new (require('https').Agent)({
                        rejectUnauthorized: false,
                        keepAlive: true,
                        timeout: config.proxyTimeout
                    })
                };
                
                // Add body for POST requests
                if (method === 'POST' && req.body) {
                    axiosConfig.data = req.body;
                }

                const response = await axios(axiosConfig);

                // Log response details in debug mode
                if (config.debug) {
                    console.log('Grok response:', {
                        status: response.status,
                        headers: response.headers,
                        data: response.data
                    });
                }

                // Store cookies from response if present
                if (response.headers['set-cookie']) {
                    console.log('Received cookies from Grok API');
                    
                    // Save cookies for future requests
                    const cookieString = Array.isArray(response.headers['set-cookie']) 
                        ? response.headers['set-cookie'].join('; ')
                        : response.headers['set-cookie'];
                    
                    saveCookies({ cookie: cookieString }, GROK_COOKIES_FILE);
                }

                // Forward the response
                res.status(response.status);
                
                // Copy relevant headers
                ['content-type', 'content-encoding', 'date', 'server', 'set-cookie'].forEach(header => {
                    if (response.headers[header]) {
                        res.setHeader(header, response.headers[header]);
                    }
                });

                // Handle streaming response if needed
                if (req.headers['accept']?.includes('text/event-stream') && response.headers['content-type']?.includes('text/event-stream')) {
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Connection', 'keep-alive');
                    response.data.pipe(res);
                } else {
                    res.json(response.data);
                }
                return;

            } catch (error) {
                lastError = error;
                console.error(`Grok request attempt ${config.maxRetries - retries + 1} failed:`, {
                    message: error.message,
                    code: error.code,
                    response: error.response?.data
                });

                retries--;
                if (retries > 0) {
                    console.log(`Retrying in ${config.retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, config.retryDelay));
                }
            }
        }

        // If we get here, all retries failed
        console.error('All Grok request attempts failed');
        res.status(500).json({
            error: 'Grok request failed after multiple attempts',
            message: lastError?.message || 'Unknown error',
            details: lastError?.response?.data || {}
        });

    } catch (error) {
        console.error('Grok proxy error:', error);
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data || {},
            stack: config.debug ? error.stack : undefined
        });
    }
});

// DeepSeek PoW challenge endpoint
app.post('/deepseek-pow', async (req, res) => {
    try {
        const headers = {
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8,ne-NP;q=0.7,ne;q=0.6',
            'authorization': 'Bearer AUXtcPXwKSNpg/gCziP8a3TKGyJn/X88NUxR41mLkLonXl7kqUIcf9rtaepkVuqU',
            'content-type': 'application/json',
            'origin': 'https://chat.deepseek.com',
            'priority': 'u=1, i',
            'referer': 'https://chat.deepseek.com/',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            'sec-ch-ua-arch': '"x86"',
            'sec-ch-ua-bitness': '"64"',
            'sec-ch-ua-full-version': '"133.0.6943.142"',
            'sec-ch-ua-full-version-list': '"Not(A:Brand";v="99.0.0.0", "Google Chrome";v="133.0.6943.142", "Chromium";v="133.0.6943.142"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"15.0.0"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'x-app-version': '20241129.1',
            'x-client-locale': 'en_US',
            'x-client-platform': 'web',
            'x-client-version': '1.0.0-always',
            'cookie': req.headers.cookie || ''
        };

        // Request the PoW challenge
        const response = await axios({
            method: 'POST',
            url: 'https://chat.deepseek.com/api/v0/chat/create_pow_challenge',
            data: { target_path: req.body.target_path || '/api/v0/chat/completion' },
            headers: headers
        });

        res.json(response.data);
    } catch (error) {
        console.error('DeepSeek PoW error:', error);
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data || {}
        });
    }
});

// DeepSeek proxy endpoint
app.post('/deepseek-proxy', async (req, res) => {
    try {
        // Common headers for all DeepSeek requests
        const headers = {
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8,ne-NP;q=0.7,ne;q=0.6',
            'authorization': 'Bearer AUXtcPXwKSNpg/gCziP8a3TKGyJn/X88NUxR41mLkLonXl7kqUIcf9rtaepkVuqU',
            'content-type': 'application/json',
            'origin': 'https://chat.deepseek.com',
            'priority': 'u=1, i',
            'referer': 'https://chat.deepseek.com/',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            'sec-ch-ua-arch': '"x86"',
            'sec-ch-ua-bitness': '"64"',
            'sec-ch-ua-full-version': '"133.0.6943.142"',
            'sec-ch-ua-full-version-list': '"Not(A:Brand";v="99.0.0.0", "Google Chrome";v="133.0.6943.142", "Chromium";v="133.0.6943.142"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"15.0.0"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'x-app-version': '20241129.1',
            'x-client-locale': 'en_US',
            'x-client-platform': 'web',
            'x-client-version': '1.0.0-always',
            'cookie': req.headers.cookie || ''
        };

        const targetUrl = req.headers['target-url'] || 'https://chat.deepseek.com/api/v0/chat_session/create';

        // If the request is for chat completion, we need to handle PoW
        if (targetUrl.includes('/chat/completion')) {
            // Get PoW challenge first
            const powResponse = await axios({
                method: 'POST',
                url: 'https://chat.deepseek.com/api/v0/chat/create_pow_challenge',
                data: { target_path: '/api/v0/chat/completion' },
                headers: headers
            });

            if (powResponse.data?.data?.biz_data?.challenge) {
                // Send challenge to client
                res.status(202).json({
                    needsPow: true,
                    challenge: powResponse.data.data.biz_data.challenge
                });
                return;
            }
        }

        const response = await axios({
            method: 'POST',
            url: targetUrl,
            data: req.body,
            headers: headers,
            maxRedirects: 5,
            timeout: config.proxyTimeout,
            validateStatus: function (status) {
                return status >= 200 && status < 600;
            }
        });

        // Forward the response
        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });

        // Handle streaming response
        if (req.headers['accept']?.includes('text/event-stream')) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            response.data.pipe(res);
        } else {
            res.json(response.data);
        }

    } catch (error) {
        console.error('DeepSeek proxy error:', error);
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data || {}
        });
    }
});

// Endpoint to get DeepSeek session info
app.get('/deepseek-session', (req, res) => {
    console.log('Received request for DeepSeek session info');
    try {
        if (!fs.existsSync(DEEPSEEK_SESSION_FILE)) {
            console.log('No session file exists');
            return res.json({ message: 'No active session' });
        }

        const fileContent = fs.readFileSync(DEEPSEEK_SESSION_FILE, 'utf8');
        const sessionData = JSON.parse(fileContent);
        console.log('Successfully loaded session data:', sessionData);
        
        res.setHeader('Content-Type', 'application/json');
        res.json(sessionData);
    } catch (error) {
        console.error('Error handling session request:', error);
        res.status(500).json({
            error: 'Failed to retrieve session data',
            message: error.message
        });
    }
});

// Start the server
const server = app.listen(config.port, () => {
  console.log(`Proxy server running on http://localhost:${config.port}`);
  console.log(`Kimi API endpoint: http://localhost:${config.port}/kimi-proxy`);
  console.log(`Grok API endpoint: http://localhost:${config.port}/grok-proxy`);
  console.log(`Test endpoint: http://localhost:${config.port}/test`);
  console.log(`UI: http://localhost:${config.port}/request.html`);
  console.log(`Grok Settings: http://localhost:${config.port}/grok-settings.html`);
}); 