import { expect, it } from 'vitest';

import * as panelRail from '../src/ui/map/components/panelRail.js';

it('left rail panels align to the visible command sidebar without the old blank gap', () => {
    const primary = panelRail.getPanelRailStyle('primary', '24rem', 'left');
    const secondary = panelRail.getPanelRailStyle('secondary', '24rem', 'left');

    expect(primary.left).toBe('calc(15.5rem + 0.5rem)');
    expect(secondary.left).toBe('calc(calc(15.5rem + 0.5rem) + 24rem + 0.5rem)');
});

it('derivePanelRailState keeps sector as primary when a brigade drills in from it', () => {
    const rail = (panelRail as typeof panelRail & {
        derivePanelRailState?: (state: {
            selectedOsid: string | null;
            selectedArmyId: string | null;
            selectedCorpsId: string | null;
            selectedCorpsFrontSectorId: string | null;
            selectedFormationId: string | null;
            selectedOperationKey: string | null;
        }) => { primary: string | null; secondary: string | null; };
    }).derivePanelRailState?.({
        selectedOsid: null,
        selectedArmyId: null,
        selectedCorpsId: null,
        selectedCorpsFrontSectorId: 'rbih_sector_1',
        selectedFormationId: 'b1',
        selectedOperationKey: null,
    });

    expect(rail).toEqual({ primary: 'sector', secondary: 'formation' });
});

it('derivePanelRailState keeps army as primary when corps drills in from it', () => {
    const rail = (panelRail as typeof panelRail & {
        derivePanelRailState?: (state: {
            selectedOsid: string | null;
            selectedArmyId: string | null;
            selectedCorpsId: string | null;
            selectedCorpsFrontSectorId: string | null;
            selectedFormationId: string | null;
            selectedOperationKey: string | null;
        }) => { primary: string | null; secondary: string | null; };
    }).derivePanelRailState?.({
        selectedOsid: null,
        selectedArmyId: 'RBiH',
        selectedCorpsId: 'rbih_corps',
        selectedCorpsFrontSectorId: null,
        selectedFormationId: null,
        selectedOperationKey: null,
    });

    expect(rail).toEqual({ primary: 'army', secondary: 'corps' });
});

it('derivePanelRailState falls back to inbox when operation selection has no panel-rail owner', () => {
    const rail = (panelRail as typeof panelRail & {
        derivePanelRailState?: (state: {
            selectedOsid: string | null;
            selectedArmyId: string | null;
            selectedCorpsId: string | null;
            selectedCorpsFrontSectorId: string | null;
            selectedFormationId: string | null;
            selectedOperationKey: string | null;
        }) => { primary: string | null; secondary: string | null; };
    }).derivePanelRailState?.({
        selectedOsid: null,
        selectedArmyId: null,
        selectedCorpsId: null,
        selectedCorpsFrontSectorId: null,
        selectedFormationId: null,
        selectedOperationKey: 'rbih_corps|Operation Drina',
    });

    expect(rail).toEqual({ primary: 'inbox', secondary: null });
});
