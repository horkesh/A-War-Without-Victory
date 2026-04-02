import type { BriefingItem, BriefingTarget } from './generateBriefing';

export { generateBriefing, type BriefingItem, type BriefingTarget } from './generateBriefing';

export interface SituationBriefingProps {
    items: BriefingItem[];
    onNavigate?: (target: BriefingTarget) => void;
}

const TARGET_LABELS: Record<BriefingTarget['type'], string> = {
    corps: '→ CORPS',
    sector: '→ SECTOR',
    operation: '→ OP',
    none: '',
};

export function SituationBriefing({ items, onNavigate }: SituationBriefingProps) {
    if (items.length === 0) {
        return (
            <div className="bg-panel-card border border-panel-border rounded-lg p-4 mb-4">
                <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-2 pb-1.5 border-b border-panel-border">
                    SITUATION BRIEFING
                </div>
                <div className="text-[11px] text-text-secondary italic py-1">
                    No alerts — situation nominal
                </div>
            </div>
        );
    }

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg p-4 mb-4">
            <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-3 pb-1.5 border-b border-panel-border">
                SITUATION BRIEFING
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
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
                                {hasTarget && onNavigate && (
                                    <span className="text-amber-400/50 group-hover:text-amber-400 text-[9px] font-mono font-bold shrink-0 transition-colors">
                                        {TARGET_LABELS[item.target.type]}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
