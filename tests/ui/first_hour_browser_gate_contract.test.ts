import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('first-hour browser QA gate contract', () => {
  it('exposes an npm script for the non-destructive first-hour browser gate', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.['qa:first-hour:browser']).toBe('node tools/ui/first_hour_browser_gate.cjs');
  });

  it('pins the requested first-hour browser invariants in the gate tool', () => {
    const tool = read('tools/ui/first_hour_browser_gate.cjs');

    expect(tool).toContain('.tmp_first_hour_browser_gate');
    expect(tool).toContain('consoleMessages');
    expect(tool).toContain('assertNoConsoleErrors');
    expect(tool).toContain('WAR HAS STARTED');
    expect(tool).toContain('WAR BEGINS');
    expect(tool).toContain('President of the Presidency of the Republic of Bosnia and Herzegovina');
    expect(tool).toContain('What Is Bosnia?');
    expect(tool).toContain('deskBlockedWhileDecisionActive');
    expect(tool).toContain('Decision consequence records');
    expect(tool).toContain('War Chronicle');
    expect(tool).toContain('rawFirstHourLabelsAbsent');
    expect(tool).toContain('rbih_state_identity');
    expect(tool).toContain('turn_fired');
    expect(tool).toContain('response_id');
  });
});
