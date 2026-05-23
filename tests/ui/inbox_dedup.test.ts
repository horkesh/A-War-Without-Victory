// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { PresidentialInbox } from '../../src/ui/map/components/PresidentialInbox.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

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

    it('renders a quiet-inbox decision room capsule when no decisions are pending', () => {
        const onAction = vi.fn();
        useGameStore.setState({
            loadedGameState: makeLoadedState({ turn: 12 }),
            openingBriefDismissed: true,
            osidDisplayNames: null,
        });

        render(createElement(PresidentialInbox, { onAction }));

        expect(screen.getByText('Decision Room')).toBeTruthy();
        expect(screen.getByText('Chronicle')).toBeTruthy();
        expect(screen.getByText('No orders are waiting on your desk.')).toBeTruthy();
        expect(screen.queryByText('No pending decisions.')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /open decision room/i }));
        expect(onAction).toHaveBeenCalledWith('army_hq_briefing', 'empty:decision-room');
    });

    it('localizes quiet-inbox capsule chrome in BCS mode', () => {
        const onAction = vi.fn();
        setLocale('bcs');
        useGameStore.setState({
            loadedGameState: makeLoadedState({ turn: 12 }),
            openingBriefDismissed: true,
            osidDisplayNames: null,
        });

        render(createElement(PresidentialInbox, { onAction }));

        expect(screen.getByText('Komandna straza')).toBeTruthy();
        expect(screen.getByText('Nijedna naredba ne ceka na vasem stolu.')).toBeTruthy();
        expect(screen.getByText('Soba odluka')).toBeTruthy();
        expect(screen.getByText('Hronika')).toBeTruthy();
        expect(screen.queryByText('Command Watch')).toBeNull();
        expect(screen.queryByText('No orders are waiting on your desk.')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /otvori sobu odluka/i }));
        expect(onAction).toHaveBeenCalledWith('army_hq_briefing', 'empty:decision-room');
    });

    it('localizes opening brief chrome and RBiH scan bullets in BCS mode', () => {
        const onAction = vi.fn();
        setLocale('bcs');
        useGameStore.setState({
            loadedGameState: makeLoadedState({ player_faction: 'RBiH', turn: 0 }),
            openingBriefDismissed: false,
            osidDisplayNames: null,
        });

        render(createElement(PresidentialInbox, { onAction }));

        expect(screen.getByText('Predsjednicki brifing')).toBeTruthy();
        expect(screen.getByText('Republika Bosna i Hercegovina')).toBeTruthy();
        expect(screen.getByText('Drzite Sarajevo, Tuzlu, Zenicu, Bihac i druga urbana uporista dok se armija formira pod vatrom.')).toBeTruthy();
        expect(screen.getByRole('button', { name: /otvori sobu odluka/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /procitaj kasnije/i })).toBeTruthy();
        expect(screen.queryByText('Presidential Brief')).toBeNull();
        expect(screen.queryByText('Read later')).toBeNull();
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
