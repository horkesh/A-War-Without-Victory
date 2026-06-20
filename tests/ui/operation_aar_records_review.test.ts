// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { RecordsContent } from '../../src/ui/map/components/army_hq/RecordsContent.js';
import { OrbatSection } from '../../src/ui/map/components/army_hq/OrbatSection.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';
import type { FormationView, LoadedGameState } from '../../src/ui/map/data/types.js';

function makeLoadedState(): LoadedGameState {
    return {
        label: 'RS turn 18',
        turn: 18,
        phase: 'war',
        formations: [
            {
                id: 'rs_1st_krajina',
                faction: 'RS',
                name: '1st Krajina Corps',
                kind: 'corps',
                readiness: 'ready',
                cohesion: 80,
                fatigue: 0,
                status: 'active',
                createdTurn: 0,
                tags: [],
            },
        ],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        player_faction: 'RS',
        operationHistory: [
            {
                operation_id: 'op-aar-1',
                operation_name: 'Operation Iron Corridor',
                corps_id: 'rs_1st_krajina',
                faction: 'RS',
                started_turn: 12,
                ended_turn: 15,
                outcome: 'partial',
                commander_name: 'Field Commander',
                commander_rank: 'Colonel',
                objectives_targeted: [
                    'op:prijedor:prijedor_1',
                    'op:kozara:kozarac_1',
                    'op:sanski_most:sanski_most_1',
                ],
                objectives_logged_captured: ['op:prijedor:prijedor_1'],
                objectives_held_without_logged_capture: ['op:kozara:kozarac_1'],
                capture_provenance: 'mixed',
                objectives_captured: ['op:prijedor:prijedor_1', 'op:kozara:kozarac_1'],
                total_attacks: 6,
                casualties_suffered: { killed: 18, wounded: 64 },
                casualties_inflicted: { killed: 22, wounded: 75 },
                equipment_lost: { tanks: 1, artillery: 0 },
                equipment_destroyed: { tanks: 0, artillery: 1 },
                equipment_captured: { tanks: 0, artillery: 0 },
                grade: { stars: 3, verdict: 'Costly partial', factors: { objective_pct: 67, attack_tempo: 6 } },
                duration_turns: 4,
                weekly_log: [
                    {
                        turn: 13,
                        phase: 'execution',
                        attacks_this_turn: 2,
                        objectives_captured_this_turn: ['op:prijedor:prijedor_1'],
                        notable_events: ['breakthrough'],
                        casualties_suffered: { killed: 8, wounded: 23 },
                        casualties_inflicted: { killed: 12, wounded: 31 },
                    },
                ],
                axis_summaries: [
                    {
                        axis_id: 'axis-west',
                        axis_name: 'Western Axis',
                        objectives_targeted: [
                            'op:prijedor:prijedor_1',
                            'op:kozara:kozarac_1',
                            'op:sanski_most:sanski_most_1',
                        ],
                        objectives_captured: ['op:prijedor:prijedor_1'],
                        total_attacks: 3,
                        casualties_suffered: { killed: 7, wounded: 20 },
                        casualties_inflicted: { killed: 10, wounded: 25 },
                    },
                ],
                recovery_reason: 'completed',
                commander_assessment_at_launch: 'launch',
            },
        ],
        activeOperations: [],
    };
}

