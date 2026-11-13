/**
 * OG stance minimum dwell (S3). A posture stands for OG_STANCE_MIN_DWELL_TURNS before an
 * intel-driven change or a lapse back to 'defend'; contact (ground lost, fighting in the
 * sector this turn) re-postures at once.
 */
import { describe, expect, it } from 'vitest';
import { OG_STANCE_MIN_DWELL_TURNS, resolveOgStance } from '../../src/sim/combat/commander/emit.js';
import { BELIEF_INTENT_STALENESS_TURNS } from '../../src/sim/combat/commander/belief.js';
import type { SectorStanceMemoryEntry } from '../../src/sim/combat/commander/commander_state.js';
import type { StanceRecommendation } from '../../src/sim/combat/commander/decide.js';

const held = (stance: SectorStanceMemoryEntry['stance'], since: number, confirmed = since): SectorStanceMemoryEntry =>
    ({ stable_key: 'corps_a|e1', stance, since_turn: since, confirmed_turn: confirmed });
const rec = (stance: StanceRecommendation['new_stance'], trigger: 'contact' | 'intel'): StanceRecommendation =>
    ({ sector_id: 'sector:corps_a:0', new_stance: stance, reason: 'test', trigger });

describe('OG stance minimum dwell', () => {
    it('reuses the commander intel-trust window as the dwell', () => {
        expect(OG_STANCE_MIN_DWELL_TURNS).toBe(BELIEF_INTENT_STALENESS_TURNS);
    });

    it('a new OG takes the recommendation, or defend without one', () => {
        expect(resolveOgStance(undefined, rec('active_defense', 'intel'), 10).stance).toBe('active_defense');
        expect(resolveOgStance(undefined, undefined, 10).stance).toBe('defend');
    });

    it('an intel-driven change waits for the dwell', () => {
        const prev = held('active_defense', 10);
        expect(resolveOgStance(prev, rec('fortify', 'intel'), 11).stance).toBe('active_defense');
        expect(resolveOgStance(prev, rec('fortify', 'intel'), 10 + OG_STANCE_MIN_DWELL_TURNS).stance).toBe('fortify');
    });

    it('contact re-postures at once', () => {
        const result = resolveOgStance(held('active_defense', 10), rec('fortify', 'contact'), 11);
        expect(result.stance).toBe('fortify');
        expect(result.why).toBe('recommended');
    });

    it('a quiet week does not snap back to defend; the posture lapses after the dwell', () => {
        const prev = held('active_defense', 10, 12);
        expect(resolveOgStance(prev, undefined, 13).stance).toBe('active_defense');
        const lapsed = resolveOgStance(prev, undefined, 12 + OG_STANCE_MIN_DWELL_TURNS);
        expect(lapsed.stance).toBe('defend');
        expect(lapsed.why).toBe('lapsed');
    });

    it('a confirming recommendation refreshes the confirmation turn', () => {
        const result = resolveOgStance(held('fortify', 10, 10), rec('fortify', 'intel'), 14);
        expect(result).toEqual({ stance: 'fortify', confirmed_turn: 14, why: 'confirmed' });
    });

    it('an absent trigger counts as intel', () => {
        const noTrigger: StanceRecommendation = { sector_id: 's', new_stance: 'screening', reason: 'quiet' };
        expect(resolveOgStance(held('defend', 10), noTrigger, 11).stance).toBe('defend');
    });
});
