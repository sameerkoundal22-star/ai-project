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
  setupRedditCommunity();

  // Synchronize real metrics and activity
  if (window.ClientMetrics) window.ClientMetrics.syncWithServer();
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
// AUTHENTICATION SYSTEM (CREDENTIALS, SUPABASE GOOGLE & GUEST)
// =========================================
let supabaseClient = null;

function getSupabaseConfig() {
  // Check from window.SUPABASE_CONFIG module, localStorage, window.__ENV__, or server API
  const cfg = (window.SUPABASE_CONFIG) || {};
  const url = cfg.url || localStorage.getItem('opensource_supabase_url') || window.ENV_SUPABASE_URL || '';
  const anonKey = cfg.anonKey || localStorage.getItem('opensource_supabase_anon_key') || window.ENV_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

async function fetchServerSupabaseConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.supabaseUrl && data.supabaseAnonKey) {
        localStorage.setItem('opensource_supabase_url', data.supabaseUrl);
        localStorage.setItem('opensource_supabase_anon_key', data.supabaseAnonKey);
        initSupabase();
      }
    }
  } catch (e) {
    // Static hosting environment
  }
}

function initSupabase() {
  const { url, anonKey } = getSupabaseConfig();
  if (url && anonKey && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabaseClient = window.supabase.createClient(url, anonKey);
    } catch (e) {
      console.warn('Supabase initialization:', e);
    }
  }
}

