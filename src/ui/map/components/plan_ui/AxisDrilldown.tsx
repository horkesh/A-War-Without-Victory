import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { useGameStore } from '../../store/gameStore';
import { AXIS_COLORS } from './opsConstants';

interface AxisDrilldownProps {
    axis: {
        id: string;
        name: string;
        brigadeIds: string[];
        objectives: string[];
        stagingOsid?: string;
    };
    active: boolean;
    onSelect: () => void;
    onUpdate: (data: any) => void;
    colorIndex: number;
}

export function AxisDrilldown({
    axis,
    active,
    onSelect,
    onUpdate,
    colorIndex
}: AxisDrilldownProps) {
    const osidDisplayNames = useGameStore(s => s.osidDisplayNames);
    const color = AXIS_COLORS[colorIndex % AXIS_COLORS.length];

    return (
        <div
            onClick={onSelect}
            className={`p-4 border rounded transition-all cursor-pointer ${active
                ? 'bg-panel-card border-accent-gold/40 shadow-[0_0_12px_rgba(196,163,90,0.08)]'
                : 'bg-panel-card/50 border-[rgba(180,160,130,0.1)] hover:border-[rgba(180,160,130,0.25)]'
                }`}
        >
            <div className="flex flex-col gap-1 mb-4">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.2em]">Axis Specification</label>
                    {active && <span className="text-[8px] bg-accent-gold/10 text-accent-gold px-1.5 py-0.5 rounded border border-accent-gold/20 font-black">ACTIVE</span>}
                </div>
                <input
                    type="text"
                    value={axis.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    className="bg-transparent border-b border-[rgba(180,160,130,0.15)] py-1 text-sm font-black uppercase text-white focus:border-accent-gold focus:outline-none transition-all"
                    style={{ color }}
                />
            </div>

            {active && (
                <div className="text-[9px] text-text-secondary italic mb-3">
                    Click enemy territory to add objectives. Click friendly territory to set staging.
                </div>
            )}

            {axis.stagingOsid && (
                <div className="p-2 bg-panel-card border border-[rgba(180,160,130,0.1)] rounded flex items-center gap-2">
                    <span className="text-accent-gold text-xs leading-none">&#9670;</span>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-text-secondary uppercase font-black tracking-widest">Staging At</span>
                        <span className="text-xs text-white font-bold">{getOsidDisplayName(axis.stagingOsid, osidDisplayNames)}</span>
                    </div>
                </div>
            )}

            {axis.objectives.length > 0 && (
                <div className="mt-4 space-y-1.5">
                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Planned Sequence</label>
                    <div className="space-y-1">
                        {axis.objectives.map((id, i) => (
                            <div key={id} className="flex items-center gap-3 group">
                                <span className="text-[10px] font-mono text-accent-gold/40">{i + 1}</span>
                                <div className="flex-1 text-xs text-text-secondary font-bold group-hover:text-white transition-colors">{getOsidDisplayName(id, osidDisplayNames)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
