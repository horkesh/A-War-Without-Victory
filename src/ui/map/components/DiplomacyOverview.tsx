/**
 * Diplomacy Overview — patron pressure gauges + negotiation capital bars.
 * Rendered as a tab section in WarSummaryModal.
 */
import type { LoadedGameState } from '../data/types';

const FACTION_LABELS: Record<string, string> = {
    RBiH: 'Bosnia-Herzegovina',
    RS: 'Republika Srpska',
    HRHB: 'Herceg-Bosna',
};

const PATRON_LABELS: Record<string, string> = {
    RBiH: 'International Community',
    RS: 'Serbia (Belgrade)',
    HRHB: 'Croatia (Zagreb)',
};

const DIMENSION_LABELS: Record<string, { label: string; color: string }> = {
    military_position: { label: 'Military Position', color: '#4a6a8a' },
    humanitarian_standing: { label: 'Humanitarian Standing', color: '#c4a35a' },
    international_credibility: { label: 'Int\'l Credibility', color: '#d4a055' },
    military_effectiveness: { label: 'Military Effectiveness', color: '#3a6a4a' },
    political_cohesion: { label: 'Political Cohesion', color: '#7a5a8a' },
};

function PatronGauge({ faction, authority }: { faction: string; authority: number }) {
    const pct = Math.min(100, Math.max(0, authority));
    const level = pct >= 75 ? 'FORCES' : pct >= 50 ? 'DEMANDS' : pct >= 25 ? 'URGES' : 'RECOMMENDS';
    const color = pct >= 75 ? '#c24040' : pct >= 50 ? '#c48030' : pct >= 25 ? '#c4a030' : '#4a8a4a';

    return (
        <div className="flex items-center gap-3">
            <div className="w-24 text-[10px] text-[#6a5a40] font-bold uppercase shrink-0"
                 style={{ fontFamily: 'Courier New, monospace' }}>
                {PATRON_LABELS[faction] ?? faction}
            </div>
            <div className="flex-1 h-3 bg-[#d8d0c4] rounded overflow-hidden border border-[#c8b898]/50">
                <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div className="w-16 text-right">
                <span className="text-[10px] font-bold uppercase" style={{ color, fontFamily: 'Courier New, monospace' }}>
                    {level}
                </span>
            </div>
        </div>
    );
}

function CapitalBar({ dimension, value }: { dimension: string; value: number }) {
    const dim = DIMENSION_LABELS[dimension];
    if (!dim) return null;
    const pct = Math.min(100, Math.max(0, value));

    return (
        <div className="flex items-center gap-2">
            <div className="w-28 text-[10px] text-[#6a5a40] shrink-0" style={{ fontFamily: 'Courier New, monospace' }}>
                {dim.label}
            </div>
            <div className="flex-1 h-2.5 bg-[#d8d0c4] rounded overflow-hidden border border-[#c8b898]/50">
                <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: dim.color }} />
            </div>
            <div className="w-8 text-right text-[10px] tabular-nums text-[#2a2016]" style={{ fontFamily: 'Courier New, monospace' }}>
                {Math.round(pct)}
            </div>
        </div>
    );
}

interface DiplomacyOverviewProps {
    capital: LoadedGameState['negotiationCapital'];
    patronOverride: LoadedGameState['patronOverrideAuthority'];
    playerFaction?: string;
}

export function DiplomacyOverview({ capital, patronOverride, playerFaction }: DiplomacyOverviewProps) {
    const factions = playerFaction ? [playerFaction] : Object.keys(capital ?? {}).sort();

    return (
        <div className="space-y-5">
            {/* Patron Pressure */}
            {patronOverride && Object.keys(patronOverride).length > 0 && (
                <div>
                    <div className="text-[9px] uppercase tracking-widest text-[#8a7a60] font-bold mb-2">
                        Patron Override Authority
                    </div>
                    <div className="space-y-1.5">
                        {Object.entries(patronOverride).sort((a, b) => a[0].localeCompare(b[0])).map(([faction, auth]) => (
                            <PatronGauge key={faction} faction={faction} authority={auth} />
                        ))}
                    </div>
                </div>
            )}

            {/* Negotiation Capital */}
            {capital && factions.length > 0 && (
                <div>
                    <div className="text-[9px] uppercase tracking-widest text-[#8a7a60] font-bold mb-2">
                        Negotiation Capital
                    </div>
                    {factions.map(faction => {
                        const cap = capital[faction];
                        if (!cap) return null;
                        return (
                            <div key={faction} className="mb-3">
                                <div className="text-[11px] font-bold text-[#2a2016] mb-1.5">
                                    {FACTION_LABELS[faction] ?? faction}
                                    <span className="ml-2 text-[10px] font-normal text-[#6a5a40]">
                                        (Composite: {Math.round(cap.composite)})
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <CapitalBar dimension="military_position" value={cap.military_position} />
                                    <CapitalBar dimension="humanitarian_standing" value={cap.humanitarian_standing} />
                                    <CapitalBar dimension="international_credibility" value={cap.international_credibility} />
                                    <CapitalBar dimension="military_effectiveness" value={cap.military_effectiveness} />
                                    <CapitalBar dimension="political_cohesion" value={cap.political_cohesion} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!capital && !patronOverride && (
                <div className="text-[11px] text-[#8a7a60] italic">
                    Diplomatic intelligence not yet available.
                </div>
            )}
        </div>
    );
}
