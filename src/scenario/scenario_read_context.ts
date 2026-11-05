/**
 * Per-run scenario-read context (diagnostic; default-off; one-loader scope).
 *
 * WHAT THIS IS. An isolated receipt context for ONE kind of read: the `loadScenario` read. It is
 * handed to `loadScenario(path, context)` as the optional observer and records, per executed read,
 * the exact decoded string that `JSON.parse` receives, its decoded-text hash and its
 * CRLF-normalized-text hash (the SAME `normalizeForHash` the run-provenance stamp uses). It can then
 * be compared, row by row, against the declarative stamp row for the same logical scenario input.
 *
 * WHAT THIS IS NOT. It is not a raw-byte hash (the loader hands over a UTF-8 decoded string), not
 * physical-file or symlink identity (paths are LEXICAL), not coverage of any other loader, not proof
 * of actual-used 31, and not wired into `scenario_runner`. Nothing here touches state, saves,
 * `run_meta`, the stamp rows, the digest or the stamp's path algorithm.
 *
 * ISOLATION. Every context owns its own ordinals and receipts in a closure. There is no
 * module-level mutable state, no env read, no process-global counter. Two contexts (sequential or
 * concurrent) cannot see each other's reads; repeated reads inside one context keep every ordinal and
 * every hash (no first-read dedup).
 *
 * VALIDITY. An observer failure (an exception from an observer callback, reported by the loader
 * through `onObserverError`) or partial normalization evidence makes the proof INVALID. An invalid
 * proof never yields `match`. A stamp row whose `sha256` is null means an unspecified read failure,
 * not demonstrated absence.
 *
 * Determinism: no wall-clock, no RNG, no fs access; hashing is SHA-256 over strings.
 */

import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import type { PlatformPath } from 'node:path';
import { stableStringify } from '../utils/stable_json.js';
import type { ScenarioReadObservation, ScenarioReadObserver } from './scenario_loader.js';
import { normalizeForHash, toRepoRelativePath } from './run_provenance.js';
import type { ConsumedInputHash } from './run_provenance.js';

/** The two path functions the lexical comparison needs (injectable for pure win32/posix string tests). */
export type LexicalPathApi = Pick<PlatformPath, 'resolve' | 'join'>;

/** Status of one recorded read. `read_only` = read recorded, no normalization or parse-failure evidence. */
export type ScenarioReadStatus = 'read_only' | 'read_normalized' | 'read_parse_failed';

export interface ScenarioReadReceipt {
    readonly ordinal: number;
    readonly path_as_passed: string;
    readonly cwd_at_read: string;
    /** Lexical resolution of `path_as_passed` against `cwd_at_read`, computed by the loader. */
    readonly resolved_path: string;
    readonly decoded_char_length: number;
    /** SHA-256 of the decoded string exactly as parsed (NOT normalized). */
    readonly decoded_text_sha256: string;
    /** SHA-256 of `normalizeForHash(decoded)`: the same formula as a stamp row. */
    readonly normalized_text_sha256: string;
    readonly status: ScenarioReadStatus;
    /** Error name when the parse or normalization failed, else null. */
    readonly parse_error_name: string | null;
}

/** The explicit logical association of one scenario input between the loader read and the stamp. */
export interface ScenarioStampAssociation {
    readonly path_as_passed: string;
    /** `toRepoRelativePath(baseDir, path_as_passed)`: the existing stamp row path derivation. */
    readonly declared_row_path: string;
    /** `resolve(join(baseDir, declared_row_path))`: the file the stamp actually reads (lexical). */
    readonly stamped_resolved_path: string;
    /** The stamp row hash for `declared_row_path`; `undefined` = no such row, `null` = null row. */
    readonly stamp_row_sha256: string | null | undefined;
}

export type ReceiptComparisonStatus =
    | 'match'
    | 'hash_mismatch'
    | 'path_identity_mismatch'
    | 'not_a_normalized_use'
    | 'incomplete_evidence'
    /**
     * Reported INSTEAD of `match` for a row whose path and hash agree when the proof as a whole is
     * INVALID (observer failure or partial evidence): equal hash alone is not valid proof. The row's
     * ordinal, `path_equal` and `hash_equal` diagnostic facts are preserved.
     */
    | 'invalid_evidence';

