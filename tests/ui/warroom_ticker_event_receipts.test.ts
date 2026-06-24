import { describe, expect, it } from 'vitest';

import {
    getTickerEventsForTurn,
    PHASE0_TICKER_EVENTS,
} from '../../src/ui/warroom/content/ticker_events.js';

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
});
