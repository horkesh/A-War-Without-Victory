// historical_source: Canonical presidential-review queue and decision-consequence ledger contracts.
// source_tier: design_counterfactual
// source_note: The strip renders persisted live-run consequence totals and labels; it does not present them as historical figures.

import type { LoadedGameState } from '../../data/types';
import { buildDecisionConsequenceLedger, buildDecisionConsequenceLedgerSummary, resolveDecisionConsequenceCopy } from '../../data/decisionConsequenceLedger';
import { getConsequenceStillForRecord } from '../../data/presidentialDeskAssets';
import { shouldNarrateTerritorySummary } from '../../data/territorySummaryGuard';
import { t, type MessageKey } from '../../i18n';
import { turnToDateString } from '../../utils/formatters';
import { SURFACE_LABEL_MUTED } from '../surface/Surface';
import type { DecisionConsequenceRecord } from '../../data/decisionConsequenceLedger';

export interface ConsequenceStripProps {
  state: LoadedGameState | null;
  onOpenRecords: () => void;
  onOpenDecisionRecords?: (recordId?: string) => void;
  onOpenChronicle: (recordId?: string) => void;
}

const FAMILY_LABEL_KEYS: Record<DecisionConsequenceRecord['familyId'], MessageKey> = {
  'event-decision': 'decisionConsequences.family.eventDecision',
  'autonomy-proposal': 'decisionConsequences.family.autonomyProposal',
  'operation-opportunity': 'decisionConsequences.family.operationOpportunity',
  'army-reserve': 'decisionConsequences.family.armyReserve',
  'peace-proposal': 'decisionConsequences.family.peaceProposal',
  'dayton-settlement': 'decisionConsequences.family.daytonSettlement',
  'humanitarian-convoy': 'decisionConsequences.family.humanitarianConvoy',
  'paramilitary-authorization': 'decisionConsequences.family.paramilitaryAuthorization',
  'patron-relations': 'decisionConsequences.family.patronRelations',
  'officer-personnel': 'decisionConsequences.family.officerPersonnel',
  'stance-matter': 'decisionConsequences.family.stanceMatter',
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

  const figures: Array<{ label: string; value: number }> = [
    { label: t('desk.consequences.battles'), value: battleCount },
    { label: t('desk.consequences.displaced'), value: displacement },
    { label: t('desk.consequences.events'), value: notableEvents },
    { label: t('desk.consequences.decisions'), value: decisionRecordCount },
  ];

  // Surface redesign (2026-11-10): "What followed" reads as a section of the Desk's
  // right column — figures as plain rows, then the latest decisions with their stills.
  return (
    <section
      className="flex flex-col gap-3"
      aria-label={t('desk.consequences.ariaLabel')}
      data-testid="desk-consequence-strip"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className={SURFACE_LABEL_MUTED}>{t('desk.consequences.heading')}</div>
          <div className="text-[15px] text-[#9c917b]">
            {latestFiledTurn != null ? t('desk.consequences.lastFiled', { date: turnToDateString(latestFiledTurn) }) : t('desk.consequences.noRecord')}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenRecords}
          data-testid="desk-consequence-open-records"
          className="h-10 shrink-0 rounded-md border border-[#3a4150] bg-[#1b2029] px-4 text-[15px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60"
        >
          {t('desk.consequences.records')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {figures.map((figure) => (
          <div key={figure.label} className="rounded-md border border-[#2a303c] bg-[#161a22] px-4 py-2.5">
            <div className="text-[15px] text-[#b9ad94]">{figure.label}</div>
            <div className="font-mono text-[20px] font-semibold tabular-nums text-[#f1e6c8]">{figure.value}</div>
          </div>
        ))}
      </div>
      {decisionRecords.length > 0 && (
        <div className="flex flex-col gap-2">
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
              className="grid w-full grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-md border border-[#2a303c] bg-[#161a22] p-3 text-left transition hover:border-[#4a4436]"
            >
              <img
                src={getConsequenceStillForRecord(record)}
                alt={t('decisionConsequences.imageAlt', { title })}
                className="h-16 w-full rounded object-cover"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="text-[16px] font-semibold leading-snug text-[#f1e6c8]">{title}</div>
                <div className="text-[14px] font-semibold text-[#e0c27a]">{outcome}</div>
                <div className="text-[14px] leading-snug text-[#b9ad94]">
                  {familyLabel(record)} · {t('decisionConsequences.date', { date: turnToDateString(record.turn) })} · {detail}
                </div>
                <div className="text-[14px] font-semibold text-[#c9a75c]">
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
