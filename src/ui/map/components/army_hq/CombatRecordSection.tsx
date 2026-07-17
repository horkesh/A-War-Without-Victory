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
    const hasReported = (field: string): boolean => {
        return !cs?.reportedFields || cs.reportedFields.includes(field);
    };
    const allReported = (fields: string[]): boolean => fields.every(hasReported);
    const unreported = t('corpsFront.unreported');

    return (
        <CollapsibleSection sectionKey={`combat-${corpsId}`} title={t('combatRecord.title')}>
            {!cs || cs.battles_fought === 0 ? (
                <EmptyState
                    message={t('combatRecord.emptyTitle')}
                    helpText={t('combatRecord.emptyHelp')}
                    density="compact"
                />
            ) : (
                <div className="space-y-1 text-xs tabular-nums" style={{ fontFamily: 'Courier New, monospace' }}>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.battles')}</span>
                        <span className="text-text-primary font-bold">{cs.battles_fought}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.record')}</span>
                        <span className="text-text-primary font-bold">
                            {allReported(['victories', 'defeats', 'stalemates'])
                                ? t('combatRecord.recordBreakdown', {
                                    wins: cs.victories,
                                    losses: cs.defeats,
                                    stalemates: cs.stalemates,
                                })
                                : unreported}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.winRate')}</span>
                        <span className="text-text-primary font-bold">{hasReported('win_rate') ? `${(cs.win_rate * 100).toFixed(0)}%` : unreported}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.casualtiesTaken')}</span>
                        <span className="text-red-700">{hasReported('total_casualties_taken') ? cs.total_casualties_taken.toLocaleString() : unreported}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.casualtiesInflicted')}</span>
                        <span className="text-green-700">{hasReported('total_casualties_inflicted') ? cs.total_casualties_inflicted.toLocaleString() : unreported}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.exchangeRatio')}</span>
                        <span className="text-text-primary">{hasReported('casualty_exchange_ratio') ? `${cs.casualty_exchange_ratio.toFixed(2)}:1` : unreported}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">{t('combatRecord.groundWonLost')}</span>
                        <span className="text-text-primary font-bold">
                            {allReported(['total_osids_captured', 'total_osids_lost'])
                                ? t('combatRecord.groundWonLostCount', {
                                    won: cs.total_osids_captured,
                                    lost: cs.total_osids_lost,
                                })
                                : unreported}
                        </span>
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
}
