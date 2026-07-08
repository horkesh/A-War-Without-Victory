/**
 * CA-0 — Command Authority economy characterization + cost-parity guard.
 *
 * The instrument that was missing (docs/plans/2026-07-06-command-authority-economy-plan.md):
 * command_authority is player-only and ABSENT in headless/calibration runs, so no
 * scenario run, engine gate, or browser proof can see its campaign-length behavior.
 * This test COMPUTES the campaign integral from the real shipped constants so any
 * future drift fails a test instead of a reviewer's arithmetic.
 *
 * CHARACTERIZATION PINS: the integral assertions below pin the CURRENT shipped
 * economy (2026-07-06). They are provisional by design — CA-2 retunes them to the
 * CA-1 panel's chosen cadence spec. If you got here because a pin went red after
 * an intentional retune, update the pins to the new cadence table and record the
 * change in the CA plan §6 ledger. If the retune was NOT intentional, you just
 * caught silent economy drift — that is this file doing its job.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

import {
    FORCE_LAUNCH_COST,
    PROACTIVE_FORCE_LAUNCH_COST,
    AUTHOR_OP_COST,
    STOP_OP_COST,
    REQUEST_OP_COST,
    ELITE_DEPLOY_COST,
    REPLACE_CO_COST,
    FRONT_VISIT_COST,
    ADDRESS_NATION_COST,
    DECORATE_UNIT_COST,
    COMMAND_AUTHORITY_RECOVERY_PER_TURN,
} from '../src/ui/map/utils/commandAuthority';

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ipcContract = require_('../src/desktop/autonomy_ipc_contract.cjs') as Record<string, number>;

const repoRoot = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// ── Shipped economy parameters (single source: the imported constants) ─────────
/** Initial pool and cap, pinned against the literal in scenario_runner.ts below. */
const INIT_CURRENT = 100;
const INIT_MAX = 100;
/** Campaign horizon of the definitive full-war scenario (188 weekly turns). */
const CAMPAIGN_WEEKS = 188;

/**
 * Mirror of the recover-command-authority step (war_phases.ts): recovery is
 * RECOVERY_PER_TURN minus 0.5 per recent force-launched op (<3 turns old) and per
 * unresolved friction event (<2 turns old), penalty capped at full loss, then
 * clamped to the pool cap. The source-pin test below breaks if the engine formula
 * moves away from this mirror.
 */
function recoveryForTurn(recentInterventions: number, unresolvedFriction: number): number {
    const penalty = Math.min(2, (recentInterventions + unresolvedFriction) * 0.5);
    return Math.max(0, COMMAND_AUTHORITY_RECOVERY_PER_TURN - penalty);
}

describe('CA cost parity (single-host constants stay in sync)', () => {
    it('TS lever constants equal the desktop IPC contract exports', () => {
        expect(ipcContract.FORCE_LAUNCH_COST).toBe(FORCE_LAUNCH_COST);
        expect(ipcContract.PROACTIVE_FORCE_LAUNCH_COST).toBe(PROACTIVE_FORCE_LAUNCH_COST);
        expect(ipcContract.AUTHOR_OP_COST).toBe(AUTHOR_OP_COST);
        expect(ipcContract.STOP_OP_COST).toBe(STOP_OP_COST);
        expect(ipcContract.REQUEST_OP_COST).toBe(REQUEST_OP_COST);
        expect(ipcContract.ELITE_DEPLOY_COST).toBe(ELITE_DEPLOY_COST);
        expect(ipcContract.REPLACE_CO_COST).toBe(REPLACE_CO_COST);
        expect(ipcContract.FRONT_VISIT_COST).toBe(FRONT_VISIT_COST);
        expect(ipcContract.ADDRESS_NATION_COST).toBe(ADDRESS_NATION_COST);
        expect(ipcContract.DECORATE_UNIT_COST).toBe(DECORATE_UNIT_COST);
    });

    it('electron-main.cjs uses the shared force-launch constant instead of a local literal', () => {
        const src = read('src/desktop/electron-main.cjs');
        expect(src).toContain('FORCE_LAUNCH_COST,');
        expect(src).not.toMatch(/\bconst\s+FORCE_LAUNCH_COST\s*=\s*\d+\s*;/);
    });
});

