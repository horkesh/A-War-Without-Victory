import { useState } from 'react';
import { Z } from '../../shared/zIndex';
import { getPlayerFacingSectorName } from '../../shared/playerFacingLabels';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { t, useLocale, type MessageKey } from '../i18n';
import { useGameStore, type StagedOrder } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeBrigadeName } from '../utils/playerSafeText';

const ORDER_TYPE_LABEL_KEYS: Record<StagedOrder['type'], MessageKey> = {
  attack: 'orderQueue.type.attack',
  posture: 'orderQueue.type.posture',
  sector: 'orderQueue.type.sector',
};

const POSTURE_TARGET_LABEL_KEYS: Record<string, MessageKey> = {
  hold: 'orderQueue.posture.hold',
  defend: 'orderQueue.posture.defend',
  fortify: 'orderQueue.posture.fortify',
  attack: 'orderQueue.posture.attack',
  offensive: 'orderQueue.posture.attack',
  reserve: 'orderQueue.posture.reserve',
  rest: 'orderQueue.posture.rest',
  retreat: 'orderQueue.posture.retreat',
};

function formationName(formationId: string, formationNamesById: Map<string, string>): string {
  return getPlayerSafeBrigadeName(formationNamesById.get(formationId));
}

function isUnsafeRawLabel(value: string | null | undefined): boolean {
  if (!value) return false;
  return /(?:[a-z]{2,}_[a-z0-9_]+|[:|])/.test(value);
}

function orderTypeLabel(type: StagedOrder['type']): string {
  return t(ORDER_TYPE_LABEL_KEYS[type]);
}

function postureTargetLabel(postureName: string | undefined): string {
  const key = (postureName ?? '').trim().toLowerCase();
  const labelKey = POSTURE_TARGET_LABEL_KEYS[key];
  return labelKey ? t(labelKey) : t('orderQueue.target.posturePending');
}

function orderTargetLabel(
  order: StagedOrder,
  osidDisplayNames: Record<string, string> | null,
  sectors: ReadonlyArray<{ sector_id?: string | null; display_name?: string | null }>,
): string {
  if (order.type === 'posture') return postureTargetLabel(order.postureName);
  if (order.type === 'sector') {
    const label = getPlayerFacingSectorName(order.targetSectorId ?? order.targetOsid, sectors, t('orderQueue.target.assignedSector'));
    return isUnsafeRawLabel(label) ? t('orderQueue.target.assignedSector') : label;
  }
  if (order.targetOsid) {
    const label = getOsidDisplayName(order.targetOsid, osidDisplayNames);
    return isUnsafeRawLabel(label) ? t('orderQueue.target.assignedSettlement') : label;
  }
  return t('orderQueue.target.none');
}

function orderQueueTitle(count: number): string {
  return t('orderQueue.title', { count });
}

/**
 * Order queue panel (Phase C5): list of staged orders for the current turn.
 * Docks to the left command rail when orders exist; hidden when empty.
 */
export function OrderQueue() {
  const [locale] = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const stagedOrders = useGameStore((s) => s.stagedOrders);
  const removeStagedOrder = useGameStore((s) => s.removeStagedOrder);
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const sectors = loadedGameState?.corpsFrontSectors ?? [];

  const formationNamesById = new Map<string, string>();
  if (loadedGameState?.formations) {
    for (const f of loadedGameState.formations) {
      formationNamesById.set(f.id, getLocalizedFormationName(f, locale));
    }
  }

  if (stagedOrders.length === 0) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={t('orderQueue.expandAria')}
        aria-expanded={false}
        className="flex items-center w-full text-left bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-t-lg hover:bg-panel-hover transition-colors"
        style={{
          position: 'absolute',
          left: 0,
          bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
          width: '15.5rem',
          zIndex: Z.ORDER_QUEUE,
          direction: 'ltr',
        }}
      >
        <span className="px-3 py-2 font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          {orderQueueTitle(stagedOrders.length)}
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
        bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
        width: '15.5rem',
        zIndex: Z.ORDER_QUEUE,
        direction: 'ltr',
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border shrink-0">
        <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          {orderQueueTitle(stagedOrders.length)}
        </span>
        <div className="flex items-center gap-1">
          {stagedOrders.length > 1 && (
            <button
              type="button"
              onClick={() => clearStagedOrders()}
              className="text-[10px] font-mono uppercase text-text-secondary hover:text-interactive px-1.5 py-0.5 rounded border border-panel-border hover:bg-panel-hover"
            >
              {t('orderQueue.clearAll')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-text-secondary hover:text-interactive text-xs leading-none p-0.5"
            aria-label={t('orderQueue.collapseAria')}
            aria-expanded={true}
          >
            ▼
          </button>
        </div>
      </div>
      <ul className="overflow-auto divide-y divide-panel-border/50 shrink min-h-0">
        {stagedOrders.map((order) => {
          const targetLabel = orderTargetLabel(order, osidDisplayNames, sectors);
          return (
            <li
              key={order.id}
              className="flex items-center gap-2 px-3 py-2 text-xs group"
            >
              <span className="shrink-0 font-mono text-text-secondary uppercase w-24">
                {orderTypeLabel(order.type)}
              </span>
              <span className="truncate text-text-primary min-w-0">
                {formationName(order.formationId, formationNamesById)}
              </span>
              <span className="truncate text-text-secondary min-w-0" title={targetLabel}>
                {targetLabel}
              </span>
              <button
                type="button"
                onClick={() => removeStagedOrder(order.id)}
                className="shrink-0 ml-auto text-[10px] font-mono uppercase text-text-secondary hover:text-interactive px-1.5 py-0.5 rounded border border-panel-border opacity-70 group-hover:opacity-100"
              >
                {t('orderQueue.remove')}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
