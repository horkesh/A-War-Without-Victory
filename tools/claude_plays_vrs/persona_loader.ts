/**
 * D1 Persona Loader (LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS).
 *
 * Loads persona JSON files from `tools/claude_plays_vrs/personas/` and applies
 * the lookup chain documented in the D-lane DDR (`85f43f5a`):
 *
 *   1. Direct lookup by officer_id (e.g. 'mladic', 'halilovic', 'vrs_drina_corps_co').
 *   2. Auto-swap by tenure: when called with `(faction, role, turn)` and an
 *      A4 roster successor schedule, return the persona of the active officer
 *      for that faction/role at that turn.
 *   3. Archetype fallback: if no named-officer persona exists for a requested
 *      corps_co (corps_id not in {drina, srk, 1kk}), return `default_corps_co`.
 *
 * Reads `data/scenarios/army_co_roster.json` (A4) for tenure schedules. The
 * roster file is treated as scalar substrate — this loader does NOT modify it.
 *
 * Determinism: pure file IO + sorted iteration. No Math.random / Date.now /
 * timestamps. Caches loaded personas in module scope keyed by id.
 *
 * Predecessors: A1 18136710 / A2 ba6955bf / A3 c8ff93d8 / A4 93c75b1d /
 * B1 44053a32 / B2 d019bef7 / C1 5084071d / C2 f24ad5d7 / Q1 6cbcaa00 /
 * Q2 3bab0eb0 / Q3 aa30f349 / API-Bridge a2d564e6 / drina-fix 03ef9cd4.
 *
 * Sensitive-history compliance: Ring 0 / tooling-only QA harness. No engine
 * touch. Faction-symmetric mechanism (same code paths per layer); voice/data
 * is faction-asymmetric via persona JSON files.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ─── Types ─────────────────────────────────────────────────────────────────

export type PersonaRole = 'president' | 'army_co' | 'corps_co';
export type PersonaFaction = 'RBiH' | 'RS' | 'HRHB';

export interface PersonaTenureWindow {
    tenure_start: number;
    tenure_end_default: number | null;
    stubbornness?: number;
}

export interface Persona {
    id: string;
    role: PersonaRole;
    faction: PersonaFaction | null;
    name: string;
    corps_id?: string | null;
    tenure_window: PersonaTenureWindow;
    voice_prose: string;
    decision_priors: Record<string, unknown>;
    system_prompt_template: string;
    _sources: string[];
}

export interface RosterEntry {
    officer_id: string;
    tenure_start: number;
    tenure_end_default: number | null;
    stubbornness: number;
    replacement_trigger?: string;
    replaces_with?: string | null;
}

export interface FactionRoster {
    main_staff_formation_id: string;
    schedule: RosterEntry[];
}

export interface ArmyCoRoster {
    schema_version: string;
    rosters: Record<PersonaFaction, FactionRoster>;
}

// ─── Module-scope caches ───────────────────────────────────────────────────

let _personaCache: Map<string, Persona> | null = null;
let _rosterCache: ArmyCoRoster | null = null;

/**
 * Resolve the personas directory. Defaults to
 * `tools/claude_plays_vrs/personas/` relative to process.cwd(), but tests
 * may pass an explicit override.
 */
function personasDir(override?: string): string {
    if (override) return override;
    return resolve(process.cwd(), 'tools/claude_plays_vrs/personas');
}

/**
 * Resolve the army-CO roster path. Defaults to
 * `data/scenarios/army_co_roster.json`. Tests may override.
 */
function rosterPath(override?: string): string {
    if (override) return override;
    return resolve(process.cwd(), 'data/scenarios/army_co_roster.json');
}

// ─── Schema validation ─────────────────────────────────────────────────────

const REQUIRED_FIELDS: ReadonlyArray<keyof Persona> = [
    'id',
    'role',
    'name',
    'tenure_window',
    'voice_prose',
    'decision_priors',
    'system_prompt_template',
];

const VALID_ROLES: ReadonlySet<string> = new Set(['president', 'army_co', 'corps_co']);

/**
 * Validate a parsed persona JSON object against the D1 schema. Returns null
 * on success, or an error string describing the first violation.
 *
 * Determinism: pure function over object shape; no IO.
 */
export function validatePersonaSchema(obj: unknown, expectedId?: string): string | null {
    if (!obj || typeof obj !== 'object') return 'persona is not an object';
    const p = obj as Record<string, unknown>;
    for (const field of REQUIRED_FIELDS) {
        if (!(field in p)) return `missing required field: ${field}`;
    }
    if (typeof p.id !== 'string' || p.id.length === 0) return 'id must be a non-empty string';
    if (expectedId && p.id !== expectedId) return `id (${p.id}) does not match filename (${expectedId})`;
    if (typeof p.role !== 'string' || !VALID_ROLES.has(p.role)) return `role must be one of: president|army_co|corps_co`;
    if (typeof p.name !== 'string' || p.name.length === 0) return 'name must be a non-empty string';
    if (typeof p.voice_prose !== 'string' || p.voice_prose.length === 0) return 'voice_prose must be a non-empty string';
    if (typeof p.system_prompt_template !== 'string' || p.system_prompt_template.length === 0) return 'system_prompt_template must be a non-empty string';
    if (!p.tenure_window || typeof p.tenure_window !== 'object') return 'tenure_window must be an object';
    const tw = p.tenure_window as Record<string, unknown>;
    if (typeof tw.tenure_start !== 'number') return 'tenure_window.tenure_start must be a number';
    if (tw.tenure_end_default !== null && typeof tw.tenure_end_default !== 'number') return 'tenure_window.tenure_end_default must be a number or null';
    if (!p.decision_priors || typeof p.decision_priors !== 'object') return 'decision_priors must be an object';
    if (!Array.isArray(p._sources)) return '_sources must be an array';
    return null;
}

