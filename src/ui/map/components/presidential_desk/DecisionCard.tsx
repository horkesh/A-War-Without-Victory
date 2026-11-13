import type { InboxItem } from '../../data/inboxItems';
import { getDecisionSurfaceForInboxType } from '../../data/decisionSurfaceRegistry';
import { getPacketThumbnailForInboxType } from '../../data/presidentialDeskAssets';
import { t, type MessageKey } from '../../i18n';
import {
  SURFACE_CHIP,
  SURFACE_LABEL_MUTED,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_SECONDARY_BUTTON,
  SURFACE_TONE,
} from '../surface/Surface';


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
  recruitment: 'recruitment.desk.family',
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

const PRIORITY_TONE: Record<InboxItem['priorityBand'], string> = {
  required: SURFACE_TONE.danger,
  recommended: SURFACE_TONE.warn,
  monitor: SURFACE_TONE.info,
  record: SURFACE_TONE.neutral,
};

/**
 * One matter on the President's Desk (surface redesign 2026-11-10): packet art, the
 * family as a mono label, a 19px title, the full summary (never clamped), one band chip
 * and a full-size action button.
 */
export function DecisionCard({ item, onAction }: DecisionCardProps) {
  const actionable = item.action !== 'none';
  const thumbnail = getPacketThumbnailForInboxType(item.type);
  const family = familyLabel(item);
  const required = item.priorityBand === 'required';
  return (
    <article
      className={`grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-5 rounded-md border px-5 py-4 ${required ? 'border-red-400/40 bg-[#1c1719]' : 'border-[#2a303c] bg-[#161a22]'}`}
      data-testid={`desk-card-${item.type}`}
      data-inbox-item-id={item.id}
      data-inbox-action={item.action}
      data-priority-band={item.priorityBand}
      data-threat-severity={item.severity}
    >
      <div className="flex min-w-0 items-start gap-4">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={t('desk.card.thumbnailAlt', { family })}
            className="h-[4.5rem] w-24 shrink-0 rounded object-cover"
          />
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`${SURFACE_CHIP} ${PRIORITY_TONE[item.priorityBand]}`}>
              {priorityLabel(item.priorityBand)}
            </span>
            <span className={SURFACE_LABEL_MUTED}>{family}</span>
          </div>
          <h3 className="m-0 text-[19px] font-semibold leading-snug text-[#f1e6c8]">{item.title}</h3>
          <p className="m-0 break-words text-[16px] leading-relaxed text-[#c2b69c]">{item.subtitle}</p>
        </div>
      </div>
      {/* A matter with nothing to open (a situation update read here on the Desk) gets no
          button: a dead "Open President's Desk" inside the Desk is noise (R8 RBiH attempt 08). */}
      {actionable && (
        <button
          type="button"
          onClick={() => onAction(item.action, item.id)}
          data-testid="desk-card-action"
          className={required ? SURFACE_PRIMARY_BUTTON_COMPACT : SURFACE_SECONDARY_BUTTON}
        >
          {actionLabel(item)}
        </button>
      )}
    </article>
  );
}
