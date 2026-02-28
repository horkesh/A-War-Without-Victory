/**
 * Faction-specific bot strategy profiles for Phase II brigade AI.
 *
 * Defines per-faction behavioral parameters: corridor priorities, posture thresholds,
 * attack/defense balance, and strategic objectives for target scoring.
 *
 * Strategic objectives are grounded in historical patterns:
 *   RS: Posavina corridor, Drina valley consolidation, Sarajevo siege ring
 *   RBiH: Sarajevo defense, enclave survival, central Bosnia corridor
 *   HRHB: Herzegovina consolidation, Mostar control, central Bosnia Croat pockets
 *
 * Consumed by bot_brigade_ai.ts for strategic target selection.
 *
 * Deterministic: no randomness.
 */

import type { ArmyStance, BrigadePosture, FactionId } from '../../state/game_state.js';

// --- Faction strategy profiles ---

export interface FactionBotStrategy {
    /** Hardcoded corridor municipality IDs (defensive priority). */
    corridor_municipalities: string[];
    /** Max fraction of brigades allowed in attack/probe posture simultaneously. */
    max_attack_posture_share: number;
    /** Posture to adopt when overstaffed and on front. */
    preferred_posture_when_overstaffed: BrigadePosture;
    /** Minimum density (personnel/settlement) before switching to attack/probe. */
    attack_coverage_threshold: number;
    /** Force defend posture on brigades in corridor municipalities. */
    defend_critical_territory: boolean;
    /** Strategic offensive target municipalities (scored higher for attack). */
    offensive_objectives: string[];
    /** Strategic defensive priority municipalities (brigades prefer defend posture). */
    defensive_priorities: string[];
    /** Minimum number of brigades in probe/attack when front contact exists. Ensures faction isn't passive. */
    min_active_brigades: number;
}

/**
 * Posavina corridor municipalities — historically the critical RS supply link
 * between Banja Luka (1st Krajina Corps) and Bijeljina (East Bosnia Corps).
 * RS committed significant forces to securing this narrow corridor.
 */
const POSAVINA_CORRIDOR: string[] = [
    'brcko',
    'bijeljina',
    'bosanski_samac',
    'modrica',
    'derventa',
    'bosanska_gradiska',
    'doboj',
    'bosanski_brod',
    'odzak',
    'gradacac',
    'orasje'
];

/**
 * Drina valley municipalities — RS priority for territorial contiguity with Serbia.
 * Historical pattern: VRS Drina Corps drove to create continuous Serb-controlled
 * corridor along the Drina river from Bijeljina to Foca.
 */
const DRINA_VALLEY: string[] = [
    'zvornik',
    'bratunac',
    'srebrenica',
    'vlasenica',
    'sekovici',
    'han_pijesak',
    'rogatica',
    'visegrad',
    'foca',
    'cajnice',
    'gorazde',
    'rudo'
];

/**
 * Sarajevo siege ring — RS priority to maintain encirclement of Sarajevo.
 * VRS Sarajevo-Romanija Corps invested enormous resources holding this ring.
 */
const SARAJEVO_SIEGE_RING: string[] = [
    'pale',
    'sokolac',
    'han_pijesak',
    'ilidza',
    'hadzici',
    'vogosca',
    'ilijas',
    'trnovo',
    'rogatica'
];

/**
 * Sarajevo core municipalities — RBiH priority: survival of the capital.
 * ARBiH 1st Corps committed its best units to Sarajevo defense.
 */
const SARAJEVO_CORE: string[] = [
    'centar_sarajevo',
    'novi_grad_sarajevo',
    'novo_sarajevo',
    'stari_grad_sarajevo'
];

/**
 * RBiH enclave defense priorities — historically, ARBiH fought desperately to
 * maintain these eastern enclaves and the Bihac pocket.
 */
const RBIH_ENCLAVE_DEFENSE: string[] = [
    'gorazde',
    'srebrenica',
    'zepa',
    'bihac',
    'cazin',
    'velika_kladusa',
    'bosanska_krupa'
];

/**
 * RBiH central Bosnia corridor — the vital supply artery connecting Sarajevo
 * to Tuzla via Zenica-Travnik. ARBiH 3rd Corps' main operational area.
 */
