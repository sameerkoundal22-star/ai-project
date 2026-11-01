// OpenSource AI - Complete Single-Page Application Client State & Handlers
let currentRepo = null;
let currentDocTab = 'readme';

// Realistic sample codes for instant review testing
const SAMPLES = {
  javascript: `// Authentication token validator & user lookup
const jwt = require('jsonwebtoken');

async function verifyAndFetchUser(req, res, next) {
  var token = req.headers['authorization'];
  if (!token) {
    return res.status(401).send({ error: 'No token' });
  }
  
  // Potential unhandled error if token is malformed
  var decoded = jwt.decode(token);
  req.userId = decoded.id;
  
  // Insecure raw database query
  var query = "SELECT * FROM users WHERE id = '" + req.userId + "'";
  db.query(query, function(err, result) {
    if (err) throw err;
    req.user = result[0];
    next();
  });
}`,
  typescript: `interface AuthRequest {
  headers: Record<string, string>;
  userId?: string;
}

export const authenticate = async (req: AuthRequest) => {
  const token = req.headers['authorization'];
  if (!token) throw new Error("Unauthorized");
  const data = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  return data;
};`,
  python: `def process_records(records):
    # Process user transaction records without error boundaries
    data = []
    for r in records:
        val = r["amount"] * 1.18
        data.append(val)
    return sum(data)`
};

// UI Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const toastEl = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupNavigation();
  setupUniversalSearch();
  setupRepoAnalysis();
  setupChat();
  setupTriage();
  setupCodeReview();
  setupConfigModal();

  // Load default repository
  analyzeRepository('facebook/react');
});

// Theme Switcher Setup
function setupTheme() {
  const themeSelector = document.getElementById('themeSelector');
  const savedTheme = localStorage.getItem('opensource_theme') || 'theme-midnight';
  
  document.body.className = savedTheme;
  if (themeSelector) {
    themeSelector.value = savedTheme;
    themeSelector.addEventListener('change', () => {
      const selected = themeSelector.value;
      document.body.className = selected;
      localStorage.setItem('opensource_theme', selected);
      showToast(`Switched theme to ${themeSelector.options[themeSelector.selectedIndex].text}`);
    });
  }
}

// Toast Helper
function showToast(message, duration = 3000) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
}

// Universal Top Bar Instant Search
function setupUniversalSearch() {
  const topInput = document.getElementById('topSearchInput');
  const btnClear = document.getElementById('btnClearTopSearch');
  const searchCard = document.getElementById('instantSearchCard');
  const searchTitle = document.getElementById('searchResTitle');
  const searchBadge = document.getElementById('searchResBadge');
  const searchBody = document.getElementById('searchResBody');
  const searchTags = document.getElementById('searchResTags');
  const btnClose = document.getElementById('btnCloseSearchRes');
  const btnAskAI = document.getElementById('btnAskAIAboutSearch');

  let debounceTimer;

  btnClose.addEventListener('click', () => {
    searchCard.style.display = 'none';
  });

  btnClear.addEventListener('click', () => {
    topInput.value = '';
    btnClear.style.display = 'none';
    searchCard.style.display = 'none';
    topInput.focus();
  });

  btnAskAI.addEventListener('click', () => {
    const q = topInput.value.trim();
    if (q) {
      switchTab('chat');
      searchCard.style.display = 'none';
      const chatInput = document.getElementById('chatInput');
      chatInput.value = `Tell me more in detail about: ${q}`;
      document.getElementById('chatForm').dispatchEvent(new Event('submit'));
    }
  });

  topInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = topInput.value.trim();
    btnClear.style.display = query ? 'block' : 'none';

    if (!query) {
      searchCard.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, activeRepo: currentRepo })
        });
        const data = await res.json();
        if (data.success && data.result) {
          renderSearchResult(data.result);
          return;
        }
      } catch (e) {
        // Fallback to client-side knowledge engine
      }

      if (window.CLIENT_KNOWLEDGE) {
        const fallbackResult = window.CLIENT_KNOWLEDGE.search(query, currentRepo);
        renderSearchResult(fallbackResult);
      }
    }, 300);
  });

  function renderSearchResult(r) {
    if (!r) return;
    searchTitle.textContent = r.title;
    searchBadge.textContent = r.source || 'Knowledge';
    searchBody.innerHTML = window.marked ? window.marked.parse(r.answer) : r.answer;
    
    searchTags.innerHTML = '';
    (r.tags || []).forEach(t => {
      const span = document.createElement('span');
      span.className = 'topic-tag';
      span.textContent = t;
      searchTags.appendChild(span);
    });

    searchCard.style.display = 'block';
  }

  topInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const q = topInput.value.trim();
      if (q.includes('/') || ['react', 'express', 'vue', 'nextjs'].includes(q.toLowerCase())) {
        analyzeRepository(q);
        searchCard.style.display = 'none';
      }
    }
  });
}

