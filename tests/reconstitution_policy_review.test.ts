/**
 * Reconstitution Policy Review — Reinforcement Multiplier Late-War Decay
 *
 * Lane: LANE-NIGHTSHIFT-RECONSTITUTION-POLICY-REVIEW
 * Plan reference: docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md
 * Mission G citation: row 1 "+753 VRS personnel over 188w" (inverse to doctrine).
 *
 * The audit identified `getFactionReinforcementMult` (state/formation_constants.ts)
 * as the canonical lever producing the asymmetric force-quality arc inversion:
 * VRS reinforcement_mult was flat 1.0× from turn 0 to turn 9999, so the brigade
 * fill path drained mobilization surplus + strategic-reserve overflow into
 * existing brigades faster than battle attrition could erode them — overpowering
 * the casualty-driven officer_quality decay term (Gap 2 trace, +0.000246/turn
 * net upward drift for VRS officer_quality).
 *
 * The fix introduces a faction-symmetric step curve mechanism (the SAME mechanism
 * already used for RBiH and HRHB; only data parameters drive faction asymmetry):
 *   RS: 1.0× < 52, 0.85× < 78, 0.65× < 104, 0.45× thereafter
 *   HRHB: 0.50× < 12, 0.75× < 52, 0.65× < 78, 0.50× thereafter (late-war decay added)
 *   RBiH: unchanged (audit shows ARBiH on-doctrine)
 *
 * These tests assert the policy parameters and the faction-agnostic mechanism
 * predicate. Determinism is preserved: no Math.random, no Date.now, no locale
 * sort. The function is pure given (faction, turn, timeline?).
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
    getFactionReinforcementMult,
} from '../src/state/formation_constants.js';
import { validateWarTimeline, type WarTimeline } from '../src/state/war_timeline.js';

async function loadTimeline(): Promise<WarTimeline> {
    const path = resolve(process.cwd(), 'data/scenarios/timelines/apr1992.json');
    const raw = JSON.parse(await readFile(path, 'utf8'));
    return validateWarTimeline(raw);
}

// ─── 1. RS late-war decay restored (the audit's named offender) ──────────────

describe('reconstitution policy: RS late-war reinforcement decay', () => {
    it('preserves 1.0× through week 52 (40w calibration anchor must not regress)', () => {
        // Hardcoded fallback path (no timeline)
        expect(getFactionReinforcementMult('RS', 0)).toBe(1.0);
        expect(getFactionReinforcementMult('RS', 12)).toBe(1.0);
        expect(getFactionReinforcementMult('RS', 39)).toBe(1.0);
        expect(getFactionReinforcementMult('RS', 51)).toBe(1.0);
    });

    it('attenuates RS reinforcement starting week 52 (mid-1993, sanctions + officer attrition)', () => {
        expect(getFactionReinforcementMult('RS', 52)).toBe(0.85);
        expect(getFactionReinforcementMult('RS', 60)).toBe(0.85);
        expect(getFactionReinforcementMult('RS', 77)).toBe(0.85);
    });

    it('further attenuates RS reinforcement at week 78 (mid-1994, deepening exhaustion)', () => {
        expect(getFactionReinforcementMult('RS', 78)).toBe(0.65);
        expect(getFactionReinforcementMult('RS', 90)).toBe(0.65);
        expect(getFactionReinforcementMult('RS', 103)).toBe(0.65);
    });

    it('applies brittle late-war floor at week 104+ (1995 endgame, replacement quality crumbles)', () => {
        expect(getFactionReinforcementMult('RS', 104)).toBe(0.45);
        expect(getFactionReinforcementMult('RS', 156)).toBe(0.45);
        expect(getFactionReinforcementMult('RS', 188)).toBe(0.45);
        expect(getFactionReinforcementMult('RS', 9000)).toBe(0.45);
    });
});

// ─── 2. HRHB late-war decay parallel to RS ───────────────────────────────────

describe('reconstitution policy: HRHB late-war reinforcement decay', () => {
    it('preserves early-war HRHB curve (0.50× weeks 0-11, 0.75× weeks 12-51)', () => {
        expect(getFactionReinforcementMult('HRHB', 0)).toBe(0.50);
        expect(getFactionReinforcementMult('HRHB', 11)).toBe(0.50);
        expect(getFactionReinforcementMult('HRHB', 12)).toBe(0.75);
        expect(getFactionReinforcementMult('HRHB', 51)).toBe(0.75);
    });

    it('attenuates HRHB to 0.65× weeks 52-77 (Lasva Valley + Washington Agreement stress)', () => {
        expect(getFactionReinforcementMult('HRHB', 52)).toBe(0.65);
        expect(getFactionReinforcementMult('HRHB', 77)).toBe(0.65);
    });

    it('attenuates HRHB to 0.50× from week 78 (two-front exhaustion plateau)', () => {
        expect(getFactionReinforcementMult('HRHB', 78)).toBe(0.50);
        expect(getFactionReinforcementMult('HRHB', 156)).toBe(0.50);
        expect(getFactionReinforcementMult('HRHB', 188)).toBe(0.50);
    });
});

// ─── 3. RBiH curve unchanged (on-doctrine per audit) ─────────────────────────

describe('reconstitution policy: RBiH curve preserved', () => {
    it('preserves the existing ARBiH ramp (0.25 → 0.50 → 0.75 → 1.0)', () => {
        expect(getFactionReinforcementMult('RBiH', 0)).toBe(0.25);
        expect(getFactionReinforcementMult('RBiH', 11)).toBe(0.25);
        expect(getFactionReinforcementMult('RBiH', 12)).toBe(0.50);
        expect(getFactionReinforcementMult('RBiH', 25)).toBe(0.50);
        expect(getFactionReinforcementMult('RBiH', 26)).toBe(0.75);
        expect(getFactionReinforcementMult('RBiH', 51)).toBe(0.75);
        expect(getFactionReinforcementMult('RBiH', 52)).toBe(1.0);
        expect(getFactionReinforcementMult('RBiH', 188)).toBe(1.0);
    });

    it('keeps ARBiH growth term in late war (audit: matches doctrinal arc)', () => {
        // After turn 52 ARBiH is at full rate while RS is decaying — this is the
        // asymmetry the audit's "+0.0067/turn growth term overrides casualty decay"
        // diagnosis demands we deliver.
        expect(getFactionReinforcementMult('RBiH', 100)).toBeGreaterThan(getFactionReinforcementMult('RS', 100));
        expect(getFactionReinforcementMult('RBiH', 156)).toBeGreaterThan(getFactionReinforcementMult('RS', 156));
        expect(getFactionReinforcementMult('RBiH', 188)).toBeGreaterThan(getFactionReinforcementMult('RS', 188));
    });
});

// ─── 4. Faction-agnostic mechanism (predicate, not parameters) ───────────────

describe('reconstitution policy: faction-agnostic mechanism', () => {
    it('every named faction has a finite, non-negative multiplier across the war window', () => {
        const factions = ['RS', 'RBiH', 'HRHB'] as const;
        for (const faction of factions) {
            for (const turn of [0, 12, 26, 52, 78, 104, 156, 188]) {
                const mult = getFactionReinforcementMult(faction, turn);
                expect(mult).toBeGreaterThanOrEqual(0);
                expect(mult).toBeLessThanOrEqual(2);
                expect(Number.isFinite(mult)).toBe(true);
            }
        }
    });

    it('every faction is monotonically non-increasing in late war (week 52+)', () => {
        // Late-war exhaustion mechanism is symmetric: once a faction passes its
        // peak organization, multiplier should not climb back up. RBiH plateaus
        // at 1.0 (terminal), RS and HRHB step down. None should climb.
        const factions = ['RS', 'RBiH', 'HRHB'] as const;
        for (const faction of factions) {
            const samples = [52, 78, 104, 156, 188].map((t) => getFactionReinforcementMult(faction, t));
            for (let i = 1; i < samples.length; i++) {
                expect(samples[i]).toBeLessThanOrEqual(samples[i - 1]);
            }
        }
    });

    it('handles unknown faction with safe default fallback (no crash)', () => {
        // Faction-agnostic predicate: function never throws, always returns a sane multiplier.
        const result = getFactionReinforcementMult('UNKNOWN_FACTION', 100);
        expect(Number.isFinite(result)).toBe(true);
        expect(result).toBeGreaterThan(0);
    });
});

// ─── 5. Determinism ──────────────────────────────────────────────────────────

describe('reconstitution policy: determinism', () => {
    it('same (faction, turn) inputs yield identical outputs across many invocations', () => {
        const factions = ['RS', 'RBiH', 'HRHB'] as const;
        const turns = [0, 12, 25, 52, 78, 104, 156, 188];
        for (const faction of factions) {
            for (const turn of turns) {
                const a = getFactionReinforcementMult(faction, turn);
                const b = getFactionReinforcementMult(faction, turn);
                const c = getFactionReinforcementMult(faction, turn);
                expect(a).toBe(b);
                expect(b).toBe(c);
            }
        }
    });

    it('does not depend on iteration order or call sequence', () => {
        // Compute in forward order then reverse order; must be identical.
        const turns = [0, 12, 25, 52, 78, 104, 156, 188];
        const forward = turns.map((t) => getFactionReinforcementMult('RS', t));
        const reversed = [...turns].reverse().map((t) => getFactionReinforcementMult('RS', t));
        expect(forward).toEqual([...reversed].reverse());
    });
});

// ─── 6. Timeline parity (the JSON data + hardcoded must match) ──────────────

describe('reconstitution policy: timeline parity', () => {
    it('apr1992.json reinforcement_mult matches hardcoded fallback at all break points', async () => {
        const timeline = await loadTimeline();
        const factions = ['RS', 'RBiH', 'HRHB'] as const;
        const turns = [0, 11, 12, 25, 26, 51, 52, 77, 78, 103, 104, 156, 188];
        for (const faction of factions) {
            for (const turn of turns) {
                const hardcoded = getFactionReinforcementMult(faction, turn);
                const fromTimeline = getFactionReinforcementMult(faction, turn, timeline);
                expect(fromTimeline).toBe(hardcoded);
            }
        }
    });

    it('apr1992.json RS reinforcement_mult curve is contiguous and strictly stepped', async () => {
        const timeline = await loadTimeline();
        const rsCurve = timeline.reinforcement_mult?.RS ?? [];
        expect(rsCurve.length).toBeGreaterThanOrEqual(2); // at least an early band + a late band
        // Contiguity check (validateWarTimeline already enforces this; assert shape too):
        for (let i = 1; i < rsCurve.length; i++) {
            expect(rsCurve[i].start_turn).toBe(rsCurve[i - 1].end_turn);
        }
    });
});
