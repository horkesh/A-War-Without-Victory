/**
 * Commander section for expanded corps card.
 * Warroom dark palette.
 *
 * FULL DECISION-ROOM CONVERGENCE: the replace-CO lever is issued ONLY from the
 * Presidential Decision Room (DirectiveCard, replace_co directive). This Army-HQ
 * section is scan/deep-drill only — it shows the serving commander's dossier and
 * disposition badges (acting / deferred-compliance / low-loyalty) so the president
 * can READ the corps command picture; the reassign / dismiss ACTIONS moved out.
 */
import type { FormationView, LoadedGameState } from '../../data/types';
import { getFormationCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { CollapsibleSection } from './CollapsibleSection';
import { t } from '../../i18n';

interface CommanderSectionProps {
    corps: FormationView;
    gameState: LoadedGameState;
}

export function CommanderSection({ corps, gameState }: CommanderSectionProps) {
    const commander = getFormationCommander(corps, gameState);
    const isActing = commander?.acting_commander;

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
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="text-[12px] text-red-500/80 font-mono italic p-3 bg-red-500/5 border border-red-500/20">
                        {t('commanderSection.vacancy')}
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
}
