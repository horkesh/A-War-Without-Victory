import type { FormationView } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';
import { Icon, type IconName } from './icons/Icon';

const STANCE_ICON: Record<string, IconName> = {
  offensive: 'offensive', defensive: 'defensive', reorganize: 'reorganizing', balanced: 'balanced',
};

const STANCE_COLOR: Record<string, string> = {
  offensive: 'border-l-red-500/70',
  defensive: 'border-l-blue-400/70',
  balanced: 'border-l-amber-400/70',
  reorganize: 'border-l-gray-400/70',
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
}: CorpsCardProps) {
  const displayName = corpsName ?? `Corps ${corpsId}`;
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

  return (
    <div
      className={`rounded-lg border border-panel-border bg-panel-card/90 overflow-hidden border-l-3 ${stanceBorder}`}
      onMouseEnter={() => {
        onHoverOsidsChange?.(corpsOsids);
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        onHoverOsidsChange?.([]);
        onMouseLeave?.();
      }}
    >
      <button
        type="button"
        onClick={onHeaderClick}
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

      {commanderName && (
        <div className="px-3 py-1 text-[10px] bg-panel-bg flex justify-between border-b border-panel-border/50 text-text-secondary">
          <span>Commander:</span>
          <span className="text-text-primary">{commanderName}{commanderActing ? ' (Acting)' : ''}</span>
        </div>
      )}

      {/* Equipment summary row */}
      {(equip.tanksTotal > 0 || equip.artyTotal > 0) && (
        <div className="px-3 py-1.5 flex items-center gap-4 text-[11px] tabular-nums bg-panel-bg/50 border-b border-panel-border/50 text-text-secondary">
          {equip.tanksTotal > 0 && (
            <span className="flex items-center gap-1" title={`Tanks: ${equip.tanks} operational / ${equip.tanksTotal} total`}>
              <Icon name="tanks" size={13} />
              <span className="text-text-primary font-semibold">{equip.tanks}</span>
              <span className="text-text-secondary/70">/ {equip.tanksTotal}</span>
            </span>
          )}
          {equip.artyTotal > 0 && (
            <span className="flex items-center gap-1" title={`Artillery: ${equip.arty} operational / ${equip.artyTotal} total`}>
              <Icon name="artillery" size={13} />
              <span className="text-text-primary font-semibold">{equip.arty}</span>
              <span className="text-text-secondary/70">/ {equip.artyTotal}</span>
            </span>
          )}
        </div>
      )}

      {onStanceChange && (
        <div className="px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-accent-gold font-sans tracking-wide font-semibold flex items-center gap-1" title="Corps operational posture — affects aggression, operations, and entrenchment">
              <Icon name={STANCE_ICON[stance ?? 'balanced'] ?? 'balanced'} size={11} />
              Stance
            </span>
            <select
              value={stance ?? 'balanced'}
              onChange={(event) => onStanceChange(event.target.value)}
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
    </div>
  );
}
