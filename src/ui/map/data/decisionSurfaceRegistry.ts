import {
  PLAYER_DECISION_FAMILIES,
  type PlayerDecisionFamilyId,
  type PlayerDecisionGatePolicy,
} from '../../../state/player_decision_manifest';
import type { InboxItem, InboxItemType } from './inboxItems';

export type DecisionSurfaceFamilyId =
  | PlayerDecisionFamilyId
  | 'counter_offer'
  | 'intelligence_notification'
  | 'situation';

export type DecisionSurfaceSeverity = 'hard_block' | 'modal_required' | 'advisory' | 'info';
export type DecisionSurfaceOwnerShell = 'desk' | 'army_hq' | 'tactical_map' | 'records' | 'chronicle';
export type DecisionSurfaceOpenMode = 'modal' | 'shell_panel' | 'records_link' | 'dismiss';
export type DecisionSurfaceGatePolicy = PlayerDecisionGatePolicy | 'info';

export type DecisionResolverSurface =
  | 'event_modal'
  | 'paramilitary_review_modal'
  | 'convoy_decision_modal'
  | 'peace_plan_modal'
  | 'dayton_modal'
  | 'reserve_request_modal'
  | 'officer_matter_modal'
  | 'operation_opportunity_dossier'
  | 'autonomy_panel'
  | 'counter_offer_modal'
  | 'intelligence_brief_modal'
  | 'situation_brief'
  | 'records_link';

export interface PlayerFacingDecisionCopy {
  title: string;
  summary: string;
}

export interface DecisionSurfaceDefinition {
  familyId: DecisionSurfaceFamilyId;
  inboxType: InboxItemType;
  playerLabel: string;
  severity: DecisionSurfaceSeverity;
  ownerShell: DecisionSurfaceOwnerShell;
  resolverSurface: DecisionResolverSurface;
  opensAs: DecisionSurfaceOpenMode;
  gatePolicy: DecisionSurfaceGatePolicy;
  inboxAction: InboxItem['action'];
  actionLabel: string;
  sourceLabel: string;
  manifestBacked: boolean;
  manifestStatePath?: string;
  manifestResolver?: string;
  copySanitizer: (raw: unknown) => PlayerFacingDecisionCopy;
  resolveAction: string;
  consequenceRecord: string;
}

type DecisionSurfaceSpec = Omit<
  DecisionSurfaceDefinition,
  'manifestBacked' | 'manifestStatePath' | 'manifestResolver'
>;

