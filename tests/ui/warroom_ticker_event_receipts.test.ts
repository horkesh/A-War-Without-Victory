import { describe, expect, it } from 'vitest';

import {
    getTickerEventsForTurn,
    PHASE0_TICKER_EVENTS,
} from '../../src/ui/warroom/content/ticker_events.js';
import { generateTickerWarEvents } from '../../src/ui/warroom/content/ticker_war_events.js';

describe('Warroom ticker event-owned safe-area receipts', () => {
    it('does not publish Srebrenica and Zepa fall headlines without live event receipts', () => {
        const events = getTickerEventsForTurn(186, {});
        const headlines = events.map((event) => event.text).join('\n');

        expect(headlines).not.toContain('VRS OVERRUNS SREBRENICA SAFE AREA');
        expect(headlines).not.toContain('SREBRENICA MASSACRE');
        expect(headlines).not.toContain('VRS ATTACKS ZEPA SAFE AREA');
    });

    it('publishes safe-area fall headlines only when the matching receipts exist', () => {
        const events = getTickerEventsForTurn(186, {
            firedEventIds: ['srebrenica_falls_1995', 'zepa_falls_1995'],
            ruptureIds: ['srebrenica_genocide_1995'],
        });
        const headlines = events.map((event) => event.text).join('\n');

        expect(headlines).toContain('VRS OVERRUNS SREBRENICA SAFE AREA');
        expect(headlines).toContain('SREBRENICA MASSACRE');
        expect(headlines).toContain('VRS ATTACKS ZEPA SAFE AREA');
    });

    it('marks every live safe-area fall ticker row with a receipt requirement', () => {
        const liveFallRows = PHASE0_TICKER_EVENTS.filter((event) =>
            event.text.includes('SREBRENICA MASSACRE')
            || event.text.includes('VRS OVERRUNS SREBRENICA SAFE AREA')
            || event.text.includes('VRS ATTACKS ZEPA SAFE AREA')
        );

        expect(liveFallRows).toHaveLength(3);
        expect(liveFallRows.every((event) =>
            event.requiresEventId === 'srebrenica_falls_1995'
            || event.requiresEventId === 'zepa_falls_1995'
            || event.requiresRuptureId === 'srebrenica_genocide_1995'
        )).toBe(true);
    });

    it('does not publish peace-plan and Dayton headlines without live event receipts', () => {
        expect(getTickerEventsForTurn(53, {}).map((event) => event.text).join('\n'))
            .not.toContain('VANCE-OWEN');
        expect(getTickerEventsForTurn(84, {}).map((event) => event.text).join('\n'))
            .not.toContain('OWEN-STOLTENBERG');
        expect(getTickerEventsForTurn(132, {}).map((event) => event.text).join('\n'))
            .not.toContain('CONTACT GROUP PLAN');
        expect(getTickerEventsForTurn(200, {}).map((event) => event.text).join('\n'))
            .not.toContain('DAYTON');
        expect(getTickerEventsForTurn(204, {}).map((event) => event.text).join('\n'))
            .not.toContain('DAYTON');
    });

    it('publishes peace-plan and Dayton headlines only when the matching receipts exist', () => {
        expect(getTickerEventsForTurn(53, {
            firedEventIds: ['vance_owen_plan_1993'],
        }).map((event) => event.text).join('\n')).toContain('VANCE-OWEN PEACE PLAN PROPOSED');

        expect(getTickerEventsForTurn(84, {
            firedEventIds: ['owen_stoltenberg_plan_1993'],
        }).map((event) => event.text).join('\n')).toContain('OWEN-STOLTENBERG PLAN PROPOSED');

        expect(getTickerEventsForTurn(132, {
            firedEventIds: ['contact_group_plan_1994'],
        }).map((event) => event.text).join('\n')).toContain('CONTACT GROUP PLAN PRESENTED');

        expect(getTickerEventsForTurn(200, {
            firedEventIds: ['dayton_talks_begin_1995'],
        }).map((event) => event.text).join('\n')).toContain('DAYTON PEACE TALKS BEGIN');

        expect(getTickerEventsForTurn(204, {
            firedEventIds: ['dayton_talks_begin_1995', 'dayton_signed_1995'],
        }).map((event) => event.text).join('\n')).toContain('DAYTON AGREEMENT FORMALLY SIGNED');
    });

    it('marks every live peace-plan ticker row with a receipt requirement', () => {
        const livePeaceRows = PHASE0_TICKER_EVENTS.filter((event) =>
            event.text.includes('VANCE-OWEN')
            || event.text.includes('OWEN-STOLTENBERG')
            || event.text.includes('CONTACT GROUP PLAN')
            || event.text.includes('CONTACT GROUP MAP')
            || event.text.includes('VRS DELAYS RESPONSE TO CONTACT GROUP')
            || event.text.includes('BOSNIAN SERBS REJECT CONTACT GROUP')
            || event.text.includes('CONTACT GROUP CONSIDERS NEXT STEPS')
            || event.text.includes('CONTACT GROUP SEEKS FRAMEWORK')
            || event.text.includes('FURTHER AGREED PRINCIPLES')
            || event.text.includes('PROXIMITY TALKS')
            || event.text.includes('DAYTON PEACE TALKS')
            || event.text.includes('DAYTON TALKS')
            || event.text.includes('DAYTON AGREEMENT')
            || event.text.includes('PARTIES PREPARE FOR PEACE NEGOTIATIONS')
        );

        expect(livePeaceRows.length).toBeGreaterThan(12);
        expect(livePeaceRows.every((event) => Boolean(event.requiresEventId ?? event.requiresAnyEventId))).toBe(true);
    });

    it('does not publish safe-area setup headlines without live event receipts', () => {
        const headlines = [59, 72, 74, 77, 80]
            .flatMap((turn) => getTickerEventsForTurn(turn, {}).map((event) => event.text))
            .join('\n');

        expect(headlines).not.toContain('SREBRENICA UNDER SIEGE');
        expect(headlines).not.toContain('SREBRENICA OFFENSIVE');
        expect(headlines).not.toContain('GENERAL MORILLON ENTERS SREBRENICA');
        expect(headlines).not.toContain('SREBRENICA DECLARED SAFE AREA');
        expect(headlines).not.toContain('FIVE MORE SAFE AREAS DECLARED');
        expect(headlines).not.toContain('ZEPA');
    });

    it('publishes safe-area setup headlines only when matching receipts exist', () => {
        expect(getTickerEventsForTurn(77, {
            firedEventIds: ['srebrenica_demilitarization_1993'],
        }).map((event) => event.text).join('\n')).toContain('SREBRENICA DECLARED SAFE AREA');

        expect(getTickerEventsForTurn(80, {
            firedEventIds: ['un_safe_areas_declared_1993'],
        }).map((event) => event.text).join('\n')).toContain('FIVE MORE SAFE AREAS DECLARED');
    });

    it('does not publish Washington and Dayton-adjacent endgame headlines without receipts', () => {
        const headlines = [120, 121, 122, 196, 197, 205, 206, 207]
            .flatMap((turn) => getTickerEventsForTurn(turn, {}).map((event) => event.text))
            .join('\n');

        expect(headlines).not.toContain('WASHINGTON AGREEMENT');
        expect(headlines).not.toContain('HVO-ARBIH CEASEFIRE');
        expect(headlines).not.toContain('FEDERATION OF BOSNIA AND HERZEGOVINA');
        expect(headlines).not.toContain('CEASEFIRE TAKES EFFECT ACROSS BOSNIA');
        expect(headlines).not.toContain('51% TERRITORY LINE');
        expect(headlines).not.toContain('NATO DEPLOYS IFOR');
        expect(headlines).not.toContain('UNPROFOR MANDATE ENDS');
        expect(headlines).not.toContain('ENTITY BOUNDARIES');
    });

    it('publishes Washington and Dayton-adjacent endgame headlines only with matching receipts', () => {
        expect(getTickerEventsForTurn(122, {
            firedEventIds: ['hrhb_washington_agreement_1994'],
        }).map((event) => event.text).join('\n')).toContain('FEDERATION OF BOSNIA AND HERZEGOVINA');

        expect(getTickerEventsForTurn(196, {
            firedEventIds: ['ceasefire_1995'],
        }).map((event) => event.text).join('\n')).toContain('CEASEFIRE TAKES EFFECT ACROSS BOSNIA');

        expect(getTickerEventsForTurn(197, {
            firedEventIds: ['us_halts_federation_advance_1995'],
        }).map((event) => event.text).join('\n')).toContain('51% TERRITORY LINE');

        expect(getTickerEventsForTurn(207, {
            firedEventIds: ['dayton_signed_1995'],
        }).map((event) => event.text).join('\n')).toContain('ENTITY BOUNDARIES');
    });

    it('marks every live enclave, Washington, and endgame ticker row with a receipt requirement', () => {
        const sensitiveRows = PHASE0_TICKER_EVENTS.filter((event) =>
            event.text.includes('SREBRENICA UNDER SIEGE')
            || event.text.includes('SREBRENICA OFFENSIVE')
            || event.text.includes('GENERAL MORILLON ENTERS SREBRENICA')
            || event.text.includes('SREBRENICA DECLARED SAFE AREA')
            || event.text.includes('FIVE MORE SAFE AREAS DECLARED')
            || event.text.includes('WASHINGTON AGREEMENT SIGNED')
            || event.text.includes('HVO-ARBIH CEASEFIRE')
            || event.text.includes('FEDERATION OF BOSNIA AND HERZEGOVINA')
            || event.text.includes('CEASEFIRE TAKES EFFECT ACROSS BOSNIA')
            || event.text.includes('51% TERRITORY LINE')
            || event.text.includes('NATO DEPLOYS IFOR')
            || event.text.includes('UNPROFOR MANDATE ENDS')
            || event.text.includes('ENTITY BOUNDARIES')
        );

        expect(sensitiveRows).toHaveLength(13);
        expect(sensitiveRows.every((event) => Boolean(event.requiresEventId ?? event.requiresAnyEventId ?? event.requiresRuptureId))).toBe(true);
    });

    it('does not expose raw settlement or operation ids in dynamic war ticker fallbacks', () => {
        const rows = generateTickerWarEvents([
            {
                type: 'control_flip',
                faction: 'RBiH',
                turn: 1,
                settlement: 'S100013',
                visibility: 1,
                details: { isOwnGain: true },
            } as any,
            {
                type: 'control_flip',
                faction: 'RBiH',
                turn: 1,
                settlement: 'op:srebrenica:srebrenica_2',
                visibility: 1,
                details: { isOwnLoss: true },
            } as any,
        ], 'RBiH');
        const text = rows.join('\n');

        expect(text).toContain('A REPORTED SECTOR');
        expect(text).not.toMatch(/\bS?\d{4,}\b|op:srebrenica|srebrenica_2/i);
    });
});
