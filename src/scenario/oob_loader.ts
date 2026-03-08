/**
 * Load and validate OOB (Order of Battle) data: brigades and corps.
 * Validates faction and mun1990_id against municipalities_1990_registry_110.json.
 * Returns lists in deterministic order (brigades: by faction then name; corps: by faction then name).
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BrigadeComposition, FactionId } from '../state/game_state.js';
import type { HistoricalDecoration } from '../state/decoration_types.js';
import type { EquipmentClass } from '../state/recruitment_types.js';
import { isValidEquipmentClass, RECRUITMENT_DEFAULTS } from '../state/recruitment_types.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

export interface OobBrigade {
    id: string;
    faction: FactionId;
    name: string;
    home_mun: string;
    corps?: string;
    kind: 'brigade' | 'operational_group' | 'corps_asset';
    // Recruitment cost fields (optional for backward compat; defaults applied by loader)
    manpower_cost: number;
    capital_cost: number;
    default_equipment_class: EquipmentClass;
    priority: number;
    mandatory: boolean;
    available_from: number;
    max_personnel: number;
    /** Per-brigade initial personnel override. When set, used instead of FACTION_INITIAL_PERSONNEL. For Phase 0→II scenarios, Phase 0 gameplay determines this; for April 1992 start, these are defaults. */
    initial_personnel?: number;
    /** Per-brigade initial cohesion override [0,100]. When set, used instead of FACTION_INITIAL_COHESION. */
    initial_cohesion?: number;
    /** Unit honor/decoration title: slavna (10% combat bonus), viteska (20% combat bonus). */
    honor?: 'slavna' | 'viteska';
    /** Explicit OSID for initial placement (e.g. "op:brcko:brezovo_polje_selo_2"). Overrides home_mun HQ OSID. */
    home_osid?: string;
    /** Explicit brigade composition (tanks, artillery, infantry). When set, overrides faction defaults. Used for enclave brigades (infantry-only). */
    composition?: BrigadeComposition;
    /** Initial morale [0,100]. When set, overrides default (60). Enclave brigades: 70 (desperation bonus). */
    initial_morale?: number;
    /** Custom tags from OOB (e.g. 'enclave'). Merged into formation tags at creation. */
    tags?: string[];
    /** Per-brigade terrain defense bonus (e.g. mountain/fortified position). Multiplicative: × (1 + bonus). */
    defense_terrain_bonus?: number;
    /** When set, brigade recruits from this faction's militia pools instead of its own faction. */
    recruit_pool_faction?: FactionId;
    /** Fallback OSID for reform when home territory is overrun. Brigade teleports here instead of being eliminated. */
    fallback_osid?: string;

    // --- OOB Rework fields ---
    /** Week when formation is disbanded/destroyed (null = survives entire war). */
    available_until?: number;
    /** Target brigade ID if this formation merges into another. */
    merged_into_id?: string;
    /** Army-level elite unit, eligible for elite loan system. */
    is_elite?: boolean;
    /** Garrison unit — only defends, never attacks. */
    garrison?: boolean;
    /** Pre-assigned historical decorations (loaded from OOB data). */
    historical_decorations?: HistoricalDecoration[];
    /** Initial brigade officer quality [0,1]. When set, overrides faction default. Elite units get higher values. */
    initial_officer_quality?: number;
    /**
     * Historical distinction potential. Reduces decoration-earning thresholds.
     * Replaces pre-awarding historical_decorations at war start.
     */
    distinction_potential?: 'tier_1' | 'tier_2' | 'tier_3';
}

export interface OobCorps {
    id: string;
    faction: FactionId;
    name: string;
    hq_mun: string;
    /** Optional historical corps HQ OSID (op:mun:slug). When set, used as formation location_osid. */
    hq_osid?: string;
    kind: 'corps' | 'army_hq';
    /** Turn when this corps becomes available (Peace-phase Overhaul: phased activation). Default 0. */
    available_from: number;
    /** Initial officer quality [0,1]. Army HQs reflect general staff competence at war start. */
    initial_officer_quality?: number;
    /** Initial cohesion [0,100]. Army HQs reflect organizational readiness at war start. */
    initial_cohesion?: number;
    /** Initial morale [0,100]. Only set when army HQ starts historically disorganized. */
    initial_morale?: number;
}

