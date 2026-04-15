import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

describe('warroom new campaign flow truth', () => {
  it('launches the only live campaign directly from the side picker', () => {
    const warroomSource = readRepoFile('src', 'ui', 'warroom', 'warroom.ts');

    expect(warroomSource).not.toContain('showScenarioPicker');
    expect(warroomSource).not.toContain("showScreen('scenario-picker')");
    expect(warroomSource).not.toContain('wireScenarioPickerButtons');
    expect(warroomSource).not.toContain('pendingFaction');
    expect(warroomSource).toContain("scenarioKey: 'apr_1992'");
    expect(warroomSource).toContain('this.desktopBridge.startNewCampaign');
  });

  it('does not render a dead scenario-selection overlay when only apr_1992 is live', () => {
    const html = readRepoFile('src', 'ui', 'warroom', 'index.html');

    expect(html).not.toContain('id="scenario-picker"');
    expect(html).not.toContain('Select Scenario');
    expect(html).not.toContain('id="scn-apr1992"');
    expect(html).toContain('id="side-picker"');
    expect(html).toContain('Choose Your Side');
  });
});
