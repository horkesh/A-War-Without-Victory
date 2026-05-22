import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('GUI audit Batch H retired chrome cleanup', () => {
    it('keeps legacy tactical chrome components off disk and out of live imports', () => {
        expect(existsSync('src/ui/map/components/_retired_chrome/MapModeToolbar.tsx')).toBe(false);
        expect(existsSync('src/ui/map/components/_retired_chrome/TopToolbar.tsx')).toBe(false);

        const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
        expect(appSource).not.toContain('_retired_chrome');
        expect(appSource).not.toContain('TopToolbar');
        expect(appSource).not.toContain('MapModeToolbar');
    });
});
