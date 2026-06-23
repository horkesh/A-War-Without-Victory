import type { EliteCommanderView } from '../data/types';

interface EliteCommanderSummaryProps {
  commander: EliteCommanderView | undefined;
  compact?: boolean;
}

function rating(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(0) : 'Unreported';
}

export function EliteCommanderSummary({ commander, compact = false }: EliteCommanderSummaryProps) {
  if (!commander) return null;

  return (
    <div className={`rounded border border-accent-gold/20 bg-accent-gold/5 ${compact ? 'px-2 py-1' : 'px-2 py-1.5'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-gold/80">Elite commander</span>
        <span className="min-w-0 truncate text-xs font-semibold text-text-primary">{commander.name}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-text-secondary">
        <span>Command {rating(commander.competence)}</span>
        <span>Tempo {rating(commander.aggressiveness)}</span>
        <span>Defense {rating(commander.defensive_skill)}</span>
      </div>
    </div>
  );
}

