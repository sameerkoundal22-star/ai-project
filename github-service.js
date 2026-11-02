// Comprehensive GitHub Repository Data & Deep Intelligence Service
const https = require('https');
const aiService = require('./ai-service');

class GitHubService {
  constructor(token = process.env.GITHUB_TOKEN || '') {
    this.token = token;
    this.cache = new Map(); // In-memory cache for fetched repos: owner/repo -> { data, timestamp }
  }

  setToken(token) {
    this.token = (token || '').trim();
  }

  isConfigured() {
    return Boolean(this.token && this.token.length > 5);
  }

  // Robust URL / Slug Parser
  // Accepts:
  // 1. "facebook/react"
  // 2. "https://github.com/facebook/react"
  // 3. "https://github.com/facebook/react/"
  // 4. "github.com/facebook/react"
  // 5. "http://github.com/facebook/react.git"
  parseRepoUrl(input) {
    if (!input || typeof input !== 'string') return null;
    let clean = input.trim();

    // Strip protocol and domain
    clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\/?/i, '');
    clean = clean.replace(/\.git$/i, '');
    clean = clean.replace(/^\/+/, '').replace(/\/+$/, '');

    // Common aliases for developer convenience
    const ALIASES = {
      'react': 'facebook/react',
      'vscode': 'microsoft/vscode',
      'tensorflow': 'tensorflow/tensorflow',
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
      // Validate characters
      if (/^[a-zA-Z0-9_\-\.]+$/.test(owner) && /^[a-zA-Z0-9_\-\.]+$/.test(repo)) {
        return { owner, repo };
      }
    }

