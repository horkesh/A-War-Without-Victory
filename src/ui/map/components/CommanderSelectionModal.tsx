/**
 * Commander Selection Modal - officer roster for assigning an operations commander.
 * Shows available officers with stats, preparation time estimates, regional fit,
 * and greyed-out unavailable officers with reasons.
 */
import { useMemo } from 'react';
import type { NamedOfficerView } from '../data/types';
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
import { findPlayerFacingOperationByKey } from '../../shared/playerVisibility';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';

interface CommanderSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (officerId: string) => void;
}

function getAvailabilityStatus(
    officer: NamedOfficerView,
    targetCorpsId: string,
    corpsNameById: Map<string, string>,
): { available: boolean; reason?: string } {
    if (officer.status === 'kia') return { available: false, reason: 'KIA' };
    if (officer.status === 'captured') return { available: false, reason: 'CAPTURED' };
    if (officer.status === 'retired') return { available: false, reason: 'RETIRED' };
    if (officer.rank === 'army_commander') return { available: false, reason: 'ARMY HQ - unavailable' };
    if (officer.enclave_lock) return { available: false, reason: 'ENCLAVE LOCKED' };
    if (officer.assigned_operation) return { available: false, reason: `ASSIGNED: ${officer.assigned_operation}` };
    if (officer.assigned_corps_id && officer.assigned_corps_id !== targetCorpsId && !officer.acting_commander) {
        return { available: false, reason: `CORPS COMMANDER - ${corpsNameById.get(officer.assigned_corps_id) ?? 'Another Corps'}` };
    }
    return { available: true };
}

function getRegionalFit(officer: NamedOfficerView, targetCorpsId: string): { label: string; color: string; penalty: string } {
    if (officer.home_corps_id === targetCorpsId) {
        return { label: 'HOME CORPS', color: 'text-green-300', penalty: 'no penalty' };
    }
    if (officer.compatible_corps_ids?.includes(targetCorpsId)) {
        return { label: 'COMPATIBLE', color: 'text-accent-gold', penalty: 'small penalty' };
    }
    return { label: 'OUT OF REGION', color: 'text-red-300', penalty: 'competence -2' };
}

export function CommanderSelectionModal({ isOpen, onClose, onSelect }: CommanderSelectionModalProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const context = useGameStore((s) => s.commanderSelectionContext);

    const { availableOfficers, unavailableOfficers, operation, corpsName } = useMemo(() => {
        if (!loadedGameState || !context) {
            return { availableOfficers: [], unavailableOfficers: [], operation: null, corpsName: 'Command' };
        }

        const { namedOfficerData } = loadedGameState;
        const op = findPlayerFacingOperationByKey(loadedGameState, `${context.corpsId}|${context.operationName}`);
        const corpsFormation = loadedGameState.formations.find((f) => f.id === context.corpsId);
        const faction = corpsFormation?.faction ?? '';
        const corpsNameById = new Map(
            loadedGameState.formations
                .filter((f) => f.kind === 'corps' || f.kind === 'corps_asset' || f.kind === 'army_hq')
                .map((f) => [f.id, f.name]),
        );

        const factionOfficers = (namedOfficerData ?? []).filter((o) => o.faction === faction);
        const avail: Array<{ officer: NamedOfficerView; fit: ReturnType<typeof getRegionalFit> }> = [];
        const unavail: Array<{ officer: NamedOfficerView; reason: string }> = [];

        for (const officer of factionOfficers) {
            const status = getAvailabilityStatus(officer, context.corpsId, corpsNameById);
            if (status.available) {
                avail.push({ officer, fit: getRegionalFit(officer, context.corpsId) });
            } else {
                unavail.push({ officer, reason: status.reason ?? 'Unavailable' });
            }
        }

        avail.sort((a, b) => {
            if (a.fit.label === 'HOME CORPS' && b.fit.label !== 'HOME CORPS') return -1;
            if (b.fit.label === 'HOME CORPS' && a.fit.label !== 'HOME CORPS') return 1;
            return b.officer.competence - a.officer.competence;
        });

        return {
            availableOfficers: avail,
            unavailableOfficers: unavail,
            operation: op,
            corpsName: corpsNameById.get(context.corpsId) ?? 'Command',
        };
    }, [loadedGameState, context]);

    if (!context) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="commander-selection-title"
            backdropClassName="bg-black/60"
            panelClassName="bg-panel-bg border-2 border-panel-border shadow-xl max-w-xl w-full max-h-[80vh] flex flex-col text-text-primary"
        >
            <>
                <div className="px-4 py-3 border-b-2 border-panel-border bg-panel-card/80">
                    <div id="commander-selection-title" className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Assign Operations Commander</div>
                    <div className="text-sm font-bold mt-0.5">
                        {operation?.name ?? context.operationName} - {corpsName}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {availableOfficers.map(({ officer, fit }) => {
                        const prepEst = getPreparationMaxTurns(officer.aggressiveness);
                        const personality = getPersonalitySummary(officer.competence, officer.aggressiveness);
                        return (
                            <button
                                key={officer.id}
                                type="button"
                                onClick={() => onSelect?.(officer.id)}
                                className="kbd-focus w-full text-left p-3 border-2 border-panel-border bg-panel-card/60 hover:border-accent-gold hover:bg-panel-card transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-bold text-[12px]">
                                            {formatRank(officer.rank)} {officer.name}
                                        </div>
                                        <div className="text-[9px] text-text-muted italic">{getArchetype(officer)}</div>
                                    </div>
                                    <span className={`text-[8px] uppercase font-bold ${fit.color}`}>
                                        {fit.label}
                                    </span>
                                </div>

                                <div className="mt-1.5 flex gap-4 text-[9px]">
                                    <span>
                                        <span className="text-text-muted">Comp </span>
                                        <span className={`font-mono ${getRatingColor(officer.competence)}`}>{formatPips(officer.competence)}</span>
                                        <span className="text-neutral-400 ml-1">{getCompetenceLabel(officer.competence)}</span>
                                    </span>
                                    <span>
                                        <span className="text-text-muted">Agg </span>
                                        <span className={`font-mono ${getRatingColor(officer.aggressiveness)}`}>{formatPips(officer.aggressiveness)}</span>
                                        <span className="text-neutral-400 ml-1">{getAggressionLabel(officer.aggressiveness)}</span>
                                    </span>
                                </div>

                                <div className="mt-1 text-[9px] text-text-muted italic">
                                    "{personality}. Est. {prepEst} turns."
                                </div>

                                {officer.casualty_vulnerability != null && officer.casualty_vulnerability > 0.5 && (
                                    <div className="mt-0.5 text-[9px] text-red-300 font-semibold">High casualty risk</div>
                                )}
                            </button>
                        );
                    })}

                    {unavailableOfficers.length > 0 && (
                        <div className="pt-2 border-t border-panel-border">
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
                        <div className="text-[10px] text-text-muted italic text-center py-8">No officers found for this faction.</div>
                    )}
                </div>

                <div className="px-4 py-3 border-t-2 border-panel-border bg-panel-card/70 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="kbd-focus px-4 py-1.5 text-[10px] uppercase font-bold bg-panel-card hover:bg-panel-border border border-panel-border transition-colors"
                    >
                        Back to Draft
                    </button>
                </div>
            </>
        </Modal>
    );
}