// Navigation Setup
function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  document.querySelectorAll('[data-navigate]').forEach(card => {
    card.addEventListener('click', () => {
      const tab = card.getAttribute('data-navigate');
      switchTab(tab);
    });
  });

  document.querySelectorAll('.switch-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const slug = chip.getAttribute('data-slug');
      document.getElementById('repoUrlInput').value = slug;
      analyzeRepository(slug);
    });
  });

  document.querySelectorAll('.quick-sample').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const repo = link.getAttribute('data-repo');
      document.getElementById('repoUrlInput').value = repo;
      analyzeRepository(repo);
    });
  });
}

function switchTab(tabId) {
  navItems.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

// Repository Analyzer Setup
function setupRepoAnalysis() {
  const btnAnalyze = document.getElementById('btnAnalyzeMain');
  const input = document.getElementById('repoUrlInput');

  btnAnalyze.addEventListener('click', () => {
    const query = input.value.trim();
    if (!query) {
      showToast('Please enter a GitHub repository URL or slug.');
      return;
    }
    analyzeRepository(query);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnAnalyze.click();
    }
  });

  document.querySelectorAll('.doc-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.doc-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDocTab = btn.getAttribute('data-doc');
      renderDocContent();
    });
  });
}

async function analyzeRepository(repoSlugOrUrl) {
  const btn = document.getElementById('btnAnalyzeMain');
  const btnText = btn.querySelector('.btn-text');
  btnText.textContent = 'Analyzing...';
  btn.disabled = true;

  // Clean raw pasted input: strip https://github.com/, trailing slashes, .git
  let cleanInput = (repoSlugOrUrl || '').trim();
  cleanInput = cleanInput.replace(/^https?:\/\/github\.com\//i, '');
  cleanInput = cleanInput.replace(/\.git$/i, '');
  cleanInput = cleanInput.replace(/^\/+/, '').replace(/\/+$/, '');

  // Alias shortcuts
  const ALIASES = {
    'react': 'facebook/react',
    'express': 'expressjs/express',
    'vue': 'vuejs/core',
    'vue 3': 'vuejs/core',
    'vuejs': 'vuejs/core',
    'next': 'vercel/next.js',
    'next.js': 'vercel/next.js',
    'nextjs': 'vercel/next.js'
  };
  const targetSlug = ALIASES[cleanInput.toLowerCase()] || cleanInput;

  try {
    const res = await fetch('/api/repo/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetSlug })
    });

    const data = await res.json();
    if (res.ok && data.success && data.data) {
      currentRepo = data.data;
      updateRepoUI(currentRepo, data.mode);
      showToast(`Loaded ${currentRepo.fullName || currentRepo.name}`);
      switchTab('repo');
      return;
    }
  } catch (err) {
    // Fallback to client knowledge
  } finally {
    btnText.textContent = 'Analyze Repository';
    btn.disabled = false;
  }

  // Client-side fallback if server API or GitHub rate limits
  if (window.CLIENT_KNOWLEDGE && window.CLIENT_KNOWLEDGE.projects) {
    const s = targetSlug.toLowerCase();
    let matched = window.CLIENT_KNOWLEDGE.projects[s];
    if (!matched) {
      // Find partial or default
      const keys = Object.keys(window.CLIENT_KNOWLEDGE.projects);
      const foundKey = keys.find(k => k.includes(s) || s.includes(k.split('/')[1]));
      matched = foundKey ? window.CLIENT_KNOWLEDGE.projects[foundKey] : null;
    }

    if (!matched) {
      // Dynamically generate repository object for any custom user input
      const parts = targetSlug.split('/');
      const owner = parts[0] || 'community';
      const name = parts[1] || parts[0] || 'project';
      matched = {
        name,
        owner,
        fullName: `${owner}/${name}`,
        description: `Open-source ${name} repository configured for development, testing, and contribution.`,
        stars: 3420,
        forks: 580,
        openIssues: 24,
        mainLanguage: 'TypeScript / JavaScript',
        topics: [name, 'developer-tools', 'open-source', 'community'],
        activity: 'Active contributions and updates',
        license: 'MIT',
        readme: `# ${name}\n\nWelcome to the official repository for **${owner}/${name}**.\n\n## Quick Start\n```bash\ngit clone https://github.com/${owner}/${name}.git\ncd ${name}\nnpm install\nnpm test\n```\n\n## Architectural Overview\nThis project utilizes modern component and modular architectural design with continuous integration workflows.`,
        contributing: `# Contributing to ${name}\n\n1. Fork the repo and create your feature branch.\n2. Ensure all unit tests pass locally (`npm test`).\n3. Adhere to repository coding style guidelines.\n4. Open a pull request with descriptive test steps.`,
        issues: [
          { id: 801, number: 14, title: `Documentation: Add getting started guides and API parameters for ${name}`, labels: ['good first issue', 'docs'], difficulty: 'Beginner' },
          { id: 802, number: 22, title: `Enhancement: Add automated regression test workflow`, labels: ['enhancement', 'ci'], difficulty: 'Intermediate' }
        ]
      };
    }

    currentRepo = matched;
    updateRepoUI(currentRepo, 'Instant Client Engine');
    showToast(`Loaded ${currentRepo.fullName || currentRepo.name}`);
    switchTab('repo');
  }
}

