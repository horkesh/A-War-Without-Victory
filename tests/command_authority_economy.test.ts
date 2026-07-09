/**
 * CA-2 — Command Authority economy target table + cost-parity guard.
 *
 * The instrument that was missing (docs/plans/2026-07-06-command-authority-economy-plan.md):
 * command_authority is player-only and ABSENT in headless/calibration runs, so no
 * scenario run, engine gate, or browser proof can see its campaign-length behavior.
 * This test COMPUTES the campaign integral from the real shipped constants so any
 * future drift fails a test instead of a reviewer's arithmetic.
 *
 * TARGET PINS: the integral assertions below enforce the 2026-07-09 CA-1 panel
 * verdict: political-income recovery, visible overflow banking, and bounded
 * force-launch/friction spiral. If these pins move, the Command Authority
 * cadence changed and must be recorded in the CA plan §6 ledger.
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
import {
    COMMAND_AUTHORITY_RESERVE_MAX,
    applyCommandAuthorityRecovery,
    computeCommandAuthorityRecovery,
} from '../src/shared/commandAuthorityEconomy';

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ipcContract = require_('../src/desktop/autonomy_ipc_contract.cjs') as Record<string, number>;

const repoRoot = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// ── Shipped economy parameters (single source: the imported constants) ─────────
/** Initial pool and cap, pinned against the literal in scenario_runner.ts below. */
const INIT_CURRENT = 100;
const INIT_MAX = 100;
const INIT_RESERVE = 0;
/** Campaign horizon of the definitive full-war scenario (188 weekly turns). */
const CAMPAIGN_WEEKS = 188;

/**
 * Mirror of the recover-command-authority step (war_phases.ts): recovery is
 * RECOVERY_PER_TURN minus 0.5 per recent force-launched op (<3 turns old) and per
 * unresolved friction event (<2 turns old), penalty capped at full loss, then
 * clamped to the pool cap. The source-pin test below breaks if the engine formula
 * moves away from this mirror.
 */
function neutralStrainedRecovery(): number {
    return computeCommandAuthorityRecovery({
        dimensions: {
            internationalStanding: 50,
            patronConfidence: 50,
            internalCohesion: 50,
        },
        recentInterventions: 1,
        unresolvedFriction: 0,
    }).recovery;
}

function healthyQuietRecovery(): number {
    return computeCommandAuthorityRecovery({
        dimensions: {
            internationalStanding: 90,
            patronConfidence: 85,
            internalCohesion: 80,
        },
        recentInterventions: 0,
        unresolvedFriction: 0,
    }).recovery;
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

    it('war_phases delegates recovery to the political-income helper after the headless early return', () => {
        const src = read('src/sim/turn_phases/war_phases.ts');
        expect(src).toContain('const auth = context.state.military.command_authority;');
        expect(src).toContain('if (!auth) return;');
        expect(src).toContain('const recovery = computeCommandAuthorityRecovery({');
        expect(src).toContain('applyCommandAuthorityRecovery(auth, recovery);');
    });
});

describe('CA campaign integral target table', () => {
    const neutralRecovery = neutralStrainedRecovery();
    const healthyRecovery = healthyQuietRecovery();
    const lifetimeNeutralIncome = INIT_CURRENT + COMMAND_AUTHORITY_RESERVE_MAX + neutralRecovery * CAMPAIGN_WEEKS;

    it('neutral strained lifetime income over the 188-week war', () => {
        expect(lifetimeNeutralIncome).toBe(726);
    });

    it('maximum neutral override-class acts across the entire war', () => {
        expect(Math.floor(lifetimeNeutralIncome / REQUEST_OP_COST)).toBe(29);
    });

    it('hoard-case acts: a player at cap banks one bounded extra action, not zero-income waste', () => {
        expect(Math.floor((INIT_CURRENT + COMMAND_AUTHORITY_RESERVE_MAX) / REQUEST_OP_COST)).toBe(4);
    });

    it('cap overflow is banked visibly up to the bounded reserve', () => {
        const account = { current: INIT_MAX, max: INIT_MAX, reserve: 0, reserve_max: COMMAND_AUTHORITY_RESERVE_MAX, spent_this_turn: 0, lifetime_spent: 0 };
        applyCommandAuthorityRecovery(account, computeCommandAuthorityRecovery({
            dimensions: { internationalStanding: 90, patronConfidence: 85, internalCohesion: 80 },
            recentInterventions: 0,
            unresolvedFriction: 0,
        }));
        expect(account.current).toBe(INIT_MAX);
        expect(account.reserve).toBe(healthyRecovery);
    });

    it('post-crisis drought is bounded to 8 turns under strained non-collapsing conditions', () => {
        let current = 0;
        let turnsToAfford = 0;
        const recovery = computeCommandAuthorityRecovery({
            dimensions: { internationalStanding: 35, patronConfidence: 40, internalCohesion: 35 },
            recentInterventions: 4,
            unresolvedFriction: 4,
        }).recovery;
        for (; current < REQUEST_OP_COST;) {
            current = Math.min(INIT_MAX, current + recovery);
            turnsToAfford++;
            expect(turnsToAfford).toBeLessThan(100); // safety bound
        }
        expect(turnsToAfford).toBe(8);
    });

    it('gesture cadence: a 10-CA gesture is affordable roughly monthly under neutral strained conditions', () => {
        expect(Math.ceil(FRONT_VISIT_COST / neutralRecovery)).toBe(4);
    });

    it('healthy quiet cadence affords one override-class act every 3 turns', () => {
        expect(Math.ceil(REQUEST_OP_COST / healthyRecovery)).toBe(3);
    });
});
