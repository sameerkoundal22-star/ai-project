// OpenSource AI - Environment & Runtime Configuration Helper
// This file safely loads Supabase Project URL and Anon Public Key from:
// 1. Process environment variables (Node server: SUPABASE_URL, SUPABASE_ANON_KEY)
// 2. Pre-injected window.__ENV__
// 3. Application config module

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SUPABASE_CONFIG = factory();
  }
})(typeof window !== 'undefined' ? window : global, function () {
  let envUrl = '';
  let envAnonKey = '';

  if (typeof process !== 'undefined' && process.env) {
    envUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    envAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  }

  if (typeof window !== 'undefined') {
    const winEnv = window.__ENV__ || {};
    envUrl = envUrl || winEnv.SUPABASE_URL || window.ENV_SUPABASE_URL || '';
    envAnonKey = envAnonKey || winEnv.SUPABASE_ANON_KEY || window.ENV_SUPABASE_ANON_KEY || '';
  }

  return {
    url: envUrl,
    anonKey: envAnonKey,
    isConfigured: function () {
      return Boolean(this.url && this.anonKey);
    }
  };
});
