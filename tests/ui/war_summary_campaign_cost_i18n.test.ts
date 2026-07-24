// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';

const storeState: { loadedGameState: LoadedGameState | null } = {
    loadedGameState: null,
};

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}));

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { WarSummaryContent } = await import('../../src/ui/map/components/army_hq/WarSummaryContent');

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
    return {
        turn: 8,
        battles: [{
            osid: 'osid_test',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            primary_attacker_id: 'arbih_test_brigade',
            primary_defender_id: 'rs_test_brigade',
            all_attacker_ids: ['arbih_test_brigade'],
            outcome: 'repulsed',
            attacker_casualties: 80,
            defender_casualties: 55,
            territory_flipped: false,
            was_concentrated: false,
        }],
        territory_net: { RBiH: -1 },
        notable_flips: [],
        displacement_total: 2600,
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
        ...overrides,
    };
}

function stateWithCampaignCost(): LoadedGameState {
    return {
        ...makeMockLoadedGameState(),
        label: 'Turn 8',
        turn: 8,
        player_faction: 'RBiH',
        latestTurnSummary: makeSummary(),
        turnSummaries: [makeSummary({ turn: 7, displacement_total: 1200 })],
    } as LoadedGameState;
}

function stateWithOperationalSitrep(): LoadedGameState {
    return {
        ...stateWithCampaignCost(),
        operationalSitrep: {
            headline: 'Widespread thinly held front sectors need staff review.',
            headlineToken: { key: 'operationalSitrep.headline.frontExposed.widespread' },
            territory: { territoryPercent: 50, settlementsControlled: 1, settlementsTotal: 2 },
            front: { engagedCount: 4, exposedCount: 2, edges: [] },
            readiness: { weakestBrigades: [], encircledCount: 0 },
            sustainment: {
                adequateCount: 1,
                strainedCount: 1,
                criticalCount: 0,
                collapsedMunicipalities: [],
                hostileTakeoverMunicipalityCount: 0,
                hostileTakeoverMunicipalities: [],
                activeHostileTakeoverTimers: 0,
                activeCamps: 0,
            },
            operations: { activeCount: 0, corps: [] },
            alerts: [{
                id: 'collapse-eligible',
                severity: 'critical',
                text: 'Faction is collapse-eligible.',
                textToken: { key: 'operationalSitrep.alert.collapseEligible' },
            }],
        },
    } as LoadedGameState;
}

function stateWithStrategicObjectives(): LoadedGameState {
    const state = stateWithOperationalSitrep();
    return {
        ...state,
        formations: [
            ...state.formations,
            {
                id: 'arbih_1st_corps', faction: 'RBiH', name: '1st Corps', kind: 'corps',
                readiness: 'ready', status: 'active', createdTurn: 0, tags: [],
            },
        ],
        strategicDimensions: {
            RBiH: {
                territorial_legitimacy: { base_value: 40, event_modifier: -5, effective_value: 35 },
                military_credibility: { base_value: 64, event_modifier: 8, effective_value: 72 },
                internal_cohesion: { base_value: 55, event_modifier: 0, effective_value: 55 },
            },
        },
        operations: [{
            corps_id: 'arbih_1st_corps', corps_name: '1st Corps', faction: 'RBiH',
            name: 'operation_sarajevo_relief', display_name: 'Sarajevo Relief', type: 'offensive',
            phase: 'execution', participating_brigade_count: 3, started_turn: 6,
        }],
        pendingReserveRequests: [{
            request_id: 'reserve_alpha', corps_id: 'arbih_1st_corps', faction: 'RBiH',
            reason: 'defensive_gap', priority: 82, severityBand: 'critical', travel_hops: 2,
            description: 'Thin line', suggested_brigade_id: 'arbih_guards', turn_requested: 8,
        }],
        allControlEvents: [
            { turn: 8, settlementId: 'op:test:lost', from: 'RBiH', to: 'RS', mechanism: 'combat' },
        ],
        war_alliance_rbih_hrhb: 0.42,
    } as LoadedGameState;
}

