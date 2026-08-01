import { useEffect, useMemo, useState } from 'react';
import type { EventDefinition } from '../../../../sim/events/event_types';
import type { GameState } from '../../../../state/game_state';
import {
  getCausalDescendants,
  getPlayerDecisionHistory,
  type EventDecision,
} from '../../../../sim/events/causality_query';
import {
  buildDecisionConsequenceLedger,
  buildDecisionConsequenceLedgerSummary,
  resolveDecisionConsequenceCopy,
  type DecisionConsequenceRecord,
} from '../../data/decisionConsequenceLedger';
import {
  buildConsequenceReceipts,
  decisionSourceRecordId,
  type ConsequenceReceipt,
} from '../../data/consequenceReceipts';
import { getConsequenceStillForRecord } from '../../data/presidentialDeskAssets';
import { t, type MessageKey } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { turnToDateString } from '../../utils/formatters';
import { getPlayerSafeDisplayLabel } from '../../utils/playerSafeText';
import { openChronicleDecisionRecord } from '../../utils/shellNavigation';

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
};

function routeLabel(record: DecisionConsequenceRecord): string {
  return record.recordTarget === 'chronicle'
    ? t('decisionConsequences.route.chronicle')
    : t('decisionConsequences.route.records');
}

function familyLabel(record: DecisionConsequenceRecord): string {
  return t(FAMILY_LABEL_KEYS[record.familyId]);
}

const SOURCE_NOTE_EXCERPT_MAX_CHARS = 200;

function truncateSourceNote(text: string): string {
  if (text.length <= SOURCE_NOTE_EXCERPT_MAX_CHARS) return text;
  return `${text.slice(0, SOURCE_NOTE_EXCERPT_MAX_CHARS)}...`;
}

function resolveDecisionTitle(
  decision: EventDecision,
  eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
): string {
  const title = eventCatalog?.get(decision.event_id)?.title;
  return typeof title === 'string' && title.trim().length > 0
    ? title
    : getPlayerSafeDisplayLabel(decision.event_id, t('decisionHistory.recordedDecision'));
}

function resolveDescendantLabel(
  eventId: string,
  eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
): string {
  const title = eventCatalog?.get(eventId)?.title;
  return typeof title === 'string' && title.trim().length > 0
    ? title
    : getPlayerSafeDisplayLabel(eventId, t('decisionHistory.recordedEvent'));
}

function resolveOptionLabel(
  decision: EventDecision,
  eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
): string {
  const def = eventCatalog?.get(decision.event_id);
  const option = (def?.response_options ?? []).find((candidate) => candidate.id === decision.response_id);
  const label = option?.label;
  return typeof label === 'string' && label.trim().length > 0
    ? label
    : getPlayerSafeDisplayLabel(decision.response_id, t('decisionHistory.recordedResponse'));
}

function isDivergenceFromHistorical(
  decision: EventDecision,
  eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
): boolean {
  const histDefault = eventCatalog?.get(decision.event_id)?.historical_default_response_id;
  return typeof histDefault === 'string' && histDefault.length > 0 && decision.response_id !== histDefault;
}

function tallyReceipts(receipts: readonly ConsequenceReceipt[]): {
  confirmed: number;
  pending: number;
  contradicted: number;
} {
  const counts = { confirmed: 0, pending: 0, contradicted: 0 };
  for (const receipt of receipts) {
    if (receipt.status === 'confirmed') counts.confirmed += 1;
    else if (receipt.status === 'pending') counts.pending += 1;
    else counts.contradicted += 1;
  }
  return counts;
}

function receiptStatusLabel(receipt: ConsequenceReceipt): string {
  if (receipt.status === 'confirmed') return t('decisionHistory.receipts.confirmed', { count: 1 });
  if (receipt.status === 'pending') return t('decisionHistory.receipts.pending', { count: 1 });
  return t('decisionHistory.receipts.contradicted', { count: 1 });
}

