/**
 * L7 (2026-11-17): the player IPC actions that used to touch ROOT state fields GameState does not
 * have now act on `state.military.*`, and the engine reads what they write.
 *
 * Covered here, each driven through the REAL handler source of `electron-main.cjs` (sliced out and
 * run in a vm context, as `tests/desktop_war_end_reveal_handlers.test.ts` does; Electron exits if
 * required in Node), against a REAL saved campaign (`data/derived/latest_run_final_save.json`):
 *
 *   - stage-opsec-toggle: writes `military.opsec_sectors`; `deriveSectorIntel` (the engine step that
 *     reads it) then gives a lower passive intel build-up on that sector. Before the fix the handler
 *     wrote a root `opsec_sectors`, which serialization rejects, so the call failed outright.
 *   - stabilize-command-relationship: resolves the corps's friction events, debits command
 *     authority, and keeps its 3-turn cooldown on `military.corps_command[corps]`, which the UI
 *     adapter reads; the desktop strain helper sees the force-launch strain source the same way the
 *     UI strain function does.
 *   - stage-assign-operation-commander: assigns the officer to the corps's operation, which the
 *     engine reads as `commander_officer_id` (combat_math). Serves the parked operation planner.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import * as desktopSim from '../src/desktop/desktop_sim.js';
import { deriveSectorIntel } from '../src/sim/combat/sector_intel.js';
import { computeCorpsCommandStrain as computeUiStrain } from '../src/ui/map/data/command_strain.js';
import type { GameState } from '../src/state/game_state.js';
import { loadElectronHandlers as loadHandlers } from '../tools/ai_play/electron_handlers_vm.js';

const require = createRequire(import.meta.url);
const { computeCorpsCommandStrain } = require('../src/desktop/command_strain.cjs') as {
    computeCorpsCommandStrain: (state: unknown, corpsId: string, turn: number) => { totalStrain: number; isCompromised: boolean };
};

const FINAL_SAVE = 'data/derived/latest_run_final_save.json';
let cachedSaveText: string | null = null;

function loadBaseState(): GameState {
    cachedSaveText ??= readFileSync(FINAL_SAVE, 'utf8');
    return desktopSim.deserializeState(cachedSaveText);
}

function clone(state: GameState): GameState {
    return desktopSim.deserializeState(desktopSim.serializeState(state));
}
/** First (friendly sector, enemy sector) pair the engine derives intel for, from a clean slate. */
function firstIntelPair(state: GameState): { sectorId: string; enemySectorId: string; confidence: number } {
    const probe = clone(state);
    probe.military.opsec_sectors = [];
    probe.military.sector_intel = {};
    deriveSectorIntel(probe, probe.meta.turn);
    for (const sectorId of Object.keys(probe.military.sector_intel ?? {}).sort()) {
        const rec = (probe.military.sector_intel?.[sectorId] ?? []).find((r) => r.turns_in_contact > 0);
        if (rec) return { sectorId, enemySectorId: rec.enemy_sector_id, confidence: rec.confidence };
    }
    throw new Error('no sector pair in contact in the fixture');
}

function intelConfidence(state: GameState, sectorId: string, enemySectorId: string): number {
    const rec = (state.military.sector_intel?.[sectorId] ?? []).find((r) => r.enemy_sector_id === enemySectorId);
    if (!rec) throw new Error(`no intel record ${sectorId} -> ${enemySectorId}`);
    return rec.confidence;
}

describe('stage-opsec-toggle acts on military.opsec_sectors and the engine reads it', () => {
    const base = loadBaseState();
    base.military.opsec_sectors = [];
    base.military.sector_intel = {};
    const pair = firstIntelPair(base);

    it('tightening OPSEC on an enemy-facing sector is saved under military, never at the root', async () => {
        const h = loadHandlers(base);
        const res = await h.invoke('stage-opsec-toggle', { sectorId: pair.enemySectorId, active: true });
        expect(res).toEqual({ ok: true });
        expect(h.saved().military.opsec_sectors).toEqual([pair.enemySectorId]);
        expect('opsec_sectors' in h.rawSaved()).toBe(false);
    });

    it('the engine reads it next turn: the same sector pair builds intel more slowly under OPSEC', async () => {
        const h = loadHandlers(base);
        await h.invoke('stage-opsec-toggle', { sectorId: pair.enemySectorId, active: true });
        const after = h.saved();
        after.military.sector_intel = {};
        deriveSectorIntel(after, after.meta.turn);
        const withOpsec = intelConfidence(after, pair.sectorId, pair.enemySectorId);
        expect(withOpsec).toBeLessThan(pair.confidence);
    });

    it('relaxing it removes the sector again and the intel build-up returns', async () => {
        const h = loadHandlers(base);
        await h.invoke('stage-opsec-toggle', { sectorId: pair.enemySectorId, active: true });
        h.feed(h.saved());
        const res = await h.invoke('stage-opsec-toggle', { sectorId: pair.enemySectorId, active: false });
        expect(res).toEqual({ ok: true });
        const after = h.saved();
        expect(after.military.opsec_sectors).toEqual([]);
        after.military.sector_intel = {};
        deriveSectorIntel(after, after.meta.turn);
        expect(intelConfidence(after, pair.sectorId, pair.enemySectorId)).toBe(pair.confidence);
    });
});

