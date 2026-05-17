#!/usr/bin/env node
/* eslint-disable no-console */
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..', '..');
const serializePath = resolve(root, 'src', 'state', 'serialize.ts');
const migrationPath = resolve(root, 'src', 'state', 'save_migration.ts');
const validatePath = resolve(root, 'src', 'state', 'validateGameState.ts');
const outputPath = resolve(root, 'tools', 'diagnostics', 'output', 'save_migration_drift.json');

function strictCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

function extractFunctionBody(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const ch = source[index];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  return '';
}

function collectAnonymousDefaults(migrateBody) {
  const fields = new Set();
  const patterns = [
    /(?:^|[^\w])(?:if\s*\([^)]*)?([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*===\s*undefined/g,
    /(?:^|[^\w])([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\?\?=/g,
    /!\(\s*['"`]([A-Za-z_$][\w$]*)['"`]\s+in\s+([A-Za-z_$][\w$]*)\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of migrateBody.matchAll(pattern)) {
      if (pattern.source.startsWith('!')) {
        fields.add(`${match[2]}.${match[1]}`);
      } else {
        fields.add(`${match[1]}.${match[2]}`);
      }
    }
  }

  return [...fields]
    .filter((field) => !field.startsWith('candidate.schema_version'))
    .sort(strictCompare);
}

function collectMigrationVersions(source) {
  return [...source.matchAll(/registerMigration\s*\(\s*\{\s*version:\s*(\d+),\s*description:\s*'([^']+)'/g)]
    .map((match) => ({ version: Number(match[1]), description: match[2] }))
    .sort((a, b) => a.version - b.version);
}

function collectRequiredFields(source) {
  return [...source.matchAll(/\{\s*version:\s*(\d+),\s*path:\s*'([^']+)'/g)]
    .map((match) => ({ version: Number(match[1]), path: match[2] }))
    .sort((a, b) => a.version - b.version || strictCompare(a.path, b.path));
}

const serializeSource = read(serializePath);
const migrationSource = read(migrationPath);
const validateSource = read(validatePath);
const migrateBody = extractFunctionBody(serializeSource, 'migrateState');
const anonymousDefaults = collectAnonymousDefaults(migrateBody);
const migrations = collectMigrationVersions(migrationSource);
const requiredFields = collectRequiredFields(validateSource);
const latest = migrations.length === 0 ? 0 : Math.max(...migrations.map((entry) => entry.version));

const report = {
  generated_by: 'tools/diagnostics/save_migration_drift_audit.cjs',
  latest_schema_version: latest,
  registered_migration_count: migrations.length,
  strict_required_field_count: requiredFields.length,
  anonymous_default_count: anonymousDefaults.length,
  fields: anonymousDefaults.map((field) => ({
    field,
    added_when: 'unknown',
    default_needed: true,
    current_load_behavior: 'version-anonymous default in serialize.ts:migrateState',
    proposed_migration_version: latest + 1,
  })),
  migrations,
  required_fields: requiredFields,
};

mkdirSync(resolve(root, 'tools', 'diagnostics', 'output'), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`save migration drift audit: ${anonymousDefaults.length} anonymous defaults`);
