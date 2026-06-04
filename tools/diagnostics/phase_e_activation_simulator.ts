/**
 * Phase J Packet 1 — Phase E activation simulator (pre-activation gating tool).
 *
 * Answers the question: "If I flip Phase E flags in production, what will
 * change?" — surfaces projected impact BEFORE the calibration team flips any
 * `AWWV_POLITICAL_DIMENSION_PROPAGATION` / `AWWV_PDP_*` env var on a baselined
 * run. Companion to the Phase E activation procedure
 * (`docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`).
 *
 * Two operating tiers:
 *
 *   Tier 1 — math-only projection (default, sub-second).
 *     For each of 5 canonical flag combinations × 3 factions, read the save's
 *     current dimension values and compute the op-launch multiplier that
 *     `sector_offensive.ts` would produce. Pure derivation; no engine run.
 *
 *   Tier 2 — real-scenario projection (`--run-scenarios`, slow).
 *     For each non-baseline combo, set gate overrides, run the canonical
 *     baseline scenarios in-process via the exported `runScenario` API,
 *     compute artifact-hash deltas against the committed manifest. Also runs
 *     the OFF baseline (`global_off`) once per scenario and computes a true
 *     ON-vs-OFF territorial flip-set — the flag's ACTUAL effect. Always
 *     resets gates in `finally`. NEVER writes baselines.
 *
 *     IMPORTANT — two distinct "deltas" are NOT the same thing:
 *       • The within-run `control_delta.json` artifact is `after − before`
 *         (war start → war end). It is the WAR'S NATURAL TRAJECTORY, not the
 *         flag's effect. Hash-drift on it proves the bot diverged, but its
 *         numbers must NEVER be read as "the flag flipped N OSIDs".
 *       • The `territorial_diff` block this tool emits is `ON − OFF`: the
 *         final control set with the flag ON minus the final control set with
 *         the flag OFF. THIS is the flag's true magnitude (typically a handful
 *         of OSIDs). BOT-MILITARY is now asserted on a non-empty ON-vs-OFF
 *         flip-set, not on within-run control_delta hash drift alone.
 *
 * Determinism: sorted iteration over factions / combos / artifacts /
 * flipped OSIDs (strictCompare). No Math.random, no Date.now, no timestamps.
 * Tier 2 hash compare reads same manifest the baseline-regression CLI reads.
 *
 * CLI:
 *   node node_modules/tsx/dist/cli.mjs tools/diagnostics/phase_e_activation_simulator.ts [options]
 *
 * Options:
 *   --save <path>          Path to final_save.json
 *                          (default: data/derived/latest_run_final_save.json)
 *   --json                 Emit structured JSON; otherwise plain-text report.
 *   --faction <id>         Restrict Tier 1 output to one faction.
 *   --combo <combo-id>     Restrict to a single combo (one of: global_off,
 *                          global_only, intl_only, cohesion_only, both_on).
 *   --run-scenarios        Engage Tier 2 (slow). Runs every non-baseline combo
 *                          against the canonical baseline manifest scenarios
 *                          and hashes artifacts. NEVER writes baselines.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    getCohesionCautionBiasMultiplier,
    getIntlStandingOpsHesitationMultiplier,
} from '../../src/sim/combat/sector_offensive.js';
import {
    resetPoliticalDimensionGates,
    setCohesionCautionBiasOverride,
    setIntlStandingOpsHesitationOverride,
    setPoliticalDimensionPropagationOverride,
} from '../../src/sim/political/political_dimension_propagation_gate.js';

// ---------------------------------------------------------------------------
// Constants & canonical orderings
// ---------------------------------------------------------------------------

const DEFAULT_SAVE_PATH = 'data/derived/latest_run_final_save.json';

const BASELINES_DIR = path.join('data', 'derived', 'scenario', 'baselines');
const MANIFEST_PATH = path.join(BASELINES_DIR, 'manifest.json');
const TIER2_TMP_BASE = path.join('data', 'derived', 'scenario', '_phase_e_simulator_tmp');

/** Phase J Packet 1 — canonical faction order. Stable sort. */
export const SIM_FACTIONS = ['HRHB', 'RBiH', 'RS'] as const;
export type SimFaction = (typeof SIM_FACTIONS)[number];

/** Phase J Packet 1 — canonical combo order. global_off is the baseline. */
export const SIM_COMBOS = [
    'global_off',
    'global_only',
    'intl_only',
    'cohesion_only',
    'both_on',
] as const;
export type SimCombo = (typeof SIM_COMBOS)[number];

