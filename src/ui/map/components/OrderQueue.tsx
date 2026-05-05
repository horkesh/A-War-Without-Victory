import { useState } from 'react';
import { useGameStore, type StagedOrder } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeBrigadeName } from '../utils/playerSafeText';
import { Z } from '../../shared/zIndex';

function formationName(formationId: string, formationNamesById: Map<string, string>): string {
  return getPlayerSafeBrigadeName(formationNamesById.get(formationId));
}

function orderTargetLabel(order: StagedOrder, osidDisplayNames: Record<string, string> | null): string {
  if (order.type === 'posture' && order.postureName) return order.postureName;
  if (order.targetOsid) return getOsidDisplayName(order.targetOsid, osidDisplayNames);
  return '—';
}

/**
 * Order queue panel (Phase C5): list of staged orders for the current turn.
 * Placed below the left sidebar as a collapsible strip; does not overlap SelectionPanel (right).
 */
export function OrderQueue() {
  const [collapsed, setCollapsed] = useState(false);
  const stagedOrders = useGameStore((s) => s.stagedOrders);
  const removeStagedOrder = useGameStore((s) => s.removeStagedOrder);
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);

  const formationNamesById = new Map<string, string>();
  if (loadedGameState?.formations) {
    for (const f of loadedGameState.formations) {
      formationNamesById.set(f.id, f.name);
    }
  }

  if (stagedOrders.length === 0) {
    return (
      <div
        className="flex items-center bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-t-lg border-b-0"
        style={{
          position: 'absolute',
          left: 0,
          bottom: '2.25rem',
          width: '18rem',
          zIndex: Z.ORDER_QUEUE,
          direction: 'ltr',
        }}
      >
        <div className="px-3 py-2 font-sans text-xs text-text-secondary uppercase tracking-wide">
          Order queue (0)
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex items-center w-full text-left bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-t-lg hover:bg-panel-hover transition-colors"
        style={{
          position: 'absolute',
          left: 0,
          bottom: '2.25rem',
          width: '18rem',
          zIndex: Z.ORDER_QUEUE,
          direction: 'ltr',
        }}
      >
        <span className="px-3 py-2 font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          Order queue ({stagedOrders.length})
        </span>
        <span className="text-text-secondary text-xs ml-1">▶</span>
      </button>
    );
  }

  return (
    <div
      className="flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-t-lg shadow-lg max-h-48 overflow-hidden"
      style={{
        position: 'absolute',
        left: 0,
        bottom: '2rem',
        width: '18rem',
        zIndex: Z.ORDER_QUEUE,
        direction: 'ltr',
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border shrink-0">
        <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          Order queue ({stagedOrders.length})
        </span>
        <div className="flex items-center gap-1">
          {stagedOrders.length > 1 && (
            <button
              type="button"
              onClick={() => clearStagedOrders()}
              className="text-[10px] font-mono uppercase text-text-secondary hover:text-interactive px-1.5 py-0.5 rounded border border-panel-border hover:bg-panel-hover"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-text-secondary hover:text-interactive text-xs leading-none p-0.5"
            aria-label="Collapse"
          >
            ▼
          </button>
        </div>
      </div>
      <ul className="overflow-auto divide-y divide-panel-border/50 shrink min-h-0">
        {stagedOrders.map((order) => (
          <li
            key={order.id}
            className="flex items-center gap-2 px-3 py-2 text-xs group"
          >
            <span className="shrink-0 font-mono text-text-secondary uppercase w-14">
              {order.type}
            </span>
            <span className="truncate text-text-primary min-w-0">
              {formationName(order.formationId, formationNamesById)}
            </span>
            <span className="truncate text-text-secondary min-w-0" title={orderTargetLabel(order, osidDisplayNames)}>
              {orderTargetLabel(order, osidDisplayNames)}
            </span>
            <button
              type="button"
              onClick={() => removeStagedOrder(order.id)}
              className="shrink-0 ml-auto text-[10px] font-mono uppercase text-text-secondary hover:text-interactive px-1.5 py-0.5 rounded border border-panel-border opacity-70 group-hover:opacity-100"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