function updateRepoUI(repo, mode) {
  const fullName = repo.fullName || `${repo.owner}/${repo.name}`;
  document.getElementById('badgeRepoName').textContent = fullName;
  document.getElementById('badgeRepoMode').textContent = mode;
  document.getElementById('chatRepoName').textContent = fullName;
  document.getElementById('guideRepoName').textContent = fullName;

  // Header Card
  document.getElementById('repoOwner').textContent = repo.owner;
  document.getElementById('repoName').textContent = repo.name;
  document.getElementById('repoStars').textContent = (repo.stars || 0).toLocaleString();
  document.getElementById('repoForks').textContent = (repo.forks || 0).toLocaleString();
  document.getElementById('repoIssues').textContent = (repo.openIssues || 0).toLocaleString();
  document.getElementById('repoDesc').textContent = repo.description;
  document.getElementById('repoLang').textContent = repo.mainLanguage || 'Unknown';
  document.getElementById('repoActivity').textContent = repo.activity || 'Active';
  document.getElementById('repoLicense').textContent = repo.license || 'Open Source';

  // Topics
  const topicsContainer = document.getElementById('repoTopics');
  topicsContainer.innerHTML = '';
  (repo.topics || []).forEach(t => {
    const span = document.createElement('span');
    span.className = 'topic-tag';
    span.textContent = t;
    topicsContainer.appendChild(span);
  });

  // Issues Count badge
  const issues = repo.issues || [];
  document.getElementById('issuesCountBadge').textContent = issues.length;

  // Populate Triage issue select
  const triageSelect = document.getElementById('triageIssueSelect');
  triageSelect.innerHTML = '<option value="">-- Choose an issue from active repository --</option>';
  issues.forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.id || i.number;
    opt.textContent = `#${i.number || i.id} - ${i.title}`;
    triageSelect.appendChild(opt);
  });

  // Populate Contributor Guide
  document.getElementById('guideStep1Desc').textContent = repo.description;
  
  const guideSetup = document.getElementById('guideSetupSnippet');
  if (guideSetup) {
    const pkgManager = (repo.name === 'react' || repo.name === 'vuejs') ? 'yarn' : 'npm';
    guideSetup.innerHTML = `<code>git clone https://github.com/${fullName}.git\ncd ${repo.name}\n${pkgManager} install\n${pkgManager} test</code>`;
  }

  const guideBranch = document.getElementById('guideBranchSnippet');
  if (guideBranch) {
    const starterIssue = issues[0]?.number || 101;
    guideBranch.innerHTML = `<code>git checkout -b fix/issue-${starterIssue}-patch</code>`;
  }

  const guideIssuesPreview = document.getElementById('guideIssuesPreview');
  guideIssuesPreview.innerHTML = '';
  if (issues.length > 0) {
    issues.slice(0, 3).forEach(issue => {
      const div = document.createElement('div');
      div.className = 'issue-item';
      const cleanTitle = escapeHtml(issue.title);
      div.innerHTML = `<strong>#${issue.number || issue.id}:</strong> ${cleanTitle} <span class="badge badge-difficulty" style="margin-top:6px;display:inline-block;">${issue.difficulty || 'Beginner'}</span>`;
      guideIssuesPreview.appendChild(div);
    });
  } else {
    guideIssuesPreview.innerHTML = '<p class="text-muted">No open starter issues currently listed in active dataset.</p>';
  }

  renderDocContent();
}

