// GitHub Service: Handles real GitHub API fetching or clean fallback to Demo Mode
const https = require('https');

class GitHubService {
  constructor(token = process.env.GITHUB_TOKEN || '') {
    this.token = token;
  }

  setToken(token) {
    this.token = (token || '').trim();
  }

  isConfigured() {
    return Boolean(this.token && this.token.length > 10);
  }

  // Parse repo URL or slug
  parseRepoUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const clean = url.trim().replace(/\/$/, '');
    
    // Check if it's already "owner/repo"
    const matchSimple = clean.match(/^([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)$/);
    if (matchSimple) {
      return { owner: matchSimple[1], repo: matchSimple[2] };
    }

    // Check full github URL
    const matchUrl = clean.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/i);
    if (matchUrl) {
      return { owner: matchUrl[1], repo: matchUrl[2].replace(/\.git$/, '') };
    }

    // Single keyword search (e.g. "react" -> "facebook/react", "express" -> "expressjs/express")
    const lower = clean.toLowerCase();
    if (lower === 'react') return { owner: 'facebook', repo: 'react' };
    if (lower === 'express') return { owner: 'expressjs', repo: 'express' };
    if (lower === 'vue') return { owner: 'vuejs', repo: 'core' };
    if (lower === 'next' || lower === 'nextjs') return { owner: 'vercel', repo: 'next.js' };

    return { owner: 'github', repo: clean.replace(/[^a-zA-Z0-9_\-]/g, '') || 'repo' };
  }

  // Make a GitHub API request
  async apiRequest(path) {
    return new Promise((resolve) => {
      const headers = {
        'User-Agent': 'OpenSource-AI-App',
        'Accept': 'application/vnd.github.v3+json'
      };

      if (this.isConfigured()) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const options = {
        hostname: 'api.github.com',
        path,
        method: 'GET',
        headers,
        timeout: 8000
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve({ ok: true, data: JSON.parse(body), status: res.statusCode });
            } catch (e) {
              resolve({ ok: false, error: 'JSON parse error', status: res.statusCode });
            }
          } else {
            resolve({ ok: false, error: `GitHub API error: ${res.statusCode}`, status: res.statusCode, body });
          }
        });
      });

      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'GitHub API timeout' }); });
      req.end();
    });
  }

  // Fetch file content from repository (README, CONTRIBUTING, etc.)
  async fetchFileContent(owner, repo, filename) {
    const res = await this.apiRequest(`/repos/${owner}/${repo}/contents/${filename}`);
    if (res.ok && res.data && res.data.content) {
      return Buffer.from(res.data.content, 'base64').toString('utf8');
    }
    return null;
  }

  // Complete repository analysis
  async analyzeRepository(urlOrSlug) {
    const parsed = this.parseRepoUrl(urlOrSlug);
    if (!parsed) {
      throw new Error('Please enter a valid GitHub repository or search keyword.');
    }

    const { owner, repo } = parsed;

    // Try fetching from real GitHub API
    const repoRes = await this.apiRequest(`/repos/${owner}/${repo}`);

    if (repoRes.ok && repoRes.data) {
      const d = repoRes.data;

      // Fetch documentation files
      const [readme, contributing, codeOfConduct, issuesRes] = await Promise.all([
        this.fetchFileContent(owner, repo, 'README.md'),
        this.fetchFileContent(owner, repo, 'CONTRIBUTING.md'),
        this.fetchFileContent(owner, repo, 'CODE_OF_CONDUCT.md'),
        this.apiRequest(`/repos/${owner}/${repo}/issues?state=open&per_page=10`)
      ]);

      const issues = (issuesRes.ok && Array.isArray(issuesRes.data))
        ? issuesRes.data
            .filter(i => !i.pull_request)
            .map(i => ({
              id: i.id,
              number: i.number,
              title: i.title,
              labels: (i.labels || []).map(l => l.name),
              author: i.user?.login || 'contributor',
              comments: i.comments || 0,
              html_url: i.html_url,
              difficulty: (i.labels || []).some(l => /good first|beginner|easy/i.test(l.name)) ? 'Beginner' : 'Intermediate',
              state: i.state
            }))
        : [];

      return {
        mode: 'Live GitHub Data',
        data: {
          name: d.name,
          owner: d.owner?.login || owner,
          fullName: d.full_name || `${owner}/${repo}`,
          description: d.description || 'Public GitHub repository.',
          stars: typeof d.stargazers_count === 'number' ? d.stargazers_count : 0,
          forks: typeof d.forks_count === 'number' ? d.forks_count : 0,
          openIssues: typeof d.open_issues_count === 'number' ? d.open_issues_count : 0,
          mainLanguage: d.language || 'Code',
          topics: d.topics || [d.name],
          activity: `Pushed ${d.pushed_at ? new Date(d.pushed_at).toLocaleDateString() : 'N/A'}, Created ${d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A'}`,
          license: d.license?.name || 'Open Source',
          html_url: d.html_url,
          readme: readme || `# ${d.name}\n\n${d.description || 'No README file found.'}`,
          contributing: contributing || `# Contributing to ${d.name}\n\nStandard GitHub pull request workflow applies.`,
          codeOfConduct: codeOfConduct || 'No CODE_OF_CONDUCT.md detected.',
          issues: issues
        }
      };
    }

    // When live GitHub fetch fails (e.g. rate limit, 404, or unconfigured token), return honest error / unavailable state
    const errMsg = repoRes.status === 404
      ? `Repository "${owner}/${repo}" was not found on GitHub (404).`
      : repoRes.status === 403
        ? 'GitHub API rate limit reached. Configure your GitHub Token in Settings to view live repository data.'
        : `Unable to retrieve live GitHub data for "${owner}/${repo}" (${repoRes.error || 'Check network connection'}).`;

    throw new Error(errMsg);
  }
}

module.exports = new GitHubService();
