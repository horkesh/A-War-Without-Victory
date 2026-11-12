/**
 * EnclaveDashboard — the Humanitarian & Siege Ledger of the player's enclaves.
 *
 * Surface redesign, step 4 (2026-11-12): one surface in the Command Surface style
 * (was a small translucent panel at the right edge): header, the readout as figure
 * tiles, the enclaves as cards in the middle, and the airdrop budget with its Stage
 * action in the right column when any enclave can receive drops. Presentation only;
 * the budget arithmetic and the staging IPC call are unchanged.
 */
import { useEffect, useMemo, useState } from 'react';
import type { EnclaveResilienceView, LoadedGameState } from '../data/types';
import { AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE, AIRDROP_MAX_SUPPLY_PER_TURN } from '../../../state/supply_reserve_constants';
import { useIPC } from '../desktop/useIPC';
import { getPlayerSafeEnclaveName, getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { t, type MessageKey } from '../i18n';
import { strictCompare } from '../../../state/validateGameState';
import {
  SURFACE_CHIP,
  SURFACE_LABEL_MUTED,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_TONE,
  SurfaceCloseButton,
  SurfaceColumns,
  SurfaceContent,
  SurfaceDetail,
  SurfaceDetailBody,
  SurfaceDetailFooter,
  SurfaceFigure,
  SurfaceFrame,
  SurfaceHeader,
  SurfacePanel,
  SurfaceSection,
  SurfaceSections,
  SurfaceStat,
} from './surface/Surface';
import { useSurfaceEscape } from './surface/useSurfaceEscape';
import { surfaceFactionName } from './surface/surfaceFactionName';
import { SurfaceModalLayer } from './surface/SurfaceModalLayer';

interface EnclaveDashboardProps {
  state: LoadedGameState;
  open: boolean;
  onClose: () => void;
}

const SUPPLY_CLASSES: Record<'adequate' | 'strained' | 'critical', string> = {
  adequate: 'text-emerald-200',
  strained: 'text-amber-200',
  critical: 'text-red-200',
};

const SUPPLY_UNREPORTED_CLASS = 'text-[#b9ad94]';

const SUPPLY_LABEL_KEYS: Record<'adequate' | 'strained' | 'critical', MessageKey> = {
  adequate: 'enclave.supplyState.adequate',
  strained: 'enclave.supplyState.strained',
  critical: 'enclave.supplyState.critical',
};

const AIRDROP_LABEL_KEYS: Record<'receiving' | 'not_eligible' | 'not_isolated_long_enough', MessageKey> = {
  receiving: 'enclave.airdrop.receiving',
  not_eligible: 'enclave.airdrop.notEligible',
  not_isolated_long_enough: 'enclave.airdrop.notIsolatedLongEnough',
};

function getEnclaveRisk(enclave: EnclaveResilienceView) {
  if (enclave.supply_state === 'critical' || enclave.resilience <= 8) {
    return {
      label: t('enclave.risk.critical'),
      detail: t('enclave.risk.criticalDetail', { resilience: enclave.resilience.toFixed(1), turns: enclave.isolation_turns }),
      className: SURFACE_TONE.danger,
    };
  }
  if (enclave.supply_state === 'strained' || enclave.isolation_turns >= 4) {
    return {
      label: t('enclave.risk.heightened'),
      detail: t('enclave.risk.heightenedDetail', { turns: enclave.isolation_turns }),
      className: SURFACE_TONE.warn,
    };
  }
  return {
    label: t('enclave.risk.holding'),
    detail: t('enclave.risk.holdingDetail'),
    className: SURFACE_TONE.good,
  };
}

export function EnclaveDashboard({ state, open, onClose }: EnclaveDashboardProps) {
  const ipc = useIPC();
  useSurfaceEscape(open, onClose);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const enclaves = useMemo(
    () => Object.entries(state.enclaveResilience ?? {})
      .filter(([, enclave]) => !state.player_faction || enclave.faction === state.player_faction)
      .sort((a, b) => (
        strictCompare(a[1].display_name ?? a[0], b[1].display_name ?? b[0])
        || strictCompare(a[0], b[0])
      )),
    [state.enclaveResilience, state.player_faction]
  );
  const eligibleEnclaveIds = useMemo(
    () => enclaves
      .filter(([, enclave]) => enclave.faction === 'RBiH' && enclave.isolation_turns >= 4)
      .map(([enclaveId]) => enclaveId),
    [enclaves]
  );
  const eligibleEnclaveIdSet = useMemo(() => new Set(eligibleEnclaveIds), [eligibleEnclaveIds]);
  const airdropBudget = Math.min(eligibleEnclaveIds.length * AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE, AIRDROP_MAX_SUPPLY_PER_TURN);
  const allocated = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  const overAllocated = allocated > airdropBudget;
  const remaining = Math.max(0, airdropBudget - allocated);
  const allocatedPct = airdropBudget > 0 ? Math.min(100, (allocated / airdropBudget) * 100) : 0;
  const canStageAirdrop = ipc.isAvailable && !overAllocated;
  const airdropStageDisabledReason = !ipc.isAvailable
    ? t('formationDetail.commandBridgeUnavailable')
    : overAllocated
      ? t('enclave.airdropOverBudget', { budget: airdropBudget.toFixed(1) })
      : undefined;
  const criticalCount = enclaves.filter(([, enclave]) => enclave.supply_state === 'critical' || enclave.resilience <= 8).length;
  const heightenedCount = enclaves.filter(([, enclave]) => (
    !(enclave.supply_state === 'critical' || enclave.resilience <= 8)
    && (enclave.supply_state === 'strained' || enclave.isolation_turns >= 4)
  )).length;

  useEffect(() => {
    setAllocations(Object.fromEntries(
      enclaves
        .filter(([, enclave]) => (enclave.airdrop_allocation ?? 0) > 0)
        .map(([enclaveId, enclave]) => [enclaveId, enclave.airdrop_allocation ?? 0])
    ));
    setActionMessage(null);
  }, [open, enclaves]);

  const stageAllocations = async () => {
    if (!ipc.isAvailable) {
      setActionMessage(t('formationDetail.commandBridgeUnavailable'));
      return;
    }
    if (overAllocated) {
      setActionMessage(t('enclave.airdropOverBudget', { budget: airdropBudget.toFixed(1) }));
      return;
    }
    const result = await ipc.stageAirdropAllocation(allocations);
    setActionMessage(result.ok ? t('enclave.airdropStaged') : (result.error ?? t('enclave.airdropFailed')));
  };

  if (!open) return null;

  const hasAirdrop = eligibleEnclaveIds.length > 0;

  return (
    <SurfaceModalLayer>
    <SurfaceFrame
      layerClassName=""
      data-testid="enclave-dashboard"
      aria-modal="true"
      aria-labelledby="enclave-dashboard-title"
      style={{ direction: 'ltr' }}
    >
      <SurfaceHeader
        eyebrow={surfaceFactionName(state.player_faction)}
        title={<span id="enclave-dashboard-title">{t('enclave.title')}</span>}
        close={<SurfaceCloseButton onClick={onClose} aria-label={t('enclave.close')} />}
      />
      <SurfaceColumns layout={hasAirdrop ? 'content-detail' : 'single'}>
        <SurfaceContent>
          <SurfaceSections className={hasAirdrop ? undefined : 'max-w-[96rem]'}>
            <SurfaceSection label={t('enclave.summaryTitle')}>
              <div className="grid grid-cols-3 gap-3">
                <SurfaceFigure label={t('enclave.summaryCritical')} value={criticalCount} tone="font-mono text-red-200" />
                <SurfaceFigure label={t('enclave.summaryHeightened')} value={heightenedCount} tone="font-mono text-amber-200" />
                <SurfaceFigure label={t('enclave.summaryAirdropReady')} value={eligibleEnclaveIds.length} tone="font-mono text-sky-200" />
              </div>
            </SurfaceSection>

            {enclaves.length === 0 ? (
              <p className="m-0 text-[17px] italic text-[#b9ad94]">{t('enclave.noData')}</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,26rem),1fr))] gap-3">
                {enclaves.map(([enclaveId, enclave]) => {
                  const resiliencePct = Math.max(0, Math.min(100, (enclave.resilience / 30) * 100));
                  const hardeningMarkerPct = (8 / 30) * 100;
                  const supplyState = enclave.supply_state;
                  const airdropStatus = enclave.airdrop_status ?? 'not_eligible';
                  const risk = getEnclaveRisk(enclave);
                  const currentAllocation = allocations[enclaveId] ?? 0;
                  const maxAllocation = remaining + currentAllocation;
                  return (
                    <SurfacePanel key={enclaveId} className="flex flex-col gap-3" data-enclave-id={enclaveId}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="text-[20px] font-semibold leading-tight text-[#f1e6c8]">
                            {getPlayerSafeEnclaveName(enclave.display_name ?? enclaveId)}
                          </span>
                          <span className="text-[15px] text-[#b9ad94]">
                            {getPlayerSafePoliticalFactionName(enclave.faction, t('common.unknown'))}
                          </span>
                        </div>
                        <span className={`${SURFACE_CHIP} ${risk.className}`}>{risk.label}</span>
                      </div>

                      <p className="m-0 text-[16px] leading-relaxed text-[#ddd1b3]">{risk.detail}</p>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[16px] text-[#b9ad94]">{t('enclave.resilience')}</span>
                          <span className="font-mono text-[16px] font-semibold tabular-nums text-[#f1e6c8]">{enclave.resilience.toFixed(1)} / 30</span>
                        </div>
                        <div className="relative h-2.5 overflow-hidden rounded-full bg-[#262b35]">
                          <div className="absolute inset-y-0 left-0 bg-[#c9a75c]" style={{ width: `${resiliencePct}%` }} />
                          <div className="absolute inset-y-0 border-l border-white/60" style={{ left: `${hardeningMarkerPct}%` }} />
                        </div>
                      </div>

                      <span className={`text-[15px] font-semibold ${enclave.hardening_active ? 'text-[#e0c27a]' : 'text-[#b9ad94]'}`}>
                        {enclave.hardening_active ? t('enclave.hardeningActive') : t('enclave.hardeningInactive')}
                      </span>

                      <div className="flex flex-col">
                        <SurfaceStat label={t('enclave.isolationTurns')} value={enclave.isolation_turns} />
                        <SurfaceStat
                          label={t('enclave.supplyState')}
                          value={supplyState ? t(SUPPLY_LABEL_KEYS[supplyState]) : t('corpsFront.unreported')}
                          tone={supplyState ? SUPPLY_CLASSES[supplyState] : SUPPLY_UNREPORTED_CLASS}
                        />
                        <SurfaceStat label={t('enclave.airdrop')} value={t(AIRDROP_LABEL_KEYS[airdropStatus])} />
                      </div>

                      {eligibleEnclaveIdSet.has(enclaveId) && (
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor={`enclave-allocation-${enclaveId}`}
                            className="text-[15px] text-[#b9ad94]"
                          >
                            {t('enclave.allocatedSupply')}
                          </label>
                          <input
                            id={`enclave-allocation-${enclaveId}`}
                            type="number"
                            min={0}
                            max={maxAllocation}
                            step={0.1}
                            value={currentAllocation.toFixed(1)}
                            disabled={!ipc.isAvailable}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              const clampedValue = Number.isFinite(value)
                                ? Math.min(Math.max(value, 0), maxAllocation)
                                : 0;
                              setAllocations((prev) => ({
                                ...prev,
                                [enclaveId]: clampedValue,
                              }));
                            }}
                            className="h-11 w-full rounded-md border border-[#3a4150] bg-[#0f1218] px-3 font-mono text-[16px] text-[#f1e6c8] focus:border-accent-gold/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      )}
                    </SurfacePanel>
                  );
                })}
              </div>
            )}
          </SurfaceSections>
        </SurfaceContent>

        {hasAirdrop && (
          <SurfaceDetail aria-label={t('enclave.airdropBudget')}>
            <SurfaceDetailBody eyebrow={t('enclave.airdrop')} title={t('enclave.airdropBudget')}>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={SURFACE_LABEL_MUTED}>{t('enclave.allocatedSupply')}</span>
                  <span className="font-mono text-[22px] font-semibold tabular-nums text-[#f1e6c8]">{allocated.toFixed(1)} / {airdropBudget.toFixed(1)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#262b35]">
                  <div className="h-full bg-sky-300/80" style={{ width: `${allocatedPct}%` }} />
                </div>
                <p className="m-0 text-[17px] text-[#ddd1b3]">{t('enclave.remaining', { value: remaining.toFixed(1) })}</p>
              </div>
            </SurfaceDetailBody>
            <SurfaceDetailFooter>
              {actionMessage && <p role="status" aria-live="polite" className="m-0 text-[16px] text-[#e0c27a]">{actionMessage}</p>}
              {airdropStageDisabledReason && !actionMessage && (
                <p className="m-0 text-[15px] text-[#b9ad94]">{airdropStageDisabledReason}</p>
              )}
              <button
                type="button"
                onClick={() => void stageAllocations()}
                disabled={!canStageAirdrop}
                title={airdropStageDisabledReason}
                className={`w-full ${SURFACE_PRIMARY_BUTTON_COMPACT}`}
              >
                {t('enclave.stageAirdropAllocation')}
              </button>
            </SurfaceDetailFooter>
          </SurfaceDetail>
        )}
      </SurfaceColumns>
    </SurfaceFrame>
    </SurfaceModalLayer>
  );
}
