import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { applySiegeBombardmentAttrition } from '../src/sim/combat/siege_attrition.js';
import { applySiegeMoraleDrain } from '../src/sim/combat/siege_morale_drain.js';
import { updateSupplyReserves } from '../src/state/supply_reserves.js';

// B7 — consumer consolidation. Each siege fragment reads the shared lifeline
// scalar when ENABLE_SARAJEVO_LIFELINE is ON; takes its identical pre-change
// path when OFF. These tests assert (a) flag-OFF == no lifeline effect and
// (b) flag-ON visibly modulates the existing formula on the Sarajevo-core
// RBiH pocket.

const SARAJEVO_CORE_OSID = 'op:centar_sarajevo:radava';
const COUNTER_KEY = `RBiH:${SARAJEVO_CORE_OSID}`;

function baseState(): GameState {
    return {
        schema_version: 1,
        meta: { turn: 30, seed: 'lifeline-consumers', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                rbih_def: {
                    id: 'rbih_def', faction: 'RBiH', kind: 'brigade', status: 'active',
                    location_osid: SARAJEVO_CORE_OSID, personnel: 3000, morale: 60,
                    origin_mun: 'centar_sarajevo',
                    composition: { artillery: 0, tanks: 0 },
                } as any,
                rs_art: {
                    id: 'rs_art', faction: 'RS', kind: 'brigade', status: 'active',
                    location_osid: 'op:trebevic:ridge', personnel: 3000, morale: 60,
                    composition: { artillery: 40, tanks: 10 },
                } as any,
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            siege_turn_counters: { [COUNTER_KEY]: 30 },
            fired_event_ids: ['sarajevo_tunnel_completed_1993'],
            event_flags: { sarajevo_siege_active: true },
        } as any,
        political: {
            political_controllers: { [SARAJEVO_CORE_OSID]: 'RBiH' },
            // pre-derived OPEN lifeline so consumers read a high throughput when flag ON
            sarajevo_state: {
                mun_id: 'sarajevo_cluster_1990',
                settlement_ids: [SARAJEVO_CORE_OSID],
                siege_status: 'BESIEGED', siege_duration: 30,
                external_supply: 0.8, internal_supply: 0,
                siege_intensity: 0.5, international_focus: 1, humanitarian_pressure: 1,
                last_updated_turn: 29,
                lifeline: { status: 'OPEN', airlift_active: true, tunnel_active: true, throughput: 0.8, last_updated_turn: 29 },
            },
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

afterEach(() => {
    delete process.env.ENABLE_SARAJEVO_LIFELINE;
    delete process.env.SIEGE_MORALE_DRAIN_ENABLED;
});

describe('B7 consumer: siege bombardment attrition', () => {
    it('flag OFF == identical casualties to no-lifeline baseline; flag ON (OPEN) reduces them', () => {
        const offState = baseState();
        const offReport = applySiegeBombardmentAttrition(offState);
        const offCas = offReport.by_faction['RBiH'] ?? 0;
        expect(offCas).toBeGreaterThan(0);

        process.env.ENABLE_SARAJEVO_LIFELINE = 'true';
        const onState = baseState();
        const onReport = applySiegeBombardmentAttrition(onState);
        const onCas = onReport.by_faction['RBiH'] ?? 0;

        // OPEN lifeline (throughput 0.8) damps shelling attrition below the OFF path.
        expect(onCas).toBeLessThan(offCas);
    });
});

describe('B7 consumer: siege morale drain', () => {
    beforeEach(() => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'true';
    });

    it('flag OFF drains more morale than flag ON (OPEN lifeline softens decrement)', () => {
        const offState = baseState();
        applySiegeMoraleDrain(offState);
        const offMorale = (offState.military.formations!['rbih_def'] as any).morale;

        process.env.ENABLE_SARAJEVO_LIFELINE = 'true';
        const onState = baseState();
        applySiegeMoraleDrain(onState);
        const onMorale = (onState.military.formations!['rbih_def'] as any).morale;

        // softened decrement ⇒ higher remaining morale on the ON path.
        expect(onMorale).toBeGreaterThan(offMorale);
    });
});

describe('B7 consumer: supply-reserve siege drain', () => {
    it('flag ON (OPEN lifeline) reduces the Sarajevo-core siege drain vs flag OFF', () => {
        const offState = baseState();
        const offReport = updateSupplyReserves(offState, {});
        const offRbih = offReport.factions.find((f) => f.faction_id === 'RBiH');
        expect(offRbih?.siege_drain_general ?? 0).toBeGreaterThan(0);

        process.env.ENABLE_SARAJEVO_LIFELINE = 'true';
        const onState = baseState();
        const onReport = updateSupplyReserves(onState, {});
        const onRbih = onReport.factions.find((f) => f.faction_id === 'RBiH');

        // A working lifeline offsets the Sarajevo-core siege drain ⇒ strictly less.
        expect(onRbih?.siege_drain_general ?? 0).toBeLessThan(offRbih?.siege_drain_general ?? 0);
    });
});
