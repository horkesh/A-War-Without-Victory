import { memo, useId } from 'react';
import type { FormationView } from '../data/types';
import { FACTION_BG_SUBTLE, FACTION_COLORS } from '../utils/theme';
import { formatPersonnel, toTitleCase, formatCount } from '../utils/formatters';
import { getPrestigeTier, getPrestigeTierColor, getHighestTier, getDecorationName } from '../utils/decorationUtils';
import { Icon } from './icons/Icon';
import { t, useLocale, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';

const STATUS_BADGE: Record<string, { class: string; labelKey: MessageKey }> = {
  assigned: { class: 'text-text-secondary border-text-secondary/40', labelKey: 'brigadeRow.status.assigned' },
  reserve: { class: 'text-blue-400 border-blue-400/40', labelKey: 'brigadeRow.status.reserve' },
  'in-combat': { class: 'text-red-400 border-red-400/50', labelKey: 'brigadeRow.status.inCombat' },
  active: { class: 'text-text-secondary border-text-secondary/30', labelKey: 'brigadeRow.status.active' },
  disrupted: { class: 'text-red-400 border-red-400/50', labelKey: 'brigadeRow.status.disrupted' },
  forming: { class: 'text-amber-400 border-amber-400/40', labelKey: 'brigadeRow.status.forming' },
  destroyed: { class: 'text-red-500 border-red-500/60', labelKey: 'brigadeRow.status.destroyed' },
  collapsed: { class: 'text-red-500 border-red-500/60', labelKey: 'brigadeRow.status.collapsed' },
  inactive: { class: 'text-text-secondary border-text-secondary/30', labelKey: 'brigadeRow.status.inactive' },
  unavailable: { class: 'text-text-secondary border-text-secondary/30', labelKey: 'brigadeRow.status.unavailable' },
  unreported: { class: 'text-text-secondary border-text-secondary/30', labelKey: 'brigadeRow.status.unreported' },
  recorded: { class: 'text-text-secondary border-text-secondary/30', labelKey: 'brigadeRow.status.recorded' },
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

type SupplyState = 'adequate' | 'strained' | 'critical' | 'unreported';

function getSupplyState(formation: FormationView): SupplyState {
  if (formation.supply_state === 'adequate') return 'adequate';
  if (formation.supply_state === 'strained') return 'strained';
  if (formation.supply_state === 'critical') return 'critical';
  return 'unreported';
}

const SUPPLY_DOT_CLASS: Record<SupplyState, string> = {
  adequate: 'text-faction-rbih',
  strained: 'text-accent-gold',
  critical: 'text-faction-rs',
  unreported: 'text-text-secondary',
};

const SUPPLY_LABEL_KEY: Record<SupplyState, MessageKey> = {
  adequate: 'brigadeRow.supply.supplied',
  strained: 'brigadeRow.supply.strained',
  critical: 'brigadeRow.supply.critical',
  unreported: 'brigadeRow.supply.unreported',
};

export const BrigadeRow = memo(function BrigadeRow({ formation, compact, highlighted = false, onClick, onHoverChange }: BrigadeRowProps) {
  const [locale] = useLocale();
  const descriptionId = useId();
  const formationName = getLocalizedFormationName(formation, locale);
  const reportedCohesion = typeof formation.cohesion === 'number' && Number.isFinite(formation.cohesion)
    ? formation.cohesion
    : null;
  const reportedFatigue = typeof formation.fatigue === 'number' && Number.isFinite(formation.fatigue)
    ? formation.fatigue
    : null;
  const cohesion = reportedCohesion != null ? Math.round(Math.max(0, Math.min(100, reportedCohesion))) : null;
  const filledSegments = cohesion != null ? Math.ceil(cohesion / 20) : 0;
  const bgFaction = FACTION_BG_SUBTLE[formation.faction] ?? 'bg-panel-border';
  const factionText = FACTION_COLORS[formation.faction] ?? 'text-text-primary';
  const supplyState = getSupplyState(formation);
  const rowClass = onClick ? 'cursor-pointer' : '';
  const fat = reportedFatigue != null ? Math.round(reportedFatigue) : null;
  const fatClass = fat == null ? 'text-text-secondary italic' : fat >= 50 ? 'text-faction-rs font-bold' : fat >= 30 ? 'text-accent-gold' : 'text-text-secondary';
  const supplyColor = SUPPLY_DOT_CLASS[supplyState];
  const supplyLabel = t(SUPPLY_LABEL_KEY[supplyState]);
  const cohesionLabel = cohesion == null ? t('corpsFront.unreported') : `${cohesion}%`;
  const fatigueLabel = fat == null ? t('corpsFront.unreported') : String(fat);

  // Stance-colored left stripe
  const stanceStripe = STANCE_STRIPE[formation.posture ?? ''] ?? 'border-l-transparent';

  const decorations = formation.decorations ?? [];
  const prestigeTier = getPrestigeTier(decorations);
  const prestigePipColor = getPrestigeTierColor(prestigeTier);

  // Status determination — disrupted overrides normal status
  const isDisrupted = (formation.disrupted_turns ?? 0) > 0;
  const isForming = String(formation.readiness).toLowerCase() === 'forming';
  const displayStatus = isDisrupted ? 'disrupted' : isForming ? 'forming' : formation.status.toLowerCase();
  const badge = STATUS_BADGE[displayStatus] ?? STATUS_BADGE.recorded;
  const statusLabel = t(badge.labelKey);
  const personnelLabel = formation.personnel != null
    ? t('brigadeRow.personnelAria', { personnel: formatCount(formation.personnel) })
    : t('brigadeRow.personnelAria', { personnel: t('corpsFront.unreported') });
  const rowAriaLabel = t('brigadeRow.ariaLabel', {
    name: formationName,
    personnel: personnelLabel,
    supply: supplyLabel,
    cohesion: cohesionLabel,
    fatigue: fatigueLabel,
    status: toTitleCase(statusLabel.toLocaleLowerCase()),
  });

  const containerClasses = [
    'group w-full flex flex-wrap items-center gap-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold font-mono text-[13px] border-b border-panel-border/50 last:border-b-0 px-2',
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
      title={t('brigadeRow.title', { supply: supplyLabel, fatigue: fatigueLabel, cohesion: cohesionLabel })}
      aria-label={rowAriaLabel}
      aria-describedby={descriptionId}
    >
      <span id={descriptionId} className="sr-only group-focus-visible:not-sr-only group-focus-visible:w-full break-words text-text-secondary">
        {t('brigadeRow.title', { supply: supplyLabel, fatigue: fatigueLabel, cohesion: cohesionLabel })}
      </span>
      {/* Keep the name on its own line so report metrics cannot starve its width. */}
      <span data-testid="brigade-row-name" className={`basis-full w-full break-words min-w-0 ${factionText}`}>{formationName}</span>

      {/* Supply dot */}
      <span className={`shrink-0 text-[14px] leading-none ${supplyColor}`} aria-label={supplyLabel}>●</span>

      {/* Prestige pip */}
      {prestigeTier > 0 && (() => {
        const ht = getHighestTier(decorations);
        const dn = ht ? getDecorationName(formation.faction ?? '', ht) : '';
        return (
          <span className={`shrink-0 text-[13px] leading-none ${prestigePipColor}`} title={dn}>
            <Icon name="star" size={9} />
          </span>
        );
      })()}

      {/* Personnel count */}
      <span className="shrink-0 text-[13px] tabular-nums text-text-secondary flex items-center gap-0.5" title={t('brigadeRow.personnelTitle', { personnel: formatCount(formation.personnel) })}>
        <Icon name="personnel" size={9} />
        {formatPersonnel(formation.personnel)}
      </span>

      {/* Cohesion bar */}
      <div className="flex items-center gap-0.5 shrink-0" aria-label={t('brigadeRow.cohesionAria', { cohesion: cohesionLabel })}>
        {cohesion == null ? (
          <span className="text-[13px] italic text-text-secondary">{t('corpsFront.unreported')}</span>
        ) : (
          Array.from({ length: 5 }, (_, idx) => (
            <span
              key={idx}
              className={`block h-1.5 w-2 rounded-sm ${idx < filledSegments ? bgFaction : 'bg-panel-card'}`}
            />
          ))
        )}
      </div>

      {/* Fatigue */}
      <div className={`min-w-5 text-right shrink-0 tabular-nums text-[13px] ${fatClass} flex items-center justify-end gap-0.5`} aria-label={t('brigadeRow.fatigueAria', { fatigue: fatigueLabel })}>
        <Icon name="fatigue" size={8} />
        {fatigueLabel}
      </div>

      {/* Status badge — rubber stamp style */}
      <span
        className={`shrink-0 text-[13px] uppercase px-1 py-px rounded border font-bold tracking-wider ${badge.class}`}
        style={{ transform: 'rotate(-1.5deg)' }}
      >
        {statusLabel}
      </span>
    </button>
  );
});
