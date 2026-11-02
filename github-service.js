// Comprehensive GitHub Repository Data, Request Budgeting & Rate Limit Manager
const https = require('https');
const aiService = require('./ai-service');

class GitHubService {
  constructor(token = process.env.GITHUB_TOKEN || '') {
    this.token = token;
    // Multi-tier in-memory cache:
    // github:repo:{owner}:{repo} -> { data, timestamp }
    this.cache = new Map();
    // Cache for rate limit checks to prevent spamming /rate_limit
    this.rateLimitCache = null;
    this.rateLimitCacheTime = 0;
    // Request de-duplication: active promises map to prevent concurrent duplicate queries
    this.pendingRequests = new Map();
  }

  setToken(token) {
    this.token = (token || '').trim();
    // Clear rate limit cache on token change
    this.rateLimitCache = null;
    this.rateLimitCacheTime = 0;
  }

  isConfigured() {
    return Boolean(this.token && this.token.length > 5);
  }

  // Parse repo URL or slug safely
  parseRepoUrl(input) {
    if (!input || typeof input !== 'string') return null;
    let clean = input.trim();

    clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\/?/i, '');
    clean = clean.replace(/\.git$/i, '');
    clean = clean.replace(/^\/+/, '').replace(/\/+$/, '');

    const ALIASES = {
      'react': 'facebook/react',
      'vscode': 'microsoft/vscode',
      'tensorflow': 'tensorflow/tensorflow',
      'fastapi': 'fastapi/fastapi',
      'vue': 'vuejs/core',
      'nextjs': 'vercel/next.js',
      'next.js': 'vercel/next.js',
      'express': 'expressjs/express',
      'kubernetes': 'kubernetes/kubernetes',
      'linux': 'torvalds/linux'
    };

    if (ALIASES[clean.toLowerCase()]) {
      clean = ALIASES[clean.toLowerCase()];
    }

