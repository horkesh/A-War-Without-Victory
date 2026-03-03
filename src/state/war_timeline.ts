/**
 * War Timeline: data-driven faction temporal profiles.
 *
 * Externalizes all time-phased faction constants (doctrine phases, standing orders,
 * cohesion drift/floor/ceiling, reinforcement multipliers, equipment decay,
 * external support, maintenance decay) into a JSON-loadable format.
 *
 * Scenarios reference a timeline by ID (e.g. "apr1992"). The timeline is loaded
 * at scenario init and stored on GameState.war_timeline for runtime access.
 *
 * Consumer functions accept an optional timeline parameter; when absent they fall
 * back to existing hardcoded values (full backward compatibility).
 *
 * Deterministic: no randomness, no timestamps. Pure arithmetic resolvers.
 */

// ── Curve types ──────────────────────────────────────────────────────────────

/** Step function entry: value applies when start_turn <= turn < end_turn (exclusive end). */
export interface StepCurveEntry {
    start_turn: number;
    end_turn: number;
    value: number;
}

/** Keyframe interpolation: linear between [turn, value] pairs, sorted ascending by turn. */
export type KeyframeCurve = [turn: number, value: number][];

// ── Timeline sub-interfaces ──────────────────────────────────────────────────

/**
 * Doctrine phase definition (shared by timeline JSON and hardcoded FACTION_DOCTRINE_PHASES).
 * bot_strategy.ts DoctrinePhase is structurally identical — consumers accept either.
 */
export interface DoctrinePhase {
    start_week: number;
    end_week: number;
    default_corps_stance: 'defensive' | 'balanced' | 'offensive';
    max_attack_share_override: number;
    aggression_modifier: number;
}

/**
 * Standing order definition (shared by timeline JSON and hardcoded FACTION_STANDING_ORDERS).
 * bot_strategy.ts StandingOrder is structurally identical — consumers accept either.
 */
export interface StandingOrder {
    name: string;
    start_week: number;
    end_week: number;
    army_stance: 'general_defensive' | 'balanced' | 'general_offensive' | 'total_mobilization';
    description: string;
}

export interface EquipmentDecayConfig {
    faction: string;
    start_week: number;
    rate_per_week: number;
    floor: number;
}

/**
 * External support window: combat multiplier for a faction in specific municipalities.
 * Uses end_turn (not end_week) because it gates on absolute turn count — turn and week
 * are synonymous in this codebase (1 turn = 1 week).
 */
export interface ExternalSupportWindow {
    faction: string;
    end_turn: number;
    municipalities: string[];
    combat_multiplier: number;
}

export interface MaintenanceDecayConfig {
    faction: string;
    formula: 'linear_decay';
    floor: number;
    divisor: number;
}

// ── Main interface ───────────────────────────────────────────────────────────

export interface WarTimeline {
    id: string;
    doctrine_phases: Record<string, DoctrinePhase[]>;
    standing_orders: Record<string, StandingOrder[]>;
    cohesion_drift: Record<string, StepCurveEntry[]>;
    cohesion_floor: Record<string, KeyframeCurve | number>;
    cohesion_ceiling: Record<string, KeyframeCurve | number>;
    reinforcement_mult: Record<string, StepCurveEntry[]>;
    equipment_decay: EquipmentDecayConfig[];
    external_support: ExternalSupportWindow[];
    maintenance_decay: MaintenanceDecayConfig[];
    /** Per-faction officer configuration. Keys: faction IDs (RS, RBiH, HRHB). Optional; hardcoded defaults used when absent. */
    officer_config?: Record<string, import('./officer_types.js').FactionOfficerConfig>;
}

// ── Generic lookup functions ─────────────────────────────────────────────────

/**
 * Step curve lookup: find the entry where start_turn <= turn < end_turn.
 * Returns defaultValue when entries is undefined/empty or no entry matches.
 * Sequential scan — deterministic for sorted entries.
 */
export function lookupStepCurve(entries: StepCurveEntry[] | undefined, turn: number, defaultValue: number): number {
    if (!entries || entries.length === 0) return defaultValue;
    for (const e of entries) {
        if (turn >= e.start_turn && turn < e.end_turn) return e.value;
    }
    return defaultValue;
}

/**
 * Keyframe interpolation: linear interpolation between [turn, value] pairs.
 * Clamps to first/last value outside range. Returns defaultValue when keyframes
 * is undefined or empty. Deterministic: pure arithmetic.
 */
