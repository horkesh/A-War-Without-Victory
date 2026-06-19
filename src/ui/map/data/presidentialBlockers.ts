import type { LoadedGameState } from './types';
import { deriveInboxItems, type InboxItem } from './inboxItems';
import { getDecisionSurfaceForInboxType } from './decisionSurfaceRegistry';

type PresidentialBlockerType = Extract<
  InboxItem['type'],
  'event_decision' | 'peace_plan' | 'dayton_negotiation' | 'convoy_decision' | 'paramilitary_request'
>;

export interface PresidentialBlocker {
  id: string;
  type: PresidentialBlockerType;
  typeLabel: string;
  severity: InboxItem['severity'];
  title: string;
  summary: string;
  action: InboxItem['action'];
  actionLabel: string;
  priority: number;
}

const BLOCKING_TYPES = new Set<InboxItem['type']>([
  'event_decision',
  'peace_plan',
  'dayton_negotiation',
  'convoy_decision',
  'paramilitary_request',
]);

function blockerSummary(item: InboxItem): string {
  if (item.type === 'convoy_decision') {
    return 'A humanitarian convoy request needs your instruction before the turn can proceed.';
  }
  const surface = getDecisionSurfaceForInboxType(item.type);
  return surface?.copySanitizer({ title: item.title, subtitle: item.subtitle }).summary ?? item.subtitle;
}

function isPresidentialBlocker(item: InboxItem): item is InboxItem & { type: PresidentialBlockerType } {
  return BLOCKING_TYPES.has(item.type);
}

export function derivePresidentialBlockers(
  state: LoadedGameState | null,
  osidNameMap: Record<string, string> | null,
): PresidentialBlocker[] {
  return deriveInboxItems(state, osidNameMap)
    .filter(isPresidentialBlocker)
    .map((item) => {
      const surface = getDecisionSurfaceForInboxType(item.type);
      return {
        id: item.id,
        type: item.type,
        typeLabel: surface?.playerLabel ?? 'Required decision',
        severity: item.severity,
        title: item.title,
        summary: blockerSummary(item),
        action: item.action,
        actionLabel: surface?.actionLabel ?? 'Open item',
        priority: item.priority,
      };
    });
}
