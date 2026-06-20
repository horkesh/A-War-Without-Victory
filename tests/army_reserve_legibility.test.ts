import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  classifyArmyReserveSeverity,
  getArmyReserveAttentionSummary,
  getArmyReserveRequestCauseCopy,
  getArmyReserveRequestEvidenceCopy,
  getArmyReserveRequestProvenanceCopy,
  getArmyReserveRequestSeverityCopy,
  getArmyReserveToolbarSignal,
} from '../src/ui/map/utils/armyReserveSeverity.js';

// Cluster 4 — army_reserve legibility merge
// Merged verbatim from: army_reserve_cause_legibility.test.ts,
// army_reserve_severity_legibility.test.ts, army_reserve_evidence_legibility.test.ts,
// army_reserve_provenance_legibility.test.ts

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
      detail: 'Current reserve pressure has exceeded routine army reserve handling.',
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
      detail: 'Current reserve pressure has exceeded routine army reserve handling.',
      tone: 'routine',
    });
  });

  it('does not echo raw request description or corps-authored prose in player-facing cause copy', () => {
    const copy = getArmyReserveRequestCauseCopy({
      priority: 60,
      reason: 'reserve_reason_x7',
      purpose: 'defensive',
      why_needed: 'why_needed_internal_payload',
      description: 'description_internal_payload',
    });

    expect(copy.summary).toBe('A corps is reporting urgent reserve pressure on the line.');
    expect(copy.detail).toBe('Current reserve pressure has exceeded routine army reserve handling.');
    expect(`${copy.label} ${copy.summary} ${copy.detail}`).not.toMatch(/reserve_reason_x7|why_needed_internal_payload|description_internal_payload/i);
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
    expect(reservePanelSource).not.toContain('{req.description}');
    expect(reservePanelSource).not.toContain('{req.why_needed}');
    expect(reservePanelSource).not.toContain('{req.how_to_use}');
    expect(adapterSource).toContain('leadCriticalReason: leadCriticalRequest?.reason');
    expect(adapterSource).toContain('leadCriticalProvenanceDriver: leadCriticalRequest?.provenance_driver');
  });
});

