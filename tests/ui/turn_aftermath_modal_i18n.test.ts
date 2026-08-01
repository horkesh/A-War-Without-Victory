// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TurnAftermathModal } from '../../src/ui/map/components/TurnAftermathModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { TurnAftermathView } from '../../src/ui/map/data/turnAftermath.js';
import type { ForcedOpReceipt } from '../../src/ui/map/data/forcedOpReceipts.js';
import type { ConsequenceReceipt } from '../../src/ui/map/data/consequenceReceipts.js';
import type { OfficerResentmentReceipt } from '../../src/ui/map/data/officerResentmentReceipts.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';

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
            breakdownComplete: true,
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
        commandRecord: { directives: [], rows: [] },
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
        const onClose = vi.fn();

        render(createElement(TurnAftermathModal, {
            isOpen: true,
            view: makeView(),
            onClose,
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        expect(screen.getByText('Posljedice poteza')).toBeTruthy();
        const closeReport = screen.getByTestId('turn-aftermath-close');
        expect(closeReport.textContent).toBe('Zatvori izvjestaj');
        fireEvent.click(closeReport);
        expect(onClose).toHaveBeenCalledOnce();
        expect(screen.getByText('Teritorija')).toBeTruthy();
        expect(screen.getByText('1 osvojeno / 0 izgubljeno')).toBeTruthy();
        expect(screen.getByText('Cijena poteza')).toBeTruthy();
        expect(screen.getByText('Sud / sjećanje')).toBeTruthy();
        expect(screen.getByText('Komandni sto')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Pregled rata' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Sedmične posljedice' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Pregledaj inbox' })).toBeTruthy();
        expect(screen.queryByText('Turn Aftermath')).toBeNull();
    });

    it('labels top desk item types with player-facing registry copy', () => {
        const view = makeView();
        view.nextActions = {
            ...view.nextActions,
            actionableCount: 1,
            topItems: [{
                id: 'convoy:one',
                type: 'convoy_decision',
                severity: 'urgent',
                title: 'Convoy to Srebrenica',
                detail: 'Srebrenica route; 20 supply points.',
                action: 'convoy_decision_modal',
                actionLabel: 'Review convoy',
            }],
        };

        const { container } = render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        expect(screen.getByText('Humanitarian convoy')).toBeTruthy();
        expect(screen.getByText('Srebrenica route; 20 supply points.')).toBeTruthy();
        expect(screen.getByTestId('turn-aftermath-action-convoy:one').getAttribute('aria-label'))
            .toContain('Srebrenica route; 20 supply points.');
        expect(container.textContent).not.toMatch(/\bconvoy decision\b|convoy_decision/i);
    });

    it('explains when notable territory changes do not reconcile to the net total', () => {
        const view = makeView();
        view.territory = {
            friendlyNet: -2,
            gains: 0,
            losses: 0,
            breakdownComplete: false,
            notable: [],
        };

        render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        expect(screen.getByText('0 notable gains / 0 notable losses; net includes 2 other changes.')).toBeTruthy();
        expect(screen.queryByText('0 gained / 0 lost')).toBeNull();
    });


    it('routes top desk items as direct presidential review actions', () => {
        const view = makeView();
        view.nextActions = {
            ...view.nextActions,
            actionableCount: 1,
            topItems: [{
                id: 'command:review-proposal:rev_1',
                type: 'autonomy_proposal',
                severity: 'urgent',
                title: 'Operation Test Plan',
                action: 'decision_room',
                actionLabel: 'Review authorization',
            }],
        };
        const onReviewAction = vi.fn();

        render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onReviewAction,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        fireEvent.click(screen.getAllByRole('button', { name: /Review authorization/i })[0]);

        expect(onReviewAction).toHaveBeenCalledWith(expect.objectContaining({
            id: 'command:review-proposal:rev_1',
            action: 'decision_room',
        }));
    });

    it('promotes the highest-priority desk item into the persistent footer action', () => {
        const view = makeView();
        view.nextActions = {
            ...view.nextActions,
            actionableCount: 2,
            blockingCount: 1,
            topItems: [{
                id: 'convoy:convoy_srebrenica',
                type: 'convoy_decision',
                severity: 'blocking',
                title: 'Convoy to Srebrenica',
                action: 'convoy_decision_modal',
                actionLabel: 'Review convoy',
            }, {
                id: 'command:review-proposal:rev_1',
                type: 'autonomy_proposal',
                severity: 'normal',
                title: 'Operation Test Plan',
                action: 'decision_room',
                actionLabel: 'Review authorization',
            }],
        };
        const onReviewAction = vi.fn();
        const onOpenInbox = vi.fn();

        render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onReviewAction,
            onClose: vi.fn(),
            onOpenInbox,
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        const footerAction = screen.getByTestId('turn-aftermath-primary-action');
        expect(footerAction.getAttribute('aria-label')).toContain('Next presidential action');
        expect(footerAction.textContent).toContain('Review convoy');
        expect(document.activeElement).toBe(footerAction);

        const reserveAction = screen.getByTestId('turn-aftermath-action-command:review-proposal:rev_1');
        expect(reserveAction.textContent).toContain('Operation Test Plan');

        fireEvent.click(reserveAction);

        expect(onReviewAction).toHaveBeenCalledWith(expect.objectContaining({
            id: 'command:review-proposal:rev_1',
            action: 'decision_room',
        }));

        fireEvent.click(footerAction);

        expect(onReviewAction).toHaveBeenCalledWith(expect.objectContaining({
            id: 'convoy:convoy_srebrenica',
            action: 'convoy_decision_modal',
        }));
        expect(onOpenInbox).not.toHaveBeenCalled();
    });

    it('places the command desk before supporting signals and does not disguise movement records as Codex links', () => {
        const view = makeView();
        view.signals = [{
            id: 'movement:brigade:one',
            kind: 'movement',
            label: '1st Brigade moved',
            detail: 'Visoko -> Sarajevo',
            severity: 'routine',
        }];
        const onOpenCodex = vi.fn();

        render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex,
        }));

        const commandDesk = screen.getByText('Command Desk');
        const signals = screen.getByText('Strategic Signals');
        expect(commandDesk.compareDocumentPosition(signals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByText('1st Brigade moved').closest('button')).toBeNull();
        expect(onOpenCodex).not.toHaveBeenCalled();
    });

    it('shows the command record in player language without exposing engine ids', () => {
        const view = makeView();
        view.commandRecord = {
            directives: [{ label: 'Press offensive', rationale: 'The Main Staff accepted the offensive intent.' }],
            rows: [{
                id: 'arbih_1st_corps',
                corpsName: '1st Corps',
                officerName: 'General One',
                assignedRole: 'Supporting effort',
                interpretation: 'reinterpreted',
                interpretationDetail: 'The commander adopted a more cautious role.',
                action: 'Launched an operation',
                actionDetail: 'Plan ready; operation launched.',
            }],
        };

        const { container } = render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        expect(screen.getByText('Command Record')).toBeTruthy();
        expect(screen.getByText('Whose orders survived and what commanders did')).toBeTruthy();
        expect(screen.getByText('Press offensive')).toBeTruthy();
        expect(screen.getByText('General One')).toBeTruthy();
        expect(screen.getByText('Reinterpreted')).toBeTruthy();
        expect(screen.getByText('Launched an operation')).toBeTruthy();
        expect(container.textContent).not.toContain('arbih_1st_corps');
    });

    it('uses the stored commander recommendation in forced-operation receipts', () => {
        const forcedOps: ForcedOpReceipt[] = [{
            id: 'forced-op-one',
            opName: 'Operation River Crossing',
            corpsId: 'arbih_1st_corps',
            commanderName: 'Gen. Example',
            assessmentAtLaunch: 'postpone',
            outcome: 'failure',
            grade: 1,
            casualtiesSuffered: 80,
            casualtiesInflicted: 20,
            objectivesHeldAtClose: 2,
            endedTurn: 12,
        }];

        const { container } = render(createElement(TurnAftermathModal, {
            isOpen: true,
            view: makeView(),
            forcedOps,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        expect(screen.getByText(/he recommended waiting/i)).toBeTruthy();
        expect(container.textContent).not.toMatch(/recommended abort/i);
        expect(container.textContent).toMatch(/2 objectives held at resolution/i);
        expect(container.textContent).not.toMatch(/objectives? taken|objectives? captured/i);
    });

    it('renders consequence and officer resentment timing as calendar dates', () => {
        const consequences: ConsequenceReceipt[] = [{
            id: 'receipt-one',
            sourceRecordId: 'decision:decision-one::open::5',
            receiptRecordId: 'receipt:receipt-one',
            decisionEventId: 'decision-one',
            decisionTitle: 'Aid corridor',
            decisionOptionLabel: 'Open the corridor',
            decisionTurn: 5,
            predictedEventId: 'predicted-one',
            predictedLabel: 'The corridor is tested',
            predictedExplanation: '',
            status: 'confirmed',
            firedTurn: 12,
            turnsElapsed: 7,
        }];
        const officerResentment: OfficerResentmentReceipt[] = [{
            id: 'officer-one',
            officerName: 'Gen. Example',
            corpsId: 'arbih_1st_corps',
            overrideTurn: 12,
            overrideCount: 0,
            newlyCowed: true,
            cowedUntilTurn: 20,
        }];

        const { container } = render(createElement(TurnAftermathModal, {
            isOpen: true,
            view: makeView(),
            consequences,
            officerResentment,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        const copy = container.textContent ?? '';
        expect(copy).toContain(`Open the corridor" on ${turnToDateString(5)}`);
        expect(copy).toContain(`until ${turnToDateString(20)}`);
        expect(copy).not.toMatch(/\bat week\s+\d+\b|\buntil week\s+\d+\b/i);
        expect(container.innerHTML).not.toMatch(/data-receipt-id=/);
    });

    it('uses neutral copy for unknown notable-territory significance values', () => {
        const view = makeView();
        view.territory.notable[0] = {
            ...view.territory.notable[0],
            significance: 'internal_debug_marker',
        };

        const { container } = render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        const copy = container.textContent ?? '';
        expect(copy).toContain('Notable change');
        expect(copy).not.toContain('internal debug marker');
        expect(copy).not.toContain('internal_debug_marker');
    });

    it('uses neutral copy for raw strategic signal detail fallbacks', () => {
        const view = makeView();
        view.signals = [{
            id: 'signal-one',
            kind: 'event',
            label: 'Staff report',
            detail: 'internal_debug_marker',
            severity: 'notable',
        }];

        const { container } = render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex: vi.fn(),
        }));

        const copy = container.textContent ?? '';
        expect(copy).toContain('Notable event');
        expect(copy).not.toContain('internal debug marker');
        expect(copy).not.toContain('internal_debug_marker');
    });

    it('opens the matching Codex essay from strategic signal rows', () => {
        const view = makeView();
        view.signals = [{
            id: 'event:sarajevo_siege',
            kind: 'event',
            label: 'Siege of Sarajevo Intensifies',
            detail: 'Historical event',
            severity: 'notable',
        }];
        const onOpenCodex = vi.fn();

        render(createElement(TurnAftermathModal, {
            isOpen: true,
            view,
            onClose: vi.fn(),
            onOpenInbox: vi.fn(),
            onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(),
            onOpenChronicle: vi.fn(),
            onOpenCodex,
        }));

        fireEvent.click(screen.getByTestId('turn-aftermath-signal-row'));

        expect(onOpenCodex).toHaveBeenCalledWith('sarajevo_siege');
    });

    it('keeps command-desk action summaries fully readable', () => {
        const source = readFileSync('src/ui/map/components/TurnAftermathModal.tsx', 'utf8');

        expect(source).not.toContain('line-clamp-2 text-xs leading-4 opacity-80');
        expect(source).toContain('break-words text-xs leading-4 opacity-80');
    });
});
