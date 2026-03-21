/**
 * Shared collapsible section component for Army HQ expanded corps cards.
 * Warroom dark palette.
 */
import { useGameStore } from '../../store/gameStore';

interface CollapsibleSectionProps {
    sectionKey: string;
    title: string;
    count?: number;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function CollapsibleSection({ sectionKey, title, count, children, defaultOpen = false }: CollapsibleSectionProps) {
    const expanded = useGameStore((s) => s.armyHQExpandedSections[sectionKey] ?? defaultOpen);
    const toggle = useGameStore((s) => s.toggleArmyHQSection);

    return (
        <div className="border-t border-panel-border bg-panel-card">
            <button
                type="button"
                onClick={() => toggle(sectionKey)}
                className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-panel-bg transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400 group-hover:text-amber-300"
                        style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                        {title}
                    </span>
                    {count != null && (
                        <span className="text-[10px] font-bold text-panel-bg bg-amber-400 px-2 py-0.5 rounded tabular-nums font-mono">
                            {count}
                        </span>
                    )}
                </div>
                <span className={`text-[10px] text-text-secondary/60 transition-transform duration-200 group-hover:text-text-secondary ${expanded ? 'rotate-90' : 'rotate-0'}`}>
                    ▶
                </span>
            </button>
            {expanded && (
                <div className="px-6 pb-4 pt-2 border-t border-panel-border/50">
                    {children}
                </div>
            )}
        </div>
    );
}
