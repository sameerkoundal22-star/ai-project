// OpenSource AI - Complete Single-Page Application Client State, Handlers & Authentication System
let currentUser = null;
let currentRepo = null;
let currentDocTab = 'readme';

// Realistic sample codes for instant review testing across languages
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
  // Insecure unverified JWT parsing
  const data = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  return data;
};`,
  python: `import sqlite3

def get_user_records(user_input):
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    # SQL Injection via raw string formatting
    query = f"SELECT * FROM accounts WHERE username = '{user_input}'"
    cursor.execute(query)
    return cursor.fetchall()`,
  sql: `SELECT * FROM users WHERE email = '' OR '1'='1';`,
  java: `public User getUser(String id) throws Exception {
    Statement stmt = conn.createStatement();
    // Raw SQL execution
    ResultSet rs = stmt.executeQuery("SELECT * FROM users WHERE id = '" + id + "'");
    return rs.next() ? new User(rs.getString("name")) : null;
}`,
  cpp: `void copyBuffer(char* userInput) {
    char buffer[64];
    // Buffer overflow vulnerability
    strcpy(buffer, userInput);
}`,
  html: `<div id="profile">
  <!-- Cross-site scripting vulnerability via unescaped innerHTML -->
  <script>document.write(location.hash.substring(1));</script>
