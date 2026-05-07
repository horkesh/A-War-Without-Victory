/**
 * D2 persona-decision telemetry side-channel
 * (LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS).
 *
 * Mirrors the C2 telemetry side-channel pattern (commit f24ad5d7) at the
 * D-lane (Claude-as-personas) layer. Emits per-decision JSONL records to
 * a gitignored side-channel so post-run analysis can read persona-layer
 * decisions, costs, and divergence-from-deterministic-baseline without
 * touching weekly_report.jsonl or final_state_hash.
 *
 * Channel: `data/derived/_debug/d_lane_persona_decisions.jsonl` (gitignored
 * via the `data/derived/_debug/` rule already present in `.gitignore`).
 *
 * Per-decision payload (one JSONL line per decision):
 *   - turn
 *   - faction
 *   - role ('president' | 'army_co' | 'corps_co')
 *   - officer_id (persona id)
 *   - prompt_tokens, completion_tokens
 *   - latency_ms
 *   - cache_hit_rate (optional; SDK-reported; 0 when unavailable)
 *   - decision_summary (short string; what verb / stance / etc. was chosen)
 *   - chain_context_section_present (boolean; was C2 chain context wired?)
 *   - deterministic_baseline_decision (string; what the deterministic path
 *     would have chosen for the same state, when known)
 *   - divergence_from_baseline (boolean; did Claude diverge?)
 *
 * Env flag: `CLAUDE_PERSONA_TELEMETRY_DISABLED=true` short-circuits all
 * emissions (mirrors C2's flag idiom).
 *
 * Determinism: side-channel is JSONL — additive, append-only. No GameState
 * mutations. Module-local; no cross-turn caches required for emission
 * (each call is self-contained).
 *
 * Sensitive-history compliance: Ring 0 / tooling-only QA harness; no
 * engine touch; no §6 surface.
 */

import * as _fsModule from 'node:fs';
import * as _pathModule from 'node:path';

import type { PersonaRole, PersonaFaction } from './persona_loader.js';

// ─── Constants ─────────────────────────────────────────────────────────────

export const D2_TELEMETRY_OUTPUT_REL_PATH = 'data/derived/_debug/d_lane_persona_decisions.jsonl';
export const D2_TELEMETRY_SCHEMA_VERSION = 1;

// ─── Env-flag gate ─────────────────────────────────────────────────────────

/**
 * Returns true iff the D2 persona-telemetry surface is short-circuited via
 * env flag. Exposed so tests can verify flag-gating without touching env
 * globals directly.
 */
export function isPersonaTelemetryDisabled(): boolean {
    return process.env.CLAUDE_PERSONA_TELEMETRY_DISABLED === 'true';
}

// ─── Decision record schema ───────────────────────────────────────────────

export interface PersonaDecisionRecord {
    turn: number;
    faction: PersonaFaction;
    role: PersonaRole;
    officer_id: string;
    prompt_tokens: number;
    completion_tokens: number;
    latency_ms: number;
    cache_hit_rate?: number;
    decision_summary: string;
    chain_context_section_present: boolean;
    deterministic_baseline_decision?: string;
    divergence_from_baseline?: boolean;
}

// ─── Path resolution ───────────────────────────────────────────────────────

function resolveOutputPath(cwdOverride?: string): string {
    const cwd = cwdOverride ?? process.cwd();
    return _pathModule.join(cwd, D2_TELEMETRY_OUTPUT_REL_PATH);
}

function ensureOutputDir(cwdOverride?: string): void {
    const cwd = cwdOverride ?? process.cwd();
    const outDir = _pathModule.join(cwd, 'data', 'derived', '_debug');
    if (!_fsModule.existsSync(outDir)) {
        _fsModule.mkdirSync(outDir, { recursive: true });
    }
}

// ─── Emit ──────────────────────────────────────────────────────────────────

/**
 * Append a single persona-decision record to the side-channel JSONL.
 * No-op when the env flag is set or when the record is malformed.
 *
 * @param record  the decision record to append.
 * @param cwdOverride  optional cwd override (used by tests).
 *
 * Determinism: synchronous append; one decision = one line. No cross-call
 * state.
 */
export function emitDecision(
    record: PersonaDecisionRecord,
    cwdOverride?: string,
): void {
    if (isPersonaTelemetryDisabled()) return;
    if (!record || typeof record !== 'object') return;
    if (typeof record.turn !== 'number') return;
    if (typeof record.faction !== 'string') return;
    if (typeof record.role !== 'string') return;
    if (typeof record.officer_id !== 'string') return;

    ensureOutputDir(cwdOverride);
    const outPath = resolveOutputPath(cwdOverride);

    const line = JSON.stringify({
        schema_version: D2_TELEMETRY_SCHEMA_VERSION,
        event_type: 'persona_decision',
        turn: record.turn,
        faction: record.faction,
        role: record.role,
        officer_id: record.officer_id,
        prompt_tokens: record.prompt_tokens,
        completion_tokens: record.completion_tokens,
        latency_ms: record.latency_ms,
        cache_hit_rate: record.cache_hit_rate ?? 0,
        decision_summary: record.decision_summary,
        chain_context_section_present: record.chain_context_section_present,
        deterministic_baseline_decision: record.deterministic_baseline_decision ?? null,
        divergence_from_baseline: record.divergence_from_baseline ?? null,
    });
    _fsModule.appendFileSync(outPath, line + '\n', { encoding: 'utf8' });
}
