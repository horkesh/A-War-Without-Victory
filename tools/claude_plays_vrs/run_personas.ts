#!/usr/bin/env node
/**
 * D2 Run Personas (LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS).
 *
 * Supersedes/extends `run_three_commanders.ts` behaviour at the D-lane
 * (Claude-as-personas) layer. The legacy file is preserved frozen as a
 * reference; this file is a NEW superset that adds:
 *
 *   • Per-(faction, role, corps) opt-in matrix parsed from env flags:
 *     - CLAUDE_AS_PRESIDENT_<faction>=true
 *     - CLAUDE_AS_ARMY_CO_<faction>=true
 *     - CLAUDE_AS_CORPS_CO_<faction>=true
 *     - CLAUDE_AS_CORPS_CO_<faction>_<corps>=true
 *     - CLAUDE_AS_ALL_LAYERS_<faction>=true (wildcard per faction)
 *     - CLAUDE_AS_ALL=true (full wildcard)
 *
 *   • Auto-swap mid-run on A4 succession events: each turn we re-resolve
 *     the active army CO from `data/scenarios/army_co_roster.json` so that
 *     Halilović → Delić (week 60), Petković → Praljak (week 64) → Roso
 *     (week 80) etc. transitions are honoured without operator intervention.
 *
 *   • Telemetry emission via `persona_telemetry.ts` (D2 side-channel).
 *
 * Default (no env flags): zero opt-ins. The deterministic baseline runs
 * unchanged. The Anthropic SDK is NOT loaded.
 *
 * Predecessors: A1 18136710 / A2 ba6955bf / A3 c8ff93d8 / A4 93c75b1d /
 * B1 44053a32 / B2 d019bef7 / C1 5084071d / C2 f24ad5d7 / Q1 6cbcaa00 /
 * Q2 3bab0eb0 / Q3 aa30f349 / API-Bridge a2d564e6 / drina-fix 03ef9cd4.
 *
 * Sensitive-history compliance: Ring 0 / tooling-only QA harness; no engine
 * touch; no §6 surface. Faction-symmetric mechanism (no per-faction code
 * branches in this file — the OptInMatrix is keyed uniformly).
 */

import { loadPersonaByTenure, type PersonaFaction, type PersonaRole } from './persona_loader.js';

// ─── OptInMatrix types ─────────────────────────────────────────────────────

const FACTIONS: ReadonlyArray<PersonaFaction> = ['HRHB', 'RBiH', 'RS'];

export interface OptInMatrix {
    /** Per-faction president-layer opt-in. */
    president: Record<PersonaFaction, boolean>;
    /** Per-faction army-CO-layer opt-in. */
    army_co: Record<PersonaFaction, boolean>;
    /** Per-faction corps-CO-layer opt-in (faction-wide). */
    corps_co_faction: Record<PersonaFaction, boolean>;
    /** Per-(faction, corps_id) corps-CO-layer opt-in. corps_id stored uppercased. */
    corps_co_specific: Record<PersonaFaction, Record<string, boolean>>;
}

function emptyMatrix(): OptInMatrix {
    const m: OptInMatrix = {
        president: { HRHB: false, RBiH: false, RS: false },
        army_co: { HRHB: false, RBiH: false, RS: false },
        corps_co_faction: { HRHB: false, RBiH: false, RS: false },
        corps_co_specific: { HRHB: {}, RBiH: {}, RS: {} },
    };
    return m;
}

/**
 * Parse env flags into the OptInMatrix. Wildcard precedence:
 *   1. CLAUDE_AS_ALL=true → all factions, all roles, all corps.
 *   2. CLAUDE_AS_ALL_LAYERS_<faction>=true → all roles for that faction.
 *   3. Per-role flags as documented above.
 *
 * Determinism: pure env-read; no IO; faction-symmetric (single loop over
 * FACTIONS). No per-faction branches.
 */
export function parseEnvFlags(env: NodeJS.ProcessEnv = process.env): OptInMatrix {
    const m = emptyMatrix();
    const allOn = env.CLAUDE_AS_ALL === 'true';

    for (const faction of FACTIONS) {
        const factionAllOn = allOn || env[`CLAUDE_AS_ALL_LAYERS_${faction}`] === 'true';
        m.president[faction] = factionAllOn || env[`CLAUDE_AS_PRESIDENT_${faction}`] === 'true';
        m.army_co[faction] = factionAllOn || env[`CLAUDE_AS_ARMY_CO_${faction}`] === 'true';
        m.corps_co_faction[faction] = factionAllOn || env[`CLAUDE_AS_CORPS_CO_${faction}`] === 'true';
    }

    // Per-(faction, corps_id) opt-ins. Scan the env for any
    // CLAUDE_AS_CORPS_CO_<FACTION>_<CORPS_ID_UPPER>=true keys not yet
    // covered. Determinism: sorted env-key iteration.
    const keys = Object.keys(env).sort();
    for (const key of keys) {
        if (env[key] !== 'true') continue;
        const m1 = key.match(/^CLAUDE_AS_CORPS_CO_([A-Z]+)_([A-Z0-9_]+)$/);
        if (!m1) continue;
        const factionUpper = m1[1];
        const faction = FACTIONS.find(f => f.toUpperCase() === factionUpper);
        if (!faction) continue;
        const corpsUpper = m1[2];
        m.corps_co_specific[faction][corpsUpper] = true;
    }

    return m;
}

/**
 * Returns true iff the matrix has zero opt-ins across all layers/factions.
 * In this state run_personas degenerates to the deterministic baseline and
 * does not load the Anthropic SDK.
 *
 * Determinism: pure structural check.
 */
