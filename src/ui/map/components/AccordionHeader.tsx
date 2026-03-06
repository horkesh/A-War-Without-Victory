
export interface AccordionHeaderProps {
    label: string;
    count?: number;
    expanded: boolean;
    onToggle: () => void;
}

export function AccordionHeader({
    label,
    count,
    expanded,
    onToggle,
}: AccordionHeaderProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between px-3 py-2 bg-panel-card border-b border-panel-border text-left hover:bg-panel-hover transition-colors shrink-0"
        >
            <span className="font-sans text-[11px] uppercase tracking-wide font-semibold text-accent-gold">
                {label}
            </span>
            <span className="flex items-center gap-2">
                {count != null && (
                    <span className="text-[10px] text-text-secondary tabular-nums">{count}</span>
                )}
                <span className="text-text-secondary text-[10px]">{expanded ? '\u25BC' : '\u25B6'}</span>
            </span>
        </button>
    );
}
