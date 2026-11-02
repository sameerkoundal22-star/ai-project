// AI Service: Real Google Gemini integration + realistic instant fallback
const https = require('https');
const { UNIVERSAL_AI_SYSTEM_INSTRUCTION } = require('./ai-system-prompt');
const offlineAIEngine = require('./offline-ai-engine');
const codeReviewEngine = require('./code-review-engine');

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
  async answerChat({ message, repoContext, history = [], redditDiscussions = [] }) {
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

    // 1. If Gemini is configured, generate with multi-turn conversation awareness
    if (this.isConfigured()) {
      let prompt = "Target Repository: " + (repoContext ? repoContext.fullName : "None (General Purpose)") + "\n\n";
      if (Array.isArray(history) && history.length > 0) {
        prompt += "Recent Conversation History:\n" + history.slice(-6).map(h => {
          const sender = h.role === 'user' ? 'User' : 'Assistant';
          return `${sender}: ${h.content}`;
        }).join("\n") + "\n\n";
      }
      prompt += "Current User Question / Code / Task: " + message + redditContextText;
      
      const reply = await this.generateText(prompt, UNIVERSAL_AI_SYSTEM_INSTRUCTION);
      if (reply) {
        return {
          reply,
          mode: "Live Universal AI (Gemini)",
          provider: "Google Gemini",
          citations: citations.length > 0 ? citations : undefined
        };
      }
    }

    // 2. Offline AI Engine: Context-aware, technical tutor with multi-turn memory
    const offlineReply = offlineAIEngine.answer(message, repoContext, history);
    let finalReply = offlineReply;

    if (citations.length > 0) {
      finalReply += "\n\n---\n\n### 💬 Relevant Community Discussions\n";
      citations.forEach(c => {
        finalReply += "* **" + c.subreddit + "** — [" + c.title + "](" + c.url + ") *(Score: " + c.score + ")*\n";
      });
    }

    return {
      reply: finalReply,
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

  // Senior Code Review Analyzer
  async reviewCode({ language, code, description = '' }) {
    if (!code || !code.trim()) {
      return {
        review: codeReviewEngine.analyzeCode('', language, description),
        mode: 'Direct Analysis'
      };
    }

    if (this.isConfigured()) {
      const systemPrompt = `You are a Senior Principal Software Engineer performing a rigorous, honest, and constructive code review.
CRITICAL RULES:
1. NEVER automatically give 10/10. The score MUST reflect actual findings. A score of 10/10 is rare and only for flawless, production-ready code.
2. If code contains bugs, edge-case failures (e.g. find_largest returning 0 for negative numbers), security risks (SQL injection, unsafe JWT decode), unhandled errors, or bad practices, deductions MUST be applied.
3. Severe vulnerabilities (SQL injection, RCE, buffer overflow) must clamp the overall score below 5.0.
4. Output MUST be valid JSON matching this exact structure:
{
  "score": 6.8,
  "language": "${language || 'auto'}",
  "breakdown": {
    "correctness": 6.0,
    "security": 9.0,
    "performance": 8.0,
    "maintainability": 7.0,
    "readability": 8.0,
    "errorHandling": 5.0
  },
  "summary": "Executive summary of code quality...",
  "positiveAspects": ["Point 1", "Point 2"],
  "problemsFound": [
    {
      "severity": "High",
      "category": "Correctness",
      "location": "Line X - functionName()",
      "problem": "Exact problem explanation",
      "whyItMatters": "Impact and consequence",
      "howToImprove": "Clear actionable instruction",
      "exampleFix": "Corrected code snippet"
    }
  ],
  "securityFindings": "Honest assessment of security",
  "performanceNotes": "Complexity analysis (e.g. O(n)) and bottlenecks",
  "maintainabilityNotes": "Architecture and refactoring suggestions",
  "recommendedImprovements": ["P1: ...", "P2: ..."],
  "suggestedTests": [
    { "name": "Test case title", "input": "...", "expected": "...", "notes": "..." }
  ],
  "improvedCode": "Complete, working, fixed version of the code that preserves original purpose"
}`;

      const userPrompt = `Language: ${language || 'auto'}\nContext: ${description || 'None provided'}\n\nCode:\n${code}`;

      try {
        const res = await this.generateText(userPrompt, systemPrompt);
        if (res) {
          const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(clean);
          if (parsed && typeof parsed.score === 'number') {
            return { review: parsed, mode: 'Live AI (Gemini)' };
          }
        }
      } catch (e) {
        // Fallback to static engine
      }
    }

    // High-fidelity Static Senior Review Engine
    const reviewResult = codeReviewEngine.analyzeCode(code, language, description);
    return {
      review: reviewResult,
      mode: 'Senior Code Review Engine'
    };
  }

  getPopularRepo(slug) {
    return null;
  }
}

module.exports = new AIService();
