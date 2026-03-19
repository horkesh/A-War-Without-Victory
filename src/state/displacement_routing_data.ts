/**
 * Per-municipality displacement routing tables (Phase M4, 2026-03-01).
 * Replaces region-specific arrays with comprehensive routing for all 8 regions × 3 ethnicities.
 * Source: docs/30_planning/20260228_war_phase_mechanics_design.md §Mechanic 8.
 *
 * Design principles:
 * 1. Every municipality gets origin-specific routing for each displaced ethnicity.
 * 2. Frontline settlements first (nearest friendly-controlled territory).
 * 3. Bigger centers second (regional hubs with capacity).
 * 4. Geography drives routing — people flee along roads, not across mountains.
 * 5. Faction control gates routing at runtime (caller validates).
 */

import type { FactionId, MunicipalityId } from './game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Receiving capacity constants (unchanged from prior design)
// ═══════════════════════════════════════════════════════════════════════════

/** Receiving cap: 150% of pre-war population; overflow disperses. */
export const DISPLACEMENT_RECEIVING_CAPACITY_FRACTION = 1.5;

/** Sarajevo siege: 110% cap due to siege conditions. */
export const SARAJEVO_SIEGE_RECEIVING_CAPACITY_FRACTION = 1.1;

/** Sarajevo area muns — receiving capacity lower due to siege. */
export const SARAJEVO_AREA_MUN_IDS = new Set<MunicipalityId>([
    'centar_sarajevo',
    'novi_grad_sarajevo',
    'novo_sarajevo',
    'stari_grad_sarajevo',
    'ilidza',
    'hadzici',
    'vogosca',
    'ilijas',
    'trnovo'
]);

/** Posavina municipalities — high flee-abroad for Croats (70%). */
export const POSAVINA_MUN_IDS = new Set<MunicipalityId>([
    'brcko',
    'bosanski_samac',
    'odzak',
    'orasje',
    'gradacac',
    'derventa',
    'modrica',
    'bosanski_brod',
    'bosanska_gradiska',
    'doboj',
    'bijeljina'
]);

