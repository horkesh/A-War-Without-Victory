import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  getArmyReserveAttentionSummary,
  getArmyReserveRequestCauseCopy,
  getArmyReserveToolbarSignal,
} from '../src/ui/map/utils/armyReserveSeverity.js';

describe('Army reserve cause legibility', () => {
  it('derives one truthful critical-cause summary from the reserve request reason', () => {
    expect(
      getArmyReserveRequestCauseCopy({
        priority: 85,
        reason: 'defensive_gap',
        purpose: 'defensive',
        why_needed: 'Corps arbih_1st_corps requests elite reinforcement due to critical defensive weakness.',
        description: 'Sector threat ratio 2.6 with only one brigade on the line.',
      }),
    ).toEqual({
      label: 'Why This Is Critical',
      summary: 'A corps is reporting a thin defensive sector that needs immediate reinforcement.',
      detail: 'Corps arbih_1st_corps requests elite reinforcement due to critical defensive weakness.',
      tone: 'critical',
    });
  });

  it('keeps routine reserve review explanatory without overstating urgency', () => {
    expect(
      getArmyReserveRequestCauseCopy({
        priority: 55,
        reason: 'offensive_support',
        purpose: 'offensive',
        description: 'Op "Neretva" is building toward execution and wants elite support.',
      }),
    ).toEqual({
      label: 'Why This Needs Review',
      summary: 'An active offensive needs elite reinforcement to sustain its main effort.',
      detail: 'Op "Neretva" is building toward execution and wants elite support.',
      tone: 'routine',
    });
  });

  it('frames critical toolbar reserve pressure around the lead cause instead of color alone', () => {
    expect(
      getArmyReserveToolbarSignal({
        pendingCount: 3,
        criticalCount: 1,
        leadCriticalReason: 'enclave_relief',
        leadCriticalProvenanceDriver: 'commander_request',
        leadCriticalCommanderPriority: 'critical',
        leadCriticalCommanderBrigadesNeeded: 2,
        leadCriticalFocusZoneId: 'zone:arbih_5th_corps:bihac',
        leadCriticalPurpose: 'defensive',
        leadCriticalDescription: 'Enclave corridor is under pressure.',
      }),
    ).toEqual({
      label: '1 CRITICAL RESERVE REQUEST',
      title:
        '1 critical reserve request needs immediate army attention. Lead cause: An enclave relief effort needs reinforcement to keep or open a corridor. Lead driver: This request was produced by an explicit corps commander reinforcement escalation. 3 reserve requests are pending in total.',
      tone: 'critical',
    });
  });

  it('gives Army HQ one canonical lead-cause explanation for critical reserve pressure', () => {
    expect(
      getArmyReserveAttentionSummary({
        pendingCount: 4,
        criticalCount: 2,
        leadCriticalReason: 'defensive_gap',
        leadCriticalProvenanceDriver: 'commander_request',
        leadCriticalCommanderPriority: 'critical',
        leadCriticalCommanderBrigadesNeeded: 2,
        leadCriticalFocusZoneId: 'zone:arbih_1st_corps:sarajevo',
        leadCriticalPurpose: 'defensive',
        leadCriticalWhyNeeded: 'Corps arbih_1st_corps requests elite reinforcement due to critical defensive weakness.',
      }),
    ).toEqual({
      heading: '2 critical reserve requests need immediate army attention.',
      detail:
        'Lead cause: A corps is reporting a thin defensive sector that needs immediate reinforcement. Lead driver: This request was produced by an explicit corps commander reinforcement escalation. Reserve requests are army-level reserve management, not presidential review. Routine requests remain in the Army Reserve desk.',
      tone: 'critical',
    });
  });

  it('routes reserve-cause framing through one helper contract across surfaces', () => {
    const toolbarSource = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
      'utf8',
    );
    const attentionSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', import.meta.url),
      'utf8',
    );
    const reservePanelSource = readFileSync(
      new URL('../src/ui/map/components/ArmyReservePanel.tsx', import.meta.url),
      'utf8',
    );
    const adapterSource = readFileSync(
      new URL('../src/ui/map/data/GameStateAdapter.ts', import.meta.url),
      'utf8',
    );

    expect(toolbarSource).toContain('leadCriticalReason?: string;');
    expect(toolbarSource).toContain('leadCriticalProvenanceDriver?:');
    expect(attentionSource).toContain('getArmyReserveAttentionSummary');
    expect(reservePanelSource).toContain('getArmyReserveRequestCauseCopy');
    expect(reservePanelSource).toContain('getArmyReserveRequestProvenanceCopy');
    expect(adapterSource).toContain('leadCriticalReason: leadCriticalRequest?.reason');
    expect(adapterSource).toContain('leadCriticalProvenanceDriver: leadCriticalRequest?.provenance_driver');
  });
});
