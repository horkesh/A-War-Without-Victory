import { describe, it, expect } from 'vitest';
import {
    initializeStrategicDimensions,
    applyDimensionShift,
    getDimensionEffective,
    updateBaseValue,
    DIMENSION_IDS,
    DIMENSION_WEIGHTS,
    computeNegotiatingCapital,
    computeDimensionBaseValues,
} from '../src/sim/events/strategic_dimensions.js';
import { serializeRuntimeGameState } from '../src/state/serializeGameState.js';

describe('strategic dimensions', () => {
    it('initializes all 6 dimensions for all 3 factions at 50/0/50', () => {
        const dims = initializeStrategicDimensions();
        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            for (const dim of DIMENSION_IDS) {
                expect(dims[faction][dim].base_value).toBe(50);
                expect(dims[faction][dim].event_modifier).toBe(0);
                expect(dims[faction][dim].effective_value).toBe(50);
            }
        }
    });

    it('applies positive shift correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'military_credibility', 15);
        expect(dims['RS']['military_credibility'].event_modifier).toBe(15);
        expect(dims['RS']['military_credibility'].effective_value).toBe(65);
    });

    it('applies negative shift correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -20);
        expect(dims['RS']['international_standing'].event_modifier).toBe(-20);
        expect(dims['RS']['international_standing'].effective_value).toBe(30);
    });

    it('clamps effective_value to 0-100', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -80);
        expect(dims['RS']['international_standing'].effective_value).toBe(0);
        applyDimensionShift(dims, 'RBiH', 'international_standing', 80);
        expect(dims['RBiH']['international_standing'].effective_value).toBe(100);
    });

    it('accumulates multiple shifts', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -10);
        applyDimensionShift(dims, 'RS', 'international_standing', -5);
        expect(dims['RS']['international_standing'].event_modifier).toBe(-15);
        expect(dims['RS']['international_standing'].effective_value).toBe(35);
    });

    it('getDimensionEffective reads correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'HRHB', 'patron_confidence', 10);
        expect(getDimensionEffective(dims, 'HRHB', 'patron_confidence')).toBe(60);
    });

    it('getDimensionEffective returns 50 for unknown faction', () => {
        const dims = initializeStrategicDimensions();
        expect(getDimensionEffective(dims, 'UNKNOWN', 'military_credibility')).toBe(50);
    });

    it('updateBaseValue recalculates effective', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'military_credibility', 10);
        updateBaseValue(dims, 'RS', 'military_credibility', 70);
        expect(dims['RS']['military_credibility'].base_value).toBe(70);
        expect(dims['RS']['military_credibility'].effective_value).toBe(80);
    });

    it('updateBaseValue clamps', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'military_credibility', 30);
        updateBaseValue(dims, 'RS', 'military_credibility', 90);
        expect(dims['RS']['military_credibility'].effective_value).toBe(100);
    });

    it('applyDimensionShift ignores unknown faction', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'UNKNOWN', 'military_credibility', 10);
        expect(dims['UNKNOWN']).toBeUndefined();
    });
});

describe('computeNegotiatingCapital', () => {
    it('returns weighted sum of effective values', () => {
        const store = initializeStrategicDimensions();
        // All dimensions at 50 → composite = 50 (weights sum to 1.0)
        expect(computeNegotiatingCapital(store, 'RS')).toBeCloseTo(50, 1);
    });

    it('weights military_credibility higher for RS than RBiH', () => {
        expect(DIMENSION_WEIGHTS.RS.military_credibility).toBeGreaterThan(DIMENSION_WEIGHTS.RBiH.military_credibility);
    });

    it('weights international_standing higher for RBiH than RS', () => {
        expect(DIMENSION_WEIGHTS.RBiH.international_standing).toBeGreaterThan(DIMENSION_WEIGHTS.RS.international_standing);
    });

    it('faction weights sum to 1.0', () => {
        for (const faction of ['RS', 'RBiH', 'HRHB']) {
            const sum = Object.values(DIMENSION_WEIGHTS[faction]).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 5);
        }
    });

    it('returns 50 for unknown faction', () => {
        const store = initializeStrategicDimensions();
        expect(computeNegotiatingCapital(store, 'UNKNOWN')).toBe(50);
    });

    it('reflects dimension shifts in composite', () => {
        const store = initializeStrategicDimensions();
        applyDimensionShift(store, 'RS', 'military_credibility', 20);
        // RS mil_cred weight = 0.25, shift = +20 → composite = 50 + 20*0.25 = 55
        expect(computeNegotiatingCapital(store, 'RS')).toBeCloseTo(55, 1);
    });
});

