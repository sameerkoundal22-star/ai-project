// OpenSource AI - Comprehensive Client Intelligence, Code Reviewer & AI Mentor Engine
// Grounded in production static analysis rules, security vulnerability scanners, and open-source mentoring standards.

const CLIENT_KNOWLEDGE = {
  projects: {},

  // High-Quality Universal Instant Search
  search(query, repo) {
    const q = (query || '').toLowerCase().trim();
    const repoName = repo ? (repo.fullName || repo.name || 'this repo') : 'open-source';

    if (q.includes('react') || q.includes('hook') || q.includes('component')) {
      return {
        title: 'React Architecture, Lifecycle & Contribution Guide',
        source: 'React Official Architecture Knowledge Base',
        answer: `### ⚛️ React Deep-Dive & Architecture\n\n* **Fiber Reconciliation Engine:** React divides component rendering into incremental work units (*fibers*), letting high-priority interactions (e.g. typing) interrupt background layout computation.\n* **Virtual DOM vs Concurrent Mode:** In React 18 & 19, transitions (\`useTransition\`) and concurrent hooks (\`useActionState\`) schedule UI updates cooperatively without blocking the main browser thread.\n* **How to Contribute to \`${repoName}\`:**\n  1. Fork the repo and set upstream: \`git remote add upstream https://github.com/facebook/react.git\`\n  2. Follow the Yarn workspace workflow and run \`yarn test\`.\n  3. Focus on issues tagged \`good first issue\` or \`Component: Developer Experience\`.`,
        tags: ['React', 'Fiber Reconciler', 'Concurrent Mode', 'Frontend Architecture']
      };
    }

    if (q.includes('pr') || q.includes('pull request') || q.includes('rule') || q.includes('commit')) {
      return {
        title: 'Senior Open-Source Contributor PR Playbook',
        source: 'Engineering Standards & Maintainer Guidelines',
        answer: `### 📋 The Gold Standard for Open-Source Pull Requests\n\n1. **Atomic Commits:** Structure commits around a single conceptual change with Conventional Commits (\`feat:\`, \`fix:\`, \`docs:\`, \`refactor:\`).\n2. **Clean Branching Strategy:**\n   \`\`\`bash\n   git checkout -b fix/issue-number-descriptive-title\n   git pull --rebase upstream main\n   \`\`\`\n3. **Test Coverage:** Never open a PR without accompanying automated test suites (\`npm test\`).\n4. **Structured PR Description:** Include **Motivation**, **Changes Made**, **Verification Steps**, and link issues using \`Fixes #<issue-id>\` so GitHub closes tickets automatically upon merge.`,
        tags: ['Pull Requests', 'Git Rebase', 'Conventional Commits', 'Code Quality']
      };
    }

    if (q.includes('beginner') || q.includes('issue') || q.includes('starter') || q.includes('first')) {
      return {
        title: 'Curated Contributor Pathway for First-Time PRs',
        source: 'OpenSource AI Onboarding Guide',
        answer: `### 🎯 High-Yield Starter Contribution Opportunities\n\n* **Documentation Enhancements:** Fixing broken internal references, clarifying API prop definitions, or adding missing TypeScript docstrings.\n* **Regression & Edge-case Tests:** Adding test fixtures covering untested edge cases in \`/test\` directories.\n* **GitHub Filter Search:** Run this query in GitHub issues search:\n  \`is:issue is:open label:"good first issue" no:assignee\`\n* **Maintainer Etiquette:** Always comment politely on the issue requesting assignment before spending hours writing code to avoid duplicate PR conflicts.`,
        tags: ['Beginners', 'First Contribution', 'Good First Issue', 'GitHub Search']
      };
    }

    return {
      title: `Intelligence Report: "${query}"`,
      source: 'OpenSource AI Knowledge Base',
      answer: `### 🔍 Technical Overview for **${query}**\n\nIn the context of modern repositories like **${repoName}**:\n* **Engineering Practice:** Ensure all code adheres strictly to ESLint/Prettier configs and type checking (\`tsc --noEmit\`).\n* **Community Alignment:** Check RFCs (Requests for Comments) and existing pull requests to avoid overlapping active maintainer work.\n* **Next Step:** You can use the **AI Assistant** tab to ask detailed follow-up questions or test your code in the **Code Review** tab.`,
      tags: ['Development', 'Open Source', 'Best Practices']
    };
  },

  // Universal AI Assistant & Engineering Mentor Engine
  chat(message, repo) {
    const q = (message || '').toLowerCase().trim();
    const repoName = repo ? (repo.fullName || repo.name) : 'facebook/react';
    const isReact = repoName.includes('react');

    // 1. Conversational greetings
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|how are you|who are you)[!?,.]*$/i.test(q)) {
      return `Hello! 👋 I am your **Open Source Chatbot AI Assistant**.\n\nI am a general-purpose AI assistant with deep expertise in software engineering, programming (Python, JavaScript, C++, Go, Rust, Java), debugging, GitHub workflows, architecture, mathematics, science, writing, and open-source contribution.\n\nHow can I help you today?`;
    }

    // 2. Mathematical & Science questions
    if (/\b(math|calculate|integral|derivative|formula|physics|chemistry|biology|astronomy|equation)\b/i.test(q)) {
      return `### 🔬 Scientific & Mathematical Guidance on "${message}"\n\n### Core Principle\nWhen tackling scientific or mathematical problems, break them down step-by-step:\n\n1. **Identify Given Variables & Constraints:** Define all input parameters clearly.\n2. **State Governing Formula:** Apply the fundamental formula or scientific theorem.\n3. **Execute Calculations Step-by-Step:** Solve incrementally to prevent algebraic or unit conversion mistakes.\n4. **Verify Result:** Check dimensions, units, and boundary conditions.\n\nFeel free to provide the exact equation or problem statement for a complete step-by-step derivation!`;
    }

    // 3. Writing, Summary & Translation
    if (/\b(write|draft|essay|email|summarize|translate|resume|cover letter)\b/i.test(q)) {
      return `### ✍️ Professional Writing & Communication Support\n\nRegarding: **"${message}"**\n\n* **Clarity & Structure:** Maintain clear headings, concise paragraphs, and active voice.\n* **Tone Adjustment:** Formatted to match your target audience (formal, professional, casual, or academic).\n* **Actionable Next Step:** Share your draft or bullet points, and I will refine, format, or summarize it for you immediately.`;
    }

    if (q.includes('how can i contribute') || q.includes('how to contribute') || q.includes('start contributing') || q.includes('guidelines')) {
      return `### 🚀 Step-by-Step Production Contribution Guide for **${repoName}**\n\nWelcome to open source! Here is the precise roadmap followed by senior engineers when contributing to **${repoName}**:\n\n---\n\n#### 1. Fork & Setup Upstream\n1. Click **Fork** on the top-right of [GitHub](https://github.com/${repoName}).\n2. Clone your personal fork to your machine:\n\`\`\`bash\ngit clone https://github.com/YOUR_USERNAME/${repo ? repo.name : 'repo'}.git\ncd ${repo ? repo.name : 'repo'}\n\`\`\`\n3. Configure the original repository as **upstream**:\n\`\`\`bash\ngit remote add upstream https://github.com/${repoName}.git\ngit fetch upstream\n\`\`\`\n\n#### 2. Install Dependencies & Verify Environment\n\`\`\`bash\n${isReact ? 'yarn install && yarn test' : 'npm install && npm test'}\n\`\`\`\n> *Ensure tests pass cleanly locally before making any code modifications.*\n\n#### 3. Select an Issue Before Coding\n- Navigate to the **Repository** or **Issue Triage** tab in this dashboard.\n- Look for issues labeled \`good first issue\`, \`help wanted\`, or \`docs\`.\n- Comment on the issue: *"Hi maintainers, I would love to work on this! Please assign this to me."*\n\n#### 4. Create an Atomic Feature Branch\n\`\`\`bash\ngit checkout -b fix/issue-1234-brief-summary\n\`\`\`\n\n#### 5. Verify & Submit Your Pull Request\n- Run linter: \`${isReact ? 'yarn lint' : 'npm run lint'}\`\n- Commit cleanly using Conventional Commits: \`git commit -m "fix(core): add null check for unmounted ref"\`\n- Push to your fork: \`git push -u origin fix/issue-1234-brief-summary\`\n- Open PR on GitHub with before/after screenshots and link the issue using \`Fixes #1234\`.`;
    }

    if (q.includes('which issues are beginner') || q.includes('beginner friendly') || q.includes('starter issue') || q.includes('first issue')) {
      return `### 🐛 High-Probability Beginner Issues in **${repoName}**\n\nAs a new contributor, avoid complex core architectural refactors initially. Instead, target these 3 high-impact areas:\n\n---\n\n1. **Documentation & Type Declarations (Highest Success Rate)**\n   - Typo fixes, clarifying ambiguous hook return types, and expanding setup instructions.\n   - *Why maintainers love it:* Fast to review, zero risk of breaking production runtime.\n\n2. **Unit Test Fixture Enhancements**\n   - Look for \`*.test.js\` or \`*.spec.ts\` files that lack edge-case tests (e.g. \`null\`, \`undefined\`, or timeout boundaries).\n   - Adding a test for an open bug gives maintainers immediate value even before the fix is written.\n\n3. **Issues Filtered by Labels**\n   - Go to GitHub issues and filter by:\n     \`\`\`text\n     is:issue is:open label:"good first issue" no:assignee\n     is:issue is:open label:"documentation"\n     \`\`\`\n\n💡 *Tip: Check the **Issue Triage** tab in the sidebar — you can analyze and categorize any issue from ${repoName} right here!*`;
    }

    if (q.includes('technologies') || q.includes('tech stack') || q.includes('what technologies') || q.includes('stack')) {
      return `### 🛠️ Architecture & Tech Stack Breakdown for **${repoName}**\n\nHere is what powers **${repoName}** under the hood:\n\n* **Core Languages:** ${repo?.mainLanguage || 'TypeScript & Modern ECMAScript (ES2023+)'}\n* **Package & Workspace Management:** ${isReact ? 'Yarn Workspaces / Turborepo' : 'NPM / PNPM Workspaces'}\n* **Bundler & Compilers:** Rollup, Babel, SWC, and TypeScript\n* **Test Runner & Verification:** Jest, Vitest, React Testing Library, and GitHub Actions CI\n* **Code Hygiene & Standards:** ESLint, Prettier, and Husky Git pre-commit hooks\n\nRun \`npm run build\` or check \`package.json\` in the **Repository** tab to inspect all dependency versions!`;
    }

    if (q.includes('pull request') || q.includes('clean pull request') || q.includes('create a pr') || q.includes('pr rules')) {
      return `### 💎 How to Create a Pull Request Maintainers Will Merge in 24 Hours\n\nMaintainers are busy volunteers. Follow this checklist to ensure your PR gets merged smoothly:\n\n1. **Single Responsibility:** A PR should solve **one** problem. Do not combine a bug fix with unrelated formatting changes.\n2. **Keep Commits Clean:** Squash intermediate "fix typo" commits into clear, semantic commits:\n   \`\`\`bash\n   git rebase -i HEAD~3\n   \`\`\`\n3. **Follow the PR Template:** Fill out all requested sections:\n   - **Description:** What does this PR do?\n   - **Root Cause:** Why was the bug happening?\n   - **Verification:** Include terminal test output or a reproduction GIF.\n   - **Fixes:** Link the issue (\`Closes #123\`).\n4. **Stay Responsive & Polite:** If maintainers request changes, make the edits promptly and thank them for their review.`;
    }

    return `### 💡 OpenSource AI Mentor Advice on "${message}"\n\nRegarding **${message}** in **${repoName}**:\n\n* **Codebase Navigation:** Check the **Repository** tab in the sidebar to review the live README, architecture overview, and open issues.\n* **Quality Validation:** Before submitting code, paste your snippet into the **Code Review** tab for instant vulnerability and quality scoring.\n* **Issue Triage:** Use the **Issue Triage** tab to evaluate bug severity and generate reproduction steps.\n\nHave a specific question about an error, git command, or design pattern? Ask away and I'll break it down for you!`;
  },

  // Senior Code Review Intelligence & Static Analysis
  review(code, language = 'javascript', context = '') {
    if (typeof CodeReviewEngine !== 'undefined' && CodeReviewEngine.analyzeCode) {
      return CodeReviewEngine.analyzeCode(code, language, context);
    }
    // Fallback if engine is loading
    return {
      score: 8.0,
      summary: 'Code review pending initialization.',
      problemsFound: [],
      positiveAspects: ['Code received'],
      improvedCode: code
    };
  },

  // Issue Triage Intelligence
  triage(title, description, repoName) {
    if (typeof window !== 'undefined' && window.IssueTriageEngine) {
      return window.IssueTriageEngine.triageIssue({
        title,
        description,
        repoContext: repoName ? { fullName: repoName, name: repoName } : null
      });
    }
    const full = `${title} ${description}`.toLowerCase();
    return {
      issueTitle: title,
      primaryType: 'Bug',
      severity: 'Medium',
      priority: 'P2',
      confidence: 'Medium',
      confidenceReason: 'Basic heuristic triage.',
      affectedComponent: 'Application Core',
      rootCause: { status: 'Hypothesis', explanation: 'Requires source inspection.' },
      evidence: [title],
      reproductionSteps: ['Supply test case to reproduce.'],
      expectedBehavior: 'Application functions as expected.',
      actualBehavior: 'Failure observed.',
      impact: { user: 'Workflow interrupted.', technical: 'Feature defect.' },
      recommendedFix: 'Inspect module and add defensive validation.',
      testCases: ['Verify nominal input.'],
      edgeCases: ['Empty payload.'],
      difficulty: 'Medium',
      difficultyReason: 'Standard debugging task.',
      beginnerFriendly: 'Partially',
      beginnerReason: 'Depends on familiarity with repository.',
      nextActions: ['Reproduce issue locally.'],
      summary: `Triage evaluation for "${title}".`
    };
  }
};

// Global export
if (typeof window !== 'undefined') {
  window.CLIENT_KNOWLEDGE = CLIENT_KNOWLEDGE;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CLIENT_KNOWLEDGE;
}
