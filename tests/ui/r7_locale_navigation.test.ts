// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import war1992Events from '../../data/scenarios/events/war_1992.json';
import type { EventDefinition, PendingEventDecision } from '../../src/sim/events/event_types';
import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal';
import { MainMenu } from '../../src/ui/map/components/MainMenu';
import { PeaceWarTransition } from '../../src/ui/map/components/PeaceWarTransition';
import { PresidentialInbox } from '../../src/ui/map/components/PresidentialInbox';
import { PresidentDeskShell } from '../../src/ui/map/components/presidential_desk/PresidentDeskShell';
import { WarHasBegunSplash } from '../../src/ui/map/components/WarHasBegunSplash';
import type { InboxItem } from '../../src/ui/map/data/inboxItems';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import { setLocale, setQaLocale, type RuntimeLocale } from '../../src/ui/map/i18n';
import { useGameStore } from '../../src/ui/map/store/gameStore';

const catalogDefinition = (war1992Events as EventDefinition[])
    .find((event) => event.id === 'rbih_state_identity');

if (!catalogDefinition?.response_options || !catalogDefinition.historical_default_response_id) {
    throw new Error('RBiH foundational decision fixture is incomplete');
}
const foundationalDefinition: EventDefinition = catalogDefinition;
const foundationalResponseOptions = catalogDefinition.response_options;
const historicalResponseId = catalogDefinition.historical_default_response_id;
const foundationalCatalog = new Map<string, EventDefinition>([
    [foundationalDefinition.id, foundationalDefinition],
]);

const foundationalDecision: PendingEventDecision = {
    event_id: foundationalDefinition.id,
    event_title: foundationalDefinition.title ?? foundationalDefinition.id,
    narrative: foundationalDefinition.narrative,
    staff_assessment: foundationalDefinition.staff_assessment,
    trigger_evidence: foundationalDefinition.trigger_evidence,
    historical_source: foundationalDefinition.historical_source,
    source_note: foundationalDefinition.source_note,
    category: foundationalDefinition.category,
    turn_fired: 0,
    response_options: foundationalResponseOptions,
    historical_default_response_id: historicalResponseId,
    faction: 'RBiH',
    requires_player_response: true,
};

const loadedState = {
    label: 'RBiH turn 0',
    turn: 0,
    phase: 'war',
    formations: [],
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
    player_faction: 'RBiH',
    metadata: { turn: 0, date: '6 Apr 1992' },
    pendingEventDecisions: [foundationalDecision],
} satisfies LoadedGameState;

type JourneyStage = 'menu' | 'war-start' | 'briefing' | 'inbox' | 'desk' | 'decision' | 'complete';

function FoundationalDeskJourney({
    onResolved,
}: {
    onResolved: (eventId: string, responseId: string) => void;
}) {
    const [stage, setStage] = useState<JourneyStage>('menu');

    if (stage === 'menu') {
        return createElement(MainMenu, {
            hasSave: false,
            onNewGame: (faction) => {
                if (faction === 'RBiH') setStage('war-start');
            },
            onContinue: () => undefined,
            onLoadGame: () => undefined,
            onSettings: () => undefined,
            onCredits: () => undefined,
            onQuit: () => undefined,
        });
    }
    if (stage === 'war-start') {
        return createElement(WarHasBegunSplash, {
            onDismiss: () => setStage('briefing'),
            holdMs: 60_000,
        });
    }
    if (stage === 'briefing') {
        return createElement(PeaceWarTransition, {
            onDismiss: () => setStage('inbox'),
            state: loadedState,
        });
    }

    const routeAction = (action: InboxItem['action'], itemId: string) => {
        if (action === 'decision_room' && itemId === 'opening-brief:desk') setStage('desk');
        if (action === 'event_modal' && itemId === `event:${foundationalDecision.event_id}`) setStage('decision');
    };

    if (stage === 'inbox') {
        return createElement(PresidentialInbox, {
            onAction: routeAction,
            eventCatalog: foundationalCatalog,
        });
    }
    if (stage === 'desk') {
        return createElement(PresidentDeskShell, {
            state: loadedState,
            osidNameMap: null,
            eventCatalog: foundationalCatalog,
            onAction: routeAction,
            onAdvance: () => undefined,
            onOpenArmyHQ: () => undefined,
            onOpenRecords: () => undefined,
        });
    }
    if (stage === 'decision') {
        return createElement(EventDecisionModal, {
            decision: foundationalDecision,
            eventCatalog: foundationalCatalog,
            onRespond: (eventId, responseId) => {
                onResolved(eventId, responseId);
                setStage('complete');
            },
        });
    }
    return createElement('div', { 'data-testid': 'historical-default-journey-complete' });
}

describe('locale-independent foundational Desk journey', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
        vi.useRealTimers();
        useGameStore.setState(useGameStore.getInitialState());
    });

    for (const locale of ['en', 'bs', 'qps'] as const satisfies readonly RuntimeLocale[]) {
        it(`routes from campaign selection through the Desk to the historical default in ${locale}`, async () => {
            if (locale === 'qps') setQaLocale(locale);
            else setLocale(locale);
            useGameStore.setState({
                loadedGameState: loadedState,
                openingBriefDismissed: false,
                osidDisplayNames: null,
            });

            const resolved = vi.fn();
            render(createElement(FoundationalDeskJourney, { onResolved: resolved }));

            fireEvent.click(screen.getByTestId('main-menu-faction-RBiH'));

            vi.useFakeTimers();
            fireEvent.click(screen.getByTestId('war-start-splash-acknowledge'));
            await act(async () => vi.advanceTimersByTimeAsync(801));
            vi.useRealTimers();

            fireEvent.click(screen.getByTestId('peace-war-briefing-begin'));
            fireEvent.click(screen.getByTestId('presidential-inbox-opening-brief-open-desk'));

            const decisionCard = screen.getByTestId('desk-card-event_decision');
            expect(decisionCard.getAttribute('data-inbox-item-id')).toBe('event:rbih_state_identity');
            fireEvent.click(within(decisionCard).getByTestId('desk-card-action'));

            const historicalResponse = screen.getAllByTestId('event-decision-response')
                .find((response) => response.getAttribute('data-response-id') === historicalResponseId);
            if (!historicalResponse) throw new Error(`Missing historical response ${historicalResponseId}`);
            fireEvent.click(historicalResponse);

            expect(historicalResponseId).toBe('civic');
            expect(resolved).toHaveBeenCalledWith('rbih_state_identity', historicalResponseId);
            expect(screen.getByTestId('historical-default-journey-complete')).toBeTruthy();
        });
    }
});
