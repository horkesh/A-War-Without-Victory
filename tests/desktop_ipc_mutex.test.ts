/**
 * R4 Phase 6 Task 6.5 — IPC mutation serialization.
 *
 * The Electron mutating IPC handlers do read-modify-write against one shared canonical
 * state string, and Electron does not serialize concurrent `invoke` calls. Without a
 * mutex, two overlapping read-modify-writes both read the same pre-state and the later
 * write clobbers the earlier — losing an order and its CA debit. `createSerialMutex`
 * chains the runs so each read-modify-write completes before the next begins.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createSerialMutex } = require('../src/desktop/ipc_mutex.cjs') as {
  createSerialMutex: () => { run: <T>(fn: () => T | Promise<T>) => Promise<T> };
};

/** A read-modify-write with an await in the middle — the interleaving hazard. */
function makeRmw(store: { value: number }) {
  return async () => {
    const read = store.value; // READ
    await Promise.resolve(); // yield — a naive concurrent run would interleave here
    store.value = read + 1; // MODIFY-WRITE off the value read pre-yield
    return store.value;
  };
}

describe('serial IPC mutex (Task 6.5)', () => {
  it('serializes concurrent read-modify-writes (no lost update)', async () => {
    const store = { value: 0 };
    const mutex = createSerialMutex();
    // Fire 50 concurrent mutating runs. Serialized, the final value must be exactly 50.
    // Without the mutex, the interleaved reads-before-yield would lose most updates.
    await Promise.all(Array.from({ length: 50 }, () => mutex.run(makeRmw(store))));
    expect(store.value).toBe(50);
  });

  it('control: the same runs WITHOUT the mutex lose updates (proves the hazard is real)', async () => {
    const store = { value: 0 };
    const rmw = makeRmw(store);
    await Promise.all(Array.from({ length: 50 }, () => rmw()));
    // Every run read 0 before the shared yield, so the final value collapses to 1.
    expect(store.value).toBeLessThan(50);
  });

  it('preserves submission order of results', async () => {
    const mutex = createSerialMutex();
    const order: number[] = [];
    await Promise.all(
      Array.from({ length: 10 }, (_unused, i) =>
        mutex.run(async () => {
          await Promise.resolve();
          order.push(i);
        }),
      ),
    );
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('a rejecting run does not wedge the queue for later runs', async () => {
    const mutex = createSerialMutex();
    const boom = mutex.run(async () => {
      throw new Error('boom');
    });
    await expect(boom).rejects.toThrow('boom');
    // A run queued after the failure still executes and resolves.
    await expect(mutex.run(async () => 'ok')).resolves.toBe('ok');
  });
});
