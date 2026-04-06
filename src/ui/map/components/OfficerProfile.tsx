import type { NamedOfficerView } from '../data/types';
import {
    getArchetype,
    getCompetenceLabel,
    getAggressionLabel,
    getDefenseLabel,
    getReliabilityLabel,
    getOriginDisplay,
    formatRank,
    getRatingColor,
    formatPips,
    formatCombatRecord,
    formatTenure,
    getRankStarCount,
    getRankHasBar,
    getRankDisplayName,
    getRankInsigniaColor,
} from '../utils/officerCharacter';
import { WarCrimesBadge } from './WarCrimesBadge';

interface OfficerProfileProps {
    officer: NamedOfficerView;
    label: string;
    /** Show all three stat rows (default: true). When false, shows only competence + one context stat. */
    compact?: boolean;
    /** Which secondary stat to emphasize in compact mode. Ignored when compact is false. */
    emphasis?: 'aggression' | 'defense';
    /** Additional CSS classes on the root element (e.g. spacing). */
    className?: string;
}

export function OfficerProfile({ officer, label, compact = false, emphasis = 'aggression', className }: OfficerProfileProps) {
    const origin = getOriginDisplay(officer.origin);
    const archetype = getArchetype(officer);
    const rank = formatRank(officer.rank);

    return (
        <div className={`p-2 bg-black/20 rounded border border-panel-border/30 space-y-1.5${className ? ` ${className}` : ''}`}>
            {/* Header: label + origin badge */}
            <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase text-text-secondary tracking-wider font-semibold">{label}</div>
                <span
                    className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-black/30 border border-panel-border/30 ${origin.color}`}
                    title={origin.label === 'JNA' ? "Yugoslav People's Army (JNA) — pre-war military service" : undefined}
                >
                    {origin.label}
                </span>
            </div>

            {/* Insignia + Name + archetype */}
            <div className="flex items-start gap-2">
                <RankInsignia rank={officer.rank} faction={officer.faction} />
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-accent-gold truncate">
                        {rank} {officer.name}
                        {officer.acting_commander && <span className="text-[9px] text-text-secondary ml-1 font-normal">(Acting)</span>}
                    </div>
                    <div className="text-[9px] text-text-secondary italic">{archetype}</div>
                </div>
            </div>

            {/* Stat pips */}
            <div className="space-y-0.5">
                <StatRow label="Competence" value={officer.competence} descriptor={getCompetenceLabel(officer.competence)} />
                {(!compact || emphasis === 'aggression') && (
                    <StatRow label="Aggression" value={officer.aggressiveness} descriptor={getAggressionLabel(officer.aggressiveness)} />
                )}
                {(!compact || emphasis === 'defense') && (
                    <StatRow label="Defense" value={officer.defensive_skill} descriptor={getDefenseLabel(officer.defensive_skill)} />
                )}
                {!compact && (
                    <StatRow label="Loyalty" value={officer.political_reliability} descriptor={getReliabilityLabel(officer.political_reliability)} />
                )}
            </div>

            {/* Combat record + tenure (when available) */}
            {(officer.battles > 0 || officer.turns_in_command > 0) && (
                <div className="flex gap-3 text-[9px] text-text-secondary pt-0.5 border-t border-panel-border/20">
                    {officer.battles > 0 && <span>{formatCombatRecord(officer.battles, officer.victories)}</span>}
                    {officer.turns_in_command > 0 && <span>{formatTenure(officer.turns_in_command)}</span>}
                </div>
            )}

            {/* Experience & competence growth */}
            {(officer.operations_commanded != null && officer.operations_commanded > 0) && (
                <div className="space-y-0.5 pt-0.5 border-t border-panel-border/20">
                    <div className="flex items-center gap-2 text-[9px]">
                        <span className="text-text-secondary w-[62px] shrink-0">Ops Led</span>
                        <span className="font-mono text-accent-gold">{officer.operations_commanded}</span>
                        {officer.initial_competence != null && officer.competence > officer.initial_competence && (
                            <span className="text-green-400 text-[8px]">
                                +{(officer.competence - officer.initial_competence).toFixed(1)} comp
                            </span>
                        )}
                    </div>
                    {officer.experience_points != null && officer.experience_points > 0 && (
                        <div className="flex items-center gap-1 text-[9px]">
                            <span className="text-text-secondary w-[62px] shrink-0">XP</span>
                            <div className="flex-1 h-1 bg-black/40 rounded overflow-hidden">
                                <div
                                    className="h-full bg-accent-gold/70 rounded"
                                    style={{ width: `${Math.min(100, (officer.experience_points / 2) * 100)}%` }}
                                />
                            </div>
                            <span className="font-mono text-text-secondary">{officer.experience_points.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Casualty vulnerability indicator */}
            {officer.casualty_vulnerability != null && officer.casualty_vulnerability >= 0.10 && (
                <div className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    officer.casualty_vulnerability >= 0.15
                        ? 'bg-red-900/30 border border-red-500/40 text-red-400'
                        : 'bg-amber-900/30 border border-amber-500/40 text-amber-400'
                }`}>
                    {officer.casualty_vulnerability >= 0.15 ? 'HIGH RISK' : 'MODERATE RISK'}
                </div>
            )}

            {/* War crimes record */}
            {officer.war_crimes_record && (
                <WarCrimesBadge record={officer.war_crimes_record} />
            )}
        </div>
    );
}

function StatRow({ label, value, descriptor }: { label: string; value: number; descriptor: string }) {
    const color = getRatingColor(value);
    return (
        <div className="flex items-center gap-2 text-[9px]">
            <span className="text-text-secondary w-[62px] shrink-0">{label}</span>
            <span className={`font-mono tracking-tight ${color}`}>{formatPips(value)}</span>
            <span className="text-text-secondary">{descriptor}</span>
        </div>
    );
}

/**
 * Visual rank insignia — CSS-only stars on a faction-colored shoulder board.
 *
 * Historically accurate for the 1992-1995 Bosnian War. All three factions
 * inherited the JNA five-pointed star insignia system:
 *   3 stars = General-pukovnik / General-bojnik (army commander)
 *   2 stars = General-major (corps commander)
 *   1 star + bar = Pukovnik / Colonel (deputy / senior field officer)
 */
function RankInsignia({ rank, faction }: { rank: string; faction: string }) {
    const starCount = getRankStarCount(rank);
    const hasBar = getRankHasBar(rank);
    const color = getRankInsigniaColor(faction);
    const title = getRankDisplayName(rank, faction);

    return (
        <div
            className="flex flex-col items-center justify-center shrink-0 rounded border border-white/10"
            style={{
                width: 40,
                height: 28,
                backgroundColor: `${color}18`,
                borderColor: `${color}40`,
            }}
            title={title}
        >
            {/* Stars row */}
            <div className="flex items-center gap-px">
                {Array.from({ length: starCount }).map((_, i) => (
                    <span
                        key={i}
                        className="leading-none"
                        style={{ color, fontSize: starCount >= 3 ? 9 : 10 }}
                    >
                        {'\u2605'}
                    </span>
                ))}
            </div>
            {/* Bar beneath stars for colonel rank */}
            {hasBar && (
                <div
                    className="rounded-sm mt-px"
                    style={{ width: 14, height: 2, backgroundColor: color, opacity: 0.7 }}
                />
            )}
        </div>
    );
}
