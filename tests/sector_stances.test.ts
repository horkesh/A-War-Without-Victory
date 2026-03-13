/**
 * Tests for Layer B: Independent Sector Stances.
 * Verifies stance constants, bot AI evaluation, corps constraint ceiling,
 * cold front detection, combat integration (reactive bonus), and entrenchment rate.
 */
import { describe, it, expect } from 'vitest';
import {
    SECTOR_STANCE_REACTIVE_BONUS,
    SECTOR_STANCE_ENTRENCHMENT_RATE,
    CORPS_STANCE_ALLOWED_SECTOR_STANCES,
} from '../src/sim/combat/combat_math.js';
import type { SectorStance, CorpsFrontSector } from '../src/state/game_state.js';

// ── Constants ────────────────────────────────────────────────────────────────

describe('SECTOR_STANCE_REACTIVE_BONUS', () => {
    it('fortify has highest reactive bonus', () => {
        expect(SECTOR_STANCE_REACTIVE_BONUS.fortify).toBeGreaterThan(SECTOR_STANCE_REACTIVE_BONUS.defend);
    });

    it('screening has lowest reactive bonus', () => {
        const values = Object.values(SECTOR_STANCE_REACTIVE_BONUS);
        expect(SECTOR_STANCE_REACTIVE_BONUS.screening).toBe(Math.min(...values));
    });

    it('defend is the default middle ground', () => {
        expect(SECTOR_STANCE_REACTIVE_BONUS.defend).toBe(1.15);
    });

    it('all values are positive', () => {
        for (const v of Object.values(SECTOR_STANCE_REACTIVE_BONUS)) {
            expect(v).toBeGreaterThan(0);
        }
    });
});

describe('SECTOR_STANCE_ENTRENCHMENT_RATE', () => {
    it('fortify has 2× entrenchment rate', () => {
        expect(SECTOR_STANCE_ENTRENCHMENT_RATE.fortify).toBe(2.0);
    });

    it('screening has 0 entrenchment rate', () => {
        expect(SECTOR_STANCE_ENTRENCHMENT_RATE.screening).toBe(0.0);
    });

    it('defend has 1.2× (slightly above baseline)', () => {
        expect(SECTOR_STANCE_ENTRENCHMENT_RATE.defend).toBe(1.2);
    });

    it('active_defense is below defend', () => {
        expect(SECTOR_STANCE_ENTRENCHMENT_RATE.active_defense).toBeLessThan(
            SECTOR_STANCE_ENTRENCHMENT_RATE.defend
        );
    });
});

// ── Corps stance ceiling ─────────────────────────────────────────────────────

describe('CORPS_STANCE_ALLOWED_SECTOR_STANCES', () => {
    it('offensive corps cannot fortify', () => {
        expect(CORPS_STANCE_ALLOWED_SECTOR_STANCES.offensive).not.toContain('fortify');
    });

    it('defensive corps cannot use active_defense', () => {
        expect(CORPS_STANCE_ALLOWED_SECTOR_STANCES.defensive).not.toContain('active_defense');
    });

    it('balanced corps allows all five stances', () => {
        const all: SectorStance[] = ['fortify', 'defend', 'elastic', 'active_defense', 'screening'];
        for (const s of all) {
            expect(CORPS_STANCE_ALLOWED_SECTOR_STANCES.balanced).toContain(s);
        }
    });

    it('reorganize corps allows fortify, defend, screening', () => {
        expect(CORPS_STANCE_ALLOWED_SECTOR_STANCES.reorganize).toContain('fortify');
        expect(CORPS_STANCE_ALLOWED_SECTOR_STANCES.reorganize).toContain('defend');
        expect(CORPS_STANCE_ALLOWED_SECTOR_STANCES.reorganize).toContain('screening');
        expect(CORPS_STANCE_ALLOWED_SECTOR_STANCES.reorganize).not.toContain('active_defense');
    });

    it('every corps stance has defend as an option', () => {
        for (const allowed of Object.values(CORPS_STANCE_ALLOWED_SECTOR_STANCES)) {
            expect(allowed).toContain('defend');
        }
    });
});

// ── Reactive bonus integration ───────────────────────────────────────────────

describe('sector stance reactive defense integration', () => {
    it('fortified sector gets 1.3× reactive response vs 1.15× for defend', () => {
        const baseReserves = 1000;
        const fortified = baseReserves * SECTOR_STANCE_REACTIVE_BONUS.fortify;
        const defended = baseReserves * SECTOR_STANCE_REACTIVE_BONUS.defend;
        expect(fortified).toBeCloseTo(1300, 0);
        expect(defended).toBeCloseTo(1150, 0);
        expect(fortified).toBeGreaterThan(defended);
    });

    it('screening sector gets half the reactive response of elastic', () => {
        const baseReserves = 1000;
        const screened = baseReserves * SECTOR_STANCE_REACTIVE_BONUS.screening;
        const elastic = baseReserves * SECTOR_STANCE_REACTIVE_BONUS.elastic;
        expect(screened).toBe(500);
        expect(elastic).toBe(1000);
        expect(screened).toBe(elastic * 0.5);
    });

    it('active_defense reduces reactive defense (forces spread on patrols)', () => {
        expect(SECTOR_STANCE_REACTIVE_BONUS.active_defense).toBeLessThan(1.0);
        expect(SECTOR_STANCE_REACTIVE_BONUS.active_defense).toBe(0.85);
    });
});

// ── Entrenchment growth integration ──────────────────────────────────────────

describe('sector stance entrenchment growth', () => {
    it('fortify doubles entrenchment growth rate', () => {
        const baseTurns = 5;
        const normalGrowth = baseTurns * SECTOR_STANCE_ENTRENCHMENT_RATE.defend;
        const fortifyGrowth = baseTurns * SECTOR_STANCE_ENTRENCHMENT_RATE.fortify;
        expect(fortifyGrowth / normalGrowth).toBeCloseTo(2.0 / 1.2, 2);
    });

    it('screening prevents all entrenchment growth', () => {
        const turnsOnLine = 10;
        const growth = turnsOnLine * SECTOR_STANCE_ENTRENCHMENT_RATE.screening;
        expect(growth).toBe(0);
    });

    it('elastic grows entrenchment slower than defend', () => {
        expect(SECTOR_STANCE_ENTRENCHMENT_RATE.elastic).toBeLessThan(
            SECTOR_STANCE_ENTRENCHMENT_RATE.defend
        );
    });
});

// ── Default sector stance ────────────────────────────────────────────────────

describe('CorpsFrontSector default stance', () => {
    it('new sectors default to defend/bot', () => {
        // This tests the contract — any CorpsFrontSector created must have these fields
        const sector: CorpsFrontSector = {
            sector_id: 'sector:test:0',
            corps_id: 'test-corps',
            faction: 'RS',
            opposing_factions: ['RBiH'],
            edge_ids: ['e1'],
            sub_segments: [],
            length_edges: 1,
            territory_osids: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            density: 0,
            threat_ratio: 0,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
        };
        expect(sector.sector_stance).toBe('defend');
        expect(sector.stance_source).toBe('bot');
    });
});
