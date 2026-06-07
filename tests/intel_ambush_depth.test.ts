/**
 * Intel ambush DEPTH amplifier — bounded, flag-gated, default-OFF.
 *
 * Validates docs/40_reports/proposals/20260605_INTEL_AMBUSH_FRICTION_DESIGN.md §2/§4:
 *
 *   (a) DEPTH sub-flag OFF (default) ⇒ the casualty mults are byte-equal to the shipped
 *       2-arg result across a grid of (confidence, opsec, depthFactor) — no-op.
 *   (b) DEPTH sub-flag ON ⇒ a deeper target (d=1) yields a strictly higher attacker
 *       casualty mult than a shallow one (d=0); defender symmetric (strictly lower).
 *   (c) Clamp proof: even confidence=0, d=1 never exceeds 1.18 attacker / never drops
 *       below 0.90 defender.
 *   (d) Determinism: identical inputs → identical outputs across repeated calls.
 *
 * The umbrella (AWWV_INTEL_AMBUSH_FRICTION) stays ON throughout (its default), so the
 * base mechanic is live; only the nested depth amplifier is toggled here.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    isIntelAmbushDepthEnabled,
    resetIntelAmbushDepthOverride,
    setIntelAmbushDepthOverride,
    resetIntelAmbushFrictionOverride,
} from '../src/sim/combat/intel_ambush_depth_gate.js';
import {
    getIntelAmbushAttackerCasualtyMult,
    getIntelAmbushDefenderCasualtyMult,
} from '../src/sim/combat/combat_math.js';
import {
    INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MAX,
    INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MIN,
    getAmbushDepthFactor,
} from '../src/sim/combat/intel_ambush_depth.js';
import type { GameState } from '../src/state/game_state.js';

const DEPTH_ENV = 'AWWV_INTEL_AMBUSH_DEPTH';
const FRICTION_ENV = 'AWWV_INTEL_AMBUSH_FRICTION';

describe('intel ambush depth gate (nested sub-flag)', () => {
    let savedDepth: string | undefined;
    let savedFriction: string | undefined;

    beforeEach(() => {
        savedDepth = process.env[DEPTH_ENV];
        savedFriction = process.env[FRICTION_ENV];
        delete process.env[DEPTH_ENV];
        delete process.env[FRICTION_ENV];
        resetIntelAmbushDepthOverride();
        resetIntelAmbushFrictionOverride();
    });

    afterEach(() => {
        if (savedDepth === undefined) delete process.env[DEPTH_ENV];
        else process.env[DEPTH_ENV] = savedDepth;
        if (savedFriction === undefined) delete process.env[FRICTION_ENV];
        else process.env[FRICTION_ENV] = savedFriction;
        resetIntelAmbushDepthOverride();
        resetIntelAmbushFrictionOverride();
    });

    it('defaults OFF when env unset and no override', () => {
        expect(isIntelAmbushDepthEnabled()).toBe(false);
    });

    it('enables only on explicit truthy env values', () => {
        for (const on of ['1', 'true', 'on', 'yes', 'TRUE', 'On']) {
            process.env[DEPTH_ENV] = on;
            expect(isIntelAmbushDepthEnabled()).toBe(true);
        }
        for (const off of ['0', 'false', 'off', 'no', '']) {
            process.env[DEPTH_ENV] = off;
            expect(isIntelAmbushDepthEnabled()).toBe(false);
        }
    });

    it('override wins over env and reset reverts to env-default (OFF)', () => {
        process.env[DEPTH_ENV] = '0';
        setIntelAmbushDepthOverride(true);
        expect(isIntelAmbushDepthEnabled()).toBe(true);
        resetIntelAmbushDepthOverride();
        expect(isIntelAmbushDepthEnabled()).toBe(false);
    });
});

describe('intel ambush depth amplifier — casualty multipliers', () => {
    let savedDepth: string | undefined;
    let savedFriction: string | undefined;

    beforeEach(() => {
        savedDepth = process.env[DEPTH_ENV];
        savedFriction = process.env[FRICTION_ENV];
        delete process.env[DEPTH_ENV];
        delete process.env[FRICTION_ENV];
        resetIntelAmbushDepthOverride();
        resetIntelAmbushFrictionOverride();
    });

    afterEach(() => {
        if (savedDepth === undefined) delete process.env[DEPTH_ENV];
        else process.env[DEPTH_ENV] = savedDepth;
        if (savedFriction === undefined) delete process.env[FRICTION_ENV];
        else process.env[FRICTION_ENV] = savedFriction;
        resetIntelAmbushDepthOverride();
        resetIntelAmbushFrictionOverride();
    });

    const confidences = [0, 0.05, 0.1, 0.2, 0.3, 0.333, 0.34, 0.5, 0.9];
    const depths = [0, 0.25, 0.5, 0.75, 1];

    it('(a) depth sub-flag OFF ⇒ depthFactor is a no-op (byte-equal to 2-arg shipped result)', () => {
        // Sub-flag defaults OFF. The 3-arg call with any depthFactor must equal the 2-arg call.
        expect(isIntelAmbushDepthEnabled()).toBe(false);
        for (const conf of confidences) {
            for (const opsec of [true, false]) {
                const baseAtt = getIntelAmbushAttackerCasualtyMult(conf, opsec);
                const baseDef = getIntelAmbushDefenderCasualtyMult(conf, opsec);
                for (const d of depths) {
                    expect(getIntelAmbushAttackerCasualtyMult(conf, opsec, d)).toBe(baseAtt);
                    expect(getIntelAmbushDefenderCasualtyMult(conf, opsec, d)).toBe(baseDef);
                }
            }
        }
    });

    it('(a2) even with sub-flag ON, depthFactor 0 is byte-equal to the shipped value', () => {
        setIntelAmbushDepthOverride(true);
        for (const conf of confidences) {
            for (const opsec of [true, false]) {
                // Reference shipped value: sub-flag off path.
                resetIntelAmbushDepthOverride();
                const baseAtt = getIntelAmbushAttackerCasualtyMult(conf, opsec);
                const baseDef = getIntelAmbushDefenderCasualtyMult(conf, opsec);
                setIntelAmbushDepthOverride(true);
                expect(getIntelAmbushAttackerCasualtyMult(conf, opsec, 0)).toBe(baseAtt);
                expect(getIntelAmbushDefenderCasualtyMult(conf, opsec, 0)).toBe(baseDef);
            }
        }
    });

    it('(b) depth sub-flag ON ⇒ deeper target raises attacker mult, lowers defender mult (monotonic, within clamp)', () => {
        setIntelAmbushDepthOverride(true);
        // Use a triggering case: OPSEC active + low confidence (< 1/3).
        const conf = 0.1;
        const shallowAtt = getIntelAmbushAttackerCasualtyMult(conf, true, 0);
        const deepAtt = getIntelAmbushAttackerCasualtyMult(conf, true, 1);
        const shallowDef = getIntelAmbushDefenderCasualtyMult(conf, true, 0);
        const deepDef = getIntelAmbushDefenderCasualtyMult(conf, true, 1);

        expect(deepAtt).toBeGreaterThan(shallowAtt);
        expect(deepDef).toBeLessThan(shallowDef);

        // Strictly monotonic in depth (within the clamp range, for this confidence).
        let prevAtt = -Infinity;
        let prevDef = Infinity;
        for (const d of depths) {
            const att = getIntelAmbushAttackerCasualtyMult(conf, true, d);
            const def = getIntelAmbushDefenderCasualtyMult(conf, true, d);
            expect(att).toBeGreaterThanOrEqual(prevAtt);
            expect(def).toBeLessThanOrEqual(prevDef);
            prevAtt = att;
            prevDef = def;
        }
    });

    it('(b2) depth does not manufacture ambush where OPSEC is absent or confidence is high', () => {
        setIntelAmbushDepthOverride(true);
        // No OPSEC ⇒ neutral regardless of depth.
        expect(getIntelAmbushAttackerCasualtyMult(0, false, 1)).toBe(1);
        expect(getIntelAmbushDefenderCasualtyMult(0, false, 1)).toBe(1);
        // High confidence (>= threshold) ⇒ neutral regardless of depth.
        expect(getIntelAmbushAttackerCasualtyMult(0.9, true, 1)).toBe(1);
        expect(getIntelAmbushDefenderCasualtyMult(0.9, true, 1)).toBe(1);
    });

    it('(c) clamp proof: never exceeds 1.18 attacker / never below 0.90 defender, even at conf=0, d=1', () => {
        setIntelAmbushDepthOverride(true);
        for (const conf of confidences) {
            for (const d of depths) {
                const att = getIntelAmbushAttackerCasualtyMult(conf, true, d);
                const def = getIntelAmbushDefenderCasualtyMult(conf, true, d);
                expect(att).toBeLessThanOrEqual(INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MAX);
                expect(att).toBeGreaterThanOrEqual(1);
                expect(def).toBeGreaterThanOrEqual(INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MIN);
                expect(def).toBeLessThanOrEqual(1);
            }
        }
        // Worst case extremes.
        expect(getIntelAmbushAttackerCasualtyMult(0, true, 1)).toBeLessThanOrEqual(1.18);
        expect(getIntelAmbushDefenderCasualtyMult(0, true, 1)).toBeGreaterThanOrEqual(0.90);
    });

    it('(d) determinism: identical inputs → identical outputs across repeated calls', () => {
        setIntelAmbushDepthOverride(true);
        for (const conf of confidences) {
            for (const d of depths) {
                const att1 = getIntelAmbushAttackerCasualtyMult(conf, true, d);
                const att2 = getIntelAmbushAttackerCasualtyMult(conf, true, d);
                const def1 = getIntelAmbushDefenderCasualtyMult(conf, true, d);
                const def2 = getIntelAmbushDefenderCasualtyMult(conf, true, d);
                expect(att1).toBe(att2);
                expect(def1).toBe(def2);
            }
        }
    });
});

describe('getAmbushDepthFactor — pure derivation from state', () => {
    /** Minimal state carrying only the fields the depth derivation reads. */
    function makeState(opts: {
        attackerFaction: 'RBiH' | 'RS' | 'HRHB';
        frontEdgeCount: number;
        sectorConfidence: number;
        osidConfidence?: number; // per-OSID estimate for the target, if present
        omitRecord?: boolean;
    }): GameState {
        const records = opts.omitRecord
            ? undefined
            : [{
                enemy_sector_id: 'sector:enemy',
                front_edge_count: opts.frontEdgeCount,
                confidence: opts.sectorConfidence,
                ...(opts.osidConfidence !== undefined
                    ? { osid_confidence: [{ osid: 'osid:target', confidence: opts.osidConfidence, sources: [] }] }
                    : {}),
            }];
        return {
            military: {
                corps_front_sectors: {
                    'sector:atk': {
                        faction: opts.attackerFaction,
                        sub_segments: [{ friendly_osids: ['osid:atk'] }],
                    },
                },
                sector_intel: records ? { 'sector:atk': records } : {},
            },
        } as unknown as GameState;
    }

    it('returns 0 when defenderSectorId is undefined', () => {
        const state = makeState({ attackerFaction: 'RBiH', frontEdgeCount: 5, sectorConfidence: 0.9 });
        expect(getAmbushDepthFactor(state, 'osid:atk', undefined, 'osid:target')).toBe(0);
    });

    it('returns 0 for a well-observed front-adjacent target (front edges + high per-OSID confidence)', () => {
        const state = makeState({
            attackerFaction: 'RBiH', frontEdgeCount: 5, sectorConfidence: 0.9, osidConfidence: 1.0,
        });
        expect(getAmbushDepthFactor(state, 'osid:atk', 'sector:enemy', 'osid:target')).toBe(0);
    });

    it('returns 1 when no intel record exists on the sector pair (maximally under-scouted)', () => {
        const state = makeState({
            attackerFaction: 'RS', frontEdgeCount: 1, sectorConfidence: 0.5, omitRecord: true,
        });
        expect(getAmbushDepthFactor(state, 'osid:atk', 'sector:enemy', 'osid:target')).toBe(1);
    });

    it('non-front-adjacent target carries an inherent depth floor', () => {
        const state = makeState({
            attackerFaction: 'RBiH', frontEdgeCount: 0, sectorConfidence: 0.9, osidConfidence: 1.0,
        });
        const d = getAmbushDepthFactor(state, 'osid:atk', 'sector:enemy', 'osid:target');
        expect(d).toBeGreaterThanOrEqual(0.5);
        expect(d).toBeLessThanOrEqual(1);
    });

    it('low per-OSID confidence at the front yields deeper reach than full confidence', () => {
        const shallow = getAmbushDepthFactor(
            makeState({ attackerFaction: 'RBiH', frontEdgeCount: 3, sectorConfidence: 0.9, osidConfidence: 1.0 }),
            'osid:atk', 'sector:enemy', 'osid:target',
        );
        const blind = getAmbushDepthFactor(
            makeState({ attackerFaction: 'RBiH', frontEdgeCount: 3, sectorConfidence: 0.9, osidConfidence: 0.0 }),
            'osid:atk', 'sector:enemy', 'osid:target',
        );
        expect(blind).toBeGreaterThan(shallow);
    });

    it('treats a MISSING per-OSID intel entry as unscouted, not as the sector-confidence fallback (#247)', () => {
        // Front-adjacent (no adjacency-depth floor) so the result is driven purely by the
        // per-OSID scouting component. A high sector confidence MUST NOT mask an absent
        // per-OSID estimate: the unscouted target reads as deep (blind), not shallow.
        const missingEntryHighSector = getAmbushDepthFactor(
            makeState({ attackerFaction: 'RBiH', frontEdgeCount: 3, sectorConfidence: 0.95 }),
            'osid:atk', 'sector:enemy', 'osid:target',
        );
        // Same shape, but the per-OSID estimate IS present and explicitly blind (0.0).
        // Contract: a missing entry behaves identically to a present-but-zero estimate.
        const presentZeroEntry = getAmbushDepthFactor(
            makeState({ attackerFaction: 'RBiH', frontEdgeCount: 3, sectorConfidence: 0.95, osidConfidence: 0.0 }),
            'osid:atk', 'sector:enemy', 'osid:target',
        );
        expect(missingEntryHighSector).toBe(presentZeroEntry);
        expect(missingEntryHighSector).toBeGreaterThan(0); // unscouted ⇒ non-trivial depth

        // And a missing entry must read as DEEPER than a present, high-confidence per-OSID
        // estimate at the same front — proving the fallback no longer borrows sector confidence.
        const presentHighEntry = getAmbushDepthFactor(
            makeState({ attackerFaction: 'RBiH', frontEdgeCount: 3, sectorConfidence: 0.95, osidConfidence: 1.0 }),
            'osid:atk', 'sector:enemy', 'osid:target',
        );
        expect(missingEntryHighSector).toBeGreaterThan(presentHighEntry);
    });

    it('uses the present per-OSID estimate value (not the sector confidence) when an entry exists (#247)', () => {
        // High per-OSID estimate over a LOW sector confidence ⇒ shallow (uses the entry, not sector).
        const shallowFromEntry = getAmbushDepthFactor(
            makeState({ attackerFaction: 'RBiH', frontEdgeCount: 3, sectorConfidence: 0.1, osidConfidence: 1.0 }),
            'osid:atk', 'sector:enemy', 'osid:target',
        );
        expect(shallowFromEntry).toBe(0); // fully observed target ⇒ no scouting depth
    });

    it('is bounded to [0,1] and deterministic across repeated calls', () => {
        const state = makeState({
            attackerFaction: 'RS', frontEdgeCount: 0, sectorConfidence: 0.1,
        });
        const d1 = getAmbushDepthFactor(state, 'osid:atk', 'sector:enemy', 'osid:target');
        const d2 = getAmbushDepthFactor(state, 'osid:atk', 'sector:enemy', 'osid:target');
        expect(d1).toBe(d2);
        expect(d1).toBeGreaterThanOrEqual(0);
        expect(d1).toBeLessThanOrEqual(1);
    });

    it('returns 0 when the attacker OSID is not in any sector (no recon origin)', () => {
        const state = makeState({ attackerFaction: 'RBiH', frontEdgeCount: 1, sectorConfidence: 0.1 });
        expect(getAmbushDepthFactor(state, 'osid:unknown', 'sector:enemy', 'osid:target')).toBe(0);
    });
});
