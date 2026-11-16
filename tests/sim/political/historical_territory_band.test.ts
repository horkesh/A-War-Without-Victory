/**
 * B5 fix 4: the historical-territory gate and the divergence rule.
 *
 * Left alone, the war's map stays inside history's band, so an emergent bot keeps the
 * authored historical response. Once the map leaves the band by more than 3 pp, a bot may
 * take an option that beats history by more than its faction's divergence_threshold.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import {
    HISTORICAL_TERRITORY_CHECKPOINTS,
    DIVERGENCE_GATE_MARGIN_PP,
    historicalShareBand,
    historicalBandOvershootPp,
    isWarOutsideHistoricalBand,
} from '../../../src/sim/political/historical_territory_band.js';
import {
    divergesFromHistory,
    pickPoliticalResponseWithHistory,
} from '../../../src/sim/political/political_event_decision.js';
import { computePoliticalPeacePlanResponse } from '../../../src/sim/political/political_peace_plan.js';
import {
    getPoliticalPersonality,
    type PoliticalAssessment,
} from '../../../src/sim/political/political_personality.js';
import type { EventResponseOption } from '../../../src/sim/events/event_types.js';
import type { FactionId, GameState } from '../../../src/state/game_state.js';
import type { PeacePlanDefinition } from '../../../src/state/negotiation_types.js';

const ROOT = resolve(__dirname, '../../..');
const FACTIONS: FactionId[] = ['RS', 'RBiH', 'HRHB'];

describe('historical territory checkpoints', () => {
    it('match the painted references scored against osid_areas.json (to 0.001 pp)', () => {
        const areasJson = JSON.parse(readFileSync(resolve(ROOT, 'data/derived/operational/osid_areas.json'), 'utf8'));
        const areas: Record<string, number> = areasJson.areas;
        const total: number = areasJson.total_area_km2;
        for (const cp of HISTORICAL_TERRITORY_CHECKPOINTS) {
            if (cp.id === 'start') continue;
            const painted = JSON.parse(readFileSync(resolve(ROOT, `data/source/calibration/painted_control_${cp.id}.json`), 'utf8'));
            const km2: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
            for (const [osid, faction] of Object.entries(painted.by_settlement_id as Record<string, string>)) {
                if (faction in km2) km2[faction] += areas[osid] ?? 0;
            }
            for (const f of FACTIONS) {
                expect(Math.abs((km2[f] / total) * 100 - cp.share[f]), `${cp.id} ${f}`).toBeLessThan(0.001);
            }
        }
    });

    it('are ordered by turn and each sums to ~100', () => {
        let prev = -1;
        for (const cp of HISTORICAL_TERRITORY_CHECKPOINTS) {
            expect(cp.turn).toBeGreaterThan(prev);
            prev = cp.turn;
            expect(cp.share.RS + cp.share.RBiH + cp.share.HRHB).toBeCloseTo(100, 1);
        }
    });
});

describe('historical band and gate', () => {
    it('spans the two checkpoints either side of the turn', () => {
        expect(historicalShareBand(20, 'RS')).toEqual([52.692, 63.424]);
        expect(historicalShareBand(39, 'RS')).toEqual([52.692, 63.424]);
        expect(historicalShareBand(40, 'RS')).toEqual([63.424, 66.227]);
        expect(historicalShareBand(170, 'RS')).toEqual([47.399, 63.677]);
        expect(historicalShareBand(200, 'RS')).toEqual([47.399, 63.677]); // past the last checkpoint
    });

    it('reads zero overshoot inside the band and the distance outside it', () => {
        const at = (s: Record<FactionId, number>) => (f: FactionId): number => s[f];
        const inside = historicalBandOvershootPp(60, at({ RS: 65, RBiH: 23, HRHB: 12 }));
        expect(inside).toBe(0);
        const rbihOut = historicalBandOvershootPp(60, at({ RS: 65, RBiH: 18, HRHB: 12 }));
        expect(rbihOut).toBeCloseTo(22.675 - 18, 9);
    });

    it('opens only past the 3 pp margin', () => {
        expect(DIVERGENCE_GATE_MARGIN_PP).toBe(3);
    });

    it('stays closed with no control map (never fails open)', () => {
        expect(isWarOutsideHistoricalBand({ meta: { turn: 60, war_start_turn: 0 }, political: {} } as unknown as GameState)).toBe(false);
    });

    it('opens when the map is far off history (pre-war start: read at war week 0)', () => {
        // A tiny map where RS holds everything: far outside every band. turn 30 with
        // war_start_turn 30 is war week 0 (a sep1991-style start).
        const state = {
            meta: { turn: 30, war_start_turn: 30 },
            political: { political_controllers: { 'op:x:y': 'RS' } },
        } as unknown as GameState;
        expect(isWarOutsideHistoricalBand(state)).toBe(true);
    });
});

describe('divergence rule', () => {
    const rs = getPoliticalPersonality('RS');
    const assessment: PoliticalAssessment = {
        situation_score: 50, dimension_score: 50, blended_score: 50, territory_trend: 'stable',
        military_strength: 0.5, patron_pressure: 0, exhaustion_level: 0, negotiation_pressure: 0,
    };
    const option = (id: string, delta: number): EventResponseOption =>
        ({
            id, label: id, risk_level: rs.risk_tolerance, aggression_affinity: 0,
            dimension_shifts: [{ faction: 'RS', dimension: 'territorial_legitimacy', delta }],
        }) as unknown as EventResponseOption;
    // territorial_legitimacy weight 0.30: delta 20 → 6.0, delta 0 → 0, delta 5 → 1.5.
    const historical = option('historical', 0);
    const bigWin = option('big_win', 20);
    const smallWin = option('small_win', 5);

    it('keeps history while the map is historical, whatever the margin', () => {
        expect(pickPoliticalResponseWithHistory([historical, bigWin], 'RS', assessment, rs, 'historical', false).id).toBe('historical');
    });

    it('keeps history off the map when the margin is at or under the threshold', () => {
        expect(rs.divergence_threshold).toBe(3.0);
        expect(pickPoliticalResponseWithHistory([historical, smallWin], 'RS', assessment, rs, 'historical', true).id).toBe('historical');
        expect(divergesFromHistory(3.0, 0, rs, true)).toBe(false); // a tie with the threshold keeps history
    });

    it('improvises off the map when the margin beats the threshold', () => {
        expect(pickPoliticalResponseWithHistory([historical, bigWin], 'RS', assessment, rs, 'historical', true).id).toBe('big_win');
    });

    it('is plain best-score selection without a historical reference', () => {
        expect(pickPoliticalResponseWithHistory([historical, smallWin], 'RS', assessment, rs, undefined, false).id).toBe('small_win');
    });

    it('orders the thresholds RS = RBiH > HRHB (historian ruling)', () => {
        expect(getPoliticalPersonality('RBiH').divergence_threshold).toBe(3.0);
        expect(getPoliticalPersonality('HRHB').divergence_threshold).toBeCloseTo(1.33, 9);
    });
});

describe('peace plans: the scored step keeps the historical response unless the rule lets the other through', () => {
    const plan = {
        id: 'test_plan',
        proposed_split: { RS: 50, RBiH: 30, HRHB: 20 },
        credibility_change_on_reject: { RBiH: -20, RS: -20, HRHB: -20 },
        historical_responses: { RBiH: 'rejected', RS: 'rejected', HRHB: 'accepted' },
    } as unknown as PeacePlanDefinition;
    const hrhb = getPoliticalPersonality('HRHB');
    const assessment: PoliticalAssessment = {
        situation_score: 50, dimension_score: 50, blended_score: 50, territory_trend: 'stable',
        military_strength: 0.5, patron_pressure: 0, exhaustion_level: 0, negotiation_pressure: 0,
    };

    it('scores alone when no historical response is passed (pre-B5 behaviour)', () => {
        // RBiH: accepting avoids −20 international_standing (weight 0.30) → accept wins.
        const rbih = getPoliticalPersonality('RBiH');
        expect(computePoliticalPeacePlanResponse(plan, 'RBiH', 30, 0, assessment, rbih, 60)).toBe('accepted');
    });

    it('keeps the historical rejection while the map is historical', () => {
        const rbih = getPoliticalPersonality('RBiH');
        expect(computePoliticalPeacePlanResponse(plan, 'RBiH', 30, 0, assessment, rbih, 60, 'rejected', false)).toBe('rejected');
    });

    it('lets a large enough margin through once the map has left history', () => {
        const rbih = getPoliticalPersonality('RBiH');
        // accept − reject = (6 − (−6))·0.30 ... = well above 3.0 here
        expect(computePoliticalPeacePlanResponse(plan, 'RBiH', 30, 0, assessment, rbih, 60, 'rejected', true)).toBe('accepted');
        // HRHB historical accept stays accept either way (accept already scores higher).
        expect(computePoliticalPeacePlanResponse(plan, 'HRHB', 20, 0, assessment, hrhb, 60, 'accepted', true)).toBe('accepted');
    });
});
