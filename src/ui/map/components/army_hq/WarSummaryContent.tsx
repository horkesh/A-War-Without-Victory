/**
 * War Summary content — extracted from WarSummaryModal for inline rendering
 * inside Army HQ SUMMARY tab. Same data, no modal wrapper.
 */
import { useState } from 'react';
import osidAreas from '../../../../../data/derived/operational/osid_areas.json';
import type { SummaryFocusSection } from '../../data/types';
import { useGameStore } from '../../store/gameStore';
import { formatTurnLabel } from '../../utils/formatters';
import { getFactionFlag } from '../../utils/factionAssets';
import { SituationTab } from '../SituationTab';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;
type FactionKey = typeof FACTIONS[number];

const FACTION_LABEL: Record<string, string> = { RS: 'RS', RBiH: 'RBiH', HRHB: 'HRHB' };
const FACTION_COLOR: Record<FactionKey, string> = { RS: '#c04040', RBiH: '#4a9a55', HRHB: '#4080b8' };

const SUMMARY_SECTIONS: Array<[SummaryFocusSection, string]> = [
    ['overview', 'Overview'],
    ['ivp', 'IVP'],
    ['convoys', 'Convoys'],
    ['casualties', 'Casualties'],
    ['support', 'Support'],
    ['opsec', 'OPSEC'],
    ['capital', 'Capital'],
];

function fmtK(n: number): string {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(Math.round(n));
}

function fmtPct(n: number): string {
    return `${n.toFixed(1)}%`;
}

export function WarSummaryContent() {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const [activeSection, setActiveSection] = useState<SummaryFocusSection>('overview');

    if (!loadedGameState) return <div className="text-text-secondary italic text-[12px] py-8 text-center">No game state loaded</div>;

    const { label, formations, controlBySettlement, casualtyLedger, civilianCasualties, displacementByMun, departedByOsid } = loadedGameState;

    // Territory: area-weighted percentage per faction
    const areasMap = (osidAreas as { total_area_km2: number; areas: Record<string, number> }).areas;
    const areaByFaction: Record<string, number> = {};
    let totalArea = 0;
    for (const [osid, controller] of Object.entries(controlBySettlement)) {
        if (!controller) continue;
        const area = areasMap[osid] ?? 0;
        areaByFaction[controller] = (areaByFaction[controller] ?? 0) + area;
        totalArea += area;
    }
    const areaPct: Record<string, number> = {};
    for (const f of FACTIONS) {
        areaPct[f] = totalArea > 0 ? ((areaByFaction[f] ?? 0) / totalArea) * 100 : 0;
    }

    // Military: personnel and casualties
    const personnelByFaction: Record<string, number> = {};
    for (const f of formations) {
        if (f.status === 'destroyed' || f.personnel == null) continue;
        personnelByFaction[f.faction] = (personnelByFaction[f.faction] ?? 0) + f.personnel;
    }

    // Displacement
    let totalDisplaced = 0;
    const displacedByFaction: Record<string, number> = {};
    if (departedByOsid) {
        for (const factionCounts of Object.values(departedByOsid)) {
            for (const [faction, count] of Object.entries(factionCounts)) {
                if (typeof count === 'number') {
                    displacedByFaction[faction] = (displacedByFaction[faction] ?? 0) + count;
                    totalDisplaced += count;
                }
            }
        }
    } else if (displacementByMun) {
        for (const mun of Object.values(displacementByMun)) {
            totalDisplaced += mun.displacedOut ?? 0;
        }
    }

    return (
        <div className="max-w-[560px]">
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
                <div className="space-y-4">
                    <SummarySection title="Territory">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-[10px] text-text-secondary font-semibold text-left py-1">Faction</th>
                                    {FACTIONS.map((f) => (
                                        <th key={f} className="text-[10px] font-semibold text-right px-2 py-1" style={{ color: FACTION_COLOR[f] }}>
                                            <div className="flex flex-col items-end gap-0.5">
                                                {getFactionFlag(f) && <img src={getFactionFlag(f)} alt="" className="w-3.5 h-2.5 object-cover rounded-[1px]" />}
                                                {FACTION_LABEL[f]}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-[11px] text-text-secondary py-0.5">Area-weighted</td>
                                    {FACTIONS.map((f) => (
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
                                    {FACTIONS.map((f) => (
                                        <th key={f} className="text-[10px] font-semibold text-right px-2 py-1" style={{ color: FACTION_COLOR[f] }}>
                                            {FACTION_LABEL[f]}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-[11px] text-text-secondary py-0.5">Personnel</td>
                                    {FACTIONS.map((f) => (
                                        <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{fmtK(personnelByFaction[f] ?? 0)}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="text-[11px] text-text-secondary py-0.5">KIA</td>
                                    {FACTIONS.map((f) => (
                                        <td key={f} className="text-[12px] text-text-primary text-right px-2 py-0.5 tabular-nums">{fmtK(casualtyLedger?.[f]?.killed ?? 0)}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="text-[11px] text-text-secondary py-0.5">WIA</td>
                                    {FACTIONS.map((f) => (
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
                            {FACTIONS.map((f) => {
                                const n = displacedByFaction[f] ?? 0;
                                if (n === 0) return null;
                                return (
                                    <div key={f} className="flex items-center gap-1">
                                        {getFactionFlag(f) && <img src={getFactionFlag(f)} alt="" className="w-3 h-2 object-cover rounded-[1px]" />}
                                        <span style={{ color: FACTION_COLOR[f] }}>{FACTION_LABEL[f]}: </span>
                                        <span className="text-text-primary tabular-nums">{fmtK(n)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </SummarySection>

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
                <div className="max-h-[24rem] overflow-auto pr-1">
                    <SituationTab state={loadedGameState} focusSection={activeSection} />
                </div>
            )}
        </div>
    );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-[9px] text-text-secondary uppercase tracking-[0.1em] mb-1.5 pb-1 border-b border-panel-border">
                {title}
            </div>
            {children}
        </div>
    );
}