interface RegistryRow {
    mun1990_id: string;
    name?: string;
    normalized_name?: string;
}

async function loadRegistryMunIds(baseDir: string): Promise<Set<string>> {
    const path = resolve(baseDir, 'data/source/municipalities_1990_registry_110.json');
    const raw = JSON.parse(await readFile(path, 'utf8')) as { rows?: RegistryRow[] };
    const rows = raw.rows ?? [];
    const set = new Set<string>();
    for (const row of rows) {
        if (typeof row.mun1990_id === 'string') set.add(row.mun1990_id);
    }
    return set;
}

function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Load OOB brigades from data/source/oob_brigades.json.
 * Validates faction and home_mun. Returns array in stable order (faction then name).
 */
export async function loadOobBrigades(baseDir: string): Promise<OobBrigade[]> {
    const path = resolve(baseDir, 'data/source/oob_brigades.json');
    const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
    const registry = await loadRegistryMunIds(baseDir);

    const rows = Array.isArray(raw)
        ? raw
        : isRecord(raw) && Array.isArray(raw.brigades)
            ? raw.brigades
            : [];
    const result: OobBrigade[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!isRecord(r) || typeof r.id !== 'string' || typeof r.faction !== 'string' || typeof r.name !== 'string' || typeof r.home_mun !== 'string') {
            throw new Error(`Invalid OOB brigade at index ${i}: required id, faction, name, home_mun`);
        }
        const id = r.id.trim();
        if (seenIds.has(id)) throw new Error(`Duplicate OOB brigade id: ${id}`);
        seenIds.add(id);

        const faction = r.faction.trim() as FactionId;
        if (!CANONICAL_FACTIONS.includes(faction)) {
            throw new Error(`Invalid OOB brigade ${id}: faction must be RBiH, RS, or HRHB, got ${r.faction}`);
        }
        const home_mun = r.home_mun.trim();
        if (!registry.has(home_mun)) {
            throw new Error(`Invalid OOB brigade ${id}: home_mun "${home_mun}" not in registry`);
        }
        const kind = (r.kind === 'operational_group' || r.kind === 'corps_asset') ? r.kind : 'brigade';
        // Parse recruitment cost fields with defaults
        const manpower_cost = typeof r.manpower_cost === 'number' && Number.isFinite(r.manpower_cost) ? r.manpower_cost : RECRUITMENT_DEFAULTS.manpower_cost;
        const capital_cost = typeof r.capital_cost === 'number' && Number.isFinite(r.capital_cost) ? r.capital_cost : RECRUITMENT_DEFAULTS.capital_cost;
        const raw_equip_class = typeof r.default_equipment_class === 'string' ? r.default_equipment_class.trim() : '';
        const default_equipment_class: EquipmentClass = isValidEquipmentClass(raw_equip_class) ? raw_equip_class : RECRUITMENT_DEFAULTS.default_equipment_class;
        const priority = typeof r.priority === 'number' && Number.isFinite(r.priority) ? r.priority : RECRUITMENT_DEFAULTS.priority;
        const mandatory = r.mandatory === true;
        const available_from = typeof r.available_from === 'number' && Number.isFinite(r.available_from) ? r.available_from : RECRUITMENT_DEFAULTS.available_from;
        const max_personnel = typeof r.max_personnel === 'number' && Number.isFinite(r.max_personnel) ? r.max_personnel : RECRUITMENT_DEFAULTS.max_personnel;
        // Per-brigade optional overrides (April 1992 defaults; Phase 0 gameplay overrides these)
        const initial_personnel = typeof r.initial_personnel === 'number' && Number.isFinite(r.initial_personnel) ? r.initial_personnel : undefined;
        const initial_cohesion = typeof r.initial_cohesion === 'number' && Number.isFinite(r.initial_cohesion) ? r.initial_cohesion : undefined;
        const honor = (r.honor === 'slavna' || r.honor === 'viteska') ? r.honor as 'slavna' | 'viteska' : undefined;
        const home_osid = typeof r.home_osid === 'string' && r.home_osid.trim() ? r.home_osid.trim() : undefined;
        const initial_morale = typeof r.initial_morale === 'number' && Number.isFinite(r.initial_morale) ? r.initial_morale : undefined;
        const composition = isRecord(r.composition) ? r.composition as unknown as BrigadeComposition : undefined;
        const oobTags = Array.isArray(r.tags) ? (r.tags as unknown[]).filter((t): t is string => typeof t === 'string').map(t => t.trim()).filter(t => t.length > 0) : undefined;
        const defense_terrain_bonus = typeof r.defense_terrain_bonus === 'number' && Number.isFinite(r.defense_terrain_bonus) ? r.defense_terrain_bonus : undefined;
        const recruit_pool_faction = typeof r.recruit_pool_faction === 'string' && CANONICAL_FACTIONS.includes(r.recruit_pool_faction.trim() as FactionId)
            ? r.recruit_pool_faction.trim() as FactionId : undefined;
        const fallback_osid = typeof r.fallback_osid === 'string' && r.fallback_osid.trim() ? r.fallback_osid.trim() : undefined;
        // OOB Rework fields
        const available_until = typeof r.available_until === 'number' && Number.isFinite(r.available_until) ? r.available_until : undefined;
        const merged_into_id = typeof r.merged_into_id === 'string' && r.merged_into_id.trim() ? r.merged_into_id.trim() : undefined;
        const is_elite = r.is_elite === true ? true : undefined;
        const garrison = r.garrison === true ? true : undefined;
        const historical_decorations: HistoricalDecoration[] | undefined = Array.isArray(r.historical_decorations)
            ? (r.historical_decorations as unknown[]).filter((d): d is Record<string, unknown> =>
                isRecord(d) && typeof d.tier === 'string' && typeof d.name === 'string'
            ).map(d => ({ tier: d.tier as HistoricalDecoration['tier'], name: String(d.name).trim() }))
            : undefined;
        const initial_officer_quality = typeof r.initial_officer_quality === 'number' && Number.isFinite(r.initial_officer_quality)
            ? Math.max(0, Math.min(1, r.initial_officer_quality)) : undefined;
        const distinction_potential = (r.distinction_potential === 'tier_1' || r.distinction_potential === 'tier_2' || r.distinction_potential === 'tier_3')
            ? r.distinction_potential as 'tier_1' | 'tier_2' | 'tier_3' : undefined;
        result.push({
            id,
            faction,
            name: String(r.name).trim(),
            home_mun,
            corps: typeof r.corps === 'string' && r.corps.trim() ? r.corps.trim() : undefined,
            kind,
            manpower_cost,
            capital_cost,
            default_equipment_class,
            priority,
            mandatory,
            available_from,
            max_personnel,
            ...(initial_personnel != null && { initial_personnel }),
            ...(initial_cohesion != null && { initial_cohesion }),
            ...(initial_morale != null && { initial_morale }),
            ...(honor && { honor }),
            ...(home_osid && { home_osid }),
            ...(composition && { composition }),
            ...(oobTags && oobTags.length > 0 && { tags: oobTags }),
            ...(defense_terrain_bonus != null && { defense_terrain_bonus }),
            ...(recruit_pool_faction && { recruit_pool_faction }),
            ...(fallback_osid && { fallback_osid }),
            ...(available_until != null && { available_until }),
            ...(merged_into_id && { merged_into_id }),
            ...(is_elite && { is_elite }),
            ...(garrison && { garrison }),
            ...(historical_decorations && historical_decorations.length > 0 && { historical_decorations }),
            ...(initial_officer_quality != null && { initial_officer_quality }),
            ...(distinction_potential && { distinction_potential }),
        });
    }

    result.sort((a, b) => {
        const fc = a.faction.localeCompare(b.faction);
        if (fc !== 0) return fc;
        return a.name.localeCompare(b.name);
    });
    return result;
}

