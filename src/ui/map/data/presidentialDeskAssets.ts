import presidentialDeskBackground from '../../warroom/assets/hq_presidential_desk_1992.webp';
import presidentialDeskBanner from '../assets/presidential_desk/desk_banner.webp';

import decisionHeaderCounterOffer from '../assets/presidential_desk/decision_headers/decision_header_counter_offer_wide.webp';
import decisionHeaderDiplomacy from '../assets/presidential_desk/decision_headers/decision_header_diplomacy_wide.webp';
import decisionHeaderEconomic from '../assets/presidential_desk/decision_headers/decision_header_economic_wide.webp';
import decisionHeaderHumanitarianConvoy from '../assets/presidential_desk/decision_headers/decision_header_humanitarian_convoy_wide.webp';
import decisionHeaderIntelligence from '../assets/presidential_desk/decision_headers/decision_header_intelligence_wide.webp';
import decisionHeaderMilitaryStaff from '../assets/presidential_desk/decision_headers/decision_header_military_staff_wide.webp';
import decisionHeaderParamilitary from '../assets/presidential_desk/decision_headers/decision_header_paramilitary_wide.webp';
import decisionHeaderPersonnel from '../assets/presidential_desk/decision_headers/decision_header_personnel_wide.webp';
import decisionHeaderTerritorial from '../assets/presidential_desk/decision_headers/decision_header_territorial_wide.webp';

import consequenceHumanitarianAccess from '../assets/presidential_desk/consequence_stills/consequence_humanitarian_access.webp';
import consequenceNegotiatedSettlement from '../assets/presidential_desk/consequence_stills/consequence_negotiated_settlement.webp';
import consequencePersonnelChange from '../assets/presidential_desk/consequence_stills/consequence_personnel_change.webp';
import consequencePublicPressure from '../assets/presidential_desk/consequence_stills/consequence_public_pressure.webp';
import consequenceReserveDeployment from '../assets/presidential_desk/consequence_stills/consequence_reserve_deployment.webp';

import aftermathGainWide from '../assets/presidential_desk/aftermath_headers/aftermath_gain_wide.webp';
import aftermathLossWide from '../assets/presidential_desk/aftermath_headers/aftermath_loss_wide.webp';
import aftermathMixedWide from '../assets/presidential_desk/aftermath_headers/aftermath_mixed_wide.webp';
import aftermathQuietWide from '../assets/presidential_desk/aftermath_headers/aftermath_quiet_wide.webp';

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
import type { TurnAftermathTone } from './turnAftermath';

export const PRESIDENTIAL_DESK_BACKGROUND = presidentialDeskBackground;
/** Wide (5:1) cut of the presidential desk for the Desk surface banner (surface redesign 2026-11-10). */
export const PRESIDENTIAL_DESK_BANNER = presidentialDeskBanner;

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
  operation_opportunity: consequenceReserveDeployment,
  paramilitary_request: packetThumbParamilitary,
  peace_plan: packetThumbPeacePlan,
  reserve_request: packetThumbReserveRequest,
  // Raising a brigade is a reserve/mobilization act; reuse the reserve-request plate until
  // the owner supplies a recruitment one (owner generates all art).
  recruitment: packetThumbReserveRequest,
  situation: packetThumbEventDecision,
};

/**
 * Decision plate for a required event decision, chosen by the event's authored
 * category. Used when the event carries no illustration of its own.
 */
const EVENT_CATEGORY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  command: decisionHeaderPersonnel,
  diplomatic: decisionHeaderDiplomacy,
  economic: decisionHeaderEconomic,
  humanitarian: decisionHeaderHumanitarianConvoy,
  military: decisionHeaderMilitaryStaff,
  political: decisionHeaderDiplomacy,
  territorial: decisionHeaderTerritorial,
});

export function getDecisionHeaderForEventCategory(category: string | null | undefined): string {
  // Catalog categories are authored lowercase; exact match, like the label lookup.
  return EVENT_CATEGORY_HEADERS[category ?? ''] ?? decisionHeaderMilitaryStaff;
}

/** Consequence still drawn behind the turn-aftermath header, by the turn's tone. */
const TONE_STILLS: Readonly<Record<TurnAftermathTone, string>> = Object.freeze({
  gain: consequenceReserveDeployment,
  loss: consequencePublicPressure,
  mixed: consequenceHumanitarianAccess,
  quiet: consequenceNegotiatedSettlement,
});

export function getConsequenceStillForTone(tone: TurnAftermathTone): string {
  return TONE_STILLS[tone];
}

/**
 * Wide (6.25:1) cut behind the end-of-week aftermath header, by the week's tone
 * (surface redesign round 2, 2026-11-11). Same scenes as the 16:9 consequence
 * stills, which stay for the Desk's "What followed" thumbnails; falls back to the
 * still for any tone without a wide cut.
 */
const TONE_AFTERMATH_HEADERS: Readonly<Partial<Record<TurnAftermathTone, string>>> = Object.freeze({
  gain: aftermathGainWide,
  loss: aftermathLossWide,
  mixed: aftermathMixedWide,
  quiet: aftermathQuietWide,
});

export function getAftermathHeaderForTone(tone: TurnAftermathTone): string {
  return TONE_AFTERMATH_HEADERS[tone] ?? getConsequenceStillForTone(tone);
}

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
