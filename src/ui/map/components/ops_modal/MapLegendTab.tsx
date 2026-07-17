/**
 * WP3c: Map Legend tab for the G-2 Phase clipboard.
 * Shows territory colors, front line styles, operation markers,
 * selection states, and terrain modifiers with defense bonuses.
 * Uses parchment styling to match NarrativeTab and RawIntelTab.
 */
import { t } from '../../i18n';

interface LegendItemProps {
    swatch: React.ReactNode;
    label: string;
    detail?: string;
}

function LegendItem({ swatch, label, detail }: LegendItemProps) {
    return (
        <div className="flex items-center gap-2 py-0.5">
            <div className="w-5 h-3 flex-shrink-0 flex items-center justify-center">
                {swatch}
            </div>
            <span className="text-xs text-[#2a2218]">{label}</span>
            {detail && <span className="text-xs text-[#4a4238] ml-auto">{detail}</span>}
        </div>
    );
}

function ColorSwatch({ color, border, dashed }: { color: string; border?: string; dashed?: boolean }) {
    return (
        <div
            className="w-5 h-3 rounded-sm"
            style={{
                backgroundColor: color,
                border: border ? `1.5px ${dashed ? 'dashed' : 'solid'} ${border}` : undefined,
            }}
        />
    );
}

function LineSwatch({ color, width, dashed }: { color: string; width?: number; dashed?: boolean }) {
    return (
        <div className="w-5 flex items-center">
            <div
                style={{
                    width: '100%',
                    height: `${width ?? 2}px`,
                    backgroundColor: dashed ? 'transparent' : color,
                    borderTop: dashed ? `${width ?? 2}px dashed ${color}` : undefined,
                }}
            />
        </div>
    );
}

export function MapLegendTab() {
    return (
        <div className="space-y-4" style={{ fontFamily: "'Courier New', monospace" }}>
            {/* Territory Colors */}
            <div>
                <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    {t('opsPlanning.legend.territory')}
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<ColorSwatch color="rgba(255,255,255,0.08)" border="rgba(255,255,255,0.25)" />}
                        label={t('opsPlanning.legend.corpsAo')}
                    />
                    <LegendItem
                        swatch={<ColorSwatch color="rgba(200,60,60,0.12)" border="rgba(200,60,60,0.3)" dashed />}
                        label={t('opsPlanning.legend.targetableEnemy')}
                    />
                    <LegendItem
                        swatch={<ColorSwatch color="rgba(0,0,0,0.45)" />}
                        label={t('opsPlanning.legend.outOfRangeDimmed')}
                    />
                </div>
            </div>

            {/* Front Lines */}
            <div>
                <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    {t('opsPlanning.legend.frontLines')}
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<LineSwatch color="rgba(255,220,120,0.8)" width={3} />}
                        label={t('opsPlanning.legend.thisCorpsFront')}
                        detail={t('opsPlanning.legend.goldHighlight')}
                    />
                    <LegendItem
                        swatch={<LineSwatch color="rgba(0,0,0,0.65)" width={2} />}
                        label={t('opsPlanning.legend.otherFronts')}
                        detail={t('opsPlanning.legend.darkLine')}
                    />
                </div>
            </div>

            {/* Operation Markers */}
            <div>
                <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    {t('opsPlanning.legend.operationMarkers')}
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<ColorSwatch color="#8b0000" border="#1a1a1a" dashed />}
                        label={t('opsPlanning.legend.objective')}
                        detail={t('opsPlanning.legend.darkRedFill')}
                    />
                    <LegendItem
                        swatch={<div className="text-accent-gold text-[14px] leading-none">&#9733;</div>}
                        label={t('opsPlanning.legend.schwerpunkt')}
                        detail={t('opsPlanning.legend.goldStar')}
                    />
                    <LegendItem
                        swatch={<ColorSwatch color="#2d6a4f" border="#40916c" />}
                        label={t('opsPlanning.legend.stagingArea')}
                        detail={t('opsPlanning.legend.greenFill')}
                    />
                </div>
            </div>

            {/* Selection States */}
            <div>
                <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    {t('opsPlanning.legend.selection')}
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<div className="w-4 h-3 rounded-sm bg-[#3a5a3a] border border-[#56d364]" />}
                        label={t('opsPlanning.legend.selectable')}
                        detail={t('opsPlanning.legend.pointerCursor')}
                    />
                    <LegendItem
                        swatch={<div className="w-4 h-3 rounded-sm bg-[rgba(0,0,0,0.45)]" />}
                        label={t('opsPlanning.legend.outOfRange')}
                        detail={t('opsPlanning.legend.noCursor')}
                    />
                </div>
            </div>

            {/* Terrain Modifiers */}
            <div>
                <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    {t('opsPlanning.legend.terrainDefense')}
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<span className="text-[12px]">&#9968;</span>}
                        label={t('opsPlanning.legend.mountain')}
                        detail={t('opsPlanning.legend.defense50')}
                    />
                    <LegendItem
                        swatch={<span className="text-[12px]">&#9651;</span>}
                        label={t('opsPlanning.legend.hilly')}
                        detail={t('opsPlanning.legend.defense30')}
                    />
                    <LegendItem
                        swatch={<span className="text-[12px]">&#127795;</span>}
                        label={t('opsPlanning.legend.rollingForest')}
                        detail={t('opsPlanning.legend.defense15')}
                    />
                    <LegendItem
                        swatch={<span className="text-[12px]">&#9866;</span>}
                        label={t('opsPlanning.legend.flat')}
                        detail={t('opsPlanning.legend.noBonus')}
                    />
                    <LegendItem
                        swatch={<span className="text-[12px] text-blue-500">&#126;</span>}
                        label={t('opsPlanning.legend.riverCrossing')}
                        detail={t('opsPlanning.legend.attackPenalty')}
                    />
                </div>
            </div>
        </div>
    );
}
