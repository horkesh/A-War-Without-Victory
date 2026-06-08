/**
 * Phase E Packet 4 — political_dimensions diagnostic surface.
 *
 * Read-only snapshot of `state.military.negotiation.strategic_dimensions` for
 * a save file, with activation-relevant signals: which dimensions are in their
 * penalty zones, which Phase E sub-flags are active in the current process
 * environment, and what the resulting per-faction op-launch multiplier would
 * be right now.
 *
 * This tool exists so operators have a quick way to inspect dimension state
 * once Phase E flags flip in production. It is purely observational — it does
 * not mutate save files or trigger any gate.
 *
 * Determinism: reads file + process.env. Iteration over factions and
 * dimensions is sorted (canonical/alphabetical). No Math.random, no
 * Date.now, no timestamps.
 *
 * CLI:
 *   node node_modules/tsx/dist/cli.mjs tools/diagnostics/political_dimensions_snapshot.ts [options]
 *
 * Options:
 *   --save <path>         Path to final_save.json (defaults to
 *                         data/derived/latest_run_final_save.json).
 *   --faction <id>        Restrict to single faction (RBiH | RS | HRHB).
 *   --json                Emit structured JSON; otherwise plain-text table.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    DIMENSION_IDS,
    type DimensionStore,
} from '../../src/sim/events/strategic_dimensions.js';
import {
    getCohesionCautionBiasMultiplier,
    getIntlStandingOpsHesitationMultiplier,
} from '../../src/sim/combat/sector_offensive.js';

/** Phase E Packet 4 — canonical faction order for the diagnostic output. */
export const SNAPSHOT_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
export type SnapshotFaction = (typeof SNAPSHOT_FACTIONS)[number];

/** Phase E Packet 4 — penalty-zone detection delegates to the exported
 *  multiplier helpers in `sector_offensive.ts`. A returned multiplier strictly
 *  less than 1.0 means the dimension is currently below its threshold and a
 *  hesitation / caution-bias would fire when the corresponding sub-flag is
 *  ON. This avoids mirroring the private threshold constants and keeps the
 *  diagnostic loose-coupled to production code. */

/** Phase E Packet 4 — default save-path resolution. */
const DEFAULT_SAVE_PATH = 'data/derived/latest_run_final_save.json';

export type DimensionCell = {
    faction: SnapshotFaction;
    dimension: string;
    base_value: number | null;
    event_modifier: number | null;
    effective_value: number | null;
    penalty_zone: 'intl_standing_hesitation' | 'cohesion_caution_bias' | null;
    penalty_zone_reason: string | null;
    /** Multiplier this cell would contribute right now if its corresponding
     *  sub-flag is ACTIVE (combined tier-1 + tier-2). 1.0 if outside the
     *  penalty zone OR the dimension has no wired sub-flag yet. */
    active_multiplier_if_flag_on: number;
};

export type FactionSnapshot = {
    faction: SnapshotFaction;
    cells: DimensionCell[];
    /** Product of per-dimension active multipliers if the relevant sub-flags
     *  are ON right now. When the global gate is OFF, this is the sentinel
     *  description string in `cumulative_multiplier_note`; numerically still
     *  populated as the would-be product for inspection. */
    cumulative_multiplier_if_flags_on: number;
    /** Same as `cumulative_multiplier_if_flags_on` but conditioned on the
     *  CURRENT env-var gate state. When global gate OFF → 1.0. When global
     *  ON but a sub-flag OFF → that sub-flag's contribution is 1.0. */
    current_cumulative_multiplier: number;
    cumulative_multiplier_note: string;
};

export type GateActivationSnapshot = {
    global_propagation: 'ACTIVE' | 'INACTIVE';
    intl_standing_ops_hesitation: 'ACTIVE' | 'INACTIVE';
    cohesion_caution_bias: 'ACTIVE' | 'INACTIVE';
    intl_standing_combined_active: boolean;
    cohesion_combined_active: boolean;
};

