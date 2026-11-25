/**
 * EnclaveDashboard — the Humanitarian & Siege Ledger of the player's enclaves.
 *
 * Surface redesign, step 4 (2026-11-12): one surface in the Command Surface style
 * (was a small translucent panel at the right edge): header, the readout as figure
 * tiles and the enclaves as cards. Presentation only; it reads enclave resilience,
 * which runs in 1.0.
 *
 * The airdrop budget and its "Stage Airdrop Allocation" action were retired 2026-11-17
 * with the supply-reserve economy (Fable consult 6): airdrops only ever fed the retired
 * faction reserve, and nothing read the staged allocation.
 */
import { useMemo } from 'react';
import type { EnclaveResilienceView, LoadedGameState } from '../data/types';
import { getPlayerSafeEnclaveName, getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { t, type MessageKey } from '../i18n';
import { formatLocaleNumber } from '../utils/formatters';
import { strictCompare } from '../../../state/validateGameState';
import {
  SURFACE_CHIP,
  SURFACE_TONE,
  SurfaceCloseButton,
  SurfaceColumns,
  SurfaceContent,
  SurfaceFigure,
  SurfaceFrame,
  SurfaceHeader,
  SurfacePanel,
  SurfaceSection,
  SurfaceSections,
  SurfaceStat,
} from './surface/Surface';
import { useDialogFocus } from '../../shared/Modal';
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

/** The captor named as forces, the same wording the Humanitarian Ledger uses. */
function captorForces(captor: string): string {
  if (captor === 'RBiH') return t('humanitarianLedger.side.RBiH');
  if (captor === 'RS') return t('humanitarianLedger.side.RS');
  if (captor === 'HRHB') return t('humanitarianLedger.side.HRHB');
  return t('humanitarianLedger.side.notRecorded');
}

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
  useSurfaceEscape(open, onClose);
  const dialogFocus = useDialogFocus(open);
  const enclaves = useMemo(
    () => Object.entries(state.enclaveResilience ?? {})
      .filter(([, enclave]) => !state.player_faction || enclave.faction === state.player_faction)
      .sort((a, b) => (
        strictCompare(a[1].display_name ?? a[0], b[1].display_name ?? b[0])
        || strictCompare(a[0], b[0])
      )),
    [state.enclaveResilience, state.player_faction]
  );
  const criticalCount = enclaves.filter(([, enclave]) => enclave.supply_state === 'critical' || enclave.resilience <= 8).length;
  const heightenedCount = enclaves.filter(([, enclave]) => (
    !(enclave.supply_state === 'critical' || enclave.resilience <= 8)
    && (enclave.supply_state === 'strained' || enclave.isolation_turns >= 4)
  )).length;

  if (!open) return null;

  return (
    <SurfaceModalLayer>
    <SurfaceFrame
      layerClassName=""
      ref={dialogFocus.ref}
      onKeyDownCapture={dialogFocus.onKeyDown}
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
      <SurfaceColumns layout="single">
        <SurfaceContent>
          <SurfaceSections className="max-w-[96rem]">
            <SurfaceSection label={t('enclave.summaryTitle')}>
              <div className="grid grid-cols-2 gap-3">
                <SurfaceFigure label={t('enclave.summaryCritical')} value={criticalCount} tone="font-mono text-red-200" />
                <SurfaceFigure label={t('enclave.summaryHeightened')} value={heightenedCount} tone="font-mono text-amber-200" />
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
                  const risk = getEnclaveRisk(enclave);
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
                      </div>
                      {/* Ledger line 2 (A5): this week only; never summed, trended or colour-thresholded */}
                      {enclave.unable_to_leave_this_week !== undefined && (
                        <p data-testid="enclave-unable-to-leave" className="m-0 text-[15px] text-[#f1e6c8]">
                          {t('enclave.unableToLeaveThisWeek', { count: formatLocaleNumber(Math.round(enclave.unable_to_leave_this_week)) })}
                        </p>
                      )}
                      {/* A9 P0-A: the enclave's fall. Killed reads "not recorded" when unrecorded, never 0 */}
                      {enclave.pocket_fall && (
                        <p data-testid="enclave-pocket-fall" className="m-0 text-[15px] leading-relaxed text-[#f1e6c8]">
                          {enclave.pocket_fall.negotiated
                            ? t('enclave.fall.negotiated', {
                              forces: captorForces(enclave.pocket_fall.captor),
                              left: formatLocaleNumber(Math.round(enclave.pocket_fall.left)),
                            })
                            : t('enclave.fall.assaulted', {
                              forces: captorForces(enclave.pocket_fall.captor),
                              left: formatLocaleNumber(Math.round(enclave.pocket_fall.left)),
                              killed: enclave.pocket_fall.killed === null
                                ? t('humanitarianLedger.label.notRecorded')
                                : formatLocaleNumber(Math.round(enclave.pocket_fall.killed)),
                            })}
                        </p>
                      )}
                    </SurfacePanel>
                  );
                })}
              </div>
            )}
          </SurfaceSections>
        </SurfaceContent>
      </SurfaceColumns>
    </SurfaceFrame>
    </SurfaceModalLayer>
  );
}