describe('stabilize-command-relationship works on military.corps_command', () => {
    function strainedState(): { state: GameState; corpsId: string; officerId: string } {
        const state = loadBaseState();
        state.military.friction_events = [];
        const corpsId = 'arbih_1st_corps';
        const officerId = Object.keys(state.military.named_officers ?? {}).sort().find((id) => {
            const os = state.military.named_officers![id]!;
            return os.status === 'active' && os.assigned_corps_id === corpsId;
        });
        if (!officerId) throw new Error('fixture has no active officer on arbih_1st_corps');
        state.military.friction_events.push({ officer_id: officerId, turn: state.meta.turn, type: 'ignored_stance', resolved: false } as never);
        state.military.friction_events.push({ officer_id: officerId, turn: state.meta.turn, type: 'unauthorized_op', resolved: false } as never);
        state.military.command_authority = { current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0 } as never;
        state.military.corps_command![corpsId]!.stabilization_cooldown_until = undefined;
        return { state, corpsId, officerId };
    }

    it('resolves the friction, debits authority and keeps the cooldown under military (not at the root)', async () => {
        const { state, corpsId } = strainedState();
        const turn = state.meta.turn;
        expect(computeCorpsCommandStrain(state, corpsId, turn).totalStrain).toBeGreaterThan(0);
        const h = loadHandlers(state);

        const res = await h.invoke('stabilize-command-relationship', { corpsId });

        expect(res).toMatchObject({ ok: true, resolvedCount: 2, caCost: 10 });
        const after = h.saved();
        expect(after.military.friction_events!.every((e) => e.resolved)).toBe(true);
        expect(after.military.command_authority!.current).toBe(90);
        expect(after.military.corps_command![corpsId]!.stabilization_cooldown_until).toBe(turn + 3);
        expect('corps_command' in h.rawSaved()).toBe(false);
        expect(computeCorpsCommandStrain(after, corpsId, turn).totalStrain).toBe(0);
    });

    it('a new strain inside the cooldown is refused with the cooldown message', async () => {
        const { state, corpsId, officerId } = strainedState();
        const h = loadHandlers(state);
        await h.invoke('stabilize-command-relationship', { corpsId });
        const next = h.saved();
        next.military.friction_events!.push({ officer_id: officerId, turn: next.meta.turn, type: 'ignored_stance', resolved: false } as never);
        h.feed(next);

        const res = await h.invoke('stabilize-command-relationship', { corpsId });

        expect(res.ok).toBe(false);
        expect(String(res.error)).toContain('cooldown');
    });

    it('an unknown corps is refused and nothing is spent', async () => {
        const { state } = strainedState();
        const h = loadHandlers(state);
        const res = await h.invoke('stabilize-command-relationship', { corpsId: 'no_such_corps' });
        expect(res).toMatchObject({ ok: false, error: 'corps_not_found' });
        expect(h.saved().military.command_authority!.current).toBe(100);
    });

    it('the desktop strain helper counts a force-launched operation, the same as the UI strain function', () => {
        const { state, corpsId } = strainedState();
        state.military.friction_events = [];
        const op = state.military.corps_command![corpsId]!.active_operations![0];
        if (!op) throw new Error('fixture has no active operation on arbih_1st_corps');
        op.was_force_launched = true;
        op.started_turn = state.meta.turn;
        const desktop = computeCorpsCommandStrain(state, corpsId, state.meta.turn).totalStrain;
        expect(desktop).toBeGreaterThan(0);
        // The UI function adds a corps-exhaustion source the desktop helper does not apply (documented in
        // command_strain.cjs); with exhaustion zeroed the two must agree.
        state.military.corps_command![corpsId]!.corps_exhaustion = 0;
        expect(computeUiStrain(corpsId, state)).toBe(desktop);
    });
});

describe('stage-assign-operation-commander (serves the parked planner) reads the real paths', () => {
    it('assigns the officer to the corps operation under military and the engine field is set', async () => {
        const state = loadBaseState();
        const corpsId = Object.keys(state.military.corps_command!).sort().find((id) => (state.military.corps_command![id]!.active_operations ?? []).length > 0);
        if (!corpsId) throw new Error('fixture has no corps with an active operation');
        const op = state.military.corps_command![corpsId]!.active_operations![0]!;
        const officerId = Object.keys(state.military.named_officers!).sort().find((id) => state.military.named_officers![id]!.status === 'active')!;
        const h = loadHandlers(state);

        const res = await h.invoke('stage-assign-operation-commander', { corpsId, operationName: op.name, officerId });

        expect(res).toEqual({ ok: true });
        const after = h.saved();
        const saved = after.military.corps_command![corpsId]!.active_operations!.find((o) => o.name === op.name)!;
        expect(saved.commander_officer_id).toBe(officerId);
        expect(after.military.named_officers![officerId]!.assigned_operation).toBe(op.name);
        expect(after.military.named_officers![officerId]!.assigned_corps_id).toBe(corpsId);
    });

    it('an unknown operation is refused', async () => {
        const state = loadBaseState();
        const h = loadHandlers(state);
        const res = await h.invoke('stage-assign-operation-commander', { corpsId: 'arbih_1st_corps', operationName: 'No Such Operation', officerId: 'arbih_delic' });
        expect(res).toMatchObject({ ok: false, error: 'Operation not found' });
    });
});
