import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormationView } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';
import { Icon, type IconName } from './icons/Icon';
import { FlipCard } from './army_hq/FlipCard';
import { getPlayerSafeCorpsName } from '../utils/playerSafeText';
import { Z } from '../../shared/zIndex';

const STANCE_ICON: Record<string, IconName> = {
  offensive: 'offensive', defensive: 'defensive', reorganize: 'reorganizing', balanced: 'balanced',
};

const STANCE_COLOR: Record<string, string> = {
  offensive: 'border-l-red-500/70',
  defensive: 'border-l-blue-400/70',
  balanced: 'border-l-amber-400/70',
  reorganize: 'border-l-gray-400/70',
};

const STANCE_LABELS: Record<string, string> = {
  offensive: 'Offensive',
  defensive: 'Defensive',
  balanced: 'Balanced',
  reorganize: 'Reorganize',
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

function getEquipmentSummary(brigades: FormationView[]): { tanks: number; arty: number; tanksTotal: number; artyTotal: number } {
  let tanks = 0, arty = 0, tanksTotal = 0, artyTotal = 0;
  for (const b of brigades) {
    if (b.composition) {
      tanks += (b.composition.tanks ?? 0) * (b.composition.tank_condition?.operational ?? 1);
      arty += (b.composition.artillery ?? 0) * (b.composition.artillery_condition?.operational ?? 1);
      tanksTotal += b.composition.tanks ?? 0;
      artyTotal += b.composition.artillery ?? 0;
    }
  }
  return { tanks: Math.round(tanks), arty: Math.round(arty), tanksTotal, artyTotal };
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
  sectorCount,
  activeOperationName,
  activeOperationPhase,
}: CorpsCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const displayName = getPlayerSafeCorpsName(corpsName, corpsId);
  const factionClass = FACTION_COLORS[faction] ?? 'text-text-primary';
  const totalPersonnel = brigades.reduce((s, b) => s + (b.personnel ?? 0), 0);
  const avgCohesion = getAvgCohesion(brigades);
  const equip = getEquipmentSummary(brigades);
  const stanceBorder = STANCE_COLOR[stance ?? 'balanced'] ?? 'border-l-gray-400/70';
  const corpsOsids = Array.from(
    new Set(
      brigades
        .flatMap((brigade) => brigade.aorSettlementIds ?? (brigade.location_osid ? [brigade.location_osid] : []))
        .filter((osid): osid is string => typeof osid === 'string' && osid.length > 0)
        .sort((a, b) => a.localeCompare(b))
    )
  );

  const handleBodyClick = () => {
    setIsFlipped((prev) => !prev);
  };

  // R5: Stance change confirmation — flash + toast
  const [flashActive, setFlashActive] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStanceChange = useCallback((nextStance: string) => {
    onStanceChange?.(nextStance);
    // Flash the card border
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 500);
    // Show toast
    const label = STANCE_LABELS[nextStance] ?? nextStance;
    setToastMsg(`${label} stance set`);
    setToastExiting(false);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastExiting(true);
      setTimeout(() => { setToastMsg(null); setToastExiting(false); }, 200);
    }, 1800);
  }, [onStanceChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  const cardFront = (
    <div
      className={`rounded-lg border border-panel-border bg-panel-card/90 overflow-visible border-l-3 ${stanceBorder} ${flashActive ? 'stance-flash' : ''}`}
      style={{ position: 'relative' }}
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
            <span className={totalPersonnel >= 8000 ? 'text-emerald-400' : totalPersonnel >= 4000 ? 'text-amber-400' : 'text-red-400'}>{totalPersonnel.toLocaleString()}</span>
          </span>
          <span className="text-text-secondary">{brigades.length} brg</span>
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
        onKeyDown={(e) => e.key === 'Enter' && handleBodyClick()}
        className="cursor-pointer hover:bg-panel-hover/40 transition-colors"
      >
        {commanderName && (
          <div className="px-3 py-1 text-[10px] bg-panel-bg border-b border-panel-border/50 text-text-secondary">
            <div>Commander:</div>
            <div className="text-text-primary font-semibold">{commanderName}{commanderActing ? ' (Acting)' : ''}</div>
          </div>
        )}

        {/* R4: Labeled equipment summary row */}
        {(equip.tanksTotal > 0 || equip.artyTotal > 0) && (
          <div className="px-3 py-1.5 flex items-center gap-4 text-[11px] tabular-nums bg-panel-bg/50 border-b border-panel-border/50 text-text-secondary">
            {equip.tanksTotal > 0 && (
              <span className="flex items-center gap-1" title={`Tanks: ${equip.tanks} operational / ${equip.tanksTotal} total`}>
                <Icon name="tanks" size={13} />
                <span className="text-text-secondary/60 text-[9px] uppercase tracking-wide">Tanks</span>
                <span className="text-text-primary font-semibold">{equip.tanks}</span>
                <span className="text-text-secondary/50">/{equip.tanksTotal}</span>
              </span>
            )}
            {equip.artyTotal > 0 && (
              <span className="flex items-center gap-1" title={`Artillery: ${equip.arty} operational / ${equip.artyTotal} total`}>
                <Icon name="artillery" size={13} />
                <span className="text-text-secondary/60 text-[9px] uppercase tracking-wide">Arty</span>
                <span className="text-text-primary font-semibold">{equip.arty}</span>
                <span className="text-text-secondary/50">/{equip.artyTotal}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {onStanceChange && (
        <div className="px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-accent-gold font-sans tracking-wide font-semibold flex items-center gap-1" title="Corps operational posture — affects aggression, operations, and entrenchment">
              <Icon name={STANCE_ICON[stance ?? 'balanced'] ?? 'balanced'} size={11} />
              Stance
            </span>
            <select
              value={stance ?? 'balanced'}
              onChange={(event) => handleStanceChange(event.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-panel-bg border border-panel-border rounded px-1.5 py-0.5 text-[10px] font-mono text-text-primary focus:outline-none"
            >
              <option value="defensive" title="Digs in. No offensive operations. Maximum entrenchment rate.">Defensive</option>
              <option value="balanced" title="Holds positions. Defends and launches limited operations.">Balanced</option>
              <option value="offensive" title="Actively seeks engagements. Allows corps operations. Higher aggression.">Offensive</option>
              <option value="reorganize" title="Halts all combat. Recovers cohesion and morale. No attacks or defenses.">Reorganize</option>
            </select>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOrbatClick?.(); }}
            className="px-2 py-0.5 bg-accent-gold/10 hover:bg-accent-gold/20 border border-accent-gold/50 rounded text-[10px] text-accent-gold font-bold uppercase tracking-wider transition-colors"
          >
            Orbat
          </button>
        </div>
      )}

      {/* R5: Stance change toast */}
      {toastMsg && (
        <div
          className={`absolute left-0 right-0 flex justify-center pointer-events-none ${toastExiting ? 'stance-toast-exit' : 'stance-toast-enter'}`}
          style={{ bottom: '-24px', zIndex: Z.CORPS_CARD_LABEL }}
        >
          <span className="px-2 py-0.5 bg-accent-gold/20 border border-accent-gold/40 rounded text-[9px] font-mono text-accent-gold tracking-wider uppercase shadow-lg">
            {toastMsg}
          </span>
        </div>
      )}
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
          &larr; Back
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Commander profile */}
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">Commander</div>
          {commanderName ? (
            <div className="text-[11px] text-text-primary font-semibold">
              {commanderName}{commanderActing ? ' (Acting)' : ''}
            </div>
          ) : (
            <div className="text-[11px] text-amber-500/60 italic">Unassigned</div>
          )}
        </div>

        {/* Sector overview */}
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">Front Sectors</div>
          <div className="text-[11px] text-text-primary tabular-nums">
            {sectorCount != null && sectorCount > 0
              ? `${sectorCount} sector${sectorCount !== 1 ? 's' : ''}`
              : <span className="text-text-secondary italic">No active sectors</span>
            }
          </div>
        </div>

        {/* Operation status */}
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">Operations</div>
          {activeOperationName ? (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <div className="text-[11px]">
                <span className="text-red-400 font-bold uppercase">{activeOperationName}</span>
                {activeOperationPhase && (
                  <span className="text-text-secondary ml-1.5">({activeOperationPhase})</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-text-secondary italic">No active operations</div>
          )}
        </div>

        {/* Quick stats */}
        <div className="pt-1 border-t border-panel-border/30">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <span className="text-text-secondary">Personnel</span>
            <span className="text-text-primary tabular-nums font-semibold">{totalPersonnel.toLocaleString()}</span>
            <span className="text-text-secondary">Brigades</span>
            <span className="text-text-primary tabular-nums font-semibold">{brigades.length}</span>
            <span className="text-text-secondary">Avg Cohesion</span>
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
