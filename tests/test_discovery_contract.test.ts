import { describe, expect, it } from 'vitest';
// @ts-expect-error JS-only repo helper exercised at runtime by the test suite.
import { discoverTests, toRepoRelative } from '../tools/test/discover_test_files.mjs';

describe('test discovery contracts', () => {
    it('routes desktop contract guardrails through vitest instead of node:test', () => {
        const rootDir = process.cwd();
        const discovered = discoverTests(rootDir);
        const vitestFiles = new Set(toRepoRelative(rootDir, discovered.vitestFiles));
        const nodeTestFiles = new Set(toRepoRelative(rootDir, discovered.nodeTestFiles));
        const desktopGuardrails = [
            'tests/desktop_campaign_start_contract.test.ts',
            'tests/desktop_packaging_contract.test.ts',
            'tests/desktop_packaged_runtime_probe.test.ts',
            'tests/desktop_startup_snapshot_guardrails.test.ts',
            'tests/desktop_release_ci_guardrails.test.ts',
            'tests/startup_snapshot_contract.test.ts',
        ];

        for (const file of desktopGuardrails) {
            expect(vitestFiles.has(file), `${file} should be owned by vitest discovery`).toBe(true);
            expect(nodeTestFiles.has(file), `${file} should not stay in node:test discovery`).toBe(false);
        }
    });
});
