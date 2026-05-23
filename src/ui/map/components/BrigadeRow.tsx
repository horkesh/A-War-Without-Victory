import { memo } from 'react';
import type { FormationView } from '../data/types';
import { FACTION_BG_SUBTLE, FACTION_COLORS } from '../utils/theme';
import { toTitleCase } from '../utils/formatters';
import { getPrestigeTier, getPrestigeTierColor, getHighestTier, getDecorationName } from '../utils/decorationUtils';
import { Icon } from './icons/Icon';
import { t, type MessageKey } from '../i18n';

const STATUS_BADGE: Record<string, { class: string; labelKey: MessageKey }> = {
  assigned: { class: 'text-text-secondary border-text-secondary/40', labelKey: 'brigadeRow.status.assigned' },
  reserve: { class: 'text-blue-400 border-blue-400/40', labelKey: 'brigadeRow.status.reserve' },
  'in-combat': { class: 'text-red-400 border-red-400/50', labelKey: 'brigadeRow.status.inCombat' },
  active: { class: 'text-text-secondary border-text-secondary/30', labelKey: 'brigadeRow.status.active' },
  disrupted: { class: 'text-red-400 border-red-400/50', labelKey: 'brigadeRow.status.disrupted' },
  forming: { class: 'text-amber-400 border-amber-400/40', labelKey: 'brigadeRow.status.forming' },
};

const STANCE_STRIPE: Record<string, string> = {
  attack: 'border-l-red-500/80',
  assault: 'border-l-red-600/80',
  defend: 'border-l-blue-400/70',
  defend_at_all_costs: 'border-l-blue-500/80',
  hold: 'border-l-slate-400/60',
  probe: 'border-l-amber-400/70',
};

export interface BrigadeRowProps {
  formation: FormationView;
  compact?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  onHoverChange?: (hovered: boolean, e?: React.MouseEvent) => void;
}

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

export const BrigadeRow = memo(function BrigadeRow({ formation, compact, highlighted = false, onClick, onHoverChange }: BrigadeRowProps) {
  const cohesion = Math.round(Math.max(0, Math.min(100, formation.cohesion ?? 0)));
  const filledSegments = Math.ceil(cohesion / 20);
  const bgFaction = FACTION_BG_SUBTLE[formation.faction] ?? 'bg-panel-border';
  const factionText = FACTION_COLORS[formation.faction] ?? 'text-text-primary';
  const supplyState = getSupplyState(formation);
  const rowClass = onClick ? 'cursor-pointer' : '';
  const fat = Math.round(formation.fatigue);
  const fatClass = fat >= 50 ? 'text-faction-rs font-bold' : fat >= 30 ? 'text-accent-gold' : 'text-text-secondary';
  const supplyColor = SUPPLY_DOT_CLASS[supplyState];

  // Stance-colored left stripe
  const stanceStripe = STANCE_STRIPE[formation.posture ?? ''] ?? 'border-l-transparent';

  const decorations = formation.decorations ?? [];
  const prestigeTier = getPrestigeTier(decorations);
  const prestigePipColor = getPrestigeTierColor(prestigeTier);

  // Status determination — disrupted overrides normal status
  const isDisrupted = (formation.disrupted_turns ?? 0) > 0;
  const displayStatus = isDisrupted ? 'disrupted' : formation.status;
  const badge = STATUS_BADGE[displayStatus] ?? STATUS_BADGE.active;

  const containerClasses = [
    'flex items-center gap-1.5 font-mono text-xs border-b border-panel-border/50 last:border-b-0 px-2',
    `border-l-2 ${stanceStripe}`,
    compact ? 'py-1' : 'py-1.5',
    rowClass,
    highlighted ? 'bg-panel-active/70' : 'hover:bg-panel-hover/80'
  ].join(' ');

  return (
    <button
      type="button"
      className={containerClasses}
      onClick={onClick}
      onMouseEnter={(e) => onHoverChange?.(true, e)}
      onMouseLeave={(e) => onHoverChange?.(false, e)}
      data-formation-id={formation.id}
      data-highlighted={highlighted ? 'true' : 'false'}
      title={t('brigadeRow.title', { supply: supplyState.toUpperCase(), fatigue: fat, cohesion })}
    >
      {/* Supply dot */}
      <span className={`shrink-0 text-[14px] leading-none ${supplyColor}`} aria-label={supplyState}>●</span>

      {/* Brigade name */}
      <span className={`truncate min-w-0 flex-1 ${factionText}`}>{formation.name}</span>

      {/* Prestige pip */}
      {prestigeTier > 0 && (() => {
        const ht = getHighestTier(decorations);
        const dn = ht ? getDecorationName(formation.faction ?? '', ht) : '';
        return (
          <span className={`shrink-0 text-[9px] leading-none ${prestigePipColor}`} title={dn}>
            <Icon name="star" size={9} />
          </span>
        );
      })()}

      {/* Personnel count */}
      {formation.personnel != null && (
        <span className="shrink-0 text-[10px] tabular-nums text-text-secondary flex items-center gap-0.5" title={t('brigadeRow.personnelTitle', { personnel: formation.personnel.toLocaleString() })}>
          <Icon name="personnel" size={9} />
          {formation.personnel >= 1000 ? `${(formation.personnel / 1000).toFixed(1)}k` : formation.personnel}
        </span>
      )}

      {/* Cohesion bar */}
      <div className="flex items-center gap-0.5 shrink-0" aria-label={t('brigadeRow.cohesionAria', { cohesion })}>
        {Array.from({ length: 5 }, (_, idx) => (
          <span
            key={idx}
            className={`block h-1.5 w-2 rounded-sm ${idx < filledSegments ? bgFaction : 'bg-panel-card'}`}
          />
        ))}
      </div>

      {/* Fatigue */}
      <div className={`w-5 text-right shrink-0 tabular-nums text-[10px] ${fatClass} flex items-center justify-end gap-0.5`} aria-label={t('brigadeRow.fatigueAria', { fatigue: fat })}>
        <Icon name="fatigue" size={8} />
        {fat}
      </div>

      {/* Status badge — rubber stamp style */}
      <span
        className={`shrink-0 text-[8px] uppercase px-1 py-px rounded border font-bold tracking-wider ${badge.class}`}
        style={{ transform: 'rotate(-1.5deg)' }}
      >
        {t(badge.labelKey)}
      </span>
    </button>
  );
});
