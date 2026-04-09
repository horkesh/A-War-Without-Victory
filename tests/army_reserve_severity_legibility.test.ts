import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  classifyArmyReserveSeverity,
  getArmyReserveAttentionSummary,
  getArmyReserveRequestSeverityCopy,
  getArmyReserveToolbarSignal,
} from '../src/ui/map/utils/armyReserveSeverity.js';

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
