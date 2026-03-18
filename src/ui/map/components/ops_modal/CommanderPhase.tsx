/**
 * Phase 1 — Commander Selection
 * Shows corps identity card and officer selection grid.
 * Click an officer card to select and advance to Phase 2.
 */
import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { NamedOfficerView } from '../../data/types';
import {
    getArchetype,
    formatRank,
    formatPips,
    getRatingColor,
    getCompetenceLabel,
    getAggressionLabel,
    getPersonalitySummary,
} from '../../utils/officerCharacter';
import { getPreparationMaxTurns } from '../../../../sim/combat/operation_preparation';
import { toTitleCase } from '../../utils/formatters';

interface CommanderPhaseProps {
    onAdvance: () => void;
}

/** Availability status for an officer. */
function getAvailabilityStatus(
    officer: NamedOfficerView,
    targetCorpsId: string,
): { available: boolean; reason?: string } {
    if (officer.status === 'kia') return { available: false, reason: 'KIA' };
    if (officer.status === 'captured') return { available: false, reason: 'CAPTURED' };
    if (officer.status === 'retired') return { available: false, reason: 'RETIRED' };
    if (officer.rank === 'army_commander') return { available: false, reason: 'ARMY HQ' };
    if (officer.enclave_lock) return { available: false, reason: `ENCLAVE LOCKED` };
    if (officer.assigned_operation) return { available: false, reason: `ASSIGNED: Op ${officer.assigned_operation}` };
    if (officer.assigned_corps_id && officer.assigned_corps_id !== targetCorpsId && !officer.acting_commander) {
        return { available: false, reason: 'CORPS CMDR' };
    }
    return { available: true };
}

/** Regional fit. */
function getRegionalFit(officer: NamedOfficerView, targetCorpsId: string): { label: string; colorClass: string } {
    if (officer.home_corps_id === targetCorpsId) return { label: 'HOME CORPS', colorClass: 'text-green-400' };
    if (officer.compatible_corps_ids?.includes(targetCorpsId)) return { label: 'COMPATIBLE', colorClass: 'text-amber-400' };
    return { label: 'OUT OF REGION', colorClass: 'text-red-400' };
}

const FACTION_COLORS: Record<string, string> = {
    RS: '#c24040', RBiH: '#4a9a55', HRHB: '#4080b8',
};

