import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import type { GameState } from '../src/state/game_state.js';

const require = createRequire(import.meta.url);
const contract = require('../src/desktop/strategic_posture_review_contract.cjs');

function makeDefinition(faction: 'RBiH' | 'RS' | 'HRHB' = 'RBiH') {
  const suffix = faction === 'RBiH' ? 'rbih' : faction.toLowerCase();
  return {
    id: `strategic_posture_review_${suffix}`,
    title: 'Strategic Posture Review',
    responding_faction: faction,
    requires_player_response: true,
    action_cadence: { max_fires: 8, cooldown_turns: 8, escalation: 'escalating' },
    response_options: [
      { id: 'press', label: 'Press' },
      { id: 'hold', label: 'Hold' },
      { id: 'negotiate', label: 'Negotiate' },
      { id: 'terminal', label: 'Accept terms', available_from_fire: 3 },
    ],
  };
}

function makeState(opts: { turn?: number; count?: number; last?: number; pending?: boolean } = {}) {
  const eventId = 'strategic_posture_review_rbih';
  return {
    meta: { turn: opts.turn ?? 90, player_faction: 'RBiH' },
    military: {
      command_authority: { current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0 },
      formations: {},
      event_fire_counts: opts.count == null ? {} : { [eventId]: opts.count },
      event_last_fired_turn: opts.last == null ? {} : { [eventId]: opts.last },
      pending_event_decisions: opts.pending ? [{ event_id: eventId }] : [],
    },
    political: {},
    factions: [],
    displacement: {},
  };
}

describe('strategic posture review desktop action', () => {
  it('maps each player faction to its authored event', () => {
    expect(contract.strategicPostureReviewEventIdForFaction('RBiH')).toBe('strategic_posture_review_rbih');
    expect(contract.strategicPostureReviewEventIdForFaction('RS')).toBe('strategic_posture_review_rs');
    expect(contract.strategicPostureReviewEventIdForFaction('HRHB')).toBe('strategic_posture_review_hrhb');
    expect(contract.strategicPostureReviewEventIdForFaction('NOPE')).toBeNull();
  });

  it('enforces cooldown, cap, and an already-pending decision', () => {
    const def = makeDefinition();
    expect(contract.computeStrategicPostureReviewAvailability(makeState(), 'RBiH', def).available).toBe(true);
    expect(contract.computeStrategicPostureReviewAvailability(makeState({ count: 8 }), 'RBiH', def).reason).toBe('exhausted');
    expect(contract.computeStrategicPostureReviewAvailability(makeState({ count: 1, last: 85 }), 'RBiH', def).reason).toBe('on_cooldown');
    expect(contract.computeStrategicPostureReviewAvailability(makeState({ pending: true }), 'RBiH', def).reason).toBe('already_pending');
  });

  it('reveals an authored escalating option only from its numbered fire', () => {
    const def = makeDefinition();
    const first = contract.buildStrategicPostureReviewPendingDecision(
      makeState({ count: 0 }), 'RBiH', def,
      contract.computeStrategicPostureReviewAvailability(makeState({ count: 0 }), 'RBiH', def),
    );
    expect(first.response_options.map((option: any) => option.id)).toEqual(['press', 'hold', 'negotiate']);

    const thirdState = makeState({ count: 2, last: 80 });
    const third = contract.buildStrategicPostureReviewPendingDecision(
      thirdState, 'RBiH', def,
      contract.computeStrategicPostureReviewAvailability(thirdState, 'RBiH', def),
    );
    expect(third.response_options.map((option: any) => option.id)).toEqual(['press', 'hold', 'negotiate', 'terminal']);
  });

  it('initiates once, debits once, records cadence, then resolves through the authoritative receipt path', () => {
    const state = makeState() as unknown as GameState;
    const def = makeDefinition();
    const initiated = contract.initiateStrategicPostureReviewOnState(state, 'RBiH', def, 10);
    expect(initiated).toEqual({
      ok: true,
      eventId: def.id,
      caCost: 10,
      offeredBranchIds: ['press', 'hold', 'negotiate'],
    });
    expect(state.military.command_authority?.current).toBe(90);
    expect(state.military.event_fire_counts?.[def.id]).toBe(1);
    expect(state.military.event_last_fired_turn?.[def.id]).toBe(90);

    const duplicate = contract.initiateStrategicPostureReviewOnState(state, 'RBiH', def, 10);
    expect(duplicate.reason).toBe('already_pending');
    expect(state.military.command_authority?.current).toBe(90);
    expect(state.military.event_fire_counts?.[def.id]).toBe(1);

    resolveEventDecision(state, def.id, 'press');
    expect(state.military.pending_event_decisions).toEqual([]);
    expect(state.military.event_decision_log?.at(-1)).toMatchObject({
      event_id: def.id,
      response_id: 'press',
      decision_source: 'player',
      faction: 'RBiH',
      turn: 90,
    });
  });

  it('wires read-only availability and mutating initiation through Electron', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
    const preload = readFileSync(resolve(process.cwd(), 'src/desktop/preload.cjs'), 'utf8');
    expect(main).toContain("ipcMain.handle('get-strategic-posture-review-availability'");
    expect(main).toContain("ipcMain.handle('initiate-strategic-posture-review'");
    expect(preload).toContain("ipcRenderer.invoke('get-strategic-posture-review-availability')");
    expect(preload).toContain("ipcRenderer.invoke('initiate-strategic-posture-review')");
  });
});
