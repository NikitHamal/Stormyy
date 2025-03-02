// server.js - Kimi API Proxy Server
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: '*',
  allowedHeaders: '*',
  exposedHeaders: '*',
  credentials: true
}));

// Respond to preflight requests
app.options('*', cors());

// Serve static files
app.use(express.static(__dirname));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add a test endpoint
app.get('/test', (req, res) => {
  res.json({ status: 'Proxy server is working!' });
});

// Store path for cookies
const COOKIES_FILE = path.join(__dirname, 'cookies.json');

// Helper function to save cookies
function saveCookies(cookies) {
  try {
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log('Cookies saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving cookies:', error);
    return false;
  }
}

// Helper function to load cookies
function loadCookies() {
  try {
    if (fs.existsSync(COOKIES_FILE)) {
      const data = fs.readFileSync(COOKIES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading cookies:', error);
  }
  return {};
}

// Endpoint to set cookies
app.post('/set-cookies', (req, res) => {
  const { cookies } = req.body;
  if (!cookies) {
    return res.status(400).json({ error: 'No cookies provided' });
  }
  
  const saved = saveCookies({ cookie: cookies });
  if (saved) {
    res.json({ status: 'Cookies saved successfully' });
  } else {
    res.status(500).json({ error: 'Failed to save cookies' });
  }
});

// Endpoint to get current cookies
app.get('/get-cookies', (req, res) => {
  const cookies = loadCookies();
  res.json(cookies);
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
    
    // Add the authorization header (necessary for Kimi API)
    headers['authorization'] = `Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc0NzA2NDMyMywiaWF0IjoxNzM5Mjg4MzIzLCJqdGkiOiJjdWxtdTBzcmlpY2RwZmo3c3FzMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJjdWg1cmdpYXYxZjNlcTE3Y2Y1MCIsInNwYWNlX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNGciLCJhYnN0cmFjdF91c2VyX2lkIjoiY3VoNXJnaWF2MWYzZXExN2NmNDAiLCJkZXZpY2VfaWQiOiI3NDcwMTg2MjAzNjA2ODQwMzMzIn0.vIdmw4H-uLl5gYo1ERok62c3QC6KeAzi_RvU0h-1DVM7DGQkPSH-nGhNiKuPmNzucq2qtn5We52rO7kedXuC1A`;
    
    // Add cookies if we have them stored
    const cookiesData = loadCookies();
    if (cookiesData && cookiesData.cookie) {
      headers['Cookie'] = cookiesData.cookie;
      console.log('Added stored cookies to request');
    }
    
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Sending with headers:', JSON.stringify(headers, null, 2));
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(req.body),
      redirect: 'follow'
    });
    
    console.log('Response status:', response.status);
    
    // Copy all response headers
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log('Response headers:', JSON.stringify(responseHeaders, null, 2));
    
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() !== 'content-encoding') { // Skip content-encoding to avoid double-compression
        res.setHeader(key, value);
      }
    }
    
    // Set CORS headers on response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    
    // Send status
    res.status(response.status);
    
    // For streaming responses
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('Streaming response detected');
      
      // Pipe the response body to the client
      response.body.pipe(res);
    } else {
      // For regular responses
      const responseText = await response.text();
      console.log('Response body (first 200 chars):', responseText.substring(0, 200));
      
      // Check if this was an error response
      if (response.status >= 400) {
        console.error(`Error response from Kimi API (${response.status}):`, responseText);
      }
      
      res.send(responseText);
    }
  } catch (error) {
    console.error('Kimi proxy error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      stack: error.stack
    });
  }
});

// Support OPTIONS requests for kimi-proxy
app.options('/kimi-proxy', cors());

// Start the server
app.listen(PORT, () => {
  console.log(`
=========================================
✅ Kimi Proxy Server is running!
🌐 http://localhost:${PORT}

📱 You can access the chat interface at:
   http://localhost:${PORT}/index.html

💡 If you are having trouble with requests:
   1. Check that you're using the correct request format
   2. Ensure the target-url header is set correctly
   3. Verify your API key and device IDs are valid

=========================================
`);
});