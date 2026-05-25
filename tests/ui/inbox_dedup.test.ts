// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { PresidentialInbox } from '../../src/ui/map/components/PresidentialInbox.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n';

function makeLoadedState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'RS turn 12',
        turn: 12,
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
        player_faction: 'RS',
        ...overrides,
    } as LoadedGameState;
}

function officerEvent(
    eventId: string,
    type: NonNullable<LoadedGameState['pendingOfficerEvents']>[number]['type'] = 'officer_available',
) {
    return {
        event_id: eventId,
        type,
        faction: 'RS',
        turn: 12,
        officer_id: 'ratko_mladic',
        officer_name: 'Ratko Mladic',
        officer_competence: 0.9,
        officer_aggressiveness: 0.9,
        officer_defensive_skill: 0.75,
        acknowledged: false,
    } satisfies NonNullable<LoadedGameState['pendingOfficerEvents']>[number];
}

describe('Presidential Inbox officer event dedupe', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('dedupes repeated officer events by event kind and officer subject', () => {
        const state = makeLoadedState({
            pendingOfficerEvents: [
                officerEvent('officer_1'),
                officerEvent('officer_2'),
                officerEvent('officer_3'),
                officerEvent('officer_4'),
                officerEvent('replacement_1', 'replacement_suggested'),
            ],
        });

        const officerItems = deriveInboxItems(state, null).filter((item) => item.type === 'officer_event');

        expect(officerItems).toHaveLength(2);
        expect(officerItems.find((item) => item.title === 'Personnel Matter')).toMatchObject({
            id: 'officer:officer_available:ratko_mladic',
            updateCount: 4,
            subtitle: 'Regarding Ratko Mladic.',
        });
        expect(officerItems.find((item) => item.title === 'Commander Replacement')).toMatchObject({
            id: 'officer:replacement_suggested:ratko_mladic',
            updateCount: 1,
        });
    });

    it('renders a +N updates chip for deduped inbox cards', () => {
        const onAction = vi.fn();
        useGameStore.setState({
            loadedGameState: makeLoadedState({
                pendingOfficerEvents: [
                    officerEvent('officer_1'),
                    officerEvent('officer_2'),
                    officerEvent('officer_3'),
                    officerEvent('officer_4'),
                ],
            }),
            openingBriefDismissed: true,
            osidDisplayNames: null,
        });

        render(createElement(PresidentialInbox, { onAction }));

        expect(screen.getByText('+3 updates')).toBeTruthy();
        expect(screen.getAllByText('Personnel Matter')).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: /personnel matter/i }));
        expect(onAction).toHaveBeenCalledWith('army_hq_personnel', 'officer:officer_available:ratko_mladic');
    });

    it('renders a quiet-inbox desk capsule when no decisions are pending', () => {
        const onAction = vi.fn();
        useGameStore.setState({
            loadedGameState: makeLoadedState({ turn: 12 }),
            openingBriefDismissed: true,
            osidDisplayNames: null,
        });

        render(createElement(PresidentialInbox, { onAction }));

        expect(screen.getByText("President's Desk")).toBeTruthy();
        expect(screen.getByText('Chronicle')).toBeTruthy();
        expect(screen.getByText('No orders are waiting on your desk.')).toBeTruthy();
        expect(screen.queryByText('No pending decisions.')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /open desk/i }));
        expect(onAction).toHaveBeenCalledWith('army_hq_briefing', 'empty:desk');
    });

    it('localizes quiet inbox shell copy in BCS mode', () => {
        setLocale('bcs');
        const onAction = vi.fn();
        useGameStore.setState({
            loadedGameState: makeLoadedState({ turn: 12 }),
            openingBriefDismissed: true,
            osidDisplayNames: null,
        });

        render(createElement(PresidentialInbox, { onAction }));

        expect(screen.getByText('Predsjednicki inbox')).toBeTruthy();
        expect(screen.getByText('Komandno dezurstvo')).toBeTruthy();
        expect(screen.getByText('Na stolu nema naredbi koje cekaju vasu odluku.')).toBeTruthy();
        expect(screen.getByText('Otvori sto')).toBeTruthy();
        expect(screen.queryByText('Presidential Inbox')).toBeNull();
    });

    it('renders intelligence notifications with an explicit dismiss command', () => {
        const onAction = vi.fn();
        useGameStore.setState({
            loadedGameState: makeLoadedState({
                player_faction: 'RBiH',
                pendingEventNotifications: [
                    {
                        notification_id: 'rs_strategic_goals:RS:RBiH',
                        event_id: 'rs_strategic_goals',
                        source_faction: 'RS',
                        target_faction: 'RBiH',
                        response_id: 'all_six',
                        surfaced_on_turn: 12,
                        headline: 'RS Assembly endorses Six Strategic Goals',
                        body: 'Sarajevo intelligence reads the platform as a hardening of territorial war aims.',
                        consumed: false,
                    },
                ],
            }),
            openingBriefDismissed: true,
            osidDisplayNames: null,
        });

        render(createElement(PresidentialInbox, { onAction }));

        expect(screen.getByText('INTEL')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /dismiss intelligence notification/i }));

        expect(onAction).toHaveBeenCalledWith(
            'dismiss_intelligence_notification',
            'intel:rs_strategic_goals:RS:RBiH',
        );
    });
});