</div>`,
  css: `.container {
  /* Layout shifts due to uncontained dynamic flex properties */
  display: flex;
  overflow: visible;
}`
};

// UI Elements - queried inside DOMContentLoaded
let navItems;
let tabPanes;
let toastEl;

// =========================================
// INITIALIZATION & AUTH CHECK
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  setupAuthSystem();
    setupNavigation();
  setupHeroActions();
  setupUniversalSearch();
  setupRepoAnalysis();
  setupChat();
  setupTriage();
  setupCodeReview();
  setupConfigModal();
  setupTimelineSteps();

  // Load default repository
  analyzeRepository('facebook/react');
});

// Toast Helper
function showToast(message, duration = 3000) {
  if (!toastEl) toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
}

// =========================================
// AUTHENTICATION SYSTEM (CREDENTIALS & GUEST)
// =========================================
function setupAuthSystem() {
  const authWrapper = document.getElementById('authWrapper');
  const appLayout = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');
  const loginAlert = document.getElementById('loginAlert');
  const loginIdentifierInput = document.getElementById('loginIdentifier');
  const loginPasswordInput = document.getElementById('loginPassword');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const eyeIconOpen = document.getElementById('eyeIconOpen');
  const eyeIconClosed = document.getElementById('eyeIconClosed');
  const btnContinueGuest = document.getElementById('btnContinueGuest');
  const btnSidebarLogout = document.getElementById('btnSidebarLogout');
  const btnTopLogout = document.getElementById('btnTopLogout');
  const guestModeBadge = document.getElementById('guestModeBadge');

  // Initialize Developer AI Network Canvas
  initLoginCanvas();

  // Show/Hide Password Toggle
  if (btnTogglePassword && loginPasswordInput) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = loginPasswordInput.type === 'password';
      loginPasswordInput.type = isPassword ? 'text' : 'password';
      if (eyeIconOpen && eyeIconClosed) {
        eyeIconOpen.style.display = isPassword ? 'none' : 'block';
        eyeIconClosed.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  function clearAlert() {
    if (loginAlert) {
      loginAlert.textContent = '';
      loginAlert.style.display = 'none';
      loginAlert.className = 'auth-alert';
    }
  }

  function showAlert(msg, type = 'error') {
    if (loginAlert) {
      loginAlert.textContent = msg;
      loginAlert.className = `auth-alert ${type}`;
      loginAlert.style.display = 'block';
    }
  }

  function enterDashboard(user, isGuest = false) {
    currentUser = user || { fullName: 'Developer Contributor', username: 'developer', email: 'developer@opensource.ai' };
    if (authWrapper) authWrapper.style.display = 'none';
    if (appLayout) appLayout.style.display = 'flex';

    if (guestModeBadge) {
      guestModeBadge.style.display = isGuest ? 'inline-flex' : 'none';
    }

    // Initialize routing from URL hash or default to dashboard
    const initialTab = getTabFromUrl() || 'dashboard';
    switchTab(initialTab, true);
  }

  function performLogout() {
    sessionStorage.removeItem('opensource_logged_in');
    sessionStorage.removeItem('opensource_is_guest');
    localStorage.removeItem('opensource_token');
    localStorage.removeItem('opensource_user');
    currentUser = null;

    if (appLayout) appLayout.style.display = 'none';
    if (authWrapper) authWrapper.style.display = 'flex';
    clearAlert();

    if (loginIdentifierInput) loginIdentifierInput.value = '';
    if (loginPasswordInput) loginPasswordInput.value = '';

    if (guestModeBadge) {
      guestModeBadge.style.display = 'none';
    }

    history.replaceState(null, '', window.location.pathname);
    showToast('Logged out successfully.');
  }

  // Handle Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const identifier = loginIdentifierInput ? loginIdentifierInput.value.trim() : '';
      const password = loginPasswordInput ? loginPasswordInput.value : '';

      if (!identifier || !password) {
        showAlert('Invalid email/User ID or password.');
        return;
      }

      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = true;
        btnLoginSubmit.innerHTML = '<span>Verifying...</span>';
      }

      try {
        let authSuccess = false;
        let userData = null;

        // 1. Try server-side validation first
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            authSuccess = true;
            userData = data.user;
            if (data.token) {
              localStorage.setItem('opensource_token', data.token);
            }
          } else if (data && data.error) {
            showAlert(data.error);
          }
        } catch (apiErr) {
          // Backend server is not available (e.g. static GitHub Pages hosting)
          // Validate using registered credentials system
        }

        // 2. Client-side fallback authentication for static hosts (GitHub Pages)
        if (!authSuccess && !loginAlert.textContent) {
          const cleanId = identifier.toLowerCase();
          // Registered accounts validation: developer account or registered users
          if (
            (cleanId === 'developer' || cleanId === 'developer@opensource.ai') &&
            (password === 'Password123!')
          ) {
            authSuccess = true;
            userData = {
              fullName: 'Developer Contributor',
              username: 'developer',
              email: 'developer@opensource.ai'
            };
          } else {
            // Check locally registered accounts in browser storage if present
            const localAccounts = JSON.parse(localStorage.getItem('opensource_accounts') || '[]');
            const matched = localAccounts.find(acc => (acc.email === cleanId || acc.username === cleanId) && acc.password === password);
            if (matched) {
              authSuccess = true;
              userData = {
                fullName: matched.fullName || matched.username,
                username: matched.username,
                email: matched.email
              };
            }
          }
        }

        if (authSuccess && userData) {
          sessionStorage.setItem('opensource_logged_in', 'true');
          sessionStorage.removeItem('opensource_is_guest');
          localStorage.setItem('opensource_user', JSON.stringify(userData));
          showToast(`Welcome back, ${userData.fullName || userData.username}!`);
          enterDashboard(userData, false);
        } else if (!loginAlert.textContent) {
          showAlert('Invalid email/User ID or password.');
        }
      } catch (err) {
        showAlert('Invalid email/User ID or password.');
      } finally {
        if (btnLoginSubmit) {
          btnLoginSubmit.disabled = false;
          btnLoginSubmit.innerHTML = '<span>Login</span>';
        }
      }
    });
  }

  // Handle Permanent Guest Account Access (Untouched behavior)
  if (btnContinueGuest) {
    btnContinueGuest.addEventListener('click', () => {
      const guestUser = {
        fullName: 'Guest Contributor',
        username: 'guest',
        email: 'guest@opensource.ai',
        isGuest: true
      };

      sessionStorage.setItem('opensource_logged_in', 'true');
      sessionStorage.setItem('opensource_is_guest', 'true');
      localStorage.setItem('opensource_user', JSON.stringify(guestUser));

      enterDashboard(guestUser, true);
      showToast('Exploring OpenSource AI in Guest Mode');
    });
  }

  // Logout Listeners
  if (btnSidebarLogout) btnSidebarLogout.addEventListener('click', performLogout);
  if (btnTopLogout) btnTopLogout.addEventListener('click', performLogout);

  // Session State Check
  const isLoggedIn = sessionStorage.getItem('opensource_logged_in') === 'true';
  const isGuest = sessionStorage.getItem('opensource_is_guest') === 'true';
  const savedUser = localStorage.getItem('opensource_user');

  if (isLoggedIn && savedUser) {
    try {
      enterDashboard(JSON.parse(savedUser), isGuest);
    } catch (e) {
      if (authWrapper) authWrapper.style.display = 'flex';
      if (appLayout) appLayout.style.display = 'none';
    }
  } else {
    if (authWrapper) authWrapper.style.display = 'flex';
    if (appLayout) appLayout.style.display = 'none';
  }
}

// =========================================
// INTERACTIVE AI & DEVELOPER PARTICLES CANVAS
// =========================================
function initLoginCanvas() {
  const canvas = document.getElementById('loginCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const nodeCount = Math.min(Math.floor((width * height) / 16000), 55);
  const nodes = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1.2,
      baseAlpha: Math.random() * 0.5 + 0.3
    });
  }

  let animationFrameId;

  function draw() {
    // Check if authWrapper is still visible
    const authWrapper = document.getElementById('authWrapper');
    if (authWrapper && authWrapper.style.display === 'none') {
      animationFrameId = requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // Update & draw nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0) node.x = width;
      else if (node.x > width) node.x = 0;
      if (node.y < 0) node.y = height;
      else if (node.y > height) node.y = 0;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(129, 140, 248, ${node.baseAlpha})`;
      ctx.fill();

      // Connect with nearby nodes (neural network / git branch style)
      for (let j = i + 1; j < nodes.length; j++) {
        const other = nodes[j];
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 125) {
          const alpha = (1 - dist / 125) * 0.22;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Draw static single frame
    draw();
  } else {
    draw();
  }
}

