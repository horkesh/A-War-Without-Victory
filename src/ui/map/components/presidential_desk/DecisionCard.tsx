import type { InboxItem } from '../../data/inboxItems';
import { getDecisionSurfaceForInboxType } from '../../data/decisionSurfaceRegistry';
import { getPacketThumbnailForInboxType } from '../../data/presidentialDeskAssets';
import { t, type MessageKey } from '../../i18n';

const PRIORITY_CLASS: Record<InboxItem['priorityBand'], string> = {
  required: 'border-red-400/55 bg-red-950/35',
  recommended: 'border-amber-300/45 bg-amber-950/25',
  monitor: 'border-sky-300/30 bg-sky-950/20',
  record: 'border-stone-400/25 bg-black/20',
};

const PRIORITY_BADGE_CLASS: Record<InboxItem['priorityBand'], string> = {
  required: 'border-red-300/45 bg-red-500/18 text-red-100',
  recommended: 'border-amber-300/45 bg-amber-500/16 text-amber-100',
  monitor: 'border-sky-300/35 bg-sky-500/12 text-sky-100',
  record: 'border-stone-300/25 bg-stone-500/10 text-stone-200',
};

const FAMILY_LABEL_KEYS: Partial<Record<InboxItem['type'], MessageKey>> = {
  event_decision: 'decisionSurface.eventDecision.playerLabel',
  peace_plan: 'decisionSurface.peacePlan.playerLabel',
  dayton_negotiation: 'decisionSurface.dayton.playerLabel',
  convoy_decision: 'decisionSurface.convoy.playerLabel',
  paramilitary_request: 'decisionSurface.paramilitary.playerLabel',
  reserve_request: 'decisionSurface.reserve.playerLabel',
  officer_event: 'decisionSurface.officer.playerLabel',
  operation_opportunity: 'decisionSurface.operationOpportunity.playerLabel',
  autonomy_proposal: 'decisionSurface.autonomy.playerLabel',
  intelligence_notification: 'decisionSurface.intelligence.playerLabel',
  situation: 'decisionSurface.situation.playerLabel',
};

const ACTION_LABEL_KEYS: Partial<Record<InboxItem['type'], MessageKey>> = {
  event_decision: 'decisionSurface.eventDecision.actionLabel',
  peace_plan: 'decisionSurface.peacePlan.actionLabel',
  dayton_negotiation: 'decisionSurface.dayton.actionLabel',
  convoy_decision: 'decisionSurface.convoy.actionLabel',
  paramilitary_request: 'decisionSurface.paramilitary.actionLabel',
  reserve_request: 'decisionSurface.reserve.actionLabel',
  officer_event: 'decisionSurface.officer.actionLabel',
  operation_opportunity: 'decisionSurface.operationOpportunity.actionLabel',
  autonomy_proposal: 'decisionSurface.autonomy.actionLabel',
  intelligence_notification: 'decisionSurface.intelligence.actionLabel',
  situation: 'decisionSurface.situation.actionLabel',
};

export interface DecisionCardProps {
  item: InboxItem;
  onAction: (action: InboxItem['action'], itemId: string) => void;
}

function familyLabel(item: InboxItem): string {
  const key = FAMILY_LABEL_KEYS[item.type];
  if (key) return t(key);
  return getDecisionSurfaceForInboxType(item.type)?.playerLabel ?? t('desk.card.familyFallback');
}

function actionLabel(item: InboxItem): string {
  if (item.actionLabel) return item.actionLabel;
  const key = ACTION_LABEL_KEYS[item.type];
  if (key) return t(key);
  return getDecisionSurfaceForInboxType(item.type)?.actionLabel ?? t('desk.card.openFallback');
}

function priorityLabel(priorityBand: InboxItem['priorityBand']): string {
  if (priorityBand === 'required') return t('decisionRoom.metric.required');
  if (priorityBand === 'recommended') return t('decisionRoom.metric.recommended');
  if (priorityBand === 'monitor') return t('decisionRoom.metric.monitor');
  return t('decisionRoom.metric.record');
}

export function DecisionCard({ item, onAction }: DecisionCardProps) {
  const actionable = item.action !== 'none';
  const thumbnail = getPacketThumbnailForInboxType(item.type);
  const family = familyLabel(item);
  return (
    <article
      className={`rounded-sm border px-3 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.22)] ${PRIORITY_CLASS[item.priorityBand]}`}
      data-testid={`desk-card-${item.type}`}
      data-inbox-item-id={item.id}
      data-inbox-action={item.action}
      data-priority-band={item.priorityBand}
      data-threat-severity={item.severity}
    >
      <div className="flex min-w-0 items-start gap-3">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={t('desk.card.thumbnailAlt', { family })}
            className="h-20 w-24 shrink-0 border border-panel-border/70 object-cover shadow-[0_8px_18px_rgba(0,0,0,0.28)]"
          />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`border px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.16em] ${PRIORITY_BADGE_CLASS[item.priorityBand]}`}>
              {priorityLabel(item.priorityBand)}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              {family}
            </span>
          </div>
          <h3 className="mt-2 text-[13px] font-bold leading-tight text-text-primary">{item.title}</h3>
          <p className="mt-1 break-words text-xs leading-snug text-text-secondary">{item.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => actionable && onAction(item.action, item.id)}
          disabled={!actionable}
          data-testid="desk-card-action"
          className="ml-auto shrink-0 border border-accent-gold/45 bg-accent-gold/12 px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.13em] text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:cursor-default disabled:border-panel-border disabled:bg-transparent disabled:text-text-muted"
        >
          {actionLabel(item)}
        </button>
      </div>
    </article>
  );
}
