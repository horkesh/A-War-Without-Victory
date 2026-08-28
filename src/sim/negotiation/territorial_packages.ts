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
        osids: [
            'op:foca:donje_zesce',
            'op:foca:mazlina',
            'op:foca:ustikolina',
            'op:gorazde:bacci',
            'op:gorazde:citluk_2',
            'op:gorazde:faocici_2',
            'op:gorazde:glamoc',
            'op:gorazde:gorazde_2',
            'op:gorazde:hrancici',
            'op:gorazde:kamen',
            'op:gorazde:kola',
            'op:gorazde:kolovarice',
            'op:gorazde:mravinjac_2',
            'op:gorazde:osjecani_2',
            'op:gorazde:podkozara_donja_2',
            'op:gorazde:semihova_2',
            'op:gorazde:slatina_2',
            'op:gorazde:sopotnica',
            'op:gorazde:zorovici',
            'op:pale:podgrab',
            'op:trnovo:delijas',
            'op:trnovo:kijevo_2',
        ],
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
        osids: [
            'op:bosanski_brod:brod',
            'op:bosanski_brod:donja_vrela',
            'op:bosanski_brod:lijesce_2',
            'op:bosanski_brod:novo_selo_2',
            'op:bosanski_samac:crkvina_2',
            'op:bosanski_samac:domaljevac_2',
            'op:bosanski_samac:novo_selo_2',
            'op:bosanski_samac:samac_2',
            'op:bosanski_samac:tisina',
            'op:derventa:derventa_2',
            'op:derventa:luzani_bosanski',
            'op:modrica:modrica',
            'op:modrica:vranjak_2',
            'op:odzak:donja_dubica',
            'op:odzak:gornji_svilaj',
            'op:odzak:potocani_2',
            'op:orasje:donja_mahala',
            'op:orasje:orasje',
            'op:orasje:ostra_luka',
        ],
        alternative_group: 'posavina',
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
        osids: [
            'op:centar_sarajevo:radava',
            'op:hadzici:binjezevo',
            'op:hadzici:budmolici',
            'op:hadzici:hadzici',
            'op:hadzici:lokve',
            'op:hadzici:luke',
            'op:hadzici:misevici_2',
            'op:hadzici:pazaric',
            'op:hadzici:tarcin_2',
            'op:ilidza:kasindo',
            'op:ilidza:rakovica_2',
            'op:ilidza:rudnik_2',
            'op:ilidza:sarajevo_dio_ilidza_2',
            'op:ilidza:sarajevo_dio_novi_grad_sarajevo',
            'op:ilijas:dragoradi',
            'op:ilijas:krivajevici',
            'op:ilijas:medojevici',
            'op:ilijas:podlugovi',
            'op:ilijas:sirovine',
            'op:ilijas:srednje',
            'op:ilijas:visojevica',
            'op:novi_grad_sarajevo:recica',
            'op:stari_grad_sarajevo:faletici',
            'op:vogosca:hotonj',
            'op:vogosca:svrake',
            'op:vogosca:vogosca_3',
        ],
        alternative_group: 'sarajevo',
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
        alternative_group: 'western_bosnia',
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
        osids: [
            'op:rogatica:zepa_2',
            'op:srebrenica:bostahovine_2',
            'op:srebrenica:brezovice_2',
            'op:srebrenica:donji_potocari_2',
            'op:srebrenica:ljeskovik_2',
            'op:srebrenica:luka_2',
            'op:srebrenica:mala_daljegosta_2',
            'op:srebrenica:milacevici',
            'op:srebrenica:obadi',
            'op:srebrenica:osmace_2',
            'op:srebrenica:radovcici',
            'op:srebrenica:srebrenica_2',
            'op:srebrenica:suceska',
            'op:srebrenica:sulice_2',
        ],
    },
    // ── Painted negotiation pieces (owner, 2026-08-28) ────────────────────────
    // Settlement-exact, drawn on the operational map rather than matched by name
    // fragment. Capital costs below are a FIRST PASS scaled off area and are the
    // designer's to tune; the OSID lists are the owner's and are not.
    {
        id: 'sarajevo_corridor',
        name: 'Sarajevo Airport Corridor',
        description:
            'The Dobrinja/airport strip alone — the minimal Sarajevo ask when the full suburbs ' +
            'package is refused. Small in area and decisive in effect: it is the ground the 1996 ' +
            'suburbs handover actually turned on.',
        default_holder: 'RS',
        capital_cost_to_demand: 10,
        capital_cost_to_concede: 12,
        osids: [
            'op:ilidza:sarajevo_dio_ilidza_2',
            'op:ilidza:sarajevo_dio_novi_grad_sarajevo',
        ],
        alternative_group: 'sarajevo',
    },
    {
        id: 'posavina_historical',
        name: 'Posavina — Orašje Pocket',
        description:
            'The Orašje pocket alone, the historical Dayton outcome in the Posavina: RS kept the ' +
            'corridor, the Federation kept the pocket. The minimal alternative to demanding the whole ' +
            'corridor.',
        default_holder: 'RS',
        capital_cost_to_demand: 8,
        capital_cost_to_concede: 10,
        osids: [
            'op:bosanski_samac:domaljevac_2',
            'op:odzak:donja_dubica',
            'op:odzak:gornji_svilaj',
            'op:odzak:potocani_2',
            'op:orasje:ostra_luka',
        ],
        alternative_group: 'posavina',
    },
    {
        id: 'srebrenica_gorazde_corridor',
        name: 'Drina Valley Corridor',
        description:
            'The Prača/Drina link from Goražde north toward Žepa, through Ustiprača, Rogatica and ' +
            'Međeđa. Connects the eastern enclaves to each other rather than to the Federation ' +
            'heartland.',
        default_holder: 'RS',
        capital_cost_to_demand: 12,
        capital_cost_to_concede: 14,
        osids: [
            'op:gorazde:slatina_2',
            'op:gorazde:sopotnica',
            'op:gorazde:ustipraca_2',
            'op:rogatica:brcigovo',
            'op:rogatica:stara_gora',
            'op:visegrad:medjedja_2',
        ],
    },
    {
        id: 'doboj',
        name: 'Doboj Approaches',
        description:
            'The Ozren approaches to Doboj. RS-held at the ceasefire and never seriously contested at ' +
            'Dayton, but the ground the ARBiH 1995 offensives were pointed at.',
        default_holder: 'RS',
        capital_cost_to_demand: 8,
        capital_cost_to_concede: 8,
        osids: [
            'op:doboj:boljanic_2',
            'op:doboj:makljenovac',
            'op:gracanica:petrovo_2',
        ],
    },
    {
        id: 'prijedor',
        name: 'Prijedor',
        description:
            'Prijedor and Kozarac. RS-held throughout; returning it was never negotiable at Dayton, ' +
            'which is precisely what makes demanding it expensive and meaningful.',
        default_holder: 'RS',
        capital_cost_to_demand: 10,
        capital_cost_to_concede: 12,
        osids: [
            'op:prijedor:kamicani',
            'op:prijedor:kozarac_2',
            'op:prijedor:ljubija_2',
            'op:prijedor:prijedor_2',
            'op:prijedor:rasavci_2',
        ],
    },
    {
        id: 'mrkonjic_sipovo',
        name: 'Mrkonjić Grad and Šipovo',
        description:
            'Taken in the autumn 1995 offensive and held by HVO at the ceasefire. The largest piece ' +
            'on the table, and the only one where HRHB is the seller: both RS and RBiH pay full price ' +
            'for it.',
        default_holder: 'HRHB',
        capital_cost_to_demand: 25,
        capital_cost_to_concede: 20,
        osids: [
            'op:jajce:barevo_2',
            'op:jajce:jezero_2',
            'op:jajce:prisoje',
            'op:kljuc:donji_vrbljani_2',
            'op:mrkonjic_grad:baljvine_2',
            'op:mrkonjic_grad:bjelajce_2',
            'op:mrkonjic_grad:gerzovo_2',
            'op:mrkonjic_grad:majdan_2',
            'op:mrkonjic_grad:mrkonjic_grad_2',
            'op:mrkonjic_grad:podrasnica_2',
            'op:sipovo:brdjani',
            'op:sipovo:gornji_mujdzici_2',
            'op:sipovo:pribeljci_2',
            'op:sipovo:sipovo_2',
            'op:sipovo:volari_2',
        ],
    },
    {
        id: 'bosanski_novi',
        name: 'Bosanski Novi Salient',
        description:
            'A small Federation-held salient on the Una. The only piece in the set that RS can demand ' +
            'and RBiH holds — without it RS arrives at the table with nothing to ask for.',
        default_holder: 'RBiH',
        capital_cost_to_demand: 6,
        capital_cost_to_concede: 6,
        osids: [
            'op:bosanski_novi:krslje_2',
            'op:bosanski_novi:matavazi_2',
        ],
    },
    {
        id: 'kljuc',
        name: 'Ključ',
        description:
            'Ključ town and its approaches, taken by the ARBiH 5th Corps in the 1995 Sana offensive ' +
            'and held at the ceasefire. An RS demand, not a Federation one.',
        default_holder: 'RBiH',
        capital_cost_to_demand: 10,
        capital_cost_to_concede: 10,
        osids: [
            'op:kljuc:hadzici',
            'op:kljuc:kljuc_2',
            'op:kljuc:krasulje_2',
            'op:kljuc:sanica_2',
        ],
        alternative_group: 'western_bosnia',
    },
    {
        id: 'sanski_most',
        name: 'Sanski Most',
        description:
            'Sanski Most and the Japra valley, the deepest Federation advance of the 1995 offensives ' +
            'and RS-held for the three years before it. The largest single piece RS can ask to have ' +
            'back.',
        default_holder: 'RBiH',
        capital_cost_to_demand: 14,
        capital_cost_to_concede: 12,
        osids: [
            'op:sanski_most:budimlic_japra_2',
            'op:sanski_most:ilidza_2',
            'op:sanski_most:jelasinovci',
            'op:sanski_most:kljevci',
            'op:sanski_most:lusci_palanka_2',
            'op:sanski_most:ostra_luka',
            'op:sanski_most:sanski_most_2',
            'op:sanski_most:skucani_vakuf_2',
            'op:sanski_most:stari_majdan',
        ],
        alternative_group: 'western_bosnia',
    },
    {
        id: 'kotor_varos',
        name: 'Kotor Varoš',
        description:
            'The Vrbanja valley above Banja Luka, RS-held from 1992 and never retaken. A Federation ' +
            'ask with no military basis at the ceasefire, which is what makes it costly to demand.',
        default_holder: 'RS',
        capital_cost_to_demand: 8,
        capital_cost_to_concede: 8,
        osids: [
            'op:kotor_varos:krusevo_brdo_i',
            'op:kotor_varos:prisocka_2',
            'op:kotor_varos:vrbanjci_2',
        ],
    },
    {
        id: 'grahovo_glamoc_drvar',
        name: 'Grahovo, Glamoč and Drvar',
        description:
            'The Dinaric karst taken by HV and HVO in the summer 1995 offensives. The emptiest ' +
            'ground on the table: 4.8% of BiH holding 0.8% of its people, which is why it changed ' +
            'hands so fast and counted for so little.',
        default_holder: 'HRHB',
        capital_cost_to_demand: 14,
        capital_cost_to_concede: 10,
        osids: [
            'op:bosansko_grahovo:bosansko_grahovo_2',
            'op:bosansko_grahovo:crni_lug',
            'op:bosansko_grahovo:malesevci',
            'op:bosansko_grahovo:ugarci',
            'op:glamoc:glamoc_2',
            'op:glamoc:halapic',
            'op:glamoc:kovacevci_2',
            'op:glamoc:pribelja',
            'op:glamoc:stekerovci_2',
            'op:glamoc:vidimlije_2',
            'op:titov_drvar:drvar_2',
            'op:titov_drvar:prekaja_2',
            'op:titov_drvar:sipovljani_2',
        ],
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