/** Receiving capacity fraction for a municipality. Sarajevo area gets lower cap due to siege. */
export function getReceivingCapacityFraction(munId: MunicipalityId): number {
    return SARAJEVO_AREA_MUN_IDS.has(munId) ? SARAJEVO_SIEGE_RECEIVING_CAPACITY_FRACTION : DISPLACEMENT_RECEIVING_CAPACITY_FRACTION;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-region routing tables
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Displaced Bosniak (RBiH-aligned) routes by origin region.
 * abroad_fraction: 0.00 for all Bosniak routes (no external state to flee to).
 */
const BOSNIAK_ROUTES: Record<string, readonly MunicipalityId[]> = {
    // Krajina: Prijedor/Sanski Most can't reach Travnik directly (RS blocks road).
    // Primary escape was organized convoys to Croatia (handled by flee-abroad).
    // Internal: Bihać pocket (via Bosanska Krupa) or Travnik (if Vlašić corridor open).
    KRAJINA_PRIJEDOR:   ['bihac', 'bosanska_krupa', 'cazin', 'travnik', 'zenica'],
    KRAJINA_SANSKI:     ['bihac', 'bosanska_krupa', 'travnik', 'zenica'],
    KRAJINA_KLJUC:      ['donji_vakuf', 'travnik', 'bugojno', 'zenica'],  // Ključ→Donji Vakuf road (M-5)
    KRAJINA_BOS_NOVI:   ['bosanska_krupa', 'bihac', 'cazin'],  // on Croatian border — most flee abroad
    KRAJINA_BANJALUKA:  ['travnik', 'zenica', 'visoko'],  // convoys via Vlašić corridor; Tešanj/Tuzla unreachable
    KRAJINA_WEST:       ['bihac', 'cazin', 'velika_kladusa'],
    KRAJINA_POSAVINA:   ['doboj', 'tesanj', 'tuzla', 'zenica'],
    KRAJINA_KOTOR:      ['travnik', 'tesanj', 'zenica', 'tuzla'],
    KRAJINA_MOUNTAIN:   ['donji_vakuf', 'travnik', 'bugojno', 'zenica'],  // Jajce removed (falls w26)
    POSAVINA_BIJELJINA: ['kalesija', 'zivinice', 'tuzla', 'srebrenik'],
    POSAVINA_BRCKO:     ['gradacac', 'srebrenik', 'tuzla'],
    POSAVINA_SAMAC:     ['gradacac', 'gracanica', 'tuzla'],
    POSAVINA_DOBOJ:     ['tesanj', 'maglaj', 'zenica', 'tuzla'],
    POSAVINA_DERVENTA:  ['tesanj', 'doboj', 'tuzla', 'zenica'],
    POSAVINA_BROD:      ['tesanj', 'doboj', 'zenica'],
    // Drina: SPLIT — Zvornik displaced go west to Tuzla (not south to Srebrenica).
    // Bratunac/Vlasenica displaced go INTO Srebrenica enclave (forming it).
    DRINA_ZVORNIK:      ['kalesija', 'tuzla', 'zivinice', 'kladanj'],  // west via Sapna/Kalesija
    DRINA_ENCLAVE:      ['srebrenica', 'kladanj', 'tuzla'],  // Bratunac/Vlasenica → Srebrenica enclave
    DRINA_SOUTH:        ['gorazde', 'centar_sarajevo', 'zenica'],
    DRINA_SEKOVICI:     ['kladanj', 'olovo', 'tuzla'],
    SARAJEVO_RS_HELD:   ['centar_sarajevo', 'visoko', 'zenica'],
    CENTRAL_BOSNIA:     ['travnik', 'zenica', 'kakanj', 'visoko'],
    HERZEGOVINA:        ['jablanica', 'konjic', 'zenica', 'travnik'],
    HERCEG_EAST:        ['gorazde', 'centar_sarajevo'],
    BIHAC_EDGE:         ['bihac', 'cazin', 'velika_kladusa'],
};

/** Bosniak municipality → routing region. */
const BOSNIAK_ROUTING_REGION: Record<string, string> = {
    // Region 1: Krajina — per-municipality routing (road network varies widely)
    prijedor: 'KRAJINA_PRIJEDOR', sanski_most: 'KRAJINA_SANSKI', kljuc: 'KRAJINA_KLJUC', bosanski_novi: 'KRAJINA_BOS_NOVI',
    banja_luka: 'KRAJINA_BANJALUKA', celinac: 'KRAJINA_BANJALUKA', laktasi: 'KRAJINA_BANJALUKA', prnjavor: 'KRAJINA_BANJALUKA',
    bosanski_petrovac: 'KRAJINA_WEST', titov_drvar: 'KRAJINA_WEST', bosansko_grahovo: 'KRAJINA_WEST', glamoc: 'KRAJINA_WEST',
    bosanska_dubica: 'KRAJINA_POSAVINA', bosanska_kostajnica: 'KRAJINA_POSAVINA', bosanska_gradiska: 'KRAJINA_POSAVINA', srbac: 'KRAJINA_POSAVINA',
    kotor_varos: 'KRAJINA_KOTOR', skender_vakuf: 'KRAJINA_KOTOR',
    mrkonjic_grad: 'KRAJINA_MOUNTAIN', sipovo: 'KRAJINA_MOUNTAIN',
    // Region 2: Posavina / Northeast
    bijeljina: 'POSAVINA_BIJELJINA', lopare: 'POSAVINA_BIJELJINA', ugljevik: 'POSAVINA_BIJELJINA',
    brcko: 'POSAVINA_BRCKO',
    bosanski_samac: 'POSAVINA_SAMAC', odzak: 'POSAVINA_SAMAC',
    doboj: 'POSAVINA_DOBOJ',
    derventa: 'POSAVINA_DERVENTA', modrica: 'POSAVINA_DERVENTA',
    bosanski_brod: 'POSAVINA_BROD',
    // Region 6: Drina Valley — SPLIT: Zvornik goes west to Tuzla; Bratunac/Vlasenica go to Srebrenica
    zvornik: 'DRINA_ZVORNIK',
    bratunac: 'DRINA_ENCLAVE', vlasenica: 'DRINA_ENCLAVE', srebrenica: 'DRINA_ENCLAVE',
    visegrad: 'DRINA_SOUTH', rogatica: 'DRINA_SOUTH', foca: 'DRINA_SOUTH', gorazde: 'DRINA_SOUTH',
    cajnice: 'DRINA_SOUTH', rudo: 'DRINA_SOUTH', kalinovik: 'DRINA_SOUTH',
    sekovici: 'DRINA_SEKOVICI', han_pijesak: 'DRINA_SEKOVICI',
    // Region 5: Sarajevo (RS-held suburbs)
    ilidza: 'SARAJEVO_RS_HELD', ilijas: 'SARAJEVO_RS_HELD', vogosca: 'SARAJEVO_RS_HELD',
    pale: 'SARAJEVO_RS_HELD', trnovo: 'SARAJEVO_RS_HELD', hadzici: 'SARAJEVO_RS_HELD',
    // Region 4: Central Bosnia
    bugojno: 'CENTRAL_BOSNIA', gornji_vakuf: 'CENTRAL_BOSNIA', donji_vakuf: 'CENTRAL_BOSNIA',
    novi_travnik: 'CENTRAL_BOSNIA', vitez: 'CENTRAL_BOSNIA', busovaca: 'CENTRAL_BOSNIA',
    kiseljak: 'CENTRAL_BOSNIA', fojnica: 'CENTRAL_BOSNIA', kresevo: 'CENTRAL_BOSNIA',
    jajce: 'CENTRAL_BOSNIA', kupres: 'CENTRAL_BOSNIA', prozor: 'CENTRAL_BOSNIA',
    // Region 7: Herzegovina
    mostar: 'HERZEGOVINA', capljina: 'HERZEGOVINA', stolac: 'HERZEGOVINA',
    jablanica: 'HERZEGOVINA', konjic: 'HERZEGOVINA',
    trebinje: 'HERCEG_EAST', bileca: 'HERCEG_EAST', nevesinje: 'HERCEG_EAST',
    ljubinje: 'HERCEG_EAST', gacko: 'HERCEG_EAST',
    // Region 8: Bihać pocket
    bosanska_krupa: 'BIHAC_EDGE', bihac: 'BIHAC_EDGE', cazin: 'BIHAC_EDGE', velika_kladusa: 'BIHAC_EDGE',
    // Region 3: Tuzla Basin / Central Corridor (RBiH-controlled — Bosniaks NOT typically displaced)
    // If RS overruns corridor, route internally:
    tuzla: 'POSAVINA_DOBOJ', zenica: 'CENTRAL_BOSNIA', tesanj: 'POSAVINA_DOBOJ', maglaj: 'POSAVINA_DOBOJ',
    zavidovici: 'POSAVINA_DOBOJ', kakanj: 'CENTRAL_BOSNIA', visoko: 'CENTRAL_BOSNIA',
    lukavac: 'POSAVINA_BIJELJINA', gracanica: 'POSAVINA_BIJELJINA', banovici: 'POSAVINA_BIJELJINA',
    kalesija: 'POSAVINA_BIJELJINA', srebrenik: 'POSAVINA_BRCKO', zivinice: 'POSAVINA_BIJELJINA',
    kladanj: 'DRINA_SEKOVICI', olovo: 'DRINA_SEKOVICI', breza: 'CENTRAL_BOSNIA', vares: 'CENTRAL_BOSNIA',
    travnik: 'CENTRAL_BOSNIA',
};

/**
 * Displaced Croat (HRHB-aligned) routes by origin region.
 * abroad_fraction: 0.25 general, 0.70 Posavina (handled by existing getFleeAbroadFraction).
 */
const CROAT_ROUTES: Record<string, readonly MunicipalityId[]> = {
    KRAJINA_ALL:            ['livno', 'kupres', 'mostar', 'capljina'],
    KOTOR_VAROS:            ['travnik', 'vitez', 'kiseljak', 'mostar'],
    POSAVINA_ORASJE:        ['orasje'],
    POSAVINA_SAMAC_ODZAK:   ['orasje', 'gradacac'],  // eastern Posavina → Orašje pocket
    POSAVINA_BROD_DERVENTA: ['zepce', 'travnik', 'vitez', 'zenica'],  // western Posavina → south via Žepče
    POSAVINA_MODRICA:       ['gradacac', 'orasje', 'tuzla'],
    DOBOJ_AREA:             ['tesanj', 'zepce', 'travnik'],
    CENTRAL_BOSNIA_LASVA:   ['kiseljak', 'kresevo', 'mostar', 'livno'],
    CENTRAL_BOSNIA_JAJCE:   ['travnik', 'vitez', 'livno', 'mostar'],  // south through Lašva valley
    CENTRAL_BOSNIA_KUPRES:  ['livno', 'duvno', 'mostar'],
    CENTRAL_BOSNIA_PROZOR:  ['mostar', 'jablanica'],
    KAKANJ_BREZA:           ['kiseljak', 'fojnica', 'travnik', 'vitez'],
    ZENICA_TRAVNIK:         ['novi_travnik', 'vitez', 'busovaca', 'kiseljak'],
    TESANJ_MAGLAJ:          ['zepce', 'travnik'],
    VARES:                  ['kiseljak', 'fojnica', 'busovaca'],
    SARAJEVO:               ['kiseljak', 'fojnica', 'travnik', 'mostar'],
    BUGOJNO_GORNJI_VAKUF:   ['gornji_vakuf', 'prozor', 'livno', 'mostar'],
};

/** Croat municipality → routing region. */
const CROAT_ROUTING_REGION: Record<string, string> = {
    // Region 1: Krajina
    prijedor: 'KRAJINA_ALL', sanski_most: 'KRAJINA_ALL', kljuc: 'KRAJINA_ALL', bosanski_novi: 'KRAJINA_ALL',
    banja_luka: 'KRAJINA_ALL', celinac: 'KRAJINA_ALL', laktasi: 'KRAJINA_ALL', prnjavor: 'KRAJINA_ALL',
    bosanski_petrovac: 'KRAJINA_ALL', titov_drvar: 'KRAJINA_ALL', bosansko_grahovo: 'KRAJINA_ALL', glamoc: 'KRAJINA_ALL',
    bosanska_dubica: 'KRAJINA_ALL', bosanska_kostajnica: 'KRAJINA_ALL', bosanska_gradiska: 'KRAJINA_ALL', srbac: 'KRAJINA_ALL',
    mrkonjic_grad: 'KRAJINA_ALL', sipovo: 'KRAJINA_ALL',
    kotor_varos: 'KOTOR_VAROS', skender_vakuf: 'KOTOR_VAROS',
    // Region 2: Posavina
    orasje: 'POSAVINA_ORASJE',
    bosanski_samac: 'POSAVINA_SAMAC_ODZAK', odzak: 'POSAVINA_SAMAC_ODZAK',
    bosanski_brod: 'POSAVINA_BROD_DERVENTA', derventa: 'POSAVINA_BROD_DERVENTA',
    modrica: 'POSAVINA_MODRICA', brcko: 'POSAVINA_SAMAC_ODZAK',
    bijeljina: 'POSAVINA_SAMAC_ODZAK', lopare: 'POSAVINA_SAMAC_ODZAK', ugljevik: 'POSAVINA_SAMAC_ODZAK',
    doboj: 'DOBOJ_AREA', gradacac: 'POSAVINA_REST',
    // Region 3: Tuzla Basin / Central Corridor
    kakanj: 'KAKANJ_BREZA', breza: 'KAKANJ_BREZA',
    travnik: 'ZENICA_TRAVNIK', zenica: 'ZENICA_TRAVNIK',
    tesanj: 'TESANJ_MAGLAJ', maglaj: 'TESANJ_MAGLAJ', zavidovici: 'TESANJ_MAGLAJ',
    vares: 'VARES',
    // Region 4: Central Bosnia
    novi_travnik: 'CENTRAL_BOSNIA_LASVA', vitez: 'CENTRAL_BOSNIA_LASVA', busovaca: 'CENTRAL_BOSNIA_LASVA',
    kiseljak: 'CENTRAL_BOSNIA_LASVA', fojnica: 'CENTRAL_BOSNIA_LASVA', kresevo: 'CENTRAL_BOSNIA_LASVA',
    jajce: 'CENTRAL_BOSNIA_JAJCE', donji_vakuf: 'CENTRAL_BOSNIA_JAJCE',
    kupres: 'CENTRAL_BOSNIA_KUPRES',
    prozor: 'CENTRAL_BOSNIA_PROZOR',
    bugojno: 'BUGOJNO_GORNJI_VAKUF', gornji_vakuf: 'BUGOJNO_GORNJI_VAKUF',
    // Region 5: Sarajevo
    centar_sarajevo: 'SARAJEVO', stari_grad_sarajevo: 'SARAJEVO', novo_sarajevo: 'SARAJEVO',
    novi_grad_sarajevo: 'SARAJEVO', ilidza: 'SARAJEVO', hadzici: 'SARAJEVO',
    vogosca: 'SARAJEVO', ilijas: 'SARAJEVO', trnovo: 'SARAJEVO', pale: 'SARAJEVO',
};

/**
 * Displaced Serb (RS-aligned) routes by origin region.
 * abroad_fraction: 0.30 for all Serb routes (Serbia to flee to).
 */
const SERB_ROUTES: Record<string, readonly MunicipalityId[]> = {
    // Eastern Bosnia / Tuzla region — stay in east, don't cross corridor
    TUZLA_AREA:     ['bijeljina', 'lopare', 'ugljevik', 'zvornik'],
    EAST_CORRIDOR:  ['vlasenica', 'han_pijesak', 'milici', 'bijeljina'],
    // Maglaj/Tešanj — nearest RS is Doboj (just north), then Teslić
    MAGLAJ_TESANJ:  ['doboj', 'teslic', 'modrica'],
    // Zenica/Kakanj — flee east to Sarajevo RS suburbs, then Drina
    ZENICA_KAKANJ:  ['ilijas', 'pale', 'sokolac', 'han_pijesak'],
    // Travnik — Vlašić plateau Serbs go to Krajina (geographically west)
    TRAVNIK:        ['skender_vakuf', 'mrkonjic_grad', 'jajce', 'banja_luka'],
    // Vareš — flee east through Serb-held territory
    VARES:          ['ilijas', 'sokolac', 'pale', 'han_pijesak'],
    // Sarajevo suburbs — Pale/Sokolac (eastern RS core)
    SARAJEVO:       ['pale', 'sokolac', 'han_pijesak', 'rogatica'],
    // Herzegovina — stay in Herzegovina RS territory
    MOSTAR:         ['nevesinje', 'gacko', 'trebinje', 'bileca'],
    LIVNO:          ['glamoc', 'bosansko_grahovo', 'mrkonjic_grad'],
    KONJIC:         ['kalinovik', 'foca', 'nevesinje', 'pale'],
    // Bihać pocket — flee to Krajina (geographically correct)
    BIHAC_POCKET:   ['bosanski_petrovac', 'kljuc', 'prijedor', 'banja_luka'],
    // Central Bosnia (Jajce, Bugojno) — flee to Krajina
    CENTRAL_BOSNIA: ['mrkonjic_grad', 'sipovo', 'banja_luka'],
};

/** Serb municipality → routing region. */
const SERB_ROUTING_REGION: Record<string, string> = {
    // Region 3: Tuzla Basin
    tuzla: 'TUZLA_AREA', lukavac: 'TUZLA_AREA', gracanica: 'TUZLA_AREA', banovici: 'TUZLA_AREA', zivinice: 'TUZLA_AREA',
    kalesija: 'EAST_CORRIDOR', kladanj: 'EAST_CORRIDOR', olovo: 'EAST_CORRIDOR',
    srebrenik: 'TUZLA_AREA', gradacac: 'TUZLA_AREA',
    tesanj: 'MAGLAJ_TESANJ', maglaj: 'MAGLAJ_TESANJ', zavidovici: 'MAGLAJ_TESANJ',
    zenica: 'ZENICA_KAKANJ', kakanj: 'ZENICA_KAKANJ', breza: 'ZENICA_KAKANJ', visoko: 'ZENICA_KAKANJ',
    travnik: 'TRAVNIK',
    vares: 'VARES',
    // Region 4: Central Bosnia
    jajce: 'CENTRAL_BOSNIA', donji_vakuf: 'CENTRAL_BOSNIA',
    bugojno: 'CENTRAL_BOSNIA', gornji_vakuf: 'CENTRAL_BOSNIA',
    kupres: 'CENTRAL_BOSNIA',
    // Region 5: Sarajevo
    centar_sarajevo: 'SARAJEVO', stari_grad_sarajevo: 'SARAJEVO', novo_sarajevo: 'SARAJEVO',
    novi_grad_sarajevo: 'SARAJEVO', ilidza: 'SARAJEVO', hadzici: 'SARAJEVO',
    vogosca: 'SARAJEVO', ilijas: 'SARAJEVO', trnovo: 'SARAJEVO', pale: 'SARAJEVO',
    // Region 7: Herzegovina
    mostar: 'MOSTAR', capljina: 'MOSTAR', stolac: 'MOSTAR',
    livno: 'LIVNO', duvno: 'LIVNO',
    konjic: 'KONJIC', jablanica: 'KONJIC',
    // Region 8: Bihać pocket
    bihac: 'BIHAC_POCKET', cazin: 'BIHAC_POCKET', velika_kladusa: 'BIHAC_POCKET', bosanska_krupa: 'BIHAC_POCKET',
};

// ═══════════════════════════════════════════════════════════════════════════
// Lookup function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get displacement route for a given origin municipality and displaced ethnicity.
 * Returns the ordered list of destination municipalities, or empty array if no specific route.
 * Caller is responsible for validating destinations are friendly-controlled at runtime.
 */
export function getDisplacementRouteForMun(
    originMun: MunicipalityId,
    ethnicity: FactionId
): readonly MunicipalityId[] {
    let regionMap: Record<string, string>;
    let routes: Record<string, readonly MunicipalityId[]>;

    switch (ethnicity) {
        case 'RBiH':
            regionMap = BOSNIAK_ROUTING_REGION;
            routes = BOSNIAK_ROUTES;
            break;
        case 'HRHB':
            regionMap = CROAT_ROUTING_REGION;
            routes = CROAT_ROUTES;
            break;
        case 'RS':
            regionMap = SERB_ROUTING_REGION;
            routes = SERB_ROUTES;
            break;
        default:
            return [];
    }

    const region = regionMap[originMun];
    if (!region) return [];
    return routes[region] ?? [];
}
