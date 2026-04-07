import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC_ROOT = join(process.cwd(), 'src');

function readSrc(relPath: string): string {
    return readFileSync(join(SRC_ROOT, relPath), 'utf-8');
}

/** Recursively collect all .ts files under a directory, returning paths relative to SRC_ROOT. */
function collectTs(dir: string, base: string = SRC_ROOT): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const rel = full.slice(base.length + 1).replace(/\\/g, '/');
        const st = statSync(full);
        if (st.isDirectory()) {
            results.push(...collectTs(full, base));
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
            results.push(rel);
        }
    }
    return results;
}

describe('Hardcoded Rail Audit', () => {
    it('No hardcoded RS blitz faction check in combat logic', () => {
        const combatDir = join(SRC_ROOT, 'sim', 'combat');
        const combatFiles = collectTs(combatDir);
        const hardcodedPattern = /faction\s*===\s*['"]RS['"]\s*&&\s*turn\s*<=/;
        const violations: string[] = [];
        for (const file of combatFiles) {
            const src = readFileSync(join(SRC_ROOT, 'sim', 'combat', file.replace('sim/combat/', '')), 'utf-8');
            if (hardcodedPattern.test(src)) {
                violations.push(file);
            }
        }
        expect(violations).toEqual([]);
    });

    it('RS_BLITZ_PHASE_END_WEEK has zero consumers in src/', () => {
        const allSrcFiles = collectTs(SRC_ROOT);
        const consumers: string[] = [];
        for (const file of allSrcFiles) {
            const src = readSrc(file);
            if (src.includes('RS_BLITZ_PHASE_END_WEEK')) {
                consumers.push(file);
            }
        }
        // Only the definition comment in bot_constants.ts is allowed (no export, no import)
        const nonDefFiles = consumers.filter(f => !f.includes('bot_constants'));
        expect(nonDefFiles).toEqual([]);
    });

    it('DoctrinePhase has probe_exempt field', () => {
        const src = readSrc('state/war_timeline.ts');
        expect(src).toMatch(/probe_exempt\??\s*:/);
    });

    it('RS blitz doctrine phase has probe_exempt: true', () => {
        const src = readSrc('sim/combat/bot_strategy.ts');
        expect(src).toMatch(/probe_exempt\s*:\s*true/);
    });
});
