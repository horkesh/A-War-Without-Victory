/**
 * recalibrate_oob.ts
 *
 * Recalibrates oob_brigades.json to reflect historical April 1992 reality:
 * - RS: JNA professional brigades (high personnel, high cohesion, varied equipment)
 * - RBiH: TO militia origin (low personnel, low cohesion, gradual formation)
 * - HRHB: Croatian cadres (moderate stats, by OZ)
 * - Per-brigade personnel/cohesion/equipment calibrated to BB historical data
 *
 * Run: npx tsx scripts/recalibrate_oob.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA = resolve(import.meta.dirname ?? '.', '..', 'data');
const OOB_PATH = resolve(DATA, 'source', 'oob_brigades.json');

interface Brigade {
    id: string;
    faction: string;
    name: string;
    home_mun: string;
    home_settlement?: string;
    subordinate_to?: string;
    kind: string;
    source?: string;
    default_equipment_class: string;
    available_from: number;
    mandatory?: boolean;
    initial_personnel?: number;
    initial_cohesion?: number;
    honor?: string;
    home_osid?: string;
    [key: string]: unknown;
}

const oobData = JSON.parse(readFileSync(OOB_PATH, 'utf8')) as {
    awwv_meta: Record<string, unknown>;
    brigades: Brigade[];
};

const brigades = oobData.brigades;

// ═══════════════════════════════════════════════════════════════════════════
// RS Tiering Rules
// ═══════════════════════════════════════════════════════════════════════════

const RS_MECHANIZED_IDS = new Set([
    'rs_1st_armored_brigade',
    'rs_2nd_armored_brigade',
    'rs_1st_sarajevo_mechanized',
]);

const RS_MOTORIZED_IDS = new Set([
    'rs_1st_guards_motorized',
    'rs_65th_protection_motorized_regiment',
    'rs_16th_krajina_motorized',
    'rs_27th_derventa_motorized',
    'rs_43rd_prijedor_motorized',
    'rs_7th_krajina_motorized',
    'rs_2nd_sarajevo_light_infantry',
    'rs_3rd_sarajevo_infantry',
    'rs_4th_sarajevo_light_infantry',
    'rs_1st_romanija_infantry',
]);

// 2nd Krajina Corps and weaker Herzegovina brigades → light infantry tier
const RS_WEAK_CORPS = new Set([
    'vrs_2nd_krajina_corps',
]);

// Specific weak brigades from Herzegovina/peripheral areas
const RS_WEAK_IDS = new Set([
    'rs_cajnice_light_infantry',
    'rs_kalinovik_light_infantry',
    'rs_rudo_light_infantry',
]);

// Strong 1st Krajina key brigades (beyond mechanized/motorized)
const RS_STRONG_1K_IDS = new Set([
    'rs_kozara_brigade',
    'rs_5th_kozara_light_infantry',
    'rs_6th_sana_light_infantry',
    'rs_11th_prnjavor_light_infantry',
    'rs_22nd_banja_luka_light_infantry',
]);

// Drina Corps core brigades
const RS_DRINA_CORE_IDS = new Set([
    'rs_1st_birac_infantry',
    'rs_1st_zvornik_infantry',
    'rs_bratunac_light_infantry',
]);

function tierRS(b: Brigade): void {
    if (RS_MECHANIZED_IDS.has(b.id)) {
        b.initial_personnel = 1500;
        b.initial_cohesion = 75;
        b.default_equipment_class = 'mechanized';
    } else if (RS_MOTORIZED_IDS.has(b.id)) {
        b.initial_personnel = 1200;
        b.initial_cohesion = 72;
        b.default_equipment_class = 'motorized';
    } else if (RS_WEAK_CORPS.has(b.subordinate_to ?? '') || RS_WEAK_IDS.has(b.id)) {
        b.initial_personnel = 800;
        b.initial_cohesion = 62;
        b.default_equipment_class = 'light_infantry';
    } else if (RS_STRONG_1K_IDS.has(b.id) || RS_DRINA_CORE_IDS.has(b.id)) {
        b.initial_personnel = 1200;
        b.initial_cohesion = 70;
        // Keep mountain
    } else {
        // Standard RS infantry
        b.initial_personnel = 1000;
        b.initial_cohesion = 67;
        // Keep mountain
    }
    // All RS brigades available at turn 0
    b.available_from = 0;
    b.mandatory = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// RBiH Tiering Rules
// ═══════════════════════════════════════════════════════════════════════════

// Tier 0: Immediate defenders (cities under threat in April 1992)
// These are the TO staffs that were already organized when war broke out
const RBIH_TIER0_CORPS = new Set([
    'arbih_1st_corps',  // Sarajevo — under immediate siege
    'arbih_5th_corps',  // Bihać — cut off from day 1
]);

// Additional Tier 0 brigades from other corps (key city defenders)
const RBIH_TIER0_MUNS = new Set([
    'tuzla', 'zenica', 'gorazde', 'gradacac', 'brcko',
    'travnik', 'visoko', 'maglaj', 'bugojno', 'konjic',
    'jablanica', 'mostar',
]);

// Elite units
const RBIH_ELITE_IDS = new Set([
    'arbih_guards_brigade',
    'arbih_120th_liberation_black_swans',
]);

// Enclave units (very isolated, small)
const RBIH_ENCLAVE_CORPS = new Set([
    'arbih_81st_independent',  // Goražde/Eastern enclaves
]);
const RBIH_SREBRENICA_PATTERN = /srebrenica|28[0-4]/i;

// Honor units get special treatment
const RBIH_HONOR_IDS: Record<string, { honor: string; cohesion: number }> = {
    'arbih_7th_vitezka_muslim': { honor: 'viteska', cohesion: 68 },
    'arbih_17th_slavna_krajiska': { honor: 'slavna', cohesion: 62 },
    'arbih_502nd_slavna_vitezka': { honor: 'viteska', cohesion: 65 },
};

function tierRBiH(b: Brigade): void {
    // Elite units
    if (RBIH_ELITE_IDS.has(b.id)) {
        b.initial_personnel = 600;
        b.initial_cohesion = 65;
        b.default_equipment_class = 'special';
        b.available_from = 8; // Guards formed mid-1992
        b.mandatory = true;
        return;
    }

    // Honor decorations
    if (RBIH_HONOR_IDS[b.id]) {
        const h = RBIH_HONOR_IDS[b.id]!;
        b.honor = h.honor;
        b.initial_cohesion = h.cohesion;
    }

    // Enclave units (Goražde, Srebrenica, Žepa)
    if (RBIH_ENCLAVE_CORPS.has(b.subordinate_to ?? '') ||
        RBIH_SREBRENICA_PATTERN.test(b.id) || RBIH_SREBRENICA_PATTERN.test(b.name)) {
        b.initial_personnel = 350;
        b.initial_cohesion = b.initial_cohesion ?? 38;
        b.default_equipment_class = 'police';
        b.available_from = 0;
        b.mandatory = true;
        return;
    }

    // Tier 0: Immediate defenders
    const isTier0Corps = RBIH_TIER0_CORPS.has(b.subordinate_to ?? '');
    const isTier0Mun = RBIH_TIER0_MUNS.has(b.home_mun);

    if (isTier0Corps || isTier0Mun) {
        // Sarajevo brigades get slightly different stats
        if (b.subordinate_to === 'arbih_1st_corps') {
            b.initial_personnel = b.initial_personnel ?? 500;
            b.initial_cohesion = b.initial_cohesion ?? 45;
        } else if (b.subordinate_to === 'arbih_5th_corps') {
            b.initial_personnel = b.initial_personnel ?? 500;
            b.initial_cohesion = b.initial_cohesion ?? 45;
        } else {
            b.initial_personnel = b.initial_personnel ?? 550;
            b.initial_cohesion = b.initial_cohesion ?? 48;
        }
        b.default_equipment_class = 'light_infantry';
        b.available_from = 0;
        b.mandatory = true;
        return;
    }

    // Remaining brigades: tier by original available_from
    const origAvail = b.available_from;
    if (origAvail <= 0) {
        // Was available_from 0 but not in a tier-0 area → Tier 1 (early consolidation)
        b.initial_personnel = b.initial_personnel ?? 600;
        b.initial_cohesion = b.initial_cohesion ?? 48;
        b.default_equipment_class = 'light_infantry';
        b.available_from = 4; // Moved to turn 4
        b.mandatory = true;
    } else if (origAvail <= 8) {
        // Tier 1: Early consolidation
        b.initial_personnel = b.initial_personnel ?? 600;
        b.initial_cohesion = b.initial_cohesion ?? 50;
        b.default_equipment_class = 'light_infantry';
        b.mandatory = true;
    } else if (origAvail <= 20) {
        // Tier 2: Corps reorganization
        b.initial_personnel = b.initial_personnel ?? 700;
        b.initial_cohesion = b.initial_cohesion ?? 52;
        b.default_equipment_class = 'light_infantry';
        b.mandatory = true;
    } else {
        // Tier 3: Late formations
        b.initial_personnel = b.initial_personnel ?? 800;
        b.initial_cohesion = b.initial_cohesion ?? 56;
        b.default_equipment_class = 'mountain';
        b.mandatory = true;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HRHB Tiering Rules
// ═══════════════════════════════════════════════════════════════════════════

function tierHRHB(b: Brigade): void {
    const sub = b.subordinate_to ?? '';

    if (sub === 'hvo_southeast_herzegovina') {
        // SE Herzegovina OZ: strongest, best-supplied via Croatia
        if (b.default_equipment_class === 'motorized') {
            b.initial_personnel = 950;
            b.initial_cohesion = 64;
        } else {
            b.initial_personnel = 900;
            b.initial_cohesion = 62;
            b.default_equipment_class = 'mountain';
        }
    } else if (sub === 'hvo_central_bosnia') {
        // Central Bosnia OZ: enclaved, mixed HVO-ARBiH
        b.initial_personnel = 700;
        b.initial_cohesion = 55;
        b.default_equipment_class = 'light_infantry';
    } else if (sub === 'hvo_posavina' || sub === 'hvo_northwest_bosnia') {
        // NW Bosnia OZ: isolated Posavina pocket
        b.initial_personnel = 650;
        b.initial_cohesion = 52;
        b.default_equipment_class = 'light_infantry';
    } else if (sub === 'hvo_tomislavgrad') {
        // Tomislavgrad OZ: western Herzegovina
        b.initial_personnel = 800;
        b.initial_cohesion = 58;
        b.default_equipment_class = 'mountain';
    } else if (sub.startsWith('arbih_')) {
        // ARBiH-integrated HVO units
        b.initial_personnel = 700;
        b.initial_cohesion = 55;
        b.default_equipment_class = 'light_infantry';
    } else {
        // Default HRHB
        b.initial_personnel = 800;
        b.initial_cohesion = 60;
    }

    // Most HRHB available at turn 0
    if (b.available_from > 8) {
        b.available_from = 8; // Cap at 2 months
    }
    b.mandatory = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Apply tiering to all existing brigades
// ═══════════════════════════════════════════════════════════════════════════

for (const b of brigades) {
    if (b.faction === 'RS') tierRS(b);
    else if (b.faction === 'RBiH') tierRBiH(b);
    else if (b.faction === 'HRHB') tierHRHB(b);
}

// ═══════════════════════════════════════════════════════════════════════════
// Update metadata and write
// ═══════════════════════════════════════════════════════════════════════════

// Count stats
const stats = { RS: { count: 0, avgPers: 0, totalPers: 0 },
                RBiH: { count: 0, avgPers: 0, totalPers: 0 },
                HRHB: { count: 0, avgPers: 0, totalPers: 0 } };

for (const b of brigades) {
    const f = stats[b.faction as keyof typeof stats];
    if (!f) continue;
    f.count++;
    f.totalPers += b.initial_personnel ?? 800;
}
for (const f of Object.values(stats)) {
    f.avgPers = Math.round(f.totalPers / Math.max(1, f.count));
}

console.log('Recalibration complete:');
console.log(`  RS:   ${stats.RS.count} brigades, avg personnel: ${stats.RS.avgPers}`);
console.log(`  RBiH: ${stats.RBiH.count} brigades, avg personnel: ${stats.RBiH.avgPers}`);
console.log(`  HRHB: ${stats.HRHB.count} brigades, avg personnel: ${stats.HRHB.avgPers}`);

// Count turn-0 brigades
const t0 = { RS: 0, RBiH: 0, HRHB: 0 };
for (const b of brigades) {
    if (b.available_from === 0 && b.mandatory) {
        t0[b.faction as keyof typeof t0]++;
    }
}
console.log(`  Turn 0: RS=${t0.RS}, RBiH=${t0.RBiH}, HRHB=${t0.HRHB}`);

// Update meta
const corrections = oobData.awwv_meta.corrections_applied as string[];
corrections.push(
    'Historical recalibration (2026-02-25): Per-brigade initial_personnel and initial_cohesion based on BB historical data.',
    'RS: 5-tier system (mechanized/motorized/strong/standard/weak) with personnel 800-1500, cohesion 62-75.',
    'RBiH: 4-tier formation timing (tier0 immediate/tier1 early/tier2 corps reorg/tier3 late) with personnel 350-800, cohesion 38-56.',
    'HRHB: By OZ (SE Herzegovina strongest, Central Bosnia weakest) with personnel 650-950, cohesion 52-64.',
    'RBiH brigades not in threatened areas moved to available_from >= 4 (gradual TO→brigade formation).'
);

oobData.brigades = brigades;
writeFileSync(OOB_PATH, JSON.stringify(oobData, null, 2) + '\n');
console.log(`  Wrote ${brigades.length} entries to oob_brigades.json`);
