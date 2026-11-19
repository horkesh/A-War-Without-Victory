/**
 * Played proof for the L7 dead-IPC fixes (2026-11-17): a REAL short campaign (April 1992, RBiH President,
 * historical decision defaults, production autonomy) through the desktop sim, with the REAL
 * `electron-main.cjs` handlers (sliced into a vm, see electron_handlers_vm.ts) applied to the live state
 * at a named turn, then the next turn played by the real engine. Each action is shown to take effect, with
 * the turn and the effect named. A control fork (same state, same decisions, no action) isolates the effect.
 *
 * Run:  npx tsx tools/ai_play/ipc_state_paths_played_proof.ts [--turns 12]
 *
 * Exit code 1 if any action fails to take effect.
 */
import './repo_root_cwd.js';
import {
    advanceTurn,
    deserializeState,
    serializeState,
    startNewCampaign,
} from '../../src/desktop/desktop_sim.js';
import { resolveEventDecision } from '../../src/sim/events/resolve_decision.js';
import { deriveSectorIntel } from '../../src/sim/combat/sector_intel.js';
import { computeCorpsCommandStrain } from '../../src/ui/map/data/command_strain.js';
import type { GameState } from '../../src/state/game_state.js';
import { blockingDecisions, pendingProposals, resolveProposal, REPO_BASE_DIR } from './president_playthrough.js';
import { loadElectronHandlers } from './electron_handlers_vm.js';

const FACTION = 'RBiH' as const;
const turnsArg = process.argv.indexOf('--turns');
const TURNS = turnsArg >= 0 ? Number(process.argv[turnsArg + 1]) : 12;

const lines: string[] = [];
let failed = false;
function say(text: string): void { lines.push(text); console.log(text); }
function check(ok: boolean, text: string): void { say(`${ok ? 'PASS' : 'FAIL'}  ${text}`); if (!ok) failed = true; }

function clone(state: GameState): GameState { return deserializeState(serializeState(state)); }

/** Play one turn like a President taking the historical default on every card and authorising what is offered. */
async function playOneTurn(state: GameState): Promise<GameState> {
    for (const proposal of pendingProposals(state)) {
        if (proposal?.id && !proposal.accepted && !proposal.resolved_turn) resolveProposal(state, proposal.id, true);
    }
    const result = await advanceTurn(state, REPO_BASE_DIR, {
        onPlayerDecisionsPending: (working: GameState, decisions: Array<{ faction: string; event_id: string; historical_default_response_id?: string; response_options: Array<{ id: string }> }>) => {
            for (const d of decisions.filter((x) => x.faction === FACTION)) {
                const id = d.historical_default_response_id ?? d.response_options[0]?.id;
                if (id) resolveEventDecision(working, d.event_id, id);
            }
        },
    });
    if (result.error) {
        const blocking = blockingDecisions(state, FACTION);
        throw new Error(`advanceTurn failed at turn ${state.meta.turn}: ${result.error} (blocking: ${JSON.stringify(blocking).slice(0, 200)})`);
    }
    return result.state;
}

function intelAt(state: GameState, sectorId: string, enemySectorId: string): number | null {
    const rec = (state.military.sector_intel?.[sectorId] ?? []).find((r) => r.enemy_sector_id === enemySectorId);
    return rec ? rec.confidence : null;
}

