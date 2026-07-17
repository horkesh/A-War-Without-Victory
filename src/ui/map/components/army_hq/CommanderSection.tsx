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
import type { FormationView, LoadedGameState, OperationView } from '../../data/types';
import { getFormationCommander, getSyntheticJnaCommandPresentation, resolveCorpsCommanderDisplay } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { CommanderDisplayPanel } from '../CommanderDisplayPanel';
import { CollapsibleSection } from './CollapsibleSection';
import { t } from '../../i18n';

interface CommanderSectionProps {
    corps: FormationView;
    gameState: LoadedGameState;
    operations?: OperationView[];
}

export function CommanderSection({ corps, gameState, operations }: CommanderSectionProps) {
    const commander = getFormationCommander(corps, gameState);
    const commanderDisplay = resolveCorpsCommanderDisplay(corps.id, corps.faction, gameState);
    const syntheticCommand = commanderDisplay?.source === 'synthetic'
        ? getSyntheticJnaCommandPresentation(corps, operations ?? gameState.operations, gameState)
        : null;
    const isActing = commander?.acting_commander;

    return (
        <CollapsibleSection sectionKey={`cmd-${corps.id}`} title={t('commanderSection.title')} defaultOpen={true}>
            {commander ? (
                <div className="space-y-4">
                    {isActing && (
                        <div className="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-500/5 px-3 py-1.5 border border-amber-500/20">
                            {t('commanderSection.actingCommander')}
                        </div>
                    )}
                    {commander.is_cowed && (
                        <div className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-500/5 px-3 py-1.5 border border-blue-500/20">
                            {t('commanderSection.deferredCompliance')}
                        </div>
                    )}
                    {!isActing && !commander.is_cowed && commander.political_reliability <= 2 && (
                        <div className="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-500/5 px-3 py-1.5 border border-amber-500/20">
                            {t('commanderSection.lowLoyalty')}
                        </div>
                    )}
                    <OfficerProfile officer={commander} label="" compact={false} />
                </div>
            ) : syntheticCommand ? (
                <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/5 px-3 py-1.5 border border-amber-500/20">
                        {t('commanderSection.syntheticJnaStaff')}
                    </div>
                    <div className="text-[12px] text-text-primary font-mono p-3 bg-panel-bg border border-panel-border">
                        <div className="text-xs uppercase tracking-widest text-text-secondary mb-1">
                            {t('commanderSection.operationCommander')}
                        </div>
                        <div className="font-semibold">
                            {syntheticCommand.commanderName ?? t('commanderSection.syntheticJnaStaffFallback')}
                        </div>
                        {syntheticCommand.operationName && (
                            <div className="mt-1 text-xs text-text-secondary">
                                {syntheticCommand.operationName}
                            </div>
                        )}
                    </div>
                </div>
            ) : commanderDisplay ? (
                commanderDisplay.source === 'unreported' ? (
                <div className="space-y-4">
                    <div className="text-[12px] text-text-secondary font-mono italic p-3 bg-panel-bg border border-panel-border">
                        {t('commanderSection.sourceUnreported')}
                    </div>
                </div>
                ) : (
                <div className="space-y-4">
                    {commanderDisplay.acting && (
                        <div className="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-500/5 px-3 py-1.5 border border-amber-500/20">
                            {t('commanderSection.actingCommander')}
                        </div>
                    )}
                    <CommanderDisplayPanel display={commanderDisplay} label={t('corpsDetail.corpsCommander')} />
                </div>
                )
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
