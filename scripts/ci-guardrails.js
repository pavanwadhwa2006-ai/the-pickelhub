/**
 * CI Guardrails Check Script
 *
 * Scans the codebase to prevent:
 * 1. Hardcoded mock/dummy data arrays or objects in production UI components (Rule D).
 * 2. Dead/unwired interactive buttons or links (Rule C).
 *
 * Runs as part of `npm run ci:guardrails` and CI pipelines.
 */

const fs = require('fs');
const path = require('path');

const CLIENT_SRC = path.resolve(__dirname, '../client/src');

let issues = [];

/**
 * Recursively list all files in directory
 */
const getFiles = (dir, filterExt = ['.jsx', '.js', '.tsx', '.ts']) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.test.') && !file.includes('dist')) {
        results = results.concat(getFiles(fullPath, filterExt));
      }
    } else {
      const ext = path.extname(file);
      if (filterExt.includes(ext) && !file.includes('.test.')) {
        results.push(fullPath);
      }
    }
  });
  return results;
};

// Patterns indicating potential mock/placeholder data
const MOCK_DATA_PATTERNS = [
  { pattern: /\b(const|let|var)\s+(mock[A-Z0-9_]+|dummy[A-Z0-9_]+|fake[A-Z0-9_]+|sample[A-Z0-9_]+)\s*=/i, name: 'Mock/Sample variable definition' },
  { pattern: /\b(MOCK_DATA|DUMMY_DATA|SAMPLE_PLAYERS|MOCK_PLAYERS|MOCK_MATCHES)\b/, name: 'Mock data constant' },
  { pattern: /\{\s*name:\s*['"](John Doe|Jane Doe|Alex Smith|Bob Johnson|Alice Walker)['"]/i, name: 'Generic fake player name fixture' },
];

/**
 * Scan a single file for violations
 */
const scanFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
  const lines = content.split('\n');

  // 1. Check for mock data patterns
  lines.forEach((line, idx) => {
    MOCK_DATA_PATTERNS.forEach(({ pattern, name }) => {
      if (pattern.test(line)) {
        issues.push({
          file: relPath,
          line: idx + 1,
          type: 'MOCK_DATA',
          message: `Detected potential mock data pattern (${name}): "${line.trim().slice(0, 80)}"`,
        });
      }
    });
  });

  // 2. Check for dead buttons (button tags without onClick, type="submit", type="reset", or disabled)
  const buttonRegex = /<button\b([^>]*)>/gi;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const attrs = match[1];
    const hasOnClick = /onClick\s*=/i.test(attrs);
    const isSubmitOrReset = /type\s*=\s*['"](submit|reset)['"]/i.test(attrs);
    const hasForm = /form\s*=/i.test(attrs);
    const isDisabled = /disabled\b/i.test(attrs);

    if (!hasOnClick && !isSubmitOrReset && !hasForm && !isDisabled) {
      // Find line number
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: relPath,
        line: lineNum,
        type: 'DEAD_BUTTON',
        message: `Interactive <button> without onClick, type="submit", or form handler wired: "<button ${attrs.trim().slice(0, 60)}...>"`,
      });
    }
  }

  // 3. Check for dead links (<a href="#" or Link to="#" with no onClick)
  const deadLinkRegex = /<(a|Link)\b([^>]*)\b(href|to)\s*=\s*['"]#['"]([^>]*)>/gi;
  while ((match = deadLinkRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const hasOnClick = /onClick\s*=/i.test(fullTag);
    if (!hasOnClick) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: relPath,
        line: lineNum,
        type: 'DEAD_LINK',
        message: `Dead link with href="#" or to="#" without an onClick handler: "${fullTag.slice(0, 70)}"`,
      });
    }
  }
};

console.log('🔍 Running CI Guardrails: Checking for mock data and dead interactive elements...\n');

const files = getFiles(CLIENT_SRC);
files.forEach(scanFile);

if (issues.length > 0) {
  console.error(`❌ CI Guardrail Violations Found (${issues.length} issue(s)):\n`);
  issues.forEach((iss) => {
    console.error(`  [${iss.type}] ${iss.file}:${iss.line}`);
    console.error(`    ${iss.message}\n`);
  });
  process.exit(1);
} else {
  console.log(`✅ CI Guardrails Passed: Scanned ${files.length} UI files. Zero mock data and zero dead interactive elements found.\n`);
  process.exit(0);
}
