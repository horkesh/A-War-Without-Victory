import { expect, it } from 'vitest';

import * as panelRail from '../src/ui/map/components/panelRail.js';

it('left rail panels align to the visible command sidebar without the old blank gap', () => {
    const primary = panelRail.getPanelRailStyle('primary', '24rem', 'left');
    const secondary = panelRail.getPanelRailStyle('secondary', '24rem', 'left');

    expect(primary.left).toBe('calc(15.5rem + 0.5rem)');
    expect(secondary.left).toBe('calc(15.5rem + 0.5rem)');
});

it('derivePanelRailState keeps formation as the single leaf when a brigade drills in from a sector', () => {
    const rail = (panelRail as typeof panelRail & {
        derivePanelRailState?: (state: {
            selectedOsid: string | null;
            selectedArmyId: string | null;
            selectedArmyHqId: string | null;
            selectedCorpsId: string | null;
            selectedCorpsFrontSectorId: string | null;
            selectedFormationId: string | null;
            selectedOperationKey: string | null;
            selectedOrbatCorpsId: string | null;
        }) => { panel: string | null; trail: Array<{ panel: string; id: string }> };
    }).derivePanelRailState?.({
        selectedOsid: null,
        selectedArmyId: null,
        selectedArmyHqId: null,
        selectedCorpsId: null,
        selectedCorpsFrontSectorId: 'rbih_sector_1',
        selectedFormationId: 'b1',
        selectedOperationKey: null,
        selectedOrbatCorpsId: null,
    });

    expect(rail).toEqual({
        panel: 'formation',
        trail: [{ panel: 'sector', id: 'rbih_sector_1' }],
    });
});

it('derivePanelRailState shows standalone brigade selection without stale parent context', () => {
    const rail = (panelRail as typeof panelRail & {
        derivePanelRailState?: (state: {
            selectedOsid: string | null;
            selectedArmyId: string | null;
            selectedArmyHqId: string | null;
            selectedCorpsId: string | null;
            selectedCorpsFrontSectorId: string | null;
            selectedFormationId: string | null;
            selectedOperationKey: string | null;
            selectedOrbatCorpsId: string | null;
        }) => { panel: string | null; trail: Array<{ panel: string; id: string }> };
    }).derivePanelRailState?.({
        selectedOsid: null,
        selectedArmyId: null,
        selectedArmyHqId: null,
        selectedCorpsId: null,
        selectedCorpsFrontSectorId: null,
        selectedFormationId: 'brigade:standalone',
        selectedOperationKey: null,
        selectedOrbatCorpsId: null,
    });

    expect(rail).toEqual({ panel: 'formation', trail: [] });
});

it('derivePanelRailState keeps corps as the single leaf when drilling in from army', () => {
    const rail = (panelRail as typeof panelRail & {
        derivePanelRailState?: (state: {
            selectedOsid: string | null;
            selectedArmyId: string | null;
            selectedArmyHqId: string | null;
            selectedCorpsId: string | null;
            selectedCorpsFrontSectorId: string | null;
            selectedFormationId: string | null;
            selectedOperationKey: string | null;
            selectedOrbatCorpsId: string | null;
        }) => { panel: string | null; trail: Array<{ panel: string; id: string }> };
    }).derivePanelRailState?.({
        selectedOsid: null,
        selectedArmyId: 'RBiH',
        selectedArmyHqId: null,
        selectedCorpsId: 'rbih_corps',
        selectedCorpsFrontSectorId: null,
        selectedFormationId: null,
        selectedOperationKey: null,
        selectedOrbatCorpsId: null,
    });

    expect(rail).toEqual({
        panel: 'corps',
        trail: [{ panel: 'army', id: 'RBiH' }],
    });
});

it('derivePanelRailState falls back to inbox when operation selection has no panel-rail owner', () => {
    const rail = (panelRail as typeof panelRail & {
        derivePanelRailState?: (state: {
            selectedOsid: string | null;
            selectedArmyId: string | null;
            selectedArmyHqId: string | null;
            selectedCorpsId: string | null;
            selectedCorpsFrontSectorId: string | null;
            selectedFormationId: string | null;
            selectedOperationKey: string | null;
            selectedOrbatCorpsId: string | null;
        }) => { panel: string | null; trail: Array<{ panel: string; id: string }> };
    }).derivePanelRailState?.({
        selectedOsid: null,
        selectedArmyId: null,
        selectedArmyHqId: null,
        selectedCorpsId: null,
        selectedCorpsFrontSectorId: null,
        selectedFormationId: null,
        selectedOperationKey: 'rbih_corps|Operation Drina',
        selectedOrbatCorpsId: null,
    });

    expect(rail).toEqual({ panel: 'inbox', trail: [] });
});

it('suppresses the Presidential Inbox while the map-local Operations panel owns the right rail', () => {
    const shouldRenderInboxPanel = (panelRail as typeof panelRail & {
        shouldRenderInboxPanel?: (primary: string | null, operationsPanelOpen: boolean) => boolean;
    }).shouldRenderInboxPanel;

    expect(shouldRenderInboxPanel?.('inbox', false)).toBe(true);
    expect(shouldRenderInboxPanel?.('inbox', true)).toBe(false);
    expect(shouldRenderInboxPanel?.('settlement', false)).toBe(false);
});
