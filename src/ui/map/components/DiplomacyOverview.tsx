/**
 * Diplomacy Overview — patron pressure gauges + negotiation capital bars.
 * Rendered as a tab section in WarSummaryModal.
 *
 * Consumes canonical strategicDimensions (6 dimensions) + negotiatingCapital (weighted composite).
 * Legacy negotiationCapital with duplicate field mappings is no longer used here.
 */
import type { LoadedGameState } from '../data/types';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';

const PATRON_LABELS: Record<string, string> = {
    RBiH: 'International Community',
    RS: 'Serbia (Belgrade)',
    HRHB: 'Croatia (Zagreb)',
};

/** Canonical dimension display — matches strategic_dimensions.ts DIMENSION_WEIGHTS keys. */
const DIMENSION_LABELS: Record<string, { label: string; color: string }> = {
    military_credibility: { label: 'Military Credibility', color: '#4a6a8a' },
    territorial_legitimacy: { label: 'Territorial Legitimacy', color: '#6a8a4a' },
    international_standing: { label: 'Int\'l Standing', color: '#c4a35a' },
    patron_confidence: { label: 'Patron Confidence', color: '#d4a055' },
    internal_cohesion: { label: 'Internal Cohesion', color: '#7a5a8a' },
    negotiating_leverage: { label: 'Negotiating Leverage', color: '#3a6a4a' },
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

function DimensionBar({ dimKey, value }: { dimKey: string; value: number }) {
    const dim = DIMENSION_LABELS[dimKey];
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
    strategicDimensions: LoadedGameState['strategicDimensions'];
    negotiatingCapital: LoadedGameState['negotiatingCapital'];
    patronOverride: LoadedGameState['patronOverrideAuthority'];
    playerFaction?: string;
}

export function DiplomacyOverview({ strategicDimensions, negotiatingCapital, patronOverride, playerFaction }: DiplomacyOverviewProps) {
    const hasDims = strategicDimensions && Object.keys(strategicDimensions).length > 0;
    const factions = playerFaction
        ? [playerFaction]
        : Object.keys(strategicDimensions ?? {}).sort();
    const dimensionsByFaction = strategicDimensions ?? {};

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

            {/* Strategic Dimensions */}
            {hasDims && factions.length > 0 && (
                <div>
                    <div className="text-[9px] uppercase tracking-widest text-[#8a7a60] font-bold mb-2">
                        Negotiation Capital
                    </div>
                    {factions.map(faction => {
                        const dims = dimensionsByFaction[faction];
                        if (!dims) return null;
                        const composite = negotiatingCapital?.[faction];
                        return (
                            <div key={faction} className="mb-3">
                                <div className="text-[11px] font-bold text-[#2a2016] mb-1.5">
                                    {getPlayerSafePoliticalFactionName(faction)}
                                    {composite != null && (
                                        <span className="ml-2 text-[10px] font-normal text-[#6a5a40]">
                                            (Composite: {Math.round(composite)})
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {Object.entries(dims).sort((a, b) => a[0].localeCompare(b[0])).map(([dimKey, dimVal]) => (
                                        <DimensionBar key={dimKey} dimKey={dimKey} value={dimVal.effective_value} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!hasDims && !patronOverride && (
                <div className="text-[11px] text-[#8a7a60] italic">
                    Diplomatic intelligence not yet available.
                </div>
            )}
        </div>
    );
}
