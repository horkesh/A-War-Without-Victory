import type { FormationView } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';
import { Icon, type IconName } from './icons/Icon';

const STANCE_ICON: Record<string, IconName> = {
  offensive: 'offensive', defensive: 'defensive', reorganize: 'reorganizing', balanced: 'balanced',
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

/**
 * Compact card for a corps in the OOB sidebar: header + list of BrigadeRows.
 */
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
      className="rounded-lg border border-panel-border bg-panel-card/90 overflow-hidden"
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
        <span className="text-[10px] tabular-nums whitespace-nowrap">
          <span className={totalPersonnel >= 8000 ? 'text-emerald-400' : totalPersonnel >= 4000 ? 'text-amber-400' : 'text-red-400'}>{totalPersonnel.toLocaleString()}</span>
          <span className="text-text-secondary"> · {brigades.length} brg</span>
        </span>
      </button>
      {commanderName && (
        <div className="px-3 py-1 text-[10px] bg-panel-bg flex justify-between border-b border-panel-border/50 text-text-secondary">
          <span>Commander:</span>
          <span className="text-text-primary">{commanderName}{commanderActing ? ' (Acting)' : ''}</span>
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