export type PoliticalDimensionsSnapshot = {
    save_path: string | null;
    turn: number | null;
    scenario_id: string | null;
    seed: string | null;
    gate_activation: GateActivationSnapshot;
    factions: FactionSnapshot[];
};

export type SnapshotOptions = {
    /** Absolute or repo-relative path to a final_save.json. */
    savePath?: string | null;
    /** Restrict snapshot to a single faction. */
    faction?: SnapshotFaction | null;
    /** Pre-loaded raw save object (skips file I/O). Tests use this. */
    rawSave?: unknown;
    /** Override process.env reads for tests. When absent, real env is read. */
    envOverride?: NodeJS.ProcessEnv | null;
};

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function repoRoot(): string {
    return process.cwd();
}

function resolveSavePath(savePath: string | null | undefined): string | null {
    if (savePath && savePath.length > 0) {
        return path.isAbsolute(savePath) ? savePath : path.join(repoRoot(), savePath);
    }
    const candidate = path.join(repoRoot(), DEFAULT_SAVE_PATH);
    return existsSync(candidate) ? candidate : null;
}

function readEnvFlag(env: NodeJS.ProcessEnv, key: string): boolean {
    const raw = env[key];
    return raw === 'true' || raw === '1';
}

/** Build the gate-activation snapshot from current process.env (or override
 *  for tests). Reads env directly — does NOT consult the gate module's
 *  override slots (which are tests-only). */
export function buildGateActivation(env: NodeJS.ProcessEnv = process.env): GateActivationSnapshot {
    const global = readEnvFlag(env, 'AWWV_POLITICAL_DIMENSION_PROPAGATION');
    const intl = readEnvFlag(env, 'AWWV_PDP_INTL_STANDING_OPS_HESITATION');
    const cohesion = readEnvFlag(env, 'AWWV_PDP_COHESION_CAUTION_BIAS');
    return {
        global_propagation: global ? 'ACTIVE' : 'INACTIVE',
        intl_standing_ops_hesitation: intl ? 'ACTIVE' : 'INACTIVE',
        cohesion_caution_bias: cohesion ? 'ACTIVE' : 'INACTIVE',
        intl_standing_combined_active: global && intl,
        cohesion_combined_active: global && cohesion,
    };
}

function readDimensionStore(rawSave: unknown): DimensionStore | null {
    if (!isRecord(rawSave)) return null;
    const military = isRecord(rawSave.military) ? rawSave.military : null;
    const negotiation = military && isRecord(military.negotiation) ? military.negotiation : null;
    const store = negotiation && isRecord(negotiation.strategic_dimensions)
        ? (negotiation.strategic_dimensions as DimensionStore)
        : null;
    return store;
}

function readMeta(rawSave: unknown): { turn: number | null; scenario_id: string | null; seed: string | null } {
    if (!isRecord(rawSave) || !isRecord(rawSave.meta)) {
        return { turn: null, scenario_id: null, seed: null };
    }
    const meta = rawSave.meta;
    return {
        turn: numberOrNull(meta.turn),
        scenario_id: stringOrNull(meta.scenario_id) ?? stringOrNull(meta.scenario_name),
        seed: stringOrNull(meta.seed),
    };
}

