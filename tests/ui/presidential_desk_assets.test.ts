// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  getConsequenceStillForRecord,
  getDecisionHeaderForFamily,
  getPacketThumbnailForInboxType,
  PRESIDENTIAL_DESK_BACKGROUND,
} from '../../src/ui/map/data/presidentialDeskAssets.js';
import type { DecisionConsequenceRecord } from '../../src/ui/map/data/decisionConsequenceLedger.js';

function record(family: string): DecisionConsequenceRecord {
  return {
    id: `record:${family}`,
    turn: 1,
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
  });

  it('maps decision families to modal header assets', () => {
    expect(getDecisionHeaderForFamily('peace_plan')).toContain('decision_header_diplomacy');
    expect(getDecisionHeaderForFamily('reserve_request')).toContain('decision_header_military_staff');
    expect(getDecisionHeaderForFamily('paramilitary_request')).toContain('decision_header_paramilitary');
    expect(getDecisionHeaderForFamily('counter_offer')).toContain('decision_header_counter_offer');
  });

  it('maps filed consequence records to consequence stills', () => {
    expect(getConsequenceStillForRecord(record('Peace proposal'))).toContain('consequence_negotiated_settlement');
    expect(getConsequenceStillForRecord(record('Army reserve'))).toContain('consequence_reserve_deployment');
    expect(getConsequenceStillForRecord(record('Humanitarian convoy'))).toContain('consequence_humanitarian_access');
    expect(getConsequenceStillForRecord(record('Officer personnel'))).toContain('consequence_personnel_change');
    expect(getConsequenceStillForRecord(record('Event decision'))).toContain('consequence_public_pressure');
  });

  it('exposes the presidential desk background asset', () => {
    expect(PRESIDENTIAL_DESK_BACKGROUND).toContain('hq_presidential_desk_1992');
  });
});
