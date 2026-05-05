import { useEffect, useRef } from 'react';
import { Z } from '../../shared/zIndex';

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: string;
  disabled?: boolean;
  action: () => void;
}

interface RadialMenuProps {
  items: RadialMenuItem[];
  position: { x: number; y: number };
  targetLabel?: string;
  onClose: () => void;
}

export function RadialMenu({ items, position, targetLabel, onClose }: RadialMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const RADIUS = 70; // distance from center to items
  const angleStep = (2 * Math.PI) / items.length;
  const startAngle = -Math.PI / 2; // start from top

  // Clamp position to keep menu within viewport
  const x = Math.min(Math.max(position.x, RADIUS + 20), window.innerWidth - RADIUS - 20);
  const y = Math.min(Math.max(position.y, RADIUS + 20), window.innerHeight - RADIUS - 20);

  return (
    <div
      ref={ref}
      className="fixed"
      style={{ left: x, top: y, zIndex: Z.SHELL_FLOATING }}
    >
      {/* Center label */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-panel/90 backdrop-blur-md border border-white/15 flex items-center justify-center">
        <span className="text-[7px] text-text-secondary/60 text-center leading-tight truncate max-w-[36px]">
          {targetLabel || ''}
        </span>
      </div>

      {/* Radial items */}
      {items.map((item, i) => {
        const angle = startAngle + i * angleStep;
        const ix = Math.cos(angle) * RADIUS;
        const iy = Math.sin(angle) * RADIUS;

        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => { item.action(); onClose(); }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-150 ${
              item.disabled
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-accent-gold/20 hover:scale-110 cursor-pointer'
            } bg-panel/85 backdrop-blur-md border border-white/10 shadow-lg`}
            style={{
              left: ix,
              top: iy,
              animation: `radialFadeIn 150ms ease-out ${i * 30}ms both`,
            }}
            title={item.label}
          >
            <span className="text-sm">{item.icon}</span>
            <span className="text-[8px] text-text-secondary whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}

      {/* Keyframe animation (inline style tag) */}
      <style>{`
        @keyframes radialFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
