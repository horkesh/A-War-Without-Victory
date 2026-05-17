#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_ESSAYS_DIR = path.join(process.cwd(), 'data', 'scenarios', 'essays');
const ICTY_CASE_RE = /\bIT-\d{2}-\d+(?:\/\d+)?(?:-[A-Z])?\b/;
const SOURCE_FLOORS = Object.freeze({
  diplomatic: 2,
  humanitarian: 2,
  military: 2,
  political: 2,
});

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function hasValidIctyCaseNumber(source) {
  return typeof source === 'string' && ICTY_CASE_RE.test(source);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function listEssayFiles(essaysDir) {
  const entries = await fs.readdir(essaysDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'essay_index.json')
    .map((entry) => entry.name)
    .sort(compareText);
}

function makeIssue(severity, code, file, message, details = {}) {
  return { severity, code, file, message, details };
}

async function auditEssaySources(options = {}) {
  const essaysDir = options.essaysDir ?? DEFAULT_ESSAYS_DIR;
  const files = await listEssayFiles(essaysDir);
  const issues = [];
  const categoryCounts = {};
  const categorySourceMinimums = {};
  const essays = [];

  for (const file of files) {
    const essay = await readJson(path.join(essaysDir, file));
    const category = essay.category ?? 'uncategorized';
    const sources = Array.isArray(essay.sources) ? essay.sources : [];
    essays.push({ file, category, sources });
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    categorySourceMinimums[category] = Math.min(categorySourceMinimums[category] ?? sources.length, sources.length);

    sources.forEach((source, index) => {
      if (/ICTY/i.test(String(source)) && !hasValidIctyCaseNumber(source)) {
        issues.push(makeIssue(
          'ERROR',
          'ICTY_CASE_FORMAT',
          file,
          `ICTY source ${index + 1} does not contain a narrow IT case number.`,
          { source },
        ));
      }
    });

    const floor = SOURCE_FLOORS[category];
    if (typeof floor === 'number' && sources.length < floor) {
      issues.push(makeIssue(
        'WARNING',
        'SOURCE_FLOOR_EXCEPTION',
        file,
        `${category} essay has ${sources.length} source(s), below the editorial floor of ${floor}. Route to historian/editor review rather than padding weak citations.`,
        { category, sourceCount: sources.length, floor },
      ));
    }
  }

  const sortedCategoryCounts = {};
  const sortedCategorySourceMinimums = {};
  for (const category of Object.keys(categoryCounts).sort(compareText)) {
    sortedCategoryCounts[category] = categoryCounts[category];
  }
  for (const category of Object.keys(categorySourceMinimums).sort(compareText)) {
    sortedCategorySourceMinimums[category] = categorySourceMinimums[category];
  }

  issues.sort((a, b) => (
    compareText(a.file, b.file)
    || compareText(a.code, b.code)
    || compareText(a.message, b.message)
  ));

  const errorCount = issues.filter((issue) => issue.severity === 'ERROR').length;

  return {
    summary: {
      essayCount: essays.length,
      categoryCounts: sortedCategoryCounts,
      categorySourceMinimums: sortedCategorySourceMinimums,
    },
    policy: {
      sourceFloors: SOURCE_FLOORS,
      ictyCasePattern: ICTY_CASE_RE.source,
    },
    issues,
    exitCode: errorCount > 0 ? 1 : 0,
  };
}

function formatMarkdown(result) {
  const lines = [
    '# Codex Source Quality Audit',
    '',
    `Essays audited: ${result.summary.essayCount}`,
    '',
    '## Category Inventory',
    '',
    '| Category | Essays | Minimum Sources |',
    '|---|---:|---:|',
  ];

  for (const category of Object.keys(result.summary.categoryCounts).sort(compareText)) {
    lines.push(`| ${category} | ${result.summary.categoryCounts[category]} | ${result.summary.categorySourceMinimums[category]} |`);
  }

  lines.push('', '## Findings', '', '| Severity | Code | File | Message |', '|---|---|---|---|');
  if (result.issues.length === 0) {
    lines.push('| INFO | NONE | - | No source quality findings. |');
  } else {
    for (const issue of result.issues) {
      lines.push(`| ${issue.severity} | ${issue.code} | ${issue.file} | ${issue.message} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const markdown = args.includes('--markdown');
  const essaysDirArgIndex = args.indexOf('--essays-dir');
  const outArgIndex = args.indexOf('--out');
  const essaysDir = essaysDirArgIndex >= 0 ? args[essaysDirArgIndex + 1] : DEFAULT_ESSAYS_DIR;
  const result = await auditEssaySources({ essaysDir });

  if (outArgIndex >= 0) {
    const outPath = args[outArgIndex + 1];
    const content = markdown ? formatMarkdown(result) : `${JSON.stringify(result, null, 2)}\n`;
    await fs.writeFile(outPath, content);
  } else if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(formatMarkdown(result));
  }

  process.exitCode = result.exitCode;
}

module.exports = {
  auditEssaySources,
  formatMarkdown,
  hasValidIctyCaseNumber,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
