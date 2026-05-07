/**
 * LANE-NIGHTSHIFT-JAJCE-CASCADE-MORALE-AUDIT
 *
 * Verifies that jajce_falls_1992 has cascade-morale consequences that
 * propagate per-brigade morale and cohesion impacts to ARBiH (2nd/7th Corps
 * adjacent to Jajce) and HRHB, plus alliance erosion.
 *
 * Sources:
 *   - BB Vol I p.182 Posavina (refugee crisis Oct 29, 1992)
 *   - ICTY Prlic IT-04-74-T (HVO-ARBiH Jajce defense friction → Lasva precursor)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WAR_1992_PATH = resolve(__dirname, '..', 'data', 'scenarios', 'events', 'war_1992.json');

interface EffectEntry {
    kind: string;
    faction?: string;
    delta?: number;
    text?: string;
}

interface DimensionShift {
    faction: string;
    dimension: string;
    delta: number;
}

interface EventDef {
    id: string;
    title?: string;
    trigger?: { turn_min?: number; turn_max?: number };
    effect?: EffectEntry;
    effects?: EffectEntry[];
    dimension_shifts?: DimensionShift[];
    sets_flags?: Record<string, boolean>;
    once?: boolean;
}

function loadJajceEvent(): EventDef {
    const raw = readFileSync(WAR_1992_PATH, 'utf8');
    const events = JSON.parse(raw) as EventDef[];
    const ev = events.find((e) => e.id === 'jajce_falls_1992');
    if (!ev) throw new Error('jajce_falls_1992 not found in war_1992.json');
    return ev;
}

describe('LANE-NIGHTSHIFT-JAJCE-CASCADE-MORALE-AUDIT', () => {
    const ev = loadJajceEvent();

    it('T1: jajce_falls_1992 has non-empty consequences with morale + cohesion impacts', () => {
        expect(Array.isArray(ev.effects)).toBe(true);
        expect((ev.effects ?? []).length).toBeGreaterThan(0);

        // Must contain at least one morale_change and one cohesion_change.
        const hasMorale = (ev.effects ?? []).some((e) => e.kind === 'morale_change');
        const hasCohesion = (ev.effects ?? []).some((e) => e.kind === 'cohesion_change');
        expect(hasMorale).toBe(true);
        expect(hasCohesion).toBe(true);

        // RBiH cohesion impact must be present and non-trivial (>=5 magnitude).
        const rbihCohesion = (ev.effects ?? []).find(
            (e) => e.kind === 'cohesion_change' && e.faction === 'RBiH',
        );
        expect(rbihCohesion).toBeDefined();
        expect(Math.abs(rbihCohesion!.delta ?? 0)).toBeGreaterThanOrEqual(5);
    });

    it('T2: schema valid — every effect entry has supported kind + required fields', () => {
        const SUPPORTED_KINDS = new Set([
            'aggression_modifier',
            'alliance_change',
            'alliance_lock',
            'bot_priority_shift',
            'cohesion_change',
            'control_change',
            'cost_ledger_annotation',
            'doctrine_constraint',
            'equipment_grant',
            'equipment_quality_modifier',
            'guerrilla_threat',
            'humanitarian_impact',
            'morale_change',
            'narrative',
            'negotiation_capital',
            'patron_pressure',
            'recruitment_modifier',
            'supply_delta',
        ]);

        for (const e of ev.effects ?? []) {
            expect(SUPPORTED_KINDS.has(e.kind)).toBe(true);
            // Faction-typed effects must specify faction in canonical set.
            if (e.kind === 'morale_change' || e.kind === 'cohesion_change') {
                expect(['RBiH', 'RS', 'HRHB']).toContain(e.faction);
                expect(typeof e.delta).toBe('number');
            }
            if (e.kind === 'alliance_change') {
                expect(typeof e.delta).toBe('number');
            }
        }

        // Legacy single `effect` (pre-effects-array) must also be valid.
        if (ev.effect) {
            expect(SUPPORTED_KINDS.has(ev.effect.kind)).toBe(true);
        }
    });

    it('T3: faction-symmetric mechanism — RBiH AND HRHB both receive cohesion impact', () => {
        // The historical record (BB Vol I p.182, ICTY Prlic) shows Jajce hit
        // BOTH ARBiH (refugee absorption, 2nd/7th Corps adjacency) and HVO
        // (mutual blame, precursor to Lasva). Mechanism must apply symmetrically.
        const rbihCohesion = (ev.effects ?? []).find(
            (e) => e.kind === 'cohesion_change' && e.faction === 'RBiH',
        );
        const hrhbCohesion = (ev.effects ?? []).find(
            (e) => e.kind === 'cohesion_change' && e.faction === 'HRHB',
        );
        expect(rbihCohesion).toBeDefined();
        expect(hrhbCohesion).toBeDefined();

        // Both deltas must be negative (loss), and within calibration band.
        expect(rbihCohesion!.delta).toBeLessThan(0);
        expect(hrhbCohesion!.delta).toBeLessThan(0);
        expect(Math.abs(rbihCohesion!.delta!)).toBeGreaterThanOrEqual(5);
        expect(Math.abs(rbihCohesion!.delta!)).toBeLessThanOrEqual(15);
        expect(Math.abs(hrhbCohesion!.delta!)).toBeGreaterThanOrEqual(5);
        expect(Math.abs(hrhbCohesion!.delta!)).toBeLessThanOrEqual(15);

        // Alliance erosion must be present (mutual blame).
        const allianceChange = (ev.effects ?? []).find((e) => e.kind === 'alliance_change');
        expect(allianceChange).toBeDefined();
        expect(allianceChange!.delta).toBeLessThan(0);
    });

    it('T4: deterministic re-load — JSON parse twice yields identical event payload', () => {
        const a = loadJajceEvent();
        const b = loadJajceEvent();
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));

        // Trigger window unchanged from Q3 (aa30f349): turn_min=28, turn_max=39.
        expect(a.trigger?.turn_min).toBe(28);
        expect(a.trigger?.turn_max).toBe(39);
        expect(a.once).toBe(true);
        expect(a.sets_flags?.jajce_fell).toBe(true);
    });
});