export function CommanderPhase({ onAdvance }: CommanderPhaseProps) {
    const corpsId = useGameStore((s) => s.opsPlanningCorpsId);
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const setSelectedOfficer = useGameStore((s) => s.setOpsPlanningSelectedOfficerId);

    const { corpsName, faction, factionColor, totalPersonnel, sectorCount, corpsCommander,
            availableOfficers, unavailableOfficers } = useMemo(() => {
        if (!loadedGameState || !corpsId) return {
            corpsName: '', faction: '', factionColor: '#888', totalPersonnel: 0, sectorCount: 0,
            corpsCommander: null as NamedOfficerView | null,
            availableOfficers: [] as Array<{ officer: NamedOfficerView; fit: ReturnType<typeof getRegionalFit> }>,
            unavailableOfficers: [] as Array<{ officer: NamedOfficerView; reason: string }>,
        };

        const corpsFormation = loadedGameState.formations.find((f) => f.id === corpsId);
        const fac = corpsFormation?.faction ?? '';
        const color = FACTION_COLORS[fac] ?? '#888';
        const name = corpsFormation
            ? (corpsFormation.name === corpsFormation.id
                ? toTitleCase(corpsFormation.name.replace(/^(RS|RBiH|HRHB)_/i, ''))
                : corpsFormation.name)
            : corpsId;

        const subordinates = loadedGameState.formations.filter(
            (f) => f.corps_id === corpsId && f.kind === 'brigade' && f.status === 'active'
        );
        const totalPers = subordinates.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
        const sectors = (loadedGameState.corpsFrontSectors ?? []).filter((s) => s.corps_id === corpsId);

        // Corps commander (acting_commander for this corps)
        const cmdOfficer = (loadedGameState.namedOfficerData ?? []).find(
            (o) => o.assigned_corps_id === corpsId && o.acting_commander
        ) ?? null;

        // Available / unavailable officers
        const factionOfficers = (loadedGameState.namedOfficerData ?? []).filter((o) => o.faction === fac);
        const avail: Array<{ officer: NamedOfficerView; fit: ReturnType<typeof getRegionalFit> }> = [];
        const unavail: Array<{ officer: NamedOfficerView; reason: string }> = [];

        for (const off of factionOfficers) {
            const status = getAvailabilityStatus(off, corpsId);
            if (status.available) {
                avail.push({ officer: off, fit: getRegionalFit(off, corpsId) });
            } else {
                unavail.push({ officer: off, reason: status.reason ?? '' });
            }
        }

        // Sort available: home corps first, then by competence
        avail.sort((a, b) => {
            const aHome = a.fit.label === 'HOME CORPS' ? 0 : a.fit.label === 'COMPATIBLE' ? 1 : 2;
            const bHome = b.fit.label === 'HOME CORPS' ? 0 : b.fit.label === 'COMPATIBLE' ? 1 : 2;
            if (aHome !== bHome) return aHome - bHome;
            return b.officer.competence - a.officer.competence;
        });

        return {
            corpsName: name, faction: fac, factionColor: color, totalPersonnel: totalPers,
            sectorCount: sectors.length, corpsCommander: cmdOfficer,
            availableOfficers: avail, unavailableOfficers: unavail,
        };
    }, [loadedGameState, corpsId]);

    const handleSelectOfficer = (officerId: string) => {
        setSelectedOfficer(officerId);
        onAdvance();
    };

    return (
        <div className="absolute inset-0 z-10 flex items-end justify-center pb-8 pointer-events-none">
            {/* Corps Identity Card — bottom left */}
            <div className="pointer-events-auto absolute bottom-8 left-8 w-64
                            bg-[rgba(20,18,15,0.92)] backdrop-blur-xl rounded-lg
                            border border-[rgba(180,160,130,0.15)] p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-10 rounded-sm" style={{ backgroundColor: factionColor }} />
                    <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary">{faction}</div>
                        <div className="text-sm font-bold text-white">{corpsName}</div>
                    </div>
                </div>
                {corpsCommander && (
                    <div className="text-[10px] text-text-secondary">
                        <span className="uppercase tracking-wider">Commanding:</span>{' '}
                        <span className="text-white">{formatRank(corpsCommander.rank)} {corpsCommander.name}</span>
                    </div>
                )}
                <div className="flex gap-4 text-[10px] text-text-secondary">
                    <div>
                        <span className="text-white font-bold">{totalPersonnel.toLocaleString()}</span> personnel
                    </div>
                    <div>
                        <span className="text-white font-bold">{sectorCount}</span> sectors
                    </div>
                </div>
            </div>

            {/* Officer Selection Grid — bottom center */}
            <div className="pointer-events-auto max-w-[720px] w-full mx-auto">
                <div className="bg-[rgba(20,18,15,0.92)] backdrop-blur-xl rounded-lg
                                border border-[rgba(180,160,130,0.15)] p-4">
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-3">
                        Select Operations Commander
                    </div>

                    {/* Available officers */}
                    <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                        {availableOfficers.map(({ officer, fit }) => {
                            const prepTurns = getPreparationMaxTurns(officer.aggressiveness);
                            return (
                                <button
                                    key={officer.id}
                                    type="button"
                                    onClick={() => handleSelectOfficer(officer.id)}
                                    className="text-left p-3 rounded-md border border-[rgba(180,160,130,0.12)]
                                               bg-[rgba(40,36,30,0.6)] hover:bg-[rgba(60,54,44,0.8)]
                                               hover:border-accent-gold/40 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-text-secondary uppercase tracking-wider">
                                                {formatRank(officer.rank)}
                                            </div>
                                            <div className="text-sm font-bold text-white truncate group-hover:text-accent-gold transition-colors">
                                                {officer.name}
                                            </div>
                                        </div>
                                        <div className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${fit.colorClass} bg-white/5`}>
                                            {fit.label}
                                        </div>
                                    </div>

                                    <div className="text-[9px] text-text-secondary mt-1 italic">
                                        {getArchetype(officer)} — {getPersonalitySummary(officer.competence, officer.aggressiveness)}
                                    </div>

                                    <div className="flex gap-3 mt-2">
                                        <div className="space-y-0.5">
                                            <div className="text-[8px] uppercase tracking-wider text-text-secondary">Competence</div>
                                            <div className="text-[10px]" style={{ color: getRatingColor(officer.competence) }}>
                                                {formatPips(officer.competence)} <span className="text-text-secondary">{getCompetenceLabel(officer.competence)}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-[8px] uppercase tracking-wider text-text-secondary">Aggressiveness</div>
                                            <div className="text-[10px]" style={{ color: getRatingColor(officer.aggressiveness) }}>
                                                {formatPips(officer.aggressiveness)} <span className="text-text-secondary">{getAggressionLabel(officer.aggressiveness)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2 text-[9px]">
                                        <span className="text-text-secondary">Prep time:</span>
                                        <span className={`font-bold ${prepTurns <= 3 ? 'text-green-400' : prepTurns <= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {prepTurns} turns
                                        </span>
                                        {officer.operations_commanded != null && officer.operations_commanded > 0 && (
                                            <span className="text-text-secondary ml-auto">{officer.operations_commanded} ops commanded</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Unavailable officers (collapsed) */}
                    {unavailableOfficers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[rgba(180,160,130,0.08)]">
                            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary/50 mb-2">
                                Unavailable ({unavailableOfficers.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {unavailableOfficers.map(({ officer, reason }) => (
                                    <div key={officer.id}
                                         className="text-[9px] text-text-secondary/40 px-2 py-0.5 rounded
                                                    bg-[rgba(40,36,30,0.3)] border border-[rgba(180,160,130,0.05)]"
                                         title={reason}>
                                        <span className="line-through">{officer.name}</span>
                                        <span className="ml-1 text-[7px] uppercase">{reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
