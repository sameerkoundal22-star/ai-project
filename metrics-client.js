// Real Data Activity & Metrics Tracker for Client Side
// Synchronizes with backend /api/metrics and maintains persistent fallback in localStorage

const ClientMetrics = {
  getStore() {
    try {
      const stored = localStorage.getItem('opensource_metrics_store');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return {
      repoCount: 0,
      triageCount: 0,
      reviewCount: 0,
      questionsCount: 0,
      contributionsCount: 0,
      recentActivities: []
    };
  },

  saveStore(store) {
    try {
      localStorage.setItem('opensource_metrics_store', JSON.stringify(store));
    } catch (e) {}
  },

  addActivity(type, title, description) {
    const store = this.getStore();
    const entry = {
      id: 'act_' + Date.now(),
      type,
      title,
      description,
      timestamp: new Date().toISOString()
    };
    store.recentActivities.unshift(entry);
    if (store.recentActivities.length > 20) {
      store.recentActivities = store.recentActivities.slice(0, 20);
    }
    this.saveStore(store);
    return entry;
  },

  recordRepoAnalysis(fullName) {
    const store = this.getStore();
    store.repoCount = (store.repoCount || 0) + 1;
    this.saveStore(store);
    this.addActivity('repo_analysis', `Analyzed repository ${fullName}`, 'Verified live GitHub statistics and open issues.');
    this.render();
  },

  recordTriage(title, repoName) {
    const store = this.getStore();
    store.triageCount = (store.triageCount || 0) + 1;
    this.saveStore(store);
    this.addActivity('issue_triage', `Triaged issue: "${(title || '').slice(0, 40)}"`, `Classified priority for ${repoName || 'workspace'}.`);
    this.render();
  },

  recordCodeReview(lang, score) {
    const store = this.getStore();
    store.reviewCount = (store.reviewCount || 0) + 1;
    this.saveStore(store);
    this.addActivity('code_review', `Completed ${lang} code review`, `Safety and refactoring score: ${score}/10.`);
    this.render();
  },

  recordQuestion(query) {
    const store = this.getStore();
    store.questionsCount = (store.questionsCount || 0) + 1;
    this.saveStore(store);
    this.addActivity('chat_question', 'Consulted AI Assistant', (query || '').slice(0, 50));
    this.render();
  },

  recordRoadmapStep(stepTitle) {
    const store = this.getStore();
    store.contributionsCount = (store.contributionsCount || 0) + 1;
    this.saveStore(store);
    this.addActivity('roadmap_step', 'Contributor milestone completed', stepTitle || 'Advanced contributor workflow.');
    this.render();
  },

  async syncWithServer() {
    // When running statically on GitHub Pages, do not call dead /api/metrics endpoint
    const isStatic = typeof window !== 'undefined' && (
      window.location.hostname.endsWith('github.io') ||
      window.location.protocol === 'file:'
    );
    if (isStatic) {
      this.render();
      return;
    }

    try {
      if (typeof safeApiFetch === 'function') {
        const res = await safeApiFetch('/api/metrics');
        if (res.ok && res.data && res.data.success && res.data.data) {
          this.saveStore(res.data.data);
          this.render();
          return;
        }
      } else {
        const res = await fetch('/api/metrics');
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data) {
            this.saveStore(json.data);
            this.render();
            return;
          }
        }
      }
    } catch (e) {
      // Offline fallback
    }
    this.render();
  },

  render() {
    const store = this.getStore();
    
    // Update dashboard counters
    const repoEl = document.getElementById('statRepoCount');
    const triageEl = document.getElementById('statTriageCount');
    const reviewEl = document.getElementById('statReviewsCount');
    const questionsEl = document.getElementById('statQuestionsCount');
    const contribEl = document.getElementById('statContributionsCount');

    if (repoEl) repoEl.textContent = (store.repoCount || 0).toLocaleString();
    if (triageEl) triageEl.textContent = (store.triageCount || 0).toLocaleString();
    if (reviewEl) reviewEl.textContent = (store.reviewCount || 0).toLocaleString();
    if (questionsEl) questionsEl.textContent = (store.questionsCount || 0).toLocaleString();
    if (contribEl) contribEl.textContent = (store.contributionsCount || 0).toLocaleString();

    // Render Recent Real Activity List
    const listEl = document.getElementById('realActivityList');
    if (listEl) {
      if (!store.recentActivities || store.recentActivities.length === 0) {
        listEl.innerHTML = `
          <div style="padding: 12px; background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: 6px; color: var(--text-tertiary); font-size: 0.85rem; text-align: center;">
            No activity yet. Analyze a repository, triage an issue, or review code to view real events.
          </div>
        `;
      } else {
        listEl.innerHTML = store.recentActivities.map(act => {
          const time = act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          let icon = '⚡';
          if (act.type === 'repo_analysis') icon = '📊';
          if (act.type === 'issue_triage') icon = '🐞';
          if (act.type === 'code_review') icon = '🛡️';
          if (act.type === 'chat_question') icon = '💬';
          if (act.type === 'roadmap_step') icon = '🗺️';

          return `
            <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 10px 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="font-size: 1.1rem; line-height: 1;">${icon}</span>
                <div>
                  <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">${act.title}</div>
                  <div style="color: var(--text-secondary); font-size: 0.8rem;">${act.description || ''}</div>
                </div>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-tertiary); white-space: nowrap; margin-left: 12px;">${time}</span>
            </div>
          `;
        }).join('');
      }
    }
  }
};

window.ClientMetrics = ClientMetrics;
