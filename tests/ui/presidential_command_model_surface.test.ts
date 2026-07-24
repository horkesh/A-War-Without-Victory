import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('presidential command model player surfaces', () => {
  it('does not mount the detailed brigade-and-axis operations planner', () => {
    const app = read('src/ui/map/App.tsx');
    const corpsDetail = read('src/ui/map/components/CorpsDetail.tsx');
    const corpsFront = read('src/ui/map/components/CorpsFrontPanel.tsx');

    expect(app).not.toContain("import { OpsPlanningModal }");
    expect(app).not.toContain('<OpsPlanningModal />');
    expect(corpsDetail).not.toContain('setOpsPlanningContext');
    expect(corpsDetail).not.toContain('prepareOperationInHq');
    expect(corpsFront).not.toContain('setOpsPlanningContext');
    expect(corpsFront).not.toContain('corps-front-draft-directive');
  });

  it('does not expose direct brigade attack or sector-assignment controls', () => {
    const app = read('src/ui/map/App.tsx');
    const map = read('src/ui/map/map/MapContainer.tsx');
    const formation = read('src/ui/map/components/FormationDetail.tsx');
    const preload = read('src/desktop/preload.cjs');

    expect(app).not.toContain('AttackConfirmation');
    expect(app).not.toContain('stageAttackOrder');
    expect(map).not.toContain('setPendingAttackConfirmation');
    expect(map).not.toContain('stageAssignBrigadeToSectorAction');
    expect(formation).not.toContain('assignBrigadeToSectorOverrideAction');
    expect(preload).not.toContain('stageAttackOrder:');
    expect(preload).not.toContain('assignBrigadeToSector:');
    expect(preload).not.toContain('stagePostureOrder:');
    expect(preload).not.toContain('stageMoveOrder:');
    expect(preload).not.toContain('stageDeployOrder:');
    expect(preload).not.toContain('stageUndeployOrder:');
    expect(preload).not.toContain('stageCorpsOperationOrder:');
    expect(preload).not.toContain('stageAssignOperationCommander:');
  });

  it('keeps the canonical request-operation lever as the player route', () => {
    const directiveCard = read('src/ui/map/components/army_hq/DirectiveCard.tsx');
    const main = read('src/desktop/electron-main.cjs');

    expect(directiveCard).toContain('stageOpDirectiveOrder');
    expect(main).toContain("ipcMain.handle('stage-op-directive-order'");
    expect(main).toContain('The president names ONLY the objective');
  });
});