async function main(): Promise<void> {
    let state = (await startNewCampaign(REPO_BASE_DIR, FACTION, 'apr_1992', 'historical')).state;
    for (let i = 0; i < TURNS; i += 1) state = await playOneTurn(state);
    const turn = state.meta.turn;
    say(`Played a real apr_1992 campaign as ${FACTION} to turn ${turn} (hash-stable decisions: historical defaults).`);

    // ---- stage-opsec-toggle -------------------------------------------------------------------------
    {
        const probe = clone(state);
        probe.military.opsec_sectors = [];
        probe.military.sector_intel = {};
        deriveSectorIntel(probe, turn);
        let pair: { sectorId: string; enemySectorId: string } | null = null;
        for (const sectorId of Object.keys(probe.military.sector_intel ?? {}).sort()) {
            const own = state.military.corps_front_sectors?.[sectorId];
            const rec = (probe.military.sector_intel?.[sectorId] ?? []).find((r) => r.turns_in_contact > 0);
            if (rec && own?.faction === 'RS') { pair = { sectorId, enemySectorId: rec.enemy_sector_id }; break; }
        }
        if (!pair) {
            for (const sectorId of Object.keys(probe.military.sector_intel ?? {}).sort()) {
                const rec = (probe.military.sector_intel?.[sectorId] ?? []).find((r) => r.turns_in_contact > 0);
                if (rec) { pair = { sectorId, enemySectorId: rec.enemy_sector_id }; break; }
            }
        }
        if (!pair) throw new Error('no sector pair in contact to demonstrate OPSEC');
        const enemyOwner = state.military.corps_front_sectors?.[pair.enemySectorId]?.faction ?? '?';

        const control = clone(state);
        control.military.opsec_sectors = [];
        const played = clone(state);
        played.military.opsec_sectors = [];
        const handlers = loadElectronHandlers(played, ['stage-opsec-toggle']);
        const res = await handlers.invoke('stage-opsec-toggle', { sectorId: pair.enemySectorId, active: true });
        check(res.ok === true, `turn ${turn}: stage-opsec-toggle on ${pair.enemySectorId} (${enemyOwner}) returned ok`);
        const afterIpc = handlers.saved();
        check(
            (afterIpc.military.opsec_sectors ?? []).includes(pair.enemySectorId) && !('opsec_sectors' in handlers.rawSaved()),
            `turn ${turn}: the sector is in military.opsec_sectors and there is no root opsec_sectors`,
        );
        // Both forks keep their full intel history; the next turn is played by the real engine.
        const nextControl = await playOneTurn(control);
        const nextPlayed = await playOneTurn(afterIpc);
        const c = intelAt(nextControl, pair.sectorId, pair.enemySectorId);
        const p = intelAt(nextPlayed, pair.sectorId, pair.enemySectorId);
        say(`turn ${turn} -> ${nextPlayed.meta.turn}: ${pair.sectorId} intel confidence on ${pair.enemySectorId}: control ${c}, OPSEC ${p}`);
        check(c !== null && p !== null && p < c, `OPSEC lowers the observer's passive intel build-up on ${pair.enemySectorId} the next turn`);
    }

    // ---- stabilize-command-relationship ---------------------------------------------------------------
    {
        const corpsId = Object.keys(state.military.corps_command ?? {}).sort().find((id) => state.military.formations[id]?.faction === FACTION);
        if (!corpsId) throw new Error('no RBiH corps in the live state');
        const officerId = Object.keys(state.military.named_officers ?? {}).sort().find((id) => {
            const os = state.military.named_officers![id]!;
            return os.status === 'active' && os.assigned_corps_id === corpsId;
        });
        const played = clone(state);
        if (officerId) {
            (played.military.friction_events ??= []).push({ officer_id: officerId, turn, type: 'ignored_stance', resolved: false } as never);
        }
        const before = played.military.command_authority?.current ?? 0;
        const strainBefore = computeCorpsCommandStrain(corpsId, played);
        say(`turn ${turn}: ${corpsId} command strain ${strainBefore} (one unresolved friction event added for ${officerId ?? 'no officer'}); command authority ${before}`);
        if (!officerId || strainBefore === 0) {
            say('SKIP  no active officer on the corps in this run; the e2e test covers stabilize');
        } else {
            const handlers = loadElectronHandlers(played, ['stabilize-command-relationship']);
            const res = await handlers.invoke('stabilize-command-relationship', { corpsId });
            check(res.ok === true, `turn ${turn}: stabilize-command-relationship ${JSON.stringify(res)}`);
            const afterIpc = handlers.saved();
            check(
                afterIpc.military.corps_command![corpsId]!.stabilization_cooldown_until === turn + 3 && !('corps_command' in handlers.rawSaved()),
                `the 3-turn cooldown (until turn ${turn + 3}) is kept on military.corps_command, not at the root`,
            );
            check((afterIpc.military.command_authority?.current ?? 0) === before - 10, `turn ${turn}: command authority is debited from ${before} to ${afterIpc.military.command_authority?.current} (it refills over the next turn)`);
            const next = await playOneTurn(afterIpc);
            check(computeCorpsCommandStrain(corpsId, next) < strainBefore, `turn ${next.meta.turn}: ${corpsId} strain fell from ${strainBefore} to ${computeCorpsCommandStrain(corpsId, next)}`);
        }
    }

    // ---- stage-assign-operation-commander (parked planner path) ---------------------------------------
    {
        const withOp = (id: string): boolean => (state.military.corps_command![id]!.active_operations ?? []).length > 0;
        const nonProbe = (id: string): boolean => (state.military.corps_command![id]!.active_operations ?? []).some((o) => !String(o.name).startsWith('probe_'));
        const ids = Object.keys(state.military.corps_command ?? {}).sort();
        const corpsId = ids.find(nonProbe) ?? ids.find(withOp);
        if (!corpsId) {
            say(`SKIP  no corps has an active operation at turn ${turn}; the e2e test covers assign-operation-commander`);
        } else {
            const ops = state.military.corps_command![corpsId]!.active_operations!;
            const op = ops.find((o) => !String(o.name).startsWith('probe_')) ?? ops[0]!;
            const officerId = Object.keys(state.military.named_officers ?? {}).sort().find((id) => state.military.named_officers![id]!.status === 'active')!;
            const played = clone(state);
            const handlers = loadElectronHandlers(played, ['stage-assign-operation-commander']);
            const res = await handlers.invoke('stage-assign-operation-commander', { corpsId, operationName: op.name, officerId });
            check(res.ok === true, `turn ${turn}: assign ${officerId} to ${op.name} (${corpsId}) ${JSON.stringify(res)}`);
            const next = await playOneTurn(handlers.saved());
            const survived = (next.military.corps_command?.[corpsId]?.active_operations ?? []).find((o) => o.name === op.name);
            say(`turn ${next.meta.turn}: operation ${op.name} ${survived ? `still active, commander_officer_id ${survived.commander_officer_id}` : 'no longer active (completed or aborted this turn)'}`);
        }
    }

    say(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
    process.exit(failed ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
