/**
 * Repro: prove the desktop turn-advance path now fires registry-driven events.
 *
 * Drives the REAL desktop sim API (startNewCampaign + advanceTurn) as VRS and
 * checks that events fire and that the RS-responding `rs_strategic_goals` (the
 * "6 goals") decision queues to military.pending_event_decisions — the codex-like
 * decisions that were missing before event definitions were threaded into advanceTurn.
 *
 * Run: node node_modules/tsx/dist/cli.mjs tools/diagnostics/desktop_event_wiring_repro.ts
 */

import { startNewCampaign, advanceTurn } from '../../src/desktop/desktop_sim.js';

const baseDir = process.cwd();
const TURNS = 4;

async function main(): Promise<void> {
    let { state } = await startNewCampaign(baseDir, 'RS');
    console.log(`start: turn=${state.meta.turn} player_faction=${state.meta.player_faction}`);

    let totalFired = 0;
    for (let i = 0; i < TURNS; i++) {
        const res = await advanceTurn(state, baseDir);
        if (res.error) {
            console.error(`advanceTurn error at turn ${i}: ${res.error}`);
            process.exit(2);
        }
        state = res.state;
        const fired = (res.report?.details as { events_fired?: Array<{ id: string }> } | undefined)?.events_fired ?? [];
        totalFired += fired.length;
        const pending = state.military.pending_event_decisions ?? [];
        const rsPending = pending.filter((d) => d.faction === 'RS').map((d) => d.event_id ?? (d as { id?: string }).id);
        console.log(`turn ${state.meta.turn}: events_fired=[${fired.map((f) => f.id).join(', ')}] | RS pending_event_decisions=[${rsPending.join(', ')}]`);
    }

    const pending = state.military.pending_event_decisions ?? [];
    const hasGoals = pending.some((d) => (d.event_id ?? (d as { id?: string }).id) === 'rs_strategic_goals');
    console.log(`\nTOTAL events fired over ${TURNS} turns: ${totalFired}`);
    console.log(`rs_strategic_goals queued for player (RS): ${hasGoals}`);

    if (totalFired === 0) {
        console.error('FAIL: no events fired — event definitions still not reaching evaluateEvents.');
        process.exit(1);
    }
    if (!hasGoals) {
        console.error('WARN: events fired but rs_strategic_goals not queued (check responding_faction / turn window).');
        process.exit(3);
    }
    console.log('PASS: events fire and the RS "6 goals" decision surfaces in pending_event_decisions.');
}

main().catch((err) => { console.error(err); process.exit(2); });
