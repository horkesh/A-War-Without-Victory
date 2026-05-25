import type { InboxItem } from '../../data/inboxItems';
import { getDecisionSurfaceForInboxType } from '../../data/decisionSurfaceRegistry';
import { getPacketThumbnailForInboxType } from '../../data/presidentialDeskAssets';

const SEVERITY_CLASS: Record<InboxItem['severity'], string> = {
  blocking: 'border-red-400/55 bg-red-950/35',
  urgent: 'border-amber-300/45 bg-amber-950/25',
  normal: 'border-sky-300/30 bg-sky-950/20',
  info: 'border-stone-400/25 bg-black/20',
};

const BADGE_CLASS: Record<InboxItem['severity'], string> = {
  blocking: 'border-red-300/45 bg-red-500/18 text-red-100',
  urgent: 'border-amber-300/45 bg-amber-500/16 text-amber-100',
  normal: 'border-sky-300/35 bg-sky-500/12 text-sky-100',
  info: 'border-stone-300/25 bg-stone-500/10 text-stone-200',
};

export interface DecisionCardProps {
  item: InboxItem;
  onAction: (action: InboxItem['action'], itemId: string) => void;
}

function familyLabel(item: InboxItem): string {
  return getDecisionSurfaceForInboxType(item.type)?.playerLabel ?? item.type.replace(/_/g, ' ');
}

function actionLabel(item: InboxItem): string {
  return getDecisionSurfaceForInboxType(item.type)?.actionLabel ?? 'Open';
}

export function DecisionCard({ item, onAction }: DecisionCardProps) {
  const actionable = item.action !== 'none';
  const thumbnail = getPacketThumbnailForInboxType(item.type);
  return (
    <article
      className={`rounded-sm border px-3 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.22)] ${SEVERITY_CLASS[item.severity]}`}
      data-testid={`desk-card-${item.type}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={`${familyLabel(item)} packet`}
            className="h-20 w-24 shrink-0 border border-panel-border/70 object-cover shadow-[0_8px_18px_rgba(0,0,0,0.28)]"
          />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] ${BADGE_CLASS[item.severity]}`}>
              {item.severity === 'blocking' ? 'Required' : item.severity}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">
              {familyLabel(item)}
            </span>
          </div>
          <h3 className="mt-2 text-[13px] font-bold leading-tight text-text-primary">{item.title}</h3>
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-text-secondary">{item.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => actionable && onAction(item.action, item.id)}
          disabled={!actionable}
          className="ml-auto shrink-0 border border-accent-gold/45 bg-accent-gold/12 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:cursor-default disabled:border-panel-border disabled:bg-transparent disabled:text-text-muted"
        >
          {actionLabel(item)}
        </button>
      </div>
    </article>
  );
}