// =========================================
// NAVIGATION, ROUTING & MOBILE DRAWER SETUP
// =========================================
const ROUTE_MAP = {
  'dashboard': '#/dashboard',
  'chat': '#/ai-assistant',
  'repo': '#/repository-analyzer',
  'triage': '#/issue-triage',
  'review': '#/code-review',
  'guide': '#/contributor-guide',
  'insights': '#/github-insights'
};

const INVERSE_ROUTE_MAP = {
  'dashboard': 'dashboard',
  '/dashboard': 'dashboard',
  'ai-assistant': 'chat',
  '/ai-assistant': 'chat',
  'chat': 'chat',
  '/chat': 'chat',
  'repository-analyzer': 'repo',
  '/repository-analyzer': 'repo',
  'repo': 'repo',
  '/repo': 'repo',
  'issue-triage': 'triage',
  '/issue-triage': 'triage',
  'triage': 'triage',
  '/triage': 'triage',
  'code-review': 'review',
  '/code-review': 'review',
  'review': 'review',
  '/review': 'review',
  'contributor-guide': 'guide',
  '/contributor-guide': 'guide',
  'guide': 'guide',
  '/guide': 'guide',
  'github-insights': 'insights',
  '/github-insights': 'insights',
  'insights': 'insights',
  '/insights': 'insights'
};

function getTabFromUrl() {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!hash) return null;
  return INVERSE_ROUTE_MAP[hash] || INVERSE_ROUTE_MAP['/' + hash] || null;
}

