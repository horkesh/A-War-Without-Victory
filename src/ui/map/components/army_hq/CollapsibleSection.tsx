/**
 * Shared collapsible section component for Army HQ expanded corps cards.
 * NATO Terminal Aesthetic (Option 1).
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
        <div className="border-t border-[#4af626]/20 bg-black/20">
            <button
                type="button"
                onClick={() => toggle(sectionKey)}
                className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-[#4af626]/5 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4af626]/80 group-hover:text-[#4af626]"
                        style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                        {title}
                    </span>
                    {count != null && (
                        <span className="text-[10px] font-bold text-black bg-[#4af626]/80 px-2 py-0.5 rounded tabular-nums font-mono">
                            {count}
                        </span>
                    )}
                </div>
                <span className={`text-[10px] text-[#4af626]/40 transition-transform duration-200 group-hover:text-[#4af626]/80 ${expanded ? 'rotate-90' : 'rotate-0'}`}>
                    ▶
                </span>
            </button>
            {expanded && (
                <div className="px-6 pb-4 pt-2 border-t border-[#4af626]/5">
                    {children}
                </div>
            )}
        </div>
    );
}
