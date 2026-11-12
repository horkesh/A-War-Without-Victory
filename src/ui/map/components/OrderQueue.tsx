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
        className="kbd-focus flex w-full items-center justify-between gap-2 rounded-t-lg border border-accent-gold/35 bg-[#141821] px-4 py-2.5 text-left transition-colors hover:bg-[#1b2029]"
        style={{
          position: 'absolute',
          left: 0,
          bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
          width: '17rem',
          zIndex: Z.ORDER_QUEUE,
          direction: 'ltr',
        }}
      >
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-[#e0c27a]">
          {orderQueueTitle(stagedOrders.length)}
        </span>
        <span aria-hidden="true" className="text-[14px] text-[#c9a75c]">▴</span>
      </button>
    );
  }

  return (
    <div
      className="flex max-h-64 flex-col overflow-hidden rounded-t-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
      style={{
        position: 'absolute',
        left: 0,
        bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
        width: '17rem',
        zIndex: Z.ORDER_QUEUE,
        direction: 'ltr',
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#262b35] bg-[#141821] px-4 py-2.5">
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-[#e0c27a]">
          {orderQueueTitle(stagedOrders.length)}
        </span>
        <div className="flex items-center gap-1">
          {stagedOrders.length > 1 && (
            <button
              type="button"
              onClick={() => clearStagedOrders()}
              className="kbd-focus rounded border border-[#3a4150] bg-[#1b2029] px-2.5 py-1 text-[13px] font-semibold text-[#e8dcbc] hover:border-accent-gold/60"
            >
              {t('orderQueue.clearAll')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="kbd-focus rounded border border-[#3a4150] bg-[#1b2029] px-2 py-1 text-[13px] leading-none text-[#c9a75c] hover:border-accent-gold/60"
            aria-label={t('orderQueue.collapseAria')}
            aria-expanded={true}
          >
            ▾
          </button>
        </div>
      </div>
      <ul className="m-0 min-h-0 shrink list-none divide-y divide-[#262b35] overflow-auto p-0">
        {stagedOrders.map((order) => {
          const targetLabel = orderTargetLabel(order, osidDisplayNames, sectors);
          return (
            <li
              key={order.id}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2 text-[14px]"
            >
              <span className="col-span-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#b9ad94]">
                {orderTypeLabel(order.type)}
              </span>
              <span className="min-w-0 truncate font-semibold text-[#f1e6c8]">
                {formationName(order.formationId, formationNamesById)}
              </span>
              <span className="col-start-1 min-w-0 truncate text-[#c2b69c]" title={targetLabel}>
                {targetLabel}
              </span>
              <button
                type="button"
                onClick={() => removeStagedOrder(order.id)}
                className="kbd-focus col-start-2 row-span-2 row-start-2 self-center rounded border border-[#3a4150] bg-[#1b2029] px-2.5 py-1 text-[13px] font-semibold text-[#e8dcbc] hover:border-accent-gold/60"
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
