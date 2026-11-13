// @vitest-environment jsdom
/**
 * Codex review on #577 (M3 presentation-only OG rule):
 * 1. The unheld-front label is built with t() in the adapter; switching language after loading
 *    must rebuild it ("Unheld front near Tuzla" -> "Nebranjeni front (Tuzla)").
 * 2. The Army HQ OG section counts real OGs only (one or more brigades) and keeps brigade-less
 *    sectors reachable under their own "Unheld fronts" sub-heading.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SectorsSection } from '../../src/ui/map/components/army_hq/SectorsSection.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { CorpsFrontSectorView, LoadedGameState } from '../../src/ui/map/data/types.js';

function sectorRecord(id: string, osid: string, assigned: string[]) {
    return {
        sector_id: id, corps_id: 'arbih_2nd_corps', faction: 'RBiH', opposing_factions: ['RS'],
        edge_ids: ['e_' + id], territory_osids: [osid],
        sub_segments: [{ sub_segment_id: 'ss_' + id, edge_ids: ['e_' + id], friendly_osids: [osid], enemy_osids: [] }],
        length_edges: 1, assigned_brigade_ids: assigned, reserve_brigade_ids: [],
        density: 0, threat_ratio: 0, defensive_power: 0, sector_stance: 'defend', stance_source: 'bot',
    };
}

function saveJson(): string {
    return JSON.stringify({
        schema_version: 2,
        meta: { turn: 5, seed: 'm3-locale', phase: 'war', player_faction: 'RBiH' },
        factions: [{
            id: 'RBiH',
            profile: { authority: 0.5, legitimacy: 0.5, control: 0.5, logistics: 0.5, exhaustion: 0.1 },
            areasOfResponsibility: [], supply_sources: [], command_capacity: 3,
            negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
            declaration_pressure: 0, declared: true, declaration_turn: 0,
        }],
        military: {
            formations: {
                arbih_2nd_corps: { id: 'arbih_2nd_corps', faction: 'RBiH', name: '2nd Corps', kind: 'corps', status: 'active', created_turn: 0, tags: [] },
                b_main: { id: 'b_main', faction: 'RBiH', name: 'Main Brigade', kind: 'brigade', status: 'active', created_turn: 0, tags: [], corps_id: 'arbih_2nd_corps', location_osid: 'op:kalesija:m1' },
            },
            front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {},
            corps_front_sectors: {
                held: sectorRecord('sector:arbih_2nd_corps:1', 'op:kalesija:m1', ['b_main']),
                unheld: sectorRecord('sector:arbih_2nd_corps:2', 'op:tuzla:u1', []),
            },
        },
        political: {
            political_controllers: { 'op:kalesija:m1': 'RBiH', 'op:tuzla:u1': 'RBiH' },
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
        },
        displacement: { displacement_event_log: [] },
    });
}

function unheldName(): string | undefined {
    return useGameStore.getState().loadedGameState?.corpsFrontSectors
        ?.find((s) => s.sector_id === 'sector:arbih_2nd_corps:2')?.display_name;
}

describe('M3 unheld-front label follows the active language', () => {
    afterEach(() => {
        setLocale('en');
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('loads in EN, switches to BCS and back, and the label follows', async () => {
        setLocale('en');
        await useGameStore.getState().loadSave(saveJson());
        expect(unheldName()).toBe('Unheld front near Tuzla');

        setLocale('bcs');
        expect(unheldName()).toBe('Nebranjeni front (Tuzla)');

        setLocale('en');
        expect(unheldName()).toBe('Unheld front near Tuzla');
    });
});

describe('M3 Army HQ OG section counts held OGs only', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
        useGameStore.setState(useGameStore.getInitialState());
    });

    function viewSector(id: string, name: string, assigned: string[], unheld: boolean): CorpsFrontSectorView {
        return {
            sector_id: id, display_name: name, faction: 'RBiH', corps_id: 'arbih_2nd_corps', corps_name: '2nd Corps',
            opposing_factions: ['RS'], edge_ids: [], sub_segment_count: 0, sub_segments: [],
            assigned_brigade_ids: assigned, reserve_brigade_ids: [], rear_brigade_ids: [], length_edges: 1,
            ...(unheld ? { unheld_front: true } : {}),
        } as CorpsFrontSectorView;
    }

    it('one held OG and one unheld front: header counts 1, the unheld row stays under its own heading', () => {
        const held = viewSector('sector:arbih_2nd_corps:1', 'OG Kalesija', ['b_main'], false);
        const unheld = viewSector('sector:arbih_2nd_corps:2', 'Unheld front near Tuzla', [], true);
        useGameStore.setState({
            loadedGameState: { formations: [], corpsFrontSectors: [unheld, held] } as unknown as LoadedGameState,
        });
        const { container } = render(React.createElement(SectorsSection, {
            corpsId: 'arbih_2nd_corps',
            sectors: [unheld, held],
            factionBattles: [],
            defaultOpen: true,
        }));

        const header = container.querySelector('button[aria-expanded]');
        expect(header?.textContent).toContain('OGs');
        expect(header?.textContent).toContain('1');
        expect(header?.textContent).not.toContain('2');

        const heading = screen.getByTestId('army-hq-unheld-fronts-heading');
        expect(heading.textContent).toBe('Unheld fronts (1)');

        const rows = screen.getAllByTestId('army-hq-sector-row').map((row) => row.getAttribute('data-sector-id'));
        expect(rows).toEqual(['sector:arbih_2nd_corps:1', 'sector:arbih_2nd_corps:2']);
        // The heading sits between the held OG and the unheld front.
        const order = [...container.querySelectorAll('[data-testid="army-hq-sector-row"], [data-testid="army-hq-unheld-fronts-heading"]')]
            .map((el) => el.getAttribute('data-testid'));
        expect(order).toEqual(['army-hq-sector-row', 'army-hq-unheld-fronts-heading', 'army-hq-sector-row']);
    });

    it('no unheld fronts: no sub-heading', () => {
        const held = viewSector('sector:arbih_2nd_corps:1', 'OG Kalesija', ['b_main'], false);
        useGameStore.setState({ loadedGameState: { formations: [], corpsFrontSectors: [held] } as unknown as LoadedGameState });
        render(React.createElement(SectorsSection, { corpsId: 'arbih_2nd_corps', sectors: [held], factionBattles: [], defaultOpen: true }));
        expect(screen.queryByTestId('army-hq-unheld-fronts-heading')).toBeNull();
    });
});
