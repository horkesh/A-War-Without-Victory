import { afterEach, describe, expect, it, vi } from 'vitest';

describe('casualty ledger browser runtime', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('loads with default realism fractions when Node process is unavailable', async () => {
        vi.resetModules();
        vi.stubGlobal('process', undefined);

        const ledger = await import('../src/state/casualty_ledger.js');
        const state = ledger.initializeCasualtyLedger(['RBiH']);
        ledger.recordBattleCasualties(state, 'RBiH', 'formation', {
            killed: 100,
            wounded: 100,
            missing_captured: 100,
        });

        expect(state.RBiH).toMatchObject({ killed: 39, wounded: 39, missing_captured: 39 });
    });
});