/** Gate state for a given combo. Mirrors the propagation gate's two tiers. */
export interface ComboGateState {
    global: boolean;
    intl_standing: boolean;
    cohesion: boolean;
}

/** Combo → gate flags. Sub-flags are inert when global is OFF (gate contract).
 *  We still record the requested sub-flag bits truthfully for diagnostic
 *  transparency; the multiplier-application step is what enforces inertness. */
export const COMBO_GATES: Record<SimCombo, ComboGateState> = {
    global_off: { global: false, intl_standing: false, cohesion: false },
    global_only: { global: true, intl_standing: false, cohesion: false },
    intl_only: { global: true, intl_standing: true, cohesion: false },
    cohesion_only: { global: true, intl_standing: false, cohesion: true },
    both_on: { global: true, intl_standing: true, cohesion: true },
};

// ---------------------------------------------------------------------------
// Types — Tier 1
// ---------------------------------------------------------------------------

export interface FactionDimensionReadout {
    faction: SimFaction;
    intl_standing: number | null;
    cohesion: number | null;
    /** Multiplier from the intl_standing helper IF that sub-flag is active in
     *  this combo (global+sub both ON). 1.0 otherwise. */
    intl_multiplier_active: number;
    /** Multiplier from the cohesion helper IF that sub-flag is active. */
    cohesion_multiplier_active: number;
    /** Product of the two active multipliers above. Equals 1.0 when combo's
     *  gate state suppresses both contributions. */
    combined_active: number;
    /** Whether this faction would feel a non-unity multiplier in this combo. */
    nontrivial: boolean;
}

export interface ComboProjection {
    combo: SimCombo;
    gate: ComboGateState;
    factions: FactionDimensionReadout[];
    /** Count of factions where `combined_active !== 1.0`. */
    factions_with_nontrivial_multiplier: number;
}

export interface Tier1Result {
    save_path: string | null;
    turn: number | null;
    scenario_id: string | null;
    seed: string | null;
    combos: ComboProjection[];
}

// ---------------------------------------------------------------------------
// Types — Tier 2
// ---------------------------------------------------------------------------

export type ArtifactDriftStatus = 'FLAT' | 'DRIFT' | 'MISSING' | 'NO_BASELINE';

export interface ArtifactDriftCell {
    artifact: string;
    status: ArtifactDriftStatus;
    expected_hash: string | null;
    actual_hash: string | null;
}

export type BehavioralDriftSignal =
    | 'DIMENSION-ONLY'
    | 'BOT-MILITARY'
    | 'NO-DRIFT';

/** One OSID whose controller differs between the flag-ON run and the
 *  flag-OFF (baseline) run. THIS is the flag's true territorial effect —
 *  distinct from the within-run control_delta (war start→end trajectory). */
export interface TerritorialFlip {
    osid: string;
    /** Controller in the OFF (baseline / `global_off`) run. */
    off_controller: string | null;
    /** Controller in the ON (this combo) run. */
    on_controller: string | null;
}

/** The ON-vs-OFF territorial diff for one scenario: which OSIDs ended in a
 *  different controller because the flag was ON, plus the per-faction net OSID
 *  count change (ON minus OFF). This is the flag's ACTUAL magnitude. */
export interface TerritorialDiff {
    /** True when both ON and OFF final control maps were available to diff. */
    available: boolean;
    /** Stable-sorted (strictCompare on OSID) list of flipped OSIDs. */
    flipped_osids: TerritorialFlip[];
    /** Total count of flipped OSIDs (ON differs from OFF). */
    total_flips: number;
    /** Per-faction net OSID count change: (#OSIDs ON-controls) − (#OSIDs
     *  OFF-controls). Sorted by controller (strictCompare). Empty when the
     *  flip-set is empty. */
    net_control_count_delta: Array<{ controller: string | null; delta: number }>;
}

export interface ScenarioRunResult {
    scenario_id: string;
    scenario_path: string;
    artifact_drift: ArtifactDriftCell[];
    /** High-level classification of where drift surfaced. */
    behavioral_drift_signal: BehavioralDriftSignal;
    /** ON-vs-OFF territorial flip-set — the flag's TRUE effect. Distinct from
     *  the within-run `control_delta.json` artifact (war trajectory). Only
     *  populated when the OFF baseline control map was captured in the same
     *  Tier 2 pass; otherwise `available: false`. */
    territorial_diff: TerritorialDiff;
}

export interface ComboScenarioRun {
    combo: SimCombo;
    gate: ComboGateState;
    scenarios: ScenarioRunResult[];
}

export interface Tier2Result {
    manifest_path: string;
    runs: ComboScenarioRun[];
}