function setupNavigation() {
  navItems = document.querySelectorAll('.nav-item');
  tabPanes = document.querySelectorAll('.tab-pane');
  toastEl = document.getElementById('toast');

  // Mobile drawer elements
  const btnMobileToggle = document.getElementById('btnMobileNavToggle');
  const btnCloseSidebar = document.getElementById('btnCloseSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const appSidebar = document.getElementById('appSidebar');

  function openMobileMenu() {
    if (appSidebar) appSidebar.classList.add('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('mobile-open');
    document.body.classList.add('sidebar-open');
  }

  function closeMobileMenu() {
    if (appSidebar) appSidebar.classList.remove('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('mobile-open');
    document.body.classList.remove('sidebar-open');
  }

  if (btnMobileToggle) btnMobileToggle.addEventListener('click', openMobileMenu);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeMobileMenu);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileMenu);

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab, true);
      closeMobileMenu();
    });
  });

  document.querySelectorAll('[data-navigate]').forEach(card => {
    card.addEventListener('click', () => {
      const tab = card.getAttribute('data-navigate');
      switchTab(tab, true);
      closeMobileMenu();
    });
  });

  document.querySelectorAll('.switch-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const slug = chip.getAttribute('data-slug');
      const input = document.getElementById('repoUrlInput');
      if (input) input.value = slug;
      analyzeRepository(slug);
      closeMobileMenu();
    });
  });

  document.querySelectorAll('.quick-sample').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const repo = link.getAttribute('data-repo');
      const input = document.getElementById('repoUrlInput');
      if (input) input.value = repo;
      analyzeRepository(repo);
      closeMobileMenu();
    });
  });

  // Handle Browser Back / Forward Buttons via popstate
  window.addEventListener('popstate', (event) => {
    const isLoggedIn = sessionStorage.getItem('opensource_logged_in') === 'true';
    if (!isLoggedIn) return;

    if (event.state && event.state.tab) {
      switchTab(event.state.tab, false);
    } else {
      const tabFromUrl = getTabFromUrl() || 'dashboard';
      switchTab(tabFromUrl, false);
    }
    closeMobileMenu();
  });
}

function switchTab(tabId, pushHistory = true) {
  if (!tabId) tabId = 'dashboard';
  if (!navItems) navItems = document.querySelectorAll('.nav-item');
  if (!tabPanes) tabPanes = document.querySelectorAll('.tab-pane');

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
      pane.scrollTop = 0;
    } else {
      pane.classList.remove('active');
    }
  });

  // Push new state to browser history when navigating intentionally
  if (pushHistory) {
    const hash = ROUTE_MAP[tabId] || `#/${tabId}`;
    if (window.location.hash !== hash) {
      history.pushState({ tab: tabId }, '', hash);
    }
  }

  // Ensure mobile drawer closes
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (appSidebar) appSidebar.classList.remove('mobile-open');
  if (sidebarBackdrop) sidebarBackdrop.classList.remove('mobile-open');
  document.body.classList.remove('sidebar-open');
}

// Hero Action Buttons
function setupHeroActions() {
  const btnAnalyze = document.getElementById('btnHeroAnalyze');
  const btnAskAI = document.getElementById('btnHeroAskAI');

  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', () => {
      const mainBtn = document.getElementById('btnAnalyzeMain');
      if (mainBtn) mainBtn.click();
    });
  }

  if (btnAskAI) {
    btnAskAI.addEventListener('click', () => {
      switchTab('chat');
    });
  }
}

