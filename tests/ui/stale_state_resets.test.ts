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
            focusedOperationHistoryId: null,
        });
    });

    it('closing Army HQ resets the next open to the briefing tab', () => {
        const store = useGameStore.getState();

        store.setArmyHQTab('personnel');
        store.setArmyHQOpen(true);
        store.setArmyHQOpen(false);

        expect(useGameStore.getState().armyHQTab).toBe('briefing');
    });

    it('selection-bound confirmation messages reset when the selected target changes', () => {
        const corpsFrontPanel = read('src/ui/map/components/CorpsFrontPanel.tsx');
        const selectionPanel = read('src/ui/map/components/SelectionPanel.tsx');

        expect(corpsFrontPanel).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*setSectorActionMessage\(null\)[\s\S]*\}, \[selectedSectorId\]\)/);
        expect(selectionPanel).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*setSupportMessage\(null\)[\s\S]*\}, \[selectedOsid\]\)/);
    });

    it('hiding advanced Decision Room controls also clears hidden lens filters', () => {
        const panel = read('src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');

        expect(panel).toContain('setShowAdvanced(nextShowAdvanced)');
        expect(panel).toMatch(/if \(!nextShowAdvanced\) \{[\s\S]*setActiveLens\('all'\)[\s\S]*\}/);
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