function DecisionHistoryRecordRow({
  decision,
  eventCatalog,
  rawState,
  receipts,
  isExpanded,
  onToggle,
  diagMode,
}: {
  decision: EventDecision;
  eventCatalog: ReadonlyMap<string, EventDefinition>;
  rawState: GameState;
  receipts: readonly ConsequenceReceipt[];
  isExpanded: boolean;
  onToggle: () => void;
  diagMode: boolean;
}) {
  const def = eventCatalog.get(decision.event_id);
  const family = def?.family ?? 'unknown';
  const diverged = isDivergenceFromHistorical(decision, eventCatalog);
  const sourceNote = diagMode ? (def?.source_note ?? def?.historical_source ?? null) : null;
  const sourceNoteExcerpt = sourceNote ? truncateSourceNote(sourceNote) : null;
  const decisionTitle = resolveDecisionTitle(decision, eventCatalog);
  const optionLabel = resolveOptionLabel(decision, eventCatalog);
  const counts = tallyReceipts(receipts);
  const hasReceipts = receipts.length > 0;
  const sourceRecordId = decisionSourceRecordId(decision.event_id, decision.response_id, decision.turn);
  const descendants = useMemo(
    () => (isExpanded ? getCausalDescendants(decision.event_id, rawState) : []),
    [isExpanded, decision.event_id, rawState],
  );

  return (
    <li
      data-testid="decision-history-row"
      data-source-record-id={sourceRecordId}
      {...(diagMode ? { 'data-event-id': decision.event_id, 'data-response-id': decision.response_id } : {})}
      data-turn={decision.turn}
      className="rounded border border-panel-border/70 bg-black/20"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
      >
        <span
          data-testid="decision-history-turn"
          className="w-16 shrink-0 text-xs font-mono tabular-nums text-text-muted"
        >
          {turnToDateString(decision.turn)}
        </span>
        <span className="min-w-0 flex-1">
          <span
            data-testid="decision-history-event-id"
            {...(diagMode ? { 'data-event-id': decision.event_id } : {})}
            className="block truncate text-[12px] font-bold leading-snug text-text-primary"
            title={decisionTitle}
          >
            {decisionTitle}
          </span>
          <span
            data-testid="decision-history-chosen-option"
            {...(diagMode ? { 'data-response-id': decision.response_id } : {})}
            className="mt-0.5 block truncate text-xs leading-snug text-text-secondary"
            title={optionLabel}
          >
            {optionLabel}
          </span>
          <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-text-muted">
            {diagMode && (
              <span data-testid="decision-history-family">{t('decisionHistory.familyDiagnostic', { family })}</span>
            )}
            {hasReceipts && (
              <span data-testid="decision-history-receipt-counts">
                {counts.confirmed > 0 && (
                  <span data-testid="decision-history-receipt-confirmed" className="text-emerald-300/85">
                    {' '}{t('decisionHistory.receipts.confirmed', { count: counts.confirmed })}
                  </span>
                )}
                {counts.pending > 0 && (
                  <span data-testid="decision-history-receipt-pending" className="text-text-secondary">
                    {' '}{t('decisionHistory.receipts.pending', { count: counts.pending })}
                  </span>
                )}
                {counts.contradicted > 0 && (
                  <span data-testid="decision-history-receipt-contradicted" className="text-amber-300/85">
                    {' '}{t('decisionHistory.receipts.contradicted', { count: counts.contradicted })}
                  </span>
                )}
              </span>
            )}
          </span>
        </span>
        <span
          data-testid={diverged ? 'decision-history-divergence-badge' : 'decision-history-historical-badge'}
          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] ${
            diverged
              ? 'bg-amber-400/15 text-amber-300'
              : 'bg-panel-border/45 text-text-secondary'
          }`}
        >
          {t(diverged ? 'decisionHistory.badge.diverged' : 'decisionHistory.badge.historical')}
        </span>
      </button>
      {isExpanded && (
        <div
          data-testid="decision-history-row-expanded"
          className="border-t border-panel-border/50 bg-black/15 px-3 pb-2 pt-2"
        >
          <div className="mb-1 text-xs uppercase tracking-[0.12em] text-text-muted">
            {t('decisionHistory.descendants.heading', { count: descendants.length })}
          </div>
          {descendants.length > 0 ? (
            <ul data-testid="decision-history-descendants-list" className="mb-2 space-y-1">
              {descendants.map((id) => (
                <li
                  key={id}
                  data-testid="decision-history-descendant-row"
                  {...(diagMode ? { 'data-event-id': id } : {})}
                  className="text-xs leading-snug text-text-secondary"
                >
                  {resolveDescendantLabel(id, eventCatalog)}
                </li>
              ))}
            </ul>
          ) : (
            <div
              data-testid="decision-history-no-descendants"
              className="mb-2 text-xs italic text-text-muted"
            >
              {t('decisionHistory.descendants.empty')}
            </div>
          )}
          {hasReceipts && (
            <div className="mb-2">
              <div className="mb-1 text-xs uppercase tracking-[0.12em] text-text-muted">
                {t('decisionHistory.receipts.heading', { count: receipts.length })}
              </div>
              <ul data-testid="decision-history-receipts-list" className="space-y-1">
                {receipts.map((receipt) => (
                  <li
                    key={receipt.receiptRecordId}
                    data-testid="decision-history-receipt-row"
                    data-receipt-record-id={receipt.receiptRecordId}
                    data-source-record-id={receipt.sourceRecordId}
                    className="rounded border border-panel-border/50 bg-black/20 px-2 py-1.5 text-xs text-text-secondary"
                  >
                    <div className="font-semibold text-text-primary">{receipt.predictedLabel}</div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span>
                        {receiptStatusLabel(receipt)}
                        {receipt.firedTurn !== null ? ` · ${turnToDateString(receipt.firedTurn)}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const sourceRow = [...document.querySelectorAll<HTMLElement>(
                            '[data-testid="decision-history-row"]',
                          )].find((row) => row.dataset.sourceRecordId === receipt.sourceRecordId);
                          sourceRow?.querySelector<HTMLElement>('button')?.focus();
                        }}
                        className="text-accent-gold hover:underline"
                      >
                        {t('decisionHistory.receipts.backToSource')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sourceNoteExcerpt && (
            <div
              data-testid="decision-history-source-note"
              className="text-xs leading-relaxed text-text-secondary"
            >
              <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
                {t('decisionHistory.sourcePrefix')}
              </span>
              {sourceNoteExcerpt}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function DecisionHistoryRecordsSection({
  eventCatalog,
}: {
  eventCatalog?: ReadonlyMap<string, EventDefinition>;
}) {
  const loadedState = useGameStore((s) => s.loadedGameState);
  const diagMode = useGameStore((s) => s.diagMode);
  const [expandedSourceRecordId, setExpandedSourceRecordId] = useState<string | null>(null);
  const rawState = loadedState?.rawGameState;
  const decisions = useMemo(
    () => (rawState && eventCatalog ? getPlayerDecisionHistory(rawState) : []),
    [rawState, eventCatalog],
  );
  const receiptsBySourceRecord = useMemo(() => {
    const map = new Map<string, ConsequenceReceipt[]>();
    if (!rawState || !eventCatalog) return map;
    for (const receipt of buildConsequenceReceipts(rawState, eventCatalog)) {
      const arr = map.get(receipt.sourceRecordId) ?? [];
      arr.push(receipt);
      map.set(receipt.sourceRecordId, arr);
    }
    return map;
  }, [rawState, eventCatalog]);

  if (!rawState || !eventCatalog) return null;

  return (
    <section
      data-testid="decision-history-records-section"
      className="mt-3 rounded border border-panel-border/70 bg-black/10 px-3 py-3"
      aria-label={t('decisionHistory.records.ariaLabel')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-accent-gold">
            {t('decisionHistory.records.title')}
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            {t('decisionHistory.records.subtitle')}
          </div>
        </div>
        <div
          data-testid="decision-history-count"
          className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary"
        >
          {t(decisions.length === 1 ? 'decisionHistory.count.one' : 'decisionHistory.count.many', { count: decisions.length })}
        </div>
      </div>
      {decisions.length === 0 ? (
        <div
          data-testid="decision-history-no-decisions"
          className="mt-3 rounded border border-panel-border/60 bg-black/20 px-3 py-3 text-xs text-text-secondary"
        >
          {t('decisionHistory.noDecisions')}
        </div>
      ) : (
        <ul data-testid="decision-history-list" className="mt-3 space-y-2">
          {decisions.map((decision) => {
            const sourceRecordId = decisionSourceRecordId(
              decision.event_id,
              decision.response_id,
              decision.turn,
            );
            return (
              <DecisionHistoryRecordRow
                key={sourceRecordId}
                decision={decision}
                eventCatalog={eventCatalog}
                rawState={rawState}
                receipts={receiptsBySourceRecord.get(sourceRecordId) ?? []}
                diagMode={diagMode}
                isExpanded={expandedSourceRecordId === sourceRecordId}
                onToggle={() => setExpandedSourceRecordId(
                  expandedSourceRecordId === sourceRecordId ? null : sourceRecordId,
                )}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

export interface DecisionConsequenceRecordsPanelProps {
  eventCatalog?: ReadonlyMap<string, EventDefinition>;
}

export function DecisionConsequenceRecordsPanel({ eventCatalog }: DecisionConsequenceRecordsPanelProps = {}) {
  const state = useGameStore((s) => s.loadedGameState);
  const focusedDecisionConsequenceId = useGameStore((s) => s.focusedDecisionConsequenceId);
  const records = useMemo(
    () => buildDecisionConsequenceLedger(state, Number.MAX_SAFE_INTEGER)
      .filter((record) => record.recordTarget === 'records')
      .slice(0, 50),
    [state],
  );
  const visibleRecords = useMemo(() => {
    if (!focusedDecisionConsequenceId || records.some((record) => record.id === focusedDecisionConsequenceId)) {
      return records;
    }
    return buildDecisionConsequenceLedger(state, Number.MAX_SAFE_INTEGER)
      .filter((record) => record.recordTarget === 'records');
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
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-accent-gold">{t('decisionConsequences.title')}</div>
          <div className="mt-1 text-xs text-text-secondary">
            {t('decisionConsequences.subtitle')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionConsequences.filed')}</div>
          <div className="text-[18px] font-bold text-text-primary">{summary.total}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionConsequences.recordsRoute')}</div>
          <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{summary.recordsRouteCount}</div>
        </div>
        <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionConsequences.chronicleRoute')}</div>
          <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{summary.chronicleRouteCount}</div>
        </div>
        <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionConsequences.latestTurn')}</div>
          <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">
            {summary.latestTurn != null ? turnToDateString(summary.latestTurn) : '-'}
          </div>
        </div>
        <div className="min-w-0 rounded border border-panel-border/60 bg-black/20 px-2 py-2">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionConsequences.families')}</div>
          <div className="mt-1 truncate text-xs text-text-secondary">
            {visibleRecords.length > 0
              ? Array.from(new Map(visibleRecords.map((record) => [record.familyId, familyLabel(record)])).values()).join(' / ')
              : '-'}
          </div>
        </div>
      </div>

      <DecisionHistoryRecordsSection eventCatalog={eventCatalog} />

      <div className="mt-3 space-y-2">
        {visibleRecords.length === 0 ? (
          <div className="rounded border border-panel-border/70 bg-black/20 px-3 py-4 text-[12px] text-text-secondary">
            {t('decisionConsequences.empty')}
          </div>
        ) : visibleRecords.map((record) => {
          const isFocused = record.id === focusedDecisionConsequenceId;
          const title = resolveDecisionConsequenceCopy(record, 'title');
          const outcome = resolveDecisionConsequenceCopy(record, 'outcome');
          const detail = resolveDecisionConsequenceCopy(record, 'detail');
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
                alt={t('decisionConsequences.imageAlt', { title })}
                className="h-16 w-28 shrink-0 rounded-sm border border-panel-border/70 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold text-text-primary">{title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-text-muted">
                      {`${familyLabel(record)} / ${turnToDateString(record.turn)}`}
                    </div>
                  </div>
                  <div className="shrink-0 rounded border border-accent-gold/35 bg-accent-gold/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-accent-gold">
                    {outcome}
                  </div>
                </div>
                <div className="mt-2 text-xs leading-5 text-text-secondary">{detail}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-panel-border/60 bg-panel-bg/60 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
                    {t('decisionConsequences.filedTo', { route: routeLabel(record) })}
                  </span>
                  {record.recordTarget === 'chronicle' ? (
                    <button
                      type="button"
                      data-testid="decision-consequence-open-chronicle"
                      data-record-id={record.id}
                      onClick={() => openChronicleDecisionRecord(useGameStore.getState(), record.id)}
                      className="rounded border border-panel-border bg-black/20 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
                    >
                      {t('decisionConsequences.openChronicle')}
                    </button>
                  ) : (
                    <span className="rounded border border-panel-border/50 bg-black/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
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