export interface ReceiptComparison {
    readonly ordinal: number;
    readonly status: ReceiptComparisonStatus;
    readonly path_equal: boolean;
    /** Null when the hashes were not compared (no usable stamp hash or non-normalized read). */
    readonly hash_equal: boolean | null;
}

export type OverallComparisonStatus =
    | 'match'
    | 'hash_mismatch'
    | 'path_identity_mismatch'
    | 'repeat_disagreement'
    | 'stamp_null'
    | 'no_stamp_row'
    | 'no_normalized_use'
    | 'no_load_receipt'
    | 'invalid';

export interface ScenarioReadComparison {
    readonly proof_status: 'VALID' | 'INVALID';
    readonly invalid_reasons: readonly string[];
    readonly overall: OverallComparisonStatus;
    readonly association: ScenarioStampAssociation;
    readonly per_read: readonly ReceiptComparison[];
}

/** A scenario-read observer that also owns its receipts and can compare them to a stamp. */
export interface ScenarioReadContext extends ScenarioReadObserver {
    /** Snapshot copy of the receipts, ascending ordinal. */
    receipts(): readonly ScenarioReadReceipt[];
    /** Snapshot copy of the recorded observer-failure descriptions, in order. */
    observerFailures(): readonly string[];
    compareToStamp(args: {
        readonly baseDir: string;
        readonly scenarioPathAsPassed: string;
        readonly stampFiles: readonly ConsumedInputHash[];
        readonly pathApi?: LexicalPathApi;
    }): ScenarioReadComparison;
}

function sha256Hex(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}

function describeFailure(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return `non_error_throw: ${String(error)}`;
}

/**
 * Build the explicit logical association for one scenario input. The row is found by the exact
 * derived row path, never by hash or by taking an arbitrary row; the stamped path is derived the same
 * way the stamp derives it (`join(baseDir, row path)`); no path correction is applied.
 */
export function associateScenarioWithStamp(args: {
    readonly baseDir: string;
    readonly scenarioPathAsPassed: string;
    readonly stampFiles: readonly ConsumedInputHash[];
    readonly pathApi?: LexicalPathApi;
}): ScenarioStampAssociation {
    const pathApi: LexicalPathApi = args.pathApi ?? { resolve, join };
    const declaredRowPath = toRepoRelativePath(args.baseDir, args.scenarioPathAsPassed);
    const row = args.stampFiles.find((file) => file.path === declaredRowPath);
    return {
        path_as_passed: args.scenarioPathAsPassed,
        declared_row_path: declaredRowPath,
        stamped_resolved_path: pathApi.resolve(pathApi.join(args.baseDir, declaredRowPath)),
        stamp_row_sha256: row === undefined ? undefined : row.sha256,
    };
}

/**
 * Compare ONE receipt with the association. Different lexical paths NEVER match, even when the
 * normalized hashes are equal. Only a successfully normalized read is a candidate for `match`.
 */
export function compareReceiptToAssociation(
    receipt: ScenarioReadReceipt,
    association: ScenarioStampAssociation,
): ReceiptComparison {
    const pathEqual = receipt.resolved_path === association.stamped_resolved_path;
    if (receipt.status === 'read_only') {
        return { ordinal: receipt.ordinal, status: 'incomplete_evidence', path_equal: pathEqual, hash_equal: null };
    }
    if (receipt.status === 'read_parse_failed') {
        return { ordinal: receipt.ordinal, status: 'not_a_normalized_use', path_equal: pathEqual, hash_equal: null };
    }
    const stampHash = association.stamp_row_sha256;
    const hashEqual = typeof stampHash === 'string' ? receipt.normalized_text_sha256 === stampHash : null;
    if (!pathEqual) {
        return { ordinal: receipt.ordinal, status: 'path_identity_mismatch', path_equal: false, hash_equal: hashEqual };
    }
    if (hashEqual === true) {
        return { ordinal: receipt.ordinal, status: 'match', path_equal: true, hash_equal: true };
    }
    return { ordinal: receipt.ordinal, status: 'hash_mismatch', path_equal: true, hash_equal: hashEqual };
}

/** Deterministic one-line rendering of a comparison (stable key order). */
export function renderScenarioReadComparison(comparison: ScenarioReadComparison): string {
    return stableStringify(comparison);
}

