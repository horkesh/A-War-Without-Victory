import { useState } from 'react';
import type { FormationView } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';
import { Icon, type IconName } from './icons/Icon';
import { FlipCard } from './army_hq/FlipCard';
import { getPlayerSafeCorpsName, getPlayerSafeOperationPhaseLabel } from '../utils/playerSafeText';
import { Z } from '../../shared/zIndex';
import { t, type MessageKey } from '../i18n';
import {
  addEquipmentCondition,
  emptyEquipmentConditionSummary,
  formatReportedPersonnel,
  sumReportedPersonnel,
  type EquipmentConditionSummary,
} from '../utils/reportedMetrics';

const STANCE_ICON: Record<string, IconName> = {
  offensive: 'offensive', defensive: 'defensive', reorganize: 'reorganizing', balanced: 'balanced', unreported: 'balanced',
};

const STANCE_COLOR: Record<string, string> = {
  offensive: 'border-l-red-500/70',
  defensive: 'border-l-blue-400/70',
  balanced: 'border-l-amber-400/70',
  reorganize: 'border-l-gray-400/70',
  unreported: 'border-l-gray-400/50',
};

const STANCE_LABEL_KEY: Record<string, MessageKey> = {
  offensive: 'corpsCard.stance.offensive',
  defensive: 'corpsCard.stance.defensive',
  balanced: 'corpsCard.stance.balanced',
  reorganize: 'corpsCard.stance.reorganize',
  unreported: 'corpsCard.stance.unreported',
};

export interface CorpsCardProps {
  corpsId: string;
  corpsName?: string;
  brigades: FormationView[];
  faction: string;
  stance?: string;
  onStanceChange?: (stance: string) => void;
  onHeaderClick?: () => void;
  onHoverOsidsChange?: (osids: string[]) => void;
  onOrbatClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  commanderName?: string;
  commanderActing?: boolean;
  commanderLabel?: string;
  commanderDetail?: string;
  /** Number of front sectors assigned to this corps. */
  sectorCount?: number;
  /** Active operation name (if any). */
  activeOperationName?: string;
  /** Active operation phase (if any). */
  activeOperationPhase?: string;
}

function getAvgCohesion(brigades: FormationView[]): number {
  if (brigades.length === 0) return 0;
  return brigades.reduce((s, b) => s + (b.cohesion ?? 0), 0) / brigades.length;
}

