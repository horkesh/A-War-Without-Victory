/**
 * Letter Home — deterministic casualty vignette generation.
 *
 * One procedural vignette per turn, drawn from that turn's casualties.
 * Documentary tone. No sentimentality. The horror speaks for itself.
 *
 * Called from UI side (ChiefOfStaffBriefing) using adapter data.
 * NO Math.random(), NO Date.now() — determinism is sacred.
 */

import type { TurnBattle } from '../state/turn_summary.js';
import { splitKiaWiaMia } from './combat/attack_casualty_distribution.js';

// ── Template & name pool types ──────────────────────────────────────

interface LetterTemplate {
    id: string;
    casualty_type: string;
    text_template: string;
    text_template_bcs?: string;
    required_fields: string[];
}

interface LetterHomeData {
    version: number;
    templates: LetterTemplate[];
    name_pools: Record<string, string[]>;
}

// ── Deterministic hash ──────────────────────────────────────────────

/**
 * Deterministic hash from turn + casualties.
 * Used to select template, name, age, municipality without Math.random().
 * Multiply by primes, XOR, modulo.
 */
function deterministicHash(turn: number, totalCasualties: number, salt: number): number {
    return Math.abs(((turn * 2654435761) ^ (totalCasualties * 40503) ^ (salt * 12289)) | 0);
}

function selectTemplate(turn: number, totalCasualties: number, templateCount: number): number {
    return deterministicHash(turn, totalCasualties, 1) % templateCount;
}

function selectName(turn: number, totalCasualties: number, poolSize: number, salt: number): number {
    return deterministicHash(turn, totalCasualties, salt) % poolSize;
}

function computeAge(turn: number, totalCasualties: number): number {
    return 18 + (deterministicHash(turn, totalCasualties, 7) % 30);
}

// ── Casualty type determination ─────────────────────────────────────

/**
 * Determine casualty_type from the most recent turn's battle data.
 * Priority: kia_siege > kia_offensive > kia_defensive > wia > mia (fallback).
 */
function determineCasualtyType(
    factionKilled: number,
    factionWounded: number,
    _factionMissing: number,
    siegeActive: boolean,
    wasAttacker: boolean,
): string {
    if (factionKilled > 0 && siegeActive) return 'kia_siege';
    if (factionKilled > 0 && wasAttacker) return 'kia_offensive';
    if (factionKilled > 0) return 'kia_defensive';
    if (factionWounded > 0) return 'wia';
    return 'mia';
}

// ── Municipality extraction from OSID ───────────────────────────────

/** Extract municipality slug from OSID (format: `op:municipality:slug`). Title-case it. */
function municipalityFromOsid(osid: string): string {
    const parts = osid.split(':');
    if (parts.length >= 2) {
        return titleCase(parts[1].replace(/_/g, ' '));
    }
    return 'unknown';
}

function titleCase(s: string): string {
    return s.replace(/\b\w/g, c => c.toUpperCase());
}

// ── Faction → name pool mapping ─────────────────────────────────────

const FACTION_ETHNICITY: Record<string, string> = {
    RBiH: 'bosniak',
    RS: 'serbian',
    HRHB: 'croatian',
};

type LetterHomeLocale = 'en' | 'bcs';

const RANKS: Record<LetterHomeLocale, string[]> = {
    en: ['Private', 'Corporal', 'Sergeant'],
    bcs: ['Redov', 'Kaplar', 'Vodnik'],
};

/** Faction-appropriate rear municipalities for displacement_municipality placeholder. */
const REAR_MUNICIPALITIES: Record<string, string[]> = {
    RBiH: ['Zenica', 'Tuzla', 'Travnik', 'Visoko', 'Kakanj', 'Bugojno', 'Konjic'],
    RS: ['Banja Luka', 'Bijeljina', 'Doboj', 'Prijedor', 'Zvornik', 'Trebinje'],
    HRHB: ['Mostar', 'Livno', 'Siroki Brijeg', 'Grude', 'Posusje', 'Citluk', 'Tomislavgrad'],
};

/** Faction-appropriate hospitals for wia templates. */
const HOSPITALS: Record<string, string[]> = {
    RBiH: ['Zenica General Hospital', 'Tuzla University Hospital', 'Kosevo Hospital', 'Travnik Field Hospital'],
    RS: ['Banja Luka Clinical Centre', 'Bijeljina Hospital', 'Doboj Hospital', 'Zvornik Field Hospital'],
    HRHB: ['Mostar War Hospital', 'Siroki Brijeg Hospital', 'Livno Hospital', 'Tomislavgrad Field Hospital'],
};

// ── Formation info for context ──────────────────────────────────────

interface BattleFormationInfo {
    id: string;
    name: string;
    home_osid?: string;
    turns_under_siege?: number;
}

// ── Main generation function ────────────────────────────────────────

export interface LetterHomeInput {
    turn: number;
    faction: string;
    /** Cumulative faction casualties from casualty ledger. */
    factionKilled: number;
    factionWounded: number;
    factionMissing: number;
    /** Battles from this turn involving this faction. */
    factionBattles: TurnBattle[];
    /** Formation lookup: id → display info. */
    formationLookup: Map<string, BattleFormationInfo>;
    /** Template data (loaded from JSON). */
    templateData: LetterHomeData;
    /** Optional presentation locale for localized template prose. */
    locale?: LetterHomeLocale;
}

/**
 * Generate a Letter Home vignette for this turn.
 * Returns null if no casualties occurred for the faction this turn.
 */