function buildCell(
    faction: SnapshotFaction,
    dimension: string,
    store: DimensionStore | null,
    turn: number | null,
): DimensionCell {
    const block = store?.[faction]?.[dimension] ?? null;
    const baseValue = block ? numberOrNull(block.base_value) : null;
    const eventModifier = block ? numberOrNull(block.event_modifier) : null;
    const effectiveValue = block ? numberOrNull(block.effective_value) : null;

    let penaltyZone: DimensionCell['penalty_zone'] = null;
    let penaltyReason: string | null = null;
    let activeMult = 1.0;

    if (dimension === 'international_standing' && typeof effectiveValue === 'number') {
        // ACTIVATION GUARD: pass the save's turn so the diagnostic honors the
        // intl_standing turn-gate (channel inert before mid-1994). When the save
        // has no turn, the helper treats it as before-the-gate (1.0) — i.e. the
        // diagnostic reports the channel as inert, which is the truthful signal.
        activeMult = getIntlStandingOpsHesitationMultiplier(effectiveValue, turn ?? undefined);
        if (activeMult !== 1.0) {
            penaltyZone = 'intl_standing_hesitation';
            penaltyReason = `effective_value ${effectiveValue} in penalty zone; WOULD-TRIGGER hesitation (×${activeMult}) if AWWV_PDP_INTL_STANDING_OPS_HESITATION ON`;
        }
    } else if (dimension === 'internal_cohesion' && typeof effectiveValue === 'number') {
        activeMult = getCohesionCautionBiasMultiplier(effectiveValue);
        if (activeMult !== 1.0) {
            penaltyZone = 'cohesion_caution_bias';
            penaltyReason = `effective_value ${effectiveValue} in penalty zone; WOULD-TRIGGER caution-bias (×${activeMult}) if AWWV_PDP_COHESION_CAUTION_BIAS ON`;
        }
    }

    return {
        faction,
        dimension,
        base_value: baseValue,
        event_modifier: eventModifier,
        effective_value: effectiveValue,
        penalty_zone: penaltyZone,
        penalty_zone_reason: penaltyReason,
        active_multiplier_if_flag_on: activeMult,
    };
}

function buildFactionSnapshot(
    faction: SnapshotFaction,
    store: DimensionStore | null,
    gate: GateActivationSnapshot,
    turn: number | null,
): FactionSnapshot {
    const sortedDims = [...DIMENSION_IDS].sort(strictCompare);
    const cells = sortedDims.map((dim) => buildCell(faction, dim, store, turn));

    // Cumulative if both flags were ON: product of every cell's
    // active_multiplier_if_flag_on. Dimensions without a wired sub-flag
    // contribute 1.0 and are no-ops.
    let cumulativeIfOn = 1.0;
    for (const cell of cells) {
        cumulativeIfOn *= cell.active_multiplier_if_flag_on;
    }

    // Cumulative right now: depends on env-var state. Global OFF → 1.0.
    // Otherwise multiply in only the sub-flags that are individually ACTIVE.
    let cumulativeNow = 1.0;
    let note: string;
    if (gate.global_propagation === 'INACTIVE') {
        cumulativeNow = 1.0;
        note = '1.0 (gate OFF; no propagation)';
    } else {
        for (const cell of cells) {
            if (cell.dimension === 'international_standing' && gate.intl_standing_combined_active) {
                cumulativeNow *= cell.active_multiplier_if_flag_on;
            } else if (cell.dimension === 'internal_cohesion' && gate.cohesion_combined_active) {
                cumulativeNow *= cell.active_multiplier_if_flag_on;
            }
        }
        const parts: string[] = [];
        if (gate.intl_standing_combined_active) parts.push('intl_standing');
        if (gate.cohesion_combined_active) parts.push('cohesion');
        note = parts.length === 0
            ? '1.0 (global ON but no sub-flags active)'
            : `product of active sub-flags: ${parts.join(', ')}`;
    }

    return {
        faction,
        cells,
        cumulative_multiplier_if_flags_on: cumulativeIfOn,
        current_cumulative_multiplier: cumulativeNow,
        cumulative_multiplier_note: note,
    };
}

/** Build a political-dimensions snapshot from a save object or path.
 *  Pure given inputs. Sorted iteration. Deterministic. */
