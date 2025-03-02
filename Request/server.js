const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();

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
app.use(express.static('.'));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add a test endpoint
app.get('/test', (req, res) => {
  res.json({ status: 'Proxy server is working!' });
});

// Store path for cookies
const KIMI_COOKIES_FILE = path.join(__dirname, 'kimi_cookies.json');

// Helper function to save cookies
function saveCookies(cookies) {
  try {
    fs.writeFileSync(KIMI_COOKIES_FILE, JSON.stringify(cookies, null, 2));
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
    if (fs.existsSync(KIMI_COOKIES_FILE)) {
      const data = fs.readFileSync(KIMI_COOKIES_FILE, 'utf8');
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
    
    // Add cookies if we have them stored
    const cookiesData = loadCookies();
    if (cookiesData && cookiesData.cookie) {
      headers['Cookie'] = cookiesData.cookie;
      console.log('Added stored cookies to request');
    }
    
    console.log('Sending with headers:', headers);
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
      redirect: 'follow'
    });
    
    // Copy all response headers
    for (const [key, value] of Object.entries(response.headers.raw())) {
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
      message: error.message
    });
  }
});

// Support OPTIONS requests for kimi-proxy
app.options('/kimi-proxy', cors());

// Start the server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Kimi API endpoint: http://localhost:${PORT}/kimi-proxy`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
  console.log(`UI: http://localhost:${PORT}/request.html`);
}); 