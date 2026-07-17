import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OperationOpportunityRecordView } from '../../data/types';
import { turnToDateString } from '../../utils/formatters';
import { getPlayerSafeMilitaryFactionName } from '../../utils/playerSafeText';
import { buildOpportunityLedgerPulse, type OpportunityLedgerPulse } from '../../data/opportunityLedgerPulse';
import { t, type MessageKey } from '../../i18n';

const STATUS_LABEL_KEY: Record<OperationOpportunityRecordView['status'], MessageKey> = {
    eligible_pending_review: 'opportunityLedger.status.pendingReview',
    delayed: 'opportunityLedger.status.delayed',
    approved: 'opportunityLedger.status.approved',
    declined: 'opportunityLedger.status.declined',
    expired: 'opportunityLedger.status.expired',
    redirected: 'opportunityLedger.status.redirected',
    under_resourced_approved: 'opportunityLedger.status.underResourced',
};

const STATUS_CLASS: Record<OperationOpportunityRecordView['status'], string> = {
    eligible_pending_review: 'border-amber-400/40 text-amber-300 bg-amber-400/10',
    delayed: 'border-blue-400/30 text-blue-300 bg-blue-400/10',
    approved: 'border-emerald-400/35 text-emerald-300 bg-emerald-400/10',
    declined: 'border-neutral-500/40 text-neutral-300 bg-neutral-500/10',
    expired: 'border-neutral-500/40 text-neutral-400 bg-neutral-500/10',
    redirected: 'border-sky-400/35 text-sky-300 bg-sky-400/10',
    under_resourced_approved: 'border-amber-400/35 text-amber-300 bg-amber-400/10',
};

const EXIT_LABEL_KEY: Record<NonNullable<OperationOpportunityRecordView['exit_class']>, MessageKey> = {
    decisive_success: 'opportunityLedger.exit.decisiveSuccess',
    partial_success: 'opportunityLedger.exit.partialSuccess',
    failed: 'opportunityLedger.exit.failed',
    aborted: 'opportunityLedger.exit.aborted',
    did_not_launch: 'opportunityLedger.exit.didNotLaunch',
    t3_authorized_no_offensive: 'opportunityLedger.exit.t3AuthorizedNoOffensive',
};

const EXIT_CLASS: Record<NonNullable<OperationOpportunityRecordView['exit_class']>, string> = {
    decisive_success: 'text-emerald-300',
    partial_success: 'text-amber-300',
    failed: 'text-red-300',
    aborted: 'text-neutral-300',
    did_not_launch: 'text-neutral-400',
    t3_authorized_no_offensive: 'text-sky-300',
};

