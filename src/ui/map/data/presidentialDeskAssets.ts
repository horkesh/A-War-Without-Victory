import presidentialDeskBackground from '../../warroom/assets/hq_presidential_desk_1992.webp';

import decisionHeaderCounterOffer from '../assets/presidential_desk/decision_headers/decision_header_counter_offer.webp';
import decisionHeaderDiplomacy from '../assets/presidential_desk/decision_headers/decision_header_diplomacy.webp';
import decisionHeaderHumanitarianConvoy from '../assets/presidential_desk/decision_headers/decision_header_humanitarian_convoy.webp';
import decisionHeaderIntelligence from '../assets/presidential_desk/decision_headers/decision_header_intelligence.webp';
import decisionHeaderMilitaryStaff from '../assets/presidential_desk/decision_headers/decision_header_military_staff.webp';
import decisionHeaderParamilitary from '../assets/presidential_desk/decision_headers/decision_header_paramilitary.webp';
import decisionHeaderPersonnel from '../assets/presidential_desk/decision_headers/decision_header_personnel.webp';

import consequenceHumanitarianAccess from '../assets/presidential_desk/consequence_stills/consequence_humanitarian_access.webp';
import consequenceNegotiatedSettlement from '../assets/presidential_desk/consequence_stills/consequence_negotiated_settlement.webp';
import consequencePersonnelChange from '../assets/presidential_desk/consequence_stills/consequence_personnel_change.webp';
import consequencePublicPressure from '../assets/presidential_desk/consequence_stills/consequence_public_pressure.webp';
import consequenceReserveDeployment from '../assets/presidential_desk/consequence_stills/consequence_reserve_deployment.webp';

import packetThumbConvoy from '../assets/presidential_desk/packet_thumbnails/packet_thumb_convoy.webp';
import packetThumbEventDecision from '../assets/presidential_desk/packet_thumbnails/packet_thumb_event_decision.webp';
import packetThumbIntelligence from '../assets/presidential_desk/packet_thumbnails/packet_thumb_intelligence.webp';
import packetThumbOfficerMatter from '../assets/presidential_desk/packet_thumbnails/packet_thumb_officer_matter.webp';
import packetThumbParamilitary from '../assets/presidential_desk/packet_thumbnails/packet_thumb_paramilitary.webp';
import packetThumbPeacePlan from '../assets/presidential_desk/packet_thumbnails/packet_thumb_peace_plan.webp';
import packetThumbReserveRequest from '../assets/presidential_desk/packet_thumbnails/packet_thumb_reserve_request.webp';
import type { InboxItemType } from './inboxItems';
import type { DecisionSurfaceFamilyId } from './decisionSurfaceRegistry';
import type { DecisionConsequenceRecord } from './decisionConsequenceLedger';

export const PRESIDENTIAL_DESK_BACKGROUND = presidentialDeskBackground;

const DECISION_HEADERS: Partial<Record<DecisionSurfaceFamilyId, string>> = {
  autonomy_proposal: decisionHeaderDiplomacy,
  convoy_decision: decisionHeaderHumanitarianConvoy,
  counter_offer: decisionHeaderCounterOffer,
  dayton_negotiation: decisionHeaderDiplomacy,
  intelligence_notification: decisionHeaderIntelligence,
  officer_event: decisionHeaderPersonnel,
  paramilitary_request: decisionHeaderParamilitary,
  peace_plan: decisionHeaderDiplomacy,
  reserve_request: decisionHeaderMilitaryStaff,
  operation_opportunity: decisionHeaderMilitaryStaff,
};

const PACKET_THUMBNAILS: Partial<Record<InboxItemType, string>> = {
  autonomy_proposal: packetThumbPeacePlan,
  convoy_decision: packetThumbConvoy,
  dayton_negotiation: packetThumbPeacePlan,
  event_decision: packetThumbEventDecision,
  intelligence_notification: packetThumbIntelligence,
  officer_event: packetThumbOfficerMatter,
  operation_opportunity: packetThumbReserveRequest,
  paramilitary_request: packetThumbParamilitary,
  peace_plan: packetThumbPeacePlan,
  reserve_request: packetThumbReserveRequest,
  situation: packetThumbEventDecision,
};

export function getDecisionHeaderForFamily(familyId: DecisionSurfaceFamilyId): string | null {
  return DECISION_HEADERS[familyId] ?? null;
}

export function getPacketThumbnailForInboxType(inboxType: InboxItemType): string | null {
  return PACKET_THUMBNAILS[inboxType] ?? null;
}

export function getConsequenceStillForRecord(record: Pick<DecisionConsequenceRecord, 'family'>): string {
  const family = record.family.toLowerCase();
  if (family.includes('peace') || family.includes('dayton') || family.includes('counter')) {
    return consequenceNegotiatedSettlement;
  }
  if (family.includes('reserve') || family.includes('operation')) {
    return consequenceReserveDeployment;
  }
  if (family.includes('humanitarian') || family.includes('convoy')) {
    return consequenceHumanitarianAccess;
  }
  if (family.includes('officer') || family.includes('personnel')) {
    return consequencePersonnelChange;
  }
  return consequencePublicPressure;
}
