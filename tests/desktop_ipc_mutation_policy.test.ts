/**
 * R4 Phase 6 Task 6.5 — IPC mutation-serialization POLICY.
 *
 * Verifies the Electron-free policy core: the READ_ONLY exclusion set (serialize-by-
 * default), the classifier, and — the real correctness proof — that composing the actual
 * `stageOpDirective` delegate the way the IPC handler does (read shared store → await →
 * mutate → write) under concurrency loses a Command-Authority debit WITHOUT the mutex and
 * conserves it WITH the policy wrapper. The one seam this cannot exercise is the literal
 * `ipcMain.handle` glue (electron-main.cjs can't be imported under vitest); a source
 * assertion in desktop_ipc_mutation_wiring.test.ts covers that the wiring is installed.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  READ_ONLY_IPC_CHANNELS,
  PAUSED_TURN_IPC_CHANNELS,
  createPauseAwareMutex,
  isReadOnlyIpcChannel,
  wrapHandlerWithMutationPolicy,
} = require('../src/desktop/ipc_mutation_policy.cjs') as {
  READ_ONLY_IPC_CHANNELS: Set<string>;
  PAUSED_TURN_IPC_CHANNELS: Set<string>;
  createPauseAwareMutex: (
    mutex: { run: <T>(fn: () => T | Promise<T>) => Promise<T> },
    isTurnPaused: () => boolean,
  ) => { run: <T>(fn: () => T | Promise<T>) => Promise<T> };
  isReadOnlyIpcChannel: (channel: string) => boolean;
  wrapHandlerWithMutationPolicy: (
    channel: string,
    handler: (...args: any[]) => any,
    mutex: { run: <T>(fn: () => T | Promise<T>) => Promise<T> },
  ) => (...args: any[]) => any;
};
const { createSerialMutex } = require('../src/desktop/ipc_mutex.cjs') as {
  createSerialMutex: () => { run: <T>(fn: () => T | Promise<T>) => Promise<T> };
};
const { stageOpDirective, REQUEST_OP_COST } = require('../src/desktop/op_directive_staging.cjs') as {
  stageOpDirective: (state: any, payload: any, options?: { unbuildableReason?: string }) => { ok: boolean; error?: string };
  REQUEST_OP_COST: number;
};

describe('IPC mutation policy — membership + classification (Task 6.5)', () => {
  it('pins the READ_ONLY exclusion set (any change forces review)', () => {
    // Snapshot the 26 unique read-only channel names. Adding/removing forces a reviewer
    // to re-confirm the channel truly never mutates the shared canonical state.
    expect([...READ_ONLY_IPC_CHANNELS].sort()).toEqual(
      [
        'get-address-nation-availability',
        'get-advisor-recommendation',
        'get-ai-commander-config',
        'get-autonomy-state',
        'get-current-game-state',
        'get-decorate-unit-availability',
        'get-front-visit-availability',
        'get-strategic-posture-review-availability',
        'get-map-server-url',
        'get-recruitment-catalog',
        'get-runtime-feature-flags',
        'get-settings',
        'open-tactical-map-window',
        'preview-dayton',
        'query-battle-events',
        'query-combat-estimate',
        'query-corps-sectors',
        'query-directive-objection',
        'query-movement-path',
        'query-movement-range',
        'query-operation-prediction',
        'query-supply-paths',
        'quick-save',
        'save-game',
        'save-settings',
        'focus-warroom',
      ].sort(),
    );
  });

  it('classifies mutating channels (incl. the two bypass classes) as NOT read-only', () => {
    // Read-only:
    expect(isReadOnlyIpcChannel('query-operation-prediction')).toBe(true);
    expect(isReadOnlyIpcChannel('get-current-game-state')).toBe(true);
    // Mutating — including the channels a writeCanonicalCurrentState-keyed allowlist misses:
    expect(isReadOnlyIpcChannel('stage-op-directive-order')).toBe(false);
    expect(isReadOnlyIpcChannel('advance-turn')).toBe(false);
    expect(isReadOnlyIpcChannel('load-scenario-dialog')).toBe(false); // setCurrentStateSnapshots
    expect(isReadOnlyIpcChannel('load-state-dialog')).toBe(false); // setCurrentStateSnapshots
    expect(isReadOnlyIpcChannel('stage-deploy-order')).toBe(false); // helper-delegated write
    // Unknown/new channel defaults to serialized (fail-safe):
    expect(isReadOnlyIpcChannel('some-future-channel')).toBe(false);
  });

  it('wraps a mutating channel and passes a read-only one through unchanged', () => {
    const mutex = createSerialMutex();
    const handler = () => 'x';
    expect(wrapHandlerWithMutationPolicy('get-current-game-state', handler, mutex)).toBe(handler);
    expect(wrapHandlerWithMutationPolicy('stage-op-directive-order', handler, mutex)).not.toBe(handler);
  });
});

describe('IPC mutation policy — CA conservation under concurrency (Task 6.5)', () => {
  // Compose the REAL stageOpDirective delegate the way the IPC handler does — read the
  // shared store, await (as the real async handler does — advance-turn awaits the pipeline,
  // and stage-op-directive-order now awaits queryDirectiveObjection), then mutate + write.
  function makeStore() {
    const initial = {
      meta: { turn: 5, player_faction: 'RS' },
      military: {
        command_authority: { current: 500, spent_this_turn: 0, lifetime_spent: 0 },
        formations: { vrs_1st_krajina: { id: 'vrs_1st_krajina', faction: 'RS', kind: 'corps' } },
        corps_command: { vrs_1st_krajina: { active_operations: [] } },
      },
    };
    return { json: JSON.stringify(initial) };
  }

  function makeHandler(store: { json: string }) {
    return async (payload: any) => {
      const state = JSON.parse(store.json); // READ shared store
      await Promise.resolve(); // yield — the interleaving window the real async handlers have
      const res = stageOpDirective(state, payload); // MUTATE (debits CA only on success)
      if (res.ok) store.json = JSON.stringify(state); // WRITE back only on success
      return res;
    };
  }

  const payload = { corpsId: 'vrs_1st_krajina', targetOsid: 'op:tuzla:tuzla_2' };

  it('WITHOUT the mutex: concurrent stages each succeed off the same pre-state (lost debits)', async () => {
    const store = makeStore();
    const handler = makeHandler(store);
    const results = await Promise.all(Array.from({ length: 10 }, () => handler(payload)));
    const okCount = results.filter((r) => r.ok).length;
    // The race: many handlers read "no pending directive", all stage successfully — but only
    // one debit survives the last-write-wins store, so okCount debits were promised and lost.
    expect(okCount).toBeGreaterThan(1);
  });

  it('WITH the policy wrapper: exactly one stage succeeds and exactly one CA debit persists', async () => {
    const store = makeStore();
    const mutex = createSerialMutex();
    const wrapped = wrapHandlerWithMutationPolicy('stage-op-directive-order', makeHandler(store), mutex);
    const results = await Promise.all(Array.from({ length: 10 }, () => wrapped(payload)));
    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBe(1); // serialized: the 2nd..10th see pending_op_directive_exists
    const finalCa = JSON.parse(store.json).military.command_authority.current;
    expect(finalCa).toBe(500 - REQUEST_OP_COST); // exactly one debit, none lost
  });
});

describe('IPC mutation policy — pause before combat (owner decision 2026-11-05)', () => {
  it('pins the self-serialized paused-turn channels and leaves them unwrapped', () => {
    expect([...PAUSED_TURN_IPC_CHANNELS].sort()).toEqual(['continue-paused-turn', 'respond-to-event-decision']);
    const mutex = createSerialMutex();
    const handler = () => 'x';
    // A paused advance-turn holds the mutex while it awaits these answers; wrapping them
    // would deadlock the turn.
    expect(wrapHandlerWithMutationPolicy('respond-to-event-decision', handler, mutex)).toBe(handler);
    expect(wrapHandlerWithMutationPolicy('continue-paused-turn', handler, mutex)).toBe(handler);
    expect(isReadOnlyIpcChannel('respond-to-event-decision')).toBe(false);
  });

  it('refuses new mutating work while paused, without disturbing work queued before', async () => {
    let paused = false;
    const mutex = createPauseAwareMutex(createSerialMutex(), () => paused);
    const order: string[] = [];
    let releaseTurn: () => void = () => {};
    const turnHeld = new Promise<void>((resolve) => { releaseTurn = resolve; });
    // The advance-turn: acquires the mutex, then pauses (awaits the player).
    const advance = mutex.run(async () => {
      order.push('turn:start');
      paused = true;
      await turnHeld;
      order.push('turn:end');
      return 'advanced';
    });
    await Promise.resolve();
    // A mutation issued during the pause is refused immediately rather than queued.
    const refused = await mutex.run(async () => { order.push('refused-ran'); return 'ran'; });
    expect(refused).toEqual({ ok: false, error: 'turn_paused_for_decisions' });
    // The player answers / continues: the pause ends and the turn completes.
    paused = false;
    releaseTurn();
    expect(await advance).toBe('advanced');
    // After the turn, mutations run normally again.
    expect(await mutex.run(async () => { order.push('after'); return 'ok'; })).toBe('ok');
    expect(order).toEqual(['turn:start', 'turn:end', 'after']);
  });
});

describe('paused-turn controller — the main process side of the pause', () => {
  const { createPausedTurnController } = require('../src/desktop/ipc_mutation_policy.cjs') as {
    createPausedTurnController: (deps: {
      serializeState: (state: any) => string;
      resolveInPlace: (state: any, eventId: string, responseId: string) => void;
      sendState: (json: string) => void;
      sendStatus: (status: unknown) => void;
    }) => {
      isPaused: () => boolean;
      pausedRuntimeJson: () => string | null;
      pause: (state: any, decisions: Array<{ event_id: string }>) => Promise<void>;
      respond: (eventId: string, responseId: string) => void;
      resume: () => boolean;
      end: () => void;
    };
  };

  function harness(serializeState: (state: any) => string = (state) => JSON.stringify(state)) {
    const sentStates: string[] = [];
    const statuses: unknown[] = [];
    const controller = createPausedTurnController({
      serializeState,
      resolveInPlace: (state, eventId, responseId) => {
        const pending = state.military.pending_event_decisions;
        const index = pending.findIndex((d: { event_id: string }) => d.event_id === eventId);
        if (index < 0 || responseId === 'refused') throw new Error(`No pending decision for event_id "${eventId}"`);
        pending.splice(index, 1);
        state.military.answers = [...(state.military.answers ?? []), `${eventId}:${responseId}`];
      },
      sendState: (json) => sentStates.push(json),
      sendStatus: (status) => statuses.push(status),
    });
    return { controller, sentStates, statuses };
  }

  function working() {
    return {
      meta: { turn: 7 },
      military: {
        pending_event_decisions: [
          { event_id: 'older', turn_fired: 3 },
          { event_id: 'a', turn_fired: 7 },
          { event_id: 'b', turn_fired: 7 },
        ],
      },
    };
  }

  it('parks the working state, shows it, and continues once every decision fired this turn is answered', async () => {
    const { controller, sentStates, statuses } = harness();
    const state = working();
    let continued = false;
    const turn = controller.pause(state, [{ event_id: 'a' }, { event_id: 'b' }]).then(() => { continued = true; });
    expect(controller.isPaused()).toBe(true);
    expect(statuses).toEqual([{ status: 'paused', turn: 7, eventIds: ['a', 'b'] }]);
    expect(JSON.parse(sentStates[0]!).military.pending_event_decisions).toHaveLength(3);

    controller.respond('a', 'x');
    await Promise.resolve();
    expect(continued).toBe(false); // 'b' still waits; the older between-turn decision does not count
    expect(() => controller.respond('a', 'x')).toThrow();
    expect(() => controller.respond('b', 'refused')).toThrow();
    expect(controller.isPaused()).toBe(true);

    controller.respond('b', 'y');
    await turn;
    expect(continued).toBe(true);
    expect(controller.isPaused()).toBe(false);
    // Answers landed on the SAME object the pipeline holds.
    expect(state.military).toMatchObject({ answers: ['a:x', 'b:y'] });
    expect(state.military.pending_event_decisions.map((d) => d.event_id)).toEqual(['older']);
    expect(statuses.at(-1)).toEqual({ status: 'resumed', turn: 7 });

    controller.end();
    expect(statuses.at(-1)).toBeNull();
  });

  it('lets the player continue without answering; the decisions stay pending', async () => {
    const { controller, statuses } = harness();
    const state = working();
    const turn = controller.pause(state, [{ event_id: 'a' }, { event_id: 'b' }]);
    expect(controller.resume()).toBe(true);
    await turn;
    expect(controller.resume()).toBe(false);
    expect(() => controller.respond('a', 'x')).toThrow('no_paused_turn');
    expect(state.military.pending_event_decisions.map((d) => d.event_id)).toEqual(['older', 'a', 'b']);
    expect(statuses).toEqual([
      { status: 'paused', turn: 7, eventIds: ['a', 'b'] },
      { status: 'resumed', turn: 7 },
    ]);
  });

  it('never hangs the turn when the paused state cannot be shown', async () => {
    const { controller, sentStates } = harness(() => { throw new Error('State failed validation before serialize'); });
    await controller.pause(working(), [{ event_id: 'a' }]);
    expect(controller.isPaused()).toBe(false);
    expect(sentStates).toEqual([]);
  });
});
