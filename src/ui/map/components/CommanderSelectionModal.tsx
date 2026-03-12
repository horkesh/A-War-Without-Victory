/**
 * Commander Selection Modal — officer roster for assigning an operations commander.
 * Shows available officers with stats, preparation time estimates, regional fit,
 * and greyed-out unavailable officers with reasons.
 */
import { useMemo } from 'react';
import type { NamedOfficerView, OperationView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import {
    getArchetype,
    formatRank,
    formatPips,
    getRatingColor,
    getCompetenceLabel,
    getAggressionLabel,
    getPersonalitySummary,
} from '../utils/officerCharacter';
import { getPreparationMaxTurns } from '../../../sim/combat/operation_preparation';

interface CommanderSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Callback when an officer is selected. */
    onSelect?: (officerId: string) => void;
}

/** Availability status for an officer. */
function getAvailabilityStatus(
    officer: NamedOfficerView,
    operations: OperationView[],
    targetCorpsId: string,
): { available: boolean; reason?: string } {
    if (officer.status === 'kia') return { available: false, reason: `KIA` };
    if (officer.status === 'captured') return { available: false, reason: 'CAPTURED' };
    if (officer.status === 'retired') return { available: false, reason: 'RETIRED' };
    if (officer.rank === 'army_commander') return { available: false, reason: 'ARMY HQ — unavailable' };

    // Enclave lock
    if (officer.enclave_lock) {
        return { available: false, reason: `ENCLAVE LOCKED: ${officer.enclave_lock.enclave_id}` };
    }

    // Already commanding another operation
    if (officer.assigned_operation) {
        return { available: false, reason: `ASSIGNED: ${officer.assigned_operation}` };
    }

    // Active corps commander (can't be pulled for ops)
    if (officer.assigned_corps_id && officer.assigned_corps_id !== targetCorpsId && !officer.acting_commander) {
        return { available: false, reason: `CORPS COMMANDER — ${officer.assigned_corps_id}` };
    }

    return { available: true };
}

/** Regional fit label. */
function getRegionalFit(officer: NamedOfficerView, targetCorpsId: string): { label: string; color: string; penalty: string } {
    if (officer.home_corps_id === targetCorpsId) {
        return { label: 'HOME CORPS', color: 'text-green-600', penalty: 'no penalty' };
    }
    if (officer.compatible_corps_ids?.includes(targetCorpsId)) {
        return { label: 'COMPATIBLE', color: 'text-amber-600', penalty: 'small penalty' };
    }
    return { label: 'OUT OF REGION', color: 'text-red-600', penalty: 'competence -2' };
}