export interface SimulatorResult {
    tier1: Tier1Result;
    tier2: Tier2Result | null;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SimulatorOptions {
    savePath?: string | null;
    rawSave?: unknown;
    faction?: SimFaction | null;
    combo?: SimCombo | null;
    runScenarios?: boolean;
    /** Test hook — inject a custom Tier 2 runner so tests don't have to spin
     *  the real `runScenario`. The runner receives the combo + scenario entry
     *  AFTER gate overrides have been set, and returns artifact hashes keyed
     *  by name AND the run's final OSID→controller map (for the ON-vs-OFF
     *  territorial diff). A legacy plain `Record<string, string>` return is
     *  still accepted (treated as hashes-only, `controlMap: null`). The
     *  simulator handles drift classification, territorial diffing, and gate
     *  reset. */
    tier2RunnerOverride?:
        | ((entry: ManifestScenarioEntry, combo: SimCombo) => Promise<Tier2RunnerOutput | Record<string, string>>)
        | null;
    /** Test hook — inject a manifest object directly instead of reading from
     *  disk. */
    manifestOverride?: BaselineManifest | null;
}

// ---------------------------------------------------------------------------
// Manifest types (local to avoid circular import on run_baseline_regression)
// ---------------------------------------------------------------------------

export interface ManifestScenarioEntry {
    id: string;
    scenario_path: string;
    weeks: number;
    expected_files: string[];
    hashes: Record<string, string>;
}

export interface BaselineManifest {
    schema_version: number;
    artifacts: string[];
    scenarios: ManifestScenarioEntry[];
}

/** Map of OSID → controlling faction (or null) read from a run's
 *  `final_save.json`. Used for the ON-vs-OFF territorial diff. */
export type ControlMap = Record<string, string | null>;

/** What a Tier 2 runner returns: artifact hashes (for the hash-drift signal,
 *  which correctly detects ANY divergence) AND the run's final control map
 *  (for the ON-vs-OFF territorial diff, the flag's true magnitude). */
export interface Tier2RunnerOutput {
    hashes: Record<string, string>;
    controlMap: ControlMap | null;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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
        const resolved = path.isAbsolute(savePath) ? savePath : path.join(repoRoot(), savePath);
        return existsSync(resolved) ? resolved : null;
    }
    const candidate = path.join(repoRoot(), DEFAULT_SAVE_PATH);
    return existsSync(candidate) ? candidate : null;
}

