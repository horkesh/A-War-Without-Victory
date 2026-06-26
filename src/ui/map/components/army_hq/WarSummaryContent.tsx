/**
 * War Summary content — extracted from WarSummaryModal for inline rendering
 * inside Army HQ SUMMARY tab. Same data, no modal wrapper.
 */
import { useEffect, useMemo, useState } from 'react';
import type { SummaryFocusSection } from '../../data/types';
import { useGameStore } from '../../store/gameStore';
import { formatPersonnel, formatTurnLabel, fmtK, fmtPct } from '../../utils/formatters';
import { getFactionFlag } from '../../utils/factionAssets';
import { FACTION_HEX_COLORS, FACTION_SHORT_LABELS } from '../../utils/theme';
import { getPlayerSafeMilitaryFactionName } from '../../utils/playerSafeText';
import { SituationTab } from '../SituationTab';
import { buildWarSummaryOverviewModel, WAR_SUMMARY_FACTIONS } from './warSummaryOverview';
import { buildTurnAftermathCampaignCost, type TurnAftermathCostSeverity } from '../../data/turnAftermath';
import { t, type MessageKey } from '../../i18n';
import { localizedOperationalSitrepCopy } from '../../utils/operationalSitrepCopy';

const SUMMARY_SECTIONS: Array<[SummaryFocusSection, MessageKey]> = [
    ['overview', 'warSummary.tab.overview'],
    ['ivp', 'warSummary.tab.ivp'],
    ['convoys', 'warSummary.tab.convoys'],
    ['casualties', 'warSummary.tab.casualties'],
    ['support', 'warSummary.tab.support'],
    ['opsec', 'warSummary.tab.opsec'],
    ['capital', 'warSummary.tab.capital'],
];

const CAMPAIGN_COST_SEVERITY_LABEL_KEYS = {
    low: 'turnAftermath.severity.low',
    moderate: 'turnAftermath.severity.moderate',
    severe: 'turnAftermath.severity.severe',
    critical: 'turnAftermath.severity.critical',
} satisfies Record<TurnAftermathCostSeverity, MessageKey>;

function campaignCostSeverityLabel(severity: TurnAftermathCostSeverity): string {
    return t(CAMPAIGN_COST_SEVERITY_LABEL_KEYS[severity]);
}

function reportedK(value: number | undefined, reported: boolean): string {
    return reported ? fmtK(value ?? 0) : t('corpsFront.unreported');
}

interface WarSummaryContentProps {
    focusSection?: SummaryFocusSection;
}

