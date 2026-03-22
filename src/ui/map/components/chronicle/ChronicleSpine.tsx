import React from 'react';
import { FACTION_HEX_COLORS } from '../../utils/theme.js';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

interface SpineProps {
    turnSummaries: Array<{
        turn: number;
        territory_snapshot?: Partial<Record<string, number>>;
    }>;
}

/**
 * Vertical spine ribbon showing territory % bands per turn.
 * Pure CSS (no canvas). Newest turns at top.
 */
export const ChronicleSpine = React.memo(function ChronicleSpine({ turnSummaries }: SpineProps) {
    const withSnapshots = React.useMemo(
        () =>
            turnSummaries
                .filter((s) => s.territory_snapshot)
                .sort((a, b) => b.turn - a.turn),
        [turnSummaries],
    );

    if (withSnapshots.length === 0) return null;

    return (
        <div className="flex flex-col items-center w-16 shrink-0">
            {withSnapshots.map((summary) => {
                const snap = summary.territory_snapshot!;
                const showLabel = summary.turn % 4 === 0;
                return (
                    <div key={summary.turn} className="flex flex-col items-center w-full py-0.5">
                        {showLabel && (
                            <span className="text-[7px] font-mono text-text-secondary opacity-50 mb-0.5">
                                W{summary.turn}
                            </span>
                        )}
                        <div className="flex w-12 h-1 rounded-full overflow-hidden bg-black/30">
                            {FACTIONS.map((f) => {
                                const pct = (snap[f] ?? 0) * 100;
                                return (
                                    <div
                                        key={f}
                                        style={{
                                            width: `${pct}%`,
                                            backgroundColor: FACTION_HEX_COLORS[f],
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
