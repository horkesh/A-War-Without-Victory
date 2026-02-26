/**
 * Load and validate OOB (Order of Battle) data: brigades and corps.
 * Validates faction and mun1990_id against municipalities_1990_registry_110.json.
 * Returns lists in deterministic order (brigades: by faction then name; corps: by faction then name).
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FactionId } from '../state/game_state.js';
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
    /** Unit honor/decoration title: slavna (10% combat bonus), vitezka (20% combat bonus). */
    honor?: 'slavna' | 'vitezka';
    /** Explicit OSID for initial placement (e.g. "op:brcko:brezovo_polje_selo_2"). Overrides home_mun HQ OSID. */
    home_osid?: string;
}

export interface OobCorps {
    id: string;
    faction: FactionId;
    name: string;
    hq_mun: string;
    /** Optional historical corps HQ OSID (op:mun:slug). When set, used as formation location_osid. */
    hq_osid?: string;
    kind: 'corps' | 'army_hq';
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

    const rows = isRecord(raw) && Array.isArray(raw.brigades) ? raw.brigades : [];
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
        const honor = (r.honor === 'slavna' || r.honor === 'vitezka') ? r.honor as 'slavna' | 'vitezka' : undefined;
        const home_osid = typeof r.home_osid === 'string' && r.home_osid.trim() ? r.home_osid.trim() : undefined;
        result.push({
            id,
            faction,
            name: String(r.name).trim(),
            home_mun,
            corps: typeof r.corps === 'string' && r.corps.trim() ? r.corps.trim()
                : typeof r.subordinate_to === 'string' && (r.subordinate_to as string).trim() ? (r.subordinate_to as string).trim()
                    : undefined,
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
            ...(honor && { honor }),
            ...(home_osid && { home_osid }),
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
        result.push({
            id,
            faction,
            name: String(r.name).trim(),
            hq_mun,
            ...(hq_osid && { hq_osid }),
            kind: corpsKind,
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
