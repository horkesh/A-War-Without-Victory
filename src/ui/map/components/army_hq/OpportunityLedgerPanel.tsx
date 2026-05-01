import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OperationOpportunityRecordView } from '../../data/types';
import { turnToDateString } from '../../utils/formatters';
import { getPlayerSafeMilitaryFactionName } from '../../utils/playerSafeText';

const STATUS_LABEL: Record<OperationOpportunityRecordView['status'], string> = {
    eligible_pending_review: 'Pending Review',
    delayed: 'Delayed',
    approved: 'Approved',
    declined: 'Declined',
    expired: 'Expired',
    redirected: 'Redirected',
    under_resourced_approved: 'Under-Resourced',
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

const EXIT_LABEL: Record<NonNullable<OperationOpportunityRecordView['exit_class']>, string> = {
    decisive_success: 'Decisive Success',
    partial_success: 'Partial Success',
    failed: 'Failed',
    aborted: 'Aborted',
    did_not_launch: 'Did Not Launch',
    // T3 sentinel: defensive-crisis approval that committed reserves but launched no offensive.
    t3_authorized_no_offensive: 'Defensive Reserves Committed',
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
        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-[0.12em] ${STATUS_CLASS[record.status]}`}>
            {STATUS_LABEL[record.status]}
        </span>
    );
}

function AxisLine({ record }: { record: OperationOpportunityRecordView }) {
    const required = record.required_axes_total != null
        ? `${record.required_axes_green ?? 0}/${record.required_axes_total} required`
        : null;
    const optional = record.optional_axes_total != null
        ? `${record.optional_axes_green ?? 0}/${record.optional_axes_total} optional`
        : null;
    if (!required && !optional) return null;
    return (
        <div className="text-[10px] text-text-muted tabular-nums">
            {[required, optional].filter(Boolean).join(' | ')}
        </div>
    );
}

function OpportunityRecordCard({ record }: { record: OperationOpportunityRecordView }) {
    const outcome = record.exit_class ? EXIT_LABEL[record.exit_class] : null;
    const objectiveLine = record.objectives_targeted != null
        ? `${record.objectives_captured ?? 0}/${record.objectives_targeted} objectives`
        : null;
    const gradeLine = record.grade_stars != null
        ? `${record.grade_stars}/5${record.grade_verdict ? ` ${record.grade_verdict}` : ''}`
        : null;

    return (
        <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-[12px] font-bold text-text-primary truncate">
                        {record.display_name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-text-secondary">
                        {record.faction && <span>{getPlayerSafeMilitaryFactionName(record.faction)}</span>}
                        {record.response_turn != null && <span>{turnToDateString(record.response_turn)}</span>}
                        {record.executed_op_aar_id && <span>AAR linked</span>}
                    </div>
                </div>
                <RecordBadge record={record} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                {outcome && (
                    <div>
                        <div className="uppercase tracking-[0.12em] text-text-muted">Outcome</div>
                        <div className={`font-bold ${EXIT_CLASS[record.exit_class!]}`}>{outcome}</div>
                    </div>
                )}
                {objectiveLine && (
                    <div>
                        <div className="uppercase tracking-[0.12em] text-text-muted">Objectives</div>
                        <div className="font-bold text-text-primary">{objectiveLine}</div>
                    </div>
                )}
                {typeof record.total_attacks === 'number' && (
                    <div>
                        <div className="uppercase tracking-[0.12em] text-text-muted">Attacks</div>
                        <div className="font-bold text-text-primary tabular-nums">{record.total_attacks}</div>
                    </div>
                )}
                {gradeLine && (
                    <div>
                        <div className="uppercase tracking-[0.12em] text-text-muted">Grade</div>
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

export function OpportunityLedgerPanel() {
    const records = useGameStore((s) => s.loadedGameState?.operationOpportunityRecords);
    const summary = useGameStore((s) => s.loadedGameState?.operationOpportunitySummary);

    const rows = useMemo(() => records ?? [], [records]);

    if (rows.length === 0) {
        return (
            <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-4 text-[11px] text-text-secondary">
                No operation opportunities recorded for this headquarters.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {summary && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-2">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Pending</div>
                        <div className="text-[16px] font-bold text-amber-300 tabular-nums">{summary.pendingCount}</div>
                    </div>
                    <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-2">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Completed</div>
                        <div className="text-[16px] font-bold text-text-primary tabular-nums">{summary.completedCount}</div>
                    </div>
                    <div className="border border-panel-border/50 rounded bg-panel-card/50 px-3 py-2">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Successes</div>
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
