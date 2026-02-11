/**
 * Phase C.1: mun1990_id semantics AUDIT (audit-only; no fixes).
 *
 * Verifies that every settlement in settlements_index_1990.json has:
 * 1) mun1990_id matching ^[a-z0-9_]+$
 * 2) mun1990_id present in the canonical registry (municipalities_1990_registry_110.json)
 *
 * Rationale: docs/FORAWWV_addendum_draft_mun1990_id.md
 * Deterministic: stable sorting, no timestamps. Uses mistake guard.
 *
 * Inputs (read-only):
 * - data/derived/settlements_index_1990.json
 * - data/source/municipalities_1990_registry_110.json
 *
 * Outputs:
 * - docs/audits/phase_c1_mun1990_id_semantics.json
 * - docs/audits/phase_c1_mun1990_id_semantics.md
 *
 * Exit: 0 only if both invalid_format_count and not_in_registry_count are 0; 1 otherwise.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const MUN1990_FORMAT = /^[a-z0-9_]+$/;
const MAX_EXAMPLES = 25;


interface SettlementRecord {
  sid?: string;
  source_id?: string;
  mun1990_id?: string;
  [k: string]: unknown;
}

interface SettlementsIndex {
  settlements?: SettlementRecord[];
  [k: string]: unknown;
}

interface RegistryRow {
  mun1990_id: string;
  [k: string]: unknown;
}

interface RegistryFile {
  rows?: RegistryRow[];
  [k: string]: unknown;
}

interface AuditReport {
  task: string;
  settlements_total: number;
  invalid_format_count: number;
  not_in_registry_count: number;
  examples_invalid_format: Array<{ sid: string; mun1990_id: string }>;
  examples_not_in_registry: Array<{ sid: string; mun1990_id: string }>;
  invalid_format_sids: string[];
  not_in_registry_sids: string[];
}

function getSid(s: SettlementRecord): string {
  if (typeof s.sid === 'string' && s.sid.length > 0) return s.sid;
  if (typeof s.source_id === 'string' && s.source_id.length > 0) return s.source_id;
  return '';
}

async function main(): Promise<void> {
  const indexPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');
  const registryPath = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
  const outJsonPath = resolve(ROOT, 'docs/audits/phase_c1_mun1990_id_semantics.json');
  const outMdPath = resolve(ROOT, 'docs/audits/phase_c1_mun1990_id_semantics.md');

  const [indexText, registryText] = await Promise.all([
    readFile(indexPath, 'utf8'),
    readFile(registryPath, 'utf8')
  ]);

  const indexData = JSON.parse(indexText) as SettlementsIndex;
  const registryData = JSON.parse(registryText) as RegistryFile;
  const settlements: SettlementRecord[] = Array.isArray(indexData.settlements) ? indexData.settlements : [];
  const registryRows: RegistryRow[] = Array.isArray(registryData.rows) ? registryData.rows : [];

  const validMun1990Ids = new Set<string>();
  for (const row of registryRows) {
    if (typeof row.mun1990_id === 'string') validMun1990Ids.add(row.mun1990_id);
  }

  const invalidFormatSids: string[] = [];
  const invalidFormatExamples: Array<{ sid: string; mun1990_id: string }> = [];
  const notInRegistrySids: string[] = [];
  const notInRegistryExamples: Array<{ sid: string; mun1990_id: string }> = [];

  for (const s of settlements) {
    const sid = getSid(s);
    const raw = s.mun1990_id;
    const mun1990Id = typeof raw === 'string' ? raw : '';

    if (mun1990Id === '' || !MUN1990_FORMAT.test(mun1990Id)) {
      invalidFormatSids.push(sid);
      if (invalidFormatExamples.length < MAX_EXAMPLES) {
        invalidFormatExamples.push({ sid, mun1990_id: mun1990Id || '(missing)' });
      }
      continue;
    }

    if (!validMun1990Ids.has(mun1990Id)) {
      notInRegistrySids.push(sid);
      if (notInRegistryExamples.length < MAX_EXAMPLES) {
        notInRegistryExamples.push({ sid, mun1990_id: mun1990Id });
      }
    }
  }

  invalidFormatSids.sort((a, b) => a.localeCompare(b));
  notInRegistrySids.sort((a, b) => a.localeCompare(b));

  const report: AuditReport = {
    task: 'phase_c1_mun1990_id_semantics',
    settlements_total: settlements.length,
    invalid_format_count: invalidFormatSids.length,
    not_in_registry_count: notInRegistrySids.length,
    examples_invalid_format: invalidFormatExamples,
    examples_not_in_registry: notInRegistryExamples,
    invalid_format_sids: invalidFormatSids,
    not_in_registry_sids: notInRegistrySids
  };

  await mkdir(dirname(outJsonPath), { recursive: true });
  await writeFile(outJsonPath, JSON.stringify(report, null, 2), 'utf8');

  const mdLines: string[] = [
    '# Phase C.1 mun1990_id semantics audit',
    '',
    '**Task:** ' + report.task,
    '**Rationale:** docs/FORAWWV_addendum_draft_mun1990_id.md',
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Settlements total | ${report.settlements_total} |`,
    `| Invalid format count | ${report.invalid_format_count} |`,
    `| Not in registry count | ${report.not_in_registry_count} |`,
    '',
    '**Format requirement:** `mun1990_id` MUST match regex: `^[a-z0-9_]+$` (lowercase, ASCII, underscores only). Missing or empty is invalid.',
    '',
    '**Registry:** Canonical list from `data/source/municipalities_1990_registry_110.json`. Any `mun1990_id` that passes format but is not in the registry is reported as not_in_registry.',
    '',
    '---',
    '',
    '## Examples (first 25 per class)',
    '',
    '### Invalid format',
    ''
  ];
  if (report.examples_invalid_format.length === 0) {
    mdLines.push('(none)');
  } else {
    for (const ex of report.examples_invalid_format) {
      mdLines.push(`- sid: \`${ex.sid}\`, mun1990_id: \`${ex.mun1990_id}\``);
    }
  }
  mdLines.push('', '### Not in registry', '');
  if (report.examples_not_in_registry.length === 0) {
    mdLines.push('(none)');
  } else {
    for (const ex of report.examples_not_in_registry) {
      mdLines.push(`- sid: \`${ex.sid}\`, mun1990_id: \`${ex.mun1990_id}\``);
    }
  }
  mdLines.push(
    '',
    '---',
    '',
    '**Audit-only; no normalization applied.**',
    '',
    'If this audit reveals additional systemic identity drift beyond mun1990_id (e.g. other id fields storing display names), **docs/FORAWWV.md may need an addendum** — do not edit automatically.'
  );

  await writeFile(outMdPath, mdLines.join('\n'), 'utf8');

  const ok = report.invalid_format_count === 0 && report.not_in_registry_count === 0;
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('audit_mun1990_id_semantics failed', err);
  process.exitCode = 1;
});
