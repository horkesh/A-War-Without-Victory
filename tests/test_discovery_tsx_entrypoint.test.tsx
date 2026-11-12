/**
 * Proof that a `.test.tsx` entrypoint is discovered and runs.
 *
 * Before 2026-11-12 tools/test/discover_test_files.mjs matched only `.test.ts`, so a
 * component test written as .tsx never ran on any surface and never failed. This file is
 * the live witness: if discovery regresses, the discovery contract test below fails
 * because this file is missing from the discovered set. It also exercises the JSX
 * automatic runtime (`react/jsx-runtime`) through the root React alias.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { discoverTests, toRepoRelative } from '../tools/test/discover_test_files.mjs';

function Badge({ label }: { label: string }) {
    return <span data-testid="tsx-badge">{label}</span>;
}

describe('.test.tsx entrypoints', () => {
    it('renders JSX through the aliased root React copy', () => {
        expect(renderToStaticMarkup(<Badge label="discovered" />)).toBe(
            '<span data-testid="tsx-badge">discovered</span>',
        );
    });

    it('is itself part of the discovered vitest set', () => {
        const rootDir = process.cwd();
        const files = toRepoRelative(rootDir, discoverTests(rootDir).vitestFiles);
        expect(files).toContain('tests/test_discovery_tsx_entrypoint.test.tsx');
    });
});