describe('CA engine source pins (formula and init have not silently moved)', () => {
    it('scenario_runner initializes the pool at the pinned values', () => {
        const src = read('src/scenario/scenario_runner.ts');
        expect(src).toContain(
            `state.military.command_authority = { current: ${INIT_CURRENT}, max: ${INIT_MAX}, spent_this_turn: 0, lifetime_spent: 0 }`,
        );
    });

    it('war_phases recovery step still matches the mirrored formula', () => {
        const src = read('src/sim/turn_phases/war_phases.ts');
        // The two load-bearing lines of the recover-command-authority step.
        expect(src).toContain('const penalty = Math.min(2, (recentInterventions + unresolvedFriction) * 0.5);');
        expect(src).toContain('auth.current = Math.min(auth.max, auth.current + recovery);');
        // Recovery base comes from the shared constant's value.
        expect(src).toContain(`const recovery = Math.max(0, ${COMMAND_AUTHORITY_RECOVERY_PER_TURN} - penalty);`);
    });
});

describe('CA campaign integral (the numbers nobody computed)', () => {
    const lifetimeIncomeMax = INIT_CURRENT + COMMAND_AUTHORITY_RECOVERY_PER_TURN * CAMPAIGN_WEEKS;

    it('lifetime income ceiling over the 188-week war', () => {
        // 100 initial + 2/turn * 188 turns — assumes the player NEVER idles at cap
        // (recovery at cap is destroyed, see cap-waste test below).
        expect(lifetimeIncomeMax).toBe(476);
    });

    it('maximum override-class acts across the entire war', () => {
        // Every override lever costs 25 (author/request/stop/elite/replace/proactive).
        expect(Math.floor(lifetimeIncomeMax / REQUEST_OP_COST)).toBe(19);
    });

    it('hoard-case acts: a player who sits at cap banks nothing', () => {
        // At 100/100 recovery is Math.min(max, current + r) - current = 0 — the
        // dominant hoarding strategy reduces the WHOLE campaign budget to the
        // initial pool.
        expect(Math.floor(INIT_CURRENT / REQUEST_OP_COST)).toBe(4);
    });

    it('cap-waste: recovery at the cap is destroyed, not banked', () => {
        const atCap = Math.min(INIT_MAX, INIT_MAX + recoveryForTurn(0, 0));
        expect(atCap).toBe(INIT_MAX); // income while full: zero
    });

    it('post-crisis drought: 13 turns locked out after a 4-act crisis window', () => {
        // Crisis: turns 1-4 spend 100 (three 25-CA overrides + one 25-CA proactive
        // force-launch on turn 4). The force-launched op counts as a recent
        // intervention for 3 turns (started_turn delta < 3), throttling recovery
        // to 1.5 on turns 5-6, then 2.0 — the spiral: using the system slows the
        // system. Count turns from empty until the next 25-CA act is affordable.
        let current = 0;
        let turnsToAfford = 0;
        for (let turn = 5; current < REQUEST_OP_COST; turn++) {
            const recentInterventions = turn - 4 < 3 ? 1 : 0; // op started turn 4
            current = Math.min(INIT_MAX, current + recoveryForTurn(recentInterventions, 0));
            turnsToAfford++;
            expect(turnsToAfford).toBeLessThan(100); // safety bound
        }
        expect(turnsToAfford).toBe(13); // one quarter of a year of war, silent
    });

    it('gesture cadence: a 10-CA gesture is affordable every 5 quiet turns from empty', () => {
        expect(Math.ceil(FRONT_VISIT_COST / COMMAND_AUTHORITY_RECOVERY_PER_TURN)).toBe(5);
    });
});
