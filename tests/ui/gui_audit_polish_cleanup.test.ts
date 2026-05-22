import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { COACHMARKS } from '../../src/ui/map/components/CoachmarkLayer.js';
import { FORCE_LAUNCH_COST } from '../../src/ui/map/utils/commandAuthority.js';

function read(path: string): string {
    return readFileSync(path, 'utf8');
}

describe('GUI audit Batch H polish cleanup', () => {
    it('removes dead coachmark selector fields from coachmark definitions', () => {
        for (const coachmark of COACHMARKS) {
            expect(Object.prototype.hasOwnProperty.call(coachmark, 'target')).toBe(false);
        }
    });

    it('uses one shared command-authority force-launch cost', () => {
        expect(FORCE_LAUNCH_COST).toBe(15);
        expect(read('src/ui/map/components/OperationBriefingModal.tsx')).not.toMatch(/const\s+FORCE_LAUNCH_COST\s*=\s*15/);
        expect(read('src/ui/map/components/army_hq/OperationsSection.tsx')).not.toMatch(/const\s+FORCE_LAUNCH_COST\s*=\s*15/);
    });

    it('removes raw warning glyphs from OperationBriefingModal player labels', () => {
        const source = read('src/ui/map/components/OperationBriefingModal.tsx');
        expect(source).not.toMatch(/\u26A0|âš|Ã¢Å¡/);
    });

    it('gates OpsMap diagnostic logging outside player runtime console.log', () => {
        const source = read('src/ui/map/components/plan_ui/OpsMapRenderer.ts');
        expect(source).not.toContain("console.log('[OpsMap]");
    });

    it('removes dev separators from order interpretation headers', () => {
        const source = read('src/ui/map/components/army_hq/OrderInterpretationPanel.tsx');
        expect(source).not.toContain('ORDER INTERPRETATIONS //');
    });
});