// ─── Persona loading ───────────────────────────────────────────────────────

/**
 * Load all persona JSON files from the personas directory and populate the
 * module-scope cache. Reads files in alphabetical order for determinism.
 *
 * @param dirOverride optional path override (used by tests).
 */
function _loadAllPersonas(dirOverride?: string): Map<string, Persona> {
    const dir = personasDir(dirOverride);
    const cache = new Map<string, Persona>();
    if (!existsSync(dir)) return cache;
    const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
    for (const file of files) {
        const fullPath = join(dir, file);
        const raw = readFileSync(fullPath, 'utf8');
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            throw new Error(`persona_loader: failed to parse ${file}: ${(err as Error).message}`);
        }
        const expectedId = file.replace(/\.json$/, '');
        const violation = validatePersonaSchema(parsed, expectedId);
        if (violation) {
            throw new Error(`persona_loader: ${file} schema violation: ${violation}`);
        }
        const persona = parsed as Persona;
        cache.set(persona.id, persona);
    }
    return cache;
}

/**
 * Reset the module-scope cache. Tests call this between runs to force a
 * fresh load.
 */
export function resetPersonaCache(): void {
    _personaCache = null;
    _rosterCache = null;
}

/**
 * Load and return the persona for the given officer_id. Applies the lookup
 * chain:
 *   1. Direct cache hit.
 *   2. Archetype fallback for corps_co requests not in the named-officer set.
 *
 * Returns null when no persona is available (and the request is not a
 * corps_co fallback case).
 *
 * @param officerId    canonical officer id (matches persona JSON filename).
 * @param opts.role    optional role hint to enable archetype fallback.
 * @param opts.dirOverride optional personas-directory override (tests).
 */
export function loadPersona(
    officerId: string,
    opts: { role?: PersonaRole; dirOverride?: string } = {},
): Persona | null {
    if (_personaCache === null) {
        _personaCache = _loadAllPersonas(opts.dirOverride);
    }
    const direct = _personaCache.get(officerId);
    if (direct) return direct;

    // Archetype fallback for corps_co.
    if (opts.role === 'corps_co') {
        const archetype = _personaCache.get('default_corps_co');
        if (archetype) return archetype;
    }
    return null;
}

// ─── Roster loading + tenure resolution ────────────────────────────────────

/**
 * Load and cache the A4 army-CO roster. Returns null if the roster file is
 * absent (treated as a no-roster environment — tests may run without it).
 */
export function loadRoster(pathOverride?: string): ArmyCoRoster | null {
    if (_rosterCache !== null) return _rosterCache;
    const p = rosterPath(pathOverride);
    if (!existsSync(p)) return null;
    const raw = readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw) as ArmyCoRoster;
    _rosterCache = parsed;
    return parsed;
}

/**
 * Strip A4 roster officer_id prefix (e.g. 'vrs_mladic' -> 'mladic',
 * 'arbih_halilovic' -> 'halilovic', 'hvo_petkovic' -> 'petkovic'). Persona
 * filenames use the prefix-stripped form; the A4 roster uses the prefixed
 * form. This bridge is the single point where the two namespaces meet.
 *
 * Determinism: pure string transform, no IO.
 */
export function rosterOfficerIdToPersonaId(rosterOfficerId: string): string {
    return rosterOfficerId.replace(/^(vrs_|arbih_|hvo_)/, '');
}

/**
 * Auto-swap: given a faction, role, and turn, return the persona of the
 * active officer at that turn per the A4 roster schedule.
 *
 * For role='army_co': consults the roster's per-faction schedule and
 * picks the entry whose tenure_start <= turn and (tenure_end_default == null
 * OR turn < next entry's tenure_start). The active officer's roster id is
 * mapped to a persona id and loaded via `loadPersona`.
 *
 * For role='president' or role='corps_co': not auto-swapped (the loader
 * caller passes the canonical persona id directly for those layers).
 *
 * Returns null if no roster is available, or no schedule entry covers the
 * given turn.
 */
export function loadPersonaByTenure(
    faction: PersonaFaction,
    role: PersonaRole,
    turn: number,
    opts: { dirOverride?: string; rosterPathOverride?: string } = {},
): Persona | null {
    if (role !== 'army_co') return null;
    const roster = loadRoster(opts.rosterPathOverride);
    if (!roster) return null;
    const factionRoster = roster.rosters?.[faction];
    if (!factionRoster || !Array.isArray(factionRoster.schedule)) return null;

    // Sort schedule entries by tenure_start (ascending). Determinism: stable
    // sort because Array.prototype.sort is stable in modern Node.
    const sorted = [...factionRoster.schedule].sort((a, b) => a.tenure_start - b.tenure_start);

    // Find the latest entry whose tenure_start <= turn. The next entry's
    // tenure_start defines the implicit end of the current entry's tenure.
    let active: RosterEntry | null = null;
    for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i];
        if (entry.tenure_start > turn) break;
        const nextStart = i + 1 < sorted.length ? sorted[i + 1].tenure_start : Infinity;
        const explicitEnd = entry.tenure_end_default ?? Infinity;
        const effectiveEnd = Math.min(nextStart, explicitEnd);
        if (turn < effectiveEnd) {
            active = entry;
        }
    }
    if (!active) return null;
    const personaId = rosterOfficerIdToPersonaId(active.officer_id);
    return loadPersona(personaId, { role: 'army_co', dirOverride: opts.dirOverride });
}
