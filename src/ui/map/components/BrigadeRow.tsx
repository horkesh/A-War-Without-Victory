import type { FormationView } from '../data/types';
import { FACTION_BG_SUBTLE, FACTION_COLORS } from '../utils/theme';
import { toTitleCase } from '../utils/formatters';

const STATUS_BADGE: Record<string, string> = {
  assigned: 'bg-panel-hover text-text-secondary',
  reserve: 'bg-panel-card text-text-secondary',
  'in-combat': 'bg-panel-active text-text-primary',
  active: 'bg-panel-hover text-text-secondary',
};

export interface BrigadeRowProps {
  formation: FormationView;
  compact?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  onHoverChange?: (hovered: boolean, e?: React.MouseEvent) => void;
}

/**
 * Single brigade row for OOB sidebar: supply dot, cohesion segments, status badge.
 */
function getSupplyState(formation: FormationView): 'supplied' | 'strained' | 'cutoff' {
  const status = formation.status.toLowerCase();
  const cohesion = formation.cohesion ?? 0;
  if (status.includes('cut') || status.includes('isolated')) return 'cutoff';
  if (formation.fatigue >= 30 || cohesion < 35) return 'strained';
  return 'supplied';
}

const SUPPLY_DOT_CLASS: Record<'supplied' | 'strained' | 'cutoff', string> = {
  supplied: 'text-faction-rbih',
  strained: 'text-accent-gold',
  cutoff: 'text-faction-rs',
};

export function BrigadeRow({ formation, compact, highlighted = false, onClick, onHoverChange }: BrigadeRowProps) {
  const cohesion = Math.max(0, Math.min(100, formation.cohesion ?? 0));
  const filledSegments = Math.ceil(cohesion / 20);
  const statusClass = STATUS_BADGE[formation.status] ?? STATUS_BADGE.active;
  const bgFaction = FACTION_BG_SUBTLE[formation.faction] ?? 'bg-panel-border';
  const factionText = FACTION_COLORS[formation.faction] ?? 'text-text-primary';
  const supplyState = getSupplyState(formation);
  const rowClass = onClick ? 'cursor-pointer' : '';
  const fat = formation.fatigue;
  const fatClass = fat >= 50 ? 'text-faction-rs font-bold' : fat >= 30 ? 'text-accent-gold' : 'text-text-secondary';

  return (
    <div
      className={`flex items-center gap-2 font-mono text-xs border-b border-panel-border/50 last:border-b-0 px-2 ${compact ? 'py-1' : 'py-1.5'} ${rowClass} ${highlighted ? 'bg-panel-active/70' : 'hover:bg-panel-hover/80'}`}
      onClick={onClick}
      onMouseEnter={(e) => onHoverChange?.(true, e)}
      onMouseLeave={(e) => onHoverChange?.(false, e)}
      data-formation-id={formation.id}
      data-highlighted={highlighted ? 'true' : 'false'}
      title={`Supply: ${supplyState.toUpperCase()} | Fatigue: ${fat} | Cohesion: ${cohesion}%`}
    >
      <span className={`shrink-0 text-[14px] leading-none ${SUPPLY_DOT_CLASS[supplyState]}`} aria-label={supplyState}>●</span>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bgFaction}`} />
      <span className={`truncate min-w-0 flex-1 ${factionText}`}>{formation.name}</span>
      <div className="flex items-center gap-0.5 shrink-0" aria-label={`cohesion ${cohesion}`}>
        {Array.from({ length: 5 }, (_, idx) => (
          <span
            key={idx}
            className={`block h-1.5 w-2 rounded-sm ${idx < filledSegments ? bgFaction : 'bg-panel-card'}`}
          />
        ))}
      </div>
      <div className={`w-6 text-right shrink-0 tabular-nums ${fatClass}`} aria-label={`fatigue ${fat}`}>
        {fat}
      </div>
      <span className={`shrink-0 text-[10px] uppercase px-1 rounded ${statusClass}`}>
        {toTitleCase(formation.status)}
      </span>
    </div>
  );
}
