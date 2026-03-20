/**
 * Commander section for expanded corps card.
 * Shows corps commander via OfficerProfile, with action button placeholders.
 */
import type { FormationView, LoadedGameState } from '../../data/types';
import { getFormationCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { CollapsibleSection } from './CollapsibleSection';

interface CommanderSectionProps {
    corps: FormationView;
    gameState: LoadedGameState;
}

export function CommanderSection({ corps, gameState }: CommanderSectionProps) {
    const commander = getFormationCommander(corps, gameState);
    const isActing = commander?.acting_commander;

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
                    {/* Action buttons — wired in Phase 3 */}
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            disabled
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-[#c8b898]/50 text-[#8a7a60] opacity-50 cursor-not-allowed"
                        >
                            Replace Commander
                        </button>
                        <button
                            type="button"
                            disabled
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-red-300/50 text-red-700/50 opacity-50 cursor-not-allowed"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-[12px] text-[#8a7a60] italic py-2">No commander data available</div>
            )}
        </CollapsibleSection>
    );
}
