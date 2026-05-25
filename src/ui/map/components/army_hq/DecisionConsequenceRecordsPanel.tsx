import { buildDecisionConsequenceLedger } from '../../data/decisionConsequenceLedger';
import { getConsequenceStillForRecord } from '../../data/presidentialDeskAssets';
import { useGameStore } from '../../store/gameStore';

export function DecisionConsequenceRecordsPanel() {
  const state = useGameStore((s) => s.loadedGameState);
  const records = buildDecisionConsequenceLedger(state, 20);

  return (
    <section className="rounded-md border border-panel-border bg-panel-card p-4" aria-label="Decision consequence records">
      <div className="flex items-start justify-between gap-3 border-b border-panel-border/70 pb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-gold">Decision Consequences</div>
          <div className="mt-1 text-[11px] text-text-secondary">
            Presidential choices that already entered the campaign record.
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Filed</div>
          <div className="text-[18px] font-bold text-text-primary">{records.length}</div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {records.length === 0 ? (
          <div className="rounded border border-panel-border/70 bg-black/20 px-3 py-4 text-[12px] text-text-secondary">
            No presidential decision consequences have been filed yet.
          </div>
        ) : records.map((record) => (
          <article key={record.id} className="rounded border border-panel-border/70 bg-black/20 px-3 py-3">
            <div className="flex items-start gap-3">
              <img
                src={getConsequenceStillForRecord(record)}
                alt={`${record.title} consequence`}
                className="h-16 w-28 shrink-0 rounded-sm border border-panel-border/70 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold text-text-primary">{record.title}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-text-muted">
                      {record.family} / Turn {record.turn}
                    </div>
                  </div>
                  <div className="shrink-0 rounded border border-accent-gold/35 bg-accent-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-gold">
                    {record.outcome}
                  </div>
                </div>
                <div className="mt-2 text-[11px] leading-5 text-text-secondary">{record.detail}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
