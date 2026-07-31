import { describe, expect, it } from 'vitest';

import { createLatestGameStateApplicationGate } from '../../src/ui/shared/gameStateUpdateMetadata.js';

describe('Warroom desktop state ownership', () => {
  it('rejects a deferred initial pull after a newer campaign start is reserved', () => {
    const gate = createLatestGameStateApplicationGate();
    const initialPull = gate.captureCurrent();
    const newCampaign = gate.reserveReplacement();

    expect(gate.admitReserved('new-campaign', newCampaign)).toBe(true);
    expect(gate.admitReserved('old-initial-state', initialPull)).toBe(false);
  });

  it('deduplicates a startup pull of the campaign response already applied', () => {
    const gate = createLatestGameStateApplicationGate();
    const newCampaign = gate.reserveReplacement();

    expect(gate.admitReserved('new-campaign', newCampaign)).toBe(true);
    expect(gate.admitReserved('new-campaign', gate.captureCurrent())).toBe(false);
  });

  it('admits an intentional new replacement even when its serialized payload is identical', () => {
    const gate = createLatestGameStateApplicationGate();

    expect(gate.admitReserved('same-seed-campaign', gate.reserveReplacement())).toBe(true);
    expect(gate.admitReserved('same-seed-campaign', gate.reserveReplacement())).toBe(true);
  });

  it('admits a fresh current-state pull after a reserved replacement fails', () => {
    const gate = createLatestGameStateApplicationGate();
    const staleInitialPull = gate.captureCurrent();
    gate.reserveReplacement();

    expect(gate.admitReserved('existing-campaign', staleInitialPull)).toBe(false);
    expect(gate.admitReserved('existing-campaign', gate.captureCurrent())).toBe(true);
  });
});