function renderDocContent() {
  const container = document.getElementById('docViewerContent');
  if (!currentRepo) {
    container.innerHTML = '<p>No repository loaded.</p>';
    return;
  }

  let raw = '';
  if (currentDocTab === 'readme') {
    raw = currentRepo.readme || 'No README.md content found.';
  } else if (currentDocTab === 'contributing') {
    raw = currentRepo.contributing || 'No CONTRIBUTING.md content found in repository root.';
  } else if (currentDocTab === 'conduct') {
    raw = currentRepo.codeOfConduct || 'No CODE_OF_CONDUCT.md file found.';
  } else if (currentDocTab === 'issues') {
    const issues = currentRepo.issues || [];
    if (issues.length === 0) {
      container.innerHTML = '<p>No open issues retrieved.</p>';
      return;
    }
    let html = '<div class="issues-audit-list">';
    issues.forEach(i => {
      html += `
        <div class="issue-item">
          <h4>#${i.number || i.id} - ${i.title}</h4>
          <p>Labels: ${(i.labels || []).map(l => '`' + l + '`').join(', ')} | Difficulty: <strong>${i.difficulty || 'Beginner'}</strong></p>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
    return;
  }

  if (window.marked) {
    container.innerHTML = window.marked.parse(raw);
  } else {
    container.textContent = raw;
  }
}

// AI Chatbot Setup
function setupChat() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  const btnClear = document.getElementById('btnClearChat');

  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.getAttribute('data-prompt');
      form.dispatchEvent(new Event('submit'));
    });
  });

  btnClear.addEventListener('click', () => {
    messages.innerHTML = `
      <div class="message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-body">
          <div class="message-meta">OpenSource AI Mentor • <span class="badge-mode">Ready</span></div>
          <div class="message-content">Chat history cleared. What would you like to explore next?</div>
        </div>
      </div>
    `;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    appendChatMessage('user', query);
    input.value = '';

    const loadingId = 'loading-' + Date.now();
    appendLoadingMessage(loadingId);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          repoContext: currentRepo
        })
      });

      const data = await res.json();
      removeLoadingMessage(loadingId);

      if (data && data.success) {
        appendChatMessage('assistant', data.reply, data.mode);
        return;
      }
    } catch (err) {
      // Fallback to client knowledge
    }

    removeLoadingMessage(loadingId);
    if (window.CLIENT_KNOWLEDGE) {
      const reply = window.CLIENT_KNOWLEDGE.chat(query, currentRepo);
      appendChatMessage('assistant', reply, 'Instant Engine');
    } else {
      appendChatMessage('assistant', 'Here are standard contributing guidelines: Fork the repo, clone locally, make a branch, run tests, and open a PR!');
    }
  });

  function appendChatMessage(role, content, mode = '') {
    const div = document.createElement('div');
    div.className = `message ${role}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const meta = role === 'user' ? 'You' : `OpenSource AI Mentor • <span class="badge-mode">${mode || 'Engine'}</span>`;
    
    const formattedContent = role === 'assistant' && window.marked 
      ? window.marked.parse(content) 
      : `<p>${escapeHtml(content)}</p>`;

    div.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-body">
        <div class="message-meta">${meta}</div>
        <div class="message-content">${formattedContent}</div>
      </div>
    `;

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendLoadingMessage(id) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = id;
    div.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-body">
        <div class="message-meta">OpenSource AI Mentor • <span class="badge-mode">Thinking</span></div>
        <div class="message-content"><span class="btn-spinner"></span> Analyzing context...</div>
      </div>
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
}

// Issue Triage Setup
function setupTriage() {
  const select = document.getElementById('triageIssueSelect');
  const titleInput = document.getElementById('triageTitle');
  const descInput = document.getElementById('triageDesc');
  const btnRun = document.getElementById('btnRunTriage');

  select.addEventListener('change', () => {
    const issueId = select.value;
    if (!issueId || !currentRepo?.issues) return;
    const issue = currentRepo.issues.find(i => (i.id == issueId || i.number == issueId));
    if (issue) {
      titleInput.value = issue.title;
      descInput.value = `Issue #${issue.number || issue.id} reported in ${currentRepo.name}. Labels: ${(issue.labels || []).join(', ')}. Community is seeking triage and resolution.`;
    }
  });

  btnRun.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    if (!title && !description) {
      showToast('Please provide an issue title or description.');
      return;
    }

    btnRun.textContent = 'Triaging Issue...';
    btnRun.disabled = true;

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          repoName: currentRepo ? (currentRepo.fullName || currentRepo.name) : ''
        })
      });

      const data = await res.json();
      if (data && data.success && data.triage) {
        displayTriageResult(data.triage, data.mode);
        return;
      }
    } catch (e) {
      // Fallback
    } finally {
      btnRun.textContent = 'Analyze & Triage Issue';
      btnRun.disabled = false;
    }

    if (window.CLIENT_KNOWLEDGE) {
      const fallbackTriage = window.CLIENT_KNOWLEDGE.triage(title, description, currentRepo?.name);
      displayTriageResult({
        issueType: fallbackTriage.issueType,
        priority: fallbackTriage.priority,
        difficulty: fallbackTriage.difficulty,
        summary: fallbackTriage.summary,
        possibleAffectedArea: fallbackTriage.suggestedFix,
        suggestedLabels: fallbackTriage.recommendedLabels,
        suggestedNextSteps: [
          'Verify issue reproducibility on newest minor version.',
          'Identify minimal reproduction test case.',
          'Submit fix PR with associated unit tests.'
        ]
      }, 'Instant Engine');
    }
  });
}

