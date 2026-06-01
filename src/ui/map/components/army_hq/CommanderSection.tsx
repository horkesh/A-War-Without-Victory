/**
 * Commander section for expanded corps card.
 * Warroom dark palette.
 */
import { useMemo } from 'react';
import type { FormationView, LoadedGameState } from '../../data/types';
import { getFormationCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { CollapsibleSection } from './CollapsibleSection';
import { getRatingColor } from '../../utils/officerCharacter';
import { t } from '../../i18n';

interface CommanderSectionProps {
    corps: FormationView;
    gameState: LoadedGameState;
}

export function CommanderSection({ corps, gameState }: CommanderSectionProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const pickerCorpsId = useGameStore((s) => s.armyHQOfficerSelectionCorpsId);
    const setPickerCorpsId = useGameStore((s) => s.setArmyHQOfficerSelectionCorpsId);
    const commander = getFormationCommander(corps, gameState);
    const isActing = commander?.acting_commander;
    const showPicker = pickerCorpsId === corps.id;

    const availableOfficers = useMemo(() => {
        if (!showPicker) return [];
        const faction = corps.faction;
        return (gameState.namedOfficerData ?? []).filter((o) => {
            if (o.faction !== faction) return false;
            if (o.status !== 'active' && o.status !== 'reserve') return false;
            if (o.rank === 'army_commander') return false;
            if (o.enclave_lock) return false;
            if (o.assigned_operation) return false;
            if (o.assigned_corps_id && o.assigned_corps_id !== corps.id) return false;
            return true;
        }).sort((a, b) => {
            const aHome = a.home_corps_id === corps.id ? 0 : 1;
            const bHome = b.home_corps_id === corps.id ? 0 : 1;
            if (aHome !== bHome) return aHome - bHome;
            return b.competence - a.competence;
        });
    }, [showPicker, corps.id, corps.faction, gameState.namedOfficerData]);

    // REPLACE-CO presidential lever (Presidential Command Model slice 3/N): both the
    // explicit picker and the dismiss button route to the single costed
    // stage-co-replacement-order path (sack the serving CO + install a replacement at
    // REPLACE_CO_COST + cohesion/morale cost). Supersedes the removed broken
    // assignCommander/dismissOfficer handlers. Requires a current CO (the lever REPLACES
    // a serving commander); a true vacancy-fill is a separate flow (noted FOLLOW-UP).
    const handleAssign = async (officerId: string) => {
        if (!ipc.isAvailable || !commander) return;
        const result = await ipc.stageCoReplacementOrder({ corpsId: corps.id, replacementOfficerId: officerId });
        if (!result.ok) {
            setLoadError(result.error ?? t('commanderSection.error.assign'));
        }
        setPickerCorpsId(null);
    };

    const handleDismiss = async () => {
        if (!ipc.isAvailable || !commander) return;
        // Auto-pick the replacement (engine installs the best reserve officer).
        const result = await ipc.stageCoReplacementOrder({ corpsId: corps.id });
        if (!result.ok) {
            setLoadError(result.error ?? t('commanderSection.error.dismiss'));
        }
    };

    return (
        <CollapsibleSection sectionKey={`cmd-${corps.id}`} title={t('commanderSection.title')} defaultOpen={true}>
            {commander ? (
                <div className="space-y-4">
                    {isActing && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/5 px-3 py-1.5 border border-amber-500/20">
                            {t('commanderSection.actingCommander')}
                        </div>
                    )}
                    {commander.is_cowed && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/5 px-3 py-1.5 border border-blue-500/20">
                            {t('commanderSection.deferredCompliance')}
                        </div>
                    )}
                    {!isActing && !commander.is_cowed && commander.political_reliability <= 2 && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/5 px-3 py-1.5 border border-amber-500/20">
                            {t('commanderSection.lowLoyalty')}
                        </div>
                    )}
                    <OfficerProfile officer={commander} label="" compact={false} />
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setPickerCorpsId(showPicker ? null : corps.id)}
                            className="text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 border border-panel-border text-text-primary hover:bg-panel-bg transition-all font-mono"
                        >
                            {showPicker ? t('common.cancel') : t('commanderSection.reassign')}
                        </button>
                        {!isActing && !showPicker && (
                            <button
                                type="button"
                                onClick={() => { void handleDismiss(); }}
                                className="text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 border border-red-500/40 text-red-500 hover:bg-red-500/10 transition-all font-mono"
                            >
                                {t('commanderSection.dismiss')}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="text-[12px] text-red-500/80 font-mono italic p-3 bg-red-500/5 border border-red-500/20">
                        {t('commanderSection.vacancy')}
                    </div>
                    <button
                        type="button"
                        onClick={() => setPickerCorpsId(showPicker ? null : corps.id)}
                        className="text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-all font-mono"
                    >
                        {showPicker ? t('common.cancel') : t('commanderSection.assignFromPool')}
                    </button>
                </div>
            )}

            {/* Inline officer picker */}
            {showPicker && (
                <div className="mt-6 border-t border-panel-border pt-4 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary/60 mb-2">
                        {t('commanderSection.readingPool', { count: availableOfficers.length })}
                    </div>
                    {availableOfficers.length === 0 ? (
                        <div className="text-[11px] text-text-secondary/60 italic font-mono">{t('commanderSection.noCompatible')}</div>
                    ) : (
                        <div className="max-h-[250px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                            {availableOfficers.map((officer) => {
                                const isHome = officer.home_corps_id === corps.id;
                                return (
                                    <button
                                        key={officer.id}
                                        type="button"
                                        onClick={() => { void handleAssign(officer.id); }}
                                        className="w-full flex items-center justify-between px-3 py-2 border border-panel-border/50 hover:border-panel-border hover:bg-panel-bg transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-[12px] font-bold text-text-secondary group-hover:text-text-primary font-mono truncate">
                                                {officer.name}
                                            </span>
                                            {isHome && (
                                                <span className="text-[9px] font-bold text-panel-bg bg-amber-400 px-1.5 py-0.5 tracking-tighter">
                                                    {t('commanderSection.home')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 text-[10px] tabular-nums font-mono">
                                            <span title={`Command: ${officer.competence.toFixed(1)}`}>
                                                <span className="mr-1 text-[8px] uppercase tracking-[0.12em] text-text-secondary/70">Command</span>
                                                <span style={{ color: getRatingColor(officer.competence) }}>{officer.competence.toFixed(1)}</span>
                                            </span>
                                            <span title={`Initiative: ${officer.aggressiveness.toFixed(1)}`}>
                                                <span className="mr-1 text-[8px] uppercase tracking-[0.12em] text-text-secondary/70">Initiative</span>
                                                <span style={{ color: getRatingColor(officer.aggressiveness) }}>{officer.aggressiveness.toFixed(1)}</span>
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