    return null;
  }

  // Core HTTPS Request with automatic 301/302 redirect following
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
        // Handle HTTP 301 / 302 redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.apiRequest(res.headers.location, redirectCount + 1).then(resolve);
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve({ ok: true, data: JSON.parse(body), status: res.statusCode, headers: res.headers });
            } catch (e) {
              resolve({ ok: false, error: 'JSON parse error', status: res.statusCode });
            }
          } else {
            let errorMsg = `GitHub API HTTP ${res.statusCode}`;
            try {
              const errObj = JSON.parse(body);
              if (errObj && errObj.message) errorMsg = errObj.message;
            } catch (e) {}
            resolve({ ok: false, error: errorMsg, status: res.statusCode, headers: res.headers, body });
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

  // Fetch raw or base64 file content safely
  async fetchFileContent(owner, repo, filename) {
    const res = await this.apiRequest(`/repos/${owner}/${repo}/contents/${filename}`);
    if (res.ok && res.data) {
      if (res.data.content && res.data.encoding === 'base64') {
        try {
          return Buffer.from(res.data.content, 'base64').toString('utf8');
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  // Detect tech stack from file tree, language distributions, and configs
  detectTechStack(languages = {}, treeItems = [], packageJsonRaw = null, requirementsRaw = null) {
    const detected = new Set();

    // 1. Languages reported by GitHub
    Object.keys(languages).forEach(lang => detected.add(lang));

    // 2. File patterns
    const filenames = treeItems.map(i => (i.path || i.name || '').toLowerCase());

    if (filenames.some(f => f.includes('dockerfile') || f.includes('docker-compose'))) detected.add('Docker');
    if (filenames.some(f => f.endsWith('.k8s.yaml') || f.includes('kubernetes') || f.includes('helm'))) detected.add('Kubernetes');
    if (filenames.some(f => f === 'cargo.toml')) detected.add('Rust / Cargo');
    if (filenames.some(f => f === 'go.mod')) detected.add('Go Modules');
    if (filenames.some(f => f === 'pom.xml')) detected.add('Maven');
    if (filenames.some(f => f === 'build.gradle' || f === 'build.gradle.kts')) detected.add('Gradle');
    if (filenames.some(f => f === 'cmakelists.txt')) detected.add('CMake');
    if (filenames.some(f => f === 'composer.json')) detected.add('Composer / PHP');
    if (filenames.some(f => f === 'gemfile')) detected.add('Ruby Bundler');

    // 3. Node package.json inspection
    if (packageJsonRaw) {
      try {
        const pkg = JSON.parse(packageJsonRaw);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (deps.react) detected.add('React');
        if (deps.next) detected.add('Next.js');
        if (deps.vue) detected.add('Vue.js');
        if (deps['@angular/core']) detected.add('Angular');
        if (deps.svelte) detected.add('Svelte');
        if (deps.express) detected.add('Express.js');
        if (deps.fastify) detected.add('Fastify');
        if (deps.electron) detected.add('Electron');
        if (deps.typescript) detected.add('TypeScript');
        if (deps.tailwindcss) detected.add('Tailwind CSS');
        if (deps.jest || deps.vitest || deps.mocha) detected.add('Automated Testing Harness');
      } catch (e) {}
    }

    // 4. Python requirements inspection
    if (requirementsRaw) {
      const low = requirementsRaw.toLowerCase();
      if (low.includes('django')) detected.add('Django');
      if (low.includes('flask')) detected.add('Flask');
      if (low.includes('fastapi')) detected.add('FastAPI');
      if (low.includes('torch') || low.includes('pytorch')) detected.add('PyTorch');
      if (low.includes('tensorflow')) detected.add('TensorFlow');
      if (low.includes('numpy')) detected.add('NumPy');
      if (low.includes('pandas')) detected.add('Pandas');
      if (low.includes('pytest')) detected.add('PyTest');
    }

    return Array.from(detected);
  }

  // Extract instructions & commands from README
  extractDocumentationInsights(readme) {
    if (!readme) {
      return {
        summary: 'No README.md documentation provided.',
        commands: ['git clone https://github.com/owner/repository.git'],
        hasTesting: false,
        hasBuild: false
      };
    }

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
        if (!commands.includes(c) && commands.length < 6) commands.push(c);
      });
    });

    if (commands.length === 0) {
      commands.push('git clone <repository_url>', 'npm install # (or language equivalent build command)');
    }

    const low = readme.toLowerCase();
    const hasTesting = low.includes('test') || low.includes('pytest') || low.includes('jest');
    const hasBuild = low.includes('build') || low.includes('compile') || low.includes('bundle');

    return {
      commands,
      hasTesting,
      hasBuild
    };
  }

  // Generate intelligent, repository-specific AI analysis based on retrieved factual data
  async generateAIAnalysis(repoData) {
    const { name, owner, description, mainLanguage, techStack, structureTree, docAvailability, issues, pullRequests, readmeSnippet } = repoData;

    // Prompt for Gemini
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
  ],
  "recommendedIssueIds": [/* numbers of actual issues from the provided list that are good starting points */]
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
${issues.slice(0, 8).map(i => `#${i.number}: ${i.title} (Labels: ${i.labels.join(', ') || 'None'})`).join('\n')}

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
      } catch (e) {
        // Fall back to rule-based contextual synthesis
      }
    }

    // Contextual deterministic synthesis when Gemini API key is not configured
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

    // Pick issues with beginner labels
    const recommendedIssueIds = issues
      .filter(i => (i.labels || []).some(l => /good first|beginner|starter|help wanted|docs/i.test(l)))
      .slice(0, 4)
      .map(i => i.number);

    return {
      analysis: {
        projectPurpose: purpose,
        architectureOverview: arch,
        beginnerFriendlyAreas: beginnerAreas,
        intermediateAreas: intermediateAreas,
        advancedAreas: advancedAreas,
        contributorRoadmap: roadmap,
        recommendedIssueIds: recommendedIssueIds.length > 0 ? recommendedIssueIds : issues.slice(0, 3).map(i => i.number)
      },
      source: 'Repository Context Engine'
    };
  }

  // Complete, End-to-End Real Repository Analysis Pipeline
  async analyzeRepository(urlOrSlug) {
    const parsed = this.parseRepoUrl(urlOrSlug);
    if (!parsed) {
      throw new Error('Invalid repository format. Please enter "owner/repo" or a valid GitHub URL (e.g. facebook/react or https://github.com/microsoft/vscode).');
    }

    const { owner, repo } = parsed;
    const cacheKey = `${owner}/${repo}`.toLowerCase();

    // Check cache (TTL 5 minutes)
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 300000)) {
      return cached.data;
    }

    // Step 1: Fetch Repository Core Metadata
    const repoRes = await this.apiRequest(`/repos/${owner}/${repo}`);

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" was not found on GitHub (404). Please verify the owner and repository name.`);
      } else if (repoRes.status === 403) {
        throw new Error('GitHub API rate limit exceeded (403). Please add your GitHub Personal Access Token in API Settings to unlock 5,000 requests/hr.');
      } else if (repoRes.status === 401) {
        throw new Error('GitHub authentication failed (401). Please check the validity of your GitHub token in Settings.');
      } else {
        throw new Error(`Failed to fetch repository from GitHub: ${repoRes.error || 'Check network connection'}`);
      }
    }

    const d = repoRes.data;
    const defaultBranch = d.default_branch || 'main';

    // Step 2: Fetch Repository Contents / Tree, Languages, Issues, and PRs in Parallel
    const [treeRes, langRes, issuesRes, pullsRes, readmeRaw, contributingRaw, codeOfConductRaw, securityRaw, pkgJsonRaw, reqsRaw] = await Promise.all([
      this.apiRequest(`/repos/${owner}/${repo}/contents?ref=${defaultBranch}`),
      this.apiRequest(`/repos/${owner}/${repo}/languages`),
      this.apiRequest(`/repos/${owner}/${repo}/issues?state=open&per_page=15&sort=updated`),
      this.apiRequest(`/repos/${owner}/${repo}/pulls?state=open&per_page=10&sort=updated`),
      this.fetchFileContent(owner, repo, 'README.md'),
      this.fetchFileContent(owner, repo, 'CONTRIBUTING.md'),
      this.fetchFileContent(owner, repo, 'CODE_OF_CONDUCT.md'),
      this.fetchFileContent(owner, repo, 'SECURITY.md'),
      this.fetchFileContent(owner, repo, 'package.json'),
      this.fetchFileContent(owner, repo, 'requirements.txt')
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
      // Sort: directories first, then files alphabetically
      structureTree.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    // Languages
    const languages = (langRes.ok && langRes.data && typeof langRes.data === 'object') ? langRes.data : {};

    // Issues
    const rawIssues = (issuesRes.ok && Array.isArray(issuesRes.data)) ? issuesRes.data : [];
    const issues = rawIssues
      .filter(i => !i.pull_request) // filter out pull requests which GitHub API returns under /issues
      .map(i => {
        const labels = (i.labels || []).map(l => (typeof l === 'object' ? l.name : l));
        const isBeginner = labels.some(l => /good first|beginner|easy|help wanted|starter/i.test(l));
        return {
          id: i.id,
          number: i.number,
          title: i.title,
          labels,
          author: i.user?.login || 'contributor',
          authorAvatar: i.user?.avatar_url || null,
          comments: i.comments || 0,
          html_url: i.html_url,
          created_at: i.created_at,
          updated_at: i.updated_at,
          state: i.state,
          difficulty: isBeginner ? 'Beginner' : 'Intermediate'
        };
      });

    // Pull Requests
    const rawPulls = (pullsRes.ok && Array.isArray(pullsRes.data)) ? pullsRes.data : [];
    const pullRequests = rawPulls.map(p => ({
      number: p.number,
      title: p.title,
      author: p.user?.login || 'contributor',
      authorAvatar: p.user?.avatar_url || null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      html_url: p.html_url,
      draft: Boolean(p.draft),
      state: p.state
    }));

    // Detect real technologies
    const techStack = this.detectTechStack(languages, structureTree, pkgJsonRaw, reqsRaw);

    // Documentation availability
    const docAvailability = {
      readme: Boolean(readmeRaw),
      contributing: Boolean(contributingRaw),
      codeOfConduct: Boolean(codeOfConductRaw),
      security: Boolean(securityRaw)
    };

    // Documentation insights & quick start commands
    const docInsights = this.extractDocumentationInsights(readmeRaw);

    // Construct preliminary data object
    const repoData = {
      name: d.name,
      owner: d.owner?.login || owner,
      fullName: d.full_name || `${owner}/${repo}`,
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
      isArchived: Boolean(d.archived),
      isFork: Boolean(d.fork),
      structureTree: structureTree,
      techStack: techStack,
      docAvailability: docAvailability,
      quickCommands: docInsights.commands,
      readme: readmeRaw || `# ${d.name}\n\n${d.description || 'No README file available for this repository.'}`,
      readmeSnippet: readmeRaw ? readmeRaw.substring(0, 2000) : '',
      contributing: contributingRaw || 'No CONTRIBUTING.md file detected.',
      codeOfConduct: codeOfConductRaw || 'No CODE_OF_CONDUCT.md file detected.',
      security: securityRaw || 'No SECURITY.md file detected.',
      issues: issues,
      pullRequests: pullRequests
    };

    // Step 3: Run AI Architecture & Contributor Analysis based on retrieved facts
    const aiAnalysisResult = await this.generateAIAnalysis(repoData);
    repoData.aiAnalysis = aiAnalysisResult.analysis;
    repoData.aiSource = aiAnalysisResult.source;

    // Cache the result
    const resultObj = {
      mode: 'Live GitHub Data',
      data: repoData
    };
    this.cache.set(cacheKey, { data: resultObj, timestamp: Date.now() });

    return resultObj;
  }
}

module.exports = new GitHubService();