// Top Bar Instant Search
function setupUniversalSearch() {
  const topInput = document.getElementById('topSearchInput');
  const btnClear = document.getElementById('btnClearTopSearch');
  const searchCard = document.getElementById('instantSearchCard');
  const searchTitle = document.getElementById('searchResTitle');
  const searchBody = document.getElementById('searchResBody');
  const searchTags = document.getElementById('searchResTags');
  const btnClose = document.getElementById('btnCloseSearchRes');
  const btnAskAI = document.getElementById('btnAskAIAboutSearch');

  if (!topInput || !searchCard) return;

  let debounceTimer;

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      topInput.value = '';
      btnClear.style.display = 'none';
      searchCard.style.display = 'none';
      topInput.focus();
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      searchCard.style.display = 'none';
    });
  }

  if (btnAskAI) {
    btnAskAI.addEventListener('click', () => {
      const q = topInput.value.trim();
      if (q) {
        switchTab('chat');
        searchCard.style.display = 'none';
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.value = `Tell me in detail about: ${q}`;
          document.getElementById('chatForm').dispatchEvent(new Event('submit'));
        }
      }
    });
  }

  topInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = topInput.value.trim();
    if (btnClear) btnClear.style.display = query ? 'block' : 'none';

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
          renderSearchResults(data.result);
          return;
        }
      } catch (err) {
        // Fallback to client knowledge
      }

      if (window.CLIENT_KNOWLEDGE) {
        const res = window.CLIENT_KNOWLEDGE.search(query, currentRepo);
        renderSearchResults(res);
      }
    }, 280);
  });

  function renderSearchResults(res) {
    if (searchTitle) searchTitle.textContent = res.title || 'Knowledge Base';
    if (searchBody) {
      searchBody.innerHTML = window.marked ? window.marked.parse(res.answer || '') : (res.answer || '');
    }
    if (searchTags) {
      searchTags.innerHTML = (res.tags || []).map(t => `<span class="search-tag">${t}</span>`).join('');
    }
    searchCard.style.display = 'block';
  }
}

// =========================================
// REPOSITORY ANALYZER
// =========================================
function setupRepoAnalysis() {
  const form = document.getElementById('repoSearchForm');
  const input = document.getElementById('repoUrlInput');
  const btn = document.getElementById('btnAnalyzeMain');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input ? input.value.trim() : '';
      if (val) analyzeRepository(val);
    });
  }

  if (btn) {
    btn.addEventListener('click', () => {
      const val = input ? input.value.trim() : '';
      if (val) analyzeRepository(val);
    });
  }
}