const RBIH_CENTRAL_CORRIDOR: string[] = [
    'zenica',
    'travnik',
    'kakanj',
    'visoko',
    'fojnica',
    'bugojno',
    'gornji_vakuf'
];

/**
 * HRHB Herzegovina heartland — the core of Croat-controlled territory.
 * HVO prioritized consolidating this as a contiguous bloc.
 */
const HRHB_HERZEGOVINA: string[] = [
    'mostar',
    'siroki_brijeg',
    'citluk',
    'capljina',
    'stolac',
    'neum',
    'ljubuski',
    'grude',
    'posusje',
    'livno',
    'tomislavgrad'
];

/**
 * HRHB central Bosnia enclaves — Croat pockets in central Bosnia that HVO
 * fought to connect to Herzegovina. The Lasva Valley was the key battleground.
 */
const HRHB_CENTRAL_BOSNIA: string[] = [
    'vitez',
    'busovaca',
    'kiseljak',
    'novi_travnik',
    'zepce',
    'usora'
];

export const FACTION_STRATEGIES: Record<FactionId, FactionBotStrategy> = {
    RS: {
        corridor_municipalities: POSAVINA_CORRIDOR,
        max_attack_posture_share: 0.4,
        preferred_posture_when_overstaffed: 'probe',
        attack_coverage_threshold: 120,
        defend_critical_territory: true,
        offensive_objectives: [...DRINA_VALLEY, ...SARAJEVO_SIEGE_RING],
        defensive_priorities: [...POSAVINA_CORRIDOR, 'banja_luka', 'prijedor'],
        min_active_brigades: 3,
    },
    RBiH: {
        corridor_municipalities: [...SARAJEVO_CORE, ...RBIH_ENCLAVE_DEFENSE],
        // Historical: ARBiH had no meaningful offensive capability until mid-1993.
        max_attack_posture_share: 0.15,
        preferred_posture_when_overstaffed: 'probe',
        attack_coverage_threshold: 180,
        defend_critical_territory: true,
        offensive_objectives: ['ilidza', 'hadzici', 'vogosca', 'ilijas', ...RBIH_CENTRAL_CORRIDOR],
        defensive_priorities: [...SARAJEVO_CORE, ...RBIH_ENCLAVE_DEFENSE, 'tuzla', 'zenica'],
        // Calibration: 2 active brigades ensures RBiH mounts local counterattacks.
        min_active_brigades: 2,
    },
    HRHB: {
        corridor_municipalities: [...HRHB_HERZEGOVINA, 'orasje'],
        max_attack_posture_share: 0.35,
        preferred_posture_when_overstaffed: 'probe',
        attack_coverage_threshold: 100,
        defend_critical_territory: true,
        offensive_objectives: [...HRHB_CENTRAL_BOSNIA, 'gornji_vakuf', 'jablanica'],
        defensive_priorities: [...HRHB_HERZEGOVINA, ...HRHB_CENTRAL_BOSNIA],
        min_active_brigades: 2,
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// Time-Phased Doctrine (D3)
// ═══════════════════════════════════════════════════════════════════════════

export interface DoctrinePhase {
    start_week: number;
    end_week: number;
    default_corps_stance: 'defensive' | 'balanced' | 'offensive';
    max_attack_share_override: number;
    aggression_modifier: number;
}

/** RS early-war window: offensive stance and higher attack share for territorial expansion.
 * Calibration: 30→20 for Jan 1993 painted targets (RS was at 488 OSIDs by w20 in n233). */
export const RS_EARLY_WAR_END_WEEK = 20;

/** HRHB Lasva Offensive window (weeks 12–26): higher attack share so HRHB issues more attack orders. See NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18 Candidate B. */
export const HRHB_LASVA_OFFENSIVE_START_WEEK = 12;
export const HRHB_LASVA_OFFENSIVE_END_WEEK = 26;
export const HRHB_LASVA_ATTACK_SHARE = 0.35;

export const FACTION_DOCTRINE_PHASES: Record<FactionId, DoctrinePhase[]> = {
    RS: [
        // n224: 0.35 gave 70.7% (slightly over). Revert to 0.33 — with lower MIN_MANDATORY_SPAWN
        // and reduced RBiH pool scale, more RS brigades spawn and RBiH is weaker.
        { start_week: 0, end_week: RS_EARLY_WAR_END_WEEK, default_corps_stance: 'offensive', max_attack_share_override: 0.28, aggression_modifier: 0.15 },
        { start_week: RS_EARLY_WAR_END_WEEK, end_week: 40, default_corps_stance: 'balanced', max_attack_share_override: 0.08, aggression_modifier: -0.05 },
        { start_week: 40, end_week: 9999, default_corps_stance: 'defensive', max_attack_share_override: 0.10, aggression_modifier: -0.1 },
    ],
    RBiH: [
        // Historical: ARBiH purely defensive first year. Minimal counteroffensives until mid-1993.
        // Calibration: boosted for Jan 1993 painted targets — RBiH needs to hold more territory.
        { start_week: 0, end_week: 20, default_corps_stance: 'defensive', max_attack_share_override: 0.10, aggression_modifier: -0.10 },
        { start_week: 20, end_week: 40, default_corps_stance: 'defensive', max_attack_share_override: 0.15, aggression_modifier: -0.05 },
        { start_week: 40, end_week: 56, default_corps_stance: 'defensive', max_attack_share_override: 0.20, aggression_modifier: 0.0 },
        { start_week: 56, end_week: 80, default_corps_stance: 'balanced', max_attack_share_override: 0.25, aggression_modifier: 0.05 },
        { start_week: 80, end_week: 9999, default_corps_stance: 'offensive', max_attack_share_override: 0.35, aggression_modifier: 0.15 },
    ],
    HRHB: [
        { start_week: 0, end_week: 12, default_corps_stance: 'balanced', max_attack_share_override: 0.25, aggression_modifier: 0 },
        { start_week: 12, end_week: 26, default_corps_stance: 'balanced', max_attack_share_override: 0.35, aggression_modifier: 0.05 },
        { start_week: 26, end_week: 9999, default_corps_stance: 'balanced', max_attack_share_override: 0.3, aggression_modifier: 0 },
    ],
};

/**
 * Get the active doctrine phase for a faction at a given turn.
 * Returns null if no doctrine phase applies.
 */
export function getActiveDoctrinePhase(faction: FactionId, turn: number): DoctrinePhase | null {
    const phases = FACTION_DOCTRINE_PHASES[faction];
    if (!phases) return null;
    for (const phase of phases) {
        if (turn >= phase.start_week && turn < phase.end_week) return phase;
    }
    return null;
}

/**
 * Get effective max_attack_share for a faction at a given turn.
 * Uses doctrine phases (FACTION_DOCTRINE_PHASES) as the single source of truth.
 * HRHB Lasva Offensive overrides the doctrine phase value.
 * Deterministic: depends only on faction and turn number.
 */
export function getEffectiveAttackShare(faction: FactionId, turn: number): number {
    // HRHB Lasva Offensive override
    if (faction === 'HRHB' && turn >= HRHB_LASVA_OFFENSIVE_START_WEEK && turn < HRHB_LASVA_OFFENSIVE_END_WEEK) {
        return HRHB_LASVA_ATTACK_SHARE;
    }
    const phase = getActiveDoctrinePhase(faction, turn);
    return phase?.max_attack_share_override ?? FACTION_STRATEGIES[faction].max_attack_posture_share;
}

// ═══════════════════════════════════════════════════════════════════════════
// Army-Wide Standing Orders
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Historical army-wide standing orders for bot factions.
 *
 * Standing orders set the army_stance for each faction based on time period,
 * representing top-level strategic directives issued by army command. These
 * override corps-level stance decisions when non-balanced.
 *
 * Historical grounding:
 *   RS: VRS exploited JNA equipment for rapid territorial seizure (Apr-Jun 1992),
 *       then consolidated gains, then shifted to strategic defense as manpower ebbed.
 *   RBiH: ARBiH fought for survival early, reorganized through 1993, then adopted
 *       the famous 1994 "pinprick" strategy — constant small attacks along the
 *       entire front to stretch VRS reserves thin and prevent concentration.
 *       Late-war counteroffensives came when the balance shifted (1995).
 *   HRHB: HVO consolidated Herzegovina, went offensive in the Lasva Valley
 *       during the Croat-Bosniak war (1993), then pivoted to defense and
 *       cooperation after Washington Agreement (1994).
 */
export interface StandingOrder {
    /** Human-readable name for the standing order. */
    name: string;
    /** First week this order applies (inclusive). */
    start_week: number;
    /** Last week this order applies (exclusive). */
    end_week: number;
    /** Army stance to set. 'balanced' means no army-level override. */
    army_stance: ArmyStance;
    /** Brief flavor description of the strategic intent. */
    description: string;
}

export const FACTION_STANDING_ORDERS: Record<FactionId, StandingOrder[]> = {
    RS: [
        {
            name: 'Territorial Seizure',
            start_week: 0, end_week: RS_EARLY_WAR_END_WEEK,
            army_stance: 'general_offensive',
            description: 'Exploit JNA equipment handover for maximum territorial gain before international response.',
        },
        {
            name: 'Consolidation',
            start_week: RS_EARLY_WAR_END_WEEK, end_week: 56,
            army_stance: 'balanced',
            description: 'Secure gains, fortify corridors, maintain siege rings. No army-wide override — corps decide locally.',
        },
        {
            name: 'Strategic Hold',
            start_week: 56, end_week: 9999,
            army_stance: 'general_defensive',
            description: 'Manpower crisis. Hold existing territory, avoid costly offensives, wait for political settlement.',
        },
    ],
    RBiH: [
        {
            name: 'Survival Defense',
            start_week: 0, end_week: 12,
            army_stance: 'general_defensive',
            description: 'Preserve forces. No offensive operations. Hold what you can, reorganize TO into brigades.',
        },
        {
            name: 'Local Counterattacks',
            start_week: 12, end_week: 40,
            army_stance: 'balanced',
            description: 'Corps forming. Local counterattacks permitted to reclaim lost territory. No general offensives.',
        },
        {
            name: 'Corps Reorganization',
            start_week: 40, end_week: 56,
            army_stance: 'balanced',
            description: 'Corps structure mature. Active defense with counterattack capability.',
        },
        {
            name: 'Active Defense',
            start_week: 56, end_week: 80,
            army_stance: 'balanced',
            description: 'Pinprick attacks begin. Probe VRS lines, test weaknesses, stretch reserves. Not breakthroughs.',
        },
        {
            name: 'Controlled Counteroffensive',
            start_week: 80, end_week: 9999,
            army_stance: 'general_offensive',
            description: 'Full counteroffensives. Corps-level coordinated operations (1994-1995 campaigns).',
        },
    ],
    HRHB: [
        {
            name: 'Consolidate Herzegovina',
            start_week: 0, end_week: 12,
            army_stance: 'balanced',
            description: 'Secure the Croat heartland. No army-wide override — local commanders secure their sectors.',
        },
        {
            name: 'Anti-RS Defense',
            start_week: 12, end_week: 26,
            army_stance: 'balanced',
            description: 'No bilateral war — focus on defending Croat territory against RS. Maintain alliance with RBiH.',
        },
        {
            name: 'Washington Pivot',
            start_week: 26, end_week: 9999,
            army_stance: 'balanced',
            description: 'Post-Washington Agreement. Cease offensive ops against RBiH, defend territory, cooperate with ARBiH against VRS. Counter-attacks and probing permitted against RS.',
        },
    ],
};

/**
 * Get the active standing order for a faction at a given turn.
 * Returns null if no standing order applies (shouldn't happen with 9999 end_week).
 * Deterministic: depends only on faction and turn number.
 */
export function getActiveStandingOrder(faction: FactionId, turn: number): StandingOrder | null {
    const orders = FACTION_STANDING_ORDERS[faction];
    if (!orders) return null;
    for (const order of orders) {
        if (turn >= order.start_week && turn < order.end_week) return order;
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Army-Level Operation Priorities (distributed to corps)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Army-level operation priority: Main Staff assigns strategic objectives to corps.
 * Historical: VRS Main Staff directed Drina Corps to secure the Drina valley,
 * 1st Krajina Corps to open the Posavina corridor, etc.
 *
 * These priorities are time-phased and corps-specific. They flow down as
 * offensive_targets in the CorpsDirective.
 */
export interface ArmyOperationPriority {
    /** Human-readable name (e.g. "Drina Sweep"). */
    name: string;
    /** Corps that should execute (corps formation ID). */
    corps_id: string;
    /** Municipality patterns for target OSIDs. */
    target_municipalities: string[];
    /** First week (inclusive). */
    start_week: number;
    /** Last week (exclusive). */
    end_week: number;
    /** Priority weight (higher = more important). */
    weight: number;
    /** Minimum attack outcome this operation accepts. */
    min_outcome: 'decisive_victory' | 'victory' | 'costly_victory' | 'stalemate' | 'repulsed';
    /** Municipality patterns for OSIDs to avoid. */
    avoid_municipalities?: string[];
}

/**
 * VRS army-level operation priorities.
 * Historical grounding:
 * - Drina (Apr 1992): Zvornik, Bratunac, Višegrad, Foča taken in first 2 weeks
 * - Corridor 92 (Jun-Jul 1992): link Banja Luka to Serbia through Posavina
 * - Krajina (Sep-Oct 1992): Ključ, Jajce, Bosanski Petrovac
 * - Sarajevo: siege maintenance throughout
 * - Herzegovina: hold existing gains
 */
const VRS_ARMY_PRIORITIES: ArmyOperationPriority[] = [
    // Drina Corps: clear Drina valley (DAY ONE — highest priority first 12 weeks)
    { name: 'Drina Sweep', corps_id: 'vrs_drina', target_municipalities: ['zvornik', 'bratunac', 'visegrad', 'foca', 'vlasenica', 'rogatica', 'sekovici', 'han_pijesak', 'milici', 'kalinovik', 'cajnice', 'rudo'], start_week: 0, end_week: 30, weight: 130, min_outcome: 'stalemate' },
    // Drina Corps: maintain after initial sweep
    { name: 'Drina Hold', corps_id: 'vrs_drina', target_municipalities: ['zvornik', 'bratunac', 'visegrad', 'foca'], start_week: 26, end_week: 9999, weight: 30, min_outcome: 'stalemate' },
    // Posavina Corridor — ABSOLUTE HIGHEST PRIORITY for RS (existential: links Banja Luka to Belgrade)
    // Brčko is the lynchpin — must be secured before anything else. Two-corps operation.
    { name: 'Corridor 92 (1KK)', corps_id: 'vrs_1st_krajina', target_municipalities: ['brcko', 'odzak', 'derventa', 'bosanski_brod', 'bosanski_samac', 'modrica', 'doboj'], start_week: 0, end_week: 25, weight: 100, min_outcome: 'repulsed' },
    { name: 'Corridor 92 (EBK)', corps_id: 'vrs_east_bosnian', target_municipalities: ['brcko', 'bijeljina', 'bosanski_samac'], start_week: 0, end_week: 25, weight: 100, min_outcome: 'repulsed' },
    // 1st Krajina: Krajina operations (mid-1992) — aggressive: push through entrenchment
    { name: 'Krajina Sweep', corps_id: 'vrs_1st_krajina', target_municipalities: ['kljuc', 'bosanski_petrovac', 'jajce', 'donji_vakuf', 'sipovo', 'kupres', 'sanski_most'], start_week: 12, end_week: 30, weight: 45, min_outcome: 'repulsed' },
    // 2nd Krajina: western operations + Bihac edges
    { name: 'Western Krajina', corps_id: 'vrs_2nd_krajina', target_municipalities: ['bosanski_petrovac', 'titov_drvar', 'glamoc', 'kupres', 'sipovo', 'bosanska_krupa', 'sanski_most'], start_week: 0, end_week: 30, weight: 55, min_outcome: 'repulsed' },
    // Sarajevo-Romanija: siege maintenance — persistent pressure on Sarajevo approaches
    { name: 'Sarajevo Siege', corps_id: 'vrs_sarajevo_romanija', target_municipalities: ['ilidza', 'hadzici', 'vogosca', 'ilijas', 'pale', 'sokolac', 'trnovo'], start_week: 0, end_week: 9999, weight: 90, min_outcome: 'repulsed' },
    // Herzegovina: hold territory — probing attacks to maintain pressure (+ cajnice/rudo/foca for Drina south)
    { name: 'Herzegovina Hold', corps_id: 'vrs_herzegovina', target_municipalities: ['bileca', 'gacko', 'trebinje', 'nevesinje', 'kalinovik', 'cajnice', 'rudo', 'foca'], start_week: 0, end_week: 9999, weight: 50, min_outcome: 'repulsed' },
    // East Bosnian: post-corridor, Tuzla containment
    { name: 'Tuzla Containment', corps_id: 'vrs_east_bosnian', target_municipalities: ['bijeljina', 'ugljevik', 'lopare', 'zvornik'], start_week: 30, end_week: 9999, weight: 40, min_outcome: 'repulsed' },
    // 1st Krajina: central corridor — Kotor Varoš, Teslić, Doboj (link to Posavina)
    { name: 'Central Corridor', corps_id: 'vrs_1st_krajina', target_municipalities: ['kotor_varos', 'teslic', 'doboj'], start_week: 0, end_week: 20, weight: 30, min_outcome: 'repulsed' },
    // 1st Krajina: consolidation after Corridor/Krajina Sweep expire (week 40+) — includes Posavina corridor municipalities for continued pressure
    { name: '1KK Consolidation', corps_id: 'vrs_1st_krajina', target_municipalities: ['kljuc', 'sanski_most', 'jajce', 'donji_vakuf', 'bosanski_petrovac', 'kotor_varos', 'teslic', 'brcko', 'odzak', 'derventa', 'bosanski_brod', 'bosanski_samac', 'modrica', 'doboj'], start_week: 40, end_week: 9999, weight: 35, min_outcome: 'repulsed' },
    // 2nd Krajina: western front maintenance after operations expire (week 40+)
    { name: '2KK Consolidation', corps_id: 'vrs_2nd_krajina', target_municipalities: ['bosanski_petrovac', 'titov_drvar', 'glamoc', 'kupres', 'sipovo', 'mrkonjic_grad'], start_week: 40, end_week: 9999, weight: 30, min_outcome: 'repulsed' },
    // East Bosnian: Ozren salient operations — pressure toward Tuzla, secure flanks
    // Ozren Operations removed — RS was overrunning central corridor via this route
];

/**
 * RBiH army-level operation priorities.
 * Historical: ARBiH defensive in 1992, reorganized 1993, counteroffensive 1994-95.
 */
const RBIH_ARMY_PRIORITIES: ArmyOperationPriority[] = [
    // 1st Corps: Sarajevo defense — friendly municipalities only until week 56
    { name: 'Sarajevo Defense', corps_id: 'arbih_1st_corps', target_municipalities: ['centar_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo', 'novi_grad_sarajevo'], start_week: 0, end_week: 56, weight: 100, min_outcome: 'costly_victory' },
    // 1st Corps: Sarajevo counter-attacks — include RS-held suburbs from week 56
    { name: 'Sarajevo Counterattack', corps_id: 'arbih_1st_corps', target_municipalities: ['centar_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo', 'novi_grad_sarajevo', 'ilidza', 'hadzici', 'vogosca', 'ilijas'], start_week: 56, end_week: 9999, weight: 100, min_outcome: 'stalemate' },
    // 2nd Corps: Tuzla area defense + Brčko south (ARBiH held OSID just south of Brčko throughout war)
    // Zvornik included: Sapna Finger/Teočak corridor was a 2nd Corps priority. Enables ARBiH
    // to connect Teočak pocket via rastosnica_2.
    { name: 'Tuzla Defense', corps_id: 'arbih_2nd_corps', target_municipalities: ['tuzla', 'kalesija', 'lukavac', 'zivinice', 'gradacac', 'srebrenik', 'kladanj', 'brcko', 'zvornik'], start_week: 0, end_week: 56, weight: 80, min_outcome: 'costly_victory' },
    { name: 'Tuzla Expansion', corps_id: 'arbih_2nd_corps', target_municipalities: ['tuzla', 'kalesija', 'lukavac', 'zivinice', 'gradacac', 'srebrenik', 'kladanj', 'lopare', 'ugljevik', 'zvornik'], start_week: 56, end_week: 9999, weight: 60, min_outcome: 'stalemate' },
    // 3rd Corps: Central Bosnia — defensive only until week 56
    { name: 'Central Corridor Defense', corps_id: 'arbih_3rd_corps', target_municipalities: ['zenica', 'kakanj', 'visoko'], start_week: 0, end_week: 56, weight: 60, min_outcome: 'costly_victory' },
    // 3rd Corps: Central corridor counter — reclaim municipalities RS overruns (calibration: Jan 1993 painted targets)
    { name: 'Central Corridor Counter', corps_id: 'arbih_3rd_corps', target_municipalities: ['tesanj', 'maglaj', 'zavidovici', 'kakanj', 'visoko', 'travnik'], start_week: 12, end_week: 56, weight: 80, min_outcome: 'stalemate' },
    { name: 'Central Corridor Offensive', corps_id: 'arbih_3rd_corps', target_municipalities: ['zenica', 'travnik', 'kakanj', 'visoko', 'bugojno', 'gornji_vakuf', 'fojnica'], start_week: 56, end_week: 9999, weight: 60, min_outcome: 'stalemate' },
    // 4th Corps: Neretva defense + Bugojno-Konjic defense (calibration: RS overruns these in n233)
    { name: 'Bugojno-Konjic Defense', corps_id: 'arbih_4th_corps', target_municipalities: ['bugojno', 'gornji_vakuf', 'konjic', 'prozor', 'jablanica'], start_week: 0, end_week: 56, weight: 60, min_outcome: 'costly_victory' },
    // 4th Corps: Neretva defense
    { name: 'Neretva Defense', corps_id: 'arbih_4th_corps', target_municipalities: ['jablanica', 'konjic'], start_week: 0, end_week: 56, weight: 50, min_outcome: 'costly_victory' },
    { name: 'Neretva Offensive', corps_id: 'arbih_4th_corps', target_municipalities: ['jablanica', 'konjic', 'mostar'], start_week: 56, end_week: 9999, weight: 50, min_outcome: 'stalemate' },
    // 2nd Corps: Brcko south hold — prevent RS from taking south Brcko (calibration: Jan 1993 painted targets)
    { name: 'Brcko South Hold', corps_id: 'arbih_2nd_corps', target_municipalities: ['brcko', 'gradacac', 'lopare', 'srebrenik'], start_week: 0, end_week: 56, weight: 90, min_outcome: 'stalemate' },
    // 5th Corps: Bihac pocket defense (crucial — hold throughout)
    { name: 'Bihac Pocket Defense', corps_id: 'arbih_5th_corps', target_municipalities: ['bihac', 'cazin', 'velika_kladusa', 'bosanska_krupa'], start_week: 0, end_week: 9999, weight: 90, min_outcome: 'costly_victory' },
    // Late-war counteroffensives (mid-1994+)
    { name: 'Siege Break', corps_id: 'arbih_1st_corps', target_municipalities: ['ilidza', 'hadzici', 'vogosca', 'ilijas'], start_week: 80, end_week: 9999, weight: 80, min_outcome: 'stalemate' },
];

/**
 * HRHB army-level operation priorities.
 * Historical: Herzegovina consolidation, Lasva Valley (bilateral war), post-Washington cooperation.
 */
const HRHB_ARMY_PRIORITIES: ArmyOperationPriority[] = [
    // Southeast Herzegovina OZ: defend heartland
    { name: 'Herzegovina Defense', corps_id: 'hvo_southeast_herzegovina', target_municipalities: ['mostar', 'siroki_brijeg', 'citluk', 'capljina', 'stolac', 'neum', 'ljubuski', 'grude', 'posusje'], start_week: 0, end_week: 9999, weight: 80, min_outcome: 'stalemate' },
    // Central Bosnia OZ: defend/expand Croat pockets
    { name: 'Central Bosnia Defense', corps_id: 'hvo_central_bosnia', target_municipalities: ['vitez', 'busovaca', 'kiseljak', 'novi_travnik', 'zepce', 'usora', 'kakanj', 'fojnica'], start_week: 0, end_week: 12, weight: 75, min_outcome: 'stalemate' },
    // Central Bosnia OZ: continued defense (no Lasva Offensive — alliance active)
    { name: 'Central Bosnia Anti-RS', corps_id: 'hvo_central_bosnia', target_municipalities: ['vitez', 'busovaca', 'kiseljak', 'novi_travnik', 'zepce', 'usora', 'kakanj', 'fojnica'], start_week: 12, end_week: 26, weight: 75, min_outcome: 'stalemate' },
    // Central Bosnia OZ: post-Washington defense
    { name: 'Central Bosnia Hold', corps_id: 'hvo_central_bosnia', target_municipalities: ['vitez', 'busovaca', 'kiseljak', 'zepce'], start_week: 26, end_week: 9999, weight: 50, min_outcome: 'stalemate' },
    // Northwest Bosnia OZ (Posavina): initial defense, then retreat to Orašje pocket
    // Historically HVO lost Bosanski Brod, Derventa, Odžak by Oct 1992 — retreated to Orašje pocket
    { name: 'Posavina Defense (initial)', corps_id: 'hvo_northwest_bosnia', target_municipalities: ['orasje', 'odzak', 'bosanski_brod', 'derventa'], start_week: 0, end_week: 16, weight: 85, min_outcome: 'repulsed' },
    { name: 'Orasje Pocket', corps_id: 'hvo_northwest_bosnia', target_municipalities: ['orasje'], start_week: 16, end_week: 9999, weight: 90, min_outcome: 'costly_victory' },
    // Tomislavgrad OZ: western defense
    { name: 'Western Defense', corps_id: 'hvo_tomislavgrad', target_municipalities: ['duvno', 'livno', 'kupres', 'tomislavgrad'], start_week: 0, end_week: 9999, weight: 50, min_outcome: 'stalemate' },
    // Post-Washington (week 100 ≈ late 1994): anti-RS operations — HVO cooperates with ARBiH against VRS
    { name: 'Herzegovina Anti-RS', corps_id: 'hvo_southeast_herzegovina', target_municipalities: ['nevesinje', 'bileca', 'gacko', 'trebinje', 'kalinovik'], start_week: 100, end_week: 9999, weight: 60, min_outcome: 'stalemate' },
    { name: 'Western Anti-RS', corps_id: 'hvo_tomislavgrad', target_municipalities: ['glamoc', 'sipovo', 'kupres', 'bosansko_grahovo'], start_week: 100, end_week: 9999, weight: 55, min_outcome: 'stalemate' },
    { name: 'Posavina Anti-RS', corps_id: 'hvo_northwest_bosnia', target_municipalities: ['derventa', 'bosanski_brod', 'modrica', 'bosanski_samac'], start_week: 100, end_week: 9999, weight: 55, min_outcome: 'stalemate' },
];

export const FACTION_ARMY_PRIORITIES: Record<FactionId, ArmyOperationPriority[]> = {
    RS: VRS_ARMY_PRIORITIES,
    RBiH: RBIH_ARMY_PRIORITIES,
    HRHB: HRHB_ARMY_PRIORITIES,
};

/**
 * Get active army-level priorities for a corps at a given turn.
 * Returns priorities sorted by weight descending (highest first).
 * Deterministic: weight sort, then name sort for tie-break.
 */
export function getCorpsArmyPriorities(
    faction: FactionId,
    corpsId: string,
    turn: number
): ArmyOperationPriority[] {
    const all = FACTION_ARMY_PRIORITIES[faction] ?? [];
    return all
        .filter(p => p.corps_id === corpsId && turn >= p.start_week && turn < p.end_week)
        .sort((a, b) => {
            if (b.weight !== a.weight) return b.weight - a.weight;
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
}

/**
 * Check if a municipality is in a faction's corridor/defensive priority zones.
 * Uses the settlement graph's mun_code / mun1990_id to determine municipality membership.
 */
export function isCorridorMunicipality(
    munId: string | undefined | null,
    faction: FactionId
): boolean {
    if (!munId) return false;
    const strategy = FACTION_STRATEGIES[faction];
    return strategy.corridor_municipalities.includes(munId);
}

/**
 * Check if a municipality is a strategic offensive objective for the faction.
 */
export function isOffensiveObjective(
    munId: string | undefined | null,
    faction: FactionId
): boolean {
    if (!munId) return false;
    const strategy = FACTION_STRATEGIES[faction];
    return strategy.offensive_objectives.includes(munId);
}

/**
 * Check if a municipality is a defensive priority for the faction.
 */
export function isDefensivePriority(
    munId: string | undefined | null,
    faction: FactionId
): boolean {
    if (!munId) return false;
    const strategy = FACTION_STRATEGIES[faction];
    return strategy.defensive_priorities.includes(munId);
}
