/**
 * Local-first playtest / run telemetry slice (DEFAULT-OFF).
 *
 * Records a small, deterministic per-session summary of an ALREADY-COMPLETED scenario
 * run to a local file under a gitignored `_debug` path. Purpose: lightweight local
 * playtest signal (how many turns ran, end-state, per-faction control counters) without
 * any network, upload, aggregation, or sim coupling.
 *
 * Determinism contract:
 *   - `buildPlaytestSessionDigest` is PURE and deterministic: same summary in → same
 *     digest out. No Date.now, no Math.random, no wall-clock. Counters derive only from
 *     the deterministic scenario summary object.
 *   - The digest NEVER feeds back into simulation state, RNG, or scenario outputs.
 *   - The ONLY wall-clock read lives in `writePlaytestSessionDigest`, used STRICTLY to
 *     disambiguate the local diagnostic FILENAME (so successive local runs don't clobber
 *     each other). It is injected by the caller and is outside the determinism path; it
 *     never appears in digest *content*.
 *
 * Gating: all writes go through `maybeWritePlaytestSessionDigest`, which early-returns
 * when the flag is OFF (the default). Flag OFF ⇒ no file, no I/O, byte-identical baseline.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { isPlaytestTelemetryEnabled } from './playtest_telemetry_flag.js';

/** Default local, gitignored directory for playtest diagnostics. */
export const PLAYTEST_TELEMETRY_DEFAULT_DIR = resolve('data', 'derived', '_debug', 'playtest_telemetry');

/** Schema version for the emitted digest (bump on shape change). */
export const PLAYTEST_TELEMETRY_DIGEST_SCHEMA = 1 as const;

/** Minimal shape of the scenario summary this slice consumes (structurally typed). */
export interface PlaytestSummaryInput {
    schema: number;
    turns: Array<{ turn: number }>;
    end_state?: null | { kind: string; treaty_id: string; since_turn: number };
    end_state_totals?: null | { settlements_by_controller: Record<string, number> };
    war_active_turns?: number;
}

/** A per-controller settlement counter row (deterministically ordered by controller id). */
export interface ControllerCountRow {
    controller: string;
    settlements: number;
}

/** Deterministic per-session playtest digest. No timestamps; pure function of inputs. */
export interface PlaytestSessionDigest {
    schema: typeof PLAYTEST_TELEMETRY_DIGEST_SCHEMA;
    scenario_id: string;
    run_id: string;
    turns_run: number;
    first_turn: number | null;
    last_turn: number | null;
    war_active_turns: number | null;
    end_state_kind: string | null;
    end_state_treaty_id: string | null;
    end_state_since_turn: number | null;
    settlements_by_controller: ControllerCountRow[];
    total_settlements_counted: number;
}

/**
 * Build a deterministic per-session digest from a completed scenario summary.
 * Pure: identical inputs produce byte-identical output (stable key ordering, no clock).
 */
export function buildPlaytestSessionDigest(
    params: { scenarioId: string; runId: string; summary: PlaytestSummaryInput }
): PlaytestSessionDigest {
    const { scenarioId, runId, summary } = params;

    const turns = Array.isArray(summary.turns) ? summary.turns : [];
    const turnNumbers = turns
        .map((t) => (typeof t.turn === 'number' && Number.isFinite(t.turn) ? t.turn : null))
        .filter((n): n is number => n !== null);

    const first_turn = turnNumbers.length > 0 ? Math.min(...turnNumbers) : null;
    const last_turn = turnNumbers.length > 0 ? Math.max(...turnNumbers) : null;

    const controllerCounts = summary.end_state_totals?.settlements_by_controller ?? {};
    const settlements_by_controller: ControllerCountRow[] = Object.keys(controllerCounts)
        // Stable, locale-independent ordering by controller id for deterministic output.
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .map((controller) => ({
            controller,
            settlements: Number.isInteger(controllerCounts[controller]) ? controllerCounts[controller]! : 0,
        }));
    const total_settlements_counted = settlements_by_controller.reduce((sum, r) => sum + r.settlements, 0);

    return {
        schema: PLAYTEST_TELEMETRY_DIGEST_SCHEMA,
        scenario_id: scenarioId,
        run_id: runId,
        turns_run: turns.length,
        first_turn,
        last_turn,
        war_active_turns: typeof summary.war_active_turns === 'number' ? summary.war_active_turns : null,
        end_state_kind: summary.end_state?.kind ?? null,
        end_state_treaty_id: summary.end_state?.treaty_id ?? null,
        end_state_since_turn: summary.end_state?.since_turn ?? null,
        settlements_by_controller,
        total_settlements_counted,
    };
}

/** Serialize a digest to stable, human-diffable JSON (sorted-key by construction above). */
export function serializePlaytestSessionDigest(digest: PlaytestSessionDigest): string {
    return JSON.stringify(digest, null, 2);
}

/**
 * Sanitize a string for safe use inside a filename: keep [A-Za-z0-9._-], collapse the
 * rest to '_'. No PII concern (run/scenario ids are synthetic), but keeps paths portable.
 */
function sanitizeForFilename(value: string): string {
    return value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'session';
}

export interface WritePlaytestDigestOptions {
    /** Target directory (default: gitignored data/derived/_debug/playtest_telemetry). */
    dir?: string;
    /**
     * Wall-clock label used ONLY to disambiguate the filename. Injected by the caller
     * and kept strictly outside the determinism path. Defaults to a fixed sentinel so
     * the function stays clock-free unless a label is explicitly supplied.
     */
    filenameLabel?: string;
}

/**
 * Write a digest to a local file. Returns the path written. The filename is
 * `<scenario>__<run>__<label>.json`. Content is the deterministic digest; only the
 * filename varies with the injected label. This function does NOT consult the flag —
 * callers must gate via `maybeWritePlaytestSessionDigest`.
 */
export async function writePlaytestSessionDigest(
    digest: PlaytestSessionDigest,
    options: WritePlaytestDigestOptions = {}
): Promise<string> {
    const dir = options.dir ?? PLAYTEST_TELEMETRY_DEFAULT_DIR;
    const label = sanitizeForFilename(options.filenameLabel ?? 'session');
    const fileName = `${sanitizeForFilename(digest.scenario_id)}__${sanitizeForFilename(digest.run_id)}__${label}.json`;
    const target = join(dir, fileName);
    await mkdir(dir, { recursive: true });
    await writeFile(target, serializePlaytestSessionDigest(digest), 'utf8');
    return target;
}

/**
 * Gated entrypoint: build + write a per-session digest IFF the playtest telemetry flag
 * is enabled. When the flag is OFF (default) this is a pure no-op and returns null —
 * no file, no I/O, byte-identical baseline. Never throws into the caller: any local
 * write failure is swallowed so diagnostics can never abort a run.
 */
export async function maybeWritePlaytestSessionDigest(
    params: {
        scenarioId: string;
        runId: string;
        summary: PlaytestSummaryInput;
        dir?: string;
        filenameLabel?: string;
    }
): Promise<string | null> {
    if (!isPlaytestTelemetryEnabled()) return null;
    try {
        const digest = buildPlaytestSessionDigest({
            scenarioId: params.scenarioId,
            runId: params.runId,
            summary: params.summary,
        });
        return await writePlaytestSessionDigest(digest, {
            dir: params.dir,
            filenameLabel: params.filenameLabel,
        });
    } catch {
        // Local diagnostics must never break a run; swallow and emit nothing.
        return null;
    }
}
