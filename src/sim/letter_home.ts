/**
 * Letter Home — deterministic casualty vignette generation.
 *
 * One procedural vignette per turn, drawn from that turn's casualties.
 * Documentary tone. No sentimentality. The horror speaks for itself.
 *
 * Called from UI side (ChiefOfStaffBriefing) using adapter data.
 * Selection uses casualty evidence and canonical ordering only.
 */

import type { TurnBattle } from '../state/turn_summary.js';
import { strictCompare } from '../state/validateGameState.js';
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

const CANONICAL_FALLBACK_AGE = 18;

function canonicalFirst(values: readonly string[]): string | undefined {
    return [...values].sort(strictCompare)[0];
}

function selectContextLocation(values: readonly string[], municipality: string): string {
    const normalizedMunicipality = municipality.toLowerCase();
    return [...values].sort((a, b) => {
        const aMatches = normalizedMunicipality !== 'unknown'
            && a.toLowerCase().includes(normalizedMunicipality);
        const bMatches = normalizedMunicipality !== 'unknown'
            && b.toLowerCase().includes(normalizedMunicipality);
        if (aMatches !== bMatches) return aMatches ? -1 : 1;
        return strictCompare(a, b);
    })[0] ?? 'unknown';
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

interface CasualtyBattleCandidate {
    battle: TurnBattle;
    casualties: number;
    isAttacker: boolean;
    primaryBrigadeId: string;
}

function compareCasualtyBattles(a: CasualtyBattleCandidate, b: CasualtyBattleCandidate): number {
    if (b.casualties !== a.casualties) return b.casualties - a.casualties;
    const osidDifference = strictCompare(a.battle.osid, b.battle.osid);
    if (osidDifference !== 0) return osidDifference;
    return strictCompare(a.primaryBrigadeId, b.primaryBrigadeId);
}

function compareTemplatesByEvidence(
    a: LetterTemplate,
    b: LetterTemplate,
    directFields: ReadonlySet<string>,
): number {
    const aDirect = a.required_fields.filter(field => directFields.has(field)).length;
    const bDirect = b.required_fields.filter(field => directFields.has(field)).length;
    if (bDirect !== aDirect) return bDirect - aDirect;

    const aFallbacks = a.required_fields.length - aDirect;
    const bFallbacks = b.required_fields.length - bDirect;
    if (aFallbacks !== bFallbacks) return aFallbacks - bFallbacks;
    return strictCompare(a.id, b.id);
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
        faction,
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
    const casualtyBattles: CasualtyBattleCandidate[] = [];

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

        const primaryBrigadeId = isAttacker
            ? battle.primary_attacker_id
            : (battle.primary_defender_id ?? battle.primary_attacker_id);
        casualtyBattles.push({ battle, casualties, isAttacker, primaryBrigadeId });

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

    casualtyBattles.sort(compareCasualtyBattles);
    const featuredBattle = casualtyBattles[0]!;
    const primaryBrigadeId = featuredBattle.primaryBrigadeId;
    const battleOsid = featuredBattle.battle.osid;
    const primaryFormation = formationLookup.get(primaryBrigadeId);

    const directFields = new Set<string>();
    if (primaryFormation?.home_osid) directFields.add('municipality');
    if (primaryFormation?.name) directFields.add('brigade');
    if (battleOsid) directFields.add('circumstance');

    // Determine casualty type
    const casualtyType = determineCasualtyType(turnKilled, turnWounded, turnMissing, siegeActive, wasAttacker);

    // Filter templates by casualty type
    const matchingTemplates = templateData.templates
        .filter(t => t.casualty_type === casualtyType)
        .sort((a, b) => compareTemplatesByEvidence(a, b, directFields));
    if (matchingTemplates.length === 0) return null;

    const template = matchingTemplates[0]!;

    // Name pools
    const ethnicity = FACTION_ETHNICITY[faction] ?? 'bosniak';
    const malePool = [...(templateData.name_pools[`${ethnicity}_male`] ?? [])].sort(strictCompare);
    const femalePool = [...(templateData.name_pools[`${ethnicity}_female`] ?? [])].sort(strictCompare);
    const surnamePool = [...(templateData.name_pools[`${ethnicity}_surnames`] ?? [])].sort(strictCompare);

    if (malePool.length === 0 || surnamePool.length === 0) return null;

    const firstName = canonicalFirst(malePool)!;
    const surname = canonicalFirst(surnamePool)!;
    const fullName = `${firstName} ${surname}`;
    const wifeName = canonicalFirst(femalePool) ?? 'unknown';

    // No person-level age exists in state; use the explicit minimum-age fallback.
    const age = CANONICAL_FALLBACK_AGE;

    // Rank order is semantic (lowest to highest), so the first authored rank is canonical.
    const rankPool = RANKS[locale] ?? RANKS.en;
    const rank = rankPool[0]!;

    // Municipality from brigade home_osid
    let municipality = 'unknown';
    if (primaryFormation?.home_osid) {
        municipality = municipalityFromOsid(primaryFormation.home_osid);
    }

    // Brigade display name
    let brigadeName = locale === 'bcs' ? 'njegova jedinica' : 'his unit';
    if (primaryFormation?.name) {
        brigadeName = primaryFormation.name;
    }

    // Circumstance from battle OSID
    let circumstance = locale === 'bcs' ? 'linija fronta' : 'the front line';
    circumstance = municipalityFromOsid(battleOsid);

    // Displacement municipality (rear area)
    const rearMunicipalities = REAR_MUNICIPALITIES[faction] ?? REAR_MUNICIPALITIES['RBiH'];
    const displacementMunicipality = selectContextLocation(rearMunicipalities, municipality);

    // Hospital (for WIA templates)
    const hospitals = HOSPITALS[faction] ?? HOSPITALS['RBiH'];
    const hospital = selectContextLocation(hospitals, municipality);

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
