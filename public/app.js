// Safe API request helper: returns null on non-200 or static 404/405 without uncaught errors
async function safeApiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      return { ok: false, status: res.status, data: null };
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: true, status: res.status, data };
    }
    return { ok: true, status: res.status, data: null };
  } catch (err) {
    return { ok: false, status: 0, error: err };
  }
}

// OpenSource AI - Complete Single-Page Application Client State, Handlers & Authentication System
let currentUser = null;
let currentRepo = null;
let currentDocTab = 'readme';

// Realistic sample codes for instant review testing across languages
const SAMPLES = {
  python: `# Python algorithm with logical/edge-case bug on negative numbers
def find_largest(numbers):
    largest = 0

    for number in numbers:
        if number > largest:
            largest = number

    return largest`,
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
// REPOSITORY ANALYZER & LIVE GITHUB INTELLIGENCE
// =========================================
let isAnalysisInProgress = false;

function setupRepoAnalysis() {
  const btn = document.getElementById('btnAnalyzeMain');
  const input = document.getElementById('repoUrlInput');
  const btnClear = document.getElementById('btnClearRepoInput');
  const btnCopyCommands = document.getElementById('btnCopyQuickCommands');
  const btnOpenSettings = document.getElementById('btnOpenSettingsFromRateLimit');
  const btnRetry = document.getElementById('btnRetryRepoAnalysis');
  const btnDismiss = document.getElementById('btnDismissRateLimit');

  if (btnClear && input) {
    btnClear.addEventListener('click', () => {
      input.value = '';
      input.focus();
    });
  }

  if (btnCopyCommands) {
    btnCopyCommands.addEventListener('click', () => {
      const commands = document.getElementById('repoQuickStart')?.textContent || '';
      navigator.clipboard.writeText(commands).then(() => {
        showToast('Setup commands copied to clipboard!');
      });
    });
  }

  if (btnOpenSettings) {
    btnOpenSettings.addEventListener('click', () => {
      const modal = document.getElementById('configModal');
      if (modal) modal.classList.add('open');
    });
  }

  if (btnRetry && input) {
    btnRetry.addEventListener('click', () => {
      analyzeRepository(input.value.trim());
    });
  }

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      const banner = document.getElementById('repoRateLimitBanner');
      if (banner) banner.style.display = 'none';
    });
  }

  if (btn && input) {
    btn.addEventListener('click', () => {
      analyzeRepository(input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        analyzeRepository(input.value.trim());
      }
    });
  }
}

