import type { NamedOfficerView } from '../data/types';
import {
    getArchetype,
    getCompetenceLabel,
    getAggressionLabel,
    getDefenseLabel,
    getOriginDisplay,
    formatRank,
    getRatingColor,
    formatPips,
    formatCombatRecord,
    formatTenure,
} from '../utils/officerCharacter';

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
                <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-black/30 border border-panel-border/30 ${origin.color}`}>
                    {origin.label}
                </span>
            </div>

            {/* Name + archetype */}
            <div>
                <div className="text-xs font-bold text-accent-gold truncate">
                    {rank} {officer.name}
                    {officer.acting_commander && <span className="text-[9px] text-text-secondary ml-1 font-normal">(Acting)</span>}
                </div>
                <div className="text-[9px] text-text-secondary italic">{archetype}</div>
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
            </div>

            {/* Combat record + tenure (when available) */}
            {(officer.battles > 0 || officer.turns_in_command > 0) && (
                <div className="flex gap-3 text-[9px] text-text-secondary pt-0.5 border-t border-panel-border/20">
                    {officer.battles > 0 && <span>{formatCombatRecord(officer.battles, officer.victories)}</span>}
                    {officer.turns_in_command > 0 && <span>{formatTenure(officer.turns_in_command)}</span>}
                </div>
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