function RecordBadge({ record }: { record: OperationOpportunityRecordView }) {
    return (
        <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-[0.12em] ${STATUS_CLASS[record.status]}`}>
            {t(STATUS_LABEL_KEY[record.status])}
        </span>
    );
}

function AxisLine({ record }: { record: OperationOpportunityRecordView }) {
    const required = record.required_axes_total != null
        ? record.required_axes_green == null
            ? t('opportunityLedger.requiredAxesUnreported', { total: record.required_axes_total })
            : t('opportunityLedger.requiredAxes', { green: record.required_axes_green, total: record.required_axes_total })
        : null;
    const optional = record.optional_axes_total != null
        ? record.optional_axes_green == null
            ? t('opportunityLedger.optionalAxesUnreported', { total: record.optional_axes_total })
            : t('opportunityLedger.optionalAxes', { green: record.optional_axes_green, total: record.optional_axes_total })
        : null;
    if (!required && !optional) return null;
    return (
        <div className="text-xs text-text-muted tabular-nums">
            {[required, optional].filter(Boolean).join(' | ')}
        </div>
    );
}

function OpportunityRecordCard({ record }: { record: OperationOpportunityRecordView }) {
    const outcome = record.exit_class ? t(EXIT_LABEL_KEY[record.exit_class]) : null;
    const objectiveLine = record.objectives_targeted != null
        ? t('opportunityLedger.objectivesCount', { captured: record.objectives_captured ?? 0, targeted: record.objectives_targeted })
        : null;
    const gradeLine = record.grade_stars != null
        ? `${record.grade_stars}/5${record.grade_verdict ? ` ${record.grade_verdict}` : ''}`
        : null;

    return (
        <div
            data-testid="opportunity-ledger-record"
            data-proposal-id={record.proposal_id}
            data-status={record.status}
            className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-2"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-[12px] font-bold text-text-primary truncate">
                        {record.display_name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1 text-xs text-text-secondary">
                        {record.faction && <span>{getPlayerSafeMilitaryFactionName(record.faction)}</span>}
                        {record.response_turn != null && <span>{turnToDateString(record.response_turn)}</span>}
                        {record.executed_op_aar_id && <span>{t('opportunityLedger.aarLinked')}</span>}
                    </div>
                </div>
                <RecordBadge record={record} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {outcome && (
                    <div>
                        <div className="uppercase tracking-[0.12em] text-text-muted">{t('opportunityLedger.outcome')}</div>
                        <div className={`font-bold ${EXIT_CLASS[record.exit_class!]}`}>{outcome}</div>
                    </div>
                )}
                {objectiveLine && (
                    <div>
                        <div className="uppercase tracking-[0.12em] text-text-muted">{t('opportunityLedger.objectives')}</div>
                        <div className="font-bold text-text-primary">{objectiveLine}</div>
                    </div>
                )}
                {typeof record.total_attacks === 'number' && (
                    <div>
                        <div className="uppercase tracking-[0.12em] text-text-muted">{t('opportunityLedger.attacks')}</div>
                        <div className="font-bold text-text-primary tabular-nums">{record.total_attacks}</div>
                    </div>
                )}
                {gradeLine && (
                    <div>
                        <div className="uppercase tracking-[0.12em] text-text-muted">{t('opportunityLedger.grade')}</div>
                        <div className="font-bold text-text-primary">{gradeLine}</div>
                    </div>
                )}
            </div>

            <div className="mt-2">
                <AxisLine record={record} />
            </div>
        </div>
    );
}

function PulseMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
    return (
        <div className="rounded border border-panel-border/50 bg-panel-bg/50 px-2 py-1.5">
            <div className="text-xs uppercase tracking-[0.14em] text-text-muted">{label}</div>
            <div className="text-[13px] font-bold tabular-nums text-text-primary">{value}</div>
            <div className="truncate text-xs text-text-secondary">{detail}</div>
        </div>
    );
}

function OpportunityLedgerPulseBand({ pulse }: { pulse: OpportunityLedgerPulse }) {
    const axes = pulse.lifetime_axes;
    const axisDetail = axes.required_total > 0 || axes.optional_total > 0
        ? t('opportunityLedger.axisDetail', {
            requiredGreen: axes.required_green,
            requiredTotal: axes.required_total,
            optionalGreen: axes.optional_green,
            optionalTotal: axes.optional_total,
        })
        : t('opportunityLedger.noAxisData');
    return (
        <section
            data-testid="opportunity-ledger-pulse"
            className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.14em] text-text-muted">{t('opportunityLedger.pulse')}</div>
                    <div className="mt-0.5 text-[12px] font-semibold text-text-primary">{pulse.headline}</div>
                    <div className="mt-1 max-w-3xl text-xs text-text-secondary">
                        {pulse.total_decisions === 0
                            ? t('opportunityLedger.noRecordsPulse')
                            : t('opportunityLedger.resolvedTracked', {
                                resolved: pulse.resolved_decisions,
                                total: pulse.total_decisions,
                                inProgress: pulse.in_progress,
                                operationWord: pulse.in_progress === 1 ? t('opportunityLedger.operationSingular') : t('opportunityLedger.operationPlural'),
                            })}
                    </div>
                </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                <PulseMetric
                    label={t('opportunityLedger.decisionsTaken')}
                    value={pulse.taken}
                    detail={t('opportunityLedger.inProgress', { count: pulse.in_progress })}
                />
                <PulseMetric
                    label={t('opportunityLedger.decisionsMissed')}
                    value={pulse.missed}
                    detail={t('opportunityLedger.declinedExpired')}
                />
                <PulseMetric
                    label={t('opportunityLedger.outcomes')}
                    value={`${pulse.completed_success}/${pulse.completed_success + pulse.completed_failure}`}
                    detail={t('opportunityLedger.failures', { count: pulse.completed_failure })}
                />
                <PulseMetric
                    label={t('opportunityLedger.onDesk')}
                    value={pulse.pending}
                    detail={t('opportunityLedger.awaitingReview')}
                />
                <PulseMetric
                    label={t('opportunityLedger.t3Authorized')}
                    value={pulse.t3_authorized}
                    detail={t('opportunityLedger.reservesCommitted')}
                />
                <PulseMetric
                    label={t('opportunityLedger.lifetimeAxes')}
                    value={`${axes.required_green}/${axes.required_total}`}
                    detail={axisDetail}
                />
            </div>
        </section>
    );
}

export function OpportunityLedgerPanel() {
    const state = useGameStore((s) => s.loadedGameState);
    const records = state?.operationOpportunityRecords;
    const summary = state?.operationOpportunitySummary;

    const rows = useMemo(() => records ?? [], [records]);
    const pulse = useMemo(() => buildOpportunityLedgerPulse(state), [state]);

    if (rows.length === 0) {
        return (
            <div className="space-y-3">
                <OpportunityLedgerPulseBand pulse={pulse} />
                <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-4 text-xs text-text-secondary">
                    {t('opportunityLedger.noRecordsForHq')}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <OpportunityLedgerPulseBand pulse={pulse} />

            {summary && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-2">
                        <div className="text-xs uppercase tracking-[0.14em] text-text-muted">{t('opportunityLedger.pending')}</div>
                        <div className="text-[16px] font-bold text-amber-300 tabular-nums">{summary.pendingCount}</div>
                    </div>
                    <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-2">
                        <div className="text-xs uppercase tracking-[0.14em] text-text-muted">{t('opportunityLedger.completed')}</div>
                        <div className="text-[16px] font-bold text-text-primary tabular-nums">{summary.completedCount}</div>
                    </div>
                    <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-2">
                        <div className="text-xs uppercase tracking-[0.14em] text-text-muted">{t('opportunityLedger.successes')}</div>
                        <div className="text-[16px] font-bold text-emerald-300 tabular-nums">{summary.successCount}</div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {rows.map((record) => (
                    <OpportunityRecordCard key={record.proposal_id} record={record} />
                ))}
            </div>
        </div>
    );
}
