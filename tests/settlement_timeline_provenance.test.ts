import { describe, expect, it } from 'vitest';
import { buildSettlementTimeline } from '../src/ui/map/utils/buildSettlementTimeline.js';

// --- Helpers ---

function makeDispEvent(
    turn: number,
    osid: string,
    causedBy: string,
    ethnicity = 'Bosniak',
    displaced = 100,
) {
    return {
        turn,
        origin_osid: osid,
        ethnicity,
        displaced,
        killed: 0,
        fled_abroad: 0,
        settled: 0,
        caused_by: causedBy,
    };
}

const EMPTY_ARRAYS = {
    controlEvents: [] as never[],
    operationHistory: [] as never[],
    battles: [] as never[],
    movements: [] as never[],
    supplyTransitions: [] as never[],
    historicalEvents: [] as never[],
};

function callTimeline(
    osid: string,
    opts: {
        displacementEvents?: ReturnType<typeof makeDispEvent>[];
        controlEvents?: Array<{ turn: number; settlementId: string; from: string | null; to: string | null; mechanism: string }>;
        startController?: string | null;
    } = {},
) {
    return buildSettlementTimeline(
        osid,
        null,
        opts.displacementEvents ?? [],
        opts.controlEvents ?? EMPTY_ARRAYS.controlEvents,
        EMPTY_ARRAYS.operationHistory,
        EMPTY_ARRAYS.battles,
        EMPTY_ARRAYS.movements,
        EMPTY_ARRAYS.supplyTransitions,
        EMPTY_ARRAYS.historicalEvents,
        null,
        opts.startController ?? null,
    );
}

// --- Tests ---

