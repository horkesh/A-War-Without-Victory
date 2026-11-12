/**
 * Phase 1 — Commander Selection
 * Shows corps identity card and officer selection grid.
 * Click an officer card to select and advance to Phase 2.
 */
import { useMemo, useState } from 'react';
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
import { formatCorpsDisplayName } from '../../utils/formatters';
import { getPlayerSafeMilitaryFactionName } from '../../utils/playerSafeText';
import { t } from '../../i18n';
import { isFieldedTacticalFormation } from '../../../shared/playerVisibility';
import {
    SurfaceDetailFooter,
    SurfacePanel,
    SurfaceSection,
    SURFACE_CHIP,
    SURFACE_LABEL_MUTED,
    SURFACE_PRIMARY_BUTTON_COMPACT,
    SURFACE_SECONDARY_BUTTON,
    SURFACE_TONE,
} from '../surface/Surface';
import { OpsPhaseBody, OPS_TONE_TEXT } from './opsSurface';

interface CommanderPhaseProps {
    onAdvance: () => void;
}

/** Availability status for an officer. */
function getAvailabilityStatus(
    officer: NamedOfficerView,
    targetCorpsId: string,
    corpsNameById: Map<string, string>,
): { available: boolean; reason?: string } {
    if (officer.status === 'kia' || officer.status === 'killed') {
        return { available: false, reason: t('opsPlanning.commander.reason.fallen') };
    }
    if (officer.status === 'captured') return { available: false, reason: t('opsPlanning.commander.reason.captured') };
    if (officer.status === 'retired') return { available: false, reason: t('opsPlanning.commander.reason.retired') };
    if (officer.rank === 'army_commander') return { available: false, reason: t('opsPlanning.commander.reason.armyHq') };
    if (officer.enclave_lock) return { available: false, reason: t('opsPlanning.commander.reason.enclaveLocked') };
    if (officer.assigned_operation) return { available: false, reason: t('opsPlanning.commander.reason.assignedOperation') };
    if (officer.assigned_corps_id && officer.assigned_corps_id !== targetCorpsId) {
        const corps = corpsNameById.get(officer.assigned_corps_id) ?? t('opsPlanning.commander.reason.anotherCommand');
        return {
            available: false,
            reason: officer.acting_commander
                ? t('opsPlanning.commander.reason.actingCommanderOtherCorps', { corps })
                : t('opsPlanning.commander.reason.assignedCorps', { corps }),
        };
    }
    return { available: true };
}

/** Regional fit. */
function getRegionalFit(officer: NamedOfficerView, targetCorpsId: string): { label: string; colorClass: string } {
    if (officer.home_corps_id === targetCorpsId) return { label: 'HOME CORPS', colorClass: SURFACE_TONE.good };
    if (officer.compatible_corps_ids?.includes(targetCorpsId)) return { label: 'COMPATIBLE', colorClass: SURFACE_TONE.warn };
    return { label: 'OUT OF REGION', colorClass: SURFACE_TONE.danger };
}

import { FACTION_HEX_COLORS } from '../plan_ui/opsConstants';

function localizeRegionalFit(label: string): string {
    if (label === 'HOME CORPS') return t('opsPlanning.commander.regional.home');
    if (label === 'COMPATIBLE') return t('opsPlanning.commander.regional.compatible');
    if (label === 'OUT OF REGION') return t('opsPlanning.commander.regional.outOfRegion');
    return label;
}

function sortableOfficerRating(value: number): number {
    return Number.isFinite(value) ? value : -1;
}