export function CommanderSelectionModal({ isOpen, onClose, onSelect }: CommanderSelectionModalProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const context = useGameStore((s) => s.commanderSelectionContext);

    const { availableOfficers, unavailableOfficers, operation } = useMemo(() => {
        if (!loadedGameState || !context) return { availableOfficers: [], unavailableOfficers: [], operation: null };

        const { namedOfficerData, operations } = loadedGameState;
        const op = operations?.find((o) => o.corps_id === context.corpsId && o.name === context.operationName) ?? null;
        const corpsFormation = loadedGameState.formations.find((f) => f.id === context.corpsId);
        const faction = corpsFormation?.faction ?? '';

        const factionOfficers = (namedOfficerData ?? []).filter((o) => o.faction === faction);
        const avail: Array<{ officer: NamedOfficerView; fit: ReturnType<typeof getRegionalFit> }> = [];
        const unavail: Array<{ officer: NamedOfficerView; reason: string }> = [];

        for (const officer of factionOfficers) {
            const status = getAvailabilityStatus(officer, operations ?? [], context.corpsId);
            if (status.available) {
                avail.push({ officer, fit: getRegionalFit(officer, context.corpsId) });
            } else {
                unavail.push({ officer, reason: status.reason ?? 'Unavailable' });
            }
        }

        // Sort available: home corps first, then by competence descending
        avail.sort((a, b) => {
            if (a.fit.label === 'HOME CORPS' && b.fit.label !== 'HOME CORPS') return -1;
            if (b.fit.label === 'HOME CORPS' && a.fit.label !== 'HOME CORPS') return 1;
            return b.officer.competence - a.officer.competence;
        });

        return { availableOfficers: avail, unavailableOfficers: unavail, operation: op };
    }, [loadedGameState, context]);

    if (!isOpen || !context) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="bg-white border-2 border-neutral-400 shadow-xl max-w-xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-100">
                    <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Assign Operations Commander</div>
                    <div className="text-sm font-bold mt-0.5">
                        {operation?.name ?? context.operationName} — {context.corpsId}
                    </div>
                </div>

                {/* Scrollable officer list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {/* Available officers */}
                    {availableOfficers.map(({ officer, fit }) => {
                        const prepEst = getPreparationMaxTurns(officer.aggressiveness);
                        const personality = getPersonalitySummary(officer.competence, officer.aggressiveness);
                        return (
                            <button
                                key={officer.id}
                                type="button"
                                onClick={() => onSelect?.(officer.id)}
                                className="kbd-focus w-full text-left p-3 border-2 border-neutral-300 hover:border-amber-500 hover:bg-amber-50 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-bold text-[12px]">
                                            {formatRank(officer.rank)} {officer.name}
                                        </div>
                                        <div className="text-[9px] text-neutral-500 italic">{getArchetype(officer)}</div>
                                    </div>
                                    <span className={`text-[8px] uppercase font-bold ${fit.color}`}>
                                        {fit.label}
                                    </span>
                                </div>

                                <div className="mt-1.5 flex gap-4 text-[9px]">
                                    <span>
                                        <span className="text-neutral-500">Comp </span>
                                        <span className={`font-mono ${getRatingColor(officer.competence)}`}>{formatPips(officer.competence)}</span>
                                        <span className="text-neutral-400 ml-1">{getCompetenceLabel(officer.competence)}</span>
                                    </span>
                                    <span>
                                        <span className="text-neutral-500">Agg </span>
                                        <span className={`font-mono ${getRatingColor(officer.aggressiveness)}`}>{formatPips(officer.aggressiveness)}</span>
                                        <span className="text-neutral-400 ml-1">{getAggressionLabel(officer.aggressiveness)}</span>
                                    </span>
                                </div>

                                <div className="mt-1 text-[9px] text-neutral-600 italic">
                                    "{personality}. Est. {prepEst} turns."
                                </div>

                                {officer.casualty_vulnerability != null && officer.casualty_vulnerability > 0.5 && (
                                    <div className="mt-0.5 text-[9px] text-red-600 font-semibold">High casualty risk</div>
                                )}
                            </button>
                        );
                    })}

                    {/* Unavailable officers — greyed out */}
                    {unavailableOfficers.length > 0 && (
                        <div className="pt-2 border-t border-neutral-200">
                            <div className="text-[8px] uppercase text-neutral-400 font-bold mb-1">Unavailable</div>
                            {unavailableOfficers.map(({ officer, reason }) => (
                                <div key={officer.id} className="px-3 py-1.5 text-neutral-400 text-[10px]">
                                    <span className="font-semibold">{formatRank(officer.rank)} {officer.name}</span>
                                    <span className="ml-2 text-[8px] uppercase">[{reason}]</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {availableOfficers.length === 0 && unavailableOfficers.length === 0 && (
                        <div className="text-[10px] text-neutral-500 italic text-center py-8">No officers found for this faction.</div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t-2 border-neutral-300 bg-neutral-50 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="kbd-focus px-4 py-1.5 text-[10px] uppercase font-bold bg-neutral-200 hover:bg-neutral-300 border border-neutral-400 transition-colors"
                    >
                        Back to Draft
                    </button>
                </div>
            </div>
        </div>
    );
}
