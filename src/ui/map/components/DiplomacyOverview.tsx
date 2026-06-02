/**
 * Diplomacy Overview — patron pressure gauges + negotiation capital bars.
 * Rendered as a tab section in WarSummaryModal.
 *
 * Consumes canonical strategicDimensions (6 dimensions) + negotiatingCapital (weighted composite).
 * Legacy negotiationCapital with duplicate field mappings is no longer used here.
 */
import type { LoadedGameState } from '../data/types';
import { getPlayerSafePoliticalFactionName, getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { t } from '../i18n';
import type { MessageKey } from '../i18n';

const PATRON_LABELS: Record<string, string> = {
    RBiH: 'International Community',
    RS: 'Serbia (Belgrade)',
    HRHB: 'Croatia (Zagreb)',
};

/** Band label for the weighted negotiating-capital composite (0-100 scale). */
function negotiatingCapitalBand(composite: number): string {
    if (composite >= 75) return 'Strong hand';
    if (composite >= 50) return 'Workable';
    if (composite >= 25) return 'Weak';
    return 'Marginal';
}

/** Canonical dimension display — matches strategic_dimensions.ts DIMENSION_WEIGHTS keys. */
const DIMENSION_LABELS: Record<string, { labelKey: MessageKey; color: string }> = {
    military_credibility: { labelKey: 'diplomacyOverview.dimension.military_credibility', color: '#4a6a8a' },
    territorial_legitimacy: { labelKey: 'diplomacyOverview.dimension.territorial_legitimacy', color: '#6a8a4a' },
    international_standing: { labelKey: 'diplomacyOverview.dimension.international_standing', color: '#c4a35a' },
    patron_confidence: { labelKey: 'diplomacyOverview.dimension.patron_confidence', color: '#d4a055' },
    internal_cohesion: { labelKey: 'diplomacyOverview.dimension.internal_cohesion', color: '#7a5a8a' },
    negotiating_leverage: { labelKey: 'diplomacyOverview.dimension.negotiating_leverage', color: '#3a6a4a' },
};

function PatronGauge({ faction, authority }: { faction: string; authority: number }) {
    const pct = Math.min(100, Math.max(0, authority));
    const level = pct >= 75 ? t('diplomacyOverview.patron.forces') : pct >= 50 ? t('diplomacyOverview.patron.demands') : pct >= 25 ? t('diplomacyOverview.patron.urges') : t('diplomacyOverview.patron.recommends');
    const color = pct >= 75 ? '#c24040' : pct >= 50 ? '#c48030' : pct >= 25 ? '#c4a030' : '#4a8a4a';

    return (
        <div className="flex items-center gap-3">
            <div className="w-24 text-[10px] text-[#6a5a40] font-bold uppercase shrink-0"
                 style={{ fontFamily: 'Courier New, monospace' }}>
                {PATRON_LABELS[faction] ?? getPlayerSafeMilitaryFactionName(faction)}
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
                {t(dim.labelKey)}
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
                    <div className="text-[9px] uppercase tracking-widest text-[#8a7a60] font-bold mb-2"
                         title={t('diplomacyOverview.patronOverrideAuthority.title')}>
                        {t('diplomacyOverview.patronOverrideAuthority')}
                    </div>
                    <div className="text-[9px] text-[#8a7a60] italic mb-2 -mt-1">
                        {t('diplomacyOverview.patronOverrideAuthority.subtitle')}
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
                    <div className="text-[9px] uppercase tracking-widest text-[#8a7a60] font-bold mb-2"
                         title={t('diplomacyOverview.negotiationCapital.title')}>
                        {t('diplomacyOverview.negotiationCapital')}
                    </div>
                    <div className="text-[9px] text-[#8a7a60] italic mb-2 -mt-1">
                        {t('diplomacyOverview.negotiationCapital.subtitle')}
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
                                        <span className="ml-2 text-[10px] font-normal text-[#6a5a40]"
                                              title="Weighted negotiating-capital score (0-100) across the six strategic dimensions.">
                                            {negotiatingCapitalBand(composite)} ({Math.round(composite)}/100)
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
                    {t('diplomacyOverview.notAvailable')}
                </div>
            )}
        </div>
    );
}