function readDimensionStore(rawSave: unknown): Record<string, Record<string, { effective_value?: unknown }>> | null {
    if (!isRecord(rawSave)) return null;
    const military = isRecord(rawSave.military) ? rawSave.military : null;
    const negotiation = military && isRecord(military.negotiation) ? military.negotiation : null;
    const store = negotiation && isRecord(negotiation.strategic_dimensions)
        ? negotiation.strategic_dimensions as Record<string, Record<string, { effective_value?: unknown }>>
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

function readDimEffective(
    store: Record<string, Record<string, { effective_value?: unknown }>> | null,
    faction: SimFaction,
    dimension: string,
): number | null {
    const cell = store?.[faction]?.[dimension];
    if (!cell) return null;
    return numberOrNull(cell.effective_value);
}

// ---------------------------------------------------------------------------
// Tier 1 — math-only projection
// ---------------------------------------------------------------------------

function buildFactionReadout(
    faction: SimFaction,
    store: Record<string, Record<string, { effective_value?: unknown }>> | null,
    gate: ComboGateState,
): FactionDimensionReadout {
    const intl = readDimEffective(store, faction, 'international_standing');
    const cohesion = readDimEffective(store, faction, 'internal_cohesion');

    // The active multiplier is the helper's value ONLY when global+sub-flag
    // are both ON (per the gate contract); otherwise force 1.0.
    const intlEligible = gate.global && gate.intl_standing;
    const cohesionEligible = gate.global && gate.cohesion;

    const intlMult = intlEligible
        ? getIntlStandingOpsHesitationMultiplier(intl ?? undefined)
        : 1.0;
    const cohesionMult = cohesionEligible
        ? getCohesionCautionBiasMultiplier(cohesion ?? undefined)
        : 1.0;
    const combined = intlMult * cohesionMult;

    return {
        faction,
        intl_standing: intl,
        cohesion,
        intl_multiplier_active: intlMult,
        cohesion_multiplier_active: cohesionMult,
        combined_active: combined,
        nontrivial: combined !== 1.0,
    };
}

function buildComboProjection(
    combo: SimCombo,
    store: Record<string, Record<string, { effective_value?: unknown }>> | null,
    factionFilter: SimFaction | null,
): ComboProjection {
    const gate = COMBO_GATES[combo];
    const factions: SimFaction[] = (factionFilter
        ? [factionFilter]
        : [...SIM_FACTIONS]).slice().sort(strictCompare) as SimFaction[];
    const readouts = factions.map((f) => buildFactionReadout(f, store, gate));
    const nontrivialCount = readouts.reduce((acc, r) => acc + (r.nontrivial ? 1 : 0), 0);
    return {
        combo,
        gate,
        factions: readouts,
        factions_with_nontrivial_multiplier: nontrivialCount,
    };
}

/** Build the Tier 1 math-only projection. Pure given inputs; deterministic. */
export function buildTier1Projection(options: SimulatorOptions = {}): Tier1Result {
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

    const store = readDimensionStore(rawSave);
    const meta = readMeta(rawSave);

    const comboFilter = options.combo ?? null;
    const factionFilter = options.faction ?? null;
    const combos: SimCombo[] = comboFilter ? [comboFilter] : [...SIM_COMBOS];
    // Preserve canonical declared order — already deterministic; do NOT
    // re-sort alphabetically because the procedural reading order
    // (global_off → both_on) carries activation-procedure semantics.

    return {
        save_path: resolvedPath,
        turn: meta.turn,
        scenario_id: meta.scenario_id,
        seed: meta.seed,
        combos: combos.map((c) => buildComboProjection(c, store, factionFilter)),
    };
}

// ---------------------------------------------------------------------------
// Tier 2 — real-scenario projection
// ---------------------------------------------------------------------------

/** Load the canonical manifest from disk. Throws if missing — Tier 2 cannot
 *  run without a committed baseline. */
async function loadManifest(): Promise<BaselineManifest> {
    const fullPath = path.join(repoRoot(), MANIFEST_PATH);
    if (!existsSync(fullPath)) {
        throw new Error(`Phase E simulator Tier 2 requires the baseline manifest at ${fullPath}. Run the baseline regression with UPDATE_BASELINES=1 first, or check out a branch that includes it.`);
    }
    const content = await readFile(fullPath, 'utf8');
    const raw = JSON.parse(content) as unknown;
    if (!isRecord(raw)) throw new Error('manifest.json: invalid root');
    if (!Array.isArray(raw.artifacts)) throw new Error('manifest.json: missing artifacts');
    if (!Array.isArray(raw.scenarios)) throw new Error('manifest.json: missing scenarios');
    return {
        schema_version: typeof raw.schema_version === 'number' ? raw.schema_version : 1,
        artifacts: (raw.artifacts as string[]).slice().sort(strictCompare),
        scenarios: (raw.scenarios as ManifestScenarioEntry[]).map((s) => ({
            id: s.id,
            scenario_path: s.scenario_path,
            weeks: s.weeks,
            expected_files: (s.expected_files ?? []).slice().sort(strictCompare),
            hashes: s.hashes && typeof s.hashes === 'object' ? { ...s.hashes } : {},
        })),
    };
}

/** Artifacts whose hash-drift indicates the bot took a different military
 *  action ON vs OFF. NOTE: `control_delta.json` is a WITHIN-RUN artifact
 *  (war start→end trajectory); its hash drifting proves divergence but its
 *  numbers are NOT the flag's territorial effect. The true effect is the
 *  ON-vs-OFF flip-set passed via `territorialDiff`. */
const BOT_MILITARY_ARTIFACTS = new Set([
    'activity_summary.json',
    'control_delta.json',
    'end_report.md',
    'final_save.json',
    'formation_delta.json',
    'run_summary.json',
    'watched_operations.json',
    'weekly_report.jsonl',
]);

/**
 * Classify the behavioral drift signal.
 *
 * The classification now KEYS ON the ON-vs-OFF territorial flip-set, not on
 * within-run `control_delta.json` hash drift alone. Rationale: the original
 * defect surfaced the war's natural trajectory (within-run control_delta) as
 * if it were the flag's effect, producing false "absurd cascade" reads.
 *
 *   • Non-empty ON-vs-OFF flip-set  → BOT-MILITARY (the flag genuinely changed
 *     which faction holds territory — its true magnitude).
 *   • Empty flip-set but a bot-military artifact hash drifted → DIMENSION-ONLY
 *     (the bot's intermediate behavior / logs differ, but final territory is
 *     identical ON vs OFF; do NOT cry "cascade").
 *   • No artifact drift at all → NO-DRIFT.
 *
 * Note: a flag that changes force structure (formation_delta) but flips zero
 * OSIDs is intentionally classified DIMENSION-ONLY here — territory is the
 * authoritative bot-military signal for this gate; the retained hash comparison
 * still surfaces any such divergence in output. This is a deliberate labeling
 * choice, not under-reporting.
 *
 * When the territorial diff is unavailable (e.g. OFF control map not captured —
 * a degenerate / test-only path), fall back to the legacy hash-only heuristic
 * so we never silently under-report.
 */
function classifyDriftSignal(
    cells: ArtifactDriftCell[],
    territorialDiff: TerritorialDiff,
): BehavioralDriftSignal {
    // The ON-vs-OFF flip-set is the AUTHORITATIVE measure of the flag's effect.
    // A non-empty flip-set is, by definition, a bot-military divergence — assert
    // it FIRST, independent of artifact-hash drift (the flip-set is ground truth
    // for the flag's territorial consequence).
    if (territorialDiff.available && territorialDiff.total_flips > 0) {
        return 'BOT-MILITARY';
    }

    const driftedArtifacts = cells.filter((c) => c.status === 'DRIFT').map((c) => c.artifact);
    if (driftedArtifacts.length === 0) return 'NO-DRIFT';

    if (territorialDiff.available) {
        // Diff known and EMPTY: the flag changed intermediate behavior / logs /
        // within-run trajectory but ended with identical territory ON vs OFF.
        // This is dimension/behavior-only — do NOT cry "cascade".
        return 'DIMENSION-ONLY';
    }

    // Legacy fallback (no ON-vs-OFF diff available): preserve prior behavior.
    const hasBotMilitary = driftedArtifacts.some((a) => BOT_MILITARY_ARTIFACTS.has(a));
    return hasBotMilitary ? 'BOT-MILITARY' : 'DIMENSION-ONLY';
}

/**
 * Compute the ON-vs-OFF territorial diff between an ON control map (this combo)
 * and the OFF baseline control map (`global_off`). Deterministic: flip-set is
 * stable-sorted via strictCompare on OSID; net-count delta sorted by controller.
 *
 * This is the flag's TRUE territorial effect — categorically distinct from the
 * within-run `control_delta.json` artifact (which is war start→end trajectory).
 */
export function computeTerritorialDiff(
    onMap: ControlMap | null,
    offMap: ControlMap | null,
): TerritorialDiff {
    if (onMap === null || offMap === null) {
        return { available: false, flipped_osids: [], total_flips: 0, net_control_count_delta: [] };
    }

    // Diff over the union of OSID keys so a controller appearing/disappearing
    // on either side is caught.
    const osids = Array.from(new Set([...Object.keys(onMap), ...Object.keys(offMap)])).sort(strictCompare);
    const flips: TerritorialFlip[] = [];
    for (const osid of osids) {
        const off = offMap[osid] ?? null;
        const on = onMap[osid] ?? null;
        if (off !== on) {
            flips.push({ osid, off_controller: off, on_controller: on });
        }
    }
    // Already in OSID order from the sorted iteration above.

    // Per-faction net OSID count change: (#ON-controls) − (#OFF-controls),
    // computed over flipped OSIDs only (unchanged OSIDs net to zero).
    const deltaMap = new Map<string | null, number>();
    for (const flip of flips) {
        if (flip.on_controller !== null) {
            deltaMap.set(flip.on_controller, (deltaMap.get(flip.on_controller) ?? 0) + 1);
        }
        if (flip.off_controller !== null) {
            deltaMap.set(flip.off_controller, (deltaMap.get(flip.off_controller) ?? 0) - 1);
        }
    }
    const net_control_count_delta = Array.from(deltaMap.entries())
        .map(([controller, delta]) => ({ controller, delta }))
        .filter((e) => e.delta !== 0)
        .sort((a, b) => {
            if (a.controller === null && b.controller === null) return 0;
            if (a.controller === null) return 1;
            if (b.controller === null) return -1;
            return strictCompare(a.controller, b.controller);
        });

    return {
        available: true,
        flipped_osids: flips,
        total_flips: flips.length,
        net_control_count_delta,
    };
}

function compareHashes(
    expected: Record<string, string>,
    actual: Record<string, string>,
    artifactList: string[],
): ArtifactDriftCell[] {
    return artifactList.slice().sort(strictCompare).map((artifact) => {
        const exp = expected[artifact] ?? null;
        const act = actual[artifact] ?? null;
        let status: ArtifactDriftStatus;
        if (exp === null) status = 'NO_BASELINE';
        else if (act === null) status = 'MISSING';
        else if (act === exp) status = 'FLAT';
        else status = 'DRIFT';
        return {
            artifact,
            status,
            expected_hash: exp,
            actual_hash: act,
        };
    });
}

/** Read the final OSID→controller map from a run's `final_save.json`. Returns
 *  null when the artifact is absent or malformed. Deterministic. */
async function readControlMapFromFinalSave(outDir: string): Promise<ControlMap | null> {
    const savePath = path.join(outDir, 'final_save.json');
    if (!existsSync(savePath)) return null;
    let raw: unknown;
    try {
        raw = JSON.parse(await readFile(savePath, 'utf8')) as unknown;
    } catch {
        return null;
    }
    if (!isRecord(raw)) return null;
    const political = isRecord(raw.political) ? raw.political : null;
    const pc = political && isRecord(political.political_controllers)
        ? political.political_controllers
        : null;
    if (!pc) return null;
    const map: ControlMap = {};
    for (const osid of Object.keys(pc).sort(strictCompare)) {
        const v = pc[osid];
        map[osid] = typeof v === 'string' && v.length > 0 ? v : null;
    }
    return map;
}

/** Default Tier 2 runner — invokes the exported `runScenario` via dynamic
 *  import so the simulator module stays lazy (import only when --run-scenarios
 *  is supplied). Hashes every manifest artifact AND reads the run's final
 *  control map for the ON-vs-OFF territorial diff. */
async function defaultTier2Runner(
    entry: ManifestScenarioEntry,
    combo: SimCombo,
): Promise<Tier2RunnerOutput> {
    const { runScenario } = await import('../../src/scenario/scenario_runner.js');
    const outDir = path.join(repoRoot(), TIER2_TMP_BASE, combo, entry.id);
    await mkdir(outDir, { recursive: true });
    const result = await runScenario({
        scenarioPath: path.join(repoRoot(), entry.scenario_path),
        outDirBase: path.join(outDir, '_dummy'),
        outDirOverride: outDir,
    });
    const hashes: Record<string, string> = {};
    for (const name of entry.expected_files.slice().sort(strictCompare)) {
        const artifactPath = path.join(result.outDir, name);
        if (!existsSync(artifactPath)) continue;
        const buf = await readFile(artifactPath);
        hashes[name] = createHash('sha256').update(buf).digest('hex');
    }
    const controlMap = await readControlMapFromFinalSave(result.outDir);
    return { hashes, controlMap };
}

/** Normalize a runner return (legacy hashes-only OR the new structured form)
 *  into a `Tier2RunnerOutput`. */
function normalizeRunnerOutput(out: Tier2RunnerOutput | Record<string, string>): Tier2RunnerOutput {
    const asUnknown = out as unknown;
    if (isRecord(asUnknown) && 'hashes' in asUnknown && isRecord(asUnknown.hashes)) {
        const structured = asUnknown as unknown as Tier2RunnerOutput;
        return { hashes: structured.hashes, controlMap: structured.controlMap ?? null };
    }
    // Legacy: plain hash map, no control map available.
    return { hashes: out as Record<string, string>, controlMap: null };
}

/** Apply gate overrides for a combo. Sub-flag overrides are written verbatim;
 *  the gate module itself enforces that sub-flags are inert when global is OFF. */
function applyGateForCombo(combo: SimCombo): void {
    const gate = COMBO_GATES[combo];
    setPoliticalDimensionPropagationOverride(gate.global);
    setIntlStandingOpsHesitationOverride(gate.intl_standing);
    setCohesionCautionBiasOverride(gate.cohesion);
}

/** Build the Tier 2 real-scenario projection. Sets per-combo gate overrides,
 *  runs each manifest scenario via the supplied runner, computes artifact-hash
 *  drift AND the true ON-vs-OFF territorial flip-set.
 *
 *  To produce the ON-vs-OFF diff the OFF baseline (`global_off`) is run once
 *  per scenario in the SAME Tier 2 pass (reusing the existing scenario runs —
 *  no extra runs beyond the OFF baseline) and its final control map is the
 *  reference the ON combos diff against. The hash-drift signal still compares
 *  every combo's artifacts against the committed manifest. Always resets gates
 *  in `finally`. NEVER writes baselines. */
export async function buildTier2Projection(
    options: SimulatorOptions = {},
): Promise<Tier2Result> {
    const comboFilter = options.combo ?? null;

    const onCombos: SimCombo[] = (comboFilter ? [comboFilter] : [...SIM_COMBOS])
        .filter((c) => c !== 'global_off');

    const runs: ComboScenarioRun[] = [];
    if (onCombos.length === 0) {
        resetPoliticalDimensionGates();
        return {
            manifest_path: MANIFEST_PATH,
            runs,
        };
    }

    const manifest = options.manifestOverride ?? (await loadManifest());
    const rawRunner = options.tier2RunnerOverride ?? defaultTier2Runner;
    const runner = async (entry: ManifestScenarioEntry, combo: SimCombo): Promise<Tier2RunnerOutput> =>
        normalizeRunnerOutput(await rawRunner(entry, combo));
    const sortedScenarios = manifest.scenarios.slice().sort((a, b) => strictCompare(a.id, b.id));

    try {
        // Pass 1 — run the OFF baseline (`global_off`) once per scenario to
        // capture the reference (flag-OFF) final control map. This is the
        // "OFF" side of the ON-vs-OFF diff. Gates OFF (the gate module's
        // default), set explicitly for determinism.
        applyGateForCombo('global_off');
        const offControlByScenario = new Map<string, ControlMap | null>();
        for (const entry of sortedScenarios) {
            const offOut = await runner(entry, 'global_off');
            offControlByScenario.set(entry.id, offOut.controlMap);
        }

        // Pass 2 — run each non-baseline combo, compute hash-drift AND the
        // ON-vs-OFF territorial diff against the captured OFF control map.
        for (const combo of onCombos) {
            applyGateForCombo(combo);
            const scenarios: ScenarioRunResult[] = [];
            for (const entry of sortedScenarios) {
                const onOut = await runner(entry, combo);
                const cells = compareHashes(entry.hashes, onOut.hashes, manifest.artifacts);
                const offMap = offControlByScenario.get(entry.id) ?? null;
                const territorialDiff = computeTerritorialDiff(onOut.controlMap, offMap);
                scenarios.push({
                    scenario_id: entry.id,
                    scenario_path: entry.scenario_path,
                    artifact_drift: cells,
                    behavioral_drift_signal: classifyDriftSignal(cells, territorialDiff),
                    territorial_diff: territorialDiff,
                });
            }
            runs.push({
                combo,
                gate: COMBO_GATES[combo],
                scenarios,
            });
        }
    } finally {
        // ALWAYS reset gates. Critical determinism invariant — if we leave
        // overrides set, subsequent in-process work (tests, sibling tools)
        // sees a polluted gate module.
        resetPoliticalDimensionGates();
    }

    return {
        manifest_path: MANIFEST_PATH,
        runs,
    };
}

// ---------------------------------------------------------------------------
// Orchestration entry-point
// ---------------------------------------------------------------------------

/** Build both tiers per options. Tier 2 is only run when explicitly requested. */
export async function runSimulator(
    options: SimulatorOptions = {},
): Promise<SimulatorResult> {
    const tier1 = buildTier1Projection(options);
    const tier2 = options.runScenarios
        ? await buildTier2Projection(options)
        : null;
    return { tier1, tier2 };
}

// ---------------------------------------------------------------------------
// Text rendering
// ---------------------------------------------------------------------------

function formatNumber(value: number | null, digits = 2): string {
    if (value === null) return 'n/a';
    return value.toFixed(digits);
}

function renderTier1(tier1: Tier1Result): string[] {
    const lines: string[] = [];
    lines.push('Phase E activation simulator — Tier 1 (math-only projection)');
    lines.push(`  save_path: ${tier1.save_path ?? '<inline>'}`);
    lines.push(`  turn: ${tier1.turn ?? 'n/a'} | scenario: ${tier1.scenario_id ?? 'n/a'} | seed: ${tier1.seed ?? 'n/a'}`);
    lines.push('');
    for (const projection of tier1.combos) {
        const g = projection.gate;
        const flagStr = `global=${g.global ? 'ON ' : 'off'} intl=${g.intl_standing ? 'ON ' : 'off'} cohesion=${g.cohesion ? 'ON ' : 'off'}`;
        lines.push(`[${projection.combo}] ${flagStr} | nontrivial-factions: ${projection.factions_with_nontrivial_multiplier}/${projection.factions.length}`);
        lines.push('    faction  intl    cohesion  intl_mult  cohesion_mult  combined');
        for (const f of projection.factions) {
            const intl = formatNumber(f.intl_standing).padStart(6, ' ');
            const coh = formatNumber(f.cohesion).padStart(6, ' ');
            const im = f.intl_multiplier_active.toFixed(3).padStart(6, ' ');
            const cm = f.cohesion_multiplier_active.toFixed(3).padStart(6, ' ');
            const cb = f.combined_active.toFixed(4).padStart(7, ' ');
            const marker = f.nontrivial ? '  <-- non-1.0' : '';
            lines.push(`    ${f.faction.padEnd(7, ' ')}  ${intl}   ${coh}    ${im}        ${cm}      ${cb}${marker}`);
        }
        lines.push('');
    }
    return lines;
}

function renderTier2(tier2: Tier2Result): string[] {
    const lines: string[] = [];
    lines.push('Phase E activation simulator — Tier 2 (real-scenario projection)');
    lines.push(`  manifest: ${tier2.manifest_path}`);
    lines.push('  NOTE: artifact-hash DRIFT detects ANY divergence ON vs OFF. The');
    lines.push('  within-run control_delta.json artifact is the war\'s start→end');
    lines.push('  TRAJECTORY — NOT the flag effect. The flag\'s ACTUAL effect is the');
    lines.push('  ON-vs-OFF territorial diff below.');
    lines.push('');
    if (tier2.runs.length === 0) {
        lines.push('  (no combos requested)');
        lines.push('');
        return lines;
    }
    for (const run of tier2.runs) {
        lines.push(`[combo=${run.combo}]`);
        for (const sc of run.scenarios) {
            lines.push(`  scenario=${sc.scenario_id} signal=${sc.behavioral_drift_signal}`);
            lines.push('  artifact-hash drift (detects ANY ON-vs-OFF divergence):');
            for (const cell of sc.artifact_drift) {
                const status = cell.status.padEnd(11, ' ');
                const exp = (cell.expected_hash ?? '<none>').slice(0, 12);
                const act = (cell.actual_hash ?? '<none>').slice(0, 12);
                const note = cell.artifact === 'control_delta.json'
                    ? '  (within-run trajectory — NOT the flag effect)'
                    : '';
                lines.push(`    ${cell.artifact.padEnd(28, ' ')} ${status} expected=${exp} actual=${act}${note}`);
            }
            // ON-vs-OFF territorial diff — the flag's TRUE effect.
            const td = sc.territorial_diff;
            if (!td.available) {
                lines.push('  ON-vs-OFF territorial diff: <unavailable — no OFF control map captured>');
            } else if (td.total_flips === 0) {
                lines.push('  ON-vs-OFF territorial diff (the flag\'s ACTUAL effect): 0 OSIDs flipped');
            } else {
                const netStr = td.net_control_count_delta
                    .map((e) => `${e.controller ?? 'null'}${e.delta >= 0 ? '+' : ''}${e.delta}`)
                    .join(' ');
                lines.push(`  ON-vs-OFF territorial diff (the flag's ACTUAL effect): ${td.total_flips} OSID(s) flipped | net: ${netStr}`);
                for (const flip of td.flipped_osids) {
                    lines.push(`    ${flip.osid.padEnd(36, ' ')} OFF=${flip.off_controller ?? 'null'} -> ON=${flip.on_controller ?? 'null'}`);
                }
            }
        }
        lines.push('');
    }
    return lines;
}

function printTextReport(result: SimulatorResult): void {
    const lines: string[] = [];
    lines.push(...renderTier1(result.tier1));
    if (result.tier2) lines.push(...renderTier2(result.tier2));
    process.stdout.write(`${lines.join('\n')}\n`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliArgs {
    savePath: string | null;
    json: boolean;
    faction: SimFaction | null;
    combo: SimCombo | null;
    runScenarios: boolean;
}

function parseFactionArg(value: string | undefined): SimFaction | null {
    if (!value) return null;
    if (value === 'RBiH' || value === 'RS' || value === 'HRHB') return value;
    throw new Error(`--faction must be one of RBiH, RS, HRHB; got ${value}`);
}

function parseComboArg(value: string | undefined): SimCombo | null {
    if (!value) return null;
    if ((SIM_COMBOS as readonly string[]).includes(value)) return value as SimCombo;
    throw new Error(`--combo must be one of ${SIM_COMBOS.join(', ')}; got ${value}`);
}

export function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        savePath: null,
        json: false,
        faction: null,
        combo: null,
        runScenarios: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--json') args.json = true;
        else if (arg === '--run-scenarios') args.runScenarios = true;
        else if (arg === '--save') { args.savePath = argv[i + 1] ?? null; i++; }
        else if (arg === '--faction') { args.faction = parseFactionArg(argv[i + 1]); i++; }
        else if (arg === '--combo') { args.combo = parseComboArg(argv[i + 1]); i++; }
    }
    return args;
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    let result: SimulatorResult;
    try {
        result = await runSimulator({
            savePath: args.savePath,
            faction: args.faction,
            combo: args.combo,
            runScenarios: args.runScenarios,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`phase_e_activation_simulator: ${message}\n`);
        process.exit(1);
    }

    if (args.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
    }
    printTextReport(result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    void main();
}