export function WarSummaryContent({ focusSection = 'overview' }: WarSummaryContentProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const [activeSection, setActiveSection] = useState<SummaryFocusSection>(focusSection);

    useEffect(() => {
        setActiveSection(focusSection);
    }, [focusSection]);

    if (!loadedGameState) return <div className="text-text-secondary italic text-[12px] py-8 text-center">{t('warSummary.noState')}</div>;

    const { label, casualtyLedger, civilianCasualties } = loadedGameState;

    const data = useMemo(() => buildWarSummaryOverviewModel(loadedGameState), [loadedGameState]);
    const campaignCost = useMemo(() => buildTurnAftermathCampaignCost({ state: loadedGameState }), [loadedGameState]);
    const sitrep = loadedGameState.operationalSitrep;

    const {
        playerFaction,
        areaPct,
        atArmsByFaction,
        mobilizedPoolByFaction,
        mobilizedTotalByFaction,
        totalDisplaced,
        displacedByFaction,
        totalDisplacedReported,
        displacedByFactionReported,
        warExhaustionByFaction,
    } = data;
    const casualtyLedgerReported = casualtyLedger != null;

    // Cluster C — campaign drag handoff. WarSummary summarises + routes;
    // canonical per-corps explanation lives in Army HQ → Command Relationship.
    const playerWarExhaustion = playerFaction ? warExhaustionByFaction[playerFaction] : undefined;
    const hasElevatedWarExhaustion = typeof playerWarExhaustion === 'number' && playerWarExhaustion >= 500;

    return (
        <div className="w-full max-w-[1100px]">
            {/* Header */}
            <div className="mb-4">
                <div className="text-[13px] font-bold text-amber-400 tracking-[0.08em] uppercase">
                    {t('warSummary.title')}
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">
                    {formatTurnLabel(label)}
                </div>
            </div>

            {/* Sub-section tabs */}
            <div className="flex gap-1.5 flex-wrap mb-4">
                {SUMMARY_SECTIONS.map(([section, sectionLabelKey]) => (
                    <button
                        key={section}
                        type="button"
                        onClick={() => setActiveSection(section)}
                        className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] rounded-md border transition-all ${
                            activeSection === section
                                ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                                : 'bg-panel-card border-panel-border text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                    >
                        {t(sectionLabelKey)}
                    </button>
                ))}
            </div>

            {activeSection === 'overview' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {playerFaction ? (
                        <>
                            <SummarySection title={t('warSummary.section.territory')}>
                                <PlayerFactionHeader faction={playerFaction} />
                                <div className="mt-2 space-y-1 text-[12px]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">{t('warSummary.label.friendlyControl')}</span>
                                        <span className="text-text-primary tabular-nums">{fmtPct(areaPct[playerFaction] ?? 0)}</span>
                                    </div>
                                    <div className="text-[10px] text-text-secondary leading-snug">
                                        {t('warSummary.note.enemyControl')}
                                    </div>
                                </div>
                            </SummarySection>

                            <SummarySection title={t('warSummary.section.militaryStrength')}>
                                <PlayerFactionHeader faction={playerFaction} />
                                <div className="mt-2 space-y-1 text-[12px]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">{t('warSummary.label.personnelAtArms')}</span>
                                        <span className="text-text-primary tabular-nums">{formatPersonnel(atArmsByFaction[playerFaction] ?? 0)}</span>
                                    </div>
                                    {(mobilizedPoolByFaction[playerFaction] ?? 0) > 0 && (
                                        <>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-text-secondary">{t('warSummary.label.mobilizedPool')}</span>
                                                <span className="text-text-primary tabular-nums">{formatPersonnel(mobilizedPoolByFaction[playerFaction] ?? 0)}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-text-secondary">{t('warSummary.label.mobilizedTotal')}</span>
                                                <span className="text-text-primary tabular-nums">{formatPersonnel(mobilizedTotalByFaction[playerFaction] ?? 0)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">{t('warSummary.label.kia')}</span>
                                        <span className="text-text-primary tabular-nums">{reportedK(casualtyLedger?.[playerFaction]?.killed, casualtyLedgerReported)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">{t('warSummary.label.wia')}</span>
                                        <span className="text-text-primary tabular-nums">{reportedK(casualtyLedger?.[playerFaction]?.wounded, casualtyLedgerReported)}</span>
                                    </div>
                                </div>
                            </SummarySection>

                            <SummarySection title={t('warSummary.section.displacement')}>
                                <div className="space-y-1 text-[12px]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">{t('warSummary.label.theaterDisplaced')}</span>
                                        <span className="text-text-primary tabular-nums">{reportedK(totalDisplaced, totalDisplacedReported)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">{t('warSummary.label.ownDisplaced')}</span>
                                        <span className="text-text-primary tabular-nums">{reportedK(displacedByFaction[playerFaction], displacedByFactionReported)}</span>
                                    </div>
                                    <div className="text-[10px] text-text-secondary leading-snug">
                                        {t('warSummary.note.enemyDisplacement')}
                                    </div>
                                </div>
                            </SummarySection>

                            {campaignCost.recordCount > 0 && (
                                <SummarySection title={t('warSummary.section.campaignCost')}>
                                    <div className="space-y-1 text-[12px]" data-testid="war-summary-campaign-cost">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">{t('warSummary.label.severity')}</span>
                                            <span className="text-text-primary uppercase tabular-nums">{campaignCostSeverityLabel(campaignCost.severity)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">{t('warSummary.label.friendlyCasualties')}</span>
                                            <span className="text-text-primary tabular-nums">{fmtK(campaignCost.totalFriendlyMilitaryCasualties)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">{t('warSummary.label.displaced')}</span>
                                            <span className="text-text-primary tabular-nums">{fmtK(campaignCost.totalDisplaced)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">{t('warSummary.label.netOsids')}</span>
                                            <span className="text-text-primary tabular-nums">{campaignCost.netFriendlyTerritory >= 0 ? '+' : ''}{campaignCost.netFriendlyTerritory}</span>
                                        </div>
                                    </div>
                                </SummarySection>
                            )}

                            {hasElevatedWarExhaustion && (
                                <SummarySection title={t('warSummary.section.campaignDrag')}>
                                    <div className="space-y-1 text-[12px]" data-testid="war-summary-campaign-drag">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">{t('warSummary.label.warExhaustion')}</span>
                                            <span className="text-text-primary tabular-nums">{Math.round(playerWarExhaustion!)}</span>
                                        </div>
                                        <div className="text-[10px] text-text-secondary leading-snug">
                                            {t('warSummary.note.commandStrain')}
                                        </div>
                                    </div>
                                </SummarySection>
                            )}

                            {sitrep && (
                                <SummarySection title={t('warSummary.section.operationalSitrep')}>
                                    <div className="space-y-1 text-[12px]">
                                        <div className="text-text-secondary leading-snug">{localizedOperationalSitrepCopy(sitrep.headlineToken, sitrep.headline)}</div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">{t('warSummary.label.fronts')}</span>
                                            <span className="text-text-primary tabular-nums">{t('warSummary.value.fronts', { engaged: sitrep.front.engagedCount, exposed: sitrep.front.exposedCount })}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">{t('warSummary.label.sustainment')}</span>
                                            <span className="text-text-primary tabular-nums">{t('warSummary.value.sustainment', { critical: sitrep.sustainment.criticalCount, strained: sitrep.sustainment.strainedCount })}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">{t('warSummary.label.activeOperations')}</span>
                                            <span className="text-text-primary tabular-nums">{sitrep.operations.activeCount}</span>
                                        </div>
                                        {sitrep.alerts.length > 0 && (
                                            <div className="text-[10px] text-text-secondary leading-snug">
                                                {sitrep.alerts.slice(0, 2).map((alert) => localizedOperationalSitrepCopy(alert.textToken, alert.text)).join(' ')}
                                            </div>
                                        )}
                                    </div>
                                </SummarySection>
                            )}
                        </>
                    ) : (
                        <>
                            <SummarySection title={t('warSummary.section.territory')}>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="text-[10px] text-text-secondary font-semibold text-left py-1">{t('warSummary.label.faction')}</th>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <th key={f} className="text-[10px] font-semibold text-right px-2 py-1" style={{ color: FACTION_HEX_COLORS[f] }}>
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        {getFactionFlag(f) && <img src={getFactionFlag(f)} alt="" className="w-3.5 h-2.5 object-cover rounded-[1px]" />}
                                                        {FACTION_SHORT_LABELS[f]}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="text-[11px] text-text-secondary py-0.5">{t('warSummary.label.areaWeighted')}</td>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{fmtPct(areaPct[f])}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </SummarySection>

                            <SummarySection title={t('warSummary.section.militaryStrength')}>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="text-[10px] text-text-secondary font-semibold text-left py-1" />
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <th key={f} className="text-[10px] font-semibold text-right px-2 py-1" style={{ color: FACTION_HEX_COLORS[f] }}>
                                                    {FACTION_SHORT_LABELS[f]}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="text-[11px] text-text-secondary py-0.5">{t('warSummary.label.atArms')}</td>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{formatPersonnel(atArmsByFaction[f] ?? 0)}</td>
                                            ))}
                                        </tr>
                                        {WAR_SUMMARY_FACTIONS.some((f) => (mobilizedPoolByFaction[f] ?? 0) > 0) && (
                                            <>
                                                <tr>
                                                    <td className="text-[11px] text-text-secondary py-0.5">{t('warSummary.label.mobilizedPool')}</td>
                                                    {WAR_SUMMARY_FACTIONS.map((f) => (
                                                        <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{formatPersonnel(mobilizedPoolByFaction[f] ?? 0)}</td>
                                                    ))}
                                                </tr>
                                                <tr>
                                                    <td className="text-[11px] text-text-secondary py-0.5">{t('warSummary.label.mobilizedTotal')}</td>
                                                    {WAR_SUMMARY_FACTIONS.map((f) => (
                                                        <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{formatPersonnel(mobilizedTotalByFaction[f] ?? atArmsByFaction[f] ?? 0)}</td>
                                                    ))}
                                                </tr>
                                            </>
                                        )}
                                        <tr>
                                            <td className="text-[11px] text-text-secondary py-0.5">{t('warSummary.label.kia')}</td>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{reportedK(casualtyLedger?.[f]?.killed, casualtyLedgerReported)}</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="text-[11px] text-text-secondary py-0.5">{t('warSummary.label.wia')}</td>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{reportedK(casualtyLedger?.[f]?.wounded, casualtyLedgerReported)}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </SummarySection>

                            <SummarySection title={t('warSummary.section.displacement')}>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                                    <div>
                                        <span className="text-text-secondary">{t('warSummary.label.totalDisplaced')} </span>
                                        <span className="text-text-primary tabular-nums">{reportedK(totalDisplaced, totalDisplacedReported)}</span>
                                    </div>
                                    {WAR_SUMMARY_FACTIONS.map((f) => {
                                        const n = displacedByFaction[f] ?? 0;
                                        if (!displacedByFactionReported) return null;
                                        if (n === 0) return null;
                                        return (
                                            <div key={f} className="flex items-center gap-1">
                                                {getFactionFlag(f) && <img src={getFactionFlag(f)} alt="" className="w-3 h-2 object-cover rounded-[1px]" />}
                                                <span style={{ color: FACTION_HEX_COLORS[f] }}>{FACTION_SHORT_LABELS[f]}: </span>
                                                <span className="text-text-primary tabular-nums">{fmtK(n)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SummarySection>
                        </>
                    )}

                    {civilianCasualties && Object.keys(civilianCasualties).length > 0 && (() => {
                        let totalKilled = 0;
                        let totalFled = 0;
                        for (const entry of Object.values(civilianCasualties)) {
                            totalKilled += entry.killed ?? 0;
                            totalFled += entry.fled_abroad ?? 0;
                        }
                        return (
                            <SummarySection title={t('warSummary.section.civilianImpact')}>
                                <div className="flex gap-6 text-[12px]">
                                    <div>
                                        <span className="text-text-secondary">{t('warSummary.label.civilianKilled')} </span>
                                        <span className="text-red-400 font-semibold tabular-nums">{fmtK(totalKilled)}</span>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary">{t('warSummary.label.fledAbroad')} </span>
                                        <span className="text-text-primary tabular-nums">{fmtK(totalFled)}</span>
                                    </div>
                                </div>
                            </SummarySection>
                        );
                    })()}
                </div>
            ) : (
                <div className="rounded border border-panel-border bg-panel-card p-3 max-h-[28rem] overflow-auto pr-1">
                    <SituationTab state={loadedGameState} focusSection={activeSection} />
                </div>
            )}
        </div>
    );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded border border-panel-border bg-panel-card p-3">
            <div className="text-[9px] text-text-secondary uppercase tracking-[0.1em] mb-1.5 pb-1 border-b border-panel-border">
                {title}
            </div>
            {children}
        </div>
    );
}

function PlayerFactionHeader({ faction }: { faction: (typeof WAR_SUMMARY_FACTIONS)[number] }) {
    return (
        <div className="flex items-center gap-2">
            {getFactionFlag(faction) && <img src={getFactionFlag(faction)} alt="" className="w-4 h-3 object-cover rounded-[1px]" />}
            <span className="text-[11px] font-semibold" style={{ color: FACTION_HEX_COLORS[faction] }}>
                {getPlayerSafeMilitaryFactionName(faction, FACTION_SHORT_LABELS[faction])}
            </span>
        </div>
    );
}