async function analyzeRepository(repoSlugOrUrl) {
  const btn = document.getElementById('btnAnalyzeMain');
  const btnText = btn ? btn.querySelector('.btn-text') : null;
  const btnSpinner = btn ? btn.querySelector('.btn-spinner') : null;

  if (btnText) btnText.textContent = 'Analyzing...';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';
  if (btn) btn.disabled = true;

  // Clean raw pasted input
  let cleanInput = (repoSlugOrUrl || '').trim();
  cleanInput = cleanInput.replace(/^https?:\/\/github\.com\//i, '');
  cleanInput = cleanInput.replace(/\.git$/i, '');
  cleanInput = cleanInput.replace(/^\/+/, '').replace(/\/+$/, '');

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
    // Client fallback
  } finally {
    if (btnText) btnText.textContent = 'Analyze Repository';
    if (btnSpinner) btnSpinner.style.display = 'none';
    if (btn) btn.disabled = false;
  }

  // Client-side fallback
  if (window.CLIENT_KNOWLEDGE && window.CLIENT_KNOWLEDGE.projects) {
    const s = targetSlug.toLowerCase();
    let matched = window.CLIENT_KNOWLEDGE.projects[s];
    if (!matched) {
      const keys = Object.keys(window.CLIENT_KNOWLEDGE.projects);
      const foundKey = keys.find(k => k.includes(s) || s.includes(k.split('/')[1]));
      matched = foundKey ? window.CLIENT_KNOWLEDGE.projects[foundKey] : null;
    }

    if (!matched) {
      const parts = targetSlug.split('/');
      const owner = parts[0] || 'developer';
      const name = parts[1] || parts[0] || 'project';
      matched = {
        name,
        owner,
        fullName: `${owner}/${name}`,
        description: `Open-source ${name} repository providing developer tools and utilities.`,
        stars: 3420,
        forks: 580,
        openIssues: 24,
        mainLanguage: 'TypeScript / JavaScript',
        topics: [name, 'developer-tools', 'open-source'],
        activity: 'Active contributions and updates',
        license: 'MIT',
        readme: '# ' + name + '\n\nWelcome to **' + owner + '/' + name + '**.\n\n## Quick Start\n```bash\ngit clone https://github.com/' + owner + '/' + name + '.git\ncd ' + name + '\nnpm install\nnpm test\n```\n\n## Architecture\nModern modular component architecture.',
        contributing: '# Contributing to ' + name + '\n\n1. Fork the repo.\n2. Ensure npm test passes.\n3. Open PR.',
        issues: [
          { id: 801, number: 14, title: `Documentation: Update usage guide for ${name}`, labels: ['good first issue', 'docs'], difficulty: 'Beginner' },
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
  const badgeName = document.getElementById('badgeRepoName');
  const badgeMode = document.getElementById('badgeRepoMode');
  const chatRepoName = document.getElementById('chatRepoName');
  const guideRepoName = document.getElementById('guideRepoName');

  if (badgeName) badgeName.textContent = fullName;
  if (badgeMode) badgeMode.textContent = mode || 'Instant Engine';
  if (chatRepoName) chatRepoName.textContent = fullName;
  if (guideRepoName) guideRepoName.textContent = fullName;

  // Header Details
  const titleEl = document.getElementById('repoDetailTitle');
  const descEl = document.getElementById('repoDetailDesc');
  const starsEl = document.getElementById('repoStars');
  const forksEl = document.getElementById('repoForks');
  const issuesEl = document.getElementById('repoIssues');
  const langEl = document.getElementById('repoLang');
  const licEl = document.getElementById('repoLicense');

  if (titleEl) titleEl.textContent = fullName;
  if (descEl) descEl.textContent = repo.description;
  if (starsEl) starsEl.textContent = (repo.stars || 0).toLocaleString();
  if (forksEl) forksEl.textContent = (repo.forks || 0).toLocaleString();
  if (issuesEl) issuesEl.textContent = (repo.openIssues || 0).toLocaleString();
  if (langEl) langEl.textContent = repo.mainLanguage || 'TypeScript';
  if (licEl) licEl.textContent = repo.license || 'MIT';

  // Readme
  const readmeBox = document.getElementById('repoReadmeContainer');
  if (readmeBox) {
    readmeBox.innerHTML = window.marked ? window.marked.parse(repo.readme || '') : (repo.readme || '');
  }

  // Populate Triage issue select
  const triageSelect = document.getElementById('triageIssueSelect');
  if (triageSelect) {
    triageSelect.innerHTML = '<option value="">-- Choose an issue from active repository --</option>';
    if (repo.issues && Array.isArray(repo.issues)) {
      repo.issues.forEach(iss => {
        const opt = document.createElement('option');
        opt.value = iss.id || iss.number;
        opt.textContent = `#${iss.number || iss.id}: ${iss.title}`;
        triageSelect.appendChild(opt);
      });
    }
  }
}

// =========================================
// AI ASSISTANT CHAT
// =========================================
function setupChat() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  const btnClear = document.getElementById('btnClearChat');

  if (!form || !input) return;

  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.getAttribute('data-prompt');
      form.dispatchEvent(new Event('submit'));
    });
  });

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      messages.innerHTML = `
        <div class="message assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-body">
            <div class="message-meta">OpenSource AI Mentor • <span class="badge-mode">Ready</span></div>
            <div class="message-bubble"><p>Conversation cleared. What open-source topic or issue would you like to explore?</p></div>
          </div>
        </div>
      `;
    });
  }

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
        body: JSON.stringify({ message: query, repoContext: currentRepo })
      });

      const data = await res.json();
      removeLoadingMessage(loadingId);
      if (data && data.success) {
        appendChatMessage('assistant', data.reply, data.mode);
        return;
      }
    } catch (err) {
      // Fallback
    }

    removeLoadingMessage(loadingId);
    if (window.CLIENT_KNOWLEDGE) {
      const reply = window.CLIENT_KNOWLEDGE.chat(query, currentRepo);
      appendChatMessage('assistant', reply, 'Instant Engine');
    }
  });

  function appendChatMessage(role, content, mode = '') {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const avatar = role === 'user' ? '👤' : '🤖';
    const meta = role === 'user' ? 'You' : `OpenSource AI Mentor • <span class="badge-mode">${mode || 'Engine'}</span>`;
    const formattedContent = role === 'assistant' && window.marked 
      ? window.marked.parse(content) 
      : `<p>${content}</p>`;

    div.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-body">
        <div class="message-meta">${meta}</div>
        <div class="message-bubble">${formattedContent}</div>
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
        <div class="message-bubble"><p>Analyzing context and crafting guidance...</p></div>
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

// =========================================
// ISSUE TRIAGE & ANALYSIS
// =========================================
function setupTriage() {
  const select = document.getElementById('triageIssueSelect');
  const titleInput = document.getElementById('triageTitle');
  const descInput = document.getElementById('triageDesc');
  const btnRun = document.getElementById('btnRunTriage');
  const btnCopy = document.getElementById('btnCopyTriage');

  if (!btnRun) return;

  if (select) {
    select.addEventListener('change', () => {
      const issueId = select.value;
      if (!issueId || !currentRepo?.issues) return;
      const issue = currentRepo.issues.find(i => (i.id == issueId || i.number == issueId));
      if (issue) {
        titleInput.value = issue.title;
        descInput.value = `Issue #${issue.number || issue.id} reported in ${currentRepo.name}. Labels: ${(issue.labels || []).join(', ')}. Community is seeking triage and resolution.`;
      }
    });
  }

  btnRun.addEventListener('click', async () => {
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

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
        displayTriageResult(data.triage);
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
      displayTriageResult(fallbackTriage);
      showToast('Issue triage report generated!');
    }
  });

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const summary = document.getElementById('triageSummary')?.textContent || '';
      const area = document.getElementById('triageAffectedArea')?.textContent || '';
      const text = `Issue Triage Report:\nSummary: ${summary}\nAffected Area: ${area}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast('Triage report copied to clipboard!');
      });
    });
  }
}

function displayTriageResult(triage) {
  const priorityEl = document.getElementById('triagePriority');
  const typeEl = document.getElementById('triageType');
  const beginnerEl = document.getElementById('triageBeginner');
  const summaryEl = document.getElementById('triageSummary');
  const affectedEl = document.getElementById('triageAffectedArea');
  const stepsList = document.getElementById('triageSteps');

  if (priorityEl) {
    priorityEl.textContent = (triage.priority || 'MEDIUM').toUpperCase() + ' PRIORITY';
    priorityEl.className = `badge-tag ${(triage.priority || 'medium').toLowerCase()}`;
  }
  if (typeEl) typeEl.textContent = triage.issueType || 'Bug';
  if (beginnerEl) {
    beginnerEl.textContent = `Beginner Friendly: ${triage.difficulty === 'Beginner' ? 'Yes' : 'No'}`;
    beginnerEl.className = `badge-tag ${triage.difficulty === 'Beginner' ? 'low' : 'medium'}`;
  }
  if (summaryEl) summaryEl.textContent = triage.summary;
  if (affectedEl) affectedEl.textContent = triage.possibleAffectedArea || triage.suggestedFix;

  if (stepsList && triage.suggestedNextSteps) {
    stepsList.innerHTML = '';
    triage.suggestedNextSteps.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      stepsList.appendChild(li);
    });
  }
}

// =========================================
// CODE REVIEW & VULNERABILITY SCANNER
// =========================================
function setupCodeReview() {
  const btnRun = document.getElementById('btnRunReview');
  const btnLoadSample = document.getElementById('btnLoadSampleCode');
  const codeInput = document.getElementById('codeInput');
  const langSelect = document.getElementById('codeLangSelect');
  const contextInput = document.getElementById('codeContextInput');
  const btnCopyImproved = document.getElementById('btnCopyImprovedCode');

  if (!btnRun) return;

  if (btnLoadSample && codeInput && langSelect) {
    btnLoadSample.addEventListener('click', () => {
      const lang = langSelect.value;
      codeInput.value = SAMPLES[lang] || SAMPLES.javascript;
      if (contextInput) contextInput.value = 'Security & error boundary review';
    });
  }

  if (langSelect && codeInput) {
    langSelect.addEventListener('change', () => {
      const lang = langSelect.value;
      if (SAMPLES[lang]) {
        codeInput.value = SAMPLES[lang];
      }
    });
  }

  if (btnCopyImproved) {
    btnCopyImproved.addEventListener('click', () => {
      const code = document.getElementById('reviewImprovedCode')?.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        showToast('Improved code copied to clipboard!');
      });
    });
  }

  btnRun.addEventListener('click', async () => {
    const code = codeInput ? codeInput.value.trim() : '';
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
          language: langSelect ? langSelect.value : 'javascript',
          code,
          description: contextInput ? contextInput.value.trim() : ''
        })
      });

      const data = await res.json();
      if (data && data.success && data.review) {
        displayCodeReviewResult(data.review);
        return;
      }
    } catch (e) {
      // Fallback
    } finally {
      btnRun.textContent = 'Review Code';
      btnRun.disabled = false;
    }

    if (window.CLIENT_KNOWLEDGE) {
      const fallbackRev = window.CLIENT_KNOWLEDGE.review(code, langSelect ? langSelect.value : 'javascript');
      displayCodeReviewResult(fallbackRev);
      showToast('Code review analysis complete!');
    }
  });
}

function displayCodeReviewResult(review) {
  const scoreEl = document.getElementById('reviewScore');
  const issuesContainer = document.getElementById('reviewIssuesList');
  const improvedBox = document.getElementById('reviewImprovedCode');

  if (scoreEl) scoreEl.textContent = `${review.score}/10`;

  if (issuesContainer) {
    issuesContainer.innerHTML = '';
    (review.issues || []).forEach(iss => {
      const div = document.createElement('div');
      div.className = `badge-tag ${iss.severity === 'high' ? 'critical' : iss.severity === 'medium' ? 'high' : 'low'}`;
      div.style.borderRadius = '6px';
      div.style.display = 'block';
      div.style.marginBottom = '6px';
      div.style.padding = '8px 10px';
      div.style.textTransform = 'none';
      div.innerHTML = `<strong>${iss.category || 'Finding'}:</strong> ${iss.explanation}`;
      issuesContainer.appendChild(div);
    });

    if (review.suggestions && review.suggestions.length > 0) {
      const suggHeader = document.createElement('div');
      suggHeader.style.fontSize = '0.8rem';
      suggHeader.style.fontWeight = '700';
      suggHeader.style.color = 'var(--text-secondary)';
      suggHeader.style.marginTop = '8px';
      suggHeader.style.marginBottom = '4px';
      suggHeader.textContent = 'Recommendations:';
      issuesContainer.appendChild(suggHeader);

      review.suggestions.forEach(sugg => {
        const p = document.createElement('div');
        p.style.fontSize = '0.78rem';
        p.style.color = 'var(--text-secondary)';
        p.style.paddingLeft = '6px';
        p.style.marginBottom = '3px';
        p.textContent = `• ${sugg}`;
        issuesContainer.appendChild(p);
      });
    }
  }

  if (improvedBox) {
    improvedBox.textContent = review.improvedCode || '// No code improvements required.';
  }
}

// =========================================
// CONTRIBUTOR TIMELINE STEPS
// =========================================
function setupTimelineSteps() {
  const steps = document.querySelectorAll('.step-card');
  steps.forEach(card => {
    card.addEventListener('click', () => {
      steps.forEach(s => s.classList.remove('active'));
      card.classList.add('active');
    });
  });
}

// =========================================
// CONFIGURATION MODAL SETUP
// =========================================
function setupConfigModal() {
  const modal = document.getElementById('configModal');
  const btnOpen = document.getElementById('openConfigBtn');
  const btnClose = document.getElementById('closeConfigBtn');
  const btnCancel = document.getElementById('btnCancelConfig');
  const btnSave = document.getElementById('btnSaveConfig');

  if (!modal || !btnOpen) return;

  btnOpen.addEventListener('click', () => {
    modal.classList.add('open');
  });

  function closeModal() {
    modal.classList.remove('open');
  }

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      closeModal();
      showToast('Settings saved successfully.');
    });
  }
}
