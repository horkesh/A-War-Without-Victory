/**
 * WP3c: Map Legend tab for the G-2 Phase clipboard.
 * Shows territory colors, front line styles, operation markers,
 * selection states, and terrain modifiers with defense bonuses.
 * Uses parchment styling to match NarrativeTab and RawIntelTab.
 */

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
            <span className="text-[10px] text-[#2a2218]">{label}</span>
            {detail && <span className="text-[9px] text-[#4a4238] ml-auto">{detail}</span>}
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
                <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    Territory
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<ColorSwatch color="rgba(255,255,255,0.08)" border="rgba(255,255,255,0.25)" />}
                        label="Corps AO (own territory)"
                    />
                    <LegendItem
                        swatch={<ColorSwatch color="rgba(200,60,60,0.12)" border="rgba(200,60,60,0.3)" dashed />}
                        label="Targetable enemy territory"
                    />
                    <LegendItem
                        swatch={<ColorSwatch color="rgba(0,0,0,0.45)" />}
                        label="Out of range (dimmed)"
                    />
                </div>
            </div>

            {/* Front Lines */}
            <div>
                <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    Front Lines
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<LineSwatch color="rgba(255,220,120,0.8)" width={3} />}
                        label="This corps' front"
                        detail="Gold highlight"
                    />
                    <LegendItem
                        swatch={<LineSwatch color="rgba(0,0,0,0.65)" width={2} />}
                        label="Other fronts"
                        detail="Dark line"
                    />
                </div>
            </div>

            {/* Operation Markers */}
            <div>
                <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    Operation Markers
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<ColorSwatch color="#8b0000" border="#1a1a1a" dashed />}
                        label="Objective"
                        detail="Dark red fill"
                    />
                    <LegendItem
                        swatch={<div className="text-accent-gold text-[14px] leading-none">&#9733;</div>}
                        label="Schwerpunkt (main effort)"
                        detail="Gold star"
                    />
                    <LegendItem
                        swatch={<ColorSwatch color="#2d6a4f" border="#40916c" />}
                        label="Staging area"
                        detail="Green fill"
                    />
                </div>
            </div>

            {/* Selection States */}
            <div>
                <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    Selection
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<div className="w-4 h-3 rounded-sm bg-[#3a5a3a] border border-[#56d364]" />}
                        label="Selectable"
                        detail="Bright, pointer cursor"
                    />
                    <LegendItem
                        swatch={<div className="w-4 h-3 rounded-sm bg-[rgba(0,0,0,0.45)]" />}
                        label="Out of range"
                        detail="Dimmed, no cursor"
                    />
                </div>
            </div>

            {/* Terrain Modifiers */}
            <div>
                <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-2">
                    Terrain Defense Modifiers
                </div>
                <div className="space-y-0.5">
                    <LegendItem
                        swatch={<span className="text-[12px]">&#9968;</span>}
                        label="Mountain"
                        detail="+50% defense"
                    />
                    <LegendItem
                        swatch={<span className="text-[12px]">&#9651;</span>}
                        label="Hilly"
                        detail="+30% defense"
                    />
                    <LegendItem
                        swatch={<span className="text-[12px]">&#127795;</span>}
                        label="Rolling/Forest"
                        detail="+15% defense"
                    />
                    <LegendItem
                        swatch={<span className="text-[12px]">&#9866;</span>}
                        label="Flat"
                        detail="No bonus"
                    />
                    <LegendItem
                        swatch={<span className="text-[12px] text-blue-500">&#126;</span>}
                        label="River crossing"
                        detail="Attack penalty"
                    />
                </div>
            </div>
        </div>
    );
}