describe('War Summary campaign cost localization', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
        storeState.loadedGameState = null;
    });

    it('renders BCS campaign cost chrome in the overview', () => {
        setLocale('bcs');
        storeState.loadedGameState = stateWithCampaignCost();

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const campaignCost = screen.getByTestId('war-summary-campaign-cost');
        expect(screen.getByText('Teritorija')).toBeTruthy();
        expect(screen.getByText('Prijateljska kontrola')).toBeTruthy();
        expect(screen.getByText('Neprijateljska kontrola se ovdje sažimlje kroz procjene štaba i izvještaje fronta, ne kao tačni ukupni brojevi po frakciji.')).toBeTruthy();
        expect(screen.getByText('Vojna snaga')).toBeTruthy();
        expect(screen.getByText('Ljudstvo pod oružjem')).toBeTruthy();
        expect(screen.getByText('Raseljavanje')).toBeTruthy();
        expect(screen.getByText('Raseljeni u teatru')).toBeTruthy();
        expect(screen.getByText('Raseljeni na vlastitoj strani')).toBeTruthy();
        expect(screen.getByText('Neprijateljsko raseljavanje nije ovdje razbijeno kao tačni ukupni brojevi po frakciji u igračevom sigurnom prikazu.')).toBeTruthy();
        expect(screen.getByText('Cijena kampanje')).toBeTruthy();
        expect(within(campaignCost).getByText('Težina')).toBeTruthy();
        expect(within(campaignCost).getByText('kritičan')).toBeTruthy();
        expect(within(campaignCost).getByText('Prijateljski gubici')).toBeTruthy();
        expect(within(campaignCost).getByText('Raseljeni')).toBeTruthy();
        expect(within(campaignCost).getByText('Teritorijalni saldo')).toBeTruthy();
        expect(campaignCost.textContent).not.toContain('critical');
        expect(campaignCost.textContent).not.toContain('Neto OSID');
        expect(screen.queryByText('Campaign Cost')).toBeNull();
        expect(screen.queryByText('Enemy control is summarized through staff assessments and front reports, not exact faction-wide totals.')).toBeNull();
    });

    it('renders BCS operational SITREP token copy in the overview', () => {
        setLocale('bcs');
        storeState.loadedGameState = stateWithOperationalSitrep();

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const text = screen.getByText('Operativni izvjestaj').parentElement?.textContent ?? '';
        expect(text).toContain('Široko rasprostranjeni tanko držani frontovski sektori traže pregled štaba.');
        expect(text).toContain('Frakcija ispunjava uslove za kolaps.');
        expect(text).not.toContain('Widespread thinly held front sectors need staff review.');
        expect(text).not.toContain('Faction is collapse-eligible.');
        expect(text).not.toContain('collapse-eligible');
    });

    it('labels cumulative campaign casualties and renders collapsed sustainment', () => {
        const state = stateWithOperationalSitrep();
        storeState.loadedGameState = {
            ...state,
            casualtyLedger: {
                RBiH: { killed: 12_000, wounded: 17_000, missing_captured: 500 },
            },
            operationalSitrep: {
                ...state.operationalSitrep!,
                sustainment: {
                    ...state.operationalSitrep!.sustainment,
                    collapsedMunicipalities: ['op:test:a', 'op:test:b'],
                },
            },
        } as LoadedGameState;

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const campaignCost = screen.getByTestId('war-summary-campaign-cost');
        expect(campaignCost.textContent).toContain('Campaign cost so far: 12,000 killed / 17,000 wounded / 500 missing or captured');
        expect(within(campaignCost).getByText('29.5k')).toBeTruthy();
        const sitrep = screen.getByText('Situation Report').parentElement?.textContent ?? '';
        expect(sitrep).toContain('0 critical / 1 strained, 2 collapsed');
    });

    it('renders missing casualty and displacement sources as unreported in the overview', () => {
        storeState.loadedGameState = {
            ...makeMockLoadedGameState(),
            player_faction: 'RBiH',
            casualtyLedger: undefined,
            departedByOsid: undefined,
            displacementByMun: undefined,
        } as LoadedGameState;

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const copy = document.body.textContent ?? '';
        expect(copy).toMatch(/Killed\s*Unreported/i);
        expect(copy).toMatch(/Wounded\s*Unreported/i);
        expect(copy).toMatch(/Theater-wide displaced\s*Unreported/i);
        expect(copy).toMatch(/Own-side displaced\s*Unreported/i);
    });

    it('preserves explicit zero casualty and displacement records in the overview', () => {
        storeState.loadedGameState = {
            ...makeMockLoadedGameState(),
            player_faction: 'RBiH',
            casualtyLedger: { RBiH: { killed: 0, wounded: 0, missing_captured: 0 } },
            departedByOsid: { 'op:test:zero': { RBiH: 0 } },
            displacementByMun: undefined,
        } as LoadedGameState;

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const copy = document.body.textContent ?? '';
        expect(copy).toMatch(/Killed\s*0/i);
        expect(copy).toMatch(/Wounded\s*0/i);
        expect(copy).toMatch(/Theater-wide displaced\s*0/i);
        expect(copy).toMatch(/Own-side displaced\s*0/i);
        expect(copy).not.toMatch(/Killed\s*Unreported/i);
    });

    it('renders four accessible RBiH strategic objectives with canonical owner links', () => {
        storeState.loadedGameState = stateWithStrategicObjectives();

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const section = screen.getByRole('region', { name: 'Strategic Objectives' });
        const objectives = within(section).getAllByRole('article');
        expect(objectives).toHaveLength(4);
        expect(objectives.every((objective) => objective.className.includes('text-[12px]'))).toBe(true);
        expect(objectives[0]?.textContent).toContain('Protect state survival');
        expect(objectives[0]?.textContent).toContain('StatusCritical');
        expect(objectives[0]?.textContent).toContain('TrendWorsening');
        expect(objectives[0]?.textContent).toContain('Responsible command1st Corps');
        expect(objectives[0]?.textContent).toContain('Current commitment4 front contacts / 2 thinly held');
        expect(objectives[0]?.textContent).toContain('Last relevant consequenceTurn 8: territorial control was lost.');
        expect(objectives[2]?.textContent).toContain('StatusUnreported');
        expect(objectives[2]?.textContent).toContain('Responsible commandUnreported');
        expect(within(section).getAllByRole('button', { name: /Decision Room: Review/i }).length).toBeGreaterThan(0);
        expect(within(section).getAllByRole('button', { name: /Army HQ: Review/i }).length).toBeGreaterThan(0);
    });

    it('renders strategic objective labels and unavailable truth in BCS', () => {
        setLocale('bcs');
        storeState.loadedGameState = stateWithStrategicObjectives();

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const section = screen.getByRole('region', { name: 'Strateski ciljevi' });
        expect(section.textContent).toContain('Zastiti opstanak drzave');
        expect(section.textContent).toContain('Odgovorna komanda');
        expect(section.textContent).toContain('Sljedeca dostupna poluga');
        expect(section.textContent).toContain('Posljednja relevantna posljedica');
        expect(section.textContent).toContain('Nije prijavljeno');
    });
});
