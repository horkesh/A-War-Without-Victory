/**
 * Combat Record section for expanded corps card.
 * Shows battles fought, record breakdown, casualties, and ground won/lost.
 */
import type { FormationView } from '../../data/types';
import { CollapsibleSection } from './CollapsibleSection';
import { EmptyState } from '../EmptyState';
import { t } from '../../i18n';

interface CombatRecordSectionProps {
    corpsId: string;
    corps: FormationView;
}

export function CombatRecordSection({ corpsId, corps }: CombatRecordSectionProps) {
    const cs = corps.combatSummary;

    return (
        <CollapsibleSection sectionKey={`combat-${corpsId}`} title={t('combatRecord.title')}>
            {!cs || cs.battles_fought === 0 ? (
                <EmptyState
                    message={t('combatRecord.emptyTitle')}
                    helpText={t('combatRecord.emptyHelp')}
                    density="compact"
                />
            ) : (
                <div className="space-y-1 text-[11px] tabular-nums" style={{ fontFamily: 'Courier New, monospace' }}>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.battles')}</span>
                        <span className="text-text-primary font-bold">{cs.battles_fought}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.record')}</span>
                        <span className="text-text-primary font-bold">
                            {t('combatRecord.recordBreakdown', {
                                wins: cs.victories,
                                losses: cs.defeats,
                                stalemates: cs.stalemates,
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.winRate')}</span>
                        <span className="text-text-primary font-bold">{(cs.win_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.casualtiesTaken')}</span>
                        <span className="text-red-700">{cs.total_casualties_taken.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.casualtiesInflicted')}</span>
                        <span className="text-green-700">{cs.total_casualties_inflicted.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.exchangeRatio')}</span>
                        <span className="text-text-primary">{cs.casualty_exchange_ratio.toFixed(2)}:1</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.groundWonLost')}</span>
                        <span className="text-text-primary font-bold">
                            {t('combatRecord.groundWonLostCount', {
                                won: cs.total_osids_captured,
                                lost: cs.total_osids_lost,
                            })}
                        </span>
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
}
