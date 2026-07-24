import type { LoadedGameState } from '../../data/types';
import { buildDecisionConsequenceLedger, buildDecisionConsequenceLedgerSummary, resolveDecisionConsequenceCopy } from '../../data/decisionConsequenceLedger';
import { getConsequenceStillForRecord } from '../../data/presidentialDeskAssets';
import { shouldNarrateTerritorySummary } from '../../data/territorySummaryGuard';
import { t, type MessageKey } from '../../i18n';
import { turnToDateString } from '../../utils/formatters';
import type { DecisionConsequenceRecord } from '../../data/decisionConsequenceLedger';

export interface ConsequenceStripProps {
  state: LoadedGameState | null;
  onOpenRecords: () => void;
  onOpenDecisionRecords?: (recordId?: string) => void;
  onOpenChronicle: (recordId?: string) => void;
}

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

function familyLabel(record: DecisionConsequenceRecord): string {
  return t(FAMILY_LABEL_KEYS[record.familyId]);
}

export function ConsequenceStrip({ state, onOpenRecords, onOpenDecisionRecords, onOpenChronicle }: ConsequenceStripProps) {
  const latestSummary = state?.latestTurnSummary ?? null;
  const filedSummary = shouldNarrateTerritorySummary(latestSummary) ? latestSummary : null;
  const battleCount = filedSummary?.battles?.length ?? 0;
  const displacement = filedSummary?.displacement_total ?? 0;
  const notableEvents = filedSummary?.notable_events?.length ?? 0;
  const decisionRecords = buildDecisionConsequenceLedger(state, 2);
  const decisionRecordCount = buildDecisionConsequenceLedgerSummary(
    buildDecisionConsequenceLedger(state, Number.MAX_SAFE_INTEGER),
  ).recordsRouteCount;
  const latestFiledTurn = filedSummary?.turn ?? decisionRecords[0]?.turn ?? null;

  return (
    <section
      className="border-t border-panel-border/70 pt-3"
      aria-label={t('desk.consequences.ariaLabel')}
      data-testid="desk-consequence-strip"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">{t('desk.consequences.heading')}</div>
          <div className="mt-1 text-xs text-text-secondary">
            {latestFiledTurn != null ? t('desk.consequences.lastFiled', { date: turnToDateString(latestFiledTurn) }) : t('desk.consequences.noRecord')}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenRecords}
          data-testid="desk-consequence-open-records"
          className="border border-panel-border bg-black/20 px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.13em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
        >
          {t('desk.consequences.records')}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="border border-panel-border/70 bg-black/20 px-2 py-2">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.consequences.battles')}</div>
          <div className="mt-1 text-[16px] font-bold text-text-primary">{battleCount}</div>
        </div>
        <div className="border border-panel-border/70 bg-black/20 px-2 py-2">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.consequences.displaced')}</div>
          <div className="mt-1 text-[16px] font-bold text-text-primary">{displacement}</div>
        </div>
        <div className="border border-panel-border/70 bg-black/20 px-2 py-2">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.consequences.events')}</div>
          <div className="mt-1 text-[16px] font-bold text-text-primary">{notableEvents}</div>
        </div>
        <div className="border border-panel-border/70 bg-black/20 px-2 py-2">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.consequences.decisions')}</div>
          <div className="mt-1 text-[16px] font-bold text-text-primary">{decisionRecordCount}</div>
        </div>
      </div>
      {decisionRecords.length > 0 && (
        <div className="mt-3 space-y-2">
          {decisionRecords.map((record) => {
            const title = resolveDecisionConsequenceCopy(record, 'title');
            const outcome = resolveDecisionConsequenceCopy(record, 'outcome');
            const detail = resolveDecisionConsequenceCopy(record, 'detail');
            return (
            <button
              key={record.id}
              type="button"
              data-testid="desk-consequence-row"
              data-record-id={record.id}
              data-record-target={record.recordTarget}
              data-family-id={record.familyId}
              onClick={record.recordTarget === 'chronicle' ? () => onOpenChronicle(record.id) : () => {
                if (onOpenDecisionRecords) {
                  onOpenDecisionRecords(record.id);
                } else {
                  onOpenRecords();
                }
              }}
              className="flex w-full gap-2 border border-panel-border/70 bg-black/20 px-2.5 py-2 text-left transition-colors hover:border-accent-gold/45"
            >
              <img
                src={getConsequenceStillForRecord(record)}
                alt={t('decisionConsequences.imageAlt', { title })}
                className="h-12 w-20 shrink-0 border border-panel-border/60 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-bold text-text-primary">{title}</div>
                  <div className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-accent-gold">{outcome}</div>
                </div>
                <div className="mt-1 truncate text-xs text-text-secondary">
                  {familyLabel(record)} / {t('decisionConsequences.date', { date: turnToDateString(record.turn) })} / {detail}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.13em] text-text-muted">
                  {record.recordTarget === 'chronicle'
                    ? t('desk.consequences.openChronicle')
                    : t('desk.consequences.openRecords')}
                </div>
              </div>
            </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
