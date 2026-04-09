import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { getArmyReserveRequestProvenanceCopy } from '../src/ui/map/utils/armyReserveSeverity.js';

describe('Army reserve driver provenance legibility', () => {
  it('explains when a request was produced by explicit commander reinforcement pressure', () => {
    expect(
      getArmyReserveRequestProvenanceCopy({
        provenance_driver: 'commander_request',
        commander_request_priority: 'critical',
        commander_request_brigades_needed: 3,
        commander_focus_zone_id: 'zone:vrs_2nd_krajina:ozren',
      }),
    ).toEqual({
      label: 'What Produced This Request',
      summary: 'This request was produced by an explicit corps commander reinforcement escalation.',
      detail: 'Commander signal: critical priority for 3 brigades in zone:vrs_2nd_krajina:ozren.',
    });
  });

  it('keeps non-commander requests truthful without inventing deeper causality', () => {
    expect(
      getArmyReserveRequestProvenanceCopy({
        provenance_driver: 'sector_threat',
      }),
    ).toEqual({
      label: 'What Produced This Request',
      summary: 'This request was produced by Army HQ threat assessment on a thin sector-front line.',
      detail: 'Derived from the current reserve-generation pressure owned by Army HQ and corps command state.',
    });
  });

  it('routes reserve provenance through one canonical helper and read-model contract', () => {
    const reservePanelSource = readFileSync(
      new URL('../src/ui/map/components/ArmyReservePanel.tsx', import.meta.url),
      'utf8',
    );
    const adapterSource = readFileSync(
      new URL('../src/ui/map/data/GameStateAdapter.ts', import.meta.url),
      'utf8',
    );
    const systemSource = readFileSync(
      new URL('../src/sim/combat/army_reserve_system.ts', import.meta.url),
      'utf8',
    );

    expect(reservePanelSource).toContain('getArmyReserveRequestProvenanceCopy');
    expect(adapterSource).toContain('provenance_driver:');
    expect(adapterSource).toContain('leadCriticalProvenanceDriver');
    expect(systemSource).toContain("bestProvenanceDriver = 'commander_request'");
  });
});
