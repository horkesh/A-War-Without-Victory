/**
 * The findings recorder — the durable half of the playtest harness.
 *
 * Drivers come and go; this is the part worth keeping. Two artifacts:
 *
 *   1. `<outDir>/findings.jsonl` — every hit from one run, in emission order,
 *      un-deduped. The evidence record for that run.
 *   2. `docs/40_reports/playtests/findings/FINDINGS.jsonl` — the cross-run ledger,
 *      one line per distinct fingerprint, sorted by fingerprint. Committed.
 *
 * The ledger carries NO wall-clock timestamps, so a re-run that finds the same
 * things produces a byte-identical file and a clean `git diff` means "nothing new
 * broke". Runs are identified by `runId`, which the caller supplies.
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Finding, LedgerEntry, Severity } from './types.js';

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Reduce a title to its invariant shape so the same defect at turn 5 and turn 90
 * dedups to one ledger line. Digits become `#`, quoted/bracketed ids become `<id>`,
 * case and whitespace are flattened.
 */
export function normalizeSignal(title: string): string {
    return title
        .toLowerCase()
        .replace(/`[^`]*`/g, '<id>')
        .replace(/'[^']*'/g, '<id>')
        .replace(/"[^"]*"/g, '<id>')
        .replace(/\[[^\]]*\]/g, '<id>')
        .replace(/\d+(\.\d+)?/g, '#')
        .replace(/\s+/g, ' ')
        .trim();
}

export function fingerprintOf(f: Pick<Finding, 'kind' | 'surface' | 'probe' | 'title'>): string {
    const key = [f.kind, f.surface, f.probe, normalizeSignal(f.title)].join('|');
    return createHash('sha1').update(key, 'utf8').digest('hex').slice(0, 12);
}

/** Collects findings during a run, then merges them into the shared ledger. */
export class FindingsRecorder {
    private readonly raw: Array<Finding & { fingerprint: string; seq: number }> = [];
    private seq = 0;

    constructor(
        private readonly runId: string,
        private readonly runLogPath: string,
    ) {
        mkdirSync(dirname(runLogPath), { recursive: true });
        writeFileSync(runLogPath, '', 'utf8');
    }

    /** Record one finding. Safe to call from inside a probe loop. */
    record(f: Finding): void {
        const fingerprint = fingerprintOf(f);
        const entry = { ...f, fingerprint, seq: this.seq++ };
        this.raw.push(entry);
        appendFileSync(this.runLogPath, JSON.stringify(entry) + '\n', 'utf8');
    }

    recordAll(findings: Finding[] | void): void {
        if (!findings) return;
        for (const f of findings) this.record(f);
    }

    get count(): number {
        return this.raw.length;
    }

    /** Distinct fingerprints seen this run. */
    get distinctCount(): number {
        return new Set(this.raw.map((f) => f.fingerprint)).size;
    }

    /** Everything this run recorded, in emission order. */
    all(): ReadonlyArray<Finding & { fingerprint: string }> {
        return this.raw;
    }

    /**
     * Fold this run into the shared ledger. Returns which fingerprints are new
     * (never seen in any previous run) and which are repeats.
     */
    mergeIntoLedger(ledgerPath: string): { added: LedgerEntry[]; repeated: LedgerEntry[] } {
        const existing = readLedger(ledgerPath);
        const byFingerprint = new Map(existing.map((e) => [e.fingerprint, e]));

        const added: LedgerEntry[] = [];
        const repeated: LedgerEntry[] = [];
        const touchedThisRun = new Set<string>();

        for (const f of this.raw) {
            const prior = byFingerprint.get(f.fingerprint);
            if (!prior) {
                const created: LedgerEntry = {
                    ...stripSeq(f),
                    occurrences: 1,
                    runs: [this.runId],
                    first_seen_turn: f.turn,
                    first_seen_run: this.runId,
                    status: 'open',
                };
                byFingerprint.set(f.fingerprint, created);
                added.push(created);
                touchedThisRun.add(f.fingerprint);
                continue;
            }

            prior.occurrences += 1;
            if (!prior.runs.includes(this.runId)) prior.runs.push(this.runId);
            // Keep the worst severity ever observed — a defect that was `low` once and
            // `critical` later is a critical defect.
            if (SEVERITY_RANK[f.severity] < SEVERITY_RANK[prior.severity]) prior.severity = f.severity;
            if (!touchedThisRun.has(f.fingerprint)) {
                repeated.push(prior);
                touchedThisRun.add(f.fingerprint);
            }
        }

        writeLedger(ledgerPath, [...byFingerprint.values()]);
        return { added, repeated };
    }
}

function stripSeq<T extends { seq?: number }>(f: T): Omit<T, 'seq'> {
    const { seq: _seq, ...rest } = f;
    return rest;
}

export function readLedger(ledgerPath: string): LedgerEntry[] {
    if (!existsSync(ledgerPath)) return [];
    return readFileSync(ledgerPath, 'utf8')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as LedgerEntry);
}

/**
 * Write the ledger sorted by (severity, surface, fingerprint) — a total order that
 * does not depend on discovery sequence, so re-runs diff cleanly.
 */
export function writeLedger(ledgerPath: string, entries: LedgerEntry[]): void {
    mkdirSync(dirname(ledgerPath), { recursive: true });
    const sorted = [...entries].sort(
        (a, b) =>
            SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
            a.surface.localeCompare(b.surface) ||
            a.fingerprint.localeCompare(b.fingerprint),
    );
    writeFileSync(ledgerPath, sorted.map((e) => JSON.stringify(e)).join('\n') + (sorted.length ? '\n' : ''), 'utf8');
}
