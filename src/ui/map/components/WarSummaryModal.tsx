/**
 * War Summary Modal (Phase 5 — Task 5).
 * Shows territory, military strength, casualties, and displacement at a glance.
 */
import { useEffect, useState } from 'react';
import osidAreas from '../../../../data/derived/operational/osid_areas.json';
import type { SummaryFocusSection } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { formatTurnLabel } from '../utils/formatters';
import { getFactionFlag } from '../utils/factionAssets';
import { SituationTab } from './SituationTab';

const FACTION_LABEL: Record<string, string> = {
    RS: 'RS',
    RBiH: 'RBiH',
    HRHB: 'HRHB',
};

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;
const SUMMARY_SECTIONS: Array<[SummaryFocusSection, string]> = [
    ['overview', 'Overview'],
    ['ivp', 'IVP'],
    ['convoys', 'Convoys'],
    ['casualties', 'Casualties'],
    ['support', 'Support'],
    ['opsec', 'OPSEC'],
];
type FactionKey = typeof FACTIONS[number];

const FACTION_COLOR: Record<FactionKey, string> = {
    RS: '#c04040',
    RBiH: '#4a9a55',
    HRHB: '#4080b8',
};

function fmtK(n: number): string {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(Math.round(n));
}

function fmtPct(n: number): string {
    return `${n.toFixed(1)}%`;
}

interface WarSummaryModalProps {
    isOpen: boolean;
    focusSection?: SummaryFocusSection;
    onClose: () => void;
}

export function WarSummaryModal({ isOpen, focusSection = 'overview', onClose }: WarSummaryModalProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const [activeSection, setActiveSection] = useState<SummaryFocusSection>(focusSection);

    useEffect(() => {
        setActiveSection(focusSection);
    }, [focusSection, isOpen]);

    if (!isOpen || !loadedGameState) return null;

    const { label, formations, controlBySettlement, casualtyLedger, displacementByMun, departedByOsid } = loadedGameState;

    // Territory: area-weighted percentage per faction
    const areaByFaction: Record<string, number> = {};
    let totalArea = 0;
    const areasMap = (osidAreas as { total_area_km2: number; areas: Record<string, number> }).areas;
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

    // Military: personnel and casualties per faction
    const personnelByFaction: Record<string, number> = {};
    for (const f of formations) {
        if (f.status === 'destroyed' || f.personnel == null) continue;
        personnelByFaction[f.faction] = (personnelByFaction[f.faction] ?? 0) + f.personnel;
    }

    // Displacement: total + per faction (departed)
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
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.55)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'rgba(26, 24, 21, 0.97)',
                    border: '1px solid rgba(180, 160, 130, 0.22)',
                    borderRadius: 8,
                    padding: '24px 28px',
                    minWidth: 420,
                    maxWidth: 520,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    color: '#d5c9bc',
                    fontFamily: 'inherit',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#c4a35a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            War Summary
                        </div>
                        <div style={{ fontSize: 11, color: '#8a7d70', marginTop: 2 }}>
                            {formatTurnLabel(label)}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#8a7d70', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {SUMMARY_SECTIONS.map(([section, label]) => {
                        const active = activeSection === section;
                        return (
                            <button
                                key={section}
                                type="button"
                                onClick={() => setActiveSection(section)}
                                style={{
                                    background: active ? 'rgba(196, 163, 90, 0.18)' : 'rgba(42, 39, 35, 0.9)',
                                    border: active ? '1px solid rgba(196, 163, 90, 0.45)' : '1px solid rgba(180, 160, 130, 0.18)',
                                    borderRadius: 4,
                                    color: active ? '#c4a35a' : '#a89b8d',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    letterSpacing: '0.08em',
                                    padding: '6px 10px',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {activeSection === 'overview' ? (
                    <>
                        <Section title="Territory">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Faction</th>
                                        {FACTIONS.map((f) => (
                                            <th key={f} style={{ ...thStyle, color: FACTION_COLOR[f] }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                                    {getFactionFlag(f) && (
                                                        <img src={getFactionFlag(f)} alt="" style={{ width: 14, height: 10, objectFit: 'cover', borderRadius: 1 }} />
                                                    )}
                                                    {FACTION_LABEL[f]}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={tdLabelStyle}>Area-weighted</td>
                                        {FACTIONS.map((f) => (
                                            <td key={f} style={tdStyle}>{fmtPct(areaPct[f])}</td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </Section>

                        <Section title="Military Strength">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle} />
                                        {FACTIONS.map((f) => (
                                            <th key={f} style={{ ...thStyle, color: FACTION_COLOR[f] }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                                    {getFactionFlag(f) && (
                                                        <img src={getFactionFlag(f)} alt="" style={{ width: 14, height: 10, objectFit: 'cover', borderRadius: 1 }} />
                                                    )}
                                                    {FACTION_LABEL[f]}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={tdLabelStyle}>Personnel</td>
                                        {FACTIONS.map((f) => (
                                            <td key={f} style={tdStyle}>{fmtK(personnelByFaction[f] ?? 0)}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={tdLabelStyle}>KIA</td>
                                        {FACTIONS.map((f) => (
                                            <td key={f} style={tdStyle}>{fmtK(casualtyLedger?.[f]?.killed ?? 0)}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={tdLabelStyle}>WIA</td>
                                        {FACTIONS.map((f) => (
                                            <td key={f} style={tdStyle}>{fmtK(casualtyLedger?.[f]?.wounded ?? 0)}</td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </Section>

                        <Section title="Displacement">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 12 }}>
                                <div>
                                    <span style={{ color: '#8a7d70' }}>Total displaced: </span>
                                    <span style={{ color: '#d5c9bc', fontVariantNumeric: 'tabular-nums' }}>{fmtK(totalDisplaced)}</span>
                                </div>
                                {FACTIONS.map((f) => {
                                    const n = displacedByFaction[f] ?? 0;
                                    if (n === 0) return null;
                                    return (
                                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {getFactionFlag(f) && (
                                                <img src={getFactionFlag(f)} alt="" style={{ width: 12, height: 8, objectFit: 'cover', borderRadius: 1 }} />
                                            )}
                                            <span style={{ color: FACTION_COLOR[f] }}>{FACTION_LABEL[f]}: </span>
                                            <span style={{ color: '#d5c9bc', fontVariantNumeric: 'tabular-nums' }}>{fmtK(n)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    </>
                ) : (
                    <div style={{ maxHeight: '24rem', overflow: 'auto', marginBottom: 16, paddingRight: 4 }}>
                        <SituationTab state={loadedGameState} focusSection={activeSection} />
                    </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: 20, textAlign: 'right' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(196, 163, 90, 0.12)',
                            border: '1px solid rgba(196, 163, 90, 0.3)',
                            borderRadius: 4,
                            color: '#c4a35a',
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: '6px 16px',
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div >
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#8a7d70', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, borderBottom: '1px solid rgba(180, 160, 130, 0.14)', paddingBottom: 4 }}>
                {title}
            </div>
            {children}
        </div>
    );
}

const thStyle: React.CSSProperties = {
    fontSize: 10,
    color: '#8a7d70',
    fontWeight: 600,
    textAlign: 'right',
    padding: '2px 8px 4px',
};

const tdStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#d5c9bc',
    textAlign: 'right',
    padding: '2px 8px',
    fontVariantNumeric: 'tabular-nums',
};

const tdLabelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#8a7d70',
    padding: '2px 0',
};
