import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('warroom startup snapshot truth', () => {
    const warroomSource = readFileSync(
        resolve(process.cwd(), 'src/ui/warroom/warroom.ts'),
        'utf8',
    );

    it('uses the baked apr_1992 startup snapshot as the primary browser/dev fallback', () => {
        expect(warroomSource).toContain("const BROWSER_STARTUP_SNAPSHOT_PATH = '/data/derived/startup/apr_1992_initial_save.json'");
        expect(warroomSource).toContain('const loadedSnapshot = await this.loadStartupSnapshotFallback();');
        expect(warroomSource).toContain('const loadedSnapshot = await this.loadStartupSnapshotFallback(faction);');
    });

    it('keeps mock-state construction only as an emergency fallback, not the mainline start path', () => {
        expect(warroomSource).toContain('Baked startup snapshot unavailable, falling back to legacy mock apr_1992 state');
        expect(warroomSource).toContain('await this.loadMockState({');
        expect(warroomSource).not.toContain('/data/derived/operational/operational_political_control.json');
    });
});
