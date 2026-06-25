// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  getConsequenceStillForRecord,
  getDecisionHeaderForFamily,
  getPacketThumbnailForInboxType,
  PRESIDENTIAL_DESK_BACKGROUND,
} from '../../src/ui/map/data/presidentialDeskAssets.js';
import type { DecisionConsequenceFamilyId, DecisionConsequenceRecord } from '../../src/ui/map/data/decisionConsequenceLedger.js';

function record(family: string, familyId: DecisionConsequenceFamilyId): DecisionConsequenceRecord {
  return {
    id: `record:${family}`,
    turn: 1,
    familyId,
    family,
    title: family,
    outcome: 'Recorded',
    detail: 'Filed.',
    recordTarget: 'records',
  };
}

describe('presidential desk assets', () => {
  it('maps desk packet inbox types to packet thumbnails', () => {
    expect(getPacketThumbnailForInboxType('paramilitary_request')).toContain('packet_thumb_paramilitary');
    expect(getPacketThumbnailForInboxType('convoy_decision')).toContain('packet_thumb_convoy');
    expect(getPacketThumbnailForInboxType('intelligence_notification')).toContain('packet_thumb_intelligence');
    expect(getPacketThumbnailForInboxType('situation')).toContain('packet_thumb_event_decision');
    expect(getPacketThumbnailForInboxType('operation_opportunity')).toContain('consequence_reserve_deployment');
    expect(getPacketThumbnailForInboxType('operation_opportunity')).not.toContain('packet_thumb_officer_matter');
    expect(getPacketThumbnailForInboxType('operation_opportunity')).not.toContain('packet_thumb_reserve_request');
  });

  it('maps decision families to modal header assets', () => {
    expect(getDecisionHeaderForFamily('peace_plan')).toContain('decision_header_diplomacy');
    expect(getDecisionHeaderForFamily('reserve_request')).toContain('decision_header_military_staff');
    expect(getDecisionHeaderForFamily('paramilitary_request')).toContain('decision_header_paramilitary');
    expect(getDecisionHeaderForFamily('counter_offer')).toContain('decision_header_counter_offer');
  });

  it('maps filed consequence records to consequence stills', () => {
    expect(getConsequenceStillForRecord(record('Peace proposal', 'peace-proposal'))).toContain('consequence_negotiated_settlement');
    expect(getConsequenceStillForRecord(record('Army reserve', 'army-reserve'))).toContain('consequence_reserve_deployment');
    expect(getConsequenceStillForRecord(record('Humanitarian convoy', 'humanitarian-convoy'))).toContain('consequence_humanitarian_access');
    expect(getConsequenceStillForRecord(record('Officer personnel', 'officer-personnel'))).toContain('consequence_personnel_change');
    expect(getConsequenceStillForRecord(record('Event decision', 'event-decision'))).toContain('consequence_public_pressure');
  });

  it('exposes the presidential desk background asset', () => {
    expect(PRESIDENTIAL_DESK_BACKGROUND).toContain('hq_presidential_desk_1992');
  });

  it('keeps command-card comments aligned with shipped override art', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile('src/ui/map/components/warroom/CommandCard.tsx', 'utf8');

    expect(source).toContain('faction-specific command-card overrides');
    expect(source).not.toContain('No new art is added');
  });
});
