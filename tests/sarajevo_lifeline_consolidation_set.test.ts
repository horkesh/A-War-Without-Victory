import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// B7 — Phase 0 consolidation-set guard. The lifeline substrate consolidates
// the siege "external supply" channel across EXACTLY the consumers below plus
// the derivation home. (Siege attrition, siege morale drain and the supply-reserve
// siege drain were retired 2026-11-17 by the §6 panel, leaving exhaustion.) This test fails if a NEW site starts self-deriving
// Sarajevo siege state or reading the shared scalar without being recorded
// here — preventing double-counting (Plan §10 risk #4) and scope creep.

const ROOT = resolve(__dirname, '..');

/** The complete set of files that consume the shared lifeline scalar. */
const LIFELINE_CONSUMERS = [
    'src/sim/combat/exhaustion.ts',
] as const;

/** The single derivation home that writes `lifeline` and external_supply. */
const DERIVATION_HOME = 'src/state/sarajevo_exception.ts';

function read(rel: string): string {
    return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('B7 lifeline consolidation set', () => {
    it('every named consumer reads getActiveSarajevoLifeline', () => {
        for (const f of LIFELINE_CONSUMERS) {
            expect(read(f), `${f} should consume the shared lifeline scalar`).toContain('getActiveSarajevoLifeline');
        }
    });

    it('derivation home no longer hard-aliases external = internal unconditionally', () => {
        const src = read(DERIVATION_HOME);
        // The old unconditional alias `const externalSupply = internalSupply;`
        // must be gone — external supply is now lifeline-mediated when the flag
        // is ON (and only re-aliased on the flag-OFF branch via `let`).
        expect(src).not.toContain('const externalSupply = internalSupply;');
        expect(src).toContain('let externalSupply = internalSupply;');
        expect(src).toContain('deriveSarajevoLifeline');
    });

    it('every consumer gates the lifeline read behind the flag (no flag-OFF drift)', () => {
        // getActiveSarajevoLifeline is itself flag-gated; assert each consumer
        // routes through it (not a raw state.political.sarajevo_state.lifeline read).
        for (const f of LIFELINE_CONSUMERS) {
            const src = read(f);
            expect(src, `${f} must not read lifeline outside the flag gate`).not.toMatch(
                /sarajevo_state\s*[?.]*\.lifeline/,
            );
        }
    });

    it('flag name is the single canonical ENABLE_SARAJEVO_LIFELINE env gate', () => {
        const params = read('src/sim/combat/sarajevo_siege_params.ts');
        // DEFAULT-ON (opt-out) form as of the 2026-08-07 adopt: the single gate reads the
        // env var once and treats only 'false'/'0' as an explicit opt-out.
        expect(params).toContain('process.env.ENABLE_SARAJEVO_LIFELINE');
        expect(params).toMatch(/raw !== 'false' && raw !== '0'/);
        // Consumers must not introduce their own ad-hoc env reads for this flag.
        for (const f of LIFELINE_CONSUMERS) {
            expect(read(f)).not.toContain('ENABLE_SARAJEVO_LIFELINE');
        }
    });
});
