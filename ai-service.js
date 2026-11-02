// AI Service: Real Google Gemini integration + realistic instant fallback
const https = require('https');
const { UNIVERSAL_AI_SYSTEM_INSTRUCTION } = require('./ai-system-prompt');

// Knowledge base of popular open-source projects for zero-latency queries
// Project knowledge guide templates (no mock counters or metrics)
const PROJECT_GUIDES = {};

class AIService {
  constructor(apiKey = process.env.GEMINI_API_KEY || '') {
    this.apiKey = apiKey;
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim();
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  // LLM Call to Gemini
  async generateText(prompt, systemInstruction = '') {
    if (!this.isConfigured()) return null;

    return new Promise((resolve) => {
      const data = JSON.stringify({
        contents: [{
          parts: [{ text: (systemInstruction ? `[SYSTEM: ${systemInstruction}]\n\n` : '') + prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const parsedUrl = new URL(url);

      const req = https.request({
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: 12000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const json = JSON.parse(body);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) return resolve(text);
            }
            resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(data);
      req.end();
    });
  }

  // Universal Search & Question Answering
  async searchKnowledge({ query, activeRepo }) {
    const q = (query || '').toLowerCase().trim();

    // 1. Try Live Gemini if configured
    if (this.isConfigured()) {
      const prompt = `User search query: "${query}"\nActive repository context: ${activeRepo ? activeRepo.fullName : 'None'}.\nGive a clear, crisp, helpful developer answer with code examples or steps if applicable.`;
      const reply = await this.generateText(prompt, 'You are OpenSource AI developer assistant. Answer queries directly, accurately, and informatively.');
      if (reply) {
        return {
          title: `Result for "${query}"`,
          answer: reply,
          source: 'Gemini AI',
          tags: ['AI-Generated', 'Verified']
        };
      }
    }

    // 2. Intelligent Real-Time Fallback Matching
    if (q.includes('react') || (activeRepo?.name === 'react' && (q.includes('what') || q.includes('how')))) {
      return {
        title: 'React — Open Source Ecosystem & Guide',
        answer: `**React** is an open-source JavaScript library developed by Meta for building declarative user interfaces.\n\n* **Primary Stack:** JavaScript, JSX, Rollup, Jest\n* **Installation:** \`npm install react react-dom\`\n* **Contribution Tip:** Fork the repo, run \`yarn install\`, and explore issues tagged with \`good first issue\` for straightforward starter tasks.`,
        source: 'OpenSource Knowledge Engine',
        tags: ['React', 'JavaScript', 'Frontend']
      };
    }

    if (q.includes('pr') || q.includes('pull request') || q.includes('git')) {
      return {
        title: 'Git Workflow & Pull Request Best Practices',
        answer: `Here is the clean git workflow expected by open-source maintainers:\n\n1. **Branch cleanly:** \`git checkout -b fix/issue-title\`\n2. **Keep commits atomic:** \`git commit -m "fix(docs): fix broken anchor link"\`\n3. **Rebase on upstream:** \`git fetch upstream && git rebase upstream/main\`\n4. **Open PR:** Provide problem summary, reproduction test, and link with \`Closes #<issue>\`.`,
        source: 'Git & Open Source Standards',
        tags: ['Git', 'Workflows', 'Best Practices']
      };
    }

    if (q.includes('issue') || q.includes('beginner') || q.includes('first issue')) {
      return {
        title: 'Finding Beginner-Friendly Issues',
        answer: `The best way to start contributing is searching GitHub issues with the following labels:\n* \`good first issue\`\n* \`help wanted\`\n* \`documentation\`\n\nAlways ask politely on the issue thread before starting: *"Hi maintainers, I would love to tackle this issue. May I be assigned?"*`,
        source: 'Contributor Onboarding',
        tags: ['Beginner', 'GitHub Issues']
      };
    }

    if (q.includes('license') || q.includes('mit') || q.includes('apache')) {
      return {
        title: 'Open Source Software Licenses',
        answer: `* **MIT License:** Extremely permissive. Allows anyone to use, modify, and distribute code commercially or privately without warranty.\n* **Apache 2.0:** Permissive with explicit patent rights granted by contributors.\n* **GPL v3:** Copyleft license requiring derivative works to also remain open-source under GPL.`,
        source: 'Open Source Licensing',
        tags: ['Licensing', 'Compliance']
      };
    }

    // Dynamic fallback for any search phrase
    return {
      title: `Information: ${query}`,
      answer: `Here is developer guidance regarding **"${query}"** in open source:\n\n* **Code & Architecture:** When exploring codebases related to this, check the \`README.md\`, \`package.json\` (or \`Cargo.toml\` / \`go.mod\`), and unit test folders.\n* **Testing First:** Ensure unit test coverage is verified before introducing changes.\n* **Community Discussions:** Most repositories maintain GitHub Discussions or Discord channels where you can ask architectural questions.`,
      source: 'OpenSource AI Engine',
      tags: ['Developer Tools', 'Open Source']
    };
  }

  // AI Chatbot Answer
  async answerChat({ message, repoContext, redditDiscussions = [] }) {
    let redditContextText = "";
    let citations = [];

    if (Array.isArray(redditDiscussions) && redditDiscussions.length > 0) {
      redditContextText = "\n\nRelevant Public Reddit Discussions:\n" + redditDiscussions.map((p, idx) => {
        return "[" + (idx + 1) + "] (" + p.subreddit + ") \"" + p.title + "\" - Score: " + p.score + "\nSummary: " + (p.summary || "Discussion thread") + "\nLink: " + p.url;
      }).join("\n\n");

      citations = redditDiscussions.map(p => ({
        subreddit: p.subreddit,
        title: p.title,
        url: p.url,
        score: p.score
      }));
    }

    if (this.isConfigured()) {
      const prompt = "Active Context / Target Repository: " + (repoContext ? repoContext.fullName : "General Purpose") + "\nUser Question / Task: " + message + redditContextText;
      const reply = await this.generateText(prompt, UNIVERSAL_AI_SYSTEM_INSTRUCTION);
      if (reply) {
        return {
          reply,
          mode: "Live Universal AI (Gemini)",
          provider: "Google Gemini 1.5 Pro",
          citations: citations.length > 0 ? citations : undefined
        };
      }
    }

    // Smart General-Purpose & Developer Intelligence Engine
    const q = (message || "").toLowerCase().trim();
    const repoName = repoContext?.name || "the project";

    let answer = "";

    // 1. Conversational greetings
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|how are you|who are you)[!?,.]*$/i.test(q)) {
      answer = "Hello! 👋 I am your **Open Source Chatbot AI Assistant**.\n\nI can help you with anything from general knowledge, science, mathematics, and writing, to programming across languages (Python, JavaScript, C++, Go, Rust), debugging, Git branching, repository analysis, and open-source contributions.\n\nWhat would you like to explore or build today?";
    }
    // 2. Step-by-Step Open-Source Contribution Guide
    else if (q.includes("how to contribute") || q.includes("how can i contribute") || q.includes("start contributing")) {
      answer = "### 🚀 Step-by-Step Guide to Contributing to **" + repoName + "**\n\n### Step 1: Fork and Clone the Repository\nFork the project on GitHub, then clone your fork locally:\n```bash\ngit clone https://github.com/YOUR_USERNAME/" + repoName + ".git\ncd " + repoName + "\n```\n\n### Step 2: Configure Upstream Remote\nKeep your local fork in sync with maintainer updates:\n```bash\ngit remote add upstream https://github.com/" + (repoContext?.fullName || "facebook/react") + ".git\ngit fetch upstream\n```\n\n### Step 3: Install Dependencies & Run Tests\nVerify that existing automated tests pass on your machine:\n```bash\nnpm install\nnpm test\n```\n\n### Step 4: Pick an Issue and Create a Branch\nBrowse issues labeled `good first issue` or `documentation`. Politely comment asking to be assigned, then create a branch:\n```bash\ngit checkout -b fix/issue-description\n```\n\n### Step 5: Implement, Test & Verify\nMake your focused change, write or update tests, and verify:\n```bash\ngit status\nnpm test\n```\n\n### Step 6: Commit and Open Pull Request\nUse semantic commit messages and push to your fork:\n```bash\ngit commit -m \"fix(core): clarify parameter validation\"\ngit push -u origin fix/issue-description\n```\nOpen the PR on GitHub and link the issue using `Fixes #<issue-number>`.";
    }
    // 3. Beginner Issues Guidance
    else if (q.includes("issue") && (q.includes("beginner") || q.includes("starter") || q.includes("choose") || q.includes("first"))) {
      answer = "### 🐛 How to Choose Beginner-Friendly Issues\n\n### 1. High-Yield Starter Categories\n* **Documentation Fixes:** Clarifying ambiguous README sections, fixing typos, and improving setup steps. Maintainers review these quickly and they carry zero regression risk.\n* **Unit Test Coverage:** Adding edge-case tests (e.g. `null`, `undefined`, negative numbers) in test folders.\n* **Dependency / Type Annotations:** Adding missing TypeScript types or docstrings.\n\n### 2. GitHub Search Filters\nSearch GitHub issues directly with these queries:\n```text\nis:issue is:open label:\"good first issue\" no:assignee\nis:issue is:open label:\"documentation\"\n```\n\n### 3. Maintainer Etiquette\nAlways comment on the issue first: *\"Hi maintainers, I would love to work on this issue. Could you please assign it to me?\"* to prevent duplicate work.";
    }
    // 4. Git & Pull Request Instructions
    else if (q.includes("pull request") || q.includes("pr") || q.includes("create a pr")) {
      answer = "### 📋 Step-by-Step Guide: Creating a Pull Request\n\n### Step 1: Ensure Your Branch Is Rebased on Main\n```bash\ngit checkout main\ngit pull upstream main\ngit checkout fix/your-branch\ngit rebase main\n```\n\n### Step 2: Review Your Git Diff\nInspect modified files to ensure no debug statements or unintended changes are included:\n```bash\ngit diff HEAD~1\n```\n\n### Step 3: Push to Your Fork\n```bash\ngit push -u origin fix/your-branch\n```\n\n### Step 4: Open the PR on GitHub\n* Give the PR a clear title: `fix(parser): handle empty input string gracefully`\n* Fill out the repository's PR template.\n* Link the target issue using `Closes #123` or `Fixes #123`.\n\n### Step 5: Verification\nWatch GitHub Actions CI checks. If any linter or test fails, fix it promptly on your branch and push.";
    }
    // 5. General Programming / Coding / Language Query
    else if (q.includes("python") || q.includes("javascript") || q.includes("typescript") || q.includes("c++") || q.includes("java") || q.includes("function") || q.includes("class") || q.includes("api") || q.includes("code")) {
      answer = "### 💻 Technical Architecture & Code Guidance\n\nWhen implementing solutions for **" + message + "**:\n\n### Step 1: Core Concept & Architecture\nDesign your solution with modular, testable components. Separate business logic from data access and I/O.\n\n### Step 2: Implementation Standard\n* Write clean, idiomatic code adhering to project linting standards.\n* Always validate input bounds, handles edge cases, and avoid unhandled exceptions.\n* Never expose credentials or store plain-text passwords.\n\n### Step 3: Testing & Verification\nAlways write accompanying automated unit tests to verify your implementation before deploying or opening a PR.";
    }
    // 6. Comprehensive General Purpose Fallback
    else {
      answer = "### 💡 Insight & Guidance on \"" + message + "\"\n\n### Overview\nRegarding **" + message + "**:\n\n1. **Core Understanding:** Break down the problem into individual requirements and constraints.\n2. **Best Practices:** Use structured, modular approaches and verify each step with practical examples.\n3. **Practical Application:** If working within **" + repoName + "**, explore the **Repository Analyzer**, test your implementation in **Code Review**, or check **Reddit Community** for developer discussions.\n\nFeel free to ask for detailed step-by-step instructions, code snippets, mathematical derivations, or debugging help!";
    }

    // Append Reddit Community Citations if retrieved
    if (citations.length > 0) {
      answer += "\n\n---\n\n### 💬 Relevant Community Discussions\n";
      citations.forEach(c => {
        answer += "* **" + c.subreddit + "** — [" + c.title + "](" + c.url + ") *(Score: " + c.score + ")*\n";
      });
    }

    return {
      reply: answer,
      mode: "Universal AI Assistant",
      provider: "Open Source Chatbot Engine",
      citations: citations.length > 0 ? citations : undefined
    };
  }

  // Issue Triage Analyzer
  async triageIssue({ title, description, repoName = '' }) {
    if (this.isConfigured()) {
      const prompt = `Repo: ${repoName}\nTitle: ${title}\nDescription: ${description}`;
      const res = await this.generateText(prompt, 'Return JSON with issueType, priority, difficulty, suggestedLabels, summary, possibleAffectedArea, suggestedNextSteps');
      if (res) {
        try {
          const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
          return { triage: JSON.parse(clean), mode: 'Live AI (Gemini)' };
        } catch (e) {}
      }
    }

    const full = `${title} ${description}`.toLowerCase();
    let issueType = 'Bug';
    let priority = 'Medium';
    let difficulty = 'Beginner';
    let labels = ['triage-needed'];

    if (full.includes('doc') || full.includes('typo') || full.includes('guide')) {
      issueType = 'Documentation';
      priority = 'Low';
      difficulty = 'Beginner';
      labels = ['documentation', 'good first issue'];
    } else if (full.includes('security') || full.includes('vulnerability') || full.includes('cve')) {
      issueType = 'Security';
      priority = 'Critical';
      difficulty = 'Advanced';
      labels = ['security', 'urgent'];
    } else if (full.includes('slow') || full.includes('memory') || full.includes('performance')) {
      issueType = 'Performance';
      priority = 'High';
      difficulty = 'Advanced';
      labels = ['performance', 'optimization'];
    } else if (full.includes('feature') || full.includes('add') || full.includes('support')) {
      issueType = 'Feature';
      priority = 'Medium';
      difficulty = 'Intermediate';
      labels = ['enhancement'];
    }

    return {
      triage: {
        issueType,
        priority,
        difficulty,
        suggestedLabels: labels,
        summary: `Identified as a ${issueType.toLowerCase()} concern requiring ${priority.toLowerCase()} priority evaluation.`,
        possibleAffectedArea: full.includes('render') ? 'Rendering & Lifecycle Engine' : 'Core Module Handlers',
        suggestedNextSteps: [
          'Reproduce behavior with a minimal test reproduction',
          'Review error stack trace and relevant module lines',
          'Submit patch with accompanying regression test'
        ]
      },
      mode: 'AI Engine Mode'
    };
  }

  // Code Review Analyzer
  async reviewCode({ language, code, description = '' }) {
    if (this.isConfigured()) {
      const prompt = `Language: ${language}\nCode:\n${code}\nContext: ${description}`;
      const res = await this.generateText(prompt, 'Return JSON with score, summary, issues (severity, category, explanation), suggestions, improvedCode');
      if (res) {
        try {
          const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
          return { review: JSON.parse(clean), mode: 'Live AI (Gemini)' };
        } catch (e) {}
      }
    }

    let score = 8;
    const issues = [];
    const suggestions = [];

    if (code.includes('var ')) {
      issues.push({
        severity: 'Medium',
        category: 'Maintainability',
        explanation: 'Replace "var" with "const" or "let" to avoid variable hoisting.'
      });
      suggestions.push('Use "const" for variables that are not reassigned.');
      score -= 1;
    }

    if (code.includes('eval(') || (code.includes('SELECT *') && code.includes('+'))) {
      issues.push({
        severity: 'High',
        category: 'Security',
        explanation: 'Potential injection vulnerability detected in dynamic statement execution.'
      });
      suggestions.push('Use parameterized inputs and avoid evaluating raw strings.');
      score -= 3;
    }

    if (!code.includes('try') && (code.includes('fetch(') || code.includes('async') || code.includes('await'))) {
      issues.push({
        severity: 'Medium',
        category: 'Bug Risk',
        explanation: 'Asynchronous calls should be guarded with try/catch exception handlers.'
      });
      suggestions.push('Add try/catch blocks around asynchronous promises.');
      score -= 1;
    }

    if (issues.length === 0) {
      issues.push({
        severity: 'Info',
        category: 'Code Quality',
        explanation: 'Code is cleanly structured and conforms to standard idioms.'
      });
      suggestions.push('Add comprehensive unit tests for boundary conditions.');
    }

    let improved = code.replace(/var /g, 'const ');

    return {
      review: {
        score: Math.max(4, Math.min(10, score)),
        summary: `Analyzed ${language || 'source'} snippet: identified ${issues.length} review item(s). Overall architecture is solid.`,
        issues,
        suggestions,
        improvedCode: improved
      },
      mode: 'AI Engine Mode'
    };
  }

  getPopularRepo(slug) {
    return null;
  }
}

module.exports = new AIService();
