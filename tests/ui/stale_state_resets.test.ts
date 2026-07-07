import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function read(path: string): string {
    return readFileSync(path, 'utf8');
}

describe('GUI audit Batch E stale-state resets', () => {
    afterEach(() => {
        useGameStore.setState({
            armyHQOpen: false,
            armyHQTab: 'briefing',
            armyHQExpandedCorpsId: null,
            armyHQExpandedSections: {},
            armyHQOfficerSelectionCorpsId: null,
            focusedAftermathTurn: null,
            focusedOperationHistoryId: null,
            focusedDecisionConsequenceId: null,
        });
    });

    it('closing Army HQ resets the next open to the briefing tab', () => {
        const store = useGameStore.getState();

        store.setArmyHQTab('personnel');
        store.setArmyHQOpen(true);
        store.setArmyHQOpen(false);

        expect(useGameStore.getState().armyHQTab).toBe('briefing');
    });

    it('closing Army HQ clears stale focused Records targets', () => {
        const store = useGameStore.getState();

        useGameStore.setState({
            focusedAftermathTurn: 17,
            focusedOperationHistoryId: 'operation-aar-17',
            focusedDecisionConsequenceId: 'decision-receipt-17',
        });

        store.setArmyHQOpen(false);

        expect(useGameStore.getState()).toMatchObject({
            focusedAftermathTurn: null,
            focusedOperationHistoryId: null,
            focusedDecisionConsequenceId: null,
        });
    });

    it('selection-bound confirmation messages reset when the selected target changes', () => {
        const corpsFrontPanel = read('src/ui/map/components/CorpsFrontPanel.tsx');
        const selectionPanel = read('src/ui/map/components/SelectionPanel.tsx');

        expect(corpsFrontPanel).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*setSectorActionMessage\(null\)[\s\S]*\}, \[selectedSectorId\]\)/);
        expect(selectionPanel).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*setSupportMessage\(null\)[\s\S]*\}, \[selectedOsid\]\)/);
    });

    it('flattened Decision Room filters stay visible instead of becoming hidden stale state', () => {
        const panel = read('src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');

        expect(panel).not.toContain('setShowAdvanced');
        expect(panel).not.toContain('showAdvanced');
        expect(panel).not.toContain('data-testid="decision-room-advanced"');
        expect(panel).toContain('{view.lenses.length > 0 && (');
        expect(panel).toContain('setActiveLens(id)');
    });

    it('the Inbox home badge closes store-owned overlays before clearing selections', () => {
        const toolbar = read('src/ui/map/components/PresidentialToolbar.tsx');

        expect(toolbar).toContain('gs.setArmyHQOpen(false)');
        expect(toolbar).toContain('gs.setCodexOpen(false)');
        expect(toolbar).toContain('gs.setChronicleOpen(false)');
        expect(toolbar).toContain('gs.setIsOperationsPanelOpen(false)');
        expect(toolbar).toContain('gs.setOpsPlanningModalOpen(false)');
    });
});
