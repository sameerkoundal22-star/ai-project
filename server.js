// OpenSource AI - Complete Single-Instance Integrated Web Server with Secure Auth
const http = require('http');
const fs = require('fs');
const path = require('path');
const aiService = require('./ai-service');
const githubService = require('./github-service');
const authService = require('./auth-service');
const redditService = require('./reddit-service');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // --- AUTHENTICATION API ENDPOINTS (CREDENTIALS & SESSIONS) ---

  // POST /api/auth/register
  if (pathname === '/api/auth/register' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = authService.register(body);
      return sendJSON(res, 201, { success: true, user: result.user, token: result.token });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = authService.login(body);
      return sendJSON(res, 200, { success: true, user: result.user, token: result.token });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // GET /api/auth/me
  if (pathname === '/api/auth/me' && method === 'GET') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const user = authService.validateSession(token);
    if (!user) {
      return sendJSON(res, 401, { success: false, error: 'Unauthorized' });
    }
    return sendJSON(res, 200, { success: true, user });
  }

  // POST /api/auth/logout
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    authService.logout(token);
    return sendJSON(res, 200, { success: true, message: 'Logged out' });
  }

  // --- EXISTING AI & GITHUB ENDPOINTS ---

  // Reddit Official Discussions Search API
  if (pathname === '/api/reddit/search' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { query, subreddit, limit } = body;
      const result = await redditService.searchDiscussions({ query, subreddit, limit });
      return sendJSON(res, 200, result);
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message, posts: [] });
    }
  }

  // Reddit Configuration Status API
  if (pathname === '/api/reddit/status' && method === 'GET') {
    return sendJSON(res, 200, {
      configured: redditService.isConfigured(),
      subreddits: redditService.defaultSubreddits
    });
  }

  // Universal Instant Search Endpoint
  if (pathname === '/api/search' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { query, activeRepo } = body;
      if (!query || !query.trim()) {
        return sendJSON(res, 400, { success: false, error: 'Query is empty' });
      }
      const searchResult = await aiService.searchKnowledge({ query, activeRepo });
      return sendJSON(res, 200, { success: true, result: searchResult });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // Analyze Repository API
  if (pathname === '/api/repo/analyze' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const url = body.url;
      if (!url) {
        return sendJSON(res, 400, { success: false, error: 'Repository URL is required.' });
      }
      const result = await githubService.analyzeRepository(url);
      return sendJSON(res, 200, {
        success: true,
        mode: result.mode,
        reason: result.reason,
        data: result.data
      });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // Chatbot AI Mentor API
  if (pathname === '/api/chat' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { message, repoContext } = body;
      if (!message) {
        return sendJSON(res, 400, { success: false, error: 'Message cannot be empty.' });
      }
      const replyData = await aiService.answerChat({ message, repoContext });
      return sendJSON(res, 200, {
        success: true,
        reply: replyData.reply,
        mode: replyData.mode,
        provider: replyData.provider
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // Issue Triage API
  if (pathname === '/api/triage' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { title, description, repoName } = body;
      const result = await aiService.triageIssue({ title, description, repoName });
      return sendJSON(res, 200, {
        success: true,
        triage: result.triage,
        mode: result.mode
      });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // Code Review API
  if (pathname === '/api/review' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { language, code, description } = body;
      const result = await aiService.reviewCode({ language, code, description });
      return sendJSON(res, 200, {
        success: true,
        review: result.review,
        mode: result.mode
      });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // Config & Public Environment API
  if (pathname === '/api/config') {
    if (method === 'GET') {
      return sendJSON(res, 200, {
        geminiConfigured: aiService.isConfigured(),
        redditConfigured: redditService.isConfigured(),
        githubConfigured: githubService.isConfigured(),
        supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
      });
    } else if (method === 'POST') {
      const body = await parseBody(req);
      if (body.geminiKey !== undefined) aiService.setApiKey(body.geminiKey);
      if (body.githubToken !== undefined) githubService.setToken(body.githubToken);
      if (body.supabaseUrl !== undefined) process.env.SUPABASE_URL = body.supabaseUrl;
      if (body.supabaseAnonKey !== undefined) process.env.SUPABASE_ANON_KEY = body.supabaseAnonKey;
      return sendJSON(res, 200, {
        success: true,
        message: 'Settings updated'
      });
    }
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Internal Server Error');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenSource AI server listening on http://localhost:${PORT}`);
});

module.exports = server;
