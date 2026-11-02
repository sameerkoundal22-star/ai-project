// Activity & Metrics Tracking Service
// Strictly records real application operations: repository analyses, issue triages, code reviews, and questions asked.
// Never invents or fabricates numbers.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'metrics.json');

class MetricsService {
  constructor() {
    this.store = {
      repositoriesAnalyzed: [], // array of unique repo slugs/names
      issuesTriaged: [],       // array of triaged issue records
      codeReviews: [],         // array of code review records
      questionsAsked: 0,       // count of actual user chat queries
      contributionsGuided: 0,  // count of guided contributions / roadmap step completions
      activities: []           // chronological activity log
    };
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.store = {
          repositoriesAnalyzed: Array.isArray(parsed.repositoriesAnalyzed) ? parsed.repositoriesAnalyzed : [],
          issuesTriaged: Array.isArray(parsed.issuesTriaged) ? parsed.issuesTriaged : [],
          codeReviews: Array.isArray(parsed.codeReviews) ? parsed.codeReviews : [],
          questionsAsked: typeof parsed.questionsAsked === 'number' ? parsed.questionsAsked : 0,
          contributionsGuided: typeof parsed.contributionsGuided === 'number' ? parsed.contributionsGuided : 0,
          activities: Array.isArray(parsed.activities) ? parsed.activities : []
        };
      } else {
        this.persist();
      }
    } catch (err) {
      console.warn('MetricsService init warning:', err.message);
    }
  }

  persist() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.store, null, 2), 'utf8');
    } catch (err) {
      console.warn('MetricsService persist warning:', err.message);
    }
  }

  addActivity(type, title, description, meta = {}) {
    const entry = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type,
      title,
      description,
      timestamp: new Date().toISOString(),
      meta
    };
    this.store.activities.unshift(entry);
    if (this.store.activities.length > 50) {
      this.store.activities = this.store.activities.slice(0, 50);
    }
    return entry;
  }

  recordRepoAnalysis(fullName) {
    if (!fullName) return;
    const clean = fullName.trim().toLowerCase();
    if (!this.store.repositoriesAnalyzed.includes(clean)) {
      this.store.repositoriesAnalyzed.push(clean);
    }
    this.addActivity('repo_analysis', `Analyzed repository ${fullName}`, 'Verified live repository metadata, stars, and open issues.', { repo: fullName });
    this.persist();
  }

  recordIssueTriage(triageData) {
    const record = {
      id: 'triage_' + Date.now(),
      title: triageData.title || 'Issue Triage',
      category: triageData.category || 'General',
      severity: triageData.severity || 'Medium',
      repoName: triageData.repoName || 'Workspace',
      timestamp: new Date().toISOString()
    };
    this.store.issuesTriaged.unshift(record);
    this.addActivity('issue_triage', `Triaged issue: "${record.title.slice(0, 45)}"`, `Assigned category ${record.category} and severity ${record.severity}.`, record);
    this.persist();
  }

  recordCodeReview(reviewData) {
    const record = {
      id: 'rev_' + Date.now(),
      language: reviewData.language || 'Code',
      score: reviewData.score || 0,
      timestamp: new Date().toISOString()
    };
    this.store.codeReviews.unshift(record);
    this.addActivity('code_review', `Completed ${record.language} code review`, `Safety and quality audit performed with score ${record.score}/10.`, record);
    this.persist();
  }

  recordQuestionAsked(userMessage = '') {
    this.store.questionsAsked += 1;
    this.addActivity('chat_question', 'User consultation with AI Mentor', userMessage.slice(0, 60) || 'Asked assistant for guidance.');
    this.persist();
  }

  recordContributionGuided(stepName = '') {
    this.store.contributionsGuided += 1;
    this.addActivity('contribution_step', 'Contributor roadmap progress', stepName ? `Completed step: ${stepName}` : 'Guided open-source contribution milestone.');
    this.persist();
  }

  getMetrics() {
    return {
      repoCount: this.store.repositoriesAnalyzed.length,
      triageCount: this.store.issuesTriaged.length,
      reviewCount: this.store.codeReviews.length,
      questionsCount: this.store.questionsAsked,
      contributionsCount: this.store.contributionsGuided,
      recentActivities: this.store.activities.slice(0, 10)
    };
  }
}

module.exports = new MetricsService();
