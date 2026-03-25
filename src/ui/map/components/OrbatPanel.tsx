import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { LEFT_DETAIL_PANEL_STYLE } from './panelRail';
import { BrigadeRow } from './BrigadeRow';
import { FACTION_COLORS } from '../utils/theme';
import { getFormationCommander } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import type { CorpsFrontSectorView } from '../data/types';


export function OrbatPanel() {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const selectedOrbatCorpsId = useGameStore((s) => s.selectedOrbatCorpsId);
    const setSelectedOrbatCorpsId = useGameStore((s) => s.setSelectedOrbatCorpsId);
    const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
    const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
    const setTooltipTargetWithPosition = useGameStore((s) => s.setTooltipTargetWithPosition);
    const clearTooltipTarget = useGameStore((s) => s.clearTooltipTarget);

    const corps = useMemo(() => {
        if (!loadedGameState || !selectedOrbatCorpsId) return null;
        return loadedGameState.formations.find((f) => f.id === selectedOrbatCorpsId) ?? null;
    }, [loadedGameState, selectedOrbatCorpsId]);

    const brigades = useMemo(() => {
        if (!loadedGameState || !selectedOrbatCorpsId) return [];
        return loadedGameState.formations
            .filter((f) => f.kind === 'brigade' && f.corps_id === selectedOrbatCorpsId)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [loadedGameState, selectedOrbatCorpsId]);

    const commander = useMemo(() => {
        if (!loadedGameState || !corps) return null;
        return getFormationCommander(corps, loadedGameState);
    }, [loadedGameState, corps]);

    const corpsSectors: CorpsFrontSectorView[] = useMemo(() => {
        if (!loadedGameState?.corpsFrontSectors || !selectedOrbatCorpsId) return [];
        return loadedGameState.corpsFrontSectors.filter(
            (s) => s.corps_id === selectedOrbatCorpsId
        );
    }, [loadedGameState?.corpsFrontSectors, selectedOrbatCorpsId]);

    if (!corps) return null;

    const totalPersonnel = brigades.reduce((s, b) => s + (b.personnel ?? 0), 0);
    const factionClass = FACTION_COLORS[corps.faction] ?? 'text-text-primary';

    return (
        <div
            className="panel-power-on weathered-panel flex flex-col rounded-lg shadow-xl overflow-hidden paper-grain relative"
            style={{ ...LEFT_DETAIL_PANEL_STYLE, width: '24rem' }}
        >
            {/* Panel Header */}
            <div className="bg-panel-header border-b border-panel-border px-4 py-3 flex items-center justify-between shrink-0 relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-text-secondary tracking-widest font-bold">Order of Battle</span>
                    <h2 className={`text-lg font-bold uppercase tracking-tight leading-tight ${factionClass}`}>
                        {corps.name}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setSelectedOrbatCorpsId(null)}
                    className="w-8 h-8 flex items-center justify-center rounded border border-panel-border bg-panel-bg hover:bg-panel-hover text-text-secondary transition-colors"
                    title="Close Panel"
                >
                    &times;
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Commander Section */}
                {commander && (
                    <OfficerProfile officer={commander} label="Corps Commander" />
                )}

                {/* Corps Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-black/10 rounded border border-panel-border/30">
                        <div className="text-[9px] uppercase text-text-secondary font-semibold">Total Personnel</div>
                        <div className="text-sm font-mono text-text-primary">{totalPersonnel.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-black/10 rounded border border-panel-border/30">
                        <div className="text-[9px] uppercase text-text-secondary font-semibold">Brigades</div>
                        <div className="text-sm font-mono text-text-primary">{brigades.length}</div>
                    </div>
                </div>

                {/* Brigades List */}
                <div className="space-y-1">
                    <div className="text-[10px] uppercase text-text-secondary tracking-wider font-bold mb-2 pb-1 border-b border-panel-border/30">
                        Subordinate Brigades
                    </div>
                    <div className="divide-y divide-panel-border/30">
                        {brigades.map((b) => (
                            <BrigadeRow
                                key={b.id}
                                formation={b}
                                compact
                                onClick={() => setSelectedFormationId(b.id)}
                                onHoverChange={(hovered, e) => {
                                    setHoveredOsids(hovered ? (b.aorSettlementIds ?? (b.location_osid ? [b.location_osid] : [])) : []);
                                    if (hovered) {
                                        setTooltipTargetWithPosition(
                                            { type: 'formation', id: b.id },
                                            e ? { x: e.clientX, y: e.clientY } : undefined
                                        );
                                    } else {
                                        clearTooltipTarget();
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Visual Polish Footer */}
            <div className="px-4 py-2 bg-black/40 border-t border-panel-border flex justify-between items-center shrink-0">
                <span className="text-[9px] font-mono text-text-secondary uppercase">
                    {corpsSectors.length > 0
                        ? `${corpsSectors.length} sector${corpsSectors.length !== 1 ? 's' : ''}: ${corpsSectors.map((s) => s.display_name).join(', ')}`
                        : 'No active sectors'
                    }
                </span>
                <span className="text-[9px] font-mono text-accent-gold/50 uppercase">AWWV v0.6.0-TAC</span>
            </div>
        </div>
    );
}
