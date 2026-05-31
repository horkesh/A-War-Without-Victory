import React from 'react';
import type { ChronicleEntry, ChronicleCardType } from './generateChronicleEntries.js';
import { t, useLocale, type MessageKey } from '../../i18n';
import { formatHistoricalDivergenceNote } from '../../data/historicalDivergenceNotes.js';

/** Paper card accent colors — left border + category badge. */
const CARD_ACCENT: Record<ChronicleCardType, { border: string; badge: string; badgeText: string }> = {
    combat:       { border: '#c04040', badge: 'bg-red-900/40',    badgeText: 'text-red-300' },
    political:    { border: '#c4a35a', badge: 'bg-amber-900/40',  badgeText: 'text-amber-300' },
    humanitarian: { border: '#4080b8', badge: 'bg-blue-900/40',   badgeText: 'text-blue-300' },
    military:     { border: '#4a9a55', badge: 'bg-green-900/40',  badgeText: 'text-green-300' },
    diplomatic:   { border: '#8855aa', badge: 'bg-purple-900/40', badgeText: 'text-purple-300' },
    narrative:    { border: '#d5c9bc', badge: 'bg-stone-800/40',  badgeText: 'text-stone-300' },
    cost:         { border: '#d28a3a', badge: 'bg-orange-900/40', badgeText: 'text-orange-300' },
    personnel:    { border: '#75a9b8', badge: 'bg-cyan-900/35',   badgeText: 'text-cyan-200' },
    // Consequence-receipt card: somber amber/sepia — a recorded outcome of a
    // prior decision, never a celebratory achievement.
    consequence:  { border: '#b8924a', badge: 'bg-amber-900/35',  badgeText: 'text-amber-200/85' },
};

const CARD_LABEL_KEYS: Record<ChronicleCardType, MessageKey> = {
    combat: 'chronicle.card.combat',
    political: 'chronicle.card.political',
    humanitarian: 'chronicle.card.humanitarian',
    military: 'chronicle.card.military',
    personnel: 'chronicle.card.personnel',
    diplomatic: 'chronicle.card.diplomatic',
    narrative: 'chronicle.card.narrative',
    cost: 'chronicle.card.cost',
    consequence: 'chronicle.card.consequence',
};

interface ChronicleCardProps {
    entry: ChronicleEntry;
}

/**
 * Paper-textured event card. Warm sepia background, serif title for headlines,
 * monospace detail. Styled like a filed intelligence report.
 */
export const ChronicleCard = React.memo(function ChronicleCard({ entry }: ChronicleCardProps) {
    useLocale();
    const accent = CARD_ACCENT[entry.type];
    const label = entry.ghost ? t('chronicle.card.ghost') : t(CARD_LABEL_KEYS[entry.type]);
    const detail = entry.detail ? formatHistoricalDivergenceNote(entry.detail) : entry.detail;

    return (
        <div
            className="rounded-sm shadow-md overflow-hidden"
            style={{
                borderLeft: `3px solid ${accent.border}`,
                borderStyle: entry.ghost ? 'dashed' : 'solid',
                background: entry.headline
                    ? 'linear-gradient(135deg, #2a2520 0%, #1e1b18 100%)'
                    : 'linear-gradient(135deg, #222020 0%, #1a1918 100%)',
                maxWidth: '220px',
                minWidth: '160px',
            }}
        >
            <div className="px-2.5 py-2">
                {/* Category badge */}
                <span className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-[0.12em] ${accent.badge} ${accent.badgeText} mb-1`}>
                    {label}
                </span>

                {/* Title */}
                <div
                    className={
                        entry.headline
                            ? 'text-[11px] font-semibold text-amber-200/90 leading-tight'
                            : 'text-[10px] text-stone-200/80 leading-tight'
                    }
                    style={entry.headline ? { fontFamily: 'Georgia, "Times New Roman", serif' } : {}}
                >
                    {entry.title}
                </div>

                {/* Detail */}
                {detail && (
                    <div className={`text-[9px] font-mono mt-1 leading-tight ${entry.ghost ? 'text-amber-200/55 italic' : 'text-stone-400/70'}`}>
                        {detail}
                    </div>
                )}
            </div>
        </div>
    );
});