describe('Settlement Timeline Provenance — Turn-0 Control Truth', () => {
    it('emits turn-0 entry when startController provided', () => {
        const events = callTimeline('op:test:test_1', { startController: 'RS' });

        expect(events).toHaveLength(1);
        expect(events[0].turn).toBe(0);
        expect(events[0].type).toBe('control_flip');
        expect(events[0].faction).toBe('RS');
        expect(events[0].title).toContain('VRS');
        expect(events[0].title).toContain('scenario start');
        expect(events[0].detail).toBe('initial control');
    });

    it('no turn-0 entry when startController is null', () => {
        const events = callTimeline('op:test:test_1', { startController: null });
        expect(events).toHaveLength(0);
    });

    it('renders persisted turn-0 setup control as scenario-start provenance, not a takeover', () => {
        const osid = 'op:test:test_1';
        const events = callTimeline(osid, {
            controlEvents: [
                { turn: 0, settlementId: osid, from: null, to: 'RBiH', mechanism: 'initial_control' },
            ],
        });

        const controlFlips = events.filter(e => e.type === 'control_flip');
        expect(controlFlips).toHaveLength(1);
        expect(controlFlips[0].title).toBe('Controlled by ARBiH at scenario start');
        expect(controlFlips[0].title).not.toContain('took control');
        expect(controlFlips[0].detail).toBe('initial control');
    });

    it('suppresses displacement-inferred takeover when matching startController', () => {
        const osid = 'op:test:test_1';
        const events = callTimeline(osid, {
            startController: 'RS',
            displacementEvents: [
                makeDispEvent(3, osid, 'RS'),
                makeDispEvent(4, osid, 'RS'),
            ],
        });

        // Should have turn-0 control entry + displacement entries, but NO "took control" inference
        const controlFlips = events.filter(e => e.type === 'control_flip');
        expect(controlFlips).toHaveLength(1);
        expect(controlFlips[0].turn).toBe(0);
        expect(controlFlips[0].detail).toBe('initial control');

        // Displacement events themselves should still appear
        const displacements = events.filter(e => e.type === 'displacement');
        expect(displacements.length).toBeGreaterThan(0);
    });

    it('preserves displacement inference when startController is null (backward compat)', () => {
        const osid = 'op:test:test_1';
        const events = callTimeline(osid, {
            startController: null,
            displacementEvents: [makeDispEvent(3, osid, 'RS')],
        });

        const controlFlips = events.filter(e => e.type === 'control_flip');
        expect(controlFlips).toHaveLength(1);
        expect(controlFlips[0].faction).toBe('RS');
        expect(controlFlips[0].title).toContain('VRS');
        expect(controlFlips[0].title).toContain('took control');
        expect(controlFlips[0].detail).toBe('inferred from displacement');
    });

    it('preserves displacement inference when caused_by differs from startController', () => {
        const osid = 'op:test:test_1';
        const events = callTimeline(osid, {
            startController: 'RBiH',
            displacementEvents: [makeDispEvent(5, osid, 'RS')],
        });

        const controlFlips = events.filter(e => e.type === 'control_flip');
        // Turn-0 for RBiH + inferred RS takeover at turn 5
        expect(controlFlips).toHaveLength(2);

        const turn0 = controlFlips.find(e => e.turn === 0);
        expect(turn0).toBeDefined();
        expect(turn0!.faction).toBe('RBiH');
        expect(turn0!.detail).toBe('initial control');

        const inferred = controlFlips.find(e => e.turn === 5);
        expect(inferred).toBeDefined();
        expect(inferred!.faction).toBe('RS');
        expect(inferred!.title).toContain('VRS');
        expect(inferred!.title).toContain('took control');
        expect(inferred!.detail).toBe('inferred from displacement');
    });

    it('preserves displacement inference when persisted control_events exist', () => {
        const osid = 'op:test:test_1';
        const events = callTimeline(osid, {
            startController: 'RS',
            controlEvents: [
                { turn: 10, settlementId: osid, from: 'RS', to: 'RBiH', mechanism: 'combat' },
            ],
            displacementEvents: [makeDispEvent(15, osid, 'RS')],
        });

        const controlFlips = events.filter(e => e.type === 'control_flip');
        // turn-0 initial + turn 10 persisted + turn 15 inferred (persistedFlipCount > 0, not suppressed)
        expect(controlFlips).toHaveLength(3);

        const turn15 = controlFlips.find(e => e.turn === 15);
        expect(turn15).toBeDefined();
        expect(turn15!.faction).toBe('RS');
        expect(turn15!.detail).toBe('inferred from displacement');
    });

    it('RS-held OSID: suppresses false VRS takeover from displacement', () => {
        // The original bug: an OSID held by RS at start, with RS-caused displacement,
        // would show "VRS took control" even though RS never lost/retook it.
        const osid = 'op:zvornik:rastosnica_2';
        const events = callTimeline(osid, {
            startController: 'RS',
            displacementEvents: [
                makeDispEvent(3, osid, 'RS', 'Bosniak', 200),
                makeDispEvent(4, osid, 'RS', 'Bosniak', 150),
            ],
        });

        const controlFlips = events.filter(e => e.type === 'control_flip');
        // Only the turn-0 entry; no false "VRS took control"
        expect(controlFlips).toHaveLength(1);
        expect(controlFlips[0].turn).toBe(0);
        expect(controlFlips[0].title).toContain('VRS');
        expect(controlFlips[0].title).toContain('scenario start');

        // Displacement still recorded
        const disp = events.filter(e => e.type === 'displacement');
        expect(disp.length).toBeGreaterThan(0);
    });

    it('uses operation display names instead of raw identifiers in operation timeline entries', () => {
        const osid = 'op:bratunac:bratunac_1';
        const events = buildSettlementTimeline(
            osid,
            null,
            [],
            [],
            [
                {
                    operation_name: 'cmd_vrs_drinacorps_t45',
                    operation_display_name: 'Command - Drina Corps',
                    corps_id: 'vrs_drinacorps',
                    faction: 'RS',
                    started_turn: 42,
                    ended_turn: 45,
                    outcome: 'partial',
                    objectives_targeted: [osid],
                    objectives_captured: [],
                } as any,
            ],
            [],
            [],
            [],
            [],
            null,
            null,
        );

        const text = events.map(e => `${e.title} ${e.detail ?? ''}`).join(' ');
        expect(text).toContain('Command - Drina Corps');
        expect(text).not.toMatch(/cmd_|_t45|operation_name|op:/i);
    });

    it('does not let operation history claim event-owned Srebrenica and Zepa fall receipts', () => {
        for (const osid of ['op:srebrenica:srebrenica_2', 'op:rogatica:zepa_2']) {
            const events = buildSettlementTimeline(
                osid,
                null,
                [],
                [],
                [
                    {
                        operation_name: 'late_1995_context',
                        operation_display_name: 'Late 1995 enclave operation',
                        corps_id: 'vrs_drinacorps',
                        faction: 'RS',
                        started_turn: 170,
                        ended_turn: 171,
                        outcome: 'success',
                        objectives_targeted: [osid],
                        objectives_captured: [osid],
                    } as any,
                ],
                [],
                [],
                [],
                [],
                null,
                null,
            );

            const resolved = events.filter(e => e.type === 'operation_resolved');
            expect(resolved).toHaveLength(1);
            expect(resolved[0].title).toContain('operation context recorded');
            expect(resolved[0].title).not.toContain('objective captured');
            expect(resolved[0].detail).toBe('Control change is owned by the historical event receipt.');
        }
    });

    it('renders authored control-event mechanism labels without exposing raw enum tokens', () => {
        const osid = 'op:test:test_1';
        const events = callTimeline(osid, {
            controlEvents: [
                { turn: 8, settlementId: osid, from: 'RBiH', to: 'RS', mechanism: 'event' },
                { turn: 9, settlementId: osid, from: 'RS', to: 'RBiH', mechanism: 'scripted_control_change' },
            ],
        });

        const details = events.filter(e => e.type === 'control_flip').map(e => e.detail);
        expect(details).toContain('historical control event');
        expect(details).not.toContain('scripted control change');
        expect(details).not.toContain('scripted_control_change');
    });

    it('renders authored battle outcome labels and uses a neutral fallback for unknown outcomes', () => {
        const osid = 'op:test:test_1';
        const events = buildSettlementTimeline(
            osid,
            null,
            [],
            [],
            [],
            [
                {
                    turn: 1,
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH',
                    outcome: 'victory',
                    attacker_casualties: 8,
                    defender_casualties: 18,
                    territory_flipped: true,
                },
                {
                    turn: 4,
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH',
                    outcome: 'decisive_victory',
                    attacker_casualties: 10,
                    defender_casualties: 30,
                    territory_flipped: true,
                },
                {
                    turn: 6,
                    attacker_faction: 'HRHB',
                    defender_faction: 'RS',
                    outcome: 'costly_victory',
                    attacker_casualties: 45,
                    defender_casualties: 38,
                    territory_flipped: true,
                },
                {
                    turn: 7,
                    attacker_faction: 'RS',
                    defender_faction: 'HRHB',
                    outcome: 'stalemate',
                    attacker_casualties: 20,
                    defender_casualties: 18,
                    territory_flipped: false,
                },
                {
                    turn: 8,
                    attacker_faction: 'RBiH',
                    defender_faction: 'HRHB',
                    outcome: 'repulsed',
                    attacker_casualties: 36,
                    defender_casualties: 12,
                    territory_flipped: false,
                },
                {
                    turn: 9,
                    attacker_faction: 'HRHB',
                    defender_faction: 'RBiH',
                    outcome: 'catastrophic',
                    attacker_casualties: 70,
                    defender_casualties: 10,
                    territory_flipped: false,
                },
                {
                    turn: 5,
                    attacker_faction: 'RBiH',
                    defender_faction: 'RS',
                    outcome: 'unexpected_result_token',
                    attacker_casualties: 20,
                    defender_casualties: 15,
                    territory_flipped: false,
                },
            ],
            [],
            [],
            [],
            null,
            null,
        );

        const titles = events.filter(e => e.type === 'battle').map(e => e.title);
        expect(titles.some(title => title.includes('decisive victory'))).toBe(true);
        expect(titles.some(title => title.includes('victory'))).toBe(true);
        expect(titles.some(title => title.includes('costly victory'))).toBe(true);
        expect(titles.some(title => title.includes('stalemate'))).toBe(true);
        expect(titles.some(title => title.includes('attack repulsed'))).toBe(true);
        expect(titles.some(title => title.includes('catastrophic defeat'))).toBe(true);
        expect(titles.some(title => title.includes('outcome recorded'))).toBe(true);
        expect(titles.some(title => title.includes('decisive_victory'))).toBe(false);
        expect(titles.some(title => title.includes('costly_victory'))).toBe(false);
        expect(titles.some(title => title.includes('unexpected result token'))).toBe(false);
    });

    it('uses neutral historical-event fallback copy when event text is missing', () => {
        const events = buildSettlementTimeline(
            'op:test:test_1',
            null,
            [],
            [],
            [],
            [],
            [],
            [],
            [{ turn: 10, id: 'srebrenica_falls_1995', text: '' }],
            null,
            null,
        );

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('historical_event');
        expect(events[0].title).toBe('Historical event recorded');
        expect(events[0].title).not.toContain('srebrenica');
        expect(events[0].title).not.toContain('_');
    });
});
