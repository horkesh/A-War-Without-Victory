import type { CommandBriefingItemView, CommandBriefingTargetView } from '../../data/types.js';

export type BriefingItem = CommandBriefingItemView;
export type BriefingTarget = CommandBriefingTargetView;

export interface SituationBriefingProps {
    items: BriefingItem[];
    onNavigate?: (target: BriefingTarget) => void;
}

const TARGET_LABELS: Partial<Record<BriefingTarget['type'], string>> = {
    corps: '-> CORPS',
    sector: '-> SECTOR',
    operation: '-> OP',
    enclaves: '-> ENCLAVES',
    settlement: '-> MAP',
    summary: '-> SUMMARY',
    officer_events: '-> PERSONNEL',
    peace_plan: '-> PLAN',
};

/**
 * UI-4 progressive disclosure (Batch 43):
 *
 * The Army HQ BRIEFING tab's Decision Room (`PresidentialDecisionRoomPanel`)
 * already surfaces the same `commandBriefing` items as `briefing:` priority
 * cards. To cut first-paint density without removing information or moving
 * ownership, this block is wrapped in a `<details>` collapsible:
 *
 *  - Open by default when any item is `critical` (do not bury alerts).
 *  - Collapsed by default when items are warning/info only or the list is
 *    empty (low-priority context, available on click).
 *
 * All items remain in the DOM regardless of toggle state — primary
 * cards remain reachable. Decision Room remains the singular owner of
 * presidential routing; this surface stays the SitRep recap.
 */
export function SituationBriefing({ items, onNavigate }: SituationBriefingProps) {
    const criticalCount = items.filter((i) => i.severity === 'critical').length;
    const warningCount = items.filter((i) => i.severity === 'warning').length;
    const infoCount = items.length - criticalCount - warningCount;
    const defaultOpen = criticalCount > 0;
    const summaryLabel = items.length === 0
        ? 'No alerts'
        : `${items.length} item${items.length === 1 ? '' : 's'} · ${criticalCount} critical / ${warningCount} warning / ${infoCount} info`;

    return (
        <details
            data-testid="situation-briefing"
            open={defaultOpen}
            className="bg-panel-card border border-panel-border rounded-lg mb-4"
        >
            <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-2.5 border-b border-panel-border">
                <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary">
                    Situation Briefing
                </span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-text-muted tabular-nums">
                    {summaryLabel}
                </span>
            </summary>

            {items.length === 0 ? (
                <div className="px-4 py-2 text-[11px] text-text-secondary italic">
                    No alerts - situation nominal
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 px-4 py-3">
                    {items.map((item) => {
                        const dotColor =
                            item.severity === 'critical'
                                ? 'bg-red-500'
                                : item.severity === 'warning'
                                    ? 'bg-amber-400'
                                    : 'bg-sky-400';
                        const borderColor =
                            item.severity === 'critical'
                                ? 'border-red-500/30 hover:border-red-500/50'
                                : item.severity === 'warning'
                                    ? 'border-amber-500/30 hover:border-amber-500/50'
                                    : 'border-panel-border hover:border-panel-border';
                        const hasTarget = item.target.type !== 'none';
                        const targetLabel = item.actionChipLabel ?? item.target.label ?? TARGET_LABELS[item.target.type];

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => hasTarget && onNavigate?.(item.target)}
                                disabled={!hasTarget || !onNavigate}
                                className={`text-left rounded-md border ${borderColor} bg-panel-bg p-2.5 transition-colors group disabled:cursor-default`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${dotColor}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[11px] text-text-primary leading-snug font-semibold">
                                            {item.title}
                                        </div>
                                        {item.detail && (
                                            <div className="text-[10px] text-text-secondary leading-snug mt-0.5">
                                                {item.detail}
                                            </div>
                                        )}
                                    </div>
                                    {hasTarget && onNavigate && targetLabel && (
                                        <span className="text-amber-400/50 group-hover:text-amber-400 text-[9px] font-mono font-bold shrink-0 transition-colors">
                                            {targetLabel}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </details>
    );
}
