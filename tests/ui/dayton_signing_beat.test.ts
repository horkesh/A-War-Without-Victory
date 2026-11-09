// @vitest-environment jsdom
/**
 * DC A5: the signing beat between final review and the Verdict. Codex's blank initialling
 * document (dayton-signing-table-v1) carries no text; the signed map, the date, the war's
 * cost line and the three initials are runtime overlays at the plate's registered hotspots.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { DaytonAgreementRecord } from '../../src/state/negotiation_types.js';
import { DaytonSigningBeat } from '../../src/ui/map/dayton_conference/DaytonSigningBeat';
import { readDaytonAgreement } from '../../src/ui/map/data/GameStateAdapter';

let storeState: Record<string, unknown> = { loadedGameState: null };
vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) => selector(storeState),
        { getState: () => storeState, setState: (partial: Record<string, unknown>) => { Object.assign(storeState, partial); }, subscribe: () => () => {} },
    ),
}));
vi.mock('../../src/ui/map/desktop/useIPC', () => ({ useIPC: () => ({ isAvailable: false }) }));
// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { VerdictScreen } = await import('../../src/ui/map/components/VerdictScreen');

const agreement = {
    version: 1,
    terms: {
        territorial_packages_accepted: [], territorial_packages_rejected: [], institutional_choices: {},
        final_territory_split: {}, patron_overrides_applied: [], brcko_status: 'arbitration',
    },
    map: { controllers: { a: 'RBiH', b: 'RS' }, wartimeControllers: { a: 'RBiH', b: 'RS' }, specialOsids: [], territoryPct: { RBiH: 51, RS: 49 } },
    treaty: {
        faction: 'RBiH', draft_share: { RBiH: 32.1, RS: 48.4, HRHB: 19.5 }, signed_share: { RBiH: 33.0, RS: 47.3, HRHB: 19.7 },
        land_won: [{ id: 'gorazde_corridor', name: 'Goražde Corridor' }], land_given: [], land_refused: [], powers_won: [], powers_refused: [],
    },
    signing: { turn: 188, war: { weeks: 188, dead: { military: 22974, civilian: 31781 }, displaced: 1202697 } },
} as DaytonAgreementRecord;

afterEach(() => {
    cleanup();
    setLocale('en');
    storeState = { loadedGameState: null };
});

describe('DC A5 signing beat', () => {
    it('lays the date, the war cost and three initials on the blank document, with the ledger beside it', () => {
        const onContinue = vi.fn();
        render(createElement(DaytonSigningBeat, { agreement, fallbackDate: 'unused', onContinue }));
        expect(screen.getByTestId('dayton-signing-plate').getAttribute('src')).toMatch(/signing-table-/);
        expect(screen.getByTestId('dayton-signing-date').textContent).toMatch(/^Initialled at Wright-Patterson Air Force Base, Dayton, Ohio, /);
        expect(screen.getByTestId('dayton-signing-cost').textContent)
            .toBe('188 weeks of war. 22,974 soldiers and 31,781 civilians killed on all sides, 1,202,697 civilians displaced.');
        expect(screen.getByTestId('dayton-signing-RBiH').textContent).toBe('For the Republic of Bosnia and Herzegovina');
        expect(screen.getByTestId('dayton-signing-HRHB').textContent).toBe('For Herzeg-Bosnia');
        expect(screen.getByTestId('dayton-signing-RS').textContent).toBe('For Republika Srpska');
        expect(screen.getByRole('heading', { name: 'The agreement is initialled' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Your treaty against the mediator\'s draft' })).toBeTruthy();
        fireEvent.click(screen.getByTestId('dayton-signing-continue'));
        expect(onContinue).toHaveBeenCalledOnce();
    });

    it('marks the coerced signature at the forced table and falls back for an older record', () => {
        const imposed = { ...agreement, terms: { ...agreement.terms, imposed: { on_faction: 'RS', by: 'belgrade' as const, turn: 196 } } };
        delete (imposed as { signing?: unknown }).signing;
        render(createElement(DaytonSigningBeat, { agreement: imposed, fallbackDate: '9 Nov 1995', onContinue: () => {} }));
        expect(screen.getByRole('heading', { name: 'The agreement is initialled at the forced table' })).toBeTruthy();
        expect(screen.getByTestId('dayton-signing-RS').textContent).toContain('Initialled under pressure from Belgrade');
        expect(screen.getByTestId('dayton-signing-RBiH').dataset.imposed).toBeUndefined();
        expect(screen.getByTestId('dayton-signing-date').textContent).toContain('9 Nov 1995');
        expect(screen.getByTestId('dayton-signing-cost').textContent).toBe("This record kept no count of the war's cost at signing.");
    });

    it('opens the signed map from the document and returns to it on Escape', () => {
        render(createElement(DaytonSigningBeat, { agreement, fallbackDate: '', onContinue: () => {} }));
        fireEvent.click(screen.getByTestId('dayton-signing-map'));
        expect(screen.getByRole('heading', { name: 'The signed map' })).toBeTruthy();
        expect(document.activeElement?.textContent).toBe('Close the map');
        fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
        expect(screen.queryByRole('heading', { name: 'The signed map' })).toBeNull();
        expect(document.activeElement).toBe(screen.getByTestId('dayton-signing-map'));
    });

    it('speaks BCS', () => {
        setLocale('bcs');
        render(createElement(DaytonSigningBeat, { agreement, fallbackDate: '', onContinue: () => {} }));
        expect(screen.getByRole('heading', { name: 'Sporazum je parafiran' })).toBeTruthy();
        expect(screen.getByTestId('dayton-signing-RS').textContent).toBe('Za Republiku Srpsku');
        expect(screen.getByRole('button', { name: 'Nastavi na presudu' })).toBeTruthy();
    });

    it('stands between the signature and the Verdict', () => {
        storeState = { loadedGameState: { gameOver: true, turn: 188, daytonAgreement: agreement, controlBySettlement: {}, formations: [] } };
        render(createElement(VerdictScreen));
        expect(screen.getByTestId('dayton-signing-beat')).toBeTruthy();
        fireEvent.click(screen.getByTestId('dayton-signing-continue'));
        expect(screen.queryByTestId('dayton-signing-beat')).toBeNull();
        expect(document.body.textContent?.length).toBeGreaterThan(0);
    });

    it('skips the beat for an ending without a signed Dayton', () => {
        storeState = { loadedGameState: { gameOver: true, turn: 120, controlBySettlement: {}, formations: [] } };
        render(createElement(VerdictScreen));
        expect(screen.queryByTestId('dayton-signing-beat')).toBeNull();
        expect(document.body.textContent?.length).toBeGreaterThan(0);
    });

    it('takes the document out of the tab order while the signed map is open', () => {
        render(createElement(DaytonSigningBeat, { agreement, fallbackDate: '', onContinue: () => {} }));
        fireEvent.click(screen.getByTestId('dayton-signing-map'));
        expect(screen.getByTestId('dayton-signing-continue').closest('[inert]')).not.toBeNull();
        expect(screen.getByTestId('dayton-signing-map').closest('[inert]')).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Close the map' }));
        expect(screen.getByTestId('dayton-signing-continue').closest('[inert]')).toBeNull();
        expect(document.activeElement).toBe(screen.getByTestId('dayton-signing-map'));
    });

    it('drops a malformed signing record instead of rendering it', () => {
        expect(readDaytonAgreement(agreement)?.signing).toEqual(agreement.signing);
        const malformed = readDaytonAgreement({ ...agreement, signing: { turn: 188 } });
        expect(malformed?.version).toBe(1);
        expect(malformed?.signing).toBeUndefined();
    });

    it('ships the delivered plate geometry with all six hotspots', () => {
        for (const framing of ['4k', 'ultrawide']) {
            const blocking = JSON.parse(readFileSync(resolve(`src/ui/map/dayton_conference/art/signing-blocking-${framing}.json`), 'utf8'));
            expect(blocking.hotspots.map((h: { id: string }) => h.id).sort()).toEqual(['cost', 'date', 'map_thumb', 'sig_hrhb', 'sig_rbih', 'sig_rs']);
        }
    });
});