export function interpolateKeyframeCurve(keyframes: KeyframeCurve | undefined, turn: number, defaultValue: number): number {
    if (!keyframes || keyframes.length === 0) return defaultValue;
    if (keyframes.length === 1) return keyframes[0]![1];
    const first = keyframes[0]!;
    if (turn <= first[0]) return first[1];
    const last = keyframes[keyframes.length - 1]!;
    if (turn >= last[0]) return last[1];
    for (let i = 0; i < keyframes.length - 1; i++) {
        const [t0, v0] = keyframes[i]!;
        const [t1, v1] = keyframes[i + 1]!;
        if (turn >= t0 && turn <= t1) {
            const frac = (turn - t0) / (t1 - t0);
            return v0 + frac * (v1 - v0);
        }
    }
    return last[1];
}

/**
 * Resolve a cohesion bound spec: either a constant number or a keyframe curve.
 * Returns defaultValue when spec is undefined.
 */
export function resolveCohesionBound(spec: KeyframeCurve | number | undefined, turn: number, defaultValue: number): number {
    if (spec === undefined) return defaultValue;
    if (typeof spec === 'number') return spec;
    return interpolateKeyframeCurve(spec, turn, defaultValue);
}

/**
 * Compute maintenance capacity multiplier from a MaintenanceDecayConfig.
 * Currently supports 'linear_decay' formula: max(floor, 1.0 - turn / divisor).
 * Returns 1.0 when config is undefined.
 */
export function computeMaintenanceMult(config: MaintenanceDecayConfig | undefined, turn: number): number {
    if (!config) return 1.0;
    if (turn <= 0) return 1.0;
    return Math.max(config.floor, 1.0 - turn / config.divisor);
}

// ── Validation ───────────────────────────────────────────────────────────────

/** Helper: validate step curve entries are well-formed and contiguous. */
function validateStepCurveEntries(entries: unknown[], label: string): void {
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (typeof e !== 'object' || e === null) {
            throw new Error(`WarTimeline: ${label}[${i}] must be an object`);
        }
        const entry = e as Record<string, unknown>;
        if (typeof entry.start_turn !== 'number' || typeof entry.end_turn !== 'number' || typeof entry.value !== 'number') {
            throw new Error(`WarTimeline: ${label}[${i}] must have numeric start_turn, end_turn, value`);
        }
        if (entry.start_turn >= entry.end_turn) {
            throw new Error(`WarTimeline: ${label}[${i}] has start_turn >= end_turn (${entry.start_turn} >= ${entry.end_turn})`);
        }
        if (i > 0) {
            const prev = entries[i - 1] as Record<string, unknown>;
            if ((prev.end_turn as number) !== entry.start_turn) {
                throw new Error(`WarTimeline: ${label} gap/overlap between entries ${i - 1} and ${i} (end_turn=${prev.end_turn}, start_turn=${entry.start_turn})`);
            }
        }
    }
}

/**
 * Validate and type-narrow a parsed JSON object into a WarTimeline.
 * Throws descriptive errors on invalid structure.
 * Validates contiguity and ordering of step curve entries.
 * Does NOT sort or reorder — trusts author ordering (determinism).
 */