function getCohesionBarColor(cohesion: number): string {
  if (cohesion >= 70) return 'bg-emerald-500';
  if (cohesion >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

function formatEquipmentSummary(summary: EquipmentConditionSummary): string {
  const value = `${Math.round(summary.operational)}/${Math.round(summary.total)}`;
  return summary.unreportedCount > 0 ? t('corpsFront.partialEquipment', { value }) : value;
}

function getEquipmentSummary(brigades: FormationView[]): { tanks: EquipmentConditionSummary; arty: EquipmentConditionSummary } {
  const tanks = emptyEquipmentConditionSummary();
  const arty = emptyEquipmentConditionSummary();
  for (const b of brigades) {
    if (b.composition) {
      addEquipmentCondition(tanks, b.composition.tanks, b.composition.tank_condition?.operational);
      addEquipmentCondition(arty, b.composition.artillery, b.composition.artillery_condition?.operational);
    }
  }
  return { tanks, arty };
}

export function CorpsCard({
  corpsId,
  corpsName,
  brigades,
  faction,
  stance,
  onStanceChange,
  onHeaderClick,
  onHoverOsidsChange,
  onOrbatClick,
  onMouseEnter,
  onMouseLeave,
  commanderName,
  commanderActing,
  commanderLabel,
  commanderDetail,
  sectorCount,
  activeOperationName,
  activeOperationPhase,
}: CorpsCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const displayName = getPlayerSafeCorpsName(corpsName, corpsId);
  const factionClass = FACTION_COLORS[faction] ?? 'text-text-primary';
  const totalPersonnelSummary = sumReportedPersonnel(brigades);
  const totalPersonnel = totalPersonnelSummary.reportedTotal;
  const totalPersonnelLabel = formatReportedPersonnel(totalPersonnelSummary, {
    partial: (personnel) => t('corpsFront.partialPersonnel', { personnel }),
    unreported: t('corpsFront.unreported'),
  });
  const avgCohesion = getAvgCohesion(brigades);
  const equip = getEquipmentSummary(brigades);
  const stanceKey = stance ?? 'unreported';
  const stanceBorder = STANCE_COLOR[stanceKey] ?? STANCE_COLOR.unreported;
  const corpsOsids = Array.from(
    new Set(
      brigades
        .flatMap((brigade) => (brigade.location_osid ? [brigade.location_osid] : []))
        .filter((osid): osid is string => typeof osid === 'string' && osid.length > 0)
        .sort((a, b) => a.localeCompare(b))
    )
  );

  const handleBodyClick = () => {
    setIsFlipped((prev) => !prev);
  };

  // R5: Stance change confirmation — flash + toast
  const stanceLabel = STANCE_LABEL_KEY[stanceKey] ? t(STANCE_LABEL_KEY[stanceKey]) : t('corpsCard.stance.unreported');

  const cardFront = (
    <div
      className={`rounded-lg border border-panel-border bg-panel-card/90 overflow-visible border-l-3 ${stanceBorder}`}
      style={{ position: 'relative', zIndex: Z.CORPS_CARD_LABEL }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onHeaderClick?.(); }}
        className={`w-full px-3 py-2 bg-panel-bg border-b border-panel-border flex items-center justify-between gap-2 ${onHeaderClick ? 'hover:bg-panel-hover transition-colors cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`font-sans text-xs font-semibold uppercase tracking-wide ${factionClass}`}>{displayName}</span>
        <span className="flex items-center gap-1.5 text-[10px] tabular-nums whitespace-nowrap">
          <span className="flex items-center gap-0.5">
            <Icon name="personnel" size={11} color={totalPersonnel >= 8000 ? '#34d399' : totalPersonnel >= 4000 ? '#fbbf24' : '#f87171'} />
            <span className={totalPersonnel >= 8000 ? 'text-emerald-400' : totalPersonnel >= 4000 ? 'text-amber-400' : 'text-red-400'}>{totalPersonnelLabel}</span>
          </span>
          <span className="text-text-secondary">{brigades.length} brigades</span>
        </span>
      </button>

      {/* Corps health bar — average cohesion */}
      <div className="h-[2px] bg-panel-border/50">
        <div className={`h-full ${getCohesionBarColor(avgCohesion)} transition-all`} style={{ width: `${Math.min(100, avgCohesion)}%` }} />
      </div>

      {/* Clickable body area — flips the card */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleBodyClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBodyClick();
          }
        }}
        className="cursor-pointer hover:bg-panel-hover/40 transition-colors"
      >
        {commanderName && (
          <div className="px-3 py-1 text-[10px] bg-panel-bg border-b border-panel-border/50 text-text-secondary">
            <div>{commanderLabel ? `${commanderLabel}:` : t('corpsCard.commanderColon')}</div>
            <div className="text-text-primary font-semibold">{commanderName}{commanderActing ? t('corpsCard.actingSuffix') : ''}</div>
            {commanderDetail && (
              <div className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-amber-400/80">{commanderDetail}</div>
            )}
          </div>
        )}

        {/* R4: Labeled equipment summary row */}
        {(equip.tanks.total > 0 || equip.arty.total > 0) && (
          <div className="px-3 py-1.5 flex items-center gap-4 text-[11px] tabular-nums bg-panel-bg/50 border-b border-panel-border/50 text-text-secondary">
            {equip.tanks.total > 0 && (
              <span className="flex items-center gap-1" title={t('corpsCard.tanksTitle', { operational: Math.round(equip.tanks.operational), total: Math.round(equip.tanks.total) })}>
                <Icon name="tanks" size={13} />
                <span className="text-text-secondary/60 text-[9px] uppercase tracking-wide">{t('corpsCard.tanks')}</span>
                <span className="text-text-primary font-semibold">{formatEquipmentSummary(equip.tanks)}</span>
              </span>
            )}
            {equip.arty.total > 0 && (
              <span className="flex items-center gap-1" title={t('corpsCard.artilleryTitle', { operational: Math.round(equip.arty.operational), total: Math.round(equip.arty.total) })}>
                <Icon name="artillery" size={13} />
                <span className="text-text-secondary/60 text-[9px] uppercase tracking-wide">{t('corpsCard.arty')}</span>
                <span className="text-text-primary font-semibold">{formatEquipmentSummary(equip.arty)}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[10px] uppercase text-accent-gold font-sans tracking-wide font-semibold flex items-center gap-1" title={t('corpsCard.stanceTitle')}>
            <Icon name={STANCE_ICON[stanceKey] ?? 'balanced'} size={11} />
            {t('corpsCard.stance')}
          </span>
          {onStanceChange ? (
            <select
              value={stanceKey}
              onChange={(event) => onStanceChange(event.target.value)}
              onClick={(e) => e.stopPropagation()}
              aria-label={t('corpsCard.stanceAria')}
              className="bg-panel-bg border border-panel-border rounded px-1.5 py-0.5 text-[10px] font-mono text-text-primary focus:outline-none"
            >
              {stanceKey === 'unreported' && (
                <option value="unreported" disabled>{t('corpsCard.stance.unreported')}</option>
              )}
              <option value="defensive" title={t('corpsCard.stance.defensiveTitle')}>{t('corpsCard.stance.defensive')}</option>
              <option value="balanced" title={t('corpsCard.stance.balancedTitle')}>{t('corpsCard.stance.balanced')}</option>
              <option value="offensive" title={t('corpsCard.stance.offensiveTitle')}>{t('corpsCard.stance.offensive')}</option>
              <option value="reorganize" title={t('corpsCard.stance.reorganizeTitle')}>{t('corpsCard.stance.reorganize')}</option>
            </select>
          ) : (
            <span className="rounded border border-panel-border bg-panel-bg px-1.5 py-0.5 text-[10px] font-mono uppercase text-text-primary">
              {stanceLabel}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOrbatClick?.(); }}
          className="px-2 py-0.5 bg-accent-gold/10 hover:bg-accent-gold/20 border border-accent-gold/50 rounded text-[10px] text-accent-gold font-bold uppercase tracking-wider transition-colors"
        >
          {t('corpsCard.orbat')}
        </button>
      </div>
    </div>
  );

  const cardBack = (
    <div
      className={`rounded-lg border border-panel-border bg-panel-card/90 overflow-hidden border-l-3 ${stanceBorder}`}
    >
      {/* Back header with flip-back button */}
      <div className="w-full px-3 py-2 bg-panel-bg border-b border-panel-border flex items-center justify-between gap-2">
        <span className={`font-sans text-xs font-semibold uppercase tracking-wide ${factionClass}`}>{displayName}</span>
        <button
          type="button"
          onClick={() => setIsFlipped(false)}
          className="text-[10px] text-text-secondary hover:text-text-primary transition-colors font-mono"
        >
          {t('corpsCard.back')}
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Commander profile */}
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">{commanderLabel ?? t('corpsCard.commander')}</div>
          {commanderName ? (
            <>
              <div className="text-[11px] text-text-primary font-semibold">
                {commanderName}{commanderActing ? t('corpsCard.actingSuffix') : ''}
              </div>
              {commanderDetail && (
                <div className="mt-0.5 text-[10px] text-amber-400/80">{commanderDetail}</div>
              )}
            </>
          ) : (
            <div className="text-[11px] text-amber-500/60 italic">{t('corpsCard.unassigned')}</div>
          )}
        </div>

        {/* Sector overview */}
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">{t('corpsCard.frontSectors')}</div>
          <div className="text-[11px] text-text-primary tabular-nums">
            {sectorCount != null && sectorCount > 0
              ? t(sectorCount === 1 ? 'corpsCard.sectorCount.one' : 'corpsCard.sectorCount.many', { count: sectorCount })
              : <span className="text-text-secondary italic">{t('corpsCard.noActiveSectors')}</span>
            }
          </div>
        </div>

        {/* Operation status */}
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">{t('corpsCard.operations')}</div>
          {activeOperationName ? (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <div className="text-[11px]">
                <span className="text-red-400 font-bold uppercase">{activeOperationName}</span>
                {activeOperationPhase && (
                  <span className="text-text-secondary ml-1.5">({getPlayerSafeOperationPhaseLabel(activeOperationPhase)})</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-text-secondary italic">{t('corpsCard.noActiveOperations')}</div>
          )}
        </div>

        {/* Quick stats */}
        <div className="pt-1 border-t border-panel-border/30">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <span className="text-text-secondary">{t('corpsCard.personnel')}</span>
            <span className="text-text-primary tabular-nums font-semibold">{totalPersonnelLabel}</span>
            <span className="text-text-secondary">{t('corpsCard.brigades')}</span>
            <span className="text-text-primary tabular-nums font-semibold">{brigades.length}</span>
            <span className="text-text-secondary">{t('corpsCard.avgCohesion')}</span>
            <span className={`tabular-nums font-semibold ${avgCohesion >= 70 ? 'text-emerald-400' : avgCohesion >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {Math.round(avgCohesion)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <FlipCard
      isFlipped={isFlipped}
      front={
        <div
          onMouseEnter={() => {
            onHoverOsidsChange?.(corpsOsids);
            onMouseEnter?.();
          }}
          onMouseLeave={() => {
            onHoverOsidsChange?.([]);
            onMouseLeave?.();
          }}
        >
          {cardFront}
        </div>
      }
      back={cardBack}
    />
  );
}
