// @vitest-environment jsdom
/**
 * The treaty against the mediator's draft (owner, 2026-11-08: keep the canon grade bands;
 * show what the treaty won). Engine record built for preview and signing; shown in final
 * review and the Verdict.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState, FactionId } from '../../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship, TreatyAgainstDraft } from '../../src/state/negotiation_types.js';
import { createEmptyCapital } from '../../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../../src/sim/events/strategic_dimensions.js';
import { initiateDaytonNegotiation } from '../../src/sim/negotiation/dayton_negotiation.js';
import { resolveDesktopDaytonAgreement } from '../../src/desktop/desktop_sim.js';
import { parseDaytonProposal } from '../../src/desktop/dayton_proposal.js';
import { TreatyLedger } from '../../src/ui/map/dayton_conference/TreatyLedger';
import { setLocale } from '../../src/ui/map/i18n/index.js';

const painted = JSON.parse(readFileSync(resolve(process.cwd(), 'data/source/calibration/painted_control_oct1995.json'), 'utf8'))
    .by_settlement_id as Record<string, string>;

function makeState(player: FactionId, composite = 80, override = 95): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    const dims = initializeStrategicDimensions();
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = createEmptyCapital();
        patron_relationships[f] = { patron_id: 'international_community', support_level: 50, override_authority: override, sanctions_active: false, relationship_events: [] };
        for (const dim of Object.keys(dims[f]!)) dims[f]![dim] = { base_value: composite, event_modifier: 0, effective_value: composite };
    }
    const state = {
        meta: { turn: 188, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false, player_faction: player },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: {}, negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: dims } },
        political: { political_controllers: { ...painted } },
        displacement: {},
    } as unknown as GameState;
    state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state);
    return state;
}

const E: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };

afterEach(() => { cleanup(); setLocale('en'); });

describe('buildTreatyAgainstDraft through the desktop resolver', () => {
    it('the mediator\'s draft signed unchanged records no change and equal shares', () => {
        const state = makeState('RBiH');
        const { agreement } = resolveDesktopDaytonAgreement(state, parseDaytonProposal(E, state), process.cwd());
        const treaty = agreement.treaty!;
        expect(treaty.signed_share).toEqual(treaty.draft_share);
        expect([...treaty.land_won, ...treaty.land_given, ...treaty.land_refused, ...treaty.powers_won, ...treaty.powers_refused]).toEqual([]);
    });

    it('records ground won and refused, powers won and refused, and the share moved', () => {
        const state = makeState('RBiH');
        const proposal = parseDaytonProposal({ ...E, territorial_demands: ['sarajevo_suburbs', 'brcko_district'], competency_allocation: { comp_defense: 'state' } }, state);
        const { agreement, result } = resolveDesktopDaytonAgreement(state, proposal, process.cwd());
        const treaty = agreement.treaty!;
        expect(treaty.land_won.map(l => l.id)).toEqual(result.territorial_packages_accepted.filter(id => proposal.territorial_demands.includes(id)).sort());
        expect([...treaty.land_won, ...treaty.land_refused].map(l => l.id).sort()).toEqual(['brcko_district', 'sarajevo_suburbs']);
        const defense = [...treaty.powers_won, ...treaty.powers_refused].find(p => p.id === 'comp_defense')!;
        expect(defense.asked).toBe('state');
        expect(defense.signed).toBe(agreement.terms.competency_allocation!.comp_defense);
        if (treaty.land_won.some(l => l.id === 'sarajevo_suburbs')) expect(treaty.signed_share.RBiH).toBeGreaterThan(treaty.draft_share.RBiH!);
    });

    it('is deterministic', () => {
        const a = makeState('RBiH'); const b = makeState('RBiH');
        const p = { ...E, territorial_demands: ['sarajevo_suburbs'] };
        expect(resolveDesktopDaytonAgreement(a, parseDaytonProposal(p, a), process.cwd()).agreement.treaty)
            .toEqual(resolveDesktopDaytonAgreement(b, parseDaytonProposal(p, b), process.cwd()).agreement.treaty);
    });
});

describe('TreatyLedger', () => {
    const treaty: TreatyAgainstDraft = {
        faction: 'RBiH',
        draft_share: { RBiH: 33.1, RS: 47.2, HRHB: 19.7 },
        signed_share: { RBiH: 33.5, RS: 46.8, HRHB: 19.7 },
        land_won: [{ id: 'sarajevo_suburbs', name: 'Sarajevo Suburbs' }, { id: 'front:rogatica:RBiH:RS', name: 'Rogatica' }],
        land_given: [],
        land_refused: [{ id: 'brcko_district', name: 'Brčko District' }],
        powers_won: [],
        powers_refused: [{ kind: 'competency', id: 'comp_defense', asked: 'state', signed: 'entity' }],
    };

    it('states the share against the draft and lists what was won and refused, in plain words', () => {
        render(createElement(TreatyLedger, { treaty, signed: true }));
        const ledger = screen.getByRole('region', { name: 'Your treaty against the mediator\'s draft' });
        expect(within(ledger).getByText(/0\.4 points more of the country: 33\.5 % against 33\.1 %/)).toBeTruthy();
        expect(within(ledger).getByText('Sarajevo Suburbs, Rogatica')).toBeTruthy();
        expect(within(ledger).getByText('Brčko District')).toBeTruthy();
        expect(within(ledger).getByText('Defense: State')).toBeTruthy();
        expect(within(ledger).queryByText('Ground given up')).toBeNull();
    });

    it('says plainly when nothing changed, and renders nothing for an older record', () => {
        render(createElement(TreatyLedger, { treaty: { ...treaty, signed_share: treaty.draft_share, land_won: [], land_refused: [], powers_refused: [] }, signed: false }));
        expect(screen.getByText(/Nothing was changed at the table/)).toBeTruthy();
        expect(screen.getByText(/The same share of the country as the mediator's draft: 33\.1 %/)).toBeTruthy();
        cleanup();
        const { container } = render(createElement(TreatyLedger, { treaty: undefined, signed: true }));
        expect(container.textContent).toBe('');
    });

    it('localizes in BCS', () => {
        setLocale('bcs');
        render(createElement(TreatyLedger, { treaty, signed: true }));
        expect(screen.getByText('Vaš sporazum u poređenju s nacrtom posrednika')).toBeTruthy();
        expect(screen.getByText('Dobijena teritorija')).toBeTruthy();
    });
});
