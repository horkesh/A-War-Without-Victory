/**
 * Sectors section for expanded corps card.
 * Lists all front sectors with density, brigade count, and stance.
 */
import type { CorpsFrontSectorView } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { CollapsibleSection } from './CollapsibleSection';

interface SectorsSectionProps {
    corpsId: string;
    sectors: CorpsFrontSectorView[];
    factionBattles: TurnBattle[];
}

const STANCE_LABEL: Record<string, string> = {
    fortify: 'Fortify', defend: 'Defend', elastic: 'Elastic',
    active_defense: 'Active Def', screening: 'Screening',
};

export function SectorsSection({ corpsId, sectors, factionBattles }: SectorsSectionProps) {
    return (
        <CollapsibleSection sectionKey={`sec-${corpsId}`} title="Sectors" count={sectors.length}>
            {sectors.length === 0 ? (
                <div className="text-[11px] text-[#8a7a60] italic py-1">No sectors assigned</div>
            ) : (
                <div className="space-y-1.5">
                    {sectors.map((sector) => {
                        // Check for battles in this sector's territory
                        const sectorOsids = new Set<string>();
                        for (const sub of (sector.sub_segments ?? [])) {
                            for (const osid of sub.friendly_osids) sectorOsids.add(osid);
                        }
                        const hasBattle = factionBattles.some((b) => sectorOsids.has(b.osid));
                        const stanceLabel = STANCE_LABEL[sector.sector_stance ?? ''] ?? sector.sector_stance ?? '—';

                        return (
                            <div key={sector.sector_id}
                                 className="flex items-center justify-between px-2 py-1.5 rounded bg-[#e8dcc4]/40 border border-[#c8b898]/30">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-bold text-[#2a2016] truncate"
                                              style={{ fontFamily: 'Courier New, monospace' }}>
                                            {sector.display_name}
                                        </span>
                                        {hasBattle && (
                                            <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-red-900/20 text-red-700 border border-red-800/20">
                                                BATTLE
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[9px] text-[#8a7a60] tabular-nums mt-0.5"
                                         style={{ fontFamily: 'Courier New, monospace' }}>
                                        {sector.assigned_brigade_ids.length} front
                                        {sector.reserve_brigade_ids.length > 0 && ` + ${sector.reserve_brigade_ids.length} res`}
                                        {' · ~'}{sector.length_edges} km
                                        {' · D:'}{sector.density.toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <div className="text-[9px] font-bold uppercase text-[#6a5a40]">
                                        {stanceLabel}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleSection>
    );
}
