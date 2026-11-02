// Reddit Service: Official Reddit API Client + OAuth2 Token Management + In-Memory Cache
// Respects Reddit API terms, rate limits, caching, and provides clean public search results.
const https = require('https');

class RedditService {
  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID || '';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    this.userAgent = process.env.REDDIT_USER_AGENT || 'web:opensource-ai-mentor:v1.0.0 (by /u/developer)';

    this.accessToken = null;
    this.tokenExpiresAt = 0;

    // Cache: key -> { data, timestamp }
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

    // Default curated developer & open-source subreddits
    this.defaultSubreddits = [
      'opensource',
      'github',
      'git',
      'learnprogramming',
      'Python',
      'cpp',
      'javascript',
      'reactjs',
      'MachineLearning'
    ];
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  setCredentials({ clientId, clientSecret, userAgent }) {
    if (clientId !== undefined) this.clientId = clientId.trim();
    if (clientSecret !== undefined) this.clientSecret = clientSecret.trim();
    if (userAgent !== undefined) this.userAgent = userAgent.trim();
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  // Obtain Application-only OAuth2 Access Token using client_credentials grant
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    if (!this.isConfigured()) {
      throw new Error('REDDIT_NOT_CONFIGURED');
    }

    const authHeader = 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'www.reddit.com',
        path: '/api/v1/access_token',
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': this.userAgent
        },
        timeout: 8000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.access_token) {
              this.accessToken = data.access_token;
              this.tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
              resolve(this.accessToken);
            } else if (data.error) {
              reject(new Error(`Reddit Auth Error: ${data.error}`));
            } else {
              reject(new Error('Invalid response from Reddit OAuth endpoint.'));
            }
          } catch (e) {
            reject(new Error('Failed to parse Reddit OAuth response.'));
          }
        });
      });

      req.on('error', (err) => reject(new Error(`Reddit Network Error: ${err.message}`)));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Reddit OAuth request timed out.'));
      });
      req.write(postData);
      req.end();
    });
  }

  // Search public discussions via Reddit Official OAuth API
  async searchDiscussions({ query, subreddit, limit = 8 }) {
    if (!query || !query.trim()) {
      return { success: true, posts: [], source: 'empty_query' };
    }

    const cleanQuery = query.trim();
    const targetSubreddit = (subreddit && subreddit.trim()) ? subreddit.trim().replace(/^r\//i, '') : null;
    const cacheKey = `search:${cleanQuery.toLowerCase()}:${targetSubreddit || 'all'}:${limit}`;

    // Check in-memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return { success: true, posts: cached.data, fromCache: true, configured: true };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        configured: false,
        error: 'Reddit API credentials are not configured.',
        requiredEnvVars: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_USER_AGENT'],
        posts: []
      };
    }

    try {
      const token = await this.getAccessToken();
      const encodedQ = encodeURIComponent(cleanQuery);
      let apiPath = '';

      if (targetSubreddit) {
        apiPath = `/r/${encodeURIComponent(targetSubreddit)}/search.json?q=${encodedQ}&restrict_sr=1&sort=relevance&limit=${Math.min(limit, 15)}`;
      } else {
        // Search across developer subreddits
        const subList = this.defaultSubreddits.join('+');
        apiPath = `/r/${subList}/search.json?q=${encodedQ}&restrict_sr=1&sort=relevance&limit=${Math.min(limit, 15)}`;
      }

      const results = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'oauth.reddit.com',
          path: apiPath,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': this.userAgent
          },
          timeout: 9000
        }, (res) => {
          if (res.statusCode === 429) {
            reject(new Error('Reddit API rate limit exceeded. Please wait a moment.'));
            return;
          }
          if (res.statusCode === 403 || res.statusCode === 401) {
            reject(new Error('Reddit authentication failed or community is restricted.'));
            return;
          }
          if (res.statusCode === 404) {
            reject(new Error('Specified subreddit was not found.'));
            return;
          }

          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed);
            } catch (e) {
              reject(new Error('Failed to parse Reddit search results.'));
            }
          });
        });

        req.on('error', (err) => reject(new Error(`Reddit search network error: ${err.message}`)));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Reddit search request timed out.'));
        });
        req.end();
      });

      const children = (results && results.data && Array.isArray(results.data.children))
        ? results.data.children
        : [];

      // Extract and sanitize public fields only
      const sanitizedPosts = children
        .filter(c => c && c.data && !c.data.over_18 && !c.data.hidden)
        .map(c => {
          const d = c.data;
          const postText = (d.selftext && d.selftext.trim()) ? d.selftext.trim().slice(0, 400) : '';
          return {
            id: d.id,
            title: d.title || 'Untitled Discussion',
            subreddit: d.subreddit_name_prefixed || `r/${d.subreddit}`,
            subredditRaw: d.subreddit,
            author: (d.author && d.author !== '[deleted]') ? d.author : 'reddit_contributor',
            score: d.score || 0,
            numComments: d.num_comments || 0,
            createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : new Date().toISOString(),
            url: d.permalink ? `https://www.reddit.com${d.permalink}` : (d.url || ''),
            summary: postText,
            flair: d.link_flair_text || null
          };
        });

      // Save in cache
      this.cache.set(cacheKey, { data: sanitizedPosts, timestamp: Date.now() });

      return {
        success: true,
        configured: true,
        posts: sanitizedPosts,
        count: sanitizedPosts.length
      };
    } catch (err) {
      return {
        success: false,
        configured: true,
        error: err.message,
        posts: []
      };
    }
  }
}

module.exports = new RedditService();
