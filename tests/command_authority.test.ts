import { describe, it, expect } from 'vitest';
import type { CommandAuthority } from '../src/state/game_state.js';

function makeAuth(overrides?: Partial<CommandAuthority>): CommandAuthority {
    return { current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0, ...overrides };
}

/** Simulate the recover-command-authority war phase step. */
function recoverAuthority(auth: CommandAuthority): void {
    auth.spent_this_turn = 0;
    auth.current = Math.min(auth.max, auth.current + 2);
}

/** Simulate the force-launch deduction (mirrors electron-main.cjs handler). */
function deductForceLaunch(auth: CommandAuthority, cost = 15): { ok: boolean; error?: string } {
    if (auth.current < cost) {
        return { ok: false, error: `Insufficient command authority (${auth.current}/${cost} needed)` };
    }
    auth.current -= cost;
    auth.spent_this_turn += cost;
    auth.lifetime_spent += cost;
    return { ok: true };
}

describe('command authority', () => {
    describe('initialization', () => {
        it('starts at full capacity', () => {
            const auth = makeAuth();
            expect(auth.current).toBe(100);
            expect(auth.max).toBe(100);
            expect(auth.spent_this_turn).toBe(0);
            expect(auth.lifetime_spent).toBe(0);
        });
    });

    describe('force-launch deduction', () => {
        it('deducts cost from current authority', () => {
            const auth = makeAuth();
            const result = deductForceLaunch(auth);
            expect(result.ok).toBe(true);
            expect(auth.current).toBe(85);
            expect(auth.spent_this_turn).toBe(15);
            expect(auth.lifetime_spent).toBe(15);
        });

        it('rejects when insufficient authority', () => {
            const auth = makeAuth({ current: 10 });
            const result = deductForceLaunch(auth);
            expect(result.ok).toBe(false);
            expect(result.error).toContain('Insufficient');
            // State unchanged
            expect(auth.current).toBe(10);
            expect(auth.spent_this_turn).toBe(0);
        });

        it('allows exact-cost deduction', () => {
            const auth = makeAuth({ current: 15 });
            const result = deductForceLaunch(auth);
            expect(result.ok).toBe(true);
            expect(auth.current).toBe(0);
        });

        it('accumulates lifetime spent across multiple deductions', () => {
            const auth = makeAuth();
            deductForceLaunch(auth);
            deductForceLaunch(auth);
            expect(auth.lifetime_spent).toBe(30);
            expect(auth.current).toBe(70);
        });
    });

    describe('recovery', () => {
        it('recovers +2 per turn', () => {
            const auth = makeAuth({ current: 85 });
            recoverAuthority(auth);
            expect(auth.current).toBe(87);
        });

        it('resets spent_this_turn on recovery', () => {
            const auth = makeAuth({ current: 85, spent_this_turn: 15 });
            recoverAuthority(auth);
            expect(auth.spent_this_turn).toBe(0);
        });

        it('does not exceed max', () => {
            const auth = makeAuth({ current: 99 });
            recoverAuthority(auth);
            expect(auth.current).toBe(100);
        });

        it('recovers from zero', () => {
            const auth = makeAuth({ current: 0 });
            recoverAuthority(auth);
            expect(auth.current).toBe(2);
        });
    });

    describe('full cycle: deduct then recover', () => {
        it('deduct 15, recover 2 per turn, takes 8 turns to fully recover', () => {
            const auth = makeAuth();
            deductForceLaunch(auth);
            expect(auth.current).toBe(85);

            // Simulate 8 turns of recovery
            for (let i = 0; i < 8; i++) {
                recoverAuthority(auth);
            }
            // 85 + 8*2 = 101 → capped at 100
            expect(auth.current).toBe(100);
        });
    });
});
