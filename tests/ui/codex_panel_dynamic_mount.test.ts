// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { buildConsequenceReceipts } from '../../src/ui/map/data/consequenceReceipts.js';
import { buildDynamicSections } from '../../src/sim/codex/dynamic_section_builder.js';
import { generateChronicleEntries } from '../../src/ui/map/components/chronicle/generateChronicleEntries.js';
import { buildCostLedger } from '../../src/sim/endgame/cost_ledger.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { GameState } from '../../src/state/game_state.js';
import essayIndex from '../../data/scenarios/essays/essay_index.json';

const startVisibleEssayCount = (essayIndex as { essays: Array<{ tier?: number }> }).essays
    .filter((essay) => essay.tier !== 3).length;

let storeState: Record<string, any> = { loadedGameState: null };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (state: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { CodexPanel, shouldProjectLiveDynamicCodex } = await import('../../src/ui/map/components/CodexPanel');

function renderPanel(options: {
    state?: GameState;
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
} = {}) {
    return render(createElement(CodexPanel, {
        isOpen: true,
        onClose: () => {},
        ...options,
    }));
}

function firedEvent(id: string) {
    return {
        id,
        turn: 188,
        title: id,
        narrative: '',
        category: 'diplomatic',
        effects: [],
        isDecision: false,
    };
}

function consequenceCatalog(): Map<string, EventDefinition> {
    const labels: Record<string, {
        en: { title: string; option: string; consequence: string };
        bcs: { title: string; option: string; consequence: string };
    }> = {
        rbih_source: {
            en: { title: 'Diplomatic dossier', option: 'Accept the terms', consequence: 'Implementation review' },
            bcs: { title: 'Diplomatski dosje', option: 'Prihvati uslove', consequence: 'Pregled provedbe' },
        },
        rs_source: {
            en: { title: 'Foreign diplomatic dossier', option: 'Accept foreign terms', consequence: 'Foreign review' },
            bcs: { title: 'Strani diplomatski dosje', option: 'Prihvati strane uslove', consequence: 'Strani pregled' },
        },
        z_source: {
            en: { title: 'Earlier dossier', option: 'Accept earlier terms', consequence: 'Earlier consequence' },
            bcs: { title: 'Raniji dosje', option: 'Prihvati ranije uslove', consequence: 'Ranija posljedica' },
        },
        a_source: {
            en: { title: 'Later dossier', option: 'Accept later terms', consequence: 'Later consequence' },
            bcs: { title: 'Kasniji dosje', option: 'Prihvati kasnije uslove', consequence: 'Kasnija posljedica' },
        },
    };
    const source = (id: string, consequenceId: string): EventDefinition => ({
        id,
        title: labels[id].en.title,
        localizations: {
            bcs: {
                title: labels[id].bcs.title,
                response_options: {
                    accept: { label: labels[id].bcs.option },
                },
            },
        },
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'Recorded.' },
        family: 'peace_plan',
        source_tier: 'icty_icj_un',
        response_options: [{
            id: 'accept',
            label: labels[id].en.option,
            effects: [],
            enables_events_runtime: [consequenceId],
            future_consequences: [{
                id: `${consequenceId}_future`,
                label: labels[id].en.consequence,
                timing: 'future',
                certainty: 'guaranteed',
                opens_events: [consequenceId],
                explanation: 'The English dossier explains that this consequence follows.',
            }],
        }],
    } as unknown as EventDefinition);
    const consequence = (id: string): EventDefinition => {
        const sourceLabels = labels[id.replace('_consequence', '_source')];
        return {
            id,
            title: sourceLabels?.en.consequence ?? 'Recorded consequence',
            localizations: {
                bcs: { title: sourceLabels?.bcs.consequence ?? 'Zabiljezena posljedica' },
            },
            trigger: { turn_min: 1, phase: 'war' },
            effect: { kind: 'narrative', text: 'Recorded.' },
            family: 'peace_plan',
            source_tier: 'icty_icj_un',
            response_options: [],
        } as unknown as EventDefinition;
    };
    return new Map([
        ['rbih_source', source('rbih_source', 'rbih_consequence')],
        ['rbih_consequence', consequence('rbih_consequence')],
        ['rs_source', source('rs_source', 'rs_consequence')],
        ['rs_consequence', consequence('rs_consequence')],
        ['z_source', source('z_source', 'z_consequence')],
        ['z_consequence', consequence('z_consequence')],
        ['a_source', source('a_source', 'a_consequence')],
        ['a_consequence', consequence('a_consequence')],
    ]);
}

