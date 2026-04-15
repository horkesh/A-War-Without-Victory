import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readUiTest(name: string): string {
    return readFileSync(resolve(process.cwd(), 'tests/ui', name), 'utf8');
}

describe('endgame proof files stay aligned with the current proof ladder', () => {
    it('store-state proof no longer claims full VerdictScreen mount is blocked', () => {
        const source = readUiTest('endgame_live_store_proof.test.ts');
        expect(source).toContain('VerdictScreen store-state + structural reachability proof');
        expect(source).toContain('Live VerdictScreen mount proof is in endgame_verdict_screen_mount.test.ts.');
        expect(source).toContain('Interaction and route gating proof is in endgame_interaction_proof.test.ts.');
        expect(source).not.toContain('maximum achievable without resolving the dual-React workspace issue');
        expect(source).not.toContain('WHY NOT FULL MOUNT');
    });

    it('full mount proof describes the current mocked-store seam, not a dead dual-React blocker', () => {
        const source = readUiTest('endgame_verdict_screen_mount.test.ts');
        expect(source).toContain('test-controlled state object');
        expect(source).not.toContain('avoids the dual-React useSyncExternalStore issue');
    });
});
