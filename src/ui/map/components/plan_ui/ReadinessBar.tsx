interface ReadinessBarProps {
  label: string;
  value: number; // 0-1
  qualitativeLabel: string;
}

const BAR_COLORS = [
  { threshold: 0.7, color: '#4a9a55' },
  { threshold: 0.4, color: '#c4a35a' },
  { threshold: 0, color: '#c24040' },
];

function getBarColor(value: number): string {
  for (const { threshold, color } of BAR_COLORS) {
    if (value >= threshold) return color;
  }
  return BAR_COLORS[BAR_COLORS.length - 1].color;
}

export function ReadinessBar({ label, value, qualitativeLabel }: ReadinessBarProps) {
  const color = getBarColor(value);
  const pct = Math.max(0, Math.min(100, value * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{label}</span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {qualitativeLabel}
        </span>
      </div>
      <div className="h-1.5 bg-[rgba(180,160,130,0.08)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