/** Create an isolated context. All state is in this closure; nothing is module-level. */
export function createScenarioReadContext(): ScenarioReadContext {
    const receipts: ScenarioReadReceipt[] = [];
    const failures: string[] = [];

    function replaceReceipt(index: number, next: ScenarioReadReceipt): void {
        receipts[index] = next;
    }

    function receiptIndexForToken(token: unknown): number {
        if (typeof token !== 'number' || !Number.isInteger(token)) return -1;
        const index = token - 1;
        return index >= 0 && index < receipts.length ? index : -1;
    }

    const context: ScenarioReadContext = {
        onRead(observation: ScenarioReadObservation): unknown {
            const ordinal = receipts.length + 1;
            receipts.push({
                ordinal,
                path_as_passed: observation.path_as_passed,
                cwd_at_read: observation.cwd_at_read,
                resolved_path: observation.resolved_path,
                decoded_char_length: observation.decoded_text.length,
                decoded_text_sha256: sha256Hex(observation.decoded_text),
                normalized_text_sha256: sha256Hex(normalizeForHash(observation.decoded_text)),
                status: 'read_only',
                parse_error_name: null,
            });
            return ordinal;
        },
        onNormalized(token: unknown): void {
            const index = receiptIndexForToken(token);
            if (index < 0) {
                failures.push('onNormalized received a token that matches no recorded read');
                return;
            }
            const current = receipts[index];
            if (current !== undefined) replaceReceipt(index, { ...current, status: 'read_normalized' });
        },
        onParseFailed(token: unknown, errorName: string): void {
            const index = receiptIndexForToken(token);
            if (index < 0) {
                failures.push('onParseFailed received a token that matches no recorded read');
                return;
            }
            const current = receipts[index];
            if (current !== undefined) {
                replaceReceipt(index, { ...current, status: 'read_parse_failed', parse_error_name: errorName });
            }
        },
        onObserverError(error: unknown): void {
            failures.push(describeFailure(error));
        },
        receipts(): readonly ScenarioReadReceipt[] {
            return receipts.map((receipt) => ({ ...receipt }));
        },
        observerFailures(): readonly string[] {
            return [...failures];
        },
        compareToStamp(args): ScenarioReadComparison {
            const association = associateScenarioWithStamp(args);
            const perRead = receipts.map((receipt) => compareReceiptToAssociation(receipt, association));
            const invalidReasons: string[] = failures.map((failure) => `observer_failure: ${failure}`);
            for (const comparison of perRead) {
                if (comparison.status === 'incomplete_evidence') {
                    invalidReasons.push(`read ${comparison.ordinal} has no normalization or parse-failure evidence`);
                }
            }
            // An INVALID proof must contain no `match` at any level: a row that would match is
            // reported as `invalid_evidence` (its ordinal and path/hash diagnostics are kept).
            const reportedPerRead: readonly ReceiptComparison[] = invalidReasons.length > 0
                ? perRead.map((comparison): ReceiptComparison => (
                    comparison.status === 'match'
                        ? { ...comparison, status: 'invalid_evidence' }
                        : comparison
                ))
                : perRead;
            const build = (overall: OverallComparisonStatus): ScenarioReadComparison => ({
                proof_status: invalidReasons.length > 0 ? 'INVALID' : 'VALID',
                invalid_reasons: invalidReasons,
                overall,
                association,
                per_read: reportedPerRead,
            });
            if (invalidReasons.length > 0) return build('invalid');
            if (receipts.length === 0) return build('no_load_receipt');
            const used = perRead.filter((comparison) => comparison.status !== 'not_a_normalized_use');
            if (used.length === 0) return build('no_normalized_use');
            if (association.stamp_row_sha256 === undefined) return build('no_stamp_row');
            if (association.stamp_row_sha256 === null) return build('stamp_null');
            if (used.some((comparison) => comparison.status === 'path_identity_mismatch')) {
                return build('path_identity_mismatch');
            }
            const usedReceipts = receipts.filter((receipt) => receipt.status === 'read_normalized');
            const distinctHashes = new Set(usedReceipts.map((receipt) => receipt.normalized_text_sha256));
            if (usedReceipts.length > 1 && distinctHashes.size > 1) return build('repeat_disagreement');
            if (used.some((comparison) => comparison.status === 'hash_mismatch')) return build('hash_mismatch');
            return build('match');
        },
    };
    return context;
}
