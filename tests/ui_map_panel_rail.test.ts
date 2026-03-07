import assert from 'node:assert';
import { test } from 'node:test';

import * as panelRail from '../src/ui/map/components/panelRail.js';

test('derivePanelRailState keeps sector as primary when a brigade drills in from it', () => {
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

    assert.deepStrictEqual(rail, { primary: 'sector', secondary: 'formation' });
});

test('derivePanelRailState keeps army as primary when corps drills in from it', () => {
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

    assert.deepStrictEqual(rail, { primary: 'army', secondary: 'corps' });
});

test('derivePanelRailState treats direct operation selection as a primary panel', () => {
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

    assert.deepStrictEqual(rail, { primary: 'operation', secondary: null });
});
