
import { t } from '../i18n';

export interface AccordionHeaderProps {
    label: string;
    count?: number;
    expanded: boolean;
    onToggle: () => void;
    testId?: string;
}

export function AccordionHeader({
    label,
    count,
    expanded,
    onToggle,
    testId,
}: AccordionHeaderProps) {
    const accessibleLabel = expanded
        ? t('oob.collapseSection', { label })
        : t('oob.expandSection', { label });

    return (
        <button
            type="button"
            data-testid={testId}
            aria-expanded={expanded}
            aria-label={accessibleLabel}
            title={accessibleLabel}
            onClick={onToggle}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-panel-card border-b border-panel-border text-left hover:bg-panel-hover transition-colors shrink-0"
        >
            <span className="font-sans text-xs uppercase tracking-[0.14em] font-semibold text-accent-gold">
                {label}
            </span>
            <span className="flex items-center gap-2" aria-hidden="true">
                {count != null && (
                    <span className="text-xs text-text-secondary tabular-nums min-w-4 text-right">{count}</span>
                )}
                <span className="text-text-secondary text-xs w-3 text-right">{expanded ? '\u25BC' : '\u25B6'}</span>
            </span>
        </button>
    );
}
