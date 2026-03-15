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

const VERDICT_STYLE: Record<string, { border: string; text: string; bg: string }> = {
    convicted: { border: 'border-red-500/50', text: 'text-red-400', bg: 'bg-red-900/20' },
    acquitted: { border: 'border-green-500/50', text: 'text-green-400', bg: 'bg-green-900/20' },
    indicted: { border: 'border-amber-500/50', text: 'text-amber-400', bg: 'bg-amber-900/20' },
    died_before_trial: { border: 'border-neutral-500/50', text: 'text-neutral-400', bg: 'bg-neutral-800/30' },
};

function WarCrimesBadge({ record }: { record: NonNullable<import('../data/types').NamedOfficerView['war_crimes_record']> }) {
    const style = VERDICT_STYLE[record.verdict] ?? VERDICT_STYLE.indicted;
    return (
        <div className={`text-[9px] px-1.5 py-1 rounded border ${style.border} ${style.bg} space-y-0.5`}>
            <div className="flex items-center justify-between gap-2">
                <span className={`font-bold uppercase ${style.text}`}>{record.verdict.replace(/_/g, ' ')}</span>
                <span className="text-text-secondary">{record.court}</span>
            </div>
            {record.sentence && <div className="text-text-secondary">{record.sentence}</div>}
            <div className="text-text-secondary truncate" title={record.summary}>{record.summary}</div>
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