export function generateLetterHome(input: LetterHomeInput): string | null {
    const {
        turn, faction,
        factionKilled, factionWounded, factionMissing,
        factionBattles, formationLookup, templateData,
        locale = 'en',
    } = input;

    // Skip if no battles this turn for this faction
    if (factionBattles.length === 0) return null;

    // Compute this turn's casualties from battles
    let turnKilled = 0;
    let turnWounded = 0;
    let turnMissing = 0;
    let wasAttacker = false;
    let siegeActive = false;
    let primaryBrigadeId: string | null = null;
    let battleOsid: string | null = null;

    for (const battle of factionBattles) {
        const isAttacker = battle.attacker_faction === faction;
        const casualties = isAttacker ? battle.attacker_casualties : battle.defender_casualties;
        if (casualties <= 0) continue;

        // KIA/WIA/MIA split mirrors the canonical ledger fractions the battle
        // engine books (attack_casualty_distribution.ts: KIA 0.22 / WIA 0.74 /
        // MIA remainder) so the vignette agrees with the casualty ledger (#73).
        const { killed: kia, wounded: wia, missing_captured: mia } = splitKiaWiaMia(casualties);
        turnKilled += kia;
        turnWounded += wia;
        turnMissing += mia;

        if (isAttacker) wasAttacker = true;

        // Pick the first battle with casualties as the featured one
        if (!primaryBrigadeId) {
            primaryBrigadeId = isAttacker ? battle.primary_attacker_id : (battle.primary_defender_id ?? battle.primary_attacker_id);
            battleOsid = battle.osid;
        }

        // Check if any participating brigade has siege history
        const brigadeId = isAttacker ? battle.primary_attacker_id : battle.primary_defender_id;
        if (brigadeId) {
            const info = formationLookup.get(brigadeId);
            if (info?.turns_under_siege && info.turns_under_siege > 0) {
                siegeActive = true;
            }
        }
    }

    // Skip if zero casualties this turn
    if (turnKilled + turnWounded + turnMissing === 0) return null;

    // Total cumulative KIA is the seed (spec says totalKIA)
    const totalKIA = factionKilled;

    // Determine casualty type
    const casualtyType = determineCasualtyType(turnKilled, turnWounded, turnMissing, siegeActive, wasAttacker);

    // Filter templates by casualty type
    const matchingTemplates = templateData.templates.filter(t => t.casualty_type === casualtyType);
    if (matchingTemplates.length === 0) return null;

    // Select template
    const templateIdx = selectTemplate(turn, totalKIA, matchingTemplates.length);
    const template = matchingTemplates[templateIdx];

    // Name pools
    const ethnicity = FACTION_ETHNICITY[faction] ?? 'bosniak';
    const malePool = templateData.name_pools[`${ethnicity}_male`] ?? [];
    const femalePool = templateData.name_pools[`${ethnicity}_female`] ?? [];
    const surnamePool = templateData.name_pools[`${ethnicity}_surnames`] ?? [];

    if (malePool.length === 0 || surnamePool.length === 0) return null;

    // Select names
    const firstNameIdx = selectName(turn, totalKIA, malePool.length, 2);
    const surnameIdx = selectName(turn, totalKIA, surnamePool.length, 3);
    const femaleNameIdx = femalePool.length > 0 ? selectName(turn, totalKIA, femalePool.length, 4) : 0;

    const firstName = malePool[firstNameIdx];
    const surname = surnamePool[surnameIdx];
    const fullName = `${firstName} ${surname}`;
    const wifeName = femalePool.length > 0 ? femalePool[femaleNameIdx] : 'unknown';

    // Age
    const age = computeAge(turn, totalKIA);

    // Rank
    const rankPool = RANKS[locale] ?? RANKS.en;
    const rankIdx = deterministicHash(turn, totalKIA, 5) % rankPool.length;
    const rank = rankPool[rankIdx];

    // Municipality from brigade home_osid
    let municipality = 'unknown';
    if (primaryBrigadeId) {
        const info = formationLookup.get(primaryBrigadeId);
        if (info?.home_osid) {
            municipality = municipalityFromOsid(info.home_osid);
        }
    }

    // Brigade display name
    let brigadeName = locale === 'bcs' ? 'njegova jedinica' : 'his unit';
    if (primaryBrigadeId) {
        const info = formationLookup.get(primaryBrigadeId);
        if (info?.name) {
            brigadeName = info.name;
        }
    }

    // Circumstance from battle OSID
    let circumstance = locale === 'bcs' ? 'linija fronta' : 'the front line';
    if (battleOsid) {
        circumstance = municipalityFromOsid(battleOsid);
    }

    // Displacement municipality (rear area)
    const rearMunicipalities = REAR_MUNICIPALITIES[faction] ?? REAR_MUNICIPALITIES['RBiH'];
    const displacementIdx = deterministicHash(turn, totalKIA, 6) % rearMunicipalities.length;
    const displacementMunicipality = rearMunicipalities[displacementIdx];

    // Hospital (for WIA templates)
    const hospitals = HOSPITALS[faction] ?? HOSPITALS['RBiH'];
    const hospitalIdx = deterministicHash(turn, totalKIA, 8) % hospitals.length;
    const hospital = hospitals[hospitalIdx];

    // Substitute placeholders
    let text = locale === 'bcs' && template.text_template_bcs ? template.text_template_bcs : template.text_template;
    text = text.replace(/\{name\}/g, fullName);
    text = text.replace(/\{age\}/g, String(age));
    text = text.replace(/\{municipality\}/g, municipality);
    text = text.replace(/\{brigade\}/g, brigadeName);
    text = text.replace(/\{circumstance\}/g, circumstance);
    text = text.replace(/\{wife_name\}/g, wifeName);
    text = text.replace(/\{displacement_municipality\}/g, displacementMunicipality);
    text = text.replace(/\{hospital\}/g, hospital);
    text = text.replace(/\{rank\}/g, rank);

    return text;
}
