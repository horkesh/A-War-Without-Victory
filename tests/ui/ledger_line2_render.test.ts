// @vitest-environment jsdom
/**
 * Ledger line 2 (s6_ledger12_ruling.md; orchestrator ruling 2026-11-25): when people were unable to leave
 * a pocket this week, the Ledger and the player's own enclave card SHOW the figure; when there were none,
 * the line is HIDDEN, never shown as a misleading "0". The engine side (trapped >= 1 written with the
 * turn stamp) is covered in tests/state/siege_destination_a5.test.ts; the adapter's this-week read in
 * tests/s6_ledger_lines_write_only.test.ts.
 */
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EnclaveDashboard } from '../../src/ui/map/components/EnclaveDashboard';
import { HumanitarianLedgerPanel } from '../../src/ui/map/components/HumanitarianLedgerPanel';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import { setLocale } from '../../src/ui/map/i18n';

afterEach(cleanup);
beforeEach(() => { setLocale('en'); });

function ledgerState(opts: { movedOn?: Record<string, number>; unable?: number }): LoadedGameState {
    return {
        player_faction: 'RBiH',
        nationalDisplacement: {
            civilianCasualtiesByEthnicity: {},
            humanitarianAggregates: {},
            refugeesByTurn: [],
            movedOnAtCaptureByPeople: opts.movedOn ?? {},
            ...(opts.unable !== undefined ? { unableToLeaveThisWeek: opts.unable } : {}),
        },
    } as unknown as LoadedGameState;
}

function enclaveState(unable?: number): LoadedGameState {
    return {
        player_faction: 'RBiH',
        enclaveResilience: {
            gorazde: {
                resilience: 35, isolation_turns: 60, hardening_active: true, supply_state: 'critical',
                faction: 'RBiH', display_name: 'Goražde',
                ...(unable !== undefined ? { unable_to_leave_this_week: unable } : {}),
            },
        },
    } as unknown as LoadedGameState;
}

const open = (el: ReturnType<typeof createElement>) => render(el).container.textContent ?? '';

describe('Ledger line 2 on screen', () => {
    it('the Ledger shows this week\'s figure when people could not leave', () => {
        const text = open(createElement(HumanitarianLedgerPanel, { state: ledgerState({ unable: 410 }), open: true, onClose: () => {} }));
        expect(text).toContain('Unable to leave the pocket, this week: 410');
        expect(text).toContain('Forced to move again, by people');
    });

    it('the Ledger hides line 2 (no "0") when nobody was trapped, and keeps line 1', () => {
        const text = open(createElement(HumanitarianLedgerPanel, { state: ledgerState({ movedOn: { RBiH: 1200 } }), open: true, onClose: () => {} }));
        expect(text).toContain('Forced to move again, by people');
        expect(text).not.toContain('Unable to leave the pocket');
        expect(text).not.toMatch(/this week: 0\b/);
    });

    it('the Ledger hides the whole section when both lines are empty', () => {
        const text = open(createElement(HumanitarianLedgerPanel, { state: ledgerState({}), open: true, onClose: () => {} }));
        expect(text).not.toContain('Forced to move again');
        expect(text).not.toContain('Unable to leave');
    });

    it('the enclave card shows the figure, and hides it (no "0") when absent', () => {
        const shown = open(createElement(EnclaveDashboard, { state: enclaveState(410), open: true, onClose: () => {} }));
        expect(shown).toContain('Unable to leave this week: 410');
        cleanup();
        const hidden = open(createElement(EnclaveDashboard, { state: enclaveState(), open: true, onClose: () => {} }));
        expect(hidden).toContain('Goražde');
        expect(hidden).not.toContain('Unable to leave');
    });
});
