/**
 * Commander section for expanded corps card.
 * Shows corps commander via OfficerProfile, with Replace Commander action.
 */
import { useMemo } from 'react';
import type { FormationView, LoadedGameState, NamedOfficerView } from '../../data/types';
import { getFormationCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { CollapsibleSection } from './CollapsibleSection';
import { getRatingColor } from '../../utils/officerCharacter';

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
            // Don't show officers already commanding another corps (except this one)
            if (o.assigned_corps_id && o.assigned_corps_id !== corps.id) return false;
            return true;
        }).sort((a, b) => {
            // Home corps first, then by competence
            const aHome = a.home_corps_id === corps.id ? 0 : 1;
            const bHome = b.home_corps_id === corps.id ? 0 : 1;
            if (aHome !== bHome) return aHome - bHome;
            return b.competence - a.competence;
        });
    }, [showPicker, corps.id, corps.faction, gameState.namedOfficerData]);

    const handleAssign = async (officerId: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.assignCommander(officerId, corps.id);
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to assign commander.');
        }
        setPickerCorpsId(null);
    };

    const handleDismiss = async () => {
        if (!ipc.isAvailable || !commander) return;
        const result = await ipc.dismissOfficer(commander.id);
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to dismiss officer.');
        }
    };

    return (
        <CollapsibleSection sectionKey={`cmd-${corps.id}`} title="Commander" defaultOpen={true}>
            {commander ? (
                <div className="space-y-2">
                    {isActing && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/50 px-2 py-1 rounded border border-amber-300/50">
                            Acting Commander — no permanent assignment
                        </div>
                    )}
                    <OfficerProfile officer={commander} label="" compact={false} />
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setPickerCorpsId(showPicker ? null : corps.id)}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-[#c8b898]/50 text-[#6a5a40] hover:bg-[#e8dcc4]/50 transition-colors"
                        >
                            {showPicker ? 'Cancel' : 'Replace Commander'}
                        </button>
                        {!isActing && !showPicker && (
                            <button
                                type="button"
                                onClick={() => { void handleDismiss(); }}
                                className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-red-600/30 text-red-700 hover:bg-red-100/30 transition-colors"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="text-[12px] text-amber-700 italic py-1">No commander assigned — acting commander in place</div>
                    <button
                        type="button"
                        onClick={() => setPickerCorpsId(showPicker ? null : corps.id)}
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-amber-500/50 text-amber-700 hover:bg-amber-100/30 transition-colors"
                    >
                        {showPicker ? 'Cancel' : 'Assign from Pool'}
                    </button>
                </div>
            )}

            {/* Inline officer picker */}
            {showPicker && (
                <div className="mt-2 border-t border-[#c8b898]/50 pt-2 space-y-1">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#6a5a40] mb-1">
                        Available Officers ({availableOfficers.length})
                    </div>
                    {availableOfficers.length === 0 ? (
                        <div className="text-[10px] text-[#8a7a60] italic">No officers available</div>
                    ) : (
                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                            {availableOfficers.map((officer) => {
                                const isHome = officer.home_corps_id === corps.id;
                                return (
                                    <button
                                        key={officer.id}
                                        type="button"
                                        onClick={() => { void handleAssign(officer.id); }}
                                        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#e8dcc4] transition-colors text-left border border-transparent hover:border-[#c8b898]/50"
                                    >
                                        <div className="min-w-0">
                                            <span className="text-[11px] font-bold text-[#2a2016]" style={{ fontFamily: 'Courier New, monospace' }}>
                                                {officer.name}
                                            </span>
                                            {isHome && (
                                                <span className="ml-1.5 text-[8px] font-bold text-green-700 bg-green-100/50 px-1 rounded border border-green-300/30">
                                                    HOME
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 text-[10px] tabular-nums" style={{ fontFamily: 'Courier New, monospace' }}>
                                            <span style={{ color: getRatingColor(officer.competence) }}>C:{officer.competence.toFixed(1)}</span>
                                            <span style={{ color: getRatingColor(officer.aggressiveness) }}>A:{officer.aggressiveness.toFixed(1)}</span>
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