function orderedReceiptState(): Record<string, any> {
    const state = rawCodexState();
    state.meta.turn = 90;
    state.military.event_decision_log = [
        {
            event_id: 'a_source',
            response_id: 'accept',
            decision_source: 'player',
            faction: 'RBiH',
            turn: 70,
        },
        {
            event_id: 'z_source',
            response_id: 'accept',
            decision_source: 'player',
            faction: 'RBiH',
            turn: 52,
        },
    ];
    state.military.event_causality_log = [
        {
            turn: 70,
            from_event: 'a_source',
            to_event: 'a_consequence',
            to_flag: null,
            kind: 'enables',
            source_response_id: 'accept',
        },
        {
            turn: 52,
            from_event: 'z_source',
            to_event: 'z_consequence',
            to_flag: null,
            kind: 'enables',
            source_response_id: 'accept',
        },
    ];
    state.military.fired_event_ids = ['a_consequence', 'z_consequence'];
    state.military.event_last_fired_turn = { a_consequence: 75, z_consequence: 60 };
    return state;
}

function rawCodexState(options: {
    playerFaction?: 'RBiH' | 'RS' | 'HRHB' | null;
    decisionFaction?: 'RBiH' | 'RS' | 'HRHB' | null;
    includeForeignReceipt?: boolean;
} = {}): Record<string, any> {
    const playerFaction = options.playerFaction === undefined ? 'RBiH' : options.playerFaction;
    const decisionFaction = options.decisionFaction === undefined ? 'RBiH' : options.decisionFaction;
    const decisions: Array<Record<string, unknown>> = [{
        event_id: 'rbih_source',
        response_id: 'accept',
        decision_source: 'player',
        faction: decisionFaction,
        turn: 50,
    }];
    const causality: Array<Record<string, unknown>> = [{
        turn: 50,
        from_event: 'rbih_source',
        to_event: 'rbih_consequence',
        to_flag: null,
        kind: 'enables',
        source_response_id: 'accept',
    }];
    if (options.includeForeignReceipt) {
        decisions.push({
            event_id: 'rs_source',
            response_id: 'accept',
            decision_source: 'player',
            faction: 'RS',
            turn: 51,
        });
        causality.push({
            turn: 51,
            from_event: 'rs_source',
            to_event: 'rs_consequence',
            to_flag: null,
            kind: 'enables',
            source_response_id: 'accept',
        });
    }
    return {
        meta: {
            turn: 80,
            phase: 'war',
            date: '1993-10-18',
            ...(playerFaction === null ? {} : { player_faction: playerFaction }),
        },
        political: {
            political_controllers: {},
            initial_political_controllers: {},
        },
        military: {
            formations: {},
            fired_event_ids: ['rbih_consequence', 'rs_consequence'],
            enabled_event_ids: [],
            closed_event_ids: [],
            event_flags: { federation_never_fractured: true },
            event_fire_counts: {},
            event_last_fired_turn: { rbih_consequence: 54, rs_consequence: 55 },
            event_decision_log: decisions,
            event_causality_log: causality,
        },
    };
}

