import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readApp(): string {
  return readFileSync(join(__dirname, '../../src/ui/map/App.tsx'), 'utf8');
}

describe('presidential modal stack priority', () => {
  it('does not auto-launch event decisions over an active peace plan modal', () => {
    const app = readApp();
    const autoLaunchEffect = app.slice(
      app.indexOf('auto-launch the EventDecisionModal'),
      app.indexOf('// Auto-dismiss non-decision events'),
    );

    expect(autoLaunchEffect).toContain('if (showPeacePlanModal) return;');
    expect(autoLaunchEffect).toContain('showPeacePlanModal');
  });
});
