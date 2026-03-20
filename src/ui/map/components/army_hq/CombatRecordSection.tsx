/**
 * Combat Record section for expanded corps card.
 * Shows battles fought, W/L/D, casualties, territory changes.
 */
import type { FormationView } from '../../data/types';
import { CollapsibleSection } from './CollapsibleSection';

interface CombatRecordSectionProps {
    corpsId: string;
    corps: FormationView;
}

export function CombatRecordSection({ corpsId, corps }: CombatRecordSectionProps) {
    const cs = corps.combatSummary;

    return (
        <CollapsibleSection sectionKey={`combat-${corpsId}`} title="Combat Record">
            {!cs || cs.battles_fought === 0 ? (
                <div className="text-[11px] text-[#8a7a60] italic py-1">No combat record</div>
            ) : (
                <div className="space-y-1 text-[11px] tabular-nums" style={{ fontFamily: 'Courier New, monospace' }}>
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Battles</span>
                        <span className="text-[#2a2016] font-bold">{cs.battles_fought}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Record</span>
                        <span>
                            <span className="text-green-700 font-bold">{cs.victories}W</span>
                            {' / '}
                            <span className="text-red-700 font-bold">{cs.defeats}L</span>
                            {' / '}
                            <span className="text-[#8a7a60]">{cs.stalemates}D</span>
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Win Rate</span>
                        <span className="text-[#2a2016] font-bold">{(cs.win_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Casualties Taken</span>
                        <span className="text-red-700">{cs.total_casualties_taken.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Casualties Inflicted</span>
                        <span className="text-green-700">{cs.total_casualties_inflicted.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Exchange Ratio</span>
                        <span className="text-[#2a2016]">{cs.casualty_exchange_ratio.toFixed(2)}:1</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Territory</span>
                        <span>
                            <span className="text-green-700">+{cs.total_osids_captured}</span>
                            {' / '}
                            <span className="text-red-700">-{cs.total_osids_lost}</span>
                        </span>
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
}
