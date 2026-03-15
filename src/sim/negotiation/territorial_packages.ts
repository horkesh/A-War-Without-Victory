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

// ═══════════════════════════════════════════════════════════════════════════
// Package definitions
// ═══════════════════════════════════════════════════════════════════════════

export const TERRITORIAL_PACKAGES: readonly TerritorialPackage[] = [
    {
        id: 'gorazde_corridor',
        name: 'Goražde Corridor',
        description:
            'Land corridor connecting the Goražde enclave to Federation territory. ' +
            'Historically, RBiH demanded and received this at Dayton despite RS holding surrounding territory.',
        default_holder: 'RS',
        capital_cost_to_demand: 15,
        capital_cost_to_concede: 10,
        osid_keywords: ['gorazde', 'foca', 'ustikolina', 'visegrad'],
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
        osid_keywords: ['brcko', 'rahic', 'brezovo_polje'],
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
        osid_keywords: ['ilidza', 'hadzici', 'vogosca', 'ilijas', 'rajlovac'],
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
        osid_keywords: ['srebrenica', 'zepa', 'bratunac', 'skelani'],
    },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Lookup helpers
// ═══════════════════════════════════════════════════════════════════════════

const packageMap = new Map<string, TerritorialPackage>();
for (const pkg of TERRITORIAL_PACKAGES) {
    packageMap.set(pkg.id, pkg);
}

/** Get a territorial package by ID. Returns undefined if not found. */
export function getTerritorialPackageById(id: string): TerritorialPackage | undefined {
    return packageMap.get(id);
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
