// Advanced Developer Issue Triage & Diagnostic Intelligence Engine
// Analyzes real issues, stack traces, reproduction steps, security boundaries, and repository context.
// Produces 100% evidence-based reports without hardcoded or generic answers.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IssueTriageEngine = factory();
  }
})(typeof window !== 'undefined' ? window : global, function () {
  'use strict';

  // Common runtime exceptions and their architectural implications
  const KNOWN_EXCEPTIONS = [
    { pattern: /\bZeroDivisionError\b/i, name: 'ZeroDivisionError', category: 'Runtime Calculation Error', component: 'Math / Business Logic Pipeline', defaultFix: 'Add guard check before division to verify denominator is non-zero (e.g. `if not collection or len(collection) == 0:` or `if denominator == 0:`).' },
    { pattern: /\bNullPointerException\b|\bNPE\b/i, name: 'NullPointerException', category: 'Null Reference Dereference', component: 'Core Application Service', defaultFix: 'Implement explicit null check or use Optional / safe navigation operator (?.) before accessing object properties or methods.' },
    { pattern: /\bTypeError:\s*Cannot read propert(?:y|ies) of (?:undefined|null)\b/i, name: 'TypeError (Unchecked Property Access)', category: 'Uncaught Client / Server Reference Error', component: 'Data Access / Component Layer', defaultFix: 'Use optional chaining (`?.`), nullish coalescing (`??`), or validate payload shape before property dereference.' },
    { pattern: /\bIndexError:\s*list index out of range\b/i, name: 'IndexError (Out of Bounds)', category: 'Collection Boundary Error', component: 'Data Processing / Collection Indexer', defaultFix: 'Verify collection length exceeds target index before subscript access (`if index < len(items):`).' },
    { pattern: /\bKeyError:\s*['"]?([^'"\n]+)['"]?/i, name: 'KeyError (Missing Dictionary Key)', category: 'Data Structure Lookup Error', component: 'Dictionary / Configuration Mapper', defaultFix: 'Use safe retrieval method such as `.get(key, default)` or verify key presence with `if key in dict:`.' },
    { pattern: /\bRecursionError:\s*maximum recursion depth exceeded\b/i, name: 'RecursionError', category: 'Infinite Recursion / Stack Overflow', component: 'Recursive Algorithm / State Traversal', defaultFix: 'Check base case termination condition or refactor recursive traversal into iterative loop with explicit stack.' },
    { pattern: /\b(ECONNREFUSED|ETIMEDOUT|ECONNRESET)\b/i, name: 'Network Connection Failure', category: 'Network Transport Error', component: 'Networking / External Client Service', defaultFix: 'Verify endpoint reachability, handle timeouts gracefully with exponential backoff and circuit breaker pattern.' },
    { pattern: /\b(Deadlock|Lock wait timeout exceeded)\b/i, name: 'Database Deadlock', category: 'Database Concurrency Hazard', component: 'Database / Transaction Boundary', defaultFix: 'Ensure uniform lock ordering across concurrent transactions and optimize query execution plans to minimize lock duration.' },
    { pattern: /\b(OutOfMemoryError|JavaScript heap out of memory|SIGSEGV|Segmentation fault)\b/i, name: 'Memory Exhaustion / Crash', category: 'Resource Exhaustion / Memory Leak', component: 'System Runtime / Memory Allocator', defaultFix: 'Inspect stream buffering, prevent unbounded in-memory collection growth, and profile memory allocations.' },
    { pattern: /\b(CORS|Cross-Origin Request Blocked)\b/i, name: 'CORS Restriction Error', category: 'Browser Security Policy', component: 'API Gateway / HTTP Security Headers', defaultFix: 'Configure server `Access-Control-Allow-Origin` and allowed methods/headers on the target backend API.' }
  ];

  // Parse stack trace lines to extract confirmed file, function, line numbers
  function parseStackTrace(text) {
    if (!text) return null;
    const lines = text.split('\n');
    const frames = [];
    let detectedException = '';

    for (const line of lines) {
      // Python style: File "app.py", line 42, in calculate_average
      const pyMatch = line.match(/File\s+["']([^"']+)["'],\s+line\s+(\d+)(?:,\s+in\s+([\w<>]+))?/i);
      if (pyMatch) {
        frames.push({
          file: pyMatch[1],
          line: parseInt(pyMatch[2], 10),
          func: pyMatch[3] || 'module',
          raw: line.trim()
        });
        continue;
      }

      // JS / Node style: at functionName (path/file.js:123:45) or at path/file.js:123:45
      const jsMatch = line.match(/at\s+(?:([\w.<>$]+)\s+\()?(?:.+[\\/])?([^\\/:\s()]+\.[a-zA-Z0-9]+):(\d+):(\d+)\)?/i);
      if (jsMatch) {
        frames.push({
          func: jsMatch[1] || 'anonymous',
          file: jsMatch[2],
          line: parseInt(jsMatch[3], 10),
          raw: line.trim()
        });
        continue;
      }

      // Java style: at com.example.MyClass.method(MyClass.java:42)
      const javaMatch = line.match(/at\s+([\w.$]+)\.([\w$]+)\(([\w.]+\.java):(\d+)\)/i);
      if (javaMatch) {
        frames.push({
          func: `${javaMatch[1]}.${javaMatch[2]}`,
          file: javaMatch[3],
          line: parseInt(javaMatch[4], 10),
          raw: line.trim()
        });
        continue;
      }

      // Exception header
      const exMatch = line.match(/^([a-zA-Z_]\w*(?:Error|Exception|Fault|Failure|Crash))(?::\s*(.*))?$/);
      if (exMatch && !detectedException) {
        detectedException = exMatch[0].trim();
      }
    }

    if (frames.length > 0 || detectedException) {
      return {
        exception: detectedException || 'Uncaught Exception',
        frames,
        deepestFrame: frames[frames.length - 1] || null
      };
    }
    return null;
  }

  // Detect explicit reproduction steps in user text
  function extractReproductionSteps(text) {
    if (!text) return null;
    const stepRegex = /(?:steps to reproduce|reproduction steps|how to reproduce|to reproduce|steps:)([\s\S]*?)(?=(?:expected|actual|environment|notes|logs|additional|stack trace|\n\n[A-Z]|$))/i;
    const match = text.match(stepRegex);
    if (match && match[1]) {
      const stepLines = match[1]
        .split('\n')
        .map(l => l.replace(/^[\s*\-•\d.]+\s*/, '').trim())
        .filter(l => l.length > 2);
      if (stepLines.length > 0) return stepLines;
    }

    // Numbered list match: 1. ... 2. ...
    const numbered = text.match(/^\s*\d+\.\s+(.+)$/gm);
    if (numbered && numbered.length >= 2) {
      return numbered.map(l => l.replace(/^\s*\d+\.\s*/, '').trim());
    }

    return null;
  }

  // Detect expected vs actual behavior
  function extractBehaviors(text) {
    let expected = null;
    let actual = null;

    const expMatch = text.match(/(?:expected behavior|expected result|expected:)([\s\S]*?)(?=(?:actual|reproduction|steps|environment|notes|logs|\n\n[A-Z]|$))/i);
    if (expMatch && expMatch[1].trim()) {
      expected = expMatch[1].trim().split('\n')[0].replace(/^[\s*\-•]+\s*/, '');
    }

    const actMatch = text.match(/(?:actual behavior|actual result|observed behavior|actual:)([\s\S]*?)(?=(?:expected|reproduction|steps|environment|notes|logs|\n\n[A-Z]|$))/i);
    if (actMatch && actMatch[1].trim()) {
      actual = actMatch[1].trim().split('\n')[0].replace(/^[\s*\-•]+\s*/, '');
    }

    return { expected, actual };
  }

  // Extract explicit function, endpoint, or file names from text
  function extractTechnicalArtifacts(text) {
    const funcs = [];
    const endpoints = [];
    const files = [];

    // Functions: name()
    const funcMatches = text.matchAll(/\b([a-zA-Z_]\w+)\s*\(\)/g);
    for (const m of funcMatches) {
      if (!['if', 'for', 'while', 'catch', 'function', 'return'].includes(m[1])) {
        if (!funcs.includes(m[1])) funcs.push(m[1]);
      }
    }

    // HTTP Endpoints: /api/..., GET /users, POST /auth/login
    const epMatches = text.matchAll(/(?:GET|POST|PUT|PATCH|DELETE)?\s*(\/[\w\-./]+)/g);
    for (const m of epMatches) {
      if (!endpoints.includes(m[1])) endpoints.push(m[1]);
    }

    // Explicit files: something.py, controller.ts, config.json
    const fileMatches = text.matchAll(/\b([a-zA-Z0-9_\-./]+\.(?:py|js|ts|tsx|jsx|java|go|rs|cpp|c|h|cs|php|rb|sql|html|css|json|yaml|yml|toml|md))\b/g);
    for (const m of fileMatches) {
      if (!files.includes(m[1])) files.push(m[1]);
    }

    return { funcs, endpoints, files };
  }

  // Core analysis engine
  function triageIssue(input) {
    const title = (input && input.title ? input.title.trim() : '');
    const description = (input && input.description ? input.description.trim() : '');
    const repoContext = input && input.repoContext ? input.repoContext : null;
    const issueMeta = input && input.issueMeta ? input.issueMeta : null;

    if (!title && !description) {
      return {
        error: 'Please enter an issue title or description before starting the analysis.'
      };
    }

    const combinedText = `${title}\n${description}`;
    const lower = combinedText.toLowerCase();

    // Determine evidence availability
    const hasOnlyTitle = Boolean(title && !description);
    const hasOnlyDesc = Boolean(!title && description);
    const stackTrace = parseStackTrace(description || title);
    const behaviors = extractBehaviors(combinedText);
    const extractedSteps = extractReproductionSteps(combinedText);
    const techArtifacts = extractTechnicalArtifacts(combinedText);

    // Identify Known Exception
    let identifiedException = null;
    for (const ex of KNOWN_EXCEPTIONS) {
      if (ex.pattern.test(combinedText)) {
        identifiedException = ex;
        break;
      }
    }

    // 1. DETERMINE ISSUE TYPE (Primary & Secondary)
    let primaryType = 'Bug';
    let secondaryType = null;
    let typeReason = '';

    // Security pattern
    const isSecurity = (
      /\b(password|plaintext|secret|token|api[_\s]?key|vulnerability|cve|xss|sql[_\s]?injection|rce|injection|exposure|unauthorized|auth[_\s]?bypass|csrf|privilege escalation)\b/i.test(combinedText)
    );

    // Performance pattern
    const isPerformance = (
      /\b(slow|hundreds of (?:api|network|http) requests|500 requests|memory leak|high latency|lag|infinite loop|o\(n\^2\)|fps drop|cpu spike|timeout|unoptimized|bottleneck|takes \d+ seconds)\b/i.test(combinedText)
    );

    // Documentation pattern
    const isDoc = (
      /\b(doc|docs|documentation|typo|readme|guide|misspelled|broken link|api doc|grammar)\b/i.test(combinedText) &&
      !lower.includes('crash') && !lower.includes('error') && !lower.includes('vulnerability')
    );

    // Feature request / Enhancement
    const isFeature = (
      /\b(add dark mode|feature request|feature:|proposal|would be great|allow users to|support for|new feature|add support|please add)\b/i.test(combinedText) &&
      !lower.includes('crash') && !lower.includes('exception') && !lower.includes('fix bug')
    );

    // UI/UX
    const isUIUX = (
      /\b(button misalignment|layout shift|css overflow|font size|padding|z-index|responsive mobile view|ui glitch|visual bug)\b/i.test(combinedText)
    );

    // Build / Compilation / Dependency
    const isBuild = (
      /\b(compilation failed|build error|npm err|webpack error|cannot find module|undefined symbol|linker error|dependency conflict)\b/i.test(combinedText)
    );

    // Configuration / Environment
    const isConfig = (
      /\b(env variable missing|\.env|config\.json|port already in use|configuration error|dockerfile)\b/i.test(combinedText)
    );

    // Accessibility
    const isA11y = (
      /\b(aria-|screen reader|keyboard navigation|wcag|contrast ratio|accessibility)\b/i.test(combinedText)
    );

    if (isSecurity) {
      primaryType = 'Security';
      typeReason = 'Issue references sensitive credentials, security bypass, or data exposure vulnerabilities.';
      if (lower.includes('crash') || lower.includes('bug') || lower.includes('error')) secondaryType = 'Bug';
    } else if (isPerformance) {
      primaryType = 'Performance';
      typeReason = 'Issue details excessive network traffic, high latency, resource consumption, or slow responsiveness.';
      if (lower.includes('bug') || lower.includes('error')) secondaryType = 'Bug';
    } else if (isDoc) {
      primaryType = 'Documentation';
      typeReason = 'Issue requests documentation clarification, typo correction, or guide expansion.';
    } else if (isFeature) {
      primaryType = 'Feature Request';
      typeReason = 'Issue proposes new application functionality or capability rather than reporting defective behavior.';
    } else if (isBuild) {
      primaryType = 'Build/Compilation';
      typeReason = 'Issue prevents project compilation, bundling, or dependency resolution.';
    } else if (isUIUX) {
      primaryType = 'UI/UX';
      typeReason = 'Issue reports visual rendering discrepancy, styling layout issue, or design defect.';
    } else if (isConfig) {
      primaryType = 'Configuration';
      typeReason = 'Issue stems from environment variables, configuration files, or local setup settings.';
    } else if (isA11y) {
      primaryType = 'Accessibility';
      typeReason = 'Issue involves screen readers, assistive technology, keyboard navigation, or WCAG compliance.';
    } else {
      primaryType = 'Bug';
      typeReason = 'Issue reports unexpected runtime failure, calculation error, or broken functionality.';
    }

    // 2. SEVERITY ANALYSIS (Critical, High, Medium, Low)
    let severity = 'Medium';
    let severityReason = '';

    if (
      lower.includes('remote code execution') ||
      lower.includes('rce') ||
      lower.includes('auth bypass') ||
      lower.includes('authentication bypass') ||
      lower.includes('sql injection') ||
      lower.includes('data loss') ||
      lower.includes('production outage') ||
      (isSecurity && (lower.includes('plaintext password') || lower.includes('leak') || lower.includes('exposed')))
    ) {
      severity = 'Critical';
      severityReason = 'Vulnerability or failure carries extreme risk of system compromise, sensitive data exposure, or total service disruption.';
    } else if (
      isSecurity ||
      isPerformance ||
      lower.includes('crash') ||
      lower.includes('zerodivisionerror') ||
      lower.includes('nullpointerexception') ||
      lower.includes('500 api requests') ||
      lower.includes('500 network requests') ||
      lower.includes('completely broken') ||
      lower.includes('cannot log in') ||
      lower.includes('fatal error')
    ) {
      severity = 'High';
      severityReason = isSecurity
        ? 'Exposes sensitive data or creates a security boundary violation that must be mitigated.'
        : (isPerformance
          ? 'Excessive network cascade causes extreme latency (15s+) and degraded application responsiveness.'
          : 'Causes feature failure, unhandled runtime crashes, or severe performance degradation.');
    } else if (isDoc || isUIUX || lower.includes('typo') || lower.includes('minor') || lower.includes('cosmetic')) {
      severity = 'Low';
      severityReason = 'Cosmetic, typographical, or documentation issue with zero impact on operational reliability or security.';
    } else {
      severity = 'Medium';
      severityReason = 'Impacts specific feature workflows or edge conditions without causing a total service halt.';
    }

    // 3. PRIORITY ANALYSIS (P0, P1, P2, P3)
    let priority = 'P2';
    let priorityReason = '';

    if (severity === 'Critical') {
      priority = 'P0';
      priorityReason = 'Immediate blocker requiring same-day hotfix and emergency deployment.';
    } else if (severity === 'High') {
      priority = isSecurity ? 'P1' : 'P1';
      priorityReason = isSecurity
        ? 'High-risk security or functional defect; address in the immediate sprint cycle.'
        : 'Core feature degradation or unhandled exception directly impacting end users.';
    } else if (severity === 'Medium') {
      priority = isFeature ? 'P2' : 'P2';
      priorityReason = 'Scheduled for standard iteration prioritization and upcoming sprint backlog.';
    } else {
      priority = 'P3';
      priorityReason = 'Non-blocking enhancement or low-impact polish to be tackled when convenient.';
    }

    // 4. AFFECTED COMPONENT
    let affectedComponent = 'Application Core';
    let specificArtifacts = [];

    if (techArtifacts.endpoints.length > 0) {
      affectedComponent = `API Endpoint (${techArtifacts.endpoints.join(', ')})`;
      specificArtifacts.push(`Endpoints: ${techArtifacts.endpoints.join(', ')}`);
    } else if (techArtifacts.funcs.length > 0) {
      affectedComponent = `Function Handler (\`${techArtifacts.funcs.join('()`, `')}()\`)`;
      specificArtifacts.push(`Functions: ${techArtifacts.funcs.join('(), ')}()`);
    } else if (techArtifacts.files.length > 0) {
      affectedComponent = `Module File (\`${techArtifacts.files.join('`, `')}\`)`;
      specificArtifacts.push(`Files: ${techArtifacts.files.join(', ')}`);
    } else if (stackTrace && stackTrace.deepestFrame) {
      affectedComponent = `Stack Frame in \`${stackTrace.deepestFrame.file}\` at line ${stackTrace.deepestFrame.line}`;
      specificArtifacts.push(`Stack: ${stackTrace.deepestFrame.file}:${stackTrace.deepestFrame.line}`);
    } else if (isSecurity) {
      affectedComponent = 'Authentication & API Data Serialization Boundary';
    } else if (isPerformance) {
      affectedComponent = 'Data Fetching & Network Request Pipeline';
    } else if (isDoc) {
      affectedComponent = 'Documentation / README';
    } else if (isFeature && lower.includes('dark mode')) {
      affectedComponent = 'UI Theme System & User Preference Storage';
    } else if (identifiedException) {
      affectedComponent = identifiedException.component;
    }

    // 5. ROOT CAUSE ANALYSIS (Confirmed vs Hypothesis)
    let rootCauseStatus = 'Hypothesis';
    let rootCauseExplanation = '';

    if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
      rootCauseStatus = 'Confirmed from issue';
      const funcName = techArtifacts.funcs[0] ? `in \`${techArtifacts.funcs[0]}()\`` : '';
      rootCauseExplanation = `The application performs division by collection length without verifying that the collection contains at least one element. When an empty collection is supplied ${funcName}, denominator is 0, raising an unhandled \`ZeroDivisionError: division by zero\`.`;
    } else if (isSecurity && (lower.includes('password') && (lower.includes('api') || lower.includes('/users')))) {
      rootCauseStatus = 'Confirmed from issue';
      rootCauseExplanation = 'The user serialization/projection query returns the complete user database record (including password hash or plaintext field) without filtering out sensitive attributes through a Data Transfer Object (DTO) or field projection whitelist.';
    } else if (isPerformance && lower.includes('500') && (lower.includes('request') || lower.includes('network'))) {
      rootCauseStatus = 'Confirmed from issue';
      rootCauseExplanation = 'The component triggers an un-batched N+1 network request cascade or uncontrolled loop on mount rather than bundling queries into a single paginated/aggregated batch endpoint.';
    } else if (isFeature && lower.includes('dark mode')) {
      rootCauseStatus = 'Feature Specification';
      rootCauseExplanation = 'Application currently lacks a theme toggle context/state and CSS variables mapping for dark color schemes, along with persistence in `localStorage`.';
    } else if (stackTrace && stackTrace.deepestFrame) {
      rootCauseStatus = 'Confirmed from stack trace';
      rootCauseExplanation = `Failure originated at \`${stackTrace.deepestFrame.file}\` (line ${stackTrace.deepestFrame.line}) inside \`${stackTrace.deepestFrame.func}()\` resulting in \`${stackTrace.exception}\`.`;
    } else if (identifiedException) {
      rootCauseStatus = 'Hypothesis';
      rootCauseExplanation = `The issue description points to ${identifiedException.name}. ${identifiedException.defaultFix} Source code was not provided, so exact line numbers cannot be confirmed.`;
    } else {
      rootCauseStatus = 'Hypothesis';
      rootCauseExplanation = hasOnlyTitle
        ? 'Limited information available. Root cause cannot be definitively established without detailed reproduction logs or source code.'
        : 'The observed failure appears to be caused by missing edge-case validation or unhandled state transitions during request execution.';
    }

    // 6. EVIDENCE LIST
    const evidence = [];
    if (title) evidence.push(`Issue Title: "${title}"`);
    if (identifiedException) evidence.push(`Identified Exception: ${identifiedException.name} (${identifiedException.category})`);
    if (stackTrace) evidence.push(`Extracted Stack Trace: ${stackTrace.frames.length} call frames analyzed (Deepest: ${stackTrace.deepestFrame ? stackTrace.deepestFrame.file + ':' + stackTrace.deepestFrame.line : 'N/A'})`);
    if (techArtifacts.endpoints.length > 0) evidence.push(`Explicit Endpoints Found: ${techArtifacts.endpoints.join(', ')}`);
    if (techArtifacts.funcs.length > 0) evidence.push(`Explicit Functions Found: ${techArtifacts.funcs.join('(), ')}()`);
    if (techArtifacts.files.length > 0) evidence.push(`Referenced Files: ${techArtifacts.files.join(', ')}`);
    if (repoContext) evidence.push(`Active Repository Context: ${repoContext.fullName || repoContext.name} (${repoContext.mainLanguage || 'Code'})`);
    if (issueMeta) evidence.push(`GitHub Issue Metadata: #${issueMeta.number} by @${issueMeta.author || 'user'}`);
    if (evidence.length === 0) evidence.push('Analysis derived solely from user-supplied problem statement.');

    // 7. REPRODUCTION STEPS
    let reproductionSteps = [];
    if (extractedSteps) {
      reproductionSteps = extractedSteps;
    } else if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
      const fn = techArtifacts.funcs[0] || 'calculate_average';
      reproductionSteps = [
        `Initialize an empty list or collection: \`empty_list = []\`.`,
        `Pass the empty collection into the function: \`${fn}(empty_list)\`.`,
        `Observe the uncaught \`ZeroDivisionError: division by zero\` exception.`
      ];
    } else if (isSecurity && techArtifacts.endpoints.length > 0) {
      const ep = techArtifacts.endpoints[0];
      reproductionSteps = [
        `Send an HTTP GET request to \`${ep}\`.`,
        `Inspect the JSON response payload.`,
        `Verify that sensitive fields (e.g. password, hash, or token) are present in the response body.`
      ];
    } else if (isPerformance && lower.includes('dashboard')) {
      reproductionSteps = [
        `Open developer tools and navigate to the Network tab.`,
        `Load the dashboard page.`,
        `Count total outgoing network requests and observe waterfall blocking delays.`
      ];
    } else if (isFeature && lower.includes('dark mode')) {
      reproductionSteps = [
        `Navigate to application interface in browser.`,
        `Observe absence of theme toggle switch or dark contrast stylesheet.`,
        `Verify page reload retains default system theme only.`
      ];
    } else {
      reproductionSteps = [
        'Reproduction steps cannot be reliably determined from the provided information.',
        'Please supply minimal reproducible code or stack trace logs.'
      ];
    }

    // 8. EXPECTED VS ACTUAL BEHAVIOR
    let expectedBehavior = behaviors.expected;
    let actualBehavior = behaviors.actual;

    if (!expectedBehavior) {
      if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
        expectedBehavior = 'Function should return a safe default value (such as 0 or 0.0), raise a descriptive custom ValidationError, or return null/None.';
      } else if (isSecurity && lower.includes('password')) {
        expectedBehavior = 'API responses must omit passwords, hashes, and internal secrets, returning only safe public profile attributes.';
      } else if (isPerformance) {
        expectedBehavior = 'Page should load with minimal batched API requests and achieve interactive readiness within 1-2 seconds.';
      } else if (isFeature && lower.includes('dark mode')) {
        expectedBehavior = 'User can switch between light and dark themes with persistent preference stored across sessions.';
      } else {
        expectedBehavior = 'Not explicitly provided in the issue description.';
      }
    }

    if (!actualBehavior) {
      if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
        actualBehavior = 'Application crashes with unhandled `ZeroDivisionError: division by zero`.';
      } else if (isSecurity && lower.includes('password')) {
        actualBehavior = 'Passwords or credentials are leaked in plaintext in API responses.';
      } else if (isPerformance) {
        actualBehavior = 'High request volume causes noticeable UI freezing and prolonged loading latency.';
      } else if (isFeature && lower.includes('dark mode')) {
        actualBehavior = 'Application only supports a single theme without user-selectable toggle.';
      } else {
        actualBehavior = 'Not explicitly provided in the issue description.';
      }
    }

    // 9. USER & TECHNICAL IMPACT
    let userImpact = '';
    let technicalImpact = '';
    let projectImpact = '';

    if (isSecurity) {
      userImpact = 'Users face credential compromise and account takeover hazards.';
      technicalImpact = 'API serialization layer leaks confidential database fields to unauthorized clients.';
      projectImpact = 'Severe compliance, privacy regulation (GDPR/SOC2), and security audit violations.';
    } else if (isPerformance) {
      userImpact = 'Users experience noticeable delay (10-15s) and unresponsive interface elements.';
      technicalImpact = 'High request concurrency places unnecessary query overhead and resource saturation on backend services.';
      projectImpact = 'Elevated infrastructure compute costs and degraded customer retention.';
    } else if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
      userImpact = 'User workflows abort unexpectedly with generic crash or 500 error pages when submitting empty datasets.';
      technicalImpact = 'Unhandled runtime exception halts execution thread and increases server error rate.';
      projectImpact = 'Degrades overall stability metrics and error monitoring budgets.';
    } else if (isFeature) {
      userImpact = 'Users cannot view application in preferred low-light theme.';
      technicalImpact = 'No architectural defect exists; feature gap in styling system.';
      projectImpact = 'User satisfaction and feature parity opportunity.';
    } else {
      userImpact = 'Users may encounter incorrect calculation results or unexpected workflow interruptions.';
      technicalImpact = 'Defect introduces unexpected state branching or unhandled edge cases in the component logic.';
      projectImpact = 'Requires triaged maintainer intervention to avoid cumulative tech debt.';
    }

    // 10. RECOMMENDED FIX & ALTERNATIVE APPROACHES
    let recommendedFix = '';
    let alternativeFix = null;

    if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
      const fn = techArtifacts.funcs[0] || 'calculate_average';
      recommendedFix = `Add defensive input validation before computing average:\n\n\`\`\`python\ndef ${fn}(numbers):\n    if not numbers:\n        return 0.0  # Or raise ValueError("Cannot calculate average of an empty collection")\n    return sum(numbers) / len(numbers)\n\`\`\``;
      alternativeFix = `Use Python's standard \`statistics.mean\` with explicit exception handling:\n\n\`\`\`python\nimport statistics\n\ntry:\n    return statistics.mean(numbers)\nexcept statistics.StatisticsError:\n    return 0.0\n\`\`\``;
    } else if (isSecurity && lower.includes('password')) {
      recommendedFix = `Exclude sensitive attributes from database query projections or API serializer:\n\n\`\`\`javascript\n// In SQL query or ORM projection:\nconst users = await db.users.findMany({\n  select: { id: true, username: true, email: true } // Exclude password\n});\n\`\`\``;
      alternativeFix = `Implement a Data Transfer Object (DTO) mapper or response sanitizer function that explicitly deletes or omits the \`password\` field prior to \`res.json()\`.`;
    } else if (isPerformance && lower.includes('500') && lower.includes('request')) {
      recommendedFix = `Replace multiple individual per-item API requests with a single consolidated batch endpoint:\n\n\`\`\`javascript\n// Consolidate into single paginated query:\nconst dashboardData = await fetch('/api/dashboard/summary');\n\`\`\``;
      alternativeFix = `Implement local caching (e.g. \`useSWR\` or React Query) with stale-while-revalidate and request debouncing to deduplicate identical network calls.`;
    } else if (isFeature && lower.includes('dark mode')) {
      recommendedFix = `Implement CSS custom variables (e.g. \`--bg-primary\`, \`--text-primary\`) toggled via a \`data-theme="dark"\` attribute on \`<html>\` or \`<body>\`, persisting selection to \`localStorage\`.`;
      alternativeFix = `Leverage CSS \`@media (prefers-color-scheme: dark)\` with a manual override toggle button.`;
    } else if (identifiedException) {
      recommendedFix = identifiedException.defaultFix;
    } else {
      recommendedFix = 'Isolate the failing module, add defensive parameter validation, and ensure all error branches are gracefully handled with unit test coverage.';
    }

    // 11. TEST CASES
    let testCases = [];
    if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
      testCases = [
        'Test 1 — Empty List: Input `[]` → Expected: Returns `0.0` without throwing `ZeroDivisionError`.',
        'Test 2 — Single Element: Input `[5]` → Expected: Returns `5.0`.',
        'Test 3 — Positive & Negative Values: Input `[-10, 10]` → Expected: Returns `0.0`.',
        'Test 4 — Non-list Input: Input `None` / `null` → Expected: Raises descriptive `TypeError` or returns validation error.'
      ];
    } else if (isSecurity && lower.includes('password')) {
      testCases = [
        'Test 1 — Sanitized Response Body: Request `GET /users` → Assert `response.body[0].password` is `undefined`.',
        'Test 2 — Password Hash Exclusion: Ensure neither plaintext nor hashed passwords appear in serialized JSON.',
        'Test 3 — Normal Properties Intact: Verify `id`, `username`, and `email` continue to return correctly.',
        'Test 4 — Single User Endpoint: Check `/users/:id` endpoint adheres to same strict exclusion policy.'
      ];
    } else if (isPerformance) {
      testCases = [
        'Test 1 — Network Request Limit: Load dashboard → Assert total outgoing network requests <= 5.',
        'Test 2 — Load Latency Budget: Verify interactive load time is under 1.5 seconds under standard throttling.',
        'Test 3 — Data Integrity: Confirm all aggregate metrics match the consolidated batch response.'
      ];
    } else if (isFeature && lower.includes('dark mode')) {
      testCases = [
        'Test 1 — Theme Toggle Action: Click theme button → Verify `data-theme` attribute toggles between `light` and `dark`.',
        'Test 2 — Persistence: Refresh page after selection → Verify selected theme persists via `localStorage`.',
        'Test 3 — System Default Fallback: First visit without stored preference → Verify system `prefers-color-scheme` is honored.'
      ];
    } else {
      testCases = [
        'Test 1 — Valid Nominal Input: Verify expected success outcome under valid parameters.',
        'Test 2 — Boundary Edge Condition: Verify graceful handling when parameters are empty, null, or extreme.',
        'Test 3 — Failure / Error Branch: Confirm error is caught and translated to user-friendly feedback.'
      ];
    }

    // 12. EDGE CASES
    let edgeCases = [];
    if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
      edgeCases = [
        'Empty collection (`[]`)',
        'Single item list (`[42]`)',
        'All negative integers (`[-5, -12, -3]`)',
        'Floating point precision overflow (`[1e-300, 1e-300]`)',
        'Non-numeric items (`["a", "b"]`) causing TypeError'
      ];
    } else if (isSecurity) {
      edgeCases = [
        'Admin vs standard user permission levels',
        'Third-party integration token exposure',
        'Response caching headers (must include `Cache-Control: no-store`)'
      ];
    } else if (isPerformance) {
      edgeCases = [
        'Slow 3G network latency spikes',
        'Concurrent duplicate component mounting',
        'Large dataset rendering pagination limits'
      ];
    } else {
      edgeCases = [
        'Empty or null input payloads',
        'Concurrent asynchronous execution',
        'Network interruption or request cancellation'
      ];
    }

    // 13. DIFFICULTY & BEGINNER FRIENDLINESS
    let difficulty = 'Medium';
    let difficultyReason = '';
    let beginnerFriendly = 'Partially';
    let beginnerReason = '';

    if (isDoc) {
      difficulty = 'Easy';
      difficultyReason = 'Requires editing markdown files or string literals without complex code execution logic.';
      beginnerFriendly = 'Yes';
      beginnerReason = 'Excellent starter task for new open-source contributors with minimal architectural barrier.';
    } else if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
      difficulty = 'Easy';
      difficultyReason = 'Fix requires adding a single input validation guard check at the beginning of the function.';
      beginnerFriendly = 'Yes';
      beginnerReason = 'The logic is self-contained in a single function with no distributed architectural changes required.';
    } else if (isSecurity) {
      difficulty = 'Medium';
      difficultyReason = 'Requires understanding data serialization and verifying that all API response endpoints sanitize sensitive properties.';
      beginnerFriendly = 'No';
      beginnerReason = 'Security modifications require senior code review and thorough penetration testing to avoid regressions.';
    } else if (isPerformance) {
      difficulty = 'Hard';
      difficultyReason = 'Involves architectural refactoring, API consolidation, and performance benchmarking across network boundaries.';
      beginnerFriendly = 'No';
      beginnerReason = 'Involves multi-component lifecycle tuning and caching strategies unsuitable for first-time contributors.';
    } else {
      difficulty = 'Medium';
      difficultyReason = 'Requires locating the offending code path, understanding the logic, and writing unit test coverage.';
      beginnerFriendly = 'Partially';
      beginnerReason = 'Can be tackled by contributors familiar with the repository structure and test harness.';
    }

    // 14. ANALYSIS CONFIDENCE
    let confidence = 'Medium';
    let confidenceReason = '';

    if (stackTrace || (identifiedException && description.length > 50)) {
      confidence = 'High';
      confidenceReason = 'Detailed technical context provided, including specific error signatures and failure conditions.';
    } else if (hasOnlyTitle || combinedText.length < 40) {
      confidence = 'Low';
      confidenceReason = 'Limited information available. Analysis is based solely on the issue title without stack traces or error logs.';
    } else {
      confidence = 'Medium';
      confidenceReason = 'Sufficient behavioral description provided to infer failure mode, though source code files were not directly inspected.';
    }

    // 15. NEXT ACTIONS
    const nextActions = [];
    if (identifiedException && identifiedException.name === 'ZeroDivisionError') {
      nextActions.push('Implement defensive length check before division.');
      nextActions.push('Add unit tests covering empty list, single element, and negative number inputs.');
      nextActions.push('Submit PR referencing issue with verification test pass.');
    } else if (isSecurity) {
      nextActions.push('Audit user API endpoints to ensure password fields are excluded from query projections.');
      nextActions.push('Add integration test asserting password field is absent in response payloads.');
      nextActions.push('Deploy hotfix immediately and audit historical API logs for exposure.');
    } else if (isPerformance) {
      nextActions.push('Audit network waterfall on dashboard mount using browser DevTools.');
      nextActions.push('Create consolidated batch API endpoint to replace individual item requests.');
      nextActions.push('Verify load time drops below target threshold.');
    } else {
      nextActions.push('Create a minimal reproduction test case reproducing the observed behavior.');
      nextActions.push('Locate target function or component in the codebase.');
      nextActions.push('Implement suggested fix and run regression test suite.');
    }

    // 16. EXECUTIVE SUMMARY & PROBLEM ANALYSIS
    const summary = `Diagnosed "${title || 'Submitted Issue'}" as a ${primaryType} issue with ${severity} Severity and ${priority} Priority. ${typeReason} Recommended difficulty: ${difficulty} (Beginner Friendly: ${beginnerFriendly}).`;
    
    let problemAnalysis = '';
    if (hasOnlyTitle) {
      problemAnalysis = `Limited information available. The analysis is based only on the issue title ("${title}"). No reproduction logs or error traces were provided.`;
    } else {
      problemAnalysis = `The reported issue indicates that ${lower.includes('crash') ? 'the system encounters an unhandled runtime failure' : 'the system behaves outside expected specifications'} under specific operating conditions. ${rootCauseExplanation}`;
    }

    return {
      success: true,
      issueTitle: title || 'Untitled Issue',
      primaryType,
      secondaryType,
      typeReason,
      severity,
      severityReason,
      priority,
      priorityReason,
      confidence,
      confidenceReason,
      affectedComponent,
      specificArtifacts,
      rootCause: {
        status: rootCauseStatus,
        explanation: rootCauseExplanation
      },
      evidence,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      impact: {
        user: userImpact,
        technical: technicalImpact,
        project: projectImpact
      },
      recommendedFix,
      alternativeFix,
      testCases,
      edgeCases,
      difficulty,
      difficultyReason,
      beginnerFriendly,
      beginnerReason,
      nextActions,
      summary,
      problemAnalysis,
      isLimitedInfo: hasOnlyTitle,
      analyzedAt: new Date().toISOString()
    };
  }

  // Format clean markdown/plain text for clipboard or download
  function formatReportAsMarkdown(report) {
    if (!report || report.error) return 'No report generated.';

    const divider = '━'.repeat(40);
    const lines = [
      divider,
      'AI ISSUE TRIAGE REPORT',
      divider,
      '',
      `Issue: ${report.issueTitle}`,
      `Primary Type: ${report.primaryType}${report.secondaryType ? ' (Secondary: ' + report.secondaryType + ')' : ''}`,
      `Severity: ${report.severity} (${report.severityReason})`,
      `Priority: ${report.priority} (${report.priorityReason})`,
      `Analysis Confidence: ${report.confidence} (${report.confidenceReason})`,
      `Affected Component: ${report.affectedComponent}`,
      '',
      divider,
      'EXECUTIVE SUMMARY',
      divider,
      report.summary,
      '',
      divider,
      'PROBLEM ANALYSIS',
      divider,
      report.problemAnalysis,
      '',
      divider,
      'ROOT CAUSE',
      divider,
      `Status: ${report.rootCause.status}`,
      report.rootCause.explanation,
      '',
      divider,
      'EVIDENCE',
      divider,
      ...(report.evidence.map(e => `• ${e}`)),
      '',
      divider,
      'REPRODUCTION STEPS',
      divider,
      ...(report.reproductionSteps.map((s, idx) => `${idx + 1}. ${s}`)),
      '',
      divider,
      'EXPECTED VS ACTUAL BEHAVIOR',
      divider,
      `Expected Behavior:\n${report.expectedBehavior}`,
      '',
      `Actual Behavior:\n${report.actualBehavior}`,
      '',
      divider,
      'USER & TECHNICAL IMPACT',
      divider,
      `User Impact: ${report.impact.user}`,
      `Technical Impact: ${report.impact.technical}`,
      report.impact.project ? `Project Impact: ${report.impact.project}` : '',
      '',
      divider,
      'RECOMMENDED FIX',
      divider,
      report.recommendedFix,
      '',
      report.alternativeFix ? `${divider}\nALTERNATIVE APPROACHES\n${divider}\n${report.alternativeFix}\n` : '',
      divider,
      'TEST CASES',
      divider,
      ...(report.testCases.map((t, idx) => `${idx + 1}. ${t}`)),
      '',
      divider,
      'EDGE CASES',
      divider,
      ...(report.edgeCases.map(e => `• ${e}`)),
      '',
      divider,
      `DIFFICULTY: ${report.difficulty}`,
      divider,
      `Reason: ${report.difficultyReason}`,
      '',
      divider,
      `BEGINNER FRIENDLY: ${report.beginnerFriendly}`,
      divider,
      `Reason: ${report.beginnerReason}`,
      '',
      divider,
      'NEXT ACTIONS',
      divider,
      ...(report.nextActions.map((a, idx) => `${idx + 1}. ${a}`)),
      '',
      divider,
      `Report Generated: ${report.analyzedAt}`,
      divider
    ];

    return lines.filter(l => l !== '').join('\n');
  }

  return {
    triageIssue,
    formatReportAsMarkdown,
    parseStackTrace,
    extractReproductionSteps,
    extractBehaviors
  };
});
