import type { LoadedGameState } from './types';
import { deriveInboxItems, isAdvanceBlockingInboxItem, type InboxItem } from './inboxItems';
import { getDecisionSurfaceForInboxType } from './decisionSurfaceRegistry';
import { t } from '../i18n';

export interface PresidentialBlocker {
  id: string;
  type: InboxItem['type'];
  typeLabel: string;
  severity: InboxItem['severity'];
  title: string;
  summary: string;
  action: InboxItem['action'];
  actionLabel: string;
  priority: number;
}

function blockerSummary(item: InboxItem): string {
  if (item.type === 'convoy_decision') {
    return t('presidentialBlockers.convoy.summary');
  }
  const surface = getDecisionSurfaceForInboxType(item.type);
  return surface?.copySanitizer({ title: item.title, subtitle: item.subtitle }).summary ?? item.subtitle;
}

export function derivePresidentialBlockers(
  state: LoadedGameState | null,
  osidNameMap: Record<string, string> | null,
): PresidentialBlocker[] {
  return deriveInboxItems(state, osidNameMap)
    .filter(isAdvanceBlockingInboxItem)
    .map((item) => {
      const surface = getDecisionSurfaceForInboxType(item.type);
      return {
        id: item.id,
        type: item.type,
        typeLabel: surface?.playerLabel ?? t('presidentialBlockers.requiredDecision'),
        severity: item.severity,
        title: item.title,
        summary: blockerSummary(item),
        action: item.action,
        actionLabel: surface?.actionLabel ?? t('presidentialBlockers.openItem'),
        priority: item.priority,
      };
    });
}
