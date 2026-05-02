import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('Presidential Decision Room wiring', () => {
  it('mounts the decision room as the first Army HQ briefing section', () => {
    const armyHq = read('../src/ui/map/components/army_hq/ArmyHQModal.tsx');

    expect(armyHq).toContain('PresidentialDecisionRoomPanel');
    expect(armyHq.indexOf('<PresidentialDecisionRoomPanel')).toBeLessThan(
      armyHq.indexOf('<PresidentialAttentionPanel'),
    );
  });

  it('keeps decision-room synthesis in a pure UI read-model module', () => {
    const model = read('../src/ui/map/data/presidentialDecisionRoom.ts');

    expect(model).toContain('buildPresidentialDecisionRoomView');
    expect(model).toContain('LoadedGameState');
    expect(model).toContain('buildTurnAftermathRecordViews');
    expect(model).toContain('buildTurnAftermathCampaignCost');
    expect(model).not.toMatch(/from ['"].*src\/sim\/combat/);
    expect(model).not.toMatch(/from ['"].*combat\//);
    expect(model).not.toContain('Math.random');
    expect(model).not.toContain('Date.now');
    expect(model).not.toContain('new Date');
    expect(model).not.toContain('performance.now');
    expect(model).not.toContain('crypto.randomUUID');
    expect(model).not.toContain('localeCompare');
  });

  it('routes card actions through canonical shell navigation helpers', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const router = read('../src/ui/map/utils/presidentialDecisionRoomNavigation.ts');

    expect(panel).toContain('buildPresidentialDecisionRoomView');
    expect(panel).toContain('openPresidentialDecisionRoomNavigationTarget');
    expect(router).toContain('openArmyHQTab');
    expect(router).toContain('openArmyHQRecordsSubTab');
    expect(router).toContain('openArmyHQAftermathRecord');
    expect(router).toContain('openArmyHQBriefingForCorps');
    expect(router).toContain('openChronicle');
    expect(panel).not.toContain('setArmyHQTab');
    expect(panel).not.toContain('setArmyHQRecordsSubTab');
    expect(panel).not.toContain('setChronicleOpen(true)');
  });

  it('does not import or expose sensitive-history/combat-lane internals', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const model = read('../src/ui/map/data/presidentialDecisionRoom.ts');
    const combined = `${panel}\n${model}`;

    expect(combined).not.toMatch(/src\/sim\/combat|sim\\combat|pre_planned_operations|triggered|rupture|drina|srebrenica/i);
    expect(combined).not.toContain('OPPORTUNITY_CATALOG');
    expect(combined).not.toContain('late_war');
  });
});
