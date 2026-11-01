// Client-side fallback knowledge base & offline intelligence engine
// Allows OpenSource AI to work 100% offline or directly from file://, GitHub Pages, or Vercel
const CLIENT_KNOWLEDGE = {
  projects: {
    'facebook/react': {
      name: 'react',
      owner: 'facebook',
      fullName: 'facebook/react',
      description: 'The library for web and native user interfaces.',
      stars: 228400,
      forks: 46200,
      openIssues: 850,
      mainLanguage: 'JavaScript',
      topics: ['react', 'ui', 'frontend', 'declarative', 'components'],
      activity: 'Active release cadence, daily commits from Meta team',
      license: 'MIT',
      techStack: 'JavaScript, JSX, Flow/TypeScript, Rollup, Jest',
      installCmd: 'npm install react react-dom',
      quickStart: 'git clone https://github.com/facebook/react.git\ncd react\nyarn install\nyarn test',
      readme: `# React\n\nReact is a declarative, efficient, and flexible JavaScript library for building user interfaces.\n\n### Core Strengths\n* **Declarative:** Design simple views for each state, React updates efficiently.\n* **Component-Based:** Encapsulated stateful components build complex interfaces.\n* **Learn Once, Write Anywhere:** Works across web, mobile (React Native), and server environments.`,
      contributing: `# Contributing to React\n\n1. Fork the repository and clone it.\n2. Run \`yarn install\` then run \`yarn test\` to confirm setup.\n3. Find beginner issues labeled \`good first issue\`.\n4. Create a descriptive branch: \`git checkout -b fix/issue-name\`.\n5. Run linting & tests before opening your PR.`,
      issues: [
        { id: 101, number: 28410, title: 'Docs: Fix broken navigation anchor in Quick Start tutorial', labels: ['good first issue', 'docs'], difficulty: 'Beginner' },
        { id: 102, number: 28392, title: 'useActionState hook types regression with async transition handlers', labels: ['Component: Hooks', 'Type: Bug'], difficulty: 'Intermediate' },
        { id: 103, number: 28290, title: 'Performance: Optimize memory footprint in concurrent scheduler queue', labels: ['Type: Performance', 'Advanced'], difficulty: 'Advanced' }
      ]
    },
    'expressjs/express': {
      name: 'express',
      owner: 'expressjs',
      fullName: 'expressjs/express',
      description: 'Fast, unopinionated, minimalist web framework for Node.js.',
      stars: 64500,
      forks: 11200,
      openIssues: 180,
      mainLanguage: 'JavaScript',
      topics: ['express', 'framework', 'node', 'rest', 'api', 'http'],
      activity: 'Maintained by OpenJS Foundation contributors',
      license: 'MIT',
      techStack: 'Node.js, JavaScript, Mocha, Supertest',
      installCmd: 'npm install express',
      quickStart: 'git clone https://github.com/expressjs/express.git\ncd express\nnpm install\nnpm test',
      readme: `# Express\n\nFast, unopinionated, minimalist web framework for Node.js.\n\n\`\`\`js\nconst express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => res.send('Hello World!'));\napp.listen(3000);\n\`\`\``,
      contributing: `# Contributing to Express\n\n* Run \`npm test\` to ensure existing tests pass.\n* Keep code style conforming to project ESLint standards.\n* Always include tests for bug fixes.`,
      issues: [
        { id: 201, number: 5410, title: 'Improve error handling docstrings in router/layer.js', labels: ['good first issue', 'docs'], difficulty: 'Beginner' },
        { id: 202, number: 5399, title: 'res.cookie with sameSite=none not setting Secure attribute warning', labels: ['bug', 'security'], difficulty: 'Intermediate' }
      ]
    },
    'vuejs/core': {
      name: 'core',
      owner: 'vuejs',
      fullName: 'vuejs/core',
      description: 'Vue.js is a progressive, incrementally-adoptable JavaScript framework for building UI on the web.',
      stars: 48900,
      forks: 8200,
      openIssues: 320,
      mainLanguage: 'TypeScript',
      topics: ['vue', 'reactive', 'frontend', 'compiler', 'typescript'],
      activity: 'Maintained by Evan You and the Vue Core team',
      license: 'MIT',
      techStack: 'TypeScript, Vite, Vitest, PNPM',
      installCmd: 'npm install vue',
      quickStart: 'git clone https://github.com/vuejs/core.git\ncd core\npnpm install\npnpm test',
      readme: `# Vue.js 3 Core\n\nThe progressive JavaScript framework for approachable, performant, and versatile web development.`,
      contributing: `# Contributing to Vue.js Core\n\n1. Ensure PNPM is installed: \`corepack enable\`.\n2. Run \`pnpm test\` to verify tests run locally.\n3. Make atomic commits following Conventional Commits format.`,
      issues: [
        { id: 301, number: 10420, title: 'docs(sfc): clarify generic prop inference with defineProps', labels: ['documentation', 'good first issue'], difficulty: 'Beginner' },
        { id: 302, number: 10398, title: 'fix(reactivity): trigger effect when shallowRef inner property mutated', labels: ['reactivity', 'bug'], difficulty: 'Intermediate' }
      ]
    },
    'vercel/next.js': {
      name: 'next.js',
      owner: 'vercel',
      fullName: 'vercel/next.js',
      description: 'The React Framework for the Web.',
      stars: 124000,
      forks: 26800,
      openIssues: 2400,
      mainLanguage: 'TypeScript',
      topics: ['nextjs', 'react', 'turbopack', 'ssr', 'framework'],
      activity: 'Very high activity, multiple daily releases by Vercel engineering',
      license: 'MIT',
      techStack: 'TypeScript, Rust (Turbopack), Next.js, Node.js, Jest',
      installCmd: 'npx create-next-app@latest',
      quickStart: 'git clone https://github.com/vercel/next.js.git\ncd next.js\npnpm install\npnpm test',
      readme: `# Next.js by Vercel\n\nUsed by some of the world's largest companies, Next.js enables you to create full-stack Web applications by extending the latest React features.`,
      contributing: `# Contributing to Next.js\n\n* Look for issues labeled \`good first issue\`.\n* Run Turbopack or specific package unit tests before filing a PR.`,
      issues: [
        { id: 401, number: 65120, title: 'docs: clarify parallel routes intercepting modal layout behaviour', labels: ['area: docs', 'good first issue'], difficulty: 'Beginner' },
        { id: 402, number: 65090, title: 'fix(cache): revalidateTag with dynamic segment params', labels: ['area: cache', 'bug'], difficulty: 'Intermediate' }
      ]
    }
  },

  search(query, repo) {
    const q = (query || '').toLowerCase().trim();
    const repoName = repo ? (repo.fullName || repo.name || 'this repo') : 'open-source';

    if (q.includes('react')) {
      return {
        title: 'React.js Architecture & Contributing',
        source: 'React Knowledge Base',
        answer: 'React is an open-source frontend library created by Meta. Key concepts: Virtual DOM, Fiber Reconciliation, Hooks, and Server Components.\n\nTo contribute, fork **facebook/react**, install with Yarn, and look for issues with the `good first issue` label.',
        tags: ['React', 'Frontend', 'Virtual DOM', 'Meta']
      };
    }
    if (q.includes('pr') || q.includes('pull request') || q.includes('rule')) {
      return {
        title: 'Pull Request Guidelines & Best Practices',
        source: 'Open Source Handbook',
        answer: '### Rules for a Great Pull Request:\n1. **Branch cleanly:** Never commit directly to `main`.\n2. **One feature per PR:** Keep scope atomic and easy to review.\n3. **Pass tests & linting:** Run `npm test` before pushing.\n4. **Write descriptive descriptions:** Explain the *why*, not just the *what*. Link relevant issue numbers (e.g., `Fixes #123`).',
        tags: ['Pull Requests', 'Git', 'Workflow', 'Best Practices']
      };
    }
    if (q.includes('good first issue') || q.includes('beginner')) {
      return {
        title: 'Finding Beginner-Friendly Issues',
        source: 'Contributor Onboarding',
        answer: 'Search repositories on GitHub for `is:issue is:open label:"good first issue"` or `label:"help wanted"`.\n\nDocumentation updates, test fixtures, and minor bug fixes are ideal initial contributions.',
        tags: ['Beginners', 'First Contribution', 'Issues']
      };
    }
    if (q.includes('git') || q.includes('clone') || q.includes('fork')) {
      return {
        title: 'Standard Git Workflow for Open Source',
        source: 'Git Guide',
        answer: '```bash\n# 1. Fork repo on GitHub UI, then clone your fork:\ngit clone https://github.com/YOUR_USERNAME/repo.git\ncd repo\n\n# 2. Add upstream\ngit remote add upstream https://github.com/ORIGINAL_OWNER/repo.git\n\n# 3. Create a feature branch\ngit checkout -b fix/my-awesome-fix\n\n# 4. Commit and push\ngit commit -am "fix: resolve issue with null check"\ngit push -u origin fix/my-awesome-fix\n```',
        tags: ['Git', 'Branching', 'Terminal', 'Workflow']
      };
    }

    return {
      title: `Search Result for "${query}"`,
      source: 'OpenSource AI Engine',
      answer: `Information related to **${query}** in context of **${repoName}**:\n\n* **Repository Standards:** Maintainers recommend adhering to existing code conventions and linting rules.\n* **Discussions:** Check repository issues and discussions for existing work before submitting duplicate PRs.\n* **Assistance:** Use the AI Assistant tab to get guided explanations tailored to this query.`,
      tags: ['Open Source', 'Contribution', 'Development']
    };
  },

  chat(message, repo) {
    const q = (message || '').toLowerCase();
    const repoName = repo ? (repo.fullName || repo.name) : 'facebook/react';

    if (q.includes('how to contribute') || q.includes('contribute') || q.includes('start')) {
      return `### 🚀 Step-by-Step Guide to Contribute to **${repoName}**\n\n1. **Fork the Repository:** Create a personal fork on GitHub.\n2. **Clone Locally:** \`git clone https://github.com/YOUR_USERNAME/${repo ? repo.name : 'repo'}.git\`\n3. **Install Dependencies:** Run the project package manager (\`npm install\` or \`pnpm install\`).\n4. **Run Tests:** Ensure test suite passes: \`npm test\`.\n5. **Find a Starter Issue:** Look for issues tagged \`good first issue\`.\n6. **Create Branch:** \`git checkout -b fix/issue-title\`\n7. **Submit Pull Request:** Detail your changes and link the relevant issue.`;
    }
    if (q.includes('issue') || q.includes('beginner')) {
      return `### 🐛 Recommended Starter Issues for **${repoName}**\n\n* **Documentation Polish:** Clarifying unclear parameter docs or fixing broken links is always welcomed.\n* **Test Coverage:** Adding unit tests for edge-cases or uncovered utility functions.\n* **Good First Issue:** Open the **Repository** or **Issue Triage** tab in the sidebar to review curated starter tickets.`;
    }
    if (q.includes('install') || q.includes('setup') || q.includes('build')) {
      return `### 🛠️ Setup Instructions for **${repoName}**\n\n\`\`\`bash\ngit clone https://github.com/${repoName}.git\ncd ${repo ? repo.name : 'project'}\nnpm install\nnpm test\n\`\`\`\n\nEnsure your Node.js LTS version matches project requirements before building.`;
    }
    if (q.includes('pr') || q.includes('pull request') || q.includes('review')) {
      return `### 📋 Creating a Successful Pull Request\n\n* Keep PRs concise and focused on a single change.\n* Provide before/after screenshots or terminal outputs.\n* Follow Conventional Commits: \`fix:\`, \`feat:\`, \`docs:\`.\n* Test your changes locally before pushing!`;
    }
    return `### 💡 OpenSource AI Mentor on "${message}"\n\nFor **${repoName}**, maintainers value clarity, solid unit test coverage, and respectful communication.\n\n* Check the **Repository** tab to view the live README and contributing docs.\n* Check the **Issue Triage** tab to analyze bug reports.\n* Use the **Code Review** tab to inspect code quality before opening a PR!`;
  },

  triage(title, description, repoName) {
    const text = (title + ' ' + description).toLowerCase();
    let issueType = 'Bug';
    let priority = 'Medium';
    let difficulty = 'Intermediate';

    if (text.includes('doc') || text.includes('typo') || text.includes('readme')) {
      issueType = 'Documentation';
      priority = 'Low';
      difficulty = 'Beginner';
    } else if (text.includes('crash') || text.includes('security') || text.includes('vulnerability') || text.includes('data loss')) {
      issueType = 'Critical Security / Crash';
      priority = 'Critical';
      difficulty = 'Advanced';
    } else if (text.includes('feature') || text.includes('enhancement') || text.includes('support')) {
      issueType = 'Feature Request';
      priority = 'Medium';
      difficulty = 'Intermediate';
    } else if (text.includes('slow') || text.includes('memory') || text.includes('leak') || text.includes('performance')) {
      issueType = 'Performance';
      priority = 'High';
      difficulty = 'Advanced';
    }

    return {
      issueType,
      priority,
      difficulty,
      summary: `Automated assessment for issue "${title}". Categorized as ${issueType} with ${priority} priority.`,
      recommendedLabels: [issueType.toLowerCase().replace(/\s+/g, '-'), difficulty.toLowerCase()],
      stepsToReproduce: '1. Verify environment configuration.\n2. Execute minimal reproduction snippet.\n3. Observe unexpected behavior vs expected specification.',
      suggestedFix: `Review relevant module handlers in ${repoName || 'the repository'}. Ensure strict null checks, error handling, and unit test coverage.`,
      beginnerFriendly: difficulty === 'Beginner'
    };
  },

  review(code, language) {
    const issues = [];
    let score = 95;

    if (code.includes('eval(')) {
      issues.push({
        severity: 'Critical',
        title: 'Use of eval() detected',
        description: '`eval()` executes arbitrary code with local privileges, introducing dangerous Remote Code Execution vulnerabilities.',
        fix: 'Replace with JSON.parse() or dedicated static mapping functions.'
      });
      score -= 40;
    }

    if (code.includes('SELECT * FROM') && (code.includes('+') || code.includes('${'))) {
      issues.push({
        severity: 'Critical',
        title: 'SQL Injection Vulnerability',
        description: 'Raw string concatenation detected in SQL statement without parameterized placeholders.',
        fix: 'Use parameterized queries: `db.query("SELECT * FROM users WHERE id = ?", [userId])`'
      });
      score -= 35;
    }

    if (code.includes('jwt.decode')) {
      issues.push({
        severity: 'Warning',
        title: 'Unverified JWT Token',
        description: '`jwt.decode()` does not verify the cryptographic signature of the token.',
        fix: 'Use `jwt.verify(token, SECRET_KEY)` instead of `jwt.decode()`.'
      });
      score -= 20;
    }

    if (code.includes('throw err') || (code.includes('catch') && code.includes('console.log'))) {
      issues.push({
        severity: 'Suggestion',
        title: 'Improve Error Boundary',
        description: 'Unhandled exceptions or swallowed errors can terminate the server process.',
        fix: 'Return formatted error responses with appropriate HTTP status codes (e.g. 500 / 400).'
      });
      score -= 10;
    }

    if (issues.length === 0) {
      issues.push({
        severity: 'Good',
        title: 'Code Structure Clean',
        description: 'No obvious security anti-patterns detected. Follows modern language conventions.',
        fix: 'Ensure thorough unit tests accompany this implementation.'
      });
    }

    return {
      score: Math.max(20, score),
      summary: `Code review analysis completed: ${issues.length} observation(s) recorded. Overall quality score: ${Math.max(20, score)}/100.`,
      issues,
      improvedCode: `// Optimized implementation\n${code}`
    };
  }
};
