/**
 * B5 scorer unit fixes (2026-11-16): the emergent political scorer reads game state
 * in the units and order the state actually uses.
 *
 * 1. territory_trend: turn_summaries is newest-first and territory_snapshot is a 0..1
 *    area fraction; the ±1 threshold is in percentage points.
 * 2. exhaustion_level: war_exhaustion is read on the shared 0..100 scale of its 10000 cap.
 * 3. patronScore: a neutral option (aggression_affinity 0) gets no patron term.
 */

import { describe, it, expect } from 'vitest';

import {
    computePoliticalAssessment,
    getPoliticalPersonality,
    type PoliticalAssessment,
} from '../../../src/sim/political/political_personality.js';
import { scorePoliticalOption } from '../../../src/sim/political/political_event_decision.js';
import type { EventResponseOption } from '../../../src/sim/events/event_types.js';
import type { FactionId, GameState } from '../../../src/state/game_state.js';

function stateWith(opts: {
    summaries?: Array<{ turn: number; territory_snapshot?: Partial<Record<FactionId, number>> }>;
    exhaustion?: Partial<Record<FactionId, number>>;
}): GameState {
    return {
        meta: { turn: 60 },
        political: { war_exhaustion: opts.exhaustion ?? {} },
        military: {},
        turn_summaries: opts.summaries ?? [],
    } as unknown as GameState;
}

function trendFor(faction: FactionId, summaries: Array<{ turn: number; territory_snapshot?: Partial<Record<FactionId, number>> }>) {
    return computePoliticalAssessment(stateWith({ summaries }), faction, getPoliticalPersonality(faction)).territory_trend;
}

describe('B5 fix 1: territory_trend', () => {
    it('reads the newest snapshots first (turn_summaries is most-recent-first)', () => {
        // Newest (turn 12) RS 0.50; oldest of the window (turn 10) RS 0.47 → +3 pp → gaining.
        // An old war-start entry at turn 1 (RS 0.70) must not be read.
        const summaries = [
            { turn: 12, territory_snapshot: { RS: 0.50 } },
            { turn: 11, territory_snapshot: { RS: 0.49 } },
            { turn: 10, territory_snapshot: { RS: 0.47 } },
            { turn: 1, territory_snapshot: { RS: 0.70 } },
        ];
        expect(trendFor('RS', summaries)).toBe('gaining');
    });

    it('reports losing when the newest snapshot is lower by more than 1 pp', () => {
        const summaries = [
            { turn: 12, territory_snapshot: { RBiH: 0.20 } },
            { turn: 11, territory_snapshot: { RBiH: 0.21 } },
            { turn: 10, territory_snapshot: { RBiH: 0.22 } },
        ];
        expect(trendFor('RBiH', summaries)).toBe('losing');
    });

    it('treats a change of 1 pp or less as stable (fraction compared in percentage points)', () => {
        const summaries = [
            { turn: 12, territory_snapshot: { HRHB: 0.155 } },
            { turn: 11, territory_snapshot: { HRHB: 0.152 } },
            { turn: 10, territory_snapshot: { HRHB: 0.150 } },
        ];
        expect(trendFor('HRHB', summaries)).toBe('stable');
    });

    it('skips summaries without a snapshot for the faction', () => {
        const summaries = [
            { turn: 13 },
            { turn: 12, territory_snapshot: { RS: 0.52 } },
            { turn: 11, territory_snapshot: { RBiH: 0.3 } },
            { turn: 10, territory_snapshot: { RS: 0.50 } },
        ];
        expect(trendFor('RS', summaries)).toBe('gaining');
    });

    it('stays stable with fewer than two snapshots', () => {
        expect(trendFor('RS', [{ turn: 3, territory_snapshot: { RS: 0.6 } }])).toBe('stable');
        expect(trendFor('RS', [])).toBe('stable');
    });
});

describe('B5 fix 2: exhaustion_level', () => {
    it('maps the full-war ceiling to 100 and a late-war RS value to the high 90s', () => {
        const personality = getPoliticalPersonality('RS');
        const atCeiling = computePoliticalAssessment(stateWith({ exhaustion: { RS: 10000 } }), 'RS', personality);
        expect(atCeiling.exhaustion_level).toBe(100);
        const lateWar = computePoliticalAssessment(stateWith({ exhaustion: { RS: 9775 } }), 'RS', personality);
        expect(lateWar.exhaustion_level).toBeCloseTo(97.75, 5);
    });

    it('lets a late-war RBiH situation drop under the survival threshold of 50 under patron pressure', () => {
        const state = {
            meta: { turn: 150 },
            political: { war_exhaustion: { RBiH: 8700 } },
            military: { negotiation: { patron_relationships: { RBiH: { override_authority: 40 } } } },
            turn_summaries: [],
        } as unknown as GameState;
        const a = computePoliticalAssessment(state, 'RBiH', getPoliticalPersonality('RBiH'));
        // 0.4·50 + 0.3·(100−40) + 0.3·(100−87) = 20 + 18 + 3.9 = 41.9
        expect(a.situation_score).toBeCloseTo(41.9, 5);
        expect(a.situation_score).toBeLessThan(50);
    });
});

describe('B5 fix 3: patronScore ignores neutral options', () => {
    const personality = getPoliticalPersonality('HRHB');
    const assessment: PoliticalAssessment = {
        situation_score: 50,
        dimension_score: 50,
        blended_score: 50,
        territory_trend: 'stable',
        military_strength: 0.5,
        patron_pressure: 100,
        exhaustion_level: 0,
        negotiation_pressure: 0,
    };
    const option = (id: string, aggression_affinity: number): EventResponseOption =>
        ({ id, label: id, risk_level: personality.risk_tolerance, aggression_affinity }) as unknown as EventResponseOption;

    it('scores a neutral option at zero patron term (all other terms are zero here)', () => {
        expect(scorePoliticalOption(option('neutral', 0), 'HRHB', assessment, personality)).toBeCloseTo(0, 10);
    });

    it('still rewards defensive and penalises aggressive options under patron pressure', () => {
        const defensive = scorePoliticalOption(option('d', -0.5), 'HRHB', assessment, personality);
        const neutral = scorePoliticalOption(option('n', 0), 'HRHB', assessment, personality);
        const aggressive = scorePoliticalOption(option('a', 0.5), 'HRHB', assessment, personality);
        expect(defensive).toBeGreaterThan(neutral);
        expect(neutral).toBeGreaterThan(aggressive);
        expect(defensive).toBeCloseTo(0.4, 10); // 1.0 · 0.80 · 0.5
        expect(aggressive).toBeCloseTo(-0.4, 10);
    });
});
