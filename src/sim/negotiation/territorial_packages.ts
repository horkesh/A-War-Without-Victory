/**
 * Territorial packages for the Dayton negotiation.
 *
 * Each package represents a real geographic area contested at the historical
 * Dayton negotiations. Players demand or concede packages using negotiation
 * capital accumulated during the war.
 *
 * Deterministic: constant data, no randomness.
 */

import type { TerritorialPackage } from '../../state/negotiation_types.js';

/** Per-state captured-ground packages passed alongside the fixed catalog (front_packages.ts). */
export type ExtraPackages = readonly TerritorialPackage[] | undefined;

// ═══════════════════════════════════════════════════════════════════════════
// Package definitions
// ═══════════════════════════════════════════════════════════════════════════

export const TERRITORIAL_PACKAGES: readonly TerritorialPackage[] = [
    {
        id: 'gorazde_corridor',
        name: 'Goražde Corridor',
        description:
            'Land corridor joining Goražde to the Sarajevo canton: Trnovo (Treskavica side), Foča-Ustikolina ' +
            'and the Prača valley. Milošević conceded it at Dayton, so the mediator\'s draft gives it to the ' +
            'Federation; RS can demand it back, which would leave Goražde cut off, and RBiH can give it up.',
        // Redrawn (owner, 2026-11-08) from all of Foča, Goražde and Višegrad (4.2 % of BiH)
        // to the nine corridor cells of the IEBL audit (docs/40_reports/20261108_DAYTON_IEBL_CELL_AUDIT.md §4),
        // all on the Federation side of the audited map, so the holder is the Federation.
        default_holder: 'RBiH',
        capital_cost_to_demand: 15,
        capital_cost_to_concede: 10,
        osid_keywords: ['tusila', 'delijas', 'gornja_presjenica', 'donje_zesce', 'mazlina', 'ustikolina', 'praca', 'vrazalice', 'bulozi'],
        // Sarajevo would not sign without Goražde's land link: RBiH's delegation never gives
        // it up and Washington cannot force it (walkthrough 2026-11-08: RBiH had accepted
        // an RS demand at the authored price, leaving Goražde cut off).
        protected_for: ['RBiH'],
    },
    {
        id: 'brcko_district',
        name: 'Brčko District',
        description:
            'Strategic corridor connecting eastern and western RS. Historically left to international arbitration ' +
            'at Dayton, eventually becoming a neutral district under international supervision.',
        default_holder: 'RS',
        capital_cost_to_demand: 20,
        capital_cost_to_concede: 18,
        osid_keywords: ['brcko'],
    },
    {
        id: 'posavina_pocket',
        name: 'Posavina Pocket',
        description:
            'Northern corridor area contested between RS and HRHB. The Posavina corridor was existential ' +
            'for RS connectivity. Historically, RS held the corridor but lost the Orašje pocket.',
        default_holder: 'RS',
        capital_cost_to_demand: 10,
        capital_cost_to_concede: 8,
        osid_keywords: ['orasje', 'odzak', 'bosanski_samac', 'modrica'],
    },
    {
        id: 'sarajevo_suburbs',
        name: 'Sarajevo Suburbs',
        description:
            'RS-held suburbs surrounding Sarajevo (Ilidža, Hadžići, Vogošća, Ilijaš). ' +
            'Historically traded at Dayton: RS gave up suburbs in exchange for territorial gains elsewhere.',
        default_holder: 'RS',
        capital_cost_to_demand: 15,
        capital_cost_to_concede: 12,
        osid_keywords: ['ilidza', 'hadzici', 'vogosca', 'ilijas'],
    },
    {
        id: 'western_bosnia',
        name: 'Western Bosnia',
        description:
            'Bihać pocket, Ključ, Sanski Most area. Historically, the 1995 Federation offensives ' +
            '(Operation Storm aftermath) brought significant western Bosnian territory under Federation control.',
        default_holder: 'RBiH',
        capital_cost_to_demand: 12,
        capital_cost_to_concede: 10,
        osid_keywords: ['bihac', 'kljuc', 'sanski_most', 'bosanski_petrovac', 'bosanska_krupa'],
    },
    {
        id: 'mostar',
        name: 'Mostar',
        description:
            'Divided city, historically placed under EU administration. Joint HRHB/RBiH arrangement. ' +
            'Symbolically important for both the Federation concept and Croatian autonomy aspirations.',
        default_holder: 'HRHB',
        capital_cost_to_demand: 8,
        capital_cost_to_concede: 6,
        osid_keywords: ['mostar'],
    },
    {
        id: 'central_bosnia',
        name: 'Central Bosnia',
        description:
            'Travnik, Zenica, Vitez area. Core ARBiH territory with significant Croat minority. ' +
            'Washington Agreement placed this firmly in the Federation.',
        default_holder: 'RBiH',
        capital_cost_to_demand: 10,
        capital_cost_to_concede: 8,
        osid_keywords: ['travnik', 'zenica', 'vitez', 'busovaca', 'kakanj'],
    },
    {
        id: 'srebrenica_area',
        name: 'Srebrenica Area',
        description:
            'If fallen: demands return of Srebrenica and Žepa enclaves to Federation control. ' +
            'Extremely costly to demand back due to fait accompli, but carries enormous moral weight.',
        default_holder: 'RS',
        capital_cost_to_demand: 25,
        capital_cost_to_concede: 15,
        osid_keywords: ['srebrenica', 'zepa', 'bratunac'],
    },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Lookup helpers
// ═══════════════════════════════════════════════════════════════════════════

const packageMap = new Map<string, TerritorialPackage>();
for (const pkg of TERRITORIAL_PACKAGES) {
    packageMap.set(pkg.id, pkg);
}

/**
 * Get a territorial package by ID. Returns undefined if not found. `extra` carries the
 * per-state captured-ground packages (front_packages.ts) when the caller has them.
 */
export function getTerritorialPackageById(
    id: string,
    extra?: readonly TerritorialPackage[],
): TerritorialPackage | undefined {
    return packageMap.get(id) ?? extra?.find((p) => p.id === id);
}

/** Get all territorial packages. */
export function getAllTerritorialPackages(): readonly TerritorialPackage[] {
    return TERRITORIAL_PACKAGES;
}

/**
 * Compute the capital cost for a faction to demand a specific territorial package.
 * If the faction already holds the package (is the default_holder), cost is 0.
 * Otherwise, returns capital_cost_to_demand.
 */
export function getDemandCost(pkg: TerritorialPackage, demandingFaction: string): number {
    if (pkg.default_holder === demandingFaction) return 0;
    return pkg.capital_cost_to_demand;
}

/**
 * Compute the capital cost for a faction to concede a specific territorial package.
 * If the faction does not hold the package, cost is 0.
 * Otherwise, returns capital_cost_to_concede.
 */
export function getConcessionCost(pkg: TerritorialPackage, concedingFaction: string): number {
    if (pkg.default_holder !== concedingFaction) return 0;
    return pkg.capital_cost_to_concede;
}