    const parts = clean.split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1];
      if (/^[a-zA-Z0-9_\-\.]+$/.test(owner) && /^[a-zA-Z0-9_\-\.]+$/.test(repo)) {
        return { owner, repo, slug: `${owner}/${repo}` };
      }
    }

    return null;
  }

  // Core HTTPS Request with automatic 301/302 redirect following & rate-limit diagnostics
  async apiRequest(pathOrUrl, redirectCount = 0) {
    if (redirectCount > 4) {
      return { ok: false, error: 'Too many redirects from GitHub API', status: 310 };
    }

    return new Promise((resolve) => {
      let targetUrl;
      if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        targetUrl = new URL(pathOrUrl);
      } else {
        targetUrl = new URL('https://api.github.com' + pathOrUrl);
      }

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) OpenSourceAI/2.0',
        'Accept': 'application/vnd.github.v3+json'
      };

      if (this.isConfigured()) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || 443,
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        headers,
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        // Track rate limit headers
        const rateLimitRemaining = res.headers['x-ratelimit-remaining'] !== undefined ? parseInt(res.headers['x-ratelimit-remaining'], 10) : null;
        const rateLimitLimit = res.headers['x-ratelimit-limit'] !== undefined ? parseInt(res.headers['x-ratelimit-limit'], 10) : null;
        const rateLimitReset = res.headers['x-ratelimit-reset'] !== undefined ? parseInt(res.headers['x-ratelimit-reset'], 10) : null;

        // Handle HTTP 301 / 302 redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.apiRequest(res.headers.location, redirectCount + 1).then(resolve);
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const rateInfo = {
            limit: rateLimitLimit,
            remaining: rateLimitRemaining,
            reset: rateLimitReset
          };

          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve({ ok: true, data: JSON.parse(body), status: res.statusCode, headers: res.headers, rateInfo });
            } catch (e) {
              resolve({ ok: false, error: 'JSON parse error', status: res.statusCode, rateInfo });
            }
          } else {
            let errorMsg = `GitHub API HTTP ${res.statusCode}`;
            try {
              const errObj = JSON.parse(body);
              if (errObj && errObj.message) errorMsg = errObj.message;
            } catch (e) {}
            resolve({ ok: false, error: errorMsg, status: res.statusCode, headers: res.headers, rateInfo, body });
          }
        });
      });

      req.on('error', (err) => resolve({ ok: false, error: err.message, status: 0 }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'GitHub API connection timed out', status: 408 });
      });
      req.end();
    });
  }

  // Rate Limit Inspector with 30s cache to prevent quota consumption
  async getRateLimit() {
    if (this.rateLimitCache && (Date.now() - this.rateLimitCacheTime < 30000)) {
      return this.rateLimitCache;
    }

    const res = await this.apiRequest('/rate_limit');
    if (res.ok && res.data && res.data.resources && res.data.resources.core) {
      const core = res.data.resources.core;
      this.rateLimitCache = {
        limit: core.limit,
        remaining: core.remaining,
        reset: core.reset,
        used: core.used,
        isConfigured: this.isConfigured()
      };
      this.rateLimitCacheTime = Date.now();
      return this.rateLimitCache;
    }

    return {
      limit: this.isConfigured() ? 5000 : 60,
      remaining: null,
      reset: null,
      isConfigured: this.isConfigured()
    };
  }

  // Detect tech stack from tree, language distributions, and configs
  detectTechStack(languages = {}, treeItems = []) {
    const detected = new Set();
    Object.keys(languages).forEach(lang => detected.add(lang));

    const filenames = treeItems.map(i => (i.path || i.name || '').toLowerCase());
    if (filenames.some(f => f.includes('dockerfile') || f.includes('docker-compose'))) detected.add('Docker');
    if (filenames.some(f => f.endsWith('.k8s.yaml') || f.includes('kubernetes') || f.includes('helm'))) detected.add('Kubernetes');
    if (filenames.some(f => f === 'cargo.toml')) detected.add('Rust / Cargo');
    if (filenames.some(f => f === 'go.mod')) detected.add('Go Modules');
    if (filenames.some(f => f === 'pom.xml')) detected.add('Maven');
    if (filenames.some(f => f === 'build.gradle' || f === 'build.gradle.kts')) detected.add('Gradle');
    if (filenames.some(f => f === 'cmakelists.txt')) detected.add('CMake');
    if (filenames.some(f => f === 'composer.json')) detected.add('Composer / PHP');
    if (filenames.some(f => f === 'package.json')) detected.add('Node.js / npm');
    if (filenames.some(f => f === 'requirements.txt' || f === 'pyproject.toml')) detected.add('Python');

    return Array.from(detected);
  }

  // Extract quick start instructions from README without extra API requests
  extractQuickCommands(readme) {
    if (!readme) return ['git clone <repository_url>'];
    const commands = [];
    const codeBlocks = readme.match(/```(?:bash|sh|shell|cmd|powershell)?\s*\n([\s\S]*?)```/gi) || [];

    codeBlocks.forEach(b => {
      const clean = b.replace(/```[a-z]*\s*\n/i, '').replace(/```$/, '').trim();
      const lines = clean.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && (
        l.startsWith('npm ') || l.startsWith('yarn ') || l.startsWith('pnpm ') ||
        l.startsWith('pip ') || l.startsWith('cargo ') || l.startsWith('go ') ||
        l.startsWith('make') || l.startsWith('git ') || l.startsWith('mvn ') ||
        l.startsWith('gradle') || l.startsWith('docker') || l.startsWith('./')
      ));
      lines.slice(0, 3).forEach(c => {
        if (!commands.includes(c) && commands.length < 5) commands.push(c);
      });
    });

    if (commands.length === 0) {
      commands.push('git clone <repository_url>', 'npm install # (or language equivalent build command)');
    }
    return commands;
  }

  // AI Analysis using strictly factual context
  async generateAIAnalysis(repoData) {
    const { name, owner, description, mainLanguage, techStack, structureTree, docAvailability, issues, readmeSnippet } = repoData;

    const systemPrompt = `You are a Principal Open-Source Software Architect.
Analyze the provided REAL GitHub repository data and generate a structured, comprehensive, and repository-specific analysis.
CRITICAL RULES:
1. NEVER invent files, stats, or features. Everything must be derived from the factual context provided.
2. Provide answers tailored specifically to "${owner}/${name}".
3. Output MUST be valid JSON with this exact schema:
{
  "projectPurpose": "Concise, accurate description of what this project does and the problem it solves",
  "architectureOverview": "Technical breakdown of the architecture, key directories, and design patterns used",
  "beginnerFriendlyAreas": ["Area 1 with file/directory reference", "Area 2", "Area 3"],
  "intermediateAreas": ["Area 1", "Area 2"],
  "advancedAreas": ["Area 1 (e.g. core reconciler, compiler internals, distributed sync)", "Area 2"],
  "contributorRoadmap": [
    "Step 1: Specific first action (what to read first)",
    "Step 2: How to setup and run tests",
    "Step 3: How to find beginner issues",
    "Step 4: PR submission guideline"
  ]
}`;

    const userPrompt = `Repository: ${owner}/${name}
Description: ${description}
Primary Language: ${mainLanguage}
Detected Tech Stack: ${techStack.join(', ')}

Top-Level Structure:
${structureTree.slice(0, 20).map(s => `${s.type === 'dir' ? '📁' : '📄'} ${s.name}`).join('\n')}

Documentation Available:
- README: ${docAvailability.readme ? 'Yes' : 'No'}
- CONTRIBUTING: ${docAvailability.contributing ? 'Yes' : 'No'}
- CODE_OF_CONDUCT: ${docAvailability.codeOfConduct ? 'Yes' : 'No'}
- SECURITY: ${docAvailability.security ? 'Yes' : 'No'}

Real Open Issues Sample:
${issues.slice(0, 6).map(i => `#${i.number}: ${i.title}`).join('\n')}

README Overview Excerpt:
${(readmeSnippet || '').substring(0, 1500)}`;

    if (aiService && aiService.isConfigured()) {
      try {
        const aiRes = await aiService.generateText(userPrompt, systemPrompt);
        if (aiRes) {
          const clean = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(clean);
          if (parsed && parsed.projectPurpose) {
            return {
              analysis: parsed,
              source: 'Live AI Analysis (Gemini)'
            };
          }
        }
      } catch (e) {}
    }

    // Contextual deterministic synthesis
    const purpose = description || `${name} is an open-source software project maintained by ${owner}.`;
    const dirs = structureTree.filter(s => s.type === 'dir').map(d => d.name);
    
    let arch = `The repository is organized around ${mainLanguage}`;
    if (dirs.length > 0) {
      arch += ` with major directories including ${dirs.slice(0, 6).map(d => '`' + d + '`').join(', ')}.`;
    }
    if (techStack.length > 0) {
      arch += ` It integrates ${techStack.slice(0, 5).join(', ')}.`;
    }

    const beginnerAreas = [];
    if (dirs.includes('docs') || dirs.includes('documentation')) beginnerAreas.push('Documentation & Guides (`docs/` directory)');
    if (dirs.includes('tests') || dirs.includes('test') || dirs.includes('spec')) beginnerAreas.push('Unit Test Coverage & Assertions (`tests/`)');
    beginnerAreas.push('Typo fixes, error messaging, and good-first-issue labeled tickets');

    const intermediateAreas = [];
    if (dirs.includes('examples') || dirs.includes('samples')) intermediateAreas.push('Sample Applications & Integrations (`examples/`)');
    if (dirs.includes('packages') || dirs.includes('src')) intermediateAreas.push('Component & Feature Modules (`src/` or `packages/`)');
    intermediateAreas.push('API route handlers and validation logic');

    const advancedAreas = [];
    if (dirs.includes('compiler') || dirs.includes('core') || dirs.includes('kernel') || dirs.includes('engine')) {
      advancedAreas.push('Core Engine / Compiler Internal Logic');
    }
    advancedAreas.push('Concurrency, memory management, and security boundary primitives');

    const roadmap = [
      `1. Read the ${docAvailability.readme ? 'README.md' : 'project summary'} and ${docAvailability.contributing ? 'CONTRIBUTING.md' : 'contribution guidelines'}.`,
      `2. Clone locally and verify the test harness passes cleanly on the default branch.`,
      `3. Inspect the issues tagged "good first issue" or "help wanted" to find isolated tasks.`,
      `4. Create a descriptive feature branch and submit a structured PR linking the relevant issue.`
    ];

    return {
      analysis: {
        projectPurpose: purpose,
        architectureOverview: arch,
        beginnerFriendlyAreas: beginnerAreas,
        intermediateAreas: intermediateAreas,
        advancedAreas: advancedAreas,
        contributorRoadmap: roadmap
      },
      source: 'Repository Context Engine'
    };
  }

  // Low-Budget, Optimized Repository Analysis
  // Strict request budget: Only 5 essential API calls maximum per repository
  // 1. /repos/{owner}/{repo}
  // 2. /repos/{owner}/{repo}/contents?ref={branch}
  // 3. /repos/{owner}/{repo}/languages
  // 4. /repos/{owner}/{repo}/issues?state=open&per_page=10
  // 5. /repos/{owner}/{repo}/readme
  async analyzeRepository(urlOrSlug) {
    const parsed = this.parseRepoUrl(urlOrSlug);
    if (!parsed) {
      const err = new Error('Invalid repository format. Please enter "owner/repo" or a valid GitHub URL (e.g. facebook/react or https://github.com/microsoft/vscode).');
      err.type = 'INVALID_FORMAT';
      throw err;
    }

    const { owner, repo, slug } = parsed;
    const cacheKey = `github:repo:${owner}:${repo}`.toLowerCase();

    // 1. Check in-memory cache (TTL: 10 minutes)
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 600000)) {
      return {
        ...cached.data,
        fromCache: true
      };
    }

    // 2. Request de-duplication: if another request for the same repo is currently in flight, await it
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const fetchPromise = this._executeAnalyzePipeline(owner, repo, slug, cacheKey);
    this.pendingRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async _executeAnalyzePipeline(owner, repo, slug, cacheKey) {
    // Step 1: Fetch Repository Core Metadata
    const repoRes = await this.apiRequest(`/repos/${owner}/${repo}`);

    if (!repoRes.ok) {
      const isRateLimit = repoRes.status === 403 && (
        (repoRes.rateInfo && repoRes.rateInfo.remaining === 0) ||
        (repoRes.error && repoRes.error.toLowerCase().includes('rate limit'))
      );

      const err = new Error(
        isRateLimit
          ? 'GitHub API rate limit reached.'
          : repoRes.status === 404
            ? `Repository "${owner}/${repo}" was not found on GitHub (404). Please verify the owner and repository name.`
            : repoRes.status === 401
              ? 'GitHub authentication failed (401). Please check your token in Settings.'
              : `Failed to fetch repository from GitHub: ${repoRes.error || 'Check network connection'}`
      );

      err.status = repoRes.status;
      err.isRateLimit = isRateLimit;
      err.rateInfo = repoRes.rateInfo || null;
      throw err;
    }

    const d = repoRes.data;
    const defaultBranch = d.default_branch || 'main';

    // Step 2: Fetch only 4 secondary endpoints in parallel (Budget-friendly: Total 5 calls)
    const [treeRes, langRes, issuesRes, readmeRes] = await Promise.all([
      this.apiRequest(`/repos/${owner}/${repo}/contents?ref=${defaultBranch}`),
      this.apiRequest(`/repos/${owner}/${repo}/languages`),
      this.apiRequest(`/repos/${owner}/${repo}/issues?state=open&per_page=10&sort=updated`),
      this.apiRequest(`/repos/${owner}/${repo}/readme`)
    ]);

    // Parse structure tree
    const structureTree = [];
    if (treeRes.ok && Array.isArray(treeRes.data)) {
      treeRes.data.forEach(item => {
        structureTree.push({
          name: item.name,
          path: item.path,
          type: item.type === 'dir' ? 'dir' : 'file',
          size: item.size || 0,
          html_url: item.html_url
        });
      });
      structureTree.sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)));
    }

    // Parse languages
    const languages = (langRes.ok && langRes.data && typeof langRes.data === 'object') ? langRes.data : {};

    // Parse issues (separate real pull requests from issues without extra PR call)
    const rawIssues = (issuesRes.ok && Array.isArray(issuesRes.data)) ? issuesRes.data : [];
    const issues = [];
    const pullRequests = [];

    rawIssues.forEach(i => {
      const labels = (i.labels || []).map(l => (typeof l === 'object' ? l.name : l));
      const isBeginner = labels.some(l => /good first|beginner|easy|help wanted|starter/i.test(l));

      if (i.pull_request) {
        pullRequests.push({
          number: i.number,
          title: i.title,
          author: i.user?.login || 'contributor',
          created_at: i.created_at,
          updated_at: i.updated_at,
          html_url: i.html_url,
          state: i.state
        });
      } else {
        issues.push({
          id: i.id,
          number: i.number,
          title: i.title,
          labels,
          author: i.user?.login || 'contributor',
          comments: i.comments || 0,
          html_url: i.html_url,
          created_at: i.created_at,
          updated_at: i.updated_at,
          state: i.state,
          difficulty: isBeginner ? 'Beginner' : 'Intermediate'
        });
      }
    });

    // Parse README
    let readmeText = '';
    if (readmeRes.ok && readmeRes.data && readmeRes.data.content) {
      try {
        readmeText = Buffer.from(readmeRes.data.content, 'base64').toString('utf8');
      } catch (e) {
        readmeText = '';
      }
    }

    // Technology stack
    const techStack = this.detectTechStack(languages, structureTree);

    // Documentation availability checks from tree items (ZERO extra API calls)
    const docAvailability = {
      readme: Boolean(readmeText),
      contributing: structureTree.some(s => /contributing/i.test(s.name)),
      codeOfConduct: structureTree.some(s => /code_of_conduct/i.test(s.name)),
      security: structureTree.some(s => /security/i.test(s.name))
    };

    const quickCommands = this.extractQuickCommands(readmeText);

    const repoData = {
      name: d.name,
      owner: d.owner?.login || owner,
      fullName: d.full_name || slug,
      description: d.description || 'No description provided.',
      homepage: d.homepage || null,
      html_url: d.html_url,
      visibility: d.visibility || (d.private ? 'private' : 'public'),
      defaultBranch: defaultBranch,
      created_at: d.created_at,
      updated_at: d.updated_at,
      pushed_at: d.pushed_at,
      stars: typeof d.stargazers_count === 'number' ? d.stargazers_count : 0,
      forks: typeof d.forks_count === 'number' ? d.forks_count : 0,
      watchers: typeof d.subscribers_count === 'number' ? d.subscribers_count : (d.watchers_count || 0),
      openIssues: typeof d.open_issues_count === 'number' ? d.open_issues_count : 0,
      mainLanguage: d.language || Object.keys(languages)[0] || 'Code',
      languages: languages,
      license: d.license?.name || (d.license?.spdx_id ? d.license.spdx_id : 'Not specified'),
      topics: Array.isArray(d.topics) ? d.topics : [],
      size: d.size || 0,
      structureTree: structureTree,
      techStack: techStack,
      docAvailability: docAvailability,
      quickCommands: quickCommands,
      readme: readmeText || `# ${d.name}\n\n${d.description || 'No README file available.'}`,
      readmeSnippet: readmeText ? readmeText.substring(0, 2000) : '',
      issues: issues,
      pullRequests: pullRequests,
      rateInfo: repoRes.rateInfo || null
    };

    // Step 3: Run AI Architecture & Contributor Analysis
    const aiAnalysisResult = await this.generateAIAnalysis(repoData);
    repoData.aiAnalysis = aiAnalysisResult.analysis;
    repoData.aiSource = aiAnalysisResult.source;

    const resultObj = {
      mode: 'Live GitHub Data',
      data: repoData,
      fromCache: false
    };

    // Store in cache
    this.cache.set(cacheKey, { data: resultObj, timestamp: Date.now() });

    return resultObj;
  }
}

module.exports = new GitHubService();
