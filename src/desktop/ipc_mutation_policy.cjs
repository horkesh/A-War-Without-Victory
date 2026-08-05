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
  if (isReadOnlyIpcChannel(channel)) return handler;
  return (...args) => mutex.run(() => handler(...args));
}

module.exports = {
  READ_ONLY_IPC_CHANNELS,
  isReadOnlyIpcChannel,
  wrapHandlerWithMutationPolicy,
};
