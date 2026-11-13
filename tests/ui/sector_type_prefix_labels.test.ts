// @vitest-environment jsdom
/**
 * Owner (2026-11-12): "Label bug should be fixed." Copy that puts a type word in front of a sector
 * name must not double it ("OG OG Rogatica", "Sektor OG Rogatica") and must never prefix an unheld
 * front (M3: a brigade-less sector is not an OG).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { generateCoSBriefing } from '../../src/ui/map/components/army_hq/ChiefOfStaffBriefing.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';
import type { CommandBriefingItemView, CorpsFrontSectorView, LoadedGameState } from '../../src/ui/map/data/types.js';
import {
    sectorLabelCarriesOwnType,
    sectorLabelNeedsTypePrefix,
} from '../../src/ui/map/utils/sectorTypePrefix.js';

function flatten(paragraphs: ReturnType<typeof generateCoSBriefing>): string {
    return paragraphs
        .map((segments) => segments.map((segment) => segment.type === 'link' ? segment.label : segment.value).join(''))
        .join('\n');
}

function thinSectorItem(label: string): CommandBriefingItemView {
    return {
        id: 'thin-sector',
        kind: 'military',
        category: 'military',
        briefingCategory: 'defense',
        severity: 'warning',
        title: `${label}: thin line`,
        detail: 'Detail.',
        subject: { type: 'sector', id: 'sector:vrs_drina:3', label, corpsId: 'vrs_drina' },
        target: { type: 'sector', sectorId: 'sector:vrs_drina:3', corpsId: 'vrs_drina', label },
    } as CommandBriefingItemView;
}

function stateWithSector(displayName: string, unheld: boolean): LoadedGameState {
    const sector = {
        sector_id: 'sector:vrs_drina:3',
        corps_id: 'vrs_drina',
        corps_name: 'Drina Corps',
        display_name: displayName,
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: [],
        sub_segment_count: 0,
        length_edges: 0,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        ...(unheld ? { unheld_front: true } : {}),
    } as unknown as CorpsFrontSectorView;
    return {
        ...makeMockLoadedGameState(),
        turn: 4,
        latestTurnSummary: null,
        corpsFrontSectors: [sector],
    } as LoadedGameState;
}

// RS Chief of Staff speaks in the "precise" tone, which used to prefix "OG " / "Sektor ".
function preciseAlert(label: string, unheld = false): string {
    return flatten(generateCoSBriefing([thinSectorItem(label)], stateWithSector(label, unheld), 'RS'));
}

describe('sector type prefix helper', () => {
    it('recognizes names that already carry their type', () => {
        for (const label of ['OG Tuzla', 'TG Foča', 'Doboj OG 9', '"Vogošća" OG', 'OZ Central Bosnia', '1. OG (Tuzla)', 'Assigned OG', 'Dodijeljeni sektor']) {
            expect(sectorLabelCarriesOwnType(label), label).toBe(true);
        }
    });

    it('treats unheld-front names (EN and BCS) as never prefixed', () => {
        expect(sectorLabelNeedsTypePrefix('Unheld front near Tuzla')).toBe(false);
        expect(sectorLabelNeedsTypePrefix('Nebranjeni front (Tuzla)')).toBe(false);
        expect(sectorLabelNeedsTypePrefix('Tuzla', true)).toBe(false);
    });

    it('still prefixes a bare place name, and does not match OG inside a word', () => {
        expect(sectorLabelNeedsTypePrefix('Rogatica')).toBe(true);
        expect(sectorLabelNeedsTypePrefix('Ogulin')).toBe(true);
        expect(sectorLabelNeedsTypePrefix('Tozla')).toBe(true);
    });
});

describe('Chief of Staff precise defence alert (EN/BCS)', () => {
    afterEach(() => setLocale('en'));

    it('EN: no doubled OG, bare place still prefixed, unheld front never prefixed', () => {
        setLocale('en');
        const named = preciseAlert('OG Rogatica');
        expect(named).toContain('OG Rogatica is undermanned relative to frontage.');
        expect(named).not.toContain('OG OG');

        expect(preciseAlert('Rogatica')).toContain('OG Rogatica is undermanned relative to frontage.');

        const unheld = preciseAlert('Unheld front near Rogatica', true);
        expect(unheld).toContain('Unheld front near Rogatica is undermanned');
        expect(unheld).not.toContain('OG Unheld');
    });

    it('BCS: no "Sektor OG", bare place still prefixed, unheld front never prefixed', () => {
        setLocale('bcs');
        const named = preciseAlert('OG Rogatica');
        expect(named).toContain('OG Rogatica ima premalo ljudstva');
        expect(named).not.toContain('Sektor OG');

        expect(preciseAlert('Rogatica')).toContain('Sektor Rogatica ima premalo ljudstva');

        const unheld = preciseAlert('Nebranjeni front (Rogatica)', true);
        expect(unheld).toContain('Nebranjeni front (Rogatica) ima premalo ljudstva');
        expect(unheld).not.toContain('Sektor Nebranjeni');
    });
});
