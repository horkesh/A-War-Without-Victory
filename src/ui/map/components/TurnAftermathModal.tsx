/**
 * LANE-V094-MODAL-MIGRATION: migrated to shared `<Modal>` wrapper for
 * canonical ESC dismissal, focus management, aria contracts, and z-index.
 * Original markup had no click-outside dismiss; preserved via
 * `closeOnBackdropClick={false}`. No tutorial `data-tutorial-step`
 * anchors inside this modal.
 */
import { useEffect, useState, type ComponentType } from 'react';
import {
  buildTurnAftermathDispatch,
  type TurnAftermathDispatch,
  type TurnAftermathDispatchLine,
  type TurnAftermathTopAction,
  type TurnAftermathView,
} from '../data/turnAftermath';
import type { ConsequenceReceipt } from '../data/consequenceReceipts';
import type { ForcedOpReceipt } from '../data/forcedOpReceipts';
import type { OfficerResentmentReceipt } from '../data/officerResentmentReceipts';
import type { TurnAftermathRecordFaceProps } from './TurnAftermathRecordFace';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { getAftermathHeaderForTone } from '../data/presidentialDeskAssets';
import { t, type MessageKey } from '../i18n';
import {
  SURFACE_CHIP,
  SURFACE_CLOSE_BUTTON,
  SURFACE_LABEL,
  SURFACE_MODAL_BACKDROP,
  SURFACE_MODAL_PANEL_COMPACT,
  SURFACE_MODAL_PANEL_FULL,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';

/** Which face of the week's report is showing: the compact dispatch or the full record. */
export type TurnAftermathModalMode = 'dispatch' | 'record';

// The full record lives in its own chunk (command loop L2, 2026-11-14): the entry bundle
// carries only the dispatch, which is what the report opens on. The module is fetched
// whenever the report opens, so "Full record" is normally ready before it is clicked.
let loadedRecordFace: ComponentType<TurnAftermathRecordFaceProps> | null = null;
let recordFacePromise: Promise<ComponentType<TurnAftermathRecordFaceProps>> | null = null;

/** Fetch the full-record face; resolves once it can render synchronously. */
export function preloadTurnAftermathRecordFace(): Promise<ComponentType<TurnAftermathRecordFaceProps>> {
  if (loadedRecordFace) return Promise.resolve(loadedRecordFace);
  recordFacePromise ??= import('./TurnAftermathRecordFace').then((module) => {
    loadedRecordFace = module.TurnAftermathRecordFace;
    return module.TurnAftermathRecordFace;
  }).catch((error: unknown) => {
    recordFacePromise = null;
    throw error;
  });
  return recordFacePromise;
}

function RecordFaceSlot(props: TurnAftermathRecordFaceProps) {
  const [Face, setFace] = useState<ComponentType<TurnAftermathRecordFaceProps> | null>(() => loadedRecordFace);
  useEffect(() => {
    if (Face) return;
    let alive = true;
    preloadTurnAftermathRecordFace()
      .then((component) => { if (alive) setFace(() => component); })
      .catch(() => { /* the slot stays on its placeholder; the dispatch is still reachable */ });
    return () => { alive = false; };
  }, [Face]);
  if (!Face) {
    return <div data-testid="turn-aftermath-record-loading" className="min-h-0 flex-1" aria-busy="true" />;
  }
  return <Face {...props} />;
}

interface TurnAftermathModalProps {
  isOpen: boolean;
  view: TurnAftermathView | null;
  onClose: () => void;
  onOpenInbox: () => void;
  onOpenSummary: () => void;
  onOpenRecords: () => void;
  onOpenChronicle: () => void;
  onOpenCodex: (eventId?: string) => void;
  onReviewAction?: (action: TurnAftermathTopAction) => void;
  /**
   * Realized consequence receipts whose CONFIRMED firing landed on this turn.
   * Closes the promise→receipt loop: each entry pairs the player's originating
   * decision with the downstream consequence the dossier predicted, now
   * actually delivered by the engine. Empty/absent → section not rendered.
   */
  consequences?: readonly ConsequenceReceipt[];
  /**
   * Forced-operation receipts whose operation resolved on this turn. Closes the
   * force-op AFTER-loop: each entry pairs an operation the president
   * force-launched over the corps commander's objection with the outcome it
   * actually produced. Sober/negative-sum tone, never celebratory.
   * Empty/absent → section not rendered.
   */
  forcedOps?: readonly ForcedOpReceipt[];
  /**
   * Officer-resentment receipts whose override landed on this turn. Closes the
   * force-op HUMAN-COST loop: each entry names a corps commander the president
   * overrode by force-launching past his objection, and the command-loyalty cost
   * it incurred (running override count, and whether the CO is now cowed). Sober
   * tone, never celebratory. Empty/absent → section not rendered.
   */
  officerResentment?: readonly OfficerResentmentReceipt[];
  /**
   * The face the report opens on. Defaults to the "This week" dispatch (command loop
   * L2); the full two-column record is one click away.
   */
  initialMode?: TurnAftermathModalMode;
  /**
   * Show a named place from the dispatch on the tactical map. The owner (App) closes the
   * report and routes through the field-inspection handoff, so the map is the active shell
   * before it focuses; called from the Warroom, a hidden map would ignore a direct pan.
   * Absent → no "Show on map" buttons.
   */
  onShowOnMap?: (osid: string) => void;
}

function toneClasses(tone: TurnAftermathView['tone']): string {
  if (tone === 'gain') return 'border-emerald-400/40 text-emerald-300 bg-emerald-950/30';
  if (tone === 'loss') return 'border-red-400/40 text-red-300 bg-red-950/30';
  if (tone === 'mixed') return 'border-amber-400/40 text-amber-300 bg-amber-950/30';
  return 'border-white/15 text-text-secondary bg-white/5';
}

function enumLabel(prefix: string, value: string): string {
  return t(`${prefix}.${value}` as MessageKey);
}


export function TurnAftermathModal({
  isOpen,
  view,
  onClose,
  onOpenInbox,
  onOpenSummary,
  onOpenRecords,
  onOpenChronicle,
  onOpenCodex,
  onReviewAction,
  consequences,
  forcedOps,
  officerResentment,
  initialMode = 'dispatch',
  onShowOnMap,
}: TurnAftermathModalProps) {
  const [mode, setMode] = useState<TurnAftermathModalMode>(initialMode);
  // Every opening, and every new week, starts on the dispatch again; the record face is
  // fetched in the background so "Full record" opens at once.
  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    void preloadTurnAftermathRecordFace();
  }, [isOpen, view?.turn, initialMode]);

  if (!view) return null;

  const dispatch = mode === 'dispatch'
    ? buildTurnAftermathDispatch({ view, consequences, forcedOps, officerResentment })
    : null;
  const showOnMap = onShowOnMap ?? null;

  const primaryAction = view.nextActions.topItems[0] ?? null;
  const primaryActionLabelKey: MessageKey = primaryAction?.severity === 'blocking'
    ? 'turnAftermath.primaryAction.requiredLabel'
    : 'turnAftermath.primaryAction.label';
  const triggerActionReview = (item: TurnAftermathTopAction) => {
    if (onReviewAction) {
      onReviewAction(item);
    } else {
      onOpenInbox();
    }
  };

  // Surface redesign (owner, 2026-11-10) and command loop L2 (2026-11-14): the week's
  // still, date, tone and headline across the top; below it either the "This week"
  // dispatch (the default face) or the full two-column record.
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={Z.TURN_AFTERMATH}
      closeOnBackdropClick={false}
      initialFocusTestId={primaryAction?.severity === 'blocking' ? 'turn-aftermath-primary-action' : undefined}
      ariaLabelledBy="turn-aftermath-title"
      backdropClassName={SURFACE_MODAL_BACKDROP}
      panelClassName={dispatch ? SURFACE_MODAL_PANEL_COMPACT : SURFACE_MODAL_PANEL_FULL}
    >
      <>
        <div
          data-turn-aftermath-mode={mode}
          className={`relative flex shrink-0 items-end justify-between gap-6 overflow-hidden border-b border-[#262b35] ${dispatch ? 'min-h-28 px-7 py-4' : 'min-h-44 px-8 py-6'}`}
        >
          {/* Image-plus-fade band, kept inline because this header lays the close
              button beside the title; DecisionModalImageHeader owns the shared recipe. */}
          <img
            data-testid="turn-aftermath-header-art"
            src={getAftermathHeaderForTone(view.tone)}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/92 via-black/80 to-black/45" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="relative flex min-w-0 max-w-[52rem] flex-col gap-1.5">
            <div id="turn-aftermath-title" className={SURFACE_LABEL}>
              {dispatch ? t('dispatch.title') : t('turnAftermath.title')}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className={`m-0 font-semibold leading-tight text-[#f6ecd2] ${dispatch ? 'text-[26px]' : 'text-[30px]'}`}>{view.dateLabel}</h2>
              <span className={`${SURFACE_CHIP} ${toneClasses(view.tone)}`}>
                {enumLabel('turnAftermath.tone', view.tone)}
              </span>
            </div>
            {dispatch ? (
              <div data-testid="turn-aftermath-dispatch-headline" className="text-[20px] font-semibold leading-snug text-[#f1e6c8]">
                {dispatch.headline}
              </div>
            ) : (
              <>
                <div className="text-[18px] font-semibold text-[#e2d6b8]">{view.headline}</div>
                <div className="text-[17px] leading-relaxed text-[#ddd1b3]">{view.narrativeLine}</div>
              </>
            )}
          </div>
          <div className="relative flex shrink-0 items-center gap-3">
            {!dispatch && (
              <button
                type="button"
                data-testid="turn-aftermath-back-to-dispatch"
                onClick={() => setMode('dispatch')}
                className={SURFACE_CLOSE_BUTTON}
              >
                {t('dispatch.backToDispatch')}
              </button>
            )}
            <button
              type="button"
              data-testid="turn-aftermath-close"
              onClick={onClose}
              className={SURFACE_CLOSE_BUTTON}
            >
              {t('turnAftermath.continue')}
            </button>
          </div>
        </div>

        {dispatch ? (
          <DispatchBody
            dispatch={dispatch}
            primaryAction={primaryAction}
            primaryActionLabel={t(primaryActionLabelKey)}
            onReviewPrimary={primaryAction ? () => triggerActionReview(primaryAction) : null}
            onOpenReview={onOpenInbox}
            onShowOnMap={showOnMap}
            onOpenRecord={() => setMode('record')}
          />
        ) : (
          <RecordFaceSlot
            view={view}
            consequences={consequences}
            forcedOps={forcedOps}
            officerResentment={officerResentment}
            primaryAction={primaryAction}
            primaryActionLabelKey={primaryActionLabelKey}
            onReviewAction={triggerActionReview}
            onOpenInbox={onOpenInbox}
            onOpenSummary={onOpenSummary}
            onOpenRecords={onOpenRecords}
            onOpenChronicle={onOpenChronicle}
            onOpenCodex={onOpenCodex}
          />
        )}
      </>
    </Modal>
  );
}