describe('computeDimensionBaseValues', () => {
    it('computes territorial_legitimacy from territory percentage', () => {
        const store = initializeStrategicDimensions();
        const mockState = {
            military: { negotiation: { capital: { RS: { territory_controlled_pct: 49 } } }, formations: {} },
            political: {},
        };
        computeDimensionBaseValues(store, mockState, 'RS');
        expect(store.RS.territorial_legitimacy.base_value).toBeCloseTo(58.8, 0);
    });

    it('negotiating_leverage derives from mil+terr+patron', () => {
        const store = initializeStrategicDimensions();
        // Set known base values that won't be overwritten by computeDimensionBaseValues
        updateBaseValue(store, 'RS', 'military_credibility', 60);
        updateBaseValue(store, 'RS', 'territorial_legitimacy', 80);
        updateBaseValue(store, 'RS', 'patron_confidence', 40);
        // Provide state that won't change the first 5 dimensions (empty caps)
        const mockState = {
            military: { negotiation: { capital: { RS: { territory_controlled_pct: 80 / 1.2 } }, patron_relationships: { RS: { support_level: 40 } } }, formations: {} },
            political: {},
        };
        computeDimensionBaseValues(store, mockState, 'RS');
        // leverage = (mil_eff + terr_eff + pat_eff) / 3
        // After recomputation, terr = 80/1.2*1.2=80, patron=40, mil depends on ops/cas
        // mil has no ops data → opsRate=0.5 → 0.5*50 + min(1,3)*8.33 = 25+8.33 = 33.3
        // leverage = (33.3 + 80 + 40) / 3 ≈ 51.1
        expect(store.RS.negotiating_leverage.base_value).toBeGreaterThan(40);
        expect(store.RS.negotiating_leverage.base_value).toBeLessThan(60);
    });

    it('ignores unknown faction', () => {
        const store = initializeStrategicDimensions();
        computeDimensionBaseValues(store, {} as any, 'UNKNOWN');
        // No crash, no change
        expect(store.RS.military_credibility.base_value).toBe(50);
    });
});

