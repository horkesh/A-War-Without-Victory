/**
 * Render the findings ledger as a readable report.
 *
 * The JSONL ledger is the machine record; this is what a human reads. It follows
 * the shape of `docs/40_reports/playtests/TEMPLATE.md` — bugs before friction, and
 * a "worst friction moments" section — so harness output slots into the existing
 * playtest-diary convention instead of inventing a second one.
 *
 * Usage:
 *   node node_modules/tsx/dist/cli.mjs tools/playtest/rollup.ts [--out <path>] [--open-only]
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_BASE_DIR } from '../ai_play/president_playthrough.js';
import { readLedger } from './findings.js';
import type { LedgerEntry, Severity } from './types.js';

const LEDGER_PATH = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.jsonl');
const DEFAULT_OUT = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.md');

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const BADGE: Record<Severity, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' };

function arg(name: string): string | undefined {
    const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
    if (!hit) return undefined;
    if (hit.includes('=')) return hit.slice(hit.indexOf('=') + 1);
    return process.argv[process.argv.indexOf(hit) + 1];
}

function table(entries: LedgerEntry[]): string {
    if (entries.length === 0) return '_None recorded._\n';
    const rows = entries
        .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.occurrences - a.occurrences)
        .map(
            (e) =>
                `| ${BADGE[e.severity]} ${e.severity} | ${e.status === 'unconfirmed' ? '⚠ _(unconfirmed)_ ' : ''}${e.title} | \`${e.surface}\` | ${e.occurrences}× | ${e.runs.join(', ')} | \`${e.fingerprint}\` |`,
        );
    return [
        '| Severity | Finding | Surface | Hits | Runs | ID |',
        '| --- | --- | --- | --- | --- | --- |',
        ...rows,
        '',
    ].join('\n');
}

function detailBlock(e: LedgerEntry): string {
    return [
        `### ${BADGE[e.severity]} ${e.title}`,
        '',
        `| Field | Entry |`,
        `| --- | --- |`,
        `| Fingerprint | \`${e.fingerprint}\` |`,
        `| Kind / severity | ${e.kind} / ${e.severity} |`,
        `| Surface | \`${e.surface}\` |`,
        `| Probe | \`${e.probe}\` |`,
        `| Occurrences | ${e.occurrences} across ${e.runs.length} run(s) |`,
        `| First seen | run \`${e.first_seen_run}\`, turn ${e.first_seen_turn} |`,
        `| Runs | ${e.runs.join(', ')} |`,
        `| Status | ${e.status ?? 'open'} |`,
        '',
        e.detail,
        '',
        e.repro_note ? `**Repro:** ${e.repro_note}\n` : '',
        e.evidence ? '```json\n' + JSON.stringify(e.evidence, null, 2) + '\n```\n' : '',
    ]
        .filter(Boolean)
        .join('\n');
}

function main(): void {
    const all = readLedger(LEDGER_PATH);
    const openOnly = process.argv.includes('--open-only');
    const entries = openOnly ? all.filter((e) => (e.status ?? 'open') === 'open') : all;

    const bugs = entries.filter((e) => e.kind === 'bug');
    const friction = entries.filter((e) => e.kind === 'friction');
    const anomalies = entries.filter((e) => e.kind === 'anomaly');
    const questions = entries.filter((e) => e.kind === 'question');
    const runs = [...new Set(entries.flatMap((e) => e.runs))].sort();

    // Unconfirmed findings are suspected harness artefacts. They stay in the tables
    // (so nothing is quietly buried) but must never headline the report — otherwise
    // the summary a human reads first is dominated by the harness's own noise.
    const worstFriction = friction
        .filter((e) => e.status !== 'unconfirmed')
        .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.occurrences - a.occurrences)
        .slice(0, 3);

    const md = [
        '# Playtest findings ledger',
        '',
        '> Generated from `FINDINGS.jsonl` by `tools/playtest/rollup.ts`. Do not hand-edit —',
        '> edit the JSONL (e.g. to set `status`) and re-run the rollup.',
        '',
        '**This is a record-only lane.** Findings here are observations from automated',
        'playthroughs; none of them have been fixed by the harness, and a finding being',
        'listed is not a claim that anyone has triaged it.',
        '',
        '## Summary',
        '',
        '| | Count |',
        '| --- | --- |',
        `| Runs contributing | ${runs.length} |`,
        `| Distinct findings | ${entries.length} |`,
        `| 🔴 Critical | ${entries.filter((e) => e.severity === 'critical').length} |`,
        `| 🟠 High | ${entries.filter((e) => e.severity === 'high').length} |`,
        `| Bugs | ${bugs.length} |`,
        `| Friction | ${friction.length} |`,
        `| Anomalies | ${anomalies.length} |`,
        `| Open questions | ${questions.length} |`,
        `| ⚠ Unconfirmed (suspected harness artefact) | ${entries.filter((e) => e.status === 'unconfirmed').length} |`,
        '',
        `**Runs:** ${runs.length ? runs.map((r) => `\`${r}\``).join(', ') : '_none_'}`,
        '',
        '## Three worst friction moments',
        '',
        worstFriction.length === 0
            ? '_None recorded._'
            : worstFriction
                  .map((e, i) => `${i + 1}. ${BADGE[e.severity]} **${e.title}** — \`${e.surface}\`, ${e.occurrences}× · \`${e.fingerprint}\``)
                  .join('\n'),
        '',
        '## Bugs',
        '',
        table(bugs),
        '## Friction',
        '',
        table(friction),
        '## Anomalies',
        '',
        table(anomalies),
        '## Open questions',
        '',
        table(questions),
        '---',
        '',
        '## Detail',
        '',
        ...entries
            .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.surface.localeCompare(b.surface))
            .map(detailBlock),
    ].join('\n');

    const out = arg('out') ?? DEFAULT_OUT;
    writeFileSync(out, md, 'utf8');
    console.log(`Wrote ${entries.length} findings (${bugs.length} bugs, ${friction.length} friction) → ${out}`);
}

main();
