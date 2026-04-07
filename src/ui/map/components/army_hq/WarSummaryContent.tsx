/**
 * War Summary content — extracted from WarSummaryModal for inline rendering
 * inside Army HQ SUMMARY tab. Same data, no modal wrapper.
 */
import { useEffect, useMemo, useState } from 'react';
import type { SummaryFocusSection } from '../../data/types';
import { useGameStore } from '../../store/gameStore';
import { formatTurnLabel, fmtK, fmtPct } from '../../utils/formatters';
import { getFactionFlag } from '../../utils/factionAssets';
import { FACTION_HEX_COLORS, FACTION_SHORT_LABELS } from '../../utils/theme';
import { getPlayerSafeMilitaryFactionName } from '../../utils/playerSafeText';
import { SituationTab } from '../SituationTab';
import { buildWarSummaryOverviewModel, WAR_SUMMARY_FACTIONS } from './warSummaryOverview';

const SUMMARY_SECTIONS: Array<[SummaryFocusSection, string]> = [
    ['overview', 'Overview'],
    ['ivp', 'IVP'],
    ['convoys', 'Convoys'],
    ['casualties', 'Casualties'],
    ['support', 'Support'],
    ['opsec', 'OPSEC'],
    ['capital', 'Capital'],
];

interface WarSummaryContentProps {
    focusSection?: SummaryFocusSection;
}

export function WarSummaryContent({ focusSection = 'overview' }: WarSummaryContentProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const [activeSection, setActiveSection] = useState<SummaryFocusSection>(focusSection);

    useEffect(() => {
        setActiveSection(focusSection);
    }, [focusSection]);

    if (!loadedGameState) return <div className="text-text-secondary italic text-[12px] py-8 text-center">No game state loaded</div>;

    const { label, casualtyLedger, civilianCasualties } = loadedGameState;

    const data = useMemo(() => buildWarSummaryOverviewModel(loadedGameState), [loadedGameState]);
    const sitrep = loadedGameState.operationalSitrep;

    const { playerFaction, areaPct, personnelByFaction, totalDisplaced, displacedByFaction } = data;

    return (
        <div className="w-full max-w-[1100px]">
            {/* Header */}
            <div className="mb-4">
                <div className="text-[13px] font-bold text-amber-400 tracking-[0.08em] uppercase">
                    War Summary
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">
                    {formatTurnLabel(label)}
                </div>
            </div>

            {/* Sub-section tabs */}
            <div className="flex gap-1.5 flex-wrap mb-4">
                {SUMMARY_SECTIONS.map(([section, sectionLabel]) => (
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
                        {sectionLabel}
                    </button>
                ))}
            </div>

            {activeSection === 'overview' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {playerFaction ? (
                        <>
                            <SummarySection title="Territory">
                                <PlayerFactionHeader faction={playerFaction} />
                                <div className="mt-2 space-y-1 text-[12px]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">Friendly control</span>
                                        <span className="text-text-primary tabular-nums">{fmtPct(areaPct[playerFaction] ?? 0)}</span>
                                    </div>
                                    <div className="text-[10px] text-text-secondary leading-snug">
                                        Enemy control is summarized through staff assessments and front reports, not exact faction-wide totals.
                                    </div>
                                </div>
                            </SummarySection>

                            <SummarySection title="Military Strength">
                                <PlayerFactionHeader faction={playerFaction} />
                                <div className="mt-2 space-y-1 text-[12px]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">Personnel</span>
                                        <span className="text-text-primary tabular-nums">{fmtK(personnelByFaction[playerFaction] ?? 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">KIA</span>
                                        <span className="text-text-primary tabular-nums">{fmtK(casualtyLedger?.[playerFaction]?.killed ?? 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">WIA</span>
                                        <span className="text-text-primary tabular-nums">{fmtK(casualtyLedger?.[playerFaction]?.wounded ?? 0)}</span>
                                    </div>
                                </div>
                            </SummarySection>

                            <SummarySection title="Displacement">
                                <div className="space-y-1 text-[12px]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">Theater-wide displaced</span>
                                        <span className="text-text-primary tabular-nums">{fmtK(totalDisplaced)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-text-secondary">Own-side displaced</span>
                                        <span className="text-text-primary tabular-nums">{fmtK(displacedByFaction[playerFaction] ?? 0)}</span>
                                    </div>
                                    <div className="text-[10px] text-text-secondary leading-snug">
                                        Enemy displacement is not broken out here as exact faction totals in player-safe mode.
                                    </div>
                                </div>
                            </SummarySection>

                            {sitrep && (
                                <SummarySection title="Operational SITREP">
                                    <div className="space-y-1 text-[12px]">
                                        <div className="text-text-secondary leading-snug">{sitrep.headline}</div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">Fronts</span>
                                            <span className="text-text-primary tabular-nums">{sitrep.front.engagedCount} engaged / {sitrep.front.exposedCount} exposed</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">Sustainment</span>
                                            <span className="text-text-primary tabular-nums">{sitrep.sustainment.criticalCount} critical / {sitrep.sustainment.strainedCount} strained</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-text-secondary">Active operations</span>
                                            <span className="text-text-primary tabular-nums">{sitrep.operations.activeCount}</span>
                                        </div>
                                        {sitrep.alerts.length > 0 && (
                                            <div className="text-[10px] text-text-secondary leading-snug">
                                                {sitrep.alerts.slice(0, 2).map((alert) => alert.text).join(' ')}
                                            </div>
                                        )}
                                    </div>
                                </SummarySection>
                            )}
                        </>
                    ) : (
                        <>
                            <SummarySection title="Territory">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="text-[10px] text-text-secondary font-semibold text-left py-1">Faction</th>
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
                                            <td className="text-[11px] text-text-secondary py-0.5">Area-weighted</td>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{fmtPct(areaPct[f])}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </SummarySection>

                            <SummarySection title="Military Strength">
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
                                            <td className="text-[11px] text-text-secondary py-0.5">Personnel</td>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{fmtK(personnelByFaction[f] ?? 0)}</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="text-[11px] text-text-secondary py-0.5">KIA</td>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{fmtK(casualtyLedger?.[f]?.killed ?? 0)}</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="text-[11px] text-text-secondary py-0.5">WIA</td>
                                            {WAR_SUMMARY_FACTIONS.map((f) => (
                                                <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{fmtK(casualtyLedger?.[f]?.wounded ?? 0)}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </SummarySection>

                            <SummarySection title="Displacement">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                                    <div>
                                        <span className="text-text-secondary">Total displaced: </span>
                                        <span className="text-text-primary tabular-nums">{fmtK(totalDisplaced)}</span>
                                    </div>
                                    {WAR_SUMMARY_FACTIONS.map((f) => {
                                        const n = displacedByFaction[f] ?? 0;
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
                            <SummarySection title="Civilian Impact">
                                <div className="flex gap-6 text-[12px]">
                                    <div>
                                        <span className="text-text-secondary">Killed: </span>
                                        <span className="text-red-400 font-semibold tabular-nums">{fmtK(totalKilled)}</span>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary">Fled abroad: </span>
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