describe('Army HQ Records operation AAR review', () => {
    beforeEach(() => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeLoadedState(),
            armyHQRecordsSubTab: 'ops',
            osidDisplayNames: {
                'op:prijedor:prijedor_1': 'Prijedor',
                'op:kozara:kozarac_1': 'Kozarac',
                'op:sanski_most:sanski_most_1': 'Sanski Most',
            },
        });
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('opens a compact deep review for completed operation AARs from Records OPERATIONS', () => {
        render(createElement(RecordsContent));

        fireEvent.click(screen.getByRole('button', { name: /^History/i }));
        fireEvent.click(screen.getByRole('button', { name: /Operation Iron Corridor/i }));

        expect(screen.getByText('Operational Deep Review')).toBeTruthy();
        expect(screen.getByText('Result: Partial')).toBeTruthy();
        expect(screen.getByText('Attacks: 6')).toBeTruthy();
        expect(screen.getByText('Casualties: 82 suffered / 97 inflicted')).toBeTruthy();
        expect(screen.getByText('Grade: 3 stars - Costly partial')).toBeTruthy();
        expect(screen.getByText('Provenance: mixed final-control record')).toBeTruthy();
        expect(screen.getByText('Captured: Prijedor')).toBeTruthy();
        expect(screen.getByText('Held at end: Kozarac')).toBeTruthy();
        expect(screen.getByText('Not held: Sanski Most')).toBeTruthy();
    });

    it('labels compact AAR final-held objectives as held at close, not taken', () => {
        const en = readFileSync('src/ui/map/i18n/messages.en.ts', 'utf8');
        const bcs = readFileSync('src/ui/map/i18n/messages.bcs.ts', 'utf8');

        expect(en).toContain("'operationsSection.aarObjectivesTaken': '{captured} / {targeted} OBJ HELD AT CLOSE'");
        expect(en).not.toContain('OBJ TAKEN');
        expect(bcs).not.toContain('CILJEVA UZETO');
    });

    it('renders operation display names in Records instead of raw history identifiers', () => {
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                operationHistory: [
                    {
                        ...makeLoadedState().operationHistory![0],
                        operation_id: 'raw-op-aar',
                        operation_name: 'probe_arbih_1st_corps_t12',
                        operation_display_name: 'Probe - 1st Corps',
                    } as any,
                ],
            },
            focusedOperationHistoryId: 'raw-op-aar',
        });

        render(createElement(RecordsContent));

        expect(screen.getByRole('button', { name: /Probe - 1st Corps/i })).toBeTruthy();
        expect(screen.queryByText(/probe_arbih_1st_corps_t12/i)).toBeNull();
        expect(screen.queryByText(/_t12/i)).toBeNull();
        expect(screen.queryByText(/operation_name/i)).toBeNull();
    });

    it('renders completed-operation timing as calendar copy instead of raw week labels', () => {
        const view = render(createElement(RecordsContent));

        fireEvent.click(screen.getByRole('button', { name: /^History/i }));
        fireEvent.click(screen.getByRole('button', { name: /Operation Iron Corridor/i }));

        const copy = view.container.textContent ?? '';
        expect(copy).toContain(`${turnToDateString(12)} - ${turnToDateString(15)}`);
        expect(copy).toContain(turnToDateString(13));
        expect(copy).not.toMatch(/\bW12-W15\b/);
        expect(copy).not.toMatch(/\bW13\b/);
    });

    it('renders active-operation start timing as calendar copy instead of Since W labels', () => {
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                activeOperations: [
                    {
                        corps_id: 'rs_1st_krajina',
                        operation_name: 'probe_rs_1st_krajina_t12',
                        operation_display_name: 'Probe - 1st Krajina',
                        faction: 'RS',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 12,
                        participating_brigades: ['rs_bde_1', 'rs_bde_2'],
                        commander_name: 'Field Commander',
                        objectives_count: 3,
                        objectives_captured: 1,
                        attacks: 2,
                        weekly_log_length: 1,
                    },
                ],
            },
        });

        const view = render(createElement(RecordsContent));

        const copy = view.container.textContent ?? '';
        expect(copy).toContain(`Since ${turnToDateString(12)}`);
        expect(copy).not.toMatch(/Since W12/);
        expect(copy).not.toMatch(/probe_rs_1st_krajina_t12/i);
    });

    it('uses player-safe labels and neutral fallback copy for grade factors and notable events', () => {
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                operationHistory: [
                    {
                        ...makeLoadedState().operationHistory![0],
                        grade: {
                            stars: 3,
                            verdict: 'Costly partial',
                            factors: { objective_pct: 67, support_gap_raw: -12 },
                        },
                        weekly_log: [
                            {
                                ...makeLoadedState().operationHistory![0].weekly_log[0],
                                notable_events: ['supply_crisis'],
                            },
                        ],
                    },
                ],
            },
        });
        const view = render(createElement(RecordsContent));

        fireEvent.click(screen.getByRole('button', { name: /^History/i }));
        fireEvent.click(screen.getByRole('button', { name: /Operation Iron Corridor/i }));

        const copy = view.container.textContent ?? '';
        expect(copy).toContain('Objective progress:');
        expect(copy).toContain('Operational factor:');
        expect(copy).toContain('Notable development');
        expect(copy).not.toMatch(/objective pct/i);
        expect(copy).not.toMatch(/support gap raw/i);
        expect(copy).not.toMatch(/supply_crisis/i);
    });

    it('shows per-axis objective status labels from existing AAR axis summaries', () => {
        render(createElement(RecordsContent));

        fireEvent.click(screen.getByRole('button', { name: /^History/i }));
        fireEvent.click(screen.getByRole('button', { name: /Operation Iron Corridor/i }));

        expect(screen.getByText('Western Axis')).toBeTruthy();
        expect(screen.getByText('Axis held at end: Prijedor')).toBeTruthy();
        expect(screen.getByText('Held by another axis: Kozarac')).toBeTruthy();
        expect(screen.getByText('Axis not held: Sanski Most')).toBeTruthy();
    });

    it('shows a clear completed-operation empty state in Records OPERATIONS history', () => {
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                operationHistory: [],
            },
        });

        render(createElement(RecordsContent));

        fireEvent.click(screen.getByRole('button', { name: /^History/i }));

        expect(screen.getByText('No completed operations yet.')).toBeTruthy();
    });

    it('summarizes archive routes and sub-tab counts before drilling into a tab', () => {
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                firedEvents: [
                    {
                        id: 'cabinet-crisis',
                        turn: 8,
                        title: 'Cabinet crisis response',
                        narrative: 'The cabinet accepted the policy line.',
                        category: 'political',
                        effects: [{ kind: 'authority', description: 'Authority held.' }],
                        isDecision: true,
                    },
                ],
                latestTurnSummary: {
                    turn: 18,
                    battles: [],
                    territory_net: { RS: 1 },
                    notable_flips: [],
                    displacement_total: 0,
                    displacement_by_ethnicity: {},
                    decoration_awards: [],
                    arc_transitions: [],
                    formation_spawns: [],
                    formation_destructions: [],
                    supply_deltas: {},
                    heavy_munitions_deltas: {},
                    movements: [],
                    supply_transitions: [],
                    events_fired: [],
                    notable_events: [],
                },
            },
        });

        render(createElement(RecordsContent));

        expect(screen.getByRole('region', { name: 'Records archive summary' })).toBeTruthy();
        expect(screen.getByText('Archive Routes')).toBeTruthy();
        expect(screen.getByText('Cabinet crisis response')).toBeTruthy();
        expect(screen.getByText('Chronicle Filed')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Turn Aftermath 1/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Decision Log 1/i })).toBeTruthy();
    });

    it('localizes the Records archive summary chrome', () => {
        setLocale('bcs');
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                firedEvents: [
                    {
                        id: 'cabinet-crisis',
                        turn: 8,
                        title: 'Cabinet crisis response',
                        narrative: 'The cabinet accepted the policy line.',
                        category: 'political',
                        effects: [{ kind: 'authority', description: 'Authority held.' }],
                        isDecision: true,
                    },
                ],
            },
        });

        render(createElement(RecordsContent));

        expect(screen.getByRole('region', { name: 'Sažetak arhive zapisa' })).toBeTruthy();
        expect(screen.getByText('Putevi arhive')).toBeTruthy();
        expect(screen.getByText('Najnovija odluka')).toBeTruthy();
        expect(screen.getByText('U Hronici')).toBeTruthy();
        expect(screen.queryByText('Archive Routes')).toBeNull();
    });

    it('counts the AAR tab from turn reports instead of completed operations', () => {
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                latestTurnSummary: null,
            },
        });

        render(createElement(RecordsContent));

        expect(screen.getByRole('button', { name: /After-Action Report 0/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Operation History 1/i })).toBeTruthy();
    });

    it('renders AAR unit-event labels without raw arc or decoration tier identifiers', () => {
        useGameStore.setState({
            armyHQRecordsSubTab: 'aar',
            loadedGameState: {
                ...makeLoadedState(),
                latestTurnSummary: {
                    turn: 18,
                    battles: [],
                    territory_net: {},
                    notable_flips: [],
                    displacement_total: 0,
                    displacement_by_ethnicity: {},
                    decoration_awards: [
                        {
                            formation_id: 'rbih_heroic_brigade',
                            formation_name: 'Heroic Brigade',
                            faction: 'RBiH',
                            decoration: { tier: 'tier_1', type: 'unit_citation', awarded_turn: 18, reason: 'steadfast defense' } as never,
                        },
                    ],
                    arc_transitions: [
                        {
                            formation_id: 'rbih_heroic_brigade',
                            formation_name: 'Heroic Brigade',
                            faction: 'RBiH',
                            from_arc: 'garrison',
                            to_arc: 'bloodied',
                        },
                    ],
                    formation_spawns: [],
                    formation_destructions: [],
                    supply_deltas: {},
                    heavy_munitions_deltas: {},
                    movements: [],
                    supply_transitions: [],
                    events_fired: [],
                    notable_events: [],
                },
            },
        });

        const view = render(createElement(RecordsContent));
        const copy = view.container.textContent ?? '';

        expect(copy).toContain('Slavna');
        expect(copy).toContain('Garrison duty');
        expect(copy).toContain('Blooded in combat');
        expect(copy).not.toMatch(/\btier[_ ]?1\b/i);
        expect(copy).not.toMatch(/garrison\s*→\s*bloodied/i);
        expect(copy).not.toMatch(/\bbloodied\b/i);
    });

    it('renders ORBAT brigade arc badges as player-facing labels', () => {
        const brigade: FormationView = {
            id: 'rbih_heroic_brigade',
            faction: 'RBiH',
            name: 'Heroic Brigade',
            kind: 'brigade',
            readiness: 'ready',
            cohesion: 64,
            fatigue: 3,
            status: 'active',
            createdTurn: 0,
            tags: [],
            narrativeArc: 'garrison',
            personnel: 1400,
            posture: 'defend',
            decorations: [{ tier: 'tier_1', type: 'unit_citation' }],
        };
        useGameStore.setState({
            armyHQExpandedSections: { 'orbat-rbih_1st_corps': true },
        });

        const view = render(createElement(OrbatSection, { corpsId: 'rbih_1st_corps', brigades: [brigade] }));
        fireEvent.click(screen.getByRole('button', { name: /Heroic Brigade/i }));
        const copy = view.container.textContent ?? '';

        expect(copy).toContain('Garrison duty');
        expect(copy).toContain('Slavna');
        expect(copy).not.toMatch(/\bGARRISON\b/);
        expect(copy).not.toMatch(/unit_citation/i);
    });

    it('opens the focused completed operation row when routed from Chronicle', () => {
        useGameStore.setState({
            armyHQRecordsSubTab: 'ops',
            focusedOperationHistoryId: 'op-aar-1',
        });

        render(createElement(RecordsContent));

        expect(screen.getByRole('button', { name: /^History/i }).className).toContain('text-accent-gold');
        expect(screen.getByText('Operational Deep Review')).toBeTruthy();
        expect(screen.getByText('Result: Partial')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Operation Iron Corridor/i }).getAttribute('aria-current')).toBe('true');
    });
});