function preparationAggressiveness(value: number): number {
    return Number.isFinite(value) ? value : 3;
}

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
        const color = FACTION_HEX_COLORS[fac] ?? '#888';
        const name = corpsFormation
            ? formatCorpsDisplayName(corpsFormation.name, corpsFormation.id)
            : corpsId;
        const corpsNameById = new Map(
            loadedGameState.formations
                .filter((f) => f.kind === 'corps' || f.kind === 'corps_asset' || f.kind === 'army_hq')
                .map((f) => [f.id, formatCorpsDisplayName(f.name, f.id)]),
        );

        const subordinates = loadedGameState.formations.filter(
            (f) => f.corps_id === corpsId && isFieldedTacticalFormation(f)
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
            const status = getAvailabilityStatus(off, corpsId, corpsNameById);
            if (status.available) {
                avail.push({ officer: off, fit: getRegionalFit(off, corpsId) });
            } else {
                unavail.push({ officer: off, reason: status.reason ?? t('opsPlanning.commander.reason.unknown') });
            }
        }

        // Sort available: home corps first, then by competence
        avail.sort((a, b) => {
            const aHome = a.fit.label === 'HOME CORPS' ? 0 : a.fit.label === 'COMPATIBLE' ? 1 : 2;
            const bHome = b.fit.label === 'HOME CORPS' ? 0 : b.fit.label === 'COMPATIBLE' ? 1 : 2;
            if (aHome !== bHome) return aHome - bHome;
            return sortableOfficerRating(b.officer.competence) - sortableOfficerRating(a.officer.competence);
        });

        return {
            corpsName: name, faction: fac, factionColor: color, totalPersonnel: totalPers,
            sectorCount: sectors.length, corpsCommander: cmdOfficer,
            availableOfficers: avail, unavailableOfficers: unavail,
        };
    }, [loadedGameState, corpsId]);

    // WP4b: Confirmation step — click selects (pending), confirm advances
    const [pendingOfficerId, setPendingOfficerId] = useState<string | null>(null);

    const handleSelectOfficer = (officerId: string) => {
        setPendingOfficerId(officerId);
    };

    const handleConfirm = () => {
        if (pendingOfficerId) {
            setSelectedOfficer(pendingOfficerId);
            onAdvance();
        }
    };

    const handleCancelSelection = () => {
        setPendingOfficerId(null);
    };

    const pendingOfficer = pendingOfficerId
        ? availableOfficers.find(({ officer }) => officer.id === pendingOfficerId)
        : null;

    return (
        <div
            className="flex min-h-0 flex-1 flex-col"
            data-testid="ops-planning-phase-panel"
            data-phase="commander"
        >
            <OpsPhaseBody>
                {/* Corps identity */}
                <SurfaceSection label={t('opsPlanning.surface.corpsSection')}>
                    <SurfacePanel className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                            <div aria-hidden="true" className="h-12 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: factionColor }} />
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <span className={SURFACE_LABEL_MUTED}>{getPlayerSafeMilitaryFactionName(faction)}</span>
                                <span className="text-[19px] font-semibold leading-snug text-[#f1e6c8]">{corpsName}</span>
                            </div>
                        </div>
                        {corpsCommander && (
                            <p className="m-0 text-[16px] text-[#c2b69c]">
                                {t('opsPlanning.commander.commanding')}{' '}
                                <span className="font-semibold text-[#f1e6c8]">{formatRank(corpsCommander.rank)} {corpsCommander.name}</span>
                            </p>
                        )}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[16px] text-[#c2b69c]">
                            <span>
                                <span className="font-mono text-[19px] font-semibold tabular-nums text-[#f1e6c8]">{totalPersonnel.toLocaleString()}</span> {t('opsPlanning.commander.personnel')}
                            </span>
                            <span>
                                <span className="font-mono text-[19px] font-semibold tabular-nums text-[#f1e6c8]">{sectorCount}</span> {t('opsPlanning.commander.sectors')}
                            </span>
                        </div>
                    </SurfacePanel>
                </SurfaceSection>

                {/* Officer selection */}
                <SurfaceSection label={t('opsPlanning.commander.select')}>
                    {availableOfficers.length === 0 && (
                        <p className="m-0 text-[17px] text-[#c2b69c]">{t('opsPlanning.commander.noneAvailable')}</p>
                    )}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
                        {availableOfficers.map(({ officer, fit }) => {
                            const prepTurns = getPreparationMaxTurns(preparationAggressiveness(officer.aggressiveness));
                            const rankLabel = formatRank(officer.rank);
                            const fitLabel = localizeRegionalFit(fit.label);
                            const selected = pendingOfficerId === officer.id;
                            const commanderOptionLabel = t('opsPlanning.commander.optionAria', {
                                rank: rankLabel,
                                name: officer.name,
                                fit: fitLabel,
                                turns: prepTurns,
                            });
                            return (
                                <button
                                    key={officer.id}
                                    type="button"
                                    onClick={() => handleSelectOfficer(officer.id)}
                                    aria-label={commanderOptionLabel}
                                    aria-pressed={selected}
                                    title={commanderOptionLabel}
                                    className={`flex flex-col gap-2 rounded-md border px-4 py-3.5 text-left transition ${
                                        selected
                                            ? 'border-[#c9a75c] bg-[#232936]'
                                            : 'border-[#2a303c] bg-[#161a22] hover:border-[#4a4436]'
                                    }`}
                                >
                                    <span className="flex items-start justify-between gap-3">
                                        <span className="flex min-w-0 flex-col gap-0.5">
                                            <span className="text-[14px] text-[#b9ad94]">{rankLabel}</span>
                                            <span className="truncate text-[18px] font-semibold leading-snug text-[#f1e6c8]">{officer.name}</span>
                                        </span>
                                        <span className={`${SURFACE_CHIP} ${fit.colorClass}`}>{fitLabel}</span>
                                    </span>
                                    <span className="text-[15px] leading-snug text-[#c2b69c]">
                                        {getArchetype(officer)}: {getPersonalitySummary(officer.competence, officer.aggressiveness)}
                                    </span>
                                    <span className="grid grid-cols-2 gap-3 text-[15px]">
                                        <span className="flex flex-col gap-0.5">
                                            <span className="text-[#b9ad94]">{t('opsPlanning.commander.competence')}</span>
                                            <span className={getRatingColor(officer.competence)}>
                                                {formatPips(officer.competence)} <span className="text-[#ddd1b3]">{getCompetenceLabel(officer.competence)}</span>
                                            </span>
                                        </span>
                                        <span className="flex flex-col gap-0.5">
                                            <span className="text-[#b9ad94]">{t('opsPlanning.commander.aggressiveness')}</span>
                                            <span className={getRatingColor(officer.aggressiveness)}>
                                                {formatPips(officer.aggressiveness)} <span className="text-[#ddd1b3]">{getAggressionLabel(officer.aggressiveness)}</span>
                                            </span>
                                        </span>
                                    </span>
                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
                                        <span className="text-[#b9ad94]">{t('opsPlanning.commander.prepTime')}</span>
                                        <span className={`font-semibold ${prepTurns <= 3 ? OPS_TONE_TEXT.good : prepTurns <= 5 ? OPS_TONE_TEXT.warn : OPS_TONE_TEXT.danger}`}>
                                            {prepTurns} {t('opsPlanning.commander.turns')}
                                        </span>
                                        {officer.operations_commanded != null && officer.operations_commanded > 0 && (
                                            <span className="ml-auto text-[#b9ad94]">{t('opsPlanning.commander.opsCommanded', { count: officer.operations_commanded })}</span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </SurfaceSection>

                {/* Unavailable officers and why */}
                {unavailableOfficers.length > 0 && (
                    <SurfaceSection label={t('opsPlanning.commander.unavailable', { count: unavailableOfficers.length })}>
                        <ul className="m-0 flex list-none flex-col p-0">
                            {unavailableOfficers.map(({ officer, reason }) => (
                                <li
                                    key={officer.id}
                                    className="flex items-baseline justify-between gap-4 border-b border-[#262b35] py-2 text-[15px] last:border-b-0"
                                >
                                    <span className="text-[#b9ad94] line-through">{officer.name}</span>
                                    <span className="text-right text-[#9c917b]">{reason}</span>
                                </li>
                            ))}
                        </ul>
                    </SurfaceSection>
                )}
            </OpsPhaseBody>

            {/* Confirmation footer: select a card, then confirm */}
            <SurfaceDetailFooter>
                {pendingOfficer ? (
                    <p className="m-0 text-[16px] text-[#c2b69c]">
                        {t('opsPlanning.commander.selected')}{' '}
                        <span className="font-semibold text-[#f1e6c8]">
                            {formatRank(pendingOfficer.officer.rank)} {pendingOfficer.officer.name}
                        </span>{' '}
                        <span className="text-[#b9ad94]">({localizeRegionalFit(pendingOfficer.fit.label)})</span>
                    </p>
                ) : (
                    <p className="m-0 text-[16px] text-[#c2b69c]">{t('opsPlanning.surface.commanderHint')}</p>
                )}
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!pendingOfficer}
                        className={`${SURFACE_PRIMARY_BUTTON_COMPACT} flex-1`}
                    >
                        {t('opsPlanning.commander.confirm')}
                    </button>
                    {pendingOfficer && (
                        <button type="button" onClick={handleCancelSelection} className={SURFACE_SECONDARY_BUTTON}>
                            {t('opsPlanning.commander.cancel')}
                        </button>
                    )}
                </div>
            </SurfaceDetailFooter>
        </div>
    );
}
