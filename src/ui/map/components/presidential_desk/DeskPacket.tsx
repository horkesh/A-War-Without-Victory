import type { InboxItem } from '../../data/inboxItems';
import { t } from '../../i18n';
import { SURFACE_LABEL } from '../surface/Surface';
import { DecisionCard } from './DecisionCard';

export interface DeskPacketProps {
  items: InboxItem[];
  onAction: (action: InboxItem['action'], itemId: string) => void;
  requiredItemIds?: ReadonlySet<string>;
}

/**
 * The Desk's matters (surface redesign 2026-11-10): what needs the president's signature
 * first, then everything else on the desk, each under a mono gold section label.
 */
export function DeskPacket({ items, onAction, requiredItemIds }: DeskPacketProps) {
  const blockers = items.filter((item) => item.priorityBand === 'required' || requiredItemIds?.has(item.id));
  const otherDecisions = items.filter((item) =>
    !blockers.includes(item)
    && (item.type !== 'situation' || item.includeInDeskPacket === true)
  );

  return (
    <section className="flex flex-col gap-7" aria-label={t('desk.packet.ariaLabel')}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <h4 className={`m-0 ${SURFACE_LABEL}`}>{t('desk.section.signatures')}</h4>
          <div className="flex items-baseline gap-2">
            <div className="text-[15px] text-[#b9ad94]">{t('desk.packet.required')}</div><div className={`font-mono text-[18px] font-semibold ${blockers.length ? 'text-red-200' : 'text-[#f1e6c8]'}`}>{blockers.length}</div>
          </div>
        </div>
        {blockers.length > 0 ? blockers.map((item) => (
          <DecisionCard key={item.id} item={item} onAction={onAction} />
        )) : (
          <div className="shrink-0 rounded-md border border-emerald-400/30 bg-emerald-950/20 px-5 py-4">
            <div className="text-[18px] font-semibold text-emerald-100">{t('desk.packet.noSignatures')}</div>
            <div className="mt-1 text-[16px] leading-relaxed text-[#c2b69c]">
              {t('desk.packet.advisoryNote')}
            </div>
          </div>
        )}
      </div>
      {otherDecisions.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h4 className={`m-0 ${SURFACE_LABEL}`}>{t('desk.section.otherMatters')}</h4>
          {otherDecisions.map((item) => (
            <DecisionCard key={item.id} item={item} onAction={onAction} />
          ))}
        </div>
      )}
    </section>
  );
}
