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
import { t } from '../i18n';
import { getPlayerSafeOperationName } from '../utils/playerSafeText';

interface CommanderSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (officerId: string) => void;
}

function getAvailabilityStatus(
    officer: NamedOfficerView,
    targetCorpsId: string,
    corpsNameById: Map<string, string>,
    operationNameByRaw: Map<string, string>,
): { available: boolean; reason?: string } {
    if (officer.status === 'kia') return { available: false, reason: t('commanderSelect.reason.kia') };
    if (officer.status === 'captured') return { available: false, reason: t('commanderSelect.reason.captured') };
    if (officer.status === 'retired') return { available: false, reason: t('commanderSelect.reason.retired') };
    if (officer.rank === 'army_commander') return { available: false, reason: t('commanderSelect.reason.armyHq') };
    if (officer.enclave_lock) return { available: false, reason: t('commanderSelect.reason.enclaveLocked') };
    if (officer.assigned_operation) {
        const operation = operationNameByRaw.get(officer.assigned_operation)
            ?? getPlayerSafeOperationName(officer.assigned_operation, targetCorpsId);
        return { available: false, reason: t('commanderSelect.reason.assigned', { operation }) };
    }
    if (officer.assigned_corps_id && officer.assigned_corps_id !== targetCorpsId && !officer.acting_commander) {
        return { available: false, reason: t('commanderSelect.reason.corpsCommander', { corps: corpsNameById.get(officer.assigned_corps_id) ?? t('commanderSelect.anotherCorps') }) };
    }
    return { available: true };
}

function getRegionalFit(officer: NamedOfficerView, targetCorpsId: string): { label: string; color: string; penalty: string } {
    if (officer.home_corps_id === targetCorpsId) {
        return { label: t('commanderSelect.fit.homeCorps'), color: 'text-green-300', penalty: t('commanderSelect.penalty.none') };
    }
    if (officer.compatible_corps_ids?.includes(targetCorpsId)) {
        return { label: t('commanderSelect.fit.compatible'), color: 'text-amber-300', penalty: t('commanderSelect.penalty.small') };
    }
    return { label: t('commanderSelect.fit.outOfRegion'), color: 'text-red-300', penalty: t('commanderSelect.penalty.competenceMinus2') };
}

function sortableOfficerRating(value: number): number {
    return Number.isFinite(value) ? value : -1;
}

function preparationAggressiveness(value: number): number {
    return Number.isFinite(value) ? value : 3;
}

export function CommanderSelectionModal({ isOpen, onClose, onSelect }: CommanderSelectionModalProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const context = useGameStore((s) => s.commanderSelectionContext);

    const { availableOfficers, unavailableOfficers, operation, corpsName } = useMemo(() => {
        if (!loadedGameState || !context) {
            return { availableOfficers: [], unavailableOfficers: [], operation: null, corpsName: t('commanderSelect.command') };
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
        const operationNameByRaw = new Map(
            (loadedGameState.operations ?? [])
                .filter((candidate) => candidate.corps_id === context.corpsId)
                .map((candidate) => [candidate.name, candidate.display_name]),
        );

        const factionOfficers = (namedOfficerData ?? []).filter((o) => o.faction === faction);
        const avail: Array<{ officer: NamedOfficerView; fit: ReturnType<typeof getRegionalFit> }> = [];
        const unavail: Array<{ officer: NamedOfficerView; reason: string }> = [];

        for (const officer of factionOfficers) {
            const status = getAvailabilityStatus(officer, context.corpsId, corpsNameById, operationNameByRaw);
            if (status.available) {
                avail.push({ officer, fit: getRegionalFit(officer, context.corpsId) });
            } else {
                unavail.push({ officer, reason: status.reason ?? t('commanderSelect.unavailable') });
            }
        }

        avail.sort((a, b) => {
            if (a.fit.label === t('commanderSelect.fit.homeCorps') && b.fit.label !== t('commanderSelect.fit.homeCorps')) return -1;
            if (b.fit.label === t('commanderSelect.fit.homeCorps') && a.fit.label !== t('commanderSelect.fit.homeCorps')) return 1;
            return sortableOfficerRating(b.officer.competence) - sortableOfficerRating(a.officer.competence);
        });

        return {
            availableOfficers: avail,
            unavailableOfficers: unavail,
            operation: op,
            corpsName: corpsNameById.get(context.corpsId) ?? t('commanderSelect.command'),
        };
    }, [loadedGameState, context]);

    if (!context) return null;
    const operationDisplayName = operation?.display_name
        ?? getPlayerSafeOperationName(context.operationName, context.corpsId);

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
                    <div id="commander-selection-title" className="text-xs uppercase font-bold text-neutral-500 tracking-wider">{t('commanderSelect.title')}</div>
                    <div className="text-sm font-bold mt-0.5">
                        {operationDisplayName} - {corpsName}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {availableOfficers.map(({ officer, fit }) => {
                        const prepEst = getPreparationMaxTurns(preparationAggressiveness(officer.aggressiveness));
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
                                        <div className="text-xs text-text-muted italic">{getArchetype(officer)}</div>
                                    </div>
                                    <span className={`text-xs uppercase font-bold ${fit.color}`}>
                                        {fit.label}
                                    </span>
                                </div>

                                <div className="mt-1.5 flex gap-4 text-xs">
                                    <span>
                                        <span className="text-neutral-500">{t('commanderSelect.comp')} </span>
                                        <span className={`font-mono ${getRatingColor(officer.competence)}`}>{formatPips(officer.competence)}</span>
                                        <span className="text-neutral-400 ml-1">{getCompetenceLabel(officer.competence)}</span>
                                    </span>
                                    <span>
                                        <span className="text-neutral-500">{t('commanderSelect.agg')} </span>
                                        <span className={`font-mono ${getRatingColor(officer.aggressiveness)}`}>{formatPips(officer.aggressiveness)}</span>
                                        <span className="text-neutral-400 ml-1">{getAggressionLabel(officer.aggressiveness)}</span>
                                    </span>
                                </div>

                                <div className="mt-1 text-xs text-text-muted italic">
                                    {t('commanderSelect.personalityPrep', { personality, turns: prepEst })}
                                </div>

                                {officer.casualty_vulnerability != null && officer.casualty_vulnerability > 0.5 && (
                                    <div className="mt-0.5 text-xs text-red-300 font-semibold">{t('commanderSelect.highCasualtyRisk')}</div>
                                )}
                            </button>
                        );
                    })}

                    {unavailableOfficers.length > 0 && (
                        <div className="pt-2 border-t border-panel-border">
                            <div className="text-xs uppercase text-neutral-400 font-bold mb-1">{t('commanderSelect.unavailable')}</div>
                            {unavailableOfficers.map(({ officer, reason }) => (
                                <div key={officer.id} className="px-3 py-1.5 text-neutral-400 text-xs">
                                    <span className="font-semibold">{formatRank(officer.rank)} {officer.name}</span>
                                    <span className="ml-2 text-xs uppercase">[{reason}]</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {availableOfficers.length === 0 && unavailableOfficers.length === 0 && (
                        <div className="text-xs text-text-muted italic text-center py-8">{t('commanderSelect.noOfficers')}</div>
                    )}
                </div>

                <div className="px-4 py-3 border-t-2 border-panel-border bg-panel-card/70 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="kbd-focus px-4 py-1.5 text-xs uppercase font-bold bg-panel-card hover:bg-panel-border border border-panel-border transition-colors"
                    >
                        {t('commanderSelect.backToDraft')}
                    </button>
                </div>
            </>
        </Modal>
    );
}
