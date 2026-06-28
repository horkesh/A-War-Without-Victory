import type { CommandBriefingItemView, CommandBriefingTargetView } from '../../data/types.js';
import { resolveCommandBriefingItemCopy } from '../../data/commandBriefingCopy';
import { t, type MessageKey } from '../../i18n';

export type BriefingItem = CommandBriefingItemView;
export type BriefingTarget = CommandBriefingTargetView;

export interface SituationBriefingProps {
    items: BriefingItem[];
    onNavigate?: (target: BriefingTarget) => void;
}

const TARGET_LABEL_KEYS: Partial<Record<BriefingTarget['type'], MessageKey>> = {
    corps: 'situationBriefing.target.corps',
    sector: 'situationBriefing.target.sector',
    operation: 'situationBriefing.target.operation',
    enclaves: 'situationBriefing.target.enclaves',
    settlement: 'situationBriefing.target.map',
    summary: 'situationBriefing.target.summary',
    officer_events: 'situationBriefing.target.personnel',
    peace_plan: 'situationBriefing.target.plan',
};

function fallbackTargetLabel(type: BriefingTarget['type']): string | undefined {
    const key = TARGET_LABEL_KEYS[type];
    return key ? t(key) : undefined;
}

function enrichTargetWithItemContext(item: BriefingItem): BriefingTarget {
    if (item.target.type !== 'sector' || !item.corpsId || item.target.corpsId) return item.target;
    return { ...item.target, corpsId: item.corpsId };
}

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
        ? t('situationBriefing.noAlerts')
        : t('situationBriefing.summary', { count: items.length, critical: criticalCount, warning: warningCount, info: infoCount });

    return (
        <details
            data-testid="situation-briefing"
            open={defaultOpen}
            className="bg-panel-card border border-panel-border rounded-lg mb-4"
        >
            <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-2.5 border-b border-panel-border">
                <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary">
                    {t('situationBriefing.title')}
                </span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-text-muted tabular-nums">
                    {summaryLabel}
                </span>
            </summary>

            {items.length === 0 ? (
                <div className="px-4 py-2 text-[11px] text-text-secondary italic">
                    {t('situationBriefing.empty')}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 px-4 py-3">
                    {items.map((item) => {
                        const copy = resolveCommandBriefingItemCopy(item);
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
                        const target = enrichTargetWithItemContext(item);
                        const hasTarget = target.type !== 'none';
                        const targetLabel = copy.actionChipLabel ?? target.label ?? fallbackTargetLabel(target.type);
                        const disabledReason = !hasTarget
                            ? t('situationBriefing.routeUnavailable')
                            : !onNavigate
                                ? t('situationBriefing.navigationUnavailable')
                                : null;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => hasTarget && onNavigate?.(target)}
                                disabled={!hasTarget || !onNavigate}
                                title={disabledReason ?? undefined}
                                aria-label={disabledReason ? `${copy.title} - ${disabledReason}` : copy.title}
                                className={`text-left rounded-md border ${borderColor} bg-panel-bg p-2.5 transition-colors group disabled:cursor-default`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${dotColor}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[11px] text-text-primary leading-snug font-semibold">
                                            {copy.title}
                                        </div>
                                        {copy.detail && (
                                            <div className="text-[10px] text-text-secondary leading-snug mt-0.5">
                                                {copy.detail}
                                            </div>
                                        )}
                                        {disabledReason && (
                                            <div className="text-[9px] text-text-secondary/70 leading-snug mt-1">
                                                {disabledReason}
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