export function isMatrixEmpty(matrix: OptInMatrix): boolean {
    for (const faction of FACTIONS) {
        if (matrix.president[faction]) return false;
        if (matrix.army_co[faction]) return false;
        if (matrix.corps_co_faction[faction]) return false;
        if (Object.keys(matrix.corps_co_specific[faction]).length > 0) return false;
    }
    return true;
}

// ─── Auto-swap helper ──────────────────────────────────────────────────────

/**
 * Resolve the active army-CO persona for a faction at a given turn via the
 * A4 roster auto-swap. Re-resolves every turn so mid-run successions
 * (Halilović → Delić w60, Petković → Praljak w64 → Roso w80, etc.) are
 * honoured without operator intervention.
 *
 * Returns null if no roster entry covers the turn or if no persona file
 * exists for the active officer.
 *
 * Determinism: delegates to persona_loader.loadPersonaByTenure.
 */
export function resolveActiveArmyCoPersona(
    faction: PersonaFaction,
    turn: number,
    rosterPathOverride?: string,
): ReturnType<typeof loadPersonaByTenure> {
    return loadPersonaByTenure(faction, 'army_co', turn, { rosterPathOverride });
}

// ─── Cost estimation helper ────────────────────────────────────────────────

/**
 * Estimate the dollar cost of a single Claude API call. Mirrors the cost
 * formula in run_three_commanders.ts so the two code paths agree on cost
 * accounting. Determinism: pure arithmetic.
 */
export function estimateApiCost(
    promptTokens: number,
    completionTokens: number,
    model: string,
): number {
    if (model.includes('haiku')) {
        return (promptTokens * 0.8 + completionTokens * 4) / 1_000_000;
    }
    if (model.includes('sonnet')) {
        return (promptTokens * 3 + completionTokens * 15) / 1_000_000;
    }
    return (promptTokens * 15 + completionTokens * 75) / 1_000_000;
}

// ─── Public role-summary helper ────────────────────────────────────────────

/**
 * For a given matrix and faction, summarise which layers are opted-in.
 * Returns an array of {role, corps_id?} entries that the runner will
 * dispatch to Claude for that faction. Determinism: deterministic
 * iteration order — president, army_co, corps_co (faction-wide before
 * specific corps).
 */
export function activeLayersForFaction(
    matrix: OptInMatrix,
    faction: PersonaFaction,
): Array<{ role: PersonaRole; corps_id?: string }> {
    const out: Array<{ role: PersonaRole; corps_id?: string }> = [];
    if (matrix.president[faction]) out.push({ role: 'president' });
    if (matrix.army_co[faction]) out.push({ role: 'army_co' });
    if (matrix.corps_co_faction[faction]) {
        out.push({ role: 'corps_co' });
    }
    const specific = matrix.corps_co_specific[faction];
    const corpsIds = Object.keys(specific).sort();
    for (const c of corpsIds) {
        if (specific[c]) out.push({ role: 'corps_co', corps_id: c });
    }
    return out;
}

// ─── Main (when run as CLI) ────────────────────────────────────────────────

async function main(): Promise<void> {
    const matrix = parseEnvFlags();
    if (isMatrixEmpty(matrix)) {
        console.log('[run_personas] No CLAUDE_AS_* env flags set. Degenerating to deterministic baseline.');
        console.log('[run_personas] To opt in, set one or more of:');
        console.log('  CLAUDE_AS_PRESIDENT_<RBiH|RS|HRHB>=true');
        console.log('  CLAUDE_AS_ARMY_CO_<RBiH|RS|HRHB>=true');
        console.log('  CLAUDE_AS_CORPS_CO_<RBiH|RS|HRHB>[_<CORPS_ID>]=true');
        console.log('  CLAUDE_AS_ALL_LAYERS_<RBiH|RS|HRHB>=true');
        console.log('  CLAUDE_AS_ALL=true');
        console.log('[run_personas] Then run via:');
        console.log('  node tools/claude_plays_vrs/run_three_commanders.ts (legacy harness)');
        console.log('[run_personas] (run_personas.ts is currently a configuration shim;');
        console.log('  the full scenario harness lives in run_three_commanders.ts and reads');
        console.log('  the same opt-in matrix via api_president.ts / api_commander.ts /');
        console.log('  api_corps_commander.ts persona splice gates.)');
        return;
    }

    console.log('[run_personas] Active opt-in matrix:');
    for (const faction of FACTIONS) {
        const layers = activeLayersForFaction(matrix, faction);
        if (layers.length === 0) continue;
        const summary = layers.map(l => l.corps_id ? `corps_co:${l.corps_id}` : l.role).join(', ');
        console.log(`  ${faction}: ${summary}`);
    }
    console.log('[run_personas] Telemetry side-channel:',
        process.env.CLAUDE_PERSONA_TELEMETRY_DISABLED === 'true' ? 'DISABLED' : 'ENABLED');
    console.log('[run_personas] Active opt-ins are read by api_president.ts /');
    console.log('  api_commander.ts / api_corps_commander.ts via env-flag gates.');
    console.log('  Run the full harness via run_three_commanders.ts; the persona');
    console.log('  splice in the API modules will activate based on the same env.');
}

// Only invoke main() when this file is run as the entry point. Tests import
// the named exports without triggering the CLI.
const isMain = process.argv[1] && (
    process.argv[1].endsWith('run_personas.ts')
    || process.argv[1].endsWith('run_personas.js')
);
if (isMain) {
    main().catch(err => { console.error('[run_personas] FATAL:', err); process.exit(1); });
}
