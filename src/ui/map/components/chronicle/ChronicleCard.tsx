import React from 'react';
import type { ChronicleEntry, ChronicleCardType } from './generateChronicleEntries.js';

const CARD_COLORS: Record<ChronicleCardType, string> = {
    combat: 'border-l-[#c04040]',
    political: 'border-l-[#c4a35a]',
    humanitarian: 'border-l-[#4080b8]',
    military: 'border-l-[#4a9a55]',
    diplomatic: 'border-l-[#8855aa]',
    narrative: 'border-l-[#d5c9bc]',
};

const CARD_LABELS: Record<ChronicleCardType, string> = {
    combat: 'COMBAT',
    political: 'POLITICAL',
    humanitarian: 'HUMANITARIAN',
    military: 'MILITARY',
    diplomatic: 'DIPLOMATIC',
    narrative: 'NARRATIVE',
};

interface ChronicleCardProps {
    entry: ChronicleEntry;
}

export const ChronicleCard = React.memo(function ChronicleCard({ entry }: ChronicleCardProps) {
    const colorClass = CARD_COLORS[entry.type];
    const label = CARD_LABELS[entry.type];

    return (
        <div className={`border-l-4 ${colorClass} bg-black/40 backdrop-blur-sm rounded-r-md px-3 py-2 ${entry.headline ? 'col-span-2' : ''}`}>
            <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60">
                    {label}
                </span>
                <span className="text-[8px] font-mono text-text-secondary opacity-40">
                    W{entry.turn}
                </span>
            </div>
            <div className={`font-mono ${entry.headline ? 'text-sm font-bold text-amber-300' : 'text-xs text-text-primary'}`}>
                {entry.title}
            </div>
            <div className="text-[10px] font-mono text-text-secondary mt-0.5 leading-tight">
                {entry.detail}
            </div>
        </div>
    );
});