/**
 * Load OOB corps from data/source/oob_corps.json.
 * Validates faction and hq_mun. Returns array in stable order (faction then name).
 */
export async function loadOobCorps(baseDir: string): Promise<OobCorps[]> {
    const path = resolve(baseDir, 'data/source/oob_corps.json');
    const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
    const registry = await loadRegistryMunIds(baseDir);

    const rows = isRecord(raw) && Array.isArray(raw.corps) ? raw.corps : [];
    const result: OobCorps[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!isRecord(r) || typeof r.id !== 'string' || typeof r.faction !== 'string' || typeof r.name !== 'string' || typeof r.hq_mun !== 'string') {
            throw new Error(`Invalid OOB corps at index ${i}: required id, faction, name, hq_mun`);
        }
        const id = r.id.trim();
        if (seenIds.has(id)) throw new Error(`Duplicate OOB corps id: ${id}`);
        seenIds.add(id);

        const faction = r.faction.trim() as FactionId;
        if (!CANONICAL_FACTIONS.includes(faction)) {
            throw new Error(`Invalid OOB corps ${id}: faction must be RBiH, RS, or HRHB, got ${r.faction}`);
        }
        const hq_mun = r.hq_mun.trim();
        if (!registry.has(hq_mun)) {
            throw new Error(`Invalid OOB corps ${id}: hq_mun "${hq_mun}" not in registry`);
        }
        const corpsKind = r.kind === 'army_hq' ? 'army_hq' as const : 'corps' as const;
        const hq_osid = typeof r.hq_osid === 'string' && r.hq_osid.trim() ? r.hq_osid.trim() : undefined;
        const available_from = typeof r.available_from === 'number' && Number.isFinite(r.available_from) ? r.available_from : 0;
        const corps_initial_officer_quality = typeof r.initial_officer_quality === 'number' && Number.isFinite(r.initial_officer_quality)
            ? Math.max(0, Math.min(1, r.initial_officer_quality)) : undefined;
        const corps_initial_cohesion = typeof r.initial_cohesion === 'number' && Number.isFinite(r.initial_cohesion) ? r.initial_cohesion : undefined;
        const corps_initial_morale = typeof r.initial_morale === 'number' && Number.isFinite(r.initial_morale) ? r.initial_morale : undefined;
        result.push({
            id,
            faction,
            name: String(r.name).trim(),
            hq_mun,
            ...(hq_osid && { hq_osid }),
            kind: corpsKind,
            available_from,
            ...(corps_initial_officer_quality != null && { initial_officer_quality: corps_initial_officer_quality }),
            ...(corps_initial_cohesion != null && { initial_cohesion: corps_initial_cohesion }),
            ...(corps_initial_morale != null && { initial_morale: corps_initial_morale }),
        });
    }

    result.sort((a, b) => {
        const fc = a.faction.localeCompare(b.faction);
        if (fc !== 0) return fc;
        return a.name.localeCompare(b.name);
    });
    return result;
}

/**
 * Load municipality HQ settlement mapping (mun1990_id -> sid) from data/derived/municipality_hq_settlement.json.
 * Returns Record<mun1990_id, sid>. Keys are in deterministic order in the file.
 */
export async function loadMunicipalityHqSettlement(baseDir: string): Promise<Record<string, string>> {
    const path = resolve(baseDir, 'data/derived/municipality_hq_settlement.json');
    const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
    const byMun = isRecord(raw) && isRecord(raw.by_mun1990_id) ? raw.by_mun1990_id as Record<string, string> : {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(byMun)) {
        if (typeof k === 'string' && typeof v === 'string') result[k] = v;
    }
    return result;
}