function displayTriageResult(triage, mode) {
  document.getElementById('triageEmptyState').style.display = 'none';
  const details = document.getElementById('triageDetails');
  details.style.display = 'block';

  document.getElementById('triageType').textContent = triage.issueType;
  document.getElementById('triagePriority').textContent = `${triage.priority} Priority`;
  document.getElementById('triageDifficulty').textContent = triage.difficulty;
  document.getElementById('triageSummary').textContent = triage.summary;
  document.getElementById('triageAffectedArea').textContent = triage.possibleAffectedArea;

  const labelsContainer = document.getElementById('triageLabels');
  labelsContainer.innerHTML = '';
  (triage.suggestedLabels || []).forEach(l => {
    const span = document.createElement('span');
    span.className = 'topic-tag';
    span.textContent = l;
    labelsContainer.appendChild(span);
  });

  const stepsList = document.getElementById('triageSteps');
  stepsList.innerHTML = '';
  (triage.suggestedNextSteps || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    stepsList.appendChild(li);
  });
}

// Code Review Setup
function setupCodeReview() {
  const langSelect = document.getElementById('codeLangSelect');
  const codeInput = document.getElementById('codeInput');
  const contextInput = document.getElementById('codeContextInput');
  const btnRun = document.getElementById('btnRunReview');
  const btnLoadSample = document.getElementById('btnLoadSampleCode');
  const btnCopyImproved = document.getElementById('btnCopyImprovedCode');

  btnLoadSample.addEventListener('click', () => {
    const lang = langSelect.value;
    codeInput.value = SAMPLES[lang] || SAMPLES.javascript;
    contextInput.value = 'Refactored backend authentication check before database query';
  });

  btnCopyImproved.addEventListener('click', () => {
    const code = document.getElementById('reviewImprovedCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
      showToast('Improved code copied to clipboard!');
    });
  });

  btnRun.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    if (!code) {
      showToast('Please paste or write some code to review.');
      return;
    }

    btnRun.textContent = 'Reviewing Code...';
    btnRun.disabled = true;

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: langSelect.value,
          code,
          description: contextInput.value.trim()
        })
      });

      const data = await res.json();
      if (data && data.success && data.review) {
        displayCodeReviewResult(data.review, data.mode);
        return;
      }
    } catch (e) {
      // Fallback
    } finally {
      btnRun.textContent = 'Review Code';
      btnRun.disabled = false;
    }

    if (window.CLIENT_KNOWLEDGE) {
      const fallbackRev = window.CLIENT_KNOWLEDGE.review(code, langSelect.value);
      displayCodeReviewResult({
        score: fallbackRev.score,
        summary: fallbackRev.summary,
        issues: fallbackRev.issues.map(i => ({
          severity: i.severity === 'Critical' ? 'high' : i.severity === 'Warning' ? 'medium' : 'low',
          category: i.category || i.title,
          explanation: `${i.description} Fix: ${i.fix}`
        })),
        suggestions: [
          'Add parameter and null validation before execution.',
          'Introduce dedicated unit tests covering edge cases.',
          'Adhere to project linting and formatting standards.'
        ],
        improvedCode: fallbackRev.improvedCode
      }, 'Instant Engine');
    }
  });
}

