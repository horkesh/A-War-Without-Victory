'use strict';

// Promise-chained serial mutex for the Electron main-process IPC layer (R4 Phase 6
// Task 6.5).
//
// Every MUTATING ipc handler does read-modify-write against one shared module-global
// canonical-state JSON string, and Electron does NOT serialize concurrent `invoke`
// calls. Two overlapping presidential actions (a real rapid double-click, not just
// automation) can therefore both pass their own "not already pending" guard, both
// compute a valid mutation off the SAME pre-state, and the later writeCanonicalCurrentState
// silently discards the earlier one — losing an order and its Command Authority debit with
// no error to either caller. This mutex serializes those handlers so each read-modify-write
// runs to completion (read → mutate → write) before the next begins. Read-only queries stay
// unqueued.
//
// Deadlock-free by construction: mutating handlers never re-enter another mutating handler
// (they call plain functions directly, never via ipcMain.invoke), so there is no nested
// acquire. A rejection in one run does not wedge the queue for later runs.

function createSerialMutex() {
  let tail = Promise.resolve();

  /**
   * Run `fn` only after every previously-queued run has settled. Returns a promise for
   * `fn`'s result (the caller still sees its own success/failure). The internal chain is
   * advanced on settle — success OR failure — so one throwing/rejecting run cannot block
   * the ones queued behind it.
   * @template T
   * @param {() => (T | Promise<T>)} fn
   * @returns {Promise<T>}
   */
  function run(fn) {
    const result = tail.then(() => fn());
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return { run };
}

module.exports = { createSerialMutex };
