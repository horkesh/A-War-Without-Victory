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
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EnclaveResilienceView, LoadedGameState, NegotiatedEvacuationView } from '../data/types';
import { getPlayerSafeEnclaveName, getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { t, type MessageKey } from '../i18n';
import { formatLocaleNumber } from '../utils/formatters';
import { strictCompare } from '../../../state/validateGameState';
import {
  SURFACE_CHIP,
  SURFACE_SECONDARY_BUTTON,
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
  /**
   * A9 P1: the RBiH president refuses the negotiated evacuations of one pocket (municipality). Absent = no decision is
   * offered (read-only views). Silence = allow: nothing is written unless the president confirms.
   */
  onRefuseEvacuation?: (munId: string) => Promise<{ ok: boolean; error?: string }>;
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

/**
 * A9 P1 (8-seat §6 ruling D9; orchestrator P1 ruling 5): one open negotiated-evacuation episode and the president's
 * decision. The historical default is allow; refusing stops the episode's later convoys and keeps the siege cost (the
 * people stay in the pocket). The copy states that cost and never shows a saved or prevented figure.
 */
/**
 * Historical copy note only (historian seat, s19 sitting, rounds 1-2): the government's opposition (Krstić TJ para 16;
 * A/54/549 paras 39, 52) and the defied local ban (A/54/549 para 40: Srebrenica's local authorities announced on
 * 2 April 1993 that no more evacuations would take place, and later convoys left anyway) are sourced for the 1993
 * Srebrenica evacuations only, so the note is shown for that municipality alone. Another pocket gets no note, never
 * one by analogy. No rule reads this.
 */
const HISTORY_NOTE_MUN_IDS: readonly string[] = ['srebrenica'];

function NegotiatedEvacuationSection({
  evacuation,
  onRefuse,
}: {
  evacuation: NegotiatedEvacuationView;
  onRefuse?: (munId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Focus (ui-ux seat, s19): Cancel is the safe default on entering the confirm step; back to Refuse on cancel or
  // failure; to the stopped line once the decision taken here comes back in the state.
  const [focusTarget, setFocusTarget] = useState<'cancel' | 'refuse' | null>(null);
  const decidedHere = useRef(false);
  const refuseRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const stoppedRef = useRef<HTMLParagraphElement>(null);
  const titleId = `enclave-evacuation-title-${evacuation.munId}`;
  const costId = `enclave-evacuation-cost-${evacuation.munId}`;
  const canDecide = Boolean(onRefuse) && !evacuation.refused && !evacuation.capReached;
  useEffect(() => {
    if (focusTarget === 'cancel') cancelRef.current?.focus();
    if (focusTarget === 'refuse') refuseRef.current?.focus();
  }, [focusTarget, confirming]);
  useEffect(() => {
    if (evacuation.refused && decidedHere.current) stoppedRef.current?.focus();
  }, [evacuation.refused]);
  const refuse = async () => {
    if (!onRefuse) return;
    setPending(true);
    setError(null);
    let ok = false;
    try {
      ok = (await onRefuse(evacuation.munId)).ok;
    } catch {
      ok = false;
    } finally {
      setPending(false);
      setConfirming(false);
    }
    if (ok) {
      decidedHere.current = true;
      setFocusTarget(null);
    } else {
      setError(t('enclave.evacuation.refuseFailed'));
      setFocusTarget('refuse');
    }
  };
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      data-testid="enclave-negotiated-evacuation"
      data-mun-id={evacuation.munId}
      data-refused={evacuation.refused ? 'true' : 'false'}
      className="flex flex-col gap-2 border-t border-[#3a4150] pt-3"
    >
      <span id={titleId} className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-[#e0c27a]">
        {t('enclave.evacuation.title')}
      </span>
      {/* False zero: the recorded line needs a recorded convoy (at least 1 person) */}
      {evacuation.people >= 1 && evacuation.besieger !== null && (
        <p data-testid="enclave-evacuation-recorded" className="m-0 text-[15px] leading-relaxed text-[#f1e6c8]">
          {t('enclave.evacuation.recorded', {
            count: formatLocaleNumber(Math.round(evacuation.people)),
            forces: captorForces(evacuation.besieger),
          })}
        </p>
      )}
      {HISTORY_NOTE_MUN_IDS.includes(evacuation.munId) && (
        <p data-testid="enclave-evacuation-opposition" className="m-0 text-[15px] leading-relaxed text-[#ddd1b3]">
          {`${t('enclave.evacuation.opposition')} ${t('enclave.evacuation.localBan')}`}
        </p>
      )}
      {evacuation.refused ? (
        <p
          ref={stoppedRef}
          tabIndex={-1}
          data-testid="enclave-evacuation-stopped"
          className="m-0 text-[15px] leading-relaxed text-[#f1e6c8]"
        >
          {t('enclave.evacuation.stopped')}
        </p>
      ) : canDecide && (
        <>
          <p id={costId} className="m-0 text-[15px] leading-relaxed text-[#ddd1b3]">{t('enclave.evacuation.cost')}</p>
          {confirming ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="enclave-evacuation-confirm"
                className={SURFACE_SECONDARY_BUTTON}
                disabled={pending}
                aria-busy={pending}
                aria-describedby={costId}
                onClick={() => { void refuse(); }}
              >
                {t('enclave.evacuation.confirm')}
              </button>
              <button
                ref={cancelRef}
                type="button"
                className={SURFACE_SECONDARY_BUTTON}
                disabled={pending}
                onClick={() => { setConfirming(false); setFocusTarget('refuse'); }}
              >
                {t('enclave.evacuation.cancel')}
              </button>
            </div>
          ) : (
            <div>
              <button
                ref={refuseRef}
                type="button"
                data-testid="enclave-evacuation-refuse"
                className={SURFACE_SECONDARY_BUTTON}
                aria-describedby={costId}
                onClick={() => { setConfirming(true); setFocusTarget('cancel'); }}
              >
                {t('enclave.evacuation.refuse')}
              </button>
            </div>
          )}
        </>
      )}
      {error && <p role="alert" className="m-0 text-[15px] text-red-200">{error}</p>}
    </div>
  );
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

export function EnclaveDashboard({ state, open, onClose, onRefuseEvacuation }: EnclaveDashboardProps) {
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
                      {(enclave.negotiated_evacuations ?? []).map((evacuation) => (
                        <NegotiatedEvacuationSection
                          key={evacuation.munId}
                          evacuation={evacuation}
                          onRefuse={onRefuseEvacuation}
                        />
                      ))}
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
