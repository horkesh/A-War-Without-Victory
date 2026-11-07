'use strict';

// IPC mutation-serialization policy (R4 Phase 6 Task 6.5) — the Electron-free, unit-
// testable core of the mutex wiring in electron-main.cjs.
//
// Every MUTATING ipc handler does read-modify-write against one shared module-global
// canonical-state JSON string, and Electron does not serialize concurrent `invoke` calls.
// The fix serializes those handlers through one promise-chained mutex (ipc_mutex.cjs).
// The POLICY here decides which channels are serialized.
//
// SERIALIZE-BY-DEFAULT (fail-safe): a channel is serialized UNLESS it is on the explicit
// READ_ONLY list below. This polarity is deliberate — a new or forgotten handler defaults
// to SAFE (serialized; worst case a little latency), never to the racy path. A mutating
// ALLOWLIST would have the opposite, unsafe default, and a `writeCanonicalCurrentState`-
// keyed allowlist would additionally miss the two mutation paths that bypass that predicate:
//   - GLOBAL-REPLACE via setCurrentStateSnapshots (load-scenario-dialog / load-state-dialog),
//   - HELPER-DELEGATED writes (stage-deploy-order / stage-undeploy-order → stageDeployOrder).
// Both are correctly serialized here because they are simply NOT on the read-only list.
//
// A channel qualifies as READ_ONLY only if it never mutates the shared canonical state:
//   - get-*/query-* handlers deserialize a FRESH throwaway state and never write it back;
//   - focus-warroom / open-tactical-map-window are window ops;
//   - save-settings persists a SEPARATE settings file (not game state);
//   - save-game / quick-save read the already-serialized save string and write to DISK with
//     no await between read and write — no read-modify-write of the shared global, no race.
// These stay UNQUEUED so interactive planning (movement/combat/supply/prediction queries)
// and saves never wait behind a mutation.
//
// Classification source: the 79-channel audit in the RS-playthrough second-panel review
// (53 mutating / 26 read-only registrations; get-map-server-url is registered twice under
// one name). Keyed by channel NAME, so the set has 25 unique entries.

/** Channels that never mutate the shared canonical state — left unqueued. */
const READ_ONLY_IPC_CHANNELS = new Set([
  'get-current-game-state',
  'get-map-server-url',
  'get-runtime-feature-flags',
  'get-recruitment-catalog',
  'query-operation-prediction',
  'query-directive-objection',
  'get-front-visit-availability',
  'get-address-nation-availability',
  'get-decorate-unit-availability',
  'get-strategic-posture-review-availability',
  'get-settings',
  'save-settings',
  'preview-dayton',
  'query-movement-range',
  'query-movement-path',
  'query-combat-estimate',
  'query-supply-paths',
  'query-corps-sectors',
  'query-battle-events',
  'focus-warroom',
  'open-tactical-map-window',
  'get-ai-commander-config',
  'get-advisor-recommendation',
  'get-autonomy-state',
  'save-game',
  'quick-save',
]);

/**
 * True when `channel` is a read-only IPC channel (must NOT be serialized). Everything
 * else is treated as mutating and serialized — serialize-by-default.
 * @param {string} channel
 * @returns {boolean}
 */
function isReadOnlyIpcChannel(channel) {
  return READ_ONLY_IPC_CHANNELS.has(channel);
}

/**
 * Wrap an IPC handler with the shared state mutex UNLESS its channel is read-only.
 * Preserves the handler's return value and rejection, and forwards ALL arguments
 * (some handlers take `(event, id)` rather than `(event, payload)`), so the Electron
 * runtime contract is unchanged.
 * @param {string} channel
 * @param {(...args: any[]) => any} handler
 * @param {{ run: (fn: () => any) => Promise<any> }} mutex
 * @returns {(...args: any[]) => any}
 */
function wrapHandlerWithMutationPolicy(channel, handler, mutex) {
  if (isReadOnlyIpcChannel(channel) || isPausedTurnIpcChannel(channel)) return handler;
  return (...args) => mutex.run(() => handler(...args));
}

// PAUSE BEFORE COMBAT (owner decision, 2026-11-05). While a turn is paused for the player's
// decisions, `advance-turn` is still running — it HOLDS the mutex and is awaiting the
// player's answer. These channels deliver that answer, so they must NOT queue behind the
// mutex (that would deadlock). Their handlers serialize themselves instead: while a turn is
// paused they act only on the paused working state (JS runs each synchronous resolution to
// completion, so two answers cannot interleave); otherwise they take the mutex like any
// other mutating channel.
const PAUSED_TURN_IPC_CHANNELS = new Set([
  'respond-to-event-decision',
  'continue-paused-turn',
]);

/**
 * True when `channel` answers a paused turn and therefore serializes itself.
 * @param {string} channel
 * @returns {boolean}
 */
function isPausedTurnIpcChannel(channel) {
  return PAUSED_TURN_IPC_CHANNELS.has(channel);
}

