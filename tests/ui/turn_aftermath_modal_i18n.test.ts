// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { TurnAftermathModal } from '../../src/ui/map/components/TurnAftermathModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { TurnAftermathView } from '../../src/ui/map/data/turnAftermath.js';

function makeView(): TurnAftermathView {
    return {
        turn: 12,
        dateLabel: '24 Jun 1992',
        playerFaction: 'RBiH',
        headline: 'Neto teritorijalni dobitak: +1 OSID-a.',
        narrativeLine: 'Sedmica zavrsava osvojenim prostorom, ali knjiga troška jos odreduje cijenu napredovanja.',
        tone: 'gain',
        territory: {
            friendlyNet: 1,
            gains: 1,
            losses: 0,
            notable: [{
                osid: 'op:bihac:kulen_vakuf',
                label: 'Kulen Vakuf (Bihac)',
                direction: 'gain',
                significance: 'corridor',
                from: 'RS',
                to: 'RBiH',
            }],
        },
        combat: {
            battleCount: 1,
            friendlyBattleCount: 1,
            friendlyCasualties: 12,
            opposingCasualties: 20,
            territoryFlipsFromBattles: 1,
        },
        humanitarian: { displacedThisTurn: 80 },
        formations: { spawned: 1, destroyed: 0, ownSpawned: 1, ownDestroyed: 0 },
        supply: { ownSupplyDelta: -3, ownHeavyMunitionsDelta: -1 },
        cost: {
            friendlyMilitaryCasualties: 12,
            theaterMilitaryCasualties: 32,
            displacedThisTurn: 80,
            ownFormationsDestroyed: 0,
            ownSupplySpent: 3,
            ownHeavyMunitionsSpent: 1,
            severity: 'moderate',
            reasons: ['12 prijateljskih gubitaka', '80 raseljenih'],
        },
        signals: [],
        judgment: {
            headline: 'Teritorija je promijenila pamćenje kampanje.',
            detail: 'Linija fronta je zabiljezila +1 neto OSID za igracevu frakciju.',
            memoryTone: 'territory',
            primarySurface: 'chronicle',
            secondarySurface: 'records',
        },
        nextActions: {
            actionableCount: 0,
            blockingCount: 0,
            opportunityCount: 0,
            reserveCount: 0,
            officerCount: 0,
            eventDecisionCount: 0,
            peaceCount: 0,
            topItems: [],
        },
    };
}

describe('TurnAftermathModal localization', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
        setLocale('en');
    });

    it('renders BCS chrome for the turn aftermath modal', () => {
        setLocale('bcs');

        render(createElement(TurnAftermathModal, {
            isOpen: true,
            view: makeView(),
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        expect(screen.getByText('Posljedice poteza')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Nastavi' })).toBeTruthy();
        expect(screen.getByText('Teritorija')).toBeTruthy();
        expect(screen.getByText('1 osvojeno / 0 izgubljeno')).toBeTruthy();
        expect(screen.getByText('Cijena poteza')).toBeTruthy();
        expect(screen.getByText('Sud / sjećanje')).toBeTruthy();
        expect(screen.getByText('Komandni sto')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Pregled rata' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zapisi poteza' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Pregledaj inbox' })).toBeTruthy();
        expect(screen.queryByText('Turn Aftermath')).toBeNull();
    });
});
