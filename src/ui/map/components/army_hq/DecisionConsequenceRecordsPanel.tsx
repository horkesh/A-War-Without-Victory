import { useEffect, useMemo } from 'react';
import {
  buildDecisionConsequenceLedger,
  buildDecisionConsequenceLedgerSummary,
  type DecisionConsequenceRecord,
} from '../../data/decisionConsequenceLedger';
import { getConsequenceStillForRecord } from '../../data/presidentialDeskAssets';
import { t, type MessageKey } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { turnToDateString } from '../../utils/formatters';
import { openChronicle } from '../../utils/shellNavigation';

const FAMILY_LABEL_KEYS: Record<DecisionConsequenceRecord['familyId'], MessageKey> = {
  'event-decision': 'decisionConsequences.family.eventDecision',
  'operation-opportunity': 'decisionConsequences.family.operationOpportunity',
  'army-reserve': 'decisionConsequences.family.armyReserve',
  'peace-proposal': 'decisionConsequences.family.peaceProposal',
  'dayton-settlement': 'decisionConsequences.family.daytonSettlement',
  'humanitarian-convoy': 'decisionConsequences.family.humanitarianConvoy',
  'paramilitary-authorization': 'decisionConsequences.family.paramilitaryAuthorization',
  'patron-relations': 'decisionConsequences.family.patronRelations',
  'officer-personnel': 'decisionConsequences.family.officerPersonnel',
};

function routeLabel(record: DecisionConsequenceRecord): string {
  return record.recordTarget === 'chronicle'
    ? t('decisionConsequences.route.chronicle')
    : t('decisionConsequences.route.records');
}

function familyLabel(record: DecisionConsequenceRecord): string {
  return t(FAMILY_LABEL_KEYS[record.familyId]);
}

export function DecisionConsequenceRecordsPanel() {
  const state = useGameStore((s) => s.loadedGameState);
  const focusedDecisionConsequenceId = useGameStore((s) => s.focusedDecisionConsequenceId);
  const records = useMemo(() => buildDecisionConsequenceLedger(state, 50), [state]);
  const visibleRecords = useMemo(() => {
    if (!focusedDecisionConsequenceId || records.some((record) => record.id === focusedDecisionConsequenceId)) {
      return records;
    }
    return buildDecisionConsequenceLedger(state, Number.MAX_SAFE_INTEGER);
  }, [focusedDecisionConsequenceId, records, state]);
  const summary = buildDecisionConsequenceLedgerSummary(visibleRecords);

  useEffect(() => {
    if (!focusedDecisionConsequenceId || typeof document === 'undefined') return;
    const el = document.querySelector<HTMLElement>(`[data-focused-decision-consequence-id="${focusedDecisionConsequenceId}"]`);
    el?.scrollIntoView?.({ block: 'center' });
    el?.focus();
  }, [focusedDecisionConsequenceId, visibleRecords.length]);

  return (
    <section
      className="rounded-md border border-panel-border bg-panel-card p-4"
      aria-label={t('decisionConsequences.ariaLabel')}
      data-testid="decision-consequence-records-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-panel-border/70 pb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-gold">{t('decisionConsequences.title')}</div>
          <div className="mt-1 text-[11px] text-text-secondary">
            {t('decisionConsequences.subtitle')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionConsequences.filed')}</div>
          <div className="text-[18px] font-bold text-text-primary">{summary.total}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionConsequences.recordsRoute')}</div>
          <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{summary.recordsRouteCount}</div>
        </div>
        <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionConsequences.chronicleRoute')}</div>
          <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{summary.chronicleRouteCount}</div>
        </div>
        <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionConsequences.latestTurn')}</div>
          <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">
            {summary.latestTurn != null ? turnToDateString(summary.latestTurn) : '-'}
          </div>
        </div>
        <div className="min-w-0 rounded border border-panel-border/60 bg-black/20 px-2 py-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionConsequences.families')}</div>
          <div className="mt-1 truncate text-[11px] text-text-secondary">
            {visibleRecords.length > 0
              ? Array.from(new Map(visibleRecords.map((record) => [record.familyId, familyLabel(record)])).values()).join(' / ')
              : '-'}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {visibleRecords.length === 0 ? (
          <div className="rounded border border-panel-border/70 bg-black/20 px-3 py-4 text-[12px] text-text-secondary">
            {t('decisionConsequences.empty')}
          </div>
        ) : visibleRecords.map((record) => {
          const isFocused = record.id === focusedDecisionConsequenceId;
          return (
          <article
            key={record.id}
            tabIndex={isFocused ? -1 : undefined}
            data-testid="decision-consequence-record"
            data-record-id={record.id}
            data-record-target={record.recordTarget}
            data-family-id={record.familyId}
            data-focused-decision-consequence-id={record.id}
            className={`rounded border px-3 py-3 ${isFocused ? 'border-accent-gold/70 bg-accent-gold/10 shadow-[0_0_0_1px_rgba(218,165,32,0.18)]' : 'border-panel-border/70 bg-black/20'}`}
          >
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
                      {`${familyLabel(record)} / ${turnToDateString(record.turn)}`}
                    </div>
                  </div>
                  <div className="shrink-0 rounded border border-accent-gold/35 bg-accent-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-gold">
                    {record.outcome}
                  </div>
                </div>
                <div className="mt-2 text-[11px] leading-5 text-text-secondary">{record.detail}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-panel-border/60 bg-panel-bg/60 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                    {t('decisionConsequences.filedTo', { route: routeLabel(record) })}
                  </span>
                  {record.recordTarget === 'chronicle' ? (
                    <button
                      type="button"
                      data-testid="decision-consequence-open-chronicle"
                      data-record-id={record.id}
                      onClick={() => openChronicle(useGameStore.getState())}
                      className="rounded border border-panel-border bg-black/20 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
                    >
                      {t('decisionConsequences.openChronicle')}
                    </button>
                  ) : (
                    <span className="rounded border border-panel-border/50 bg-black/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-text-muted">
                      {t('decisionConsequences.reviewInRecords')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
