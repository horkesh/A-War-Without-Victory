import type { InboxItem } from '../../data/inboxItems';
import { DecisionCard } from './DecisionCard';

export interface DeskPacketProps {
  items: InboxItem[];
  onAction: (action: InboxItem['action'], itemId: string) => void;
}

export function DeskPacket({ items, onAction }: DeskPacketProps) {
  const blockers = items.filter((item) => item.severity === 'blocking');
  const otherDecisions = items.filter((item) => item.severity !== 'blocking' && item.type !== 'situation');

  return (
    <section className="min-h-0" aria-label="Desk packet">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-accent-gold">President's Desk</div>
          <h2 className="mt-1 text-[20px] font-bold leading-none text-text-primary">Decision Packet</h2>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Required</div>
          <div className="text-[18px] font-bold text-red-200">{blockers.length}</div>
        </div>
      </div>

      <div className="mt-4 max-h-[48vh] space-y-2 overflow-y-auto pr-1">
        {blockers.length > 0 ? blockers.map((item) => (
          <DecisionCard key={item.id} item={item} onAction={onAction} />
        )) : (
          <div className="border border-green-300/25 bg-green-950/20 px-3 py-3">
            <div className="text-[11px] font-bold text-green-100">No required signatures.</div>
            <div className="mt-1 text-[10px] leading-snug text-text-secondary">
              The turn can advance, but advisory items may still deserve a call to Army HQ.
            </div>
          </div>
        )}
        {otherDecisions.slice(0, 4).map((item) => (
          <DecisionCard key={item.id} item={item} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}
