/**
 * Shared collapsible section component for Army HQ expanded corps cards.
 * Georgia serif heading, cream paper aesthetic, toggle arrow.
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
        <div className="border-t border-[#c8b898]/50">
            <button
                type="button"
                onClick={() => toggle(sectionKey)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#e8dcc4]/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#6a5a40]"
                          style={{ fontFamily: 'Georgia, serif' }}>
                        {title}
                    </span>
                    {count != null && (
                        <span className="text-[9px] font-bold text-[#8a7a60] bg-[#d8ceb8] px-1.5 py-0.5 rounded-full tabular-nums"
                              style={{ fontFamily: 'Courier New, monospace' }}>
                            {count}
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-[#8a7a60] transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                </span>
            </button>
            {expanded && (
                <div className="px-4 pb-3">
                    {children}
                </div>
            )}
        </div>
    );
}
