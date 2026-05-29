// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { PendingConvoyDecisionView } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { ConvoyDecisionModal } = await import('../../src/ui/map/components/ConvoyDecisionModal');

const convoy: PendingConvoyDecisionView = {
    id: 'convoy:srebrenica:rs',
    target_enclave: 'Srebrenica',
    route_faction: 'RS',
    supply_amount: 0.4,
};

afterEach(() => {
    cleanup();
    setLocale('en');
});

describe('Convoy decision modal localization', () => {
    it('localizes convoy decision modal chrome and action prose in BCS mode', () => {
        setLocale('bcs');

        render(createElement(ConvoyDecisionModal, {
            convoy,
            onClose: vi.fn(),
            onDecide: vi.fn(),
        }));

        expect(screen.getByText('Humanitarni konvoj')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zatvori' })).toBeTruthy();
        expect(screen.getByText('Ruta')).toBeTruthy();
        expect(screen.getByText('Zalihe')).toBeTruthy();
        expect(screen.getByText('Pripremljeno')).toBeTruthy();
        expect(screen.getByText('Nista')).toBeTruthy();
        expect(screen.getByText('Kontrolor rute mora odluciti da li pomoc stize u enklavu, biva zaustavljena ili preusmjerena. Ova naredba je pripremljena za sljedeci potez i moze se promijeniti prije nastavka.')).toBeTruthy();
        expect(screen.getByText('Dozvoli konvoj')).toBeTruthy();
        expect(screen.getByText('Pusti kolonu pomoci kroz ovu rutu.')).toBeTruthy();
        expect(screen.getByText('Blokiraj konvoj')).toBeTruthy();
        expect(screen.getByText('Odbij prolaz i prihvati diplomatsku cijenu.')).toBeTruthy();
        expect(screen.getByText('Preusmjeri konvoj')).toBeTruthy();
        expect(screen.getByText('Preusmjeri pomoc dalje od trazene enklave.')).toBeTruthy();
        expect(screen.queryByText('Humanitarian Convoy')).toBeNull();
    });
});
