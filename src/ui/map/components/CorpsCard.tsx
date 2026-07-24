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
  type ReportedMetricSummary,
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
  commanderSourceUnreported?: boolean;
  commanderActing?: boolean;
  commanderLabel?: string;
  commanderDetail?: string;
  /** Number of front sectors assigned to this corps. */
  sectorCount?: number;
  /** Active operation name (if any). */
  activeOperationName?: string;
  /** Active operation phase (if any). */
  activeOperationPhase?: string;
  /** True when the phase fallback is a placeholder rather than reported lifecycle truth. */
  activeOperationPhaseUnreported?: boolean;
}

function getAvgCohesion(brigades: FormationView[]): number | null {
  const reported = brigades
    .map((b) => b.cohesion)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (reported.length === 0) return null;
  return reported.reduce((sum, value) => sum + value, 0) / reported.length;
}

function getCohesionBarColor(cohesion: number | null): string {
  if (cohesion == null) return 'bg-panel-border';
  if (cohesion >= 70) return 'bg-emerald-500';
  if (cohesion >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

function formatEquipmentSummary(summary: EquipmentConditionSummary): string {
  if (summary.unreportedCount > 0 && summary.reportedCount === 0) return t('corpsFront.unreported');
  const value = `${Math.round(summary.operational)}/${Math.round(summary.total)}`;
  return summary.unreportedCount > 0 ? t('corpsFront.partialEquipment', { value }) : value;
}

function formatEquipmentTitle(
  kind: 'tanks' | 'artillery',
  summary: EquipmentConditionSummary,
): string {
  if (summary.unreportedCount > 0) {
    return t(kind === 'tanks' ? 'corpsCard.tanksTitleSparse' : 'corpsCard.artilleryTitleSparse', {
      value: formatEquipmentSummary(summary),
    });
  }
  return t(kind === 'tanks' ? 'corpsCard.tanksTitle' : 'corpsCard.artilleryTitle', {
    operational: Math.round(summary.operational),
    total: Math.round(summary.total),
  });
}

function activeOperationPhaseLabel(phase: string, unreported?: boolean): string {
  return unreported ? getPlayerSafeOperationPhaseLabel(null) : getPlayerSafeOperationPhaseLabel(phase);
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

function getPersonnelTone(summary: ReportedMetricSummary): { textClass: string; iconColor: string; state: string; colorState: string } {
  if (summary.totalCount === 0 || summary.reportedCount === 0) {
    return { textClass: 'text-text-secondary', iconColor: '#94a3b8', state: 'unreported', colorState: 'neutral' };
  }
  if (summary.unreportedCount > 0) {
    return { textClass: 'text-amber-400', iconColor: '#fbbf24', state: 'partial', colorState: 'partial' };
  }
  if (summary.reportedTotal >= 8000) {
    return { textClass: 'text-emerald-400', iconColor: '#34d399', state: 'complete-strong', colorState: 'complete-strong' };
  }
  if (summary.reportedTotal >= 4000) {
    return { textClass: 'text-amber-400', iconColor: '#fbbf24', state: 'complete-moderate', colorState: 'complete-moderate' };
  }
  return { textClass: 'text-red-400', iconColor: '#f87171', state: 'complete-thin', colorState: 'complete-thin' };
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
  commanderSourceUnreported,
  commanderActing,
  commanderLabel,
  commanderDetail,
  sectorCount,
  activeOperationName,
  activeOperationPhase,
  activeOperationPhaseUnreported,
}: CorpsCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const displayName = getPlayerSafeCorpsName(corpsName, corpsId);
  const factionClass = FACTION_COLORS[faction] ?? 'text-text-primary';
  const totalPersonnelSummary = sumReportedPersonnel(brigades);
  const totalPersonnelLabel = formatReportedPersonnel(totalPersonnelSummary, {
    partial: (personnel) => t('corpsFront.partialPersonnel', { personnel }),
    unreported: t('corpsFront.unreported'),
  });
  const personnelTone = getPersonnelTone(totalPersonnelSummary);
  const avgCohesion = getAvgCohesion(brigades);
  const equip = getEquipmentSummary(brigades);
  const stanceKey = stance ?? 'unreported';
  const stanceBorder = STANCE_COLOR[stanceKey] ?? STANCE_COLOR.unreported;
  const brigadeCountLabel = t(
    brigades.length === 1 ? 'corpsCard.fieldedBrigades.one' : 'corpsCard.fieldedBrigades.many',
    { count: brigades.length }
  );
  const flipToDetailsLabel = t('corpsCard.showDetails', { corps: displayName });
  const flipToSummaryLabel = t('corpsCard.showSummary', { corps: displayName });
  const openOrbatLabel = t('corpsCard.openOrbat', { corps: displayName });
  const corpsHeaderLabel = t('corpsCard.headerAria', {
    corps: displayName,
    personnel: totalPersonnelLabel,
    brigades: brigadeCountLabel,
  });
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

  const headerContent = (
    <>
      <span className={`font-sans text-xs font-semibold uppercase tracking-wide ${factionClass}`}>{displayName}</span>
      <span className="flex items-center gap-1.5 text-xs tabular-nums whitespace-nowrap">
        <span className="flex items-center gap-0.5">
          <span data-testid="corps-card-personnel-icon" data-color={personnelTone.colorState}>
            <Icon name="personnel" size={11} color={personnelTone.iconColor} />
          </span>
          <span
            data-testid="corps-card-personnel"
            data-report-state={personnelTone.state}
            className={personnelTone.textClass}
          >
            {totalPersonnelLabel}
          </span>
        </span>
        <span className="text-text-secondary">{brigadeCountLabel}</span>
      </span>
    </>
  );

  const cardFront = (
    <div
      className={`rounded-lg border border-panel-border bg-panel-card/90 overflow-visible border-l-3 ${stanceBorder}`}
      style={{ position: 'relative', zIndex: Z.CORPS_CARD_LABEL }}
    >
      {onHeaderClick ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onHeaderClick(); }}
          aria-label={corpsHeaderLabel}
          title={corpsHeaderLabel}
          className="w-full px-3 py-2 bg-panel-bg border-b border-panel-border flex items-center justify-between gap-2 hover:bg-panel-hover transition-colors cursor-pointer"
        >
          {headerContent}
        </button>
      ) : (
        <div className="w-full px-3 py-2 bg-panel-bg border-b border-panel-border flex items-center justify-between gap-2 cursor-default">
          {headerContent}
        </div>
      )}

      {/* Corps health bar — average cohesion */}
      <div className="h-[2px] bg-panel-border/50">
        <div className={`h-full ${getCohesionBarColor(avgCohesion)} transition-all`} style={{ width: `${avgCohesion == null ? 100 : Math.min(100, avgCohesion)}%` }} />
      </div>

      {/* Clickable body area — flips the card */}
      <div
        role="button"
        tabIndex={0}
        aria-label={flipToDetailsLabel}
        title={flipToDetailsLabel}
        onClick={handleBodyClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBodyClick();
          }
        }}
        className="cursor-pointer hover:bg-panel-hover/40 transition-colors"
      >
        {(commanderName || commanderSourceUnreported) && (
          <div className="px-3 py-1 text-xs bg-panel-bg border-b border-panel-border/50 text-text-secondary">
            <div>{commanderLabel ? `${commanderLabel}:` : t('corpsCard.commanderColon')}</div>
            <div className={`${commanderSourceUnreported ? 'text-text-secondary italic' : 'text-text-primary font-semibold'}`}>
              {commanderSourceUnreported ? t('corpsCard.commanderUnreported') : <>{commanderName}{commanderActing ? t('corpsCard.actingSuffix') : ''}</>}
            </div>
            {commanderDetail && (
              <div className="mt-0.5 text-xs uppercase tracking-[0.08em] text-amber-400/80">{commanderDetail}</div>
            )}
          </div>
        )}

        {/* R4: Labeled equipment summary row */}
        {(equip.tanks.total > 0 || equip.arty.total > 0) && (
          <div className="px-3 py-1.5 flex items-center gap-4 text-xs tabular-nums bg-panel-bg/50 border-b border-panel-border/50 text-text-secondary">
            {equip.tanks.total > 0 && (
              <span className="flex items-center gap-1" title={formatEquipmentTitle('tanks', equip.tanks)}>
                <Icon name="tanks" size={13} />
                <span className="text-text-secondary text-xs uppercase tracking-wide">{t('corpsCard.tanks')}</span>
                <span className="text-text-primary font-semibold">{formatEquipmentSummary(equip.tanks)}</span>
              </span>
            )}
            {equip.arty.total > 0 && (
              <span className="flex items-center gap-1" title={formatEquipmentTitle('artillery', equip.arty)}>
                <Icon name="artillery" size={13} />
                <span className="text-text-secondary text-xs uppercase tracking-wide">{t('corpsCard.arty')}</span>
                <span className="text-text-primary font-semibold">{formatEquipmentSummary(equip.arty)}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs uppercase text-accent-gold font-sans tracking-wide font-semibold flex items-center gap-1" title={t('corpsCard.stanceTitle')}>
            <Icon name={STANCE_ICON[stanceKey] ?? 'balanced'} size={11} />
            {t('corpsCard.stance')}
          </span>
          {onStanceChange ? (
            <select
              value={stanceKey}
              onChange={(event) => onStanceChange(event.target.value)}
              onClick={(e) => e.stopPropagation()}
              aria-label={t('corpsCard.stanceAria')}
              className="bg-panel-bg border border-panel-border rounded px-1.5 py-0.5 text-xs font-mono text-text-primary focus:outline-none"
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
            <span className="rounded border border-panel-border bg-panel-bg px-1.5 py-0.5 text-xs font-mono uppercase text-text-primary">
              {stanceLabel}
            </span>
          )}
        </div>

        {onOrbatClick && (
          <button
            type="button"
            aria-label={openOrbatLabel}
            title={openOrbatLabel}
            onClick={(e) => { e.stopPropagation(); onOrbatClick(); }}
            className="px-2 py-0.5 bg-accent-gold/10 hover:bg-accent-gold/20 border border-accent-gold/50 rounded text-xs text-accent-gold font-bold uppercase tracking-wider transition-colors"
          >
            {t('corpsCard.orbat')}
          </button>
        )}
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
          aria-label={flipToSummaryLabel}
          title={flipToSummaryLabel}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors font-mono"
        >
          {t('corpsCard.back')}
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Commander profile */}
        <div>
          <div className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-1">{commanderLabel ?? t('corpsCard.commander')}</div>
          {commanderName ? (
            <>
              <div className="text-xs text-text-primary font-semibold">
                {commanderName}{commanderActing ? t('corpsCard.actingSuffix') : ''}
              </div>
              {commanderDetail && (
                <div className="mt-0.5 text-xs text-amber-400/80">{commanderDetail}</div>
              )}
            </>
          ) : commanderSourceUnreported ? (
            <div className="text-xs text-text-secondary italic">{t('corpsCard.commanderUnreported')}</div>
          ) : (
            <div className="text-xs text-amber-500/60 italic">{t('corpsCard.unassigned')}</div>
          )}
        </div>

        {/* Sector overview */}
        <div>
          <div className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-1">{t('corpsCard.frontSectors')}</div>
          <div className="text-xs text-text-primary tabular-nums">
            {sectorCount != null && sectorCount > 0
              ? t(sectorCount === 1 ? 'corpsCard.sectorCount.one' : 'corpsCard.sectorCount.many', { count: sectorCount })
              : <span className="text-text-secondary italic">{t('corpsCard.noActiveSectors')}</span>
            }
          </div>
        </div>

        {/* Operation status */}
        <div>
          <div className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-1">{t('corpsCard.operations')}</div>
          {activeOperationName ? (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <div className="text-xs">
                <span className="text-red-400 font-bold uppercase">{activeOperationName}</span>
                {activeOperationPhase && (
                  <span className="text-text-secondary ml-1.5">({activeOperationPhaseLabel(activeOperationPhase, activeOperationPhaseUnreported)})</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-secondary italic">{t('corpsCard.noActiveOperations')}</div>
          )}
        </div>

        {/* Quick stats */}
        <div className="pt-1 border-t border-panel-border/30">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-text-secondary">{t('corpsCard.personnel')}</span>
            <span className="text-text-primary tabular-nums font-semibold">{totalPersonnelLabel}</span>
            <span className="text-text-secondary">{t('corpsCard.fieldedBrigadesLabel')}</span>
            <span className="text-text-primary tabular-nums font-semibold">{brigades.length}</span>
            <span className="text-text-secondary">{t('corpsCard.avgCohesion')}</span>
            <span className={`tabular-nums font-semibold ${avgCohesion == null ? 'text-text-secondary' : avgCohesion >= 70 ? 'text-emerald-400' : avgCohesion >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {avgCohesion == null ? t('corpsFront.unreported') : `${Math.round(avgCohesion)}%`}
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
