import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { getArmyReserveRequestEvidenceCopy } from '../src/ui/map/utils/armyReserveSeverity.js';

describe('Army reserve driver evidence legibility', () => {
  it('explains the concrete sector-threat signal that triggered a reserve request', () => {
    expect(
      getArmyReserveRequestEvidenceCopy({
        provenance_driver: 'sector_threat',
        sector_threat_ratio: 2.6,
        sector_assigned_brigade_count: 1,
      }),
    ).toEqual({
      label: 'What Signal Triggered This',
      summary: 'Threat ratio 2.6 with 1 brigade on the line triggered this reserve request.',
      detail: 'Army HQ flagged this sector as too threatened for its current frontage.',
    });
  });

  it('stays silent when the packet does not own sharper evidence for that driver', () => {
    expect(
      getArmyReserveRequestEvidenceCopy({
        provenance_driver: 'commander_request',
        commander_request_priority: 'critical',
      }),
    ).toBeNull();
  });

  it('routes evidence framing through one helper and canonical read-model fields', () => {
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

    expect(reservePanelSource).toContain('getArmyReserveRequestEvidenceCopy');
    expect(adapterSource).toContain('leadCriticalThreatRatio');
    expect(adapterSource).toContain('leadCriticalAssignedBrigadeCount');
    expect(systemSource).toContain('sector_threat_ratio');
    expect(systemSource).toContain('sector_assigned_brigade_count');
  });
});