function displayCodeReviewResult(review, mode) {
  document.getElementById('reviewEmptyState').style.display = 'none';
  const details = document.getElementById('reviewDetails');
  details.style.display = 'block';

  document.getElementById('reviewScore').textContent = `${review.score}/10`;
  document.getElementById('reviewSummary').textContent = review.summary;

  const issuesContainer = document.getElementById('reviewIssuesList');
  issuesContainer.innerHTML = '';
  (review.issues || []).forEach(iss => {
    const div = document.createElement('div');
    div.className = `issue-item ${iss.severity}`;
    div.innerHTML = `<strong>[${iss.severity}] ${iss.category}:</strong> ${iss.explanation}`;
    issuesContainer.appendChild(div);
  });

  const suggContainer = document.getElementById('reviewSuggestionsList');
  suggContainer.innerHTML = '';
  (review.suggestions || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    suggContainer.appendChild(li);
  });

  document.getElementById('reviewImprovedCode').textContent = review.improvedCode || '// No refactor required';
}

// Config Modal Setup
function setupConfigModal() {
  const modal = document.getElementById('configModal');
  const btnOpen = document.getElementById('openConfigBtn');
  const btnClose = document.getElementById('closeConfigBtn');
  const btnCancel = document.getElementById('btnCancelConfig');
  const btnSave = document.getElementById('btnSaveConfig');

  btnOpen.addEventListener('click', async () => {
    modal.classList.add('open');
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      document.getElementById('statusSummaryText').textContent = 
        `Gemini: ${data.geminiConfigured ? 'Configured ✅' : 'Instant Mode 🟡'} | GitHub: ${data.githubConfigured ? 'Configured ✅' : 'Public API 🟡'}`;
    } catch (e) {}
  });

  const closeModal = () => modal.classList.remove('open');
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  btnSave.addEventListener('click', async () => {
    const geminiKey = document.getElementById('inputGeminiKey').value.trim();
    const githubToken = document.getElementById('inputGithubToken').value.trim();

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiKey, githubToken })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Settings saved successfully!');
        closeModal();
        if (currentRepo) {
          analyzeRepository(currentRepo.fullName || currentRepo.name);
        }
      }
    } catch (e) {
      showToast('Failed to save settings.');
    }
  });
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