// Clean and normalize repository input into { owner, repo, slug }
function normalizeRepoInput(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let clean = raw.trim();

  // Strip protocol and domain
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

function showRateLimitUI(rateInfo, customMessage) {
  const banner = document.getElementById('repoRateLimitBanner');
  const titleEl = document.getElementById('repoRateLimitTitle');
  const msgEl = document.getElementById('repoRateLimitMessage');
  const remEl = document.getElementById('repoRateLimitRemaining');
  const resetEl = document.getElementById('repoRateLimitResetTime');

  if (!banner) return;

  const rem = (rateInfo && typeof rateInfo.remaining === 'number') ? rateInfo.remaining : 0;
  let resetTimeFormatted = 'In ~45 minutes';

  if (rateInfo && rateInfo.reset) {
    const resetDate = new Date(rateInfo.reset * 1000);
    resetTimeFormatted = resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  if (remEl) remEl.textContent = rem;
  if (resetEl) resetEl.textContent = resetTimeFormatted;

  const hasConfiguredToken = Boolean(localStorage.getItem('opensource_github_token'));

  if (titleEl) {
    titleEl.textContent = hasConfiguredToken
      ? 'GitHub API Rate Limit Reached (Authenticated Account)'
      : 'GitHub API Rate Limit Reached (Unauthenticated Public Quota)';
  }

  if (msgEl) {
    msgEl.textContent = customMessage || (hasConfiguredToken
      ? 'Your configured GitHub Personal Access Token has reached its hourly quota.'
      : 'The public unauthenticated GitHub REST API rate limit (60 requests/hr) for this network has been exhausted.');
  }

  banner.style.display = 'block';
  switchTab('repo');
}

function hideRateLimitUI() {
  const banner = document.getElementById('repoRateLimitBanner');
  if (banner) banner.style.display = 'none';
}

async function analyzeRepository(repoSlugOrUrl) {
  // Prevent duplicate concurrent requests (Rule 6 & 19)
  if (isAnalysisInProgress) return;

  const btn = document.getElementById('btnAnalyzeMain');
  const btnText = btn ? btn.querySelector('.btn-text') : null;
  const btnSpinner = btn ? btn.querySelector('.btn-spinner') : null;
  const progressBox = document.getElementById('repoAnalysisProgress');
  const progressStepText = document.getElementById('repoProgressStepText');
  const progressSubText = document.getElementById('repoProgressSubText');

  const parsed = normalizeRepoInput(repoSlugOrUrl);

  if (!parsed) {
    showToast('Please enter a valid GitHub repository (e.g. facebook/react or https://github.com/microsoft/vscode).');
    return;
  }

  const targetSlug = parsed.slug;
  const { owner, repo } = parsed;

  // Check client-side session cache to prevent duplicate request if already analyzed
  const clientCacheKey = `github:repo:${targetSlug.toLowerCase()}`;
  const cachedStr = sessionStorage.getItem(clientCacheKey);
  if (cachedStr) {
    try {
      const cachedRepo = JSON.parse(cachedStr);
      if (cachedRepo && cachedRepo.fullName) {
        hideRateLimitUI();
        currentRepo = cachedRepo;
        updateRepoUI(currentRepo, 'Cached Session Data');
        showToast(`Loaded ${currentRepo.fullName} (Cached)`);
        switchTab('repo');
        return;
      }
    } catch (e) {}
  }

  // Set loading state & guard
  isAnalysisInProgress = true;
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Analyzing...';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';
  if (progressBox) progressBox.style.display = 'block';

  function updateProgress(step, detail) {
    if (progressStepText) progressStepText.textContent = step;
    if (progressSubText) progressSubText.textContent = detail;
  }

  updateProgress('Validating repository...', `Target: ${targetSlug}`);

  // 1. First attempt: Dedicated Server GitHub Service Pipeline (Strict Request Budget)
  try {
    updateProgress('Connecting to GitHub API...', 'Fetching repository metadata & structure...');
    const res = await fetch('/api/repo/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetSlug })
    });

    const data = await res.json();
    if (res.ok && data.success && data.data) {
      hideRateLimitUI();
      updateProgress('Synthesizing intelligence...', 'Constructing architectural breakdown...');
      currentRepo = data.data;

      // Store in client sessionStorage cache
      try {
        sessionStorage.setItem(clientCacheKey, JSON.stringify(currentRepo));
      } catch (e) {}

      updateRepoUI(currentRepo, data.fromCache ? 'Live GitHub Data (Cached)' : data.mode);
      if (window.ClientMetrics) {
        window.ClientMetrics.recordRepoAnalysis(currentRepo.fullName || currentRepo.name);
      }
      showToast(`Successfully analyzed ${currentRepo.fullName || currentRepo.name}`);
      switchTab('repo');
      return;
    } else if (data && data.isRateLimit) {
      showRateLimitUI(data.rateInfo, data.error);
      if (progressBox) progressBox.style.display = 'none';
      return;
    } else if (data && data.error) {
      showToast(data.error);
      if (progressBox) progressBox.style.display = 'none';
      return;
    }
  } catch (err) {
    // Server route unavailable (e.g. static GitHub Pages hosting). Fall back to Client-Side Optimized Direct GitHub fetch.
  }

  // 2. Client-side Direct GitHub Pipeline (GitHub Pages Static Hosting)
  try {
    updateProgress('Connecting to GitHub REST API...', 'Direct browser request...');
    const ghToken = localStorage.getItem('opensource_github_token') || '';
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (ghToken) headers['Authorization'] = `Bearer ${ghToken}`;

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    
    // Inspect actual rate limit headers
    const remHeader = repoRes.headers.get('x-ratelimit-remaining');
    const resetHeader = repoRes.headers.get('x-ratelimit-reset');
    const rateInfo = {
      remaining: remHeader !== null ? parseInt(remHeader, 10) : null,
      reset: resetHeader !== null ? parseInt(resetHeader, 10) : null
    };

    if (repoRes.status === 403 && (rateInfo.remaining === 0 || !repoRes.ok)) {
      showRateLimitUI(rateInfo, 'GitHub API rate limit reached on direct request.');
      return;
    } else if (repoRes.status === 404) {
      showToast(`Repository "${targetSlug}" was not found on GitHub (404).`);
      return;
    } else if (repoRes.status === 401) {
      showToast('GitHub token authentication failed (401). Please check the token in Settings.');
      return;
    } else if (!repoRes.ok) {
      showToast(`GitHub API error: ${repoRes.statusText || repoRes.status}`);
      return;
    }

    const d = await repoRes.json();
    hideRateLimitUI();
    updateProgress('Reading structure & issues...', 'Inspecting default branch and tickets...');

    const defaultBranch = d.default_branch || 'main';

    // Low-budget parallel requests: only contents, issues, and readme (3 calls)
    const [treeRes, issuesRes, readmeRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/contents?ref=${defaultBranch}`, { headers }).catch(() => null),
      fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=10&sort=updated`, { headers }).catch(() => null),
      fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }).catch(() => null)
    ]);

    const structureTree = [];
    if (treeRes && treeRes.ok) {
      const treeData = await treeRes.json();
      if (Array.isArray(treeData)) {
        treeData.forEach(item => {
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
    }

    const issues = [];
    const pullRequests = [];
    if (issuesRes && issuesRes.ok) {
      const issData = await issuesRes.json();
      if (Array.isArray(issData)) {
        issData.forEach(i => {
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
      }
    }

    let readmeText = '';
    if (readmeRes && readmeRes.ok) {
      const rmData = await readmeRes.json();
      if (rmData && rmData.content) {
        try {
          readmeText = decodeURIComponent(escape(atob(rmData.content)));
        } catch (e) {
          readmeText = atob(rmData.content);
        }
      }
    }

    const detectedTech = new Set();
    if (d.language) detectedTech.add(d.language);
    structureTree.forEach(i => {
      const n = i.name.toLowerCase();
      if (n.includes('docker')) detectedTech.add('Docker');
      if (n === 'cargo.toml') detectedTech.add('Rust / Cargo');
      if (n === 'go.mod') detectedTech.add('Go Modules');
      if (n === 'package.json') detectedTech.add('Node.js / npm');
      if (n === 'requirements.txt') detectedTech.add('Python');
      if (n === 'pom.xml') detectedTech.add('Java Maven');
    });

    const dirs = structureTree.filter(s => s.type === 'dir').map(dir => dir.name);

    currentRepo = {
      name: d.name,
      owner: d.owner?.login || owner,
      fullName: d.full_name || targetSlug,
      description: d.description || 'No description provided.',
      homepage: d.homepage,
      html_url: d.html_url,
      visibility: d.visibility || 'public',
      defaultBranch: defaultBranch,
      created_at: d.created_at,
      pushed_at: d.pushed_at,
      stars: d.stargazers_count || 0,
      forks: d.forks_count || 0,
      watchers: d.watchers_count || 0,
      openIssues: d.open_issues_count || 0,
      mainLanguage: d.language || 'Code',
      languages: { [d.language || 'Code']: 100 },
      license: d.license?.name || 'Open Source',
      topics: d.topics || [],
      structureTree,
      techStack: Array.from(detectedTech),
      docAvailability: {
        readme: Boolean(readmeText),
        contributing: structureTree.some(s => /contributing/i.test(s.name)),
        codeOfConduct: structureTree.some(s => /code_of_conduct/i.test(s.name)),
        security: structureTree.some(s => /security/i.test(s.name))
      },
      quickCommands: [
        `git clone ${d.html_url}.git`,
        `cd ${d.name}`
      ],
      readme: readmeText || `# ${d.name}\n\n${d.description || 'No README file available.'}`,
      issues,
      pullRequests,
      aiAnalysis: {
        projectPurpose: d.description || `${d.name} is a software project maintained by ${owner}.`,
        architectureOverview: `Built primarily in ${d.language || 'Code'}${dirs.length > 0 ? ' with core modules in ' + dirs.slice(0, 5).map(dir => '`' + dir + '`').join(', ') : ''}.`,
        beginnerFriendlyAreas: ['Documentation & Typo Corrections', 'Unit tests & edge-case test additions'],
        intermediateAreas: ['Component feature requests', 'API route implementations'],
        advancedAreas: ['Core engine optimizations & concurrency'],
        contributorRoadmap: [
          '1. Fork repository and clone locally',
          '2. Run automated test suites to establish baseline',
          '3. Pick a good-first-issue or documentation task',
          '4. Open pull request with structured reproduction steps'
        ]
      },
      aiSource: 'Client-Side Analysis Engine'
    };

    // Store in client sessionStorage
    try {
      sessionStorage.setItem(clientCacheKey, JSON.stringify(currentRepo));
    } catch (e) {}

    updateRepoUI(currentRepo, 'Live GitHub Client API');
    if (window.ClientMetrics) {
      window.ClientMetrics.recordRepoAnalysis(currentRepo.fullName || currentRepo.name);
    }
    showToast(`Successfully loaded ${currentRepo.fullName}`);
    switchTab('repo');
  } catch (clientErr) {
    showToast('Network error: Unable to contact GitHub API. Please check your internet connection.');
  } finally {
    isAnalysisInProgress = false;
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Analyze Repository';
    if (btnSpinner) btnSpinner.style.display = 'none';
    if (progressBox) progressBox.style.display = 'none';
  }
}

function updateRepoUI(repo, mode) {
  if (!repo) return;

  const fullName = repo.fullName || `${repo.owner}/${repo.name}`;

  // Global badges across sidebar and other views
  const badgeName = document.getElementById('badgeRepoName');
  const badgeMode = document.getElementById('badgeRepoMode');
  const chatRepoName = document.getElementById('chatRepoName');
  const guideRepoName = document.getElementById('guideRepoName');

  if (badgeName) badgeName.textContent = fullName;
  if (badgeMode) badgeMode.textContent = mode || 'Live GitHub Data';
  if (chatRepoName) chatRepoName.textContent = fullName;
  if (guideRepoName) guideRepoName.textContent = fullName;

  // Header Details
  const titleEl = document.getElementById('repoDetailTitle');
  const descEl = document.getElementById('repoDetailDesc');
  const visibilityBadge = document.getElementById('repoVisibilityBadge');
  const metaLinks = document.getElementById('repoMetaLinks');
  const githubLink = document.getElementById('repoGithubLink');
  const lastPushed = document.getElementById('repoLastPushed');
  const defaultBranch = document.getElementById('repoDefaultBranch');

  if (titleEl) titleEl.textContent = fullName;
  if (descEl) descEl.textContent = repo.description || 'No description provided.';
  if (visibilityBadge) {
    visibilityBadge.textContent = repo.visibility || 'public';
    visibilityBadge.style.display = 'inline-block';
  }
  if (metaLinks) metaLinks.style.display = 'flex';
  if (githubLink) githubLink.href = repo.html_url || `https://github.com/${fullName}`;
  if (lastPushed) {
    lastPushed.textContent = repo.pushed_at ? `Pushed: ${new Date(repo.pushed_at).toLocaleDateString()}` : '';
  }
  if (defaultBranch) {
    defaultBranch.textContent = repo.defaultBranch ? `Default Branch: ${repo.defaultBranch}` : '';
  }

  // Real KPI Metrics
  const starsEl = document.getElementById('repoStars');
  const forksEl = document.getElementById('repoForks');
  const watchersEl = document.getElementById('repoWatchers');
  const issuesEl = document.getElementById('repoIssues');
  const langEl = document.getElementById('repoLang');
  const licEl = document.getElementById('repoLicense');

  if (starsEl) starsEl.textContent = (repo.stars || 0).toLocaleString();
  if (forksEl) forksEl.textContent = (repo.forks || 0).toLocaleString();
  if (watchersEl) watchersEl.textContent = (repo.watchers || 0).toLocaleString();
  if (issuesEl) issuesEl.textContent = (repo.openIssues || 0).toLocaleString();
  if (langEl) langEl.textContent = repo.mainLanguage || 'Code';
  if (licEl) licEl.textContent = repo.license || 'Not specified';

  // Insights synchronization
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

  // 1. AI Architecture & Problem Solved
  const aiBody = document.getElementById('repoAiAnalysisBody');
  const ai = repo.aiAnalysis || {};
  if (aiBody) {
    aiBody.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong style="color: var(--text-main); font-size: 0.92rem;">Project Purpose & Problem Solved:</strong>
        <p style="margin: 4px 0 0 0; color: var(--text-secondary); line-height: 1.5;">${escapeHTML(ai.projectPurpose || repo.description || '')}</p>
      </div>
      <div>
        <strong style="color: var(--text-main); font-size: 0.92rem;">Architecture & Core Components:</strong>
        <p style="margin: 4px 0 0 0; color: var(--text-secondary); line-height: 1.5;">${escapeHTML(ai.architectureOverview || '')}</p>
      </div>
    `;
  }

  // Documentation Health Badges
  const doc = repo.docAvailability || {};
  function styleDocBadge(id, label, exists) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = `${label}: ${exists ? '✓ Available' : '✕ Missing'}`;
    el.className = `badge-tag ${exists ? 'low' : 'critical'}`;
  }
  styleDocBadge('badgeDocReadme', 'README.md', doc.readme);
  styleDocBadge('badgeDocContributing', 'CONTRIBUTING.md', doc.contributing);
  styleDocBadge('badgeDocCodeOfConduct', 'CODE_OF_CONDUCT.md', doc.codeOfConduct);
  styleDocBadge('badgeDocSecurity', 'SECURITY.md', doc.security);

  // 2. Real Repository Structure Tree
  const treeContainer = document.getElementById('repoStructureTree');
  const countEl = document.getElementById('repoStructureCount');
  const tree = repo.structureTree || [];
  if (countEl) countEl.textContent = `${tree.length} top-level item${tree.length === 1 ? '' : 's'}`;

  if (treeContainer) {
    if (tree.length === 0) {
      treeContainer.innerHTML = '<span style="color: var(--text-muted);">No tree structure returned.</span>';
    } else {
      treeContainer.innerHTML = tree.map(item => {
        const icon = item.type === 'dir' ? '📁' : '📄';
        return `<div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${icon} ${escapeHTML(item.name)}</span>
          ${item.type === 'file' && item.size ? `<span style="color: var(--text-muted); font-size: 0.72rem;">${(item.size / 1024).toFixed(1)} KB</span>` : ''}
        </div>`;
      }).join('');
    }
  }

  // 3. Detected Technology Stack & Language Breakdown
  const techBadges = document.getElementById('repoTechStackBadges');
  const langBreakdown = document.getElementById('repoLanguageBreakdown');
  const stack = repo.techStack || [];

  if (techBadges) {
    if (stack.length === 0) {
      techBadges.innerHTML = '<span style="font-size: 0.82rem; color: var(--text-muted);">No specific technologies detected.</span>';
    } else {
      techBadges.innerHTML = stack.map(t => `<span class="badge-tag" style="background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.4); color: #818CF8; font-size: 0.78rem;">${escapeHTML(t)}</span>`).join('');
    }
  }

  if (langBreakdown) {
    const langs = repo.languages || {};
    const total = Object.values(langs).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
    if (total > 0) {
      langBreakdown.innerHTML = Object.entries(langs).map(([lang, bytes]) => {
        const pct = ((bytes / total) * 100).toFixed(1);
        return `<span style="display: inline-block; margin-right: 12px;">${escapeHTML(lang)}: <strong>${pct}%</strong></span>`;
      }).join('');
    } else {
      langBreakdown.textContent = repo.mainLanguage || 'Code';
    }
  }

  // 4. Quick Start Commands
  const quickStart = document.getElementById('repoQuickStart');
  if (quickStart) {
    const cmds = repo.quickCommands || [`git clone ${repo.html_url || 'https://github.com/' + fullName}.git`, `cd ${repo.name}`];
    quickStart.textContent = cmds.join('\n');
  }

  // 5. Contributor Difficulty Spectrum (AI Assessment)
  const begEl = document.getElementById('repoBeginnerAreas');
  const intEl = document.getElementById('repoIntermediateAreas');
  const advEl = document.getElementById('repoAdvancedAreas');

  if (begEl) {
    const areas = ai.beginnerFriendlyAreas || ['Documentation corrections & unit test assertions'];
    begEl.innerHTML = areas.map(a => `• ${escapeHTML(a)}`).join('<br>');
  }
  if (intEl) {
    const areas = ai.intermediateAreas || ['Component features & API route handlers'];
    intEl.innerHTML = areas.map(a => `• ${escapeHTML(a)}`).join('<br>');
  }
  if (advEl) {
    const areas = ai.advancedAreas || ['Core reconciler, compiler internals & concurrency boundaries'];
    advEl.innerHTML = areas.map(a => `• ${escapeHTML(a)}`).join('<br>');
  }

  // 6. Contributor Roadmap Steps
  const roadmapEl = document.getElementById('repoRoadmapSteps');
  if (roadmapEl) {
    const steps = ai.contributorRoadmap || [
      'Read README.md and CONTRIBUTING.md',
      'Verify build and test passes locally',
      'Pick a beginner issue',
      'Submit PR with clear reproduction verification'
    ];
    roadmapEl.innerHTML = steps.map(s => `<li style="margin-bottom: 4px;">${escapeHTML(s.replace(/^\d+\.\s*/, ''))}</li>`).join('');
  }

  // 7. Real Open Issues List
  const issuesList = document.getElementById('repoRealIssuesList');
  const issuesCountText = document.getElementById('repoIssuesCountText');
  const issues = repo.issues || [];
  if (issuesCountText) issuesCountText.textContent = `${issues.length} retrieved`;

  if (issuesList) {
    if (issues.length === 0) {
      issuesList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">No open issues retrieved.</div>';
    } else {
      issuesList.innerHTML = issues.map(iss => `
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px 12px; font-size: 0.82rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <a href="${iss.html_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-main); font-weight: 700; text-decoration: none; line-height: 1.35;">
              #${iss.number}: ${escapeHTML(iss.title)}
            </a>
            <span class="badge-tag ${iss.difficulty === 'Beginner' ? 'low' : 'medium'}" style="font-size: 0.68rem; padding: 1px 6px;">
              ${iss.difficulty}
            </span>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 6px; font-size: 0.74rem; color: var(--text-muted);">
            <span>by @${escapeHTML(iss.author)}</span>
            <span>💬 ${iss.comments} comments</span>
            <span>Created: ${new Date(iss.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // 8. Real Pull Requests List
  const pullsList = document.getElementById('repoRealPullsList');
  const pullsCountText = document.getElementById('repoPullsCountText');
  const pulls = repo.pullRequests || [];
  if (pullsCountText) pullsCountText.textContent = `${pulls.length} retrieved`;

  if (pullsList) {
    if (pulls.length === 0) {
      pullsList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">No active pull requests retrieved.</div>';
    } else {
      pullsList.innerHTML = pulls.map(pr => `
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px 12px; font-size: 0.82rem;">
          <a href="${pr.html_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-main); font-weight: 700; text-decoration: none; line-height: 1.35;">
            #${pr.number}: ${escapeHTML(pr.title)}
          </a>
          <div style="display: flex; gap: 10px; margin-top: 6px; font-size: 0.74rem; color: var(--text-muted);">
            <span>by @${escapeHTML(pr.author)}</span>
            <span>Updated: ${new Date(pr.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // 9. Documentation (README Rendered Markdown)
  const readmeBox = document.getElementById('repoReadmeContainer');
  const rawReadmeLink = document.getElementById('repoRawReadmeLink');
  if (rawReadmeLink) {
    rawReadmeLink.href = `${repo.html_url || 'https://github.com/' + fullName}/blob/${repo.defaultBranch || 'main'}/README.md`;
  }
  if (readmeBox) {
    readmeBox.innerHTML = window.marked ? window.marked.parse(repo.readme || '') : `<pre style="white-space: pre-wrap;">${escapeHTML(repo.readme || '')}</pre>`;
  }

  // 10. Populate Issue Triage select dropdown
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
      const scoreLabel = document.getElementById('reviewScoreLabel');
      if (scoreLabel) scoreLabel.textContent = 'Quality Score';
      const listEl = document.getElementById('reviewIssuesList');
      if (listEl) listEl.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 12px 0;">Paste your code on the left and click "Review Code" to generate an authentic senior developer code review.</div>';
      const improved = document.getElementById('reviewImprovedCode');
      if (improved) improved.textContent = '// Corrected and hardened implementation will render here...';
      const breakdown = document.getElementById('reviewBreakdownContainer');
      if (breakdown) breakdown.style.display = 'none';
      const summary = document.getElementById('reviewSummaryContainer');
      if (summary) summary.style.display = 'none';
      const positives = document.getElementById('reviewPositivesGroup');
      if (positives) positives.style.display = 'none';
      const tests = document.getElementById('reviewTestsGroup');
      if (tests) tests.style.display = 'none';
      const countEl = document.getElementById('reviewFindingsCount');
      if (countEl) countEl.textContent = '0 issues';
    });
  }

  if (!btnRun) return;

  if (btnLoadSample && codeInput && langSelect) {
    btnLoadSample.addEventListener('click', () => {
      let lang = langSelect.value;
      if (lang === 'auto') {
        lang = 'python';
        langSelect.value = 'python';
      }
      codeInput.value = SAMPLES[lang] || SAMPLES.python || SAMPLES.javascript;
      if (contextInput) {
        contextInput.value = lang === 'python' ? 'Algorithm correctness & edge-case testing' : 'Security & error boundary review';
      }
    });
  }

  if (btnCopyImproved) {
    btnCopyImproved.addEventListener('click', () => {
      const code = document.getElementById('reviewImprovedCode')?.textContent || '';
      if (!code || code.startsWith('//')) {
        showToast('No refactored code to copy.');
        return;
      }
      navigator.clipboard.writeText(code).then(() => {
        showToast('Improved code copied to clipboard!');
      });
    });
  }

  btnRun.addEventListener('click', async () => {
    const code = codeInput ? codeInput.value.trim() : '';
    if (!code) {
      showToast('Please enter code to review.');
      const issuesContainer = document.getElementById('reviewIssuesList');
      if (issuesContainer) {
        issuesContainer.innerHTML = '<div style="font-size: 0.88rem; color: #EF4444; font-weight: 600; padding: 10px 0;">Please enter code to review.</div>';
      }
      return;
    }

    btnRun.textContent = 'Analyzing Code...';
    btnRun.disabled = true;

    const chosenLang = langSelect ? langSelect.value : 'auto';
    const userContext = contextInput ? contextInput.value.trim() : '';

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: chosenLang,
          code,
          description: userContext
        })
      });

      const data = await res.json();
      if (data && data.success && data.review) {
        displayCodeReviewResult(data.review, data.mode);
        if (window.ClientMetrics) {
          window.ClientMetrics.recordCodeReview(chosenLang !== 'auto' ? chosenLang : (data.review.language || 'Code'), data.review.score);
        }
        showToast(`Code review complete — Quality Score: ${data.review.score}/10`);
        return;
      }
    } catch (e) {
      // Backend unavailable (e.g. GitHub Pages static deployment)
    } finally {
      btnRun.textContent = 'Review Code';
      btnRun.disabled = false;
    }

    // Direct Client-Side Analysis Engine Fallback
    if (window.CodeReviewEngine && window.CodeReviewEngine.analyzeCode) {
      const reviewResult = window.CodeReviewEngine.analyzeCode(code, chosenLang, userContext);
      displayCodeReviewResult(reviewResult, 'Senior Code Review Engine (Client-Side)');
      if (window.ClientMetrics) {
        window.ClientMetrics.recordCodeReview(reviewResult.language || 'Code', reviewResult.score);
      }
      showToast(`Code review complete — Quality Score: ${reviewResult.score}/10`);
    } else if (window.CLIENT_KNOWLEDGE) {
      const fallbackRev = window.CLIENT_KNOWLEDGE.review(code, chosenLang, userContext);
      displayCodeReviewResult(fallbackRev, 'Standard Analysis');
      showToast(`Code review complete — Quality Score: ${fallbackRev.score}/10`);
    }
  });
}

function displayCodeReviewResult(review, mode = 'Senior Engineering Review Pipeline') {
  if (!review) return;

  const scoreEl = document.getElementById('reviewScore');
  const scoreLabel = document.getElementById('reviewScoreLabel');
  const modeEl = document.getElementById('reviewEngineMode');
  const breakdownContainer = document.getElementById('reviewBreakdownContainer');
  const breakdownGrid = document.getElementById('reviewBreakdownGrid');
  const summaryContainer = document.getElementById('reviewSummaryContainer');
  const positivesGroup = document.getElementById('reviewPositivesGroup');
  const positivesList = document.getElementById('reviewPositivesList');
  const issuesContainer = document.getElementById('reviewIssuesList');
  const findingsCount = document.getElementById('reviewFindingsCount');
  const testsGroup = document.getElementById('reviewTestsGroup');
  const testsList = document.getElementById('reviewTestsList');
  const improvedBox = document.getElementById('reviewImprovedCode');

  if (modeEl && mode) modeEl.textContent = mode;

  // 1. Quality Score & Color Coding
  const score = typeof review.score === 'number' ? review.score : 0;
  if (scoreEl) {
    scoreEl.textContent = `${score.toFixed ? score.toFixed(1) : score} / 10`;
    if (score >= 9.0) {
      scoreEl.style.color = '#10B981'; // Emerald
    } else if (score >= 7.5) {
      scoreEl.style.color = '#38BDF8'; // Sky blue
    } else if (score >= 5.5) {
      scoreEl.style.color = '#FBBF24'; // Amber
    } else if (score >= 3.0) {
      scoreEl.style.color = '#F97316'; // Orange
    } else {
      scoreEl.style.color = '#EF4444'; // Red
    }
  }

  if (scoreLabel) {
    if (score >= 9.0) scoreLabel.textContent = 'Excellent Quality';
    else if (score >= 8.0) scoreLabel.textContent = 'Very Good Quality';
    else if (score >= 7.0) scoreLabel.textContent = 'Good Quality';
    else if (score >= 5.0) scoreLabel.textContent = 'Moderate Quality';
    else if (score >= 3.0) scoreLabel.textContent = 'Poor Quality';
    else scoreLabel.textContent = 'Critical Vulnerabilities';
  }

  // 2. Score Breakdown by Category
  const bd = review.breakdown;
  if (breakdownContainer && breakdownGrid && bd) {
    breakdownGrid.innerHTML = '';
    const dims = [
      { key: 'correctness', label: 'Correctness', weight: '30%' },
      { key: 'security', label: 'Security', weight: '20%' },
      { key: 'performance', label: 'Performance', weight: '15%' },
      { key: 'maintainability', label: 'Maintainability', weight: '15%' },
      { key: 'readability', label: 'Readability', weight: '10%' },
      { key: 'errorHandling', label: 'Error Handling', weight: '10%' }
    ];

    dims.forEach(d => {
      const val = typeof bd[d.key] === 'number' ? bd[d.key] : 10;
      const cell = document.createElement('div');
      cell.style.background = 'rgba(30, 41, 59, 0.7)';
      cell.style.borderRadius = '6px';
      cell.style.padding = '6px 10px';
      cell.style.border = '1px solid rgba(255, 255, 255, 0.05)';
      cell.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-secondary);">
          <span>${d.label}</span>
          <span style="font-size: 0.65rem; color: var(--text-muted);">${d.weight}</span>
        </div>
        <div style="font-size: 0.92rem; font-weight: 700; color: ${val >= 8 ? '#34D399' : val >= 5 ? '#FBBF24' : '#EF4444'}; margin-top: 2px;">
          ${val}/10
        </div>
      `;
      breakdownGrid.appendChild(cell);
    });
    breakdownContainer.style.display = 'block';
  }

  // 3. Executive Summary
  if (summaryContainer && review.summary) {
    summaryContainer.textContent = review.summary;
    summaryContainer.style.display = 'block';
  }

  // 4. Positive Aspects
  const positives = review.positiveAspects || [];
  if (positivesGroup && positivesList) {
    if (positives.length > 0) {
      positivesList.innerHTML = positives.map(p => `<li style="margin-bottom: 3px;">${escapeHTML(p)}</li>`).join('');
      positivesGroup.style.display = 'block';
    } else {
      positivesGroup.style.display = 'none';
    }
  }

  // 5. Problems / Findings List
  const problems = review.problemsFound || review.issues || [];
  if (findingsCount) {
    findingsCount.textContent = `${problems.length} issue${problems.length === 1 ? '' : 's'}`;
  }

  if (issuesContainer) {
    issuesContainer.innerHTML = '';
    if (problems.length === 0) {
      issuesContainer.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 12px 14px; color: #10B981; font-size: 0.85rem;">
          <strong>No significant problems detected.</strong> The submitted code conforms to established conventions for its language with no critical bugs, crashes, or security vulnerabilities identified.
        </div>
      `;
    } else {
      problems.forEach((p, idx) => {
        const item = document.createElement('div');
        const sev = (p.severity || 'Medium').toLowerCase();
        let sevBg = 'rgba(239, 68, 68, 0.12)';
        let sevBorder = 'rgba(239, 68, 68, 0.4)';
        let sevColor = '#EF4444';

        if (sev === 'critical') {
          sevBg = 'rgba(220, 38, 38, 0.2)';
          sevBorder = '#DC2626';
          sevColor = '#F87171';
        } else if (sev === 'high') {
          sevBg = 'rgba(249, 115, 22, 0.15)';
          sevBorder = 'rgba(249, 115, 22, 0.5)';
          sevColor = '#FB923C';
        } else if (sev === 'medium') {
          sevBg = 'rgba(245, 158, 11, 0.12)';
          sevBorder = 'rgba(245, 158, 11, 0.4)';
          sevColor = '#FBBF24';
        } else if (sev === 'low' || sev === 'info') {
          sevBg = 'rgba(99, 102, 241, 0.1)';
          sevBorder = 'rgba(99, 102, 241, 0.35)';
          sevColor = '#818CF8';
        }

        item.style.background = sevBg;
        item.style.border = `1px solid ${sevBorder}`;
        item.style.borderRadius = '8px';
        item.style.padding = '12px 14px';
        item.style.fontSize = '0.82rem';
        item.style.lineHeight = '1.45';

        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: ${sevColor}; color: #0F172A;">
                ${p.severity || 'Medium'}
              </span>
              <span style="font-weight: 700; color: var(--text-main);">${escapeHTML(p.category || 'General')}</span>
            </div>
            ${p.location ? `<span style="font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${escapeHTML(p.location)}</span>` : ''}
          </div>

          <div style="margin-bottom: 6px; color: var(--text-main);">
            <strong>Problem:</strong> ${escapeHTML(p.problem || p.explanation || '')}
          </div>

          ${p.whyItMatters ? `
            <div style="margin-bottom: 6px; color: var(--text-secondary); font-size: 0.78rem;">
              <strong>Why it matters:</strong> ${escapeHTML(p.whyItMatters)}
            </div>
          ` : ''}

          ${p.howToImprove ? `
            <div style="margin-bottom: 4px; color: #34D399; font-size: 0.78rem;">
              <strong>How to improve:</strong> ${escapeHTML(p.howToImprove)}
            </div>
          ` : ''}

          ${p.exampleFix ? `
            <div style="margin-top: 8px;">
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px;">Example Correction:</div>
              <pre class="snippet font-mono" style="margin: 0; padding: 6px 10px; font-size: 0.75rem; background: rgba(0,0,0,0.4); border-radius: 4px; overflow-x: auto;"><code>${escapeHTML(p.exampleFix)}</code></pre>
            </div>
          ` : ''}
        `;

        issuesContainer.appendChild(item);
      });
    }
  }

  // 6. Suggested Verification Tests
  const tests = review.suggestedTests || [];
  if (testsGroup && testsList) {
    if (tests.length > 0) {
      testsList.innerHTML = '';
      tests.forEach(t => {
        const row = document.createElement('div');
        row.style.background = 'rgba(15, 23, 42, 0.6)';
        row.style.border = '1px solid var(--border-color)';
        row.style.borderRadius = '6px';
        row.style.padding = '8px 10px';
        row.style.fontSize = '0.78rem';
        row.innerHTML = `
          <div style="font-weight: 700; color: #93C5FD; margin-bottom: 2px;">${escapeHTML(t.name || 'Test Case')}</div>
          <div style="color: var(--text-secondary); margin-bottom: 2px;"><strong>Input:</strong> <code>${escapeHTML(t.input || '')}</code> &nbsp;|&nbsp; <strong>Expected:</strong> <code>${escapeHTML(t.expected || '')}</code></div>
          ${t.notes ? `<div style="color: var(--text-muted); font-size: 0.72rem;">${escapeHTML(t.notes)}</div>` : ''}
        `;
        testsList.appendChild(row);
      });
      testsGroup.style.display = 'block';
    } else {
      testsGroup.style.display = 'none';
    }
  }

  // 7. Hardened Refactored Code
  if (improvedBox) {
    improvedBox.textContent = review.improvedCode || '// No code adjustments required.';
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
