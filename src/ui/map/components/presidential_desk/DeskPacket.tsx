import type { InboxItem } from '../../data/inboxItems';
import { effectiveInboxSeverity } from '../../data/inboxItems';
import { t } from '../../i18n';
import { DecisionCard } from './DecisionCard';

export interface DeskPacketProps {
  items: InboxItem[];
  onAction: (action: InboxItem['action'], itemId: string) => void;
  requiredItemIds?: ReadonlySet<string>;
}

export function DeskPacket({ items, onAction, requiredItemIds }: DeskPacketProps) {
  const blockers = items.filter((item) => effectiveInboxSeverity(item) === 'blocking' || requiredItemIds?.has(item.id));
  const otherDecisions = items.filter((item) => !blockers.includes(item) && item.type !== 'situation');

  return (
    <section className="min-h-0" aria-label={t('desk.packet.ariaLabel')}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent-gold">{t('desk.packet.eyebrow')}</div>
          <h2 className="mt-1 text-[20px] font-bold leading-none text-text-primary">{t('desk.packet.title')}</h2>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.packet.required')}</div>
          <div className="text-[18px] font-bold text-red-200">{blockers.length}</div>
        </div>
      </div>

      <div className="mt-4 max-h-[48vh] space-y-2 overflow-y-auto pr-1">
        {blockers.length > 0 ? blockers.map((item) => (
          <DecisionCard key={item.id} item={item} onAction={onAction} />
        )) : (
          <div className="border border-green-300/25 bg-green-950/20 px-3 py-3">
            <div className="text-xs font-bold text-green-100">{t('desk.packet.noSignatures')}</div>
            <div className="mt-1 text-xs leading-snug text-text-secondary">
              {t('desk.packet.advisoryNote')}
            </div>
          </div>
        )}
        {otherDecisions.map((item) => (
          <DecisionCard key={item.id} item={item} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}