describe('Army reserve severity legibility', () => {
  it('derives one canonical critical-vs-routine threshold from reserve request priority', () => {
    expect(classifyArmyReserveSeverity(75)).toBe('critical');
    expect(classifyArmyReserveSeverity(74)).toBe('routine');
  });

  it('frames critical reserve pressure as immediate army attention in the toolbar signal', () => {
    expect(getArmyReserveToolbarSignal({ pendingCount: 3, criticalCount: 1 })).toEqual({
      label: '1 CRITICAL RESERVE REQUEST',
      title:
        '1 critical reserve request needs immediate army attention. Lead cause: A corps is reporting urgent reserve pressure on the line. Lead driver: This request was produced by current army reserve pressure. 3 reserve requests are pending in total.',
      tone: 'critical',
    });
  });

  it('frames routine reserve pressure without overstating urgency', () => {
    expect(getArmyReserveToolbarSignal({ pendingCount: 2, criticalCount: 0 })).toEqual({
      label: '2 RESERVE REQUESTS',
      title: '2 reserve requests await army reserve review.',
      tone: 'routine',
    });
  });

  it('gives Army HQ one canonical reserve-attention summary', () => {
    expect(getArmyReserveAttentionSummary({ pendingCount: 4, criticalCount: 2 })).toEqual({
      heading: '2 critical reserve requests need immediate army attention.',
      detail:
        'Lead cause: A corps is reporting urgent reserve pressure on the line. Lead driver: This request was produced by current army reserve pressure. Reserve requests are army-level reserve management, not presidential review. Routine requests remain in the Army Reserve desk.',
      tone: 'critical',
    });
  });

  it('gives reserve-desk cards one consistent severity frame', () => {
    expect(getArmyReserveRequestSeverityCopy(88)).toEqual({
      label: 'Immediate Army Need',
      detail: 'Handle this reserve request before routine reserve reviews if you can support it.',
      tone: 'critical',
    });
    expect(getArmyReserveRequestSeverityCopy(55)).toEqual({
      label: 'Reserve Review',
      detail: 'This request can stay in the reserve desk queue unless higher-pressure needs emerge.',
      tone: 'routine',
    });
  });

  it('routes all reserve severity language through one helper contract instead of ad hoc copy', () => {
    const toolbarSource = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
      'utf8',
    );
    const panelSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', import.meta.url),
      'utf8',
    );
    const reservePanelSource = readFileSync(
      new URL('../src/ui/map/components/ArmyReservePanel.tsx', import.meta.url),
      'utf8',
    );

    expect(toolbarSource).toContain('getArmyReserveToolbarSignal');
    expect(panelSource).toContain('getArmyReserveAttentionSummary');
    expect(reservePanelSource).toContain('getArmyReserveRequestSeverityCopy');
  });
});

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

  it('explains the concrete active-operation execution signal that triggered reserve support now', () => {
    expect(
      getArmyReserveRequestEvidenceCopy({
        provenance_driver: 'active_operation',
        operation_name: 'Operation Drina Spear',
        operation_phase: 'execution',
        operation_momentum: 2,
      }),
    ).toEqual({
      label: 'What Signal Triggered This',
      summary: 'Operation "Operation Drina Spear" is already in execution with momentum +2.0, so reserve support is needed now.',
      detail: 'Army HQ is reinforcing a live offensive before the current push loses tempo.',
    });
  });

  it('uses player-safe operation names in reserve evidence instead of generated identifiers', () => {
    const copy = getArmyReserveRequestEvidenceCopy({
      provenance_driver: 'active_operation',
      operation_name: 'probe_arbih_1st_corps_t12',
      operation_phase: 'execution',
      operation_momentum: 1,
    });

    expect(copy?.summary).toContain('Probe — 1st Corps');
    expect(copy?.summary).not.toMatch(/probe_|_t12|operation_name/i);
  });

  it('explains the concrete captured-objective signal that opened an exploitation request', () => {
    expect(
      getArmyReserveRequestEvidenceCopy({
        provenance_driver: 'captured_objectives',
        operation_name: 'Operation Pocket Break',
        operation_phase: 'execution',
        operation_objective_capture_count: 2,
      }),
    ).toEqual({
      label: 'What Signal Triggered This',
      summary: 'Operation "Operation Pocket Break" captured 2 objectives in execution, opening an exploitation window that needs reserve support now.',
      detail: 'Army HQ is reinforcing recent gains before the enemy can re-form around the breach.',
    });
  });

  it('explains staged active-operation support using the real preparation sub-phase when execution has not started', () => {
    expect(
      getArmyReserveRequestEvidenceCopy({
        provenance_driver: 'active_operation',
        operation_name: 'Operation Shield',
        operation_phase: 'planning',
        operation_preparation_sub_phase: 'ready',
      }),
    ).toEqual({
      label: 'What Signal Triggered This',
      summary: 'Operation "Operation Shield" is in ready preparation, so reserve support is being staged before execution begins.',
      detail: 'Army HQ wants elite support in place before the operation commits to execution.',
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
    const toolbarSource = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
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
    expect(toolbarSource).toContain('leadCriticalOperationName');
    expect(toolbarSource).toContain('leadCriticalOperationMomentum');
    expect(toolbarSource).toContain('leadCriticalOperationObjectiveCaptureCount');
    expect(adapterSource).toContain('leadCriticalThreatRatio');
    expect(adapterSource).toContain('leadCriticalAssignedBrigadeCount');
    expect(adapterSource).toContain('leadCriticalOperationName');
    expect(adapterSource).toContain('leadCriticalOperationMomentum');
    expect(adapterSource).toContain('leadCriticalOperationObjectiveCaptureCount');
    expect(systemSource).toContain('sector_threat_ratio');
    expect(systemSource).toContain('sector_assigned_brigade_count');
    expect(systemSource).toContain('operation_name');
    expect(systemSource).toContain('operation_momentum');
    expect(systemSource).toContain('operation_objective_capture_count');
  });
});

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
      detail: 'Commander signal: critical priority for 3 brigades in Ozren.',
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
