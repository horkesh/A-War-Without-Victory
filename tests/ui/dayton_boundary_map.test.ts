// @vitest-environment jsdom
/**
 * DC A3 (owner adopted 2026-11-08): the live wall map and the Boundary Map. Stage logic is
 * pure; the component reads Codex's registered plates and the shared settlement geometry.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FeatureCollection } from 'geojson';

import * as dataLoader from '../../src/ui/map/data/DataLoader';
import { entityOf, entityShares, refusedPlanControllers, stageChanges } from '../../src/ui/map/dayton_conference/boundary_stages';
import { BoundaryMap, BoardLine } from '../../src/ui/map/dayton_conference/BoundaryMap';
import { DaytonRoomBackdrop } from '../../src/ui/map/dayton_conference/DaytonRoomBackdrop';
import boardRegistration from '../../src/ui/map/dayton_conference/art/board-registration-4k.json';
import { setLocale } from '../../src/ui/map/i18n/index.js';

const painted = JSON.parse(readFileSync(resolve(process.cwd(), 'data/source/calibration/painted_control_oct1995.json'), 'utf8'))
    .by_settlement_id as Record<string, string>;

const square = (id: string, x: number): FeatureCollection['features'][number] => ({
    type: 'Feature', properties: { osid: id, name: id.split(':')[2] },
    geometry: { type: 'Polygon', coordinates: [[[17 + x, 44], [17.1 + x, 44], [17.1 + x, 44.1], [17 + x, 44.1], [17 + x, 44]]] },
});
const GEOMETRY: FeatureCollection = { type: 'FeatureCollection', features: [square('op:a:one', 0), square('op:a:two', 0.1), square('op:b:three', 0.2)] };

afterEach(() => { cleanup(); setLocale('en'); vi.restoreAllMocks(); });

describe('stage logic', () => {
    it('reads entities, not parties', () => {
        expect(entityOf('RBiH')).toBe('FED');
        expect(entityOf('HRHB')).toBe('FED');
        expect(entityOf('RS')).toBe('RS');
        expect(entityOf(null)).toBeNull();
    });

    it('gives each changed cell a plain reason and marks crossings of the inter-entity line', () => {
        const front = { 'op:a:one': 'RS', 'op:a:two': 'RBiH', 'op:b:three': 'HRHB' };
        const opening = { 'op:a:one': 'RBiH', 'op:a:two': 'RBiH', 'op:b:three': 'RBiH' };
        expect(stageChanges(front, { id: 'opening', controllers: opening })).toEqual([
            { osid: 'op:a:one', from: 'RS', to: 'RBiH', acrossLine: true, reason: { kind: 'mediator' } },
            { osid: 'op:b:three', from: 'HRHB', to: 'RBiH', acrossLine: false, reason: { kind: 'mediator' } },
        ]);
        const draft = { ...opening, 'op:a:two': 'RS', 'op:b:three': 'RS' };
        const changes = stageChanges(opening, { id: 'draft', controllers: draft }, [{ name: 'Sarajevo Suburbs', osids: ['op:a:two'] }]);
        expect(changes.map(c => c.reason)).toEqual([{ kind: 'package', name: 'Sarajevo Suburbs' }, { kind: 'adjusted' }]);
        expect(stageChanges(front, { id: 'signed', controllers: opening }).every(c => c.reason.kind === 'treaty')).toBe(true);
    });

    it('measures the entity shares on the engine denominator', () => {
        const shares = entityShares(painted);
        expect(shares.FED + shares.RS).toBeGreaterThan(99);
        expect(shares.RS).toBeGreaterThan(40);
    });

    it('draws a refused plan from the front alone, and nothing for Dayton or an unknown plan', () => {
        const vo = refusedPlanControllers('vance_owen', painted)!;
        expect(Object.keys(vo).length).toBe(Object.keys(painted).length);
        expect(refusedPlanControllers('dayton', painted)).toBeNull();
        expect(refusedPlanControllers('cutileiro', painted)).toBeNull();
        expect(refusedPlanControllers('vance_owen', painted)).toEqual(vo);
    });
});

describe('BoundaryMap', () => {
    const stages = [
        { id: 'front' as const, controllers: { 'op:a:one': 'RS', 'op:a:two': 'RBiH', 'op:b:three': 'HRHB' } },
        { id: 'opening' as const, controllers: { 'op:a:one': 'RBiH', 'op:a:two': 'RBiH', 'op:b:three': 'HRHB' } },
        { id: 'draft' as const, controllers: { 'op:a:one': 'RBiH', 'op:a:two': 'RS', 'op:b:three': 'HRHB' } },
    ];

    it('opens on the latest stage, scrubs with the keyboard, and lists what changed and why', async () => {
        vi.spyOn(dataLoader, 'loadOperationalSettlements').mockResolvedValue(GEOMETRY);
        render(createElement(BoundaryMap, { stages, packages: [{ name: 'Sarajevo Suburbs', osids: ['op:a:two'] }] }));
        const map = within(screen.getByRole('region', { name: 'Boundary Map' }));
        expect(map.getByRole('radio', { name: /Your current draft/ }).getAttribute('aria-checked')).toBe('true');
        expect(map.getByText('1 settlements change hands; 1 of them cross the line between the entities.')).toBeTruthy();
        expect(map.getByText('Raised at the table: Sarajevo Suburbs · 1')).toBeTruthy();
        await waitFor(() => expect(document.querySelector('[data-dayton-osid="op:a:two"]')?.getAttribute('data-dayton-changed')).toBe('true'));
        fireEvent.keyDown(map.getByRole('radiogroup'), { key: 'ArrowLeft' });
        expect(map.getByRole('radio', { name: /Mediator's opening line/ }).getAttribute('aria-checked')).toBe('true');
        expect(map.getByText('The mediator\'s map · 1')).toBeTruthy();
        fireEvent.click(map.getByRole('radio', { name: /Wartime front/ }));
        expect(map.getByText(/This is where the line starts/)).toBeTruthy();
        expect(map.getByRole('link', { name: '© OpenStreetMap' }).getAttribute('href')).toBe('https://www.openstreetmap.org/copyright');
    });

    it('fills Croat-held Federation ground with the hatch pattern and the rest by entity', async () => {
        vi.spyOn(dataLoader, 'loadOperationalSettlements').mockResolvedValue(GEOMETRY);
        render(createElement(BoundaryMap, { stages }));
        await waitFor(() => expect(document.querySelector('[data-dayton-osid="op:b:three"]')).toBeTruthy());
        expect(document.querySelector('[data-dayton-osid="op:b:three"]')!.getAttribute('fill')).toMatch(/^url\(#/);
        expect(document.querySelector('[data-dayton-osid="op:a:two"]')!.getAttribute('fill')).toBe('#e3a899');
        expect(document.querySelector('[data-dayton-osid="op:a:one"]')!.getAttribute('fill')).toBe('#a3c6aa');
    });

    it('shows a refused plan as a ghost outline when asked', async () => {
        vi.spyOn(dataLoader, 'loadOperationalSettlements').mockResolvedValue(GEOMETRY);
        render(createElement(BoundaryMap, { stages: [{ id: 'front', controllers: painted }, { id: 'opening', controllers: painted }],
            refusedPlans: [{ id: 'vance_owen', label: 'Vance-Owen Plan' }] }));
        await waitFor(() => expect(document.querySelector('[data-dayton-osid]')).toBeTruthy());
        expect(document.querySelector('[data-dayton-ghost]')).toBeNull();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Vance-Owen Plan' }));
        expect(document.querySelector('[data-dayton-ghost="vance_owen"]')).toBeTruthy();
    });

    it('localizes in BCS', () => {
        setLocale('bcs');
        vi.spyOn(dataLoader, 'loadOperationalSettlements').mockResolvedValue(GEOMETRY);
        render(createElement(BoundaryMap, { stages }));
        expect(screen.getByRole('region', { name: 'Karta razgraničenja' })).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Vaš trenutni nacrt/ })).toBeTruthy();
    });
});

describe('the live wall board', () => {
    it('pins the line to the registered paper rectangle of Codex\'s board plate', async () => {
        vi.spyOn(dataLoader, 'loadOperationalSettlements').mockResolvedValue(GEOMETRY);
        const labels = { folder: 'Folder', draft: 'Draft', map: 'Map', binder: 'Binder' };
        render(createElement(DaytonRoomBackdrop, { labels, onOpen: () => {}, board: createElement(BoardLine, { controllers: { 'op:a:one': 'RS' } }) }));
        const board = screen.getByTestId('dayton-room-board');
        const { x, y, width, height } = boardRegistration.imagePixels;
        expect(parseFloat(board.style.left)).toBeCloseTo(x / 3840 * 100, 6);
        expect(parseFloat(board.style.top)).toBeCloseTo(y / 2160 * 100, 6);
        expect(parseFloat(board.style.width)).toBeCloseTo(width / 3840 * 100, 6);
        expect(parseFloat(board.style.height)).toBeCloseTo(height / 2160 * 100, 6);
        expect(await screen.findByTestId('dayton-board-line')).toBeTruthy();
        // The board never blocks the map hotspot.
        expect(screen.getByTestId('dayton-hotspot-map')).toBeTruthy();
    });

    it('stays blank until there is a line', () => {
        const labels = { folder: 'Folder', draft: 'Draft', map: 'Map', binder: 'Binder' };
        render(createElement(DaytonRoomBackdrop, { labels, onOpen: () => {} }));
        expect(screen.queryByTestId('dayton-room-board')).toBeNull();
    });
});