export function buildPoliticalDimensionsSnapshot(
    options: SnapshotOptions = {},
): PoliticalDimensionsSnapshot {
    let rawSave: unknown = options.rawSave;
    let resolvedPath: string | null = null;
    if (rawSave === undefined) {
        resolvedPath = resolveSavePath(options.savePath ?? null);
        if (resolvedPath === null) {
            const hint = options.savePath
                ? `Save path not found: ${options.savePath}`
                : `No save path supplied and default ${DEFAULT_SAVE_PATH} does not exist. Pass --save <path> or run a scenario first.`;
            throw new Error(hint);
        }
        rawSave = JSON.parse(readFileSync(resolvedPath, 'utf8')) as unknown;
    }

    const env = options.envOverride ?? process.env;
    const gate = buildGateActivation(env);
    const store = readDimensionStore(rawSave);
    const meta = readMeta(rawSave);

    const factionFilter = options.faction ?? null;
    const factions: SnapshotFaction[] = factionFilter
        ? [factionFilter]
        : [...SNAPSHOT_FACTIONS].sort(strictCompare);

    return {
        save_path: resolvedPath,
        turn: meta.turn,
        scenario_id: meta.scenario_id,
        seed: meta.seed,
        gate_activation: gate,
        factions: factions.map((faction) => buildFactionSnapshot(faction, store, gate, meta.turn)),
    };
}

function formatNumber(value: number | null, digits = 2): string {
    if (value === null) return 'n/a';
    return value.toFixed(digits);
}

function printTextReport(snapshot: PoliticalDimensionsSnapshot): void {
    const lines: string[] = [];
    lines.push('Political-dimensions snapshot');
    lines.push(`  save_path: ${snapshot.save_path ?? '<inline>'}`);
    lines.push(`  turn: ${snapshot.turn ?? 'n/a'} | scenario: ${snapshot.scenario_id ?? 'n/a'} | seed: ${snapshot.seed ?? 'n/a'}`);
    lines.push('');
    lines.push('Gate activation (process.env):');
    lines.push(`  AWWV_POLITICAL_DIMENSION_PROPAGATION         : ${snapshot.gate_activation.global_propagation}`);
    lines.push(`  AWWV_PDP_INTL_STANDING_OPS_HESITATION        : ${snapshot.gate_activation.intl_standing_ops_hesitation}`);
    lines.push(`  AWWV_PDP_COHESION_CAUTION_BIAS               : ${snapshot.gate_activation.cohesion_caution_bias}`);
    lines.push('');

    for (const faction of snapshot.factions) {
        lines.push(`[${faction.faction}] cumulative_multiplier (current env): ${formatNumber(faction.current_cumulative_multiplier, 4)}`);
        lines.push(`    note: ${faction.cumulative_multiplier_note}`);
        lines.push(`    if-all-flags-on cumulative: ${formatNumber(faction.cumulative_multiplier_if_flags_on, 4)}`);
        lines.push('    dimension                     base    mod    eff    penalty_zone');
        for (const cell of faction.cells) {
            const dim = cell.dimension.padEnd(28, ' ');
            const base = formatNumber(cell.base_value).padStart(7, ' ');
            const mod = formatNumber(cell.event_modifier).padStart(6, ' ');
            const eff = formatNumber(cell.effective_value).padStart(6, ' ');
            const pz = cell.penalty_zone ?? '-';
            lines.push(`    ${dim} ${base} ${mod} ${eff}    ${pz}`);
        }
        lines.push('');
    }

    process.stdout.write(`${lines.join('\n')}\n`);
}

function parseFactionArg(value: string | undefined): SnapshotFaction | null {
    if (!value) return null;
    if (value === 'RBiH' || value === 'RS' || value === 'HRHB') return value;
    throw new Error(`--faction must be one of RBiH, RS, HRHB; got ${value}`);
}

function parseArgs(argv: string[]): { savePath: string | null; faction: SnapshotFaction | null; json: boolean } {
    let savePath: string | null = null;
    let faction: SnapshotFaction | null = null;
    let json = false;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--json') {
            json = true;
        } else if (arg === '--save') {
            savePath = argv[i + 1] ?? null;
            i++;
        } else if (arg === '--faction') {
            faction = parseFactionArg(argv[i + 1]);
            i++;
        }
    }
    return { savePath, faction, json };
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    let snapshot: PoliticalDimensionsSnapshot;
    try {
        snapshot = buildPoliticalDimensionsSnapshot({
            savePath: args.savePath,
            faction: args.faction,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`political_dimensions_snapshot: ${message}\n`);
        process.exit(1);
    }

    if (args.json) {
        process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
        return;
    }
    printTextReport(snapshot);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