describe('CodexPanel dynamic essay proof', () => {
    beforeEach(() => {
        storeState = { loadedGameState: null };
        setLocale('en');
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
    });

    it('mounts raw-state ghost and selected-player realized receipt proof in the live Codex', () => {
        const loaded = parseGameState(rawCodexState({ includeForeignReceipt: true }));
        storeState = { loadedGameState: loaded };

        renderPanel({
            state: loaded.rawGameState,
            eventCatalog: consequenceCatalog(),
        });

        const ghost = screen.getByTestId('codex-live-ghost');
        expect(ghost.getAttribute('data-ghost-id')).toBe('alliance_held');
        expect(ghost.getAttribute('data-claim-predicate')).toContain('federation_never_fractured');

        const receipt = screen.getByTestId('codex-realized-receipt');
        expect(receipt.getAttribute('data-receipt-record-id')).toBe(
            'receipt:rbih_source::accept::50::rbih_consequence',
        );
        expect(receipt.getAttribute('data-claim-predicate')).toContain('faction=RBiH');
        expect(receipt.getAttribute('data-claim-owner-paths')).toContain('state.military.event_decision_log');
        expect(receipt.getAttribute('data-claim-owner-paths')).toContain('state.military.event_causality_log');
        expect(receipt.getAttribute('data-claim-owner-paths')).toContain('state.military.fired_event_ids');
        expect(receipt.getAttribute('data-claim-owner-paths')).toContain('state.military.event_last_fired_turn');
        expect(screen.getByText('Consequence realized: Implementation review')).toBeTruthy();
        expect(screen.getByText(/Your decision "Accept the terms"/)).toBeTruthy();
        expect(screen.queryByText(
            'The campaign record ties this realized consequence to a filed player decision.',
        )).toBeNull();
        expect(screen.queryByText(/rs_source::accept/)).toBeNull();

        const ghostProse = screen.getByTestId('codex-live-ghost-prose');
        expect(ghost.textContent).toContain('The Federation That Did Not Fracture');
        expect(ghostProse.textContent).not.toContain('The Federation That Did Not Fracture');
        expect(ghostProse.textContent).not.toMatch(/(^|\n)\s*#/);
        expect(ghostProse.textContent).not.toContain('**');
    });

    it('keeps mounted Codex receipt order identical to Chronicle, Records, Cost Ledger, and the sim projector', () => {
        const raw = orderedReceiptState() as GameState;
        const catalog = consequenceCatalog();
        const loaded = parseGameState(raw);
        storeState = { loadedGameState: loaded };

        renderPanel({ state: loaded.rawGameState, eventCatalog: catalog });

        const mounted = screen.getAllByTestId('codex-realized-receipt')
            .map((row) => row.getAttribute('data-receipt-record-id'));
        const records = buildConsequenceReceipts(raw, catalog).map((receipt) => receipt.receiptRecordId);
        const simCodex = buildDynamicSections({ state: raw, currentTurn: 90 })
            .flatMap((section) => section.receipt_record_id ? [section.receipt_record_id] : []);
        const chronicle = generateChronicleEntries({
            rawGameState: raw,
            firedEvents: [],
            turn: 90,
        } as any, catalog).flatMap((entry) => entry.metadata?.receiptRecordId
            ? [entry.metadata.receiptRecordId]
            : []);
        const costLedger = (buildCostLedger(raw).consequence_receipts ?? [])
            .map((receipt) => receipt.receipt_record_id);
        const expected = [
            'receipt:z_source::accept::52::z_consequence',
            'receipt:a_source::accept::70::a_consequence',
        ];

        for (const ids of [mounted, records, simCodex, chronicle, costLedger]) {
            expect(ids).toEqual(expected);
        }
    });

    it('localizes mounted realized receipts in BCS without duplicating the Codex title', () => {
        setLocale('bcs');
        const loaded = parseGameState(rawCodexState());
        storeState = { loadedGameState: loaded };

        renderPanel({
            state: loaded.rawGameState,
            eventCatalog: consequenceCatalog(),
        });

        expect(screen.getByText('Posljedica ostvarena: Pregled provedbe')).toBeTruthy();
        expect(screen.getByText(/Vasa odluka "Prihvati uslove"/)).toBeTruthy();
        expect(screen.getByText('Kodeks kampanje')).toBeTruthy();
        expect(screen.getAllByText('Kodeks')).toHaveLength(1);
        expect(screen.queryByText(/The campaign record ties/)).toBeNull();
        expect(screen.queryByText('Alliance Held')).toBeNull();
        expect(screen.queryByText('Path not taken')).toBeNull();
        expect(screen.getByText('Savez je odrzao liniju')).toBeTruthy();
        expect(screen.queryByText(/Implementation review|Accept the terms|English dossier/)).toBeNull();
    });

    it('renders divergence context without inherited path-not-taken metadata', () => {
        const raw = rawCodexState();
        raw.military.event_flags = { vrs_quality_inverted: true };
        raw.military.event_decision_log = [];
        raw.military.event_causality_log = [];
        raw.military.fired_event_ids = [];
        raw.military.event_last_fired_turn = {};
        const loaded = parseGameState(raw);
        storeState = { loadedGameState: loaded };

        renderPanel({ state: loaded.rawGameState, eventCatalog: consequenceCatalog() });

        const row = screen.getByTestId('codex-live-ghost');
        expect(row.getAttribute('data-ghost-classification')).toBe('divergence_context');
        expect(row.textContent).toContain('Campaign divergence');
        expect(row.textContent).not.toMatch(/path[-\s]?not[-\s]?taken/i);
        expect(screen.getByText('Campaign Codex')).toBeTruthy();
    });

    it('localizes BCS divergence context without either path-not-taken label', () => {
        setLocale('bcs');
        const raw = rawCodexState();
        raw.military.event_flags = { vrs_quality_inverted: true };
        raw.military.event_decision_log = [];
        raw.military.event_causality_log = [];
        raw.military.fired_event_ids = [];
        raw.military.event_last_fired_turn = {};
        const loaded = parseGameState(raw);
        storeState = { loadedGameState: loaded };

        renderPanel({ state: loaded.rawGameState, eventCatalog: consequenceCatalog() });

        const row = screen.getByTestId('codex-live-ghost');
        expect(row.getAttribute('data-ghost-classification')).toBe('divergence_context');
        expect(row.textContent).toContain('Odstupanje kampanje');
        expect(row.textContent).not.toContain('Put kojim se nije krenulo');
        expect(row.textContent).not.toMatch(/path[-\s]?not[-\s]?taken/i);
        expect(screen.getByText('Kodeks kampanje')).toBeTruthy();
    });

    it('gates the live dynamic projection while Codex is closed', () => {
        expect(shouldProjectLiveDynamicCodex(false, rawCodexState() as GameState)).toBe(false);
        expect(shouldProjectLiveDynamicCodex(true, undefined)).toBe(false);
        expect(shouldProjectLiveDynamicCodex(true, rawCodexState() as GameState)).toBe(true);
    });

    it.each([
        ['foreign decision', rawCodexState({ decisionFaction: 'RS' })],
        ['null-faction decision', rawCodexState({ decisionFaction: null })],
        ['absent selected player', rawCodexState({ playerFaction: null })],
    ])('keeps live Codex receipts absent for %s', (_label, rawState) => {
        const loaded = parseGameState(rawState);
        storeState = { loadedGameState: loaded };

        renderPanel({
            state: loaded.rawGameState,
            eventCatalog: consequenceCatalog(),
        });

        expect(screen.queryByTestId('codex-realized-receipt')).toBeNull();
        if (_label === 'absent selected player') {
            expect(screen.queryByTestId('codex-live-ghost')).toBeNull();
        }
    });

    it('surfaces Srebrenica as a ghost entry when the rupture never occurred', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [],
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: -6,
                    territory_divergence: {},
                    casualty_ratio: 0.8,
                    displacement_ratio: 0.7,
                    rupture_divergence: [],
                    divergence_notes: ['Srebrenica enclave survived'],
                },
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        expect(screen.getByText('The Fall of Srebrenica: Europe\'s Worst Atrocity Since 1945')).toBeTruthy();
        expect(screen.getAllByText('Ghost').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByText('The Fall of Srebrenica: Europe\'s Worst Atrocity Since 1945'));

        expect(screen.getByText('Historical Ghost Entry')).toBeTruthy();
        expect(
            screen.getByText('This entry records the historical fall of Srebrenica. In your war, the enclave survived; the historical July 1995 catastrophe never arrived.'),
        ).toBeTruthy();
    });

    it('localizes BCS empty-selection Codex chrome', () => {
        setLocale('bcs');

        renderPanel();

        expect(screen.getByText('Kodeks')).toBeTruthy();
        expect(screen.getByText(`${startVisibleEssayCount} eseja dostupno`)).toBeTruthy();
        expect(screen.getByText('Izaberite esej')).toBeTruthy();
        expect(screen.queryByText('Select an essay')).toBeNull();
        expect(screen.getByText(/Historijski zapisi dostupni su od početka scenarija/)).toBeTruthy();
    });

    it('hides not-yet-faced future dilemma titles during an active campaign', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('rbih_state_identity')],
                gameOver: false,
                turn: 0,
                dilemmaSpine: [
                    {
                        dilemmaId: 'rbih_state_identity',
                        title: 'What Is Bosnia?',
                        essayId: 'essay_independence_referendum_1992',
                        sensitive: false,
                        faced: true,
                        chosenResponseId: 'civic',
                        chosenBranchLabel: 'Civic multi-ethnic republic',
                        decisionTurn: 0,
                    },
                    {
                        dilemmaId: 'srebrenica_demilitarization',
                        title: 'The Demilitarization of Srebrenica',
                        essayId: null,
                        sensitive: true,
                        faced: false,
                        chosenResponseId: null,
                        chosenBranchLabel: null,
                        decisionTurn: null,
                    },
                    {
                        dilemmaId: 'vance_owen_plan',
                        title: 'The Vance-Owen Peace Plan',
                        essayId: null,
                        sensitive: false,
                        faced: false,
                        chosenResponseId: null,
                        chosenBranchLabel: null,
                        decisionTurn: null,
                    },
                    {
                        dilemmaId: 'contact_group_plan',
                        title: 'The Contact Group Plan',
                        essayId: null,
                        sensitive: false,
                        faced: false,
                        chosenResponseId: null,
                        chosenBranchLabel: null,
                        decisionTurn: null,
                    },
                ],
            },
        };

        renderPanel();

        const panel = screen.getByTestId('codex-panel');
        expect(screen.getByText('What Is Bosnia?')).toBeTruthy();
        expect(panel.textContent).not.toContain('The Demilitarization of Srebrenica');
        expect(panel.textContent).not.toContain('The Vance-Owen Peace Plan');
        expect(panel.textContent).not.toContain('The Contact Group Plan');
        expect(screen.queryAllByTestId('codex-dilemma-row')).toHaveLength(1);
    });

    it('allows the full dilemma spine after game over as historical reflection', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [],
                gameOver: true,
                turn: 188,
                dilemmaSpine: [
                    {
                        dilemmaId: 'vance_owen_plan',
                        title: 'The Vance-Owen Peace Plan',
                        essayId: null,
                        sensitive: false,
                        faced: false,
                        chosenResponseId: null,
                        chosenBranchLabel: null,
                        decisionTurn: null,
                    },
                ],
            },
        };

        renderPanel();

        expect(screen.getByText('The Vance-Owen Peace Plan')).toBeTruthy();
    });

    it('does not turn late calendar context into an unrecorded campaign outcome', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('nato_air_strike_threat_1993')],
                gameOver: false,
                turn: 188,
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1993'));
        fireEvent.click(screen.getByText("NATO's First Ultimatum: The August 1993 Air Strike Threat"));

        const body = screen.getByTestId('codex-selected-essay-body').textContent ?? '';
        expect(body).not.toContain('VRS forces withdrew from the newly captured Igman and Bjelasnica positions');
        expect(body).not.toContain('the RS leadership holds the Igman positions');
    });

    it('localizes BCS Codex dilemma and history-comparison chrome without translating authored labels', () => {
        setLocale('bcs');
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('arms_embargo_impact_1992')],
                turn: 40,
                dilemmaSpine: [
                    {
                        dilemmaId: 'arms_embargo',
                        title: 'Arms embargo decision',
                        essayId: 'essay_arms_embargo_impact_1992',
                        sensitive: false,
                        faced: true,
                        chosenResponseId: 'appeal',
                        chosenBranchLabel: 'Appeal for relief',
                        decisionTurn: 12,
                    },
                ],
                distanceFromHistory: {
                    totalDecided: 2,
                    matchedHistory: 1,
                    diverged: 1,
                    divergencePct: 50,
                    playerDiverged: 1,
                    divergences: [
                        {
                            eventId: 'arms_embargo_impact_1992',
                            title: 'Arms Embargo',
                            chosen: 'Appeal for relief',
                            historical: 'Endure the embargo',
                            chosenResponseId: 'appeal',
                            historicalResponseId: 'endure',
                            turn: 12,
                            faction: 'RBiH',
                            source: 'player',
                        },
                    ],
                },
            },
        };

        renderPanel();

        const panel = screen.getByTestId('codex-panel');
        expect(screen.getByText('Izbori koji su oblikovali ovaj rat')).toBeTruthy();
        expect(screen.getByText('Suočeno')).toBeTruthy();
        expect(screen.getByText(/Izabrano:/)).toBeTruthy();
        expect(screen.getByText('Čitaj esej')).toBeTruthy();
        expect(screen.getByText('Vaš rat i historija')).toBeTruthy();
        expect(screen.getByText('Vaše')).toBeTruthy();

        expect(panel.textContent).not.toContain('The Choices That Made This War');
        expect(panel.textContent).not.toContain('Faced');
        expect(panel.textContent).not.toContain('Not yet');
        expect(panel.textContent).not.toContain('Chose:');
        expect(panel.textContent).not.toContain('Read essay');
        expect(panel.textContent).not.toContain('Locked');
        expect(panel.textContent).not.toContain('No essay');
        expect(panel.textContent).not.toContain('Your War vs History');
        expect(panel.textContent).not.toContain('You authored');
        expect(panel.textContent).not.toContain('Yours');
    });

    it('renders live divergence notes inside the Dayton essay after game over', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('dayton_signed_1995')],
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 6,
                    territory_divergence: { RS: -3 },
                    casualty_ratio: 0.9,
                    displacement_ratio: 0.95,
                    rupture_divergence: [],
                    divergence_notes: [
                        'War lasted 6 weeks longer than the historical 182 weeks',
                        'Federation controlled 54.0% territory vs historical 51%',
                    ],
                },
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        const essayRow = screen.getByText('The Dayton Agreement: Ending the War, Freezing the Questions').closest('button');
        expect(essayRow?.getAttribute('data-testid')).toBe('codex-essay-row');
        expect(essayRow?.getAttribute('data-awwv-codex-state')).toBe('unlocked');
        expect(essayRow?.getAttribute('data-selected')).toBe('false');
        fireEvent.click(essayRow!);

        expect(screen.getByTestId('codex-selected-essay')).toBeTruthy();
        expect(screen.getByTestId('codex-selected-essay').getAttribute('data-essay-id')).toBe('essay_dayton_signed_1995');
        expect(screen.getByTestId('codex-selected-essay-body').getAttribute('data-awwv-codex-selected-state')).toBe('unlocked');
        expect(essayRow?.getAttribute('data-selected')).toBe('true');
        expect(screen.getAllByText('Player War Divergence')).toHaveLength(2);
        expect(screen.getByText('War lasted 6 weeks longer than the historical 182 weeks')).toBeTruthy();
        expect(screen.getByText('Federation controlled 54.0% territory vs historical 51%')).toBeTruthy();
    });

    it('localizes generated BCS divergence notes inside dynamic Codex essays', () => {
        setLocale('bcs');
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('dayton_signed_1995')],
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 6,
                    territory_divergence: { RS: -3 },
                    casualty_ratio: 0.9,
                    displacement_ratio: 0.95,
                    rupture_divergence: [],
                    divergence_notes: [
                        'War lasted 6 weeks longer than the historical 182 weeks',
                        'Federation controlled 54.0% territory vs historical 51%',
                    ],
                },
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        fireEvent.click(screen.getByText('Daytonski sporazum: kraj rata, zamrznuta pitanja'));

        expect(screen.getAllByText('Odstupanje igračevog rata').length).toBeGreaterThanOrEqual(2);
        expect(screen.queryByText('Player War Divergence')).toBeNull();
        expect(screen.getByText('Historijski kontekst')).toBeTruthy();
        expect(screen.queryByText('War lasted 6 weeks longer than the historical 182 weeks')).toBeNull();
        expect(screen.getByText('Podaci iz zavrsnog zapisa: Rat je trajao 6 sedmica duže od historijskih 182 sedmica.')).toBeTruthy();
        expect(screen.getByText('Federacija je kontrolisala 54.0% teritorije naspram historijskih 51%.')).toBeTruthy();
    });

    it('renders Cost Ledger prosecutorial findings in Codex endgame essays', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('dayton_signed_1995')],
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 0,
                    territory_divergence: {},
                    casualty_ratio: 1,
                    displacement_ratio: 1,
                    rupture_divergence: [],
                    divergence_notes: [],
                },
                costLedger: {
                    war_duration_weeks: 188,
                    entries: [],
                    rupture_consequences: [],
                    total_military_killed: 46500,
                    total_civilian_killed: 38000,
                    findings: [
                        {
                            id: 'human_cost_record',
                            category: 'human_cost',
                            severity: 'grave',
                            title: 'Human cost record',
                            text: 'The ledger records 46,500 military killed and 38,000 civilian killed.',
                            sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
                        },
                        {
                            id: 'war_crimes_record_RS',
                            category: 'war_crimes',
                            severity: 'grave',
                            faction: 'RS',
                            title: 'RS war-crimes record',
                            text: 'RS capital records contain 14 war-crime events.',
                            sources: ['Sensitive History Design Gate §4'],
                        },
                    ],
                },
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        fireEvent.click(screen.getByText('The Dayton Agreement: Ending the War, Freezing the Questions'));

        expect(screen.getAllByText('Player War Divergence').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Human cost record: The ledger records 46,500 military killed and 38,000 civilian killed.')).toBeTruthy();
        expect(screen.getAllByText(/Sources: RDC Sarajevo/).length).toBeGreaterThanOrEqual(1);
    });

    it('mounts Tier 0-2 historical records at scenario start without campaign annotations', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [],
                gameOver: false,
            },
        };

        renderPanel();

        expect(screen.getByText('1995')).toBeTruthy();
        fireEvent.click(screen.getByText('1995'));
        const daytonTitle = 'The Dayton Agreement: Ending the War, Freezing the Questions';
        expect(screen.getByText(daytonTitle)).toBeTruthy();
        fireEvent.click(screen.getByText(daytonTitle));
        expect(screen.getByTestId('codex-selected-essay-body')).toBeTruthy();
        expect(screen.queryByText('Player War Divergence')).toBeNull();
        expect(screen.queryByText('Historical Ghost Entry')).toBeNull();
    });
});
