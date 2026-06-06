import type { LoadedGameState } from '../../data/types';
import { buildDecisionConsequenceLedger } from '../../data/decisionConsequenceLedger';
import { getConsequenceStillForRecord } from '../../data/presidentialDeskAssets';
import { t } from '../../i18n';
import { turnToDateString } from '../../utils/formatters';

export interface ConsequenceStripProps {
  state: LoadedGameState | null;
  onOpenRecords: () => void;
  onOpenDecisionRecords?: () => void;
  onOpenChronicle: () => void;
}

export function ConsequenceStrip({ state, onOpenRecords, onOpenDecisionRecords, onOpenChronicle }: ConsequenceStripProps) {
  const turn = state?.turn ?? 0;
  const latestSummary = state?.latestTurnSummary ?? null;
  const battleCount = latestSummary?.battles?.length ?? 0;
  const displacement = latestSummary?.displacement_total ?? 0;
  const notableEvents = latestSummary?.notable_events?.length ?? 0;
  const decisionRecords = buildDecisionConsequenceLedger(state, 2);

  return (
    <section className="border-t border-panel-border/70 pt-3" aria-label={t('desk.consequences.ariaLabel')}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-muted">{t('desk.consequences.heading')}</div>
          <div className="mt-1 text-[11px] text-text-secondary">
            {state ? t('desk.consequences.lastFiled', { date: turnToDateString(turn) }) : t('desk.consequences.noRecord')}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenRecords}
          className="border border-panel-border bg-black/20 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
        >
          {t('desk.consequences.records')}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="border border-panel-border/70 bg-black/20 px-2 py-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.consequences.battles')}</div>
          <div className="mt-1 text-[16px] font-bold text-text-primary">{battleCount}</div>
        </div>
        <div className="border border-panel-border/70 bg-black/20 px-2 py-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.consequences.displaced')}</div>
          <div className="mt-1 text-[16px] font-bold text-text-primary">{displacement}</div>
        </div>
        <div className="border border-panel-border/70 bg-black/20 px-2 py-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.consequences.events')}</div>
          <div className="mt-1 text-[16px] font-bold text-text-primary">{notableEvents}</div>
        </div>
        <div className="border border-panel-border/70 bg-black/20 px-2 py-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.consequences.decisions')}</div>
          <div className="mt-1 text-[16px] font-bold text-text-primary">{decisionRecords.length}</div>
        </div>
      </div>
      {decisionRecords.length > 0 && (
        <div className="mt-3 space-y-2">
          {decisionRecords.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={record.recordTarget === 'chronicle' ? onOpenChronicle : (onOpenDecisionRecords ?? onOpenRecords)}
              className="flex w-full gap-2 border border-panel-border/70 bg-black/20 px-2.5 py-2 text-left transition-colors hover:border-accent-gold/45"
            >
              <img
                src={getConsequenceStillForRecord(record)}
                alt={`${record.title} consequence`}
                className="h-12 w-20 shrink-0 border border-panel-border/60 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-[11px] font-bold text-text-primary">{record.title}</div>
                  <div className="shrink-0 text-[8px] font-bold uppercase tracking-[0.14em] text-accent-gold">{record.outcome}</div>
                </div>
                <div className="mt-1 truncate text-[9px] text-text-secondary">{record.family} / Turn {record.turn} / {record.detail}</div>
                <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.13em] text-text-muted">
                  {record.recordTarget === 'chronicle'
                    ? t('desk.consequences.openChronicle')
                    : t('desk.consequences.openRecords')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