/** Refusal returned to every other mutating channel while a turn is paused. */
const TURN_PAUSED_REFUSAL = Object.freeze({ ok: false, error: 'turn_paused_for_decisions' });

/**
 * A mutex that refuses new work while a turn is paused instead of queueing it. Without
 * this, a load / new game / order issued mid-pause would wait silently behind the paused
 * `advance-turn` (the renderer's invoke would hang until the player continued). Refusing
 * keeps the canonical state untouched; the player answers or continues the turn first.
 * Work queued BEFORE the pause began is unaffected and runs after the turn completes.
 * @param {{ run: (fn: () => any) => Promise<any> }} mutex
 * @param {() => boolean} isTurnPaused
 * @returns {{ run: (fn: () => any) => Promise<any> }}
 */
function createPauseAwareMutex(mutex, isTurnPaused) {
  return {
    run(fn) {
      if (isTurnPaused()) return Promise.resolve({ ...TURN_PAUSED_REFUSAL });
      return mutex.run(fn);
    },
  };
}

/**
 * The main process's paused-turn holder (Electron-free, so it is unit-testable).
 *
 * `pause(workingState, decisions)` is the `onPlayerDecisionsPending` callback: it parks the
 * turn pipeline's working state and returns the promise the pipeline awaits. The paused
 * state lives only here — the canonical snapshots stay the pre-turn state until the turn
 * completes, so a save or quit mid-pause stores the pre-turn state and the turn is re-run
 * deterministically on the next advance.
 *
 * Dependencies:
 *   serializeState(state)  → runtime JSON of the state (may throw; it validates). Must not
 *                            mutate its argument — pass a clone through.
 *   resolveInPlace(state, eventId, responseId) → the between-turn resolver, written back into
 *                            `state`; throws (leaving `state` untouched) on a refused answer.
 *   sendState(runtimeJson) → push a state projection to the renderer(s).
 *   sendStatus(status)     → push { status: 'paused', turn, eventIds } | { status: 'resumed', turn } | null.
 */
function createPausedTurnController({ serializeState, resolveInPlace, sendState, sendStatus }) {
  /** @type {null | { state: any, turn: number, eventIds: string[], resume: () => void }} */
  let paused = null;

  function pausedRuntimeJson() {
    if (!paused) return null;
    try {
      return serializeState(paused.state);
    } catch (_error) {
      return null;
    }
  }

  function stillPendingThisTurn() {
    if (!paused) return [];
    return (paused.state.military?.pending_event_decisions ?? [])
      .filter((decision) => decision.turn_fired === paused.turn)
      .map((decision) => decision.event_id);
  }

  function resume() {
    if (!paused) return false;
    const { resume: release, turn } = paused;
    paused = null;
    sendStatus({ status: 'resumed', turn });
    release();
    return true;
  }

  return {
    isPaused: () => paused !== null,
    /** Runtime JSON of the paused working state, or null when not paused / not serializable. */
    pausedRuntimeJson,
    pause(workingState, decisions) {
      return new Promise((release) => {
        paused = {
          state: workingState,
          turn: workingState.meta.turn,
          eventIds: decisions.map((decision) => decision.event_id),
          resume: release,
        };
        const runtimeJson = pausedRuntimeJson();
        if (!runtimeJson) {
          // Nothing the player could see or answer: do not leave the turn hanging. The
          // decisions stay pending and are answered between turns, as before the pause.
          resume();
          return;
        }
        sendState(runtimeJson);
        sendStatus({ status: 'paused', turn: paused.turn, eventIds: [...paused.eventIds] });
      });
    },
    /** Answer a decision on the paused state; the turn continues once none fired this turn remain. */
    respond(eventId, responseId) {
      if (!paused) throw new Error('no_paused_turn');
      resolveInPlace(paused.state, eventId, responseId);
      const runtimeJson = pausedRuntimeJson();
      if (runtimeJson) sendState(runtimeJson);
      const stillPending = new Set(stillPendingThisTurn());
      if (stillPending.size === 0) {
        resume();
        return;
      }
      // Re-announce the pause with only the decisions still open. The embedded Warroom route
      // holds state updates while the advanceTurn invoke is in flight and releases them on a
      // status event; without this, the renderer kept the original list and reopened the
      // decision just answered (Codex review on #540).
      paused.eventIds = paused.eventIds.filter((id) => stillPending.has(id));
      sendStatus({ status: 'paused', turn: paused.turn, eventIds: [...paused.eventIds] });
    },
    /** Continue without answering (decisions stay pending). False when nothing is paused. */
    resume,
    /** The advance is over (finished or failed): drop any pause and tell the renderer. */
    end() {
      paused = null;
      sendStatus(null);
    },
  };
}

module.exports = {
  READ_ONLY_IPC_CHANNELS,
  PAUSED_TURN_IPC_CHANNELS,
  TURN_PAUSED_REFUSAL,
  createPauseAwareMutex,
  createPausedTurnController,
  isPausedTurnIpcChannel,
  isReadOnlyIpcChannel,
  wrapHandlerWithMutationPolicy,
};