// Regression: internal_cohesion averaged over Object.values(formations) depended on
// object insertion order, so a runtime-serialized (key-sorted) state produced a
// different floating-point sum than the in-memory state retained in the same run.
describe('computeDimensionBaseValues formation iteration order', () => {
    type FixtureFormation = { faction: string; kind: string; status: string; cohesion: number };

    // Retained input3->4 formation set; cohesion values are verbatim witness data.
    const FORMATIONS = JSON.parse(`
{
"F_HRHB_0001":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":61.65},
"F_HRHB_0002":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":50.14999999999999},
"F_RS_0001":{"faction":"RS","kind":"brigade","status":"active","cohesion":68.14999999999999},
"F_RS_0002":{"faction":"RS","kind":"brigade","status":"active","cohesion":68.14999999999999},
"hrhb_101st_oraje_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":50.349999999999994},
"hrhb_102nd_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40},
"hrhb_103rd_derventa_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40},
"hrhb_104th_bosanski_brod_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40},
"hrhb_105th_modrica_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40},
"hrhb_106th_bosanska_posavina_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":52.25},
"hrhb_111th_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":47.349999999999994},
"hrhb_1st_brigade_mostar":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":62.349999999999994},
"hrhb_1st_herzegovina_brigade_knez_domagoj":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":58.349999999999994},
"hrhb_2nd_brigade_mostar":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":64.19999999999999},
"hrhb_6th_brigade_ranko_boban":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":61.65},
"hrhb_94th_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40.19999999999999},
"hrhb_95th_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40.19999999999999},
"hrhb_ban_jelai_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40},
"hrhb_herceg_stjepan_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":47.19999999999999},
"hrhb_itluk_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":61.25},
"hrhb_jure_franceti_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40.19999999999999},
"hrhb_kiseljak_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40.19999999999999},
"hrhb_kralj_petar_kreimir_iv_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":56.349999999999994},
"hrhb_kreevo_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40.19999999999999},
"hrhb_ljubuki_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":62.25},
"hrhb_mario_hrka_ikota_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":62.19999999999999},
"hrhb_mostar_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":62.349999999999994},
"hrhb_stjepan_tomaevi_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40.19999999999999},
"hrhb_stolac_units":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":60.349999999999994},
"hrhb_travnik_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":55.19999999999999},
"hrhb_vitezovi_brigade_vitez":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":40.19999999999999},
"hvo_hrvoje_vukcic_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":43.099999999999994},
"hvo_nikola_subic_zrinski_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":48.099999999999994},
"hvo_posusje_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":50.19999999999999},
"hvo_rama_brigade":{"faction":"HRHB","kind":"brigade","status":"active","cohesion":49.25},
"rs_11th_dubica_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.349999999999994},
"rs_11th_krupa_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":56.75},
"rs_11th_mrkonji_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":62.64999999999999},
"rs_12th_kotorsko_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_15th_biha_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":58.349999999999994},
"rs_16th_krajina_motorized":{"faction":"RS","kind":"brigade","status":"active","cohesion":68.64999999999999},
"rs_17th_klju_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_19th_krajina_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_armored":{"faction":"RS","kind":"brigade","status":"active","cohesion":58.24999999999999},
"rs_1st_banja_luka_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":65.14999999999999},
"rs_1st_bijeljina_light_infantry_panthers":{"faction":"RS","kind":"brigade","status":"active","cohesion":54.3},
"rs_1st_birac":{"faction":"RS","kind":"brigade","status":"active","cohesion":57.349999999999994},
"rs_1st_bratunac":{"faction":"RS","kind":"brigade","status":"active","cohesion":63.6},
"rs_1st_celinac_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_doboj_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_drvar_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":59.25},
"rs_1st_gradika_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":65.14999999999999},
"rs_1st_guards_motorized":{"faction":"RS","kind":"brigade","status":"active","cohesion":68.19999999999999},
"rs_1st_kotor_varo_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_krnjin_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_majevica_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":58.849999999999994},
"rs_1st_milii":{"faction":"RS","kind":"brigade","status":"active","cohesion":59.75},
"rs_1st_novigrad_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":56.849999999999994},
"rs_1st_ozren_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":59.25},
"rs_1st_podrinje":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_posavina_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":51.75},
"rs_1st_prnjavor_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_romanija_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":66.14999999999999},
"rs_1st_sarajevo_mechanized":{"faction":"RS","kind":"brigade","status":"active","cohesion":65.64999999999999},
"rs_1st_semberija_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":57.849999999999994},
"rs_1st_sipovo_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":63.64999999999999},
"rs_1st_srbac_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":65.14999999999999},
"rs_1st_tesli_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_trebava_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_vlasenica":{"faction":"RS","kind":"brigade","status":"active","cohesion":59.75},
"rs_1st_vujak_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_1st_zvornik":{"faction":"RS","kind":"brigade","status":"active","cohesion":52.65},
"rs_22nd_krajina_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":65.14999999999999},
"rs_27th_derventa_motorized":{"faction":"RS","kind":"brigade","status":"active","cohesion":70.14999999999999},
"rs_2nd_armored":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_2nd_banja_luka_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":62.64999999999999},
"rs_2nd_krajina_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":65.14999999999999},
"rs_2nd_majevica_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":57.849999999999994},
"rs_2nd_ozren_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_2nd_posavina_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":58.15},
"rs_2nd_sarajevo_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":69.64999999999999},
"rs_2nd_semberija_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":57.3},
"rs_2nd_tesli_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_31st_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":65.14999999999999},
"rs_3rd_banja_luka_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":62.249999999999986},
"rs_3rd_majevica_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":59.349999999999994},
"rs_3rd_ozren_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_3rd_petrovac_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":58.349999999999994},
"rs_3rd_posavina_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":46.349999999999994},
"rs_3rd_sarajevo_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":69.14999999999999},
"rs_3rd_semberija_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":59.349999999999994},
"rs_43rd_prijedor_motorized":{"faction":"RS","kind":"brigade","status":"active","cohesion":64.05},
"rs_4th_banja_luka_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_4th_ozren_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_4th_sarajevo_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":60.15},
"rs_5th_glamo_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_5th_kozara_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":62.599999999999994},
"rs_5th_podrinje":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_65th_protection_motorized_regiment":{"faction":"RS","kind":"brigade","status":"active","cohesion":68.19999999999999},
"rs_6th_sanske_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":56.05},
"rs_7th_krajina_motorized":{"faction":"RS","kind":"brigade","status":"active","cohesion":66.14999999999999},
"rs_9th_grahovo_light_infantry":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.349999999999994},
"rs_ajnie_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":56.8},
"rs_bilea_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.65},
"rs_foa_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":55.349999999999994},
"rs_gacko_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_ilidza_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":50},
"rs_kalinovik_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_nevesinje_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_skelani_battalion":{"faction":"RS","kind":"brigade","status":"active","cohesion":35},
"rs_trebinje_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":61.15},
"rs_visegrad_brigade":{"faction":"RS","kind":"brigade","status":"active","cohesion":44.75},
"vrs_1st_laktasi":{"faction":"RS","kind":"brigade","status":"active","cohesion":65.14999999999999}
}
`) as Record<string, FixtureFormation>;

    const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

    function makeState(formations: Record<string, FixtureFormation>): any {
        return {
            schema_version: 14,
            meta: { turn: 3, player_faction: 'RBiH' },
            military: {
                negotiation: {
                    capital: {
                        HRHB: { territory_controlled_pct: 40 },
                        RS: { territory_controlled_pct: 60 },
                    },
                },
                formations,
            },
            political: {
                political_controllers: {},
                war_alliance_rbih_hrhb: 1,
                war_exhaustion: { HRHB: 0, RS: 0 },
            },
        };
    }

    // Independent oracle: unchanged formula evaluated over the sorted fixture values.
    function expectedInternalCohesion(faction: 'HRHB' | 'RS'): number {
        const ids = Object.keys(FORMATIONS)
            .sort(byCodeUnit)
            .filter((id) => {
                const f = FORMATIONS[id];
                return f.faction === faction && f.kind === 'brigade' && f.status === 'active';
            });
        const sum = ids.reduce((s, id) => s + FORMATIONS[id].cohesion, 0);
        const avgCohesion = ids.length > 0 ? sum / ids.length : 50;
        const allianceVal = faction === 'HRHB' ? 1 * 40 : 20;
        return Math.min(100, Math.max(0, allianceVal + (avgCohesion / 2) - (0 / 300)));
    }

    it('is exact across canonical, reversed and runtime-serialized key order', () => {
        const canonicalState = makeState(FORMATIONS);
        const reversedFormations = Object.fromEntries(
            Object.keys(FORMATIONS).reverse().map((id) => [id, FORMATIONS[id]]),
        );
        const reversedState = makeState(reversedFormations);
        const parsedState = JSON.parse(serializeRuntimeGameState(canonicalState));

        // The runtime serializer projection itself must not depend on insertion order.
        expect(serializeRuntimeGameState(reversedState)).toBe(serializeRuntimeGameState(canonicalState));

        const variants = [
            { name: 'canonical insertion', state: canonicalState },
            { name: 'reversed insertion', state: reversedState },
            { name: 'runtime-serialized', state: parsedState },
        ];

        for (const variant of variants) {
            const store = initializeStrategicDimensions();
            computeDimensionBaseValues(store, variant.state, 'HRHB');
            computeDimensionBaseValues(store, variant.state, 'RS');
            expect(store.HRHB.internal_cohesion.base_value, `${variant.name} HRHB`).toBe(expectedInternalCohesion('HRHB'));
            expect(store.HRHB.internal_cohesion.effective_value, `${variant.name} HRHB effective`).toBe(expectedInternalCohesion('HRHB'));
            expect(store.RS.internal_cohesion.base_value, `${variant.name} RS`).toBe(expectedInternalCohesion('RS'));
            expect(store.RS.internal_cohesion.effective_value, `${variant.name} RS effective`).toBe(expectedInternalCohesion('RS'));
        }
    });
});