export function validateWarTimeline(raw: unknown): WarTimeline {
    if (!raw || typeof raw !== 'object') {
        throw new Error('WarTimeline: expected an object');
    }
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== 'string' || obj.id.length === 0) {
        throw new Error('WarTimeline: "id" must be a non-empty string');
    }

    // Required top-level fields
    for (const field of ['doctrine_phases', 'standing_orders', 'cohesion_drift', 'cohesion_floor', 'cohesion_ceiling', 'reinforcement_mult']) {
        if (!obj[field] || typeof obj[field] !== 'object') {
            throw new Error(`WarTimeline: "${field}" must be an object`);
        }
    }
    for (const field of ['equipment_decay', 'external_support', 'maintenance_decay']) {
        if (!Array.isArray(obj[field])) {
            throw new Error(`WarTimeline: "${field}" must be an array`);
        }
    }

    // Validate doctrine phases entries
    for (const [faction, phases] of Object.entries(obj.doctrine_phases as Record<string, unknown>)) {
        if (!Array.isArray(phases)) {
            throw new Error(`WarTimeline: doctrine_phases["${faction}"] must be an array`);
        }
        for (let i = 0; i < phases.length; i++) {
            const p = phases[i];
            if (typeof p !== 'object' || p === null) {
                throw new Error(`WarTimeline: doctrine_phases["${faction}"][${i}] must be an object`);
            }
            const phase = p as Record<string, unknown>;
            if (typeof phase.start_week !== 'number' || typeof phase.end_week !== 'number') {
                throw new Error(`WarTimeline: doctrine_phases["${faction}"][${i}] must have numeric start_week and end_week`);
            }
            if ((phase.start_week as number) >= (phase.end_week as number)) {
                throw new Error(`WarTimeline: doctrine_phases["${faction}"][${i}] has start_week >= end_week`);
            }
        }
    }

    // Validate step curve entries (contiguity + ordering)
    for (const field of ['cohesion_drift', 'reinforcement_mult'] as const) {
        for (const [faction, entries] of Object.entries(obj[field] as Record<string, unknown>)) {
            if (!Array.isArray(entries)) {
                throw new Error(`WarTimeline: ${field}["${faction}"] must be an array`);
            }
            validateStepCurveEntries(entries, `${field}["${faction}"]`);
        }
    }

    // Validate equipment_decay entries
    for (let i = 0; i < (obj.equipment_decay as unknown[]).length; i++) {
        const d = (obj.equipment_decay as unknown[])[i] as Record<string, unknown> | null;
        if (typeof d !== 'object' || d === null) {
            throw new Error(`WarTimeline: equipment_decay[${i}] must be an object`);
        }
        if (typeof d.faction !== 'string') throw new Error(`WarTimeline: equipment_decay[${i}].faction must be a string`);
        if (typeof d.start_week !== 'number') throw new Error(`WarTimeline: equipment_decay[${i}].start_week must be a number`);
        if (typeof d.rate_per_week !== 'number') throw new Error(`WarTimeline: equipment_decay[${i}].rate_per_week must be a number`);
        if (typeof d.floor !== 'number') throw new Error(`WarTimeline: equipment_decay[${i}].floor must be a number`);
    }

    // Validate external_support entries
    for (let i = 0; i < (obj.external_support as unknown[]).length; i++) {
        const s = (obj.external_support as unknown[])[i] as Record<string, unknown> | null;
        if (typeof s !== 'object' || s === null) {
            throw new Error(`WarTimeline: external_support[${i}] must be an object`);
        }
        if (typeof s.faction !== 'string') throw new Error(`WarTimeline: external_support[${i}].faction must be a string`);
        if (typeof s.end_turn !== 'number') throw new Error(`WarTimeline: external_support[${i}].end_turn must be a number`);
        if (!Array.isArray(s.municipalities)) throw new Error(`WarTimeline: external_support[${i}].municipalities must be an array`);
        if (typeof s.combat_multiplier !== 'number') throw new Error(`WarTimeline: external_support[${i}].combat_multiplier must be a number`);
    }

    // Validate maintenance_decay entries
    for (let i = 0; i < (obj.maintenance_decay as unknown[]).length; i++) {
        const m = (obj.maintenance_decay as unknown[])[i] as Record<string, unknown> | null;
        if (typeof m !== 'object' || m === null) {
            throw new Error(`WarTimeline: maintenance_decay[${i}] must be an object`);
        }
        if (typeof m.faction !== 'string') throw new Error(`WarTimeline: maintenance_decay[${i}].faction must be a string`);
        if (typeof m.floor !== 'number') throw new Error(`WarTimeline: maintenance_decay[${i}].floor must be a number`);
        if (typeof m.divisor !== 'number') throw new Error(`WarTimeline: maintenance_decay[${i}].divisor must be a number`);
    }

    // Validate officer_config (optional)
    if (obj.officer_config !== undefined) {
        if (typeof obj.officer_config !== 'object' || obj.officer_config === null) {
            throw new Error('WarTimeline: "officer_config" must be an object when present');
        }
        for (const [faction, config] of Object.entries(obj.officer_config as Record<string, unknown>)) {
            if (typeof config !== 'object' || config === null) {
                throw new Error(`WarTimeline: officer_config["${faction}"] must be an object`);
            }
            const c = config as Record<string, unknown>;
            if (typeof c.learning_rate !== 'number') {
                throw new Error(`WarTimeline: officer_config["${faction}"].learning_rate must be a number`);
            }
            if (typeof c.faction !== 'string') {
                throw new Error(`WarTimeline: officer_config["${faction}"].faction must be a string`);
            }
        }
    }

    return obj as unknown as WarTimeline;
}