const DISPATCH_LABEL_KEYS: Record<TurnAftermathDispatchLine['kind'], MessageKey> = {
  ground: 'dispatch.label.ground',
  fighting: 'dispatch.label.fighting',
  cost: 'dispatch.label.cost',
  orders: 'dispatch.label.orders',
  needs: 'dispatch.label.needs',
  quiet: 'dispatch.label.quiet',
};

/**
 * The "This week" dispatch (command-loop proposal §4 2B): at most six lines, the
 * headline in the header above. Sized to fit 1280×720 without scrolling.
 */
function DispatchBody({
  dispatch,
  primaryAction,
  primaryActionLabel,
  onReviewPrimary,
  onOpenReview,
  onShowOnMap,
  onOpenRecord,
}: {
  dispatch: TurnAftermathDispatch;
  primaryAction: TurnAftermathTopAction | null;
  primaryActionLabel: string;
  onReviewPrimary: (() => void) | null;
  onOpenReview: () => void;
  onShowOnMap: ((osid: string) => void) | null;
  onOpenRecord: () => void;
}) {
  return (
    <>
      <div data-testid="turn-aftermath-dispatch" data-dispatch-quiet={dispatch.quiet ? 'true' : 'false'} className="min-h-0 flex-1 overflow-y-auto">
        <ul className="m-0 list-none divide-y divide-[#262b35] p-0">
          {dispatch.lines.map((line) => (
            <li
              key={line.kind}
              data-testid={`turn-aftermath-dispatch-line-${line.kind}`}
              className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-start gap-5 px-7 py-3.5"
            >
              <div className="pt-0.5 text-[14px] font-semibold uppercase tracking-[0.14em] text-[#e0c27a]">
                {t(DISPATCH_LABEL_KEYS[line.kind])}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[17px] leading-snug text-[#f1e6c8]">{line.text}</span>
                  {line.basis && <span className="text-[14px] text-[#9c917b]">{line.basis}</span>}
                  {line.kind === 'needs' && (
                    <button
                      type="button"
                      data-testid="turn-aftermath-dispatch-review"
                      onClick={onOpenReview}
                      className="h-10 rounded-md border border-[#3a4150] bg-[#1b2029] px-4 text-[15px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60"
                    >
                      {t('dispatch.openReview')}
                    </button>
                  )}
                </div>
                {line.places && line.places.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {line.places.map((place) => (
                      <span
                        key={place.osid}
                        data-testid="turn-aftermath-dispatch-place"
                        className={`inline-flex items-center gap-2 rounded border px-3 py-1 text-[15px] ${place.direction === 'gain' ? 'border-emerald-400/40 text-emerald-200' : 'border-red-400/40 text-red-200'}`}
                      >
                        <span>{place.label}</span>
                        {onShowOnMap && (
                          <button
                            type="button"
                            data-testid="turn-aftermath-dispatch-show-on-map"
                            onClick={() => onShowOnMap(place.osid)}
                            aria-label={t('dispatch.showOnMapAria', { place: place.label })}
                            className="text-[14px] font-semibold text-sky-200 underline-offset-2 hover:underline"
                          >
                            {t('dispatch.showOnMap')}
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#262b35] bg-[#0f1218] px-7 py-4">
        <button
          type="button"
          data-testid="turn-aftermath-full-record"
          onClick={onOpenRecord}
          className={SURFACE_SECONDARY_BUTTON}
        >
          {t('dispatch.fullRecord')}
        </button>
        {primaryAction && onReviewPrimary && (
          <button
            type="button"
            data-testid="turn-aftermath-primary-action"
            onClick={onReviewPrimary}
            aria-label={t('turnAftermath.primaryAction.aria', {
              action: primaryAction.actionLabel,
              title: primaryAction.title,
              detail: primaryAction.detail ?? '',
            })}
            className={`${SURFACE_PRIMARY_BUTTON_COMPACT} max-w-[60%] truncate`}
          >
            {primaryActionLabel}: {primaryAction.actionLabel}
          </button>
        )}
      </div>
    </>
  );
}