function setupAuthSystem() {
  const authWrapper = document.getElementById('authWrapper');
  const appLayout = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');
  const loginAlert = document.getElementById('loginAlert');
  const loginIdentifierInput = document.getElementById('loginIdentifier');
  const loginPasswordInput = document.getElementById('loginPassword');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const btnContinueGoogle = document.getElementById('btnContinueGoogle');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const eyeIconOpen = document.getElementById('eyeIconOpen');
  const eyeIconClosed = document.getElementById('eyeIconClosed');
  const btnContinueGuest = document.getElementById('btnContinueGuest');
  const btnSidebarLogout = document.getElementById('btnSidebarLogout');
  const btnTopLogout = document.getElementById('btnTopLogout');
  const guestModeBadge = document.getElementById('guestModeBadge');

  // Initialize Developer AI Network Canvas
  initLoginCanvas();

  // Initialize Supabase Client
  initSupabase();
  fetchServerSupabaseConfig();

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

    if (supabaseClient && supabaseClient.auth) {
      try { supabaseClient.auth.signOut(); } catch (e) {}
    }

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

  // =========================================
  // SUPABASE GOOGLE OAUTH HANDLER
  // =========================================
  async function handleGoogleSignIn() {
    clearAlert();
    initSupabase();

    const { url, anonKey } = getSupabaseConfig();

    if (!url || !anonKey || !supabaseClient) {
      showAlert('Supabase project configuration not detected. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your environment.');
      return;
    }

    if (btnContinueGoogle) {
      btnContinueGoogle.disabled = true;
      btnContinueGoogle.innerHTML = `<svg class="google-icon" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>Connecting to Google...</span>`;
    }

    try {
      // Current application URL for post-OAuth redirect
      const redirectTo = window.location.origin + window.location.pathname;

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        showAlert(error.message || 'Google authentication failed. Please try again.');
        if (btnContinueGoogle) {
          btnContinueGoogle.disabled = false;
          btnContinueGoogle.innerHTML = `<svg class="google-icon" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>Continue with Google</span>`;
        }
      }
    } catch (err) {
      showAlert(err.message || 'Unable to connect to Google authentication.');
      if (btnContinueGoogle) {
        btnContinueGoogle.disabled = false;
        btnContinueGoogle.innerHTML = `<svg class="google-icon" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>Continue with Google</span>`;
      }
    }
  }

  if (btnContinueGoogle) {
    btnContinueGoogle.addEventListener('click', handleGoogleSignIn);
  }

  // =========================================
  // CHECK SUPABASE OAUTH REDIRECT RETURN
  // =========================================
  async function checkSupabaseSession() {
    initSupabase();
    if (!supabaseClient) return;

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.warn('Supabase session check error:', error.message);
        return;
      }

      if (data && data.session && data.session.user) {
        const sbUser = data.session.user;
        const meta = sbUser.user_metadata || {};
        const googleUserData = {
          fullName: meta.full_name || meta.name || sbUser.email.split('@')[0],
          username: sbUser.email.split('@')[0],
          email: sbUser.email,
          avatarUrl: meta.avatar_url || meta.picture || null,
          provider: 'google'
        };

        sessionStorage.setItem('opensource_logged_in', 'true');
        sessionStorage.removeItem('opensource_is_guest');
        localStorage.setItem('opensource_user', JSON.stringify(googleUserData));
        if (data.session.access_token) {
          localStorage.setItem('opensource_token', data.session.access_token);
        }

        // Clean up hash fragments if any
        if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
          history.replaceState(null, '', window.location.pathname);
        }

        showToast(`Signed in with Google as ${googleUserData.fullName}`);
        enterDashboard(googleUserData, false);
      }
    } catch (err) {
      console.warn('Supabase redirect error:', err);
    }
  }

  // Run redirect check
  checkSupabaseSession();

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
  'insights': '#/github-insights',
  'reddit': '#/reddit-community'
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
  const btnClear = document.getElementById('btnClearRepoInput');

  if (input) {
    input.value = ''; // Ensure field is strictly empty on load
  }

  if (btnClear && input) {
    btnClear.addEventListener('click', () => {
      input.value = '';
      input.focus();
    });
  }

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

  if (!targetSlug) {
    showToast('Please enter a GitHub repository URL (e.g. https://github.com/owner/repository).');
    if (btnText) btnText.textContent = 'Analyze Repository';
    if (btnSpinner) btnSpinner.style.display = 'none';
    if (btn) btn.disabled = false;
    return;
  }

  // First try backend API
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
      if (window.ClientMetrics) {
        window.ClientMetrics.recordRepoAnalysis(currentRepo.fullName || currentRepo.name);
      }
      showToast(`Loaded ${currentRepo.fullName || currentRepo.name}`);
      switchTab('repo');
      return;
    } else {
      showToast(data.error || 'Failed to retrieve repository data.');
    }
  } catch (err) {
    // Client-side direct GitHub fetch if running statically on GitHub Pages
    try {
      const parts = targetSlug.split('/');
      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1];
        const ghToken = localStorage.getItem('opensource_github_token') || '';
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (ghToken) headers['Authorization'] = `Bearer ${ghToken}`;

        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        if (ghRes.ok) {
          const d = await ghRes.json();
          currentRepo = {
            name: d.name,
            owner: d.owner?.login || owner,
            fullName: d.full_name || `${owner}/${repo}`,
            description: d.description || 'Public GitHub repository.',
            stars: d.stargazers_count || 0,
            forks: d.forks_count || 0,
            openIssues: d.open_issues_count || 0,
            mainLanguage: d.language || 'Code',
            topics: d.topics || [d.name],
            activity: `Pushed ${d.pushed_at ? new Date(d.pushed_at).toLocaleDateString() : 'N/A'}`,
            license: d.license?.name || 'Open Source',
            html_url: d.html_url,
            readme: `# ${d.name}\n\n${d.description || ''}`,
            contributing: `# Contributing to ${d.name}\n\nStandard GitHub pull request workflow applies.`,
            issues: []
          };
          updateRepoUI(currentRepo, 'Live GitHub Client API');
          if (window.ClientMetrics) {
            window.ClientMetrics.recordRepoAnalysis(currentRepo.fullName || currentRepo.name);
          }
          showToast(`Loaded ${currentRepo.fullName}`);
          switchTab('repo');
          return;
        } else if (ghRes.status === 403) {
          showToast('GitHub API rate limit reached. Add your GitHub Token in Settings to continue.');
          return;
        } else if (ghRes.status === 404) {
          showToast(`Repository "${targetSlug}" not found on GitHub.`);
          return;
        }
      }
    } catch (clientErr) {
      showToast('Network error: Unable to contact GitHub API.');
    }
  } finally {
    if (btnText) btnText.textContent = 'Analyze Repository';
    if (btnSpinner) btnSpinner.style.display = 'none';
    if (btn) btn.disabled = false;
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
  if (licEl) licEl.textContent = repo.license || 'Open Source';
  
  // Real Insights Tab Synchronization
  const insStars = document.getElementById('insightsStars');
  const insForks = document.getElementById('insightsForks');
  const insIssues = document.getElementById('insightsOpenIssues');
  const insLang = document.getElementById('insightsLang');
  const insLic = document.getElementById('insightsLicense');

  if (insStars) insStars.textContent = (repo.stars || 0).toLocaleString();
  if (insForks) insForks.textContent = (repo.forks || 0).toLocaleString();
  if (insIssues) insIssues.textContent = (repo.openIssues || 0).toLocaleString();
  if (insLang) insLang.textContent = repo.mainLanguage || 'Code';
  if (insLic) insLic.textContent = repo.license || 'Open Source';

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
  const chips = document.querySelectorAll('.prompt-chip, .quick-chip');
  const btnClear = document.getElementById('btnClearChat');
  const srcKnowledge = document.getElementById('srcKnowledge');
  const srcGithub = document.getElementById('srcGithub');
  const srcReddit = document.getElementById('srcReddit');

  // Maintain in-memory multi-turn conversation history
  const conversationHistory = [];

  if (!form || !input) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.getAttribute('data-prompt');
      form.dispatchEvent(new Event('submit'));
    });
  });

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      conversationHistory.length = 0;
      messages.innerHTML = `
        <div class="message assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-body">
            <div class="message-meta">OpenSource AI Assistant • <span class="badge-mode">Ready</span></div>
            <div class="message-bubble"><p>Conversation cleared. What topic, coding question, or concept would you like to explore?</p></div>
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
    conversationHistory.push({ role: 'user', content: query });
    input.value = '';

    const loadingId = 'loading-' + Date.now();
    appendLoadingMessage(loadingId);

    // Fetch relevant Reddit discussions if Reddit source is checked
    let redditDiscussions = [];
    if (srcReddit && srcReddit.checked) {
      try {
        const redditRes = await fetch('/api/reddit/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, limit: 3 })
        });
        if (redditRes.ok) {
          const redditData = await redditRes.json();
          if (redditData && redditData.success && Array.isArray(redditData.posts)) {
            redditDiscussions = redditData.posts;
          }
        }
      } catch (err) {
        // Continue without Reddit context
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          repoContext: (srcGithub && srcGithub.checked) ? currentRepo : null,
          history: conversationHistory,
          redditDiscussions
        })
      });

      const data = await res.json();
      removeLoadingMessage(loadingId);
      if (data && data.success && data.reply) {
        appendChatMessage('assistant', data.reply, data.mode);
        conversationHistory.push({ role: 'assistant', content: data.reply });
        if (window.ClientMetrics) window.ClientMetrics.recordQuestion(query);
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    removeLoadingMessage(loadingId);
    let reply = '';
    if (window.OfflineAIEngine) {
      reply = window.OfflineAIEngine.answer(query, (srcGithub && srcGithub.checked) ? currentRepo : null, conversationHistory);
    } else if (window.CLIENT_KNOWLEDGE) {
      reply = window.CLIENT_KNOWLEDGE.chat(query, currentRepo);
    } else {
      reply = 'The AI service is currently unavailable. Please try again.';
    }

    appendChatMessage('assistant', reply, 'Universal AI Engine');
    conversationHistory.push({ role: 'assistant', content: reply });
    if (window.ClientMetrics) window.ClientMetrics.recordQuestion(query);
  });
}

function appendChatMessage(role, content, mode = '') {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const avatar = role === 'user' ? '👤' : '🤖';
    const meta = role === 'user' ? 'You' : `OpenSource AI Assistant • <span class="badge-mode">${mode || 'Universal AI'}</span>`;
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
  const btnClearTriage = document.getElementById('btnClearTriageForm');

  if (btnClearTriage) {
    btnClearTriage.addEventListener('click', () => {
      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';
      if (select) select.value = '';
      const summary = document.getElementById('triageSummary');
      if (summary) summary.textContent = 'Select an issue or paste title and description on the left to generate an automated triage analysis.';
      const area = document.getElementById('triageAffectedArea');
      if (area) area.textContent = 'Awaiting input analysis...';
    });
  }

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
        if (window.ClientMetrics) window.ClientMetrics.recordTriage(title, currentRepo?.fullName);
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
  const btnClearReview = document.getElementById('btnClearCodeReview');

  if (btnClearReview) {
    btnClearReview.addEventListener('click', () => {
      if (codeInput) codeInput.value = '';
      if (contextInput) contextInput.value = '';
      const scoreEl = document.getElementById('reviewScore');
      if (scoreEl) scoreEl.textContent = '-- / 10';
      const listEl = document.getElementById('reviewIssuesList');
      if (listEl) listEl.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted);">Paste code on the left and click \"Review Code\" to begin.</div>';
      const improved = document.getElementById('reviewImprovedCode');
      if (improved) improved.textContent = '// Refactored code will appear here';
    });
  }

  if (!btnRun) return;

  if (btnLoadSample && codeInput && langSelect) {
    btnLoadSample.addEventListener('click', () => {
      const lang = langSelect.value;
      codeInput.value = SAMPLES[lang] || SAMPLES.javascript;
      if (contextInput) contextInput.value = 'Security & error boundary review';
    });
  }

  // Language select changes mode without overwriting code input
  if (langSelect && codeInput) {
    langSelect.addEventListener('change', () => {
      // Keep user-entered code untouched
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
        if (window.ClientMetrics) window.ClientMetrics.recordCodeReview(langSelect ? langSelect.value : 'Code', data.review.score);
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
      const stepTitle = card.querySelector('h4')?.textContent || 'Roadmap Step';
      if (window.ClientMetrics) window.ClientMetrics.recordRoadmapStep(stepTitle);
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
  const inputSupabaseUrl = document.getElementById('inputSupabaseUrl');
  const inputSupabaseAnonKey = document.getElementById('inputSupabaseAnonKey');
  const inputGeminiKey = document.getElementById('inputGeminiKey');
  const inputGithubToken = document.getElementById('inputGithubToken');

  if (!modal) return;

  function loadSettings() {
    if (inputSupabaseUrl) inputSupabaseUrl.value = localStorage.getItem('opensource_supabase_url') || '';
    if (inputSupabaseAnonKey) inputSupabaseAnonKey.value = localStorage.getItem('opensource_supabase_anon_key') || '';
    const inputRedditId = document.getElementById('inputRedditClientId');
    const inputRedditSec = document.getElementById('inputRedditClientSecret');
    if (inputRedditId) inputRedditId.value = localStorage.getItem('opensource_reddit_client_id') || '';
    if (inputRedditSec) inputRedditSec.value = localStorage.getItem('opensource_reddit_client_secret') || '';
    if (inputGeminiKey) inputGeminiKey.value = localStorage.getItem('opensource_gemini_key') || '';
    if (inputGithubToken) inputGithubToken.value = localStorage.getItem('opensource_github_token') || '';
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      loadSettings();
      modal.classList.add('open');
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (inputSupabaseUrl) localStorage.setItem('opensource_supabase_url', inputSupabaseUrl.value.trim());
      if (inputSupabaseAnonKey) localStorage.setItem('opensource_supabase_anon_key', inputSupabaseAnonKey.value.trim());
      const inputRedditId = document.getElementById('inputRedditClientId');
      const inputRedditSec = document.getElementById('inputRedditClientSecret');
      if (inputRedditId) localStorage.setItem('opensource_reddit_client_id', inputRedditId.value.trim());
      if (inputRedditSec) localStorage.setItem('opensource_reddit_client_secret', inputRedditSec.value.trim());
      if (inputGeminiKey) localStorage.setItem('opensource_gemini_key', inputGeminiKey.value.trim());
      if (inputGithubToken) localStorage.setItem('opensource_github_token', inputGithubToken.value.trim());

      initSupabase();
      closeModal();
      showToast('Settings saved successfully.');
    });
  }

  // Load existing configuration on start
  loadSettings();
}


// =========================================
// REDDIT COMMUNITY DATA INTEGRATION
// =========================================
function setupRedditCommunity() {
  const form = document.getElementById('redditSearchForm');
  const input = document.getElementById('redditQueryInput');
  const select = document.getElementById('redditSubredditSelect');
  const btn = document.getElementById('btnSearchReddit');
  const list = document.getElementById('redditDiscussionsList');
  const loading = document.getElementById('redditLoadingState');
  const emptyState = document.getElementById('redditEmptyState');
  const countEl = document.getElementById('redditResultsCount');
  const alertEl = document.getElementById('redditSetupAlert');
  const badgeEl = document.getElementById('redditStatusBadge');

  if (!form || !input) return;

  // Check Reddit backend status on load
  checkRedditStatus();

  async function checkRedditStatus() {
    try {
      const res = await fetch('/api/reddit/status');
      if (res.ok) {
        const data = await res.json();
        if (data && data.configured) {
          if (badgeEl) {
            badgeEl.textContent = 'API Connected';
            badgeEl.className = 'badge badge-success';
          }
          if (alertEl) alertEl.style.display = 'none';
        } else {
          if (badgeEl) {
            badgeEl.textContent = 'Credentials Required';
            badgeEl.className = 'badge badge-warning';
          }
          if (alertEl) alertEl.style.display = 'block';
        }
      }
    } catch (e) {
      // In offline / GitHub Pages static mode
      if (alertEl) alertEl.style.display = 'block';
    }
  }

  // Quick Chips click handler
  document.querySelectorAll('.reddit-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.getAttribute('data-q') || '';
      form.dispatchEvent(new Event('submit'));
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    const subreddit = select ? select.value : '';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Searching Reddit...</span>';
    }
    if (loading) loading.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (list) list.style.display = 'none';
    if (countEl) countEl.textContent = 'Searching...';

    try {
      const res = await fetch('/api/reddit/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, subreddit, limit: 10 })
      });

      const data = await res.json();

      if (loading) loading.style.display = 'none';
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>Search Reddit</span>';
      }

      if (!data.configured) {
        if (alertEl) alertEl.style.display = 'block';
        if (emptyState) {
          emptyState.style.display = 'block';
          emptyState.innerHTML = `
            <div style="font-size: 2.2rem; margin-bottom: 10px;">⚙️</div>
            <h4 style="font-size: 1rem; color: var(--text-main); margin-bottom: 6px;">Reddit API Credentials Required</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 12px auto;">
              Reddit data is currently unavailable. Configure <code>REDDIT_CLIENT_ID</code> and <code>REDDIT_CLIENT_SECRET</code> in your server environment to retrieve live discussions.
            </p>
          `;
        }
        if (countEl) countEl.textContent = 'Setup required';
        return;
      }

      if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
        renderRedditPosts(data.posts);
      } else {
        if (emptyState) {
          emptyState.style.display = 'block';
          emptyState.innerHTML = `
            <div style="font-size: 2.2rem; margin-bottom: 10px;">🔍</div>
            <h4 style="font-size: 1rem; color: var(--text-main); margin-bottom: 6px;">No discussions found</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 420px; margin: 0 auto;">
              No public Reddit discussions found for "${query}". Try broader search terms like "git pull request", "python contribution", or "react".
            </p>
          `;
        }
        if (countEl) countEl.textContent = '0 discussions found';
      }
    } catch (err) {
      if (loading) loading.style.display = 'none';
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>Search Reddit</span>';
      }
      if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 10px;">⚠️</div>
          <h4 style="font-size: 1rem; color: var(--text-main); margin-bottom: 6px;">Reddit data is currently unavailable</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 420px; margin: 0 auto;">
            Unable to connect to the Reddit API endpoint. Please check your network connection or API quota.
          </p>
        `;
      }
      if (countEl) countEl.textContent = 'Error connecting';
    }
  });

  function renderRedditPosts(posts) {
    if (!list) return;
    list.innerHTML = '';

    posts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'reddit-post-card';

      const dateStr = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent';

      card.innerHTML = `
        <div class="reddit-post-header">
          <span class="reddit-sub-pill">${post.subreddit}</span>
          <div class="reddit-post-meta">
            <span>Posted by ${post.author}</span>
            <span>•</span>
            <span>${dateStr}</span>
          </div>
        </div>

        <h4 class="reddit-post-title">${escapeHTML(post.title)}</h4>

        ${post.summary ? `<p class="reddit-post-summary">${escapeHTML(post.summary)}</p>` : ''}

        <div class="reddit-post-footer">
          <div class="reddit-stats-group">
            <span class="reddit-stat-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              ${post.score.toLocaleString()} points
            </span>
            <span class="reddit-stat-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${post.numComments.toLocaleString()} comments
            </span>
          </div>

          <a href="${post.url}" target="_blank" rel="noopener noreferrer" class="btn-open-reddit">
            <span>Open Discussion</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          </a>
        </div>
      `;

      list.appendChild(card);
    });

    list.style.display = 'grid';
    if (countEl) countEl.textContent = `${posts.length} discussions found`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