const MANIFEST_BY_ID = new Map(PLAYER_DECISION_FAMILIES.map((family) => [family.id, family]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function copy(title: string, summary: string): PlayerFacingDecisionCopy {
  return { title, summary };
}

function rawCopy(raw: unknown, fallbackTitle: string, fallbackSummary: string): PlayerFacingDecisionCopy {
  if (!isRecord(raw)) return copy(fallbackTitle, fallbackSummary);
  const title = stringFrom(raw.title) ?? stringFrom(raw.headline) ?? fallbackTitle;
  const summary = stringFrom(raw.summary) ?? stringFrom(raw.subtitle) ?? stringFrom(raw.body) ?? fallbackSummary;
  if (title.includes('_') || summary.includes('pending_required_decisions')) return copy(fallbackTitle, fallbackSummary);
  return copy(title, summary);
}

function manifestSurface(spec: DecisionSurfaceSpec): DecisionSurfaceDefinition {
  const manifest = MANIFEST_BY_ID.get(spec.familyId as PlayerDecisionFamilyId);
  if (!manifest) throw new Error(`Missing player decision manifest entry for ${spec.familyId}`);
  return {
    ...spec,
    gatePolicy: manifest.gatePolicy,
    manifestBacked: true,
    manifestStatePath: manifest.statePath,
    manifestResolver: manifest.resolver,
  };
}

function supplementalSurface(spec: DecisionSurfaceSpec): DecisionSurfaceDefinition {
  return {
    ...spec,
    manifestBacked: false,
  };
}

export const DECISION_SURFACE_REGISTRY = {
  event_decision: manifestSurface({
    familyId: 'event_decision',
    inboxType: 'event_decision',
    playerLabel: 'Event decision',
    severity: 'hard_block',
    ownerShell: 'desk',
    resolverSurface: 'event_modal',
    opensAs: 'modal',
    gatePolicy: 'hard_block',
    inboxAction: 'event_modal',
    actionLabel: 'Decide now',
    sourceLabel: 'Presidential desk',
    copySanitizer: (raw) => rawCopy(raw, 'Decision required', 'An event requires your response before the turn can advance.'),
    resolveAction: 'Record presidential response',
    consequenceRecord: 'Decision log',
  }),
  peace_plan: manifestSurface({
    familyId: 'peace_plan',
    inboxType: 'peace_plan',
    playerLabel: 'Peace proposal',
    severity: 'modal_required',
    ownerShell: 'desk',
    resolverSurface: 'peace_plan_modal',
    opensAs: 'modal',
    gatePolicy: 'modal_required',
    inboxAction: 'peace_plan_modal',
    actionLabel: 'Review proposal',
    sourceLabel: 'Diplomatic channel',
    copySanitizer: (raw) => rawCopy(raw, 'Peace proposal', 'International mediators have placed a peace plan on your desk.'),
    resolveAction: 'Send presidential response',
    consequenceRecord: 'Diplomatic record',
  }),
  dayton_negotiation: manifestSurface({
    familyId: 'dayton_negotiation',
    inboxType: 'dayton_negotiation',
    playerLabel: 'Dayton negotiation',
    severity: 'modal_required',
    ownerShell: 'desk',
    resolverSurface: 'dayton_modal',
    opensAs: 'modal',
    gatePolicy: 'modal_required',
    inboxAction: 'dayton_modal',
    actionLabel: 'Open negotiation',
    sourceLabel: 'Peace talks',
    copySanitizer: (raw) => rawCopy(raw, 'Dayton negotiation', 'A final peace framework requires your territorial and institutional proposal.'),
    resolveAction: 'Submit negotiation package',
    consequenceRecord: 'Negotiation record',
  }),
  paramilitary_request: manifestSurface({
    familyId: 'paramilitary_request',
    inboxType: 'paramilitary_request',
    playerLabel: 'Paramilitary authorization',
    severity: 'hard_block',
    ownerShell: 'desk',
    resolverSurface: 'paramilitary_review_modal',
    opensAs: 'modal',
    gatePolicy: 'hard_block',
    inboxAction: 'paramilitary_review',
    actionLabel: 'Review deployment',
    sourceLabel: 'Interior security channel',
    copySanitizer: () => copy(
      'Paramilitary authorization',
      'A deployment request requires a presidential instruction before the turn can advance.',
    ),
    resolveAction: 'Authorize or deny deployment',
    consequenceRecord: 'Security decision log',
  }),
  convoy_decision: manifestSurface({
    familyId: 'convoy_decision',
    inboxType: 'convoy_decision',
    playerLabel: 'Humanitarian convoy',
    severity: 'modal_required',
    ownerShell: 'desk',
    resolverSurface: 'convoy_decision_modal',
    opensAs: 'modal',
    gatePolicy: 'modal_required',
    inboxAction: 'convoy_decision_modal',
    actionLabel: 'Review convoy',
    sourceLabel: 'Humanitarian channel',
    copySanitizer: (raw) => rawCopy(raw, 'Humanitarian convoy', 'A convoy request needs your instruction: allow, block, or divert.'),
    resolveAction: 'Stage convoy decision',
    consequenceRecord: 'Humanitarian access record',
  }),
  reserve_request: manifestSurface({
    familyId: 'reserve_request',
    inboxType: 'reserve_request',
    playerLabel: 'Reserve request',
    severity: 'advisory',
    ownerShell: 'army_hq',
    resolverSurface: 'reserve_request_modal',
    opensAs: 'modal',
    gatePolicy: 'advisory',
    inboxAction: 'army_reserve',
    actionLabel: 'Review reserve',
    sourceLabel: 'Army HQ',
    copySanitizer: (raw) => rawCopy(raw, 'Reserve request', 'A corps commander is requesting reinforcement.'),
    resolveAction: 'Approve or decline reserve request',
    consequenceRecord: 'Army HQ record',
  }),
  officer_event: manifestSurface({
    familyId: 'officer_event',
    inboxType: 'officer_event',
    playerLabel: 'Personnel matter',
    severity: 'advisory',
    ownerShell: 'army_hq',
    resolverSurface: 'officer_matter_modal',
    opensAs: 'modal',
    gatePolicy: 'advisory',
    inboxAction: 'army_hq_personnel',
    actionLabel: 'Review officer',
    sourceLabel: 'Personnel office',
    copySanitizer: (raw) => rawCopy(raw, 'Personnel matter', 'A staff or commander matter requires review.'),
    resolveAction: 'Acknowledge or resolve personnel matter',
    consequenceRecord: 'Personnel record',
  }),
  autonomy_proposal: manifestSurface({
    familyId: 'autonomy_proposal',
    inboxType: 'autonomy_proposal',
    playerLabel: 'Command proposal',
    severity: 'advisory',
    ownerShell: 'desk',
    resolverSurface: 'autonomy_panel',
    opensAs: 'shell_panel',
    gatePolicy: 'advisory',
    inboxAction: 'autonomy_panel',
    actionLabel: 'Review proposal',
    sourceLabel: 'Political channel',
    copySanitizer: (raw) => rawCopy(raw, 'Command proposal', 'A proposal requires presidential review.'),
    resolveAction: 'Resolve proposal',
    consequenceRecord: 'Political decision log',
  }),
  operation_opportunity: manifestSurface({
    familyId: 'operation_opportunity',
    inboxType: 'operation_opportunity',
    playerLabel: 'Operation opportunity',
    severity: 'advisory',
    ownerShell: 'army_hq',
    resolverSurface: 'operation_opportunity_dossier',
    opensAs: 'shell_panel',
    gatePolicy: 'advisory',
    inboxAction: 'army_hq_opportunity',
    actionLabel: 'Call Army HQ',
    sourceLabel: 'Army HQ',
    copySanitizer: (raw) => rawCopy(raw, 'Operation opportunity', 'Army HQ has identified an operational window for review.'),
    resolveAction: 'Approve, redirect, or decline opportunity',
    consequenceRecord: 'Operation record',
  }),
  counter_offer: supplementalSurface({
    familyId: 'counter_offer',
    inboxType: 'situation',
    playerLabel: 'Counter offer',
    severity: 'modal_required',
    ownerShell: 'desk',
    resolverSurface: 'counter_offer_modal',
    opensAs: 'modal',
    gatePolicy: 'modal_required',
    inboxAction: 'none',
    actionLabel: 'Review counter',
    sourceLabel: 'Negotiation channel',
    copySanitizer: (raw) => rawCopy(raw, 'Counter offer', 'A counter offer requires review.'),
    resolveAction: 'Respond to counter offer',
    consequenceRecord: 'Negotiation record',
  }),
  intelligence_notification: supplementalSurface({
    familyId: 'intelligence_notification',
    inboxType: 'intelligence_notification',
    playerLabel: 'Intelligence brief',
    severity: 'info',
    ownerShell: 'desk',
    resolverSurface: 'intelligence_brief_modal',
    opensAs: 'dismiss',
    gatePolicy: 'info',
    inboxAction: 'dismiss_intelligence_notification',
    actionLabel: 'Acknowledge',
    sourceLabel: 'Intelligence channel',
    copySanitizer: (raw) => rawCopy(raw, 'Intelligence brief', 'New intelligence is available for review.'),
    resolveAction: 'Acknowledge intelligence brief',
    consequenceRecord: 'Intelligence log',
  }),
  situation: supplementalSurface({
    familyId: 'situation',
    inboxType: 'situation',
    playerLabel: 'Situation update',
    severity: 'info',
    ownerShell: 'desk',
    resolverSurface: 'situation_brief',
    opensAs: 'shell_panel',
    gatePolicy: 'info',
    inboxAction: 'decision_room',
    actionLabel: "Open President's Desk",
    sourceLabel: 'Presidential desk',
    copySanitizer: (raw) => rawCopy(raw, 'Situation update', 'A new situation update is available.'),
    resolveAction: 'Review situation update',
    consequenceRecord: 'War summary',
  }),
} as const satisfies Record<DecisionSurfaceFamilyId, DecisionSurfaceDefinition>;

export function listDecisionSurfaces(): DecisionSurfaceDefinition[] {
  return Object.values(DECISION_SURFACE_REGISTRY);
}

export function getDecisionSurface(familyId: DecisionSurfaceFamilyId): DecisionSurfaceDefinition {
  return DECISION_SURFACE_REGISTRY[familyId];
}

export function getDecisionSurfaceForInboxType(inboxType: InboxItemType): DecisionSurfaceDefinition | null {
  return listDecisionSurfaces().find((surface) => surface.inboxType === inboxType) ?? null;
}

export function sanitizeDecisionCopy(
  familyId: DecisionSurfaceFamilyId,
  raw: unknown,
): PlayerFacingDecisionCopy {
  return getDecisionSurface(familyId).copySanitizer(raw);
}
