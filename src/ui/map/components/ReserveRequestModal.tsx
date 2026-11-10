import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerFacingCorpsName } from '../../shared/playerFacingLabels';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { t, type MessageKey } from '../i18n';
import { getArmyReserveRequestCauseCopy } from '../utils/armyReserveSeverity';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';
import {
  SurfaceFigure,
  SurfaceModalBody,
  SurfaceModalFooter,
  SURFACE_LABEL_MUTED,
  SURFACE_MODAL_BACKDROP,
  SURFACE_MODAL_PANEL_COMPACT,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';
import type { PresidentialDecisionRoomNavigationTarget } from '../data/presidentialDecisionRoom';
import { buildReserveRequestPresentation } from '../data/reserveRequestPresentation';

interface ReserveRequestModalProps {
  requestId: string | null;
  state: LoadedGameState | null;
  onClose: () => void;
  onOpenReservePanel: () => void;
  onOpenDecisionRoomTarget: (target: PresidentialDecisionRoomNavigationTarget) => boolean;
}

function stripReservePrefix(requestId: string): string {
  return requestId.startsWith('reserve:') ? requestId.slice('reserve:'.length) : requestId;
}

const RESERVE_PURPOSE_LABEL_KEYS: Record<string, MessageKey> = {
  offensive: 'armyReserve.purpose.offensive',
  defensive: 'armyReserve.purpose.defensive',
};

const RESERVE_REASON_LABEL_KEYS: Record<string, MessageKey> = {
  offensive_support: 'armyReserve.reason.offensiveSupport',
  defensive_gap: 'armyReserve.reason.defensiveGap',
  exploitation: 'armyReserve.reason.exploitation',
  enclave_relief: 'armyReserve.reason.enclaveRelief',
  sector_threat: 'armyReserve.reason.sectorThreat',
};

function getReserveRequestPurposeLabel(purpose: string | null | undefined, reason: string | null | undefined): string {
  const purposeKey = RESERVE_PURPOSE_LABEL_KEYS[(purpose ?? '').trim()];
  if (purposeKey) return t(purposeKey);

  const reasonId = (reason ?? '').trim();
  const reasonKey = RESERVE_REASON_LABEL_KEYS[reasonId];
  if (reasonKey) return t(reasonKey);

  return t('armyReserve.purpose.unknown');
}

function eliteDeployCardId(requestId: string): string {
  return `command:elite-deploy:${requestId}`;
}

export function ReserveRequestModal({ requestId, state, onClose, onOpenReservePanel, onOpenDecisionRoomTarget }: ReserveRequestModalProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const rawId = requestId ? stripReservePrefix(requestId) : null;
  const request = state?.pendingReserveRequests?.find((entry) => entry.request_id === rawId) ?? null;
  const commandFallback = t('decisionModal.reserve.commandFallback');
  const corpsName = request ? getPlayerFacingCorpsName(request.corps_id, state?.formations ?? [], commandFallback) : commandFallback;
  const causeCopy = request ? getArmyReserveRequestCauseCopy(request) : null;
  const headerImage = getDecisionHeaderForFamily('reserve_request');
  const suggestedBrigade = request?.suggested_brigade_id
    ? state?.formations?.find((formation) => formation.id === request.suggested_brigade_id)
    : null;
  const presentation = request && state ? buildReserveRequestPresentation(state, request) : null;
  const suggestedBrigadeName = suggestedBrigade ? presentation?.candidateForce ?? null : null;
  const unavailable = t('corpsFront.unreported');
  const reserveDetailRows: Array<[string, string]> = presentation ? [
    [t('armyReserve.presentation.requestingCommand'), presentation.requestingCommand],
    ...(suggestedBrigade || presentation.recipientSector !== unavailable
      ? [[t('armyReserve.presentation.recipientSector'), presentation.recipientSector] as [string, string]]
      : []),
    ...(presentation.expectedEffect !== unavailable
      ? [[t('armyReserve.presentation.expectedEffect'), presentation.expectedEffect] as [string, string]]
      : []),
    ...(suggestedBrigade ? [
      [t('armyReserve.presentation.candidateForce'), presentation.candidateForce],
      [t('armyReserve.presentation.donorCommand'), presentation.donorCommand],
      [t('armyReserve.presentation.sourcePosition'), presentation.sourcePosition],
      [t('armyReserve.presentation.weakenedPosition'), presentation.weakenedPosition],
      [t('armyReserve.presentation.readiness'), presentation.readiness],
    ] as Array<[string, string]> : []),
  ] : [];

  const reviewSuggested = () => {
    if (!request || !request.suggested_brigade_id) return;
    const opened = onOpenDecisionRoomTarget({
      kind: 'decision-room',
      lens: 'command',
      cardId: eliteDeployCardId(request.request_id),
    });
    if (opened) onClose();
  };

  const decline = async () => {
    if (!request) return;
    const result = await ipc.declineReserveRequest(request.request_id, 'Presidential desk declined reserve commitment after review.');
    if (!result.ok) {
      setLoadError(result.error ?? t('decisionModal.reserve.declineFailed'));
      return;
    }
    onClose();
  };

  // Surface redesign (owner, 2026-11-10): a compact surface — the reserve plate, the three
  // figures, the request as label/value rows, the cause, and the choices in a fixed footer
  // with the reserve pool as the gold primary action.
  return (
    <Modal
      isOpen={Boolean(requestId)}
      onClose={onClose}
      zIndex={Z.CRITICAL_MODAL}
      ariaLabelledBy="reserve-request-modal-title"
      backdropClassName={SURFACE_MODAL_BACKDROP}
      panelClassName={SURFACE_MODAL_PANEL_COMPACT}
    >
      <div data-testid="reserve-request-modal" data-request-id={rawId ?? ''} className="flex min-h-0 flex-1 flex-col">
      {headerImage && (
        <DecisionModalImageHeader
          imageUrl={headerImage}
          imageAlt={t('decisionModal.reserve.imageAlt')}
          eyebrow={t('decisionModal.reserve.eyebrow')}
          title={t('decisionModal.reserve.title')}
          titleId="reserve-request-modal-title"
          description={request ? t('decisionModal.reserve.descriptionPending', { corpsName }) : t('decisionModal.reserve.descriptionResolved')}
          accentClassName="text-sky-300"
        />
      )}
      {request && (
        <SurfaceModalBody>
          <div className="grid grid-cols-3 gap-3">
            <SurfaceFigure label={t('decisionModal.reserve.priority')} value={presentation?.severity ?? t('corpsFront.unreported')} />
            <SurfaceFigure
              label={t('decisionModal.reserve.travel')}
              value={suggestedBrigade ? presentation?.travelTime ?? unavailable : t('decisionModal.reserve.travelPendingSelection')}
            />
            <SurfaceFigure label={t('decisionModal.reserve.purpose')} value={getReserveRequestPurposeLabel(request.purpose, request.reason)} />
          </div>
          {presentation && (
            <div
              role="group"
              aria-label={t('armyReserve.presentation.aria', { corps: corpsName })}
              className="flex flex-col rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-3"
            >
              {reserveDetailRows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)] gap-4 border-b border-[#262b35] py-2 last:border-b-0">
                  <span className="text-[15px] text-[#b9ad94]">{label}</span>
                  <span className="min-w-0 text-[16px] text-[#f1e6c8]">{value}</span>
                </div>
              ))}
              {!suggestedBrigade && (
                <p className="m-0 mt-2 border-t border-[#262b35] pt-3 text-[15px] leading-relaxed text-[#c2b69c]">
                  {t('decisionModal.reserve.noCandidate')}
                </p>
              )}
            </div>
          )}
          {causeCopy && (
            <div className="flex flex-col gap-1.5 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
              <div className={SURFACE_LABEL_MUTED}>{causeCopy.label}</div>
              <div className="text-[17px] font-semibold text-[#f1e6c8]">{causeCopy.summary}</div>
              <div className="text-[16px] leading-relaxed text-[#c2b69c]">{causeCopy.detail}</div>
            </div>
          )}
        </SurfaceModalBody>
      )}
      <SurfaceModalFooter>
        <button type="button" data-testid="reserve-request-close" onClick={onClose} className={SURFACE_SECONDARY_BUTTON}>{t('decisionModal.reserve.close')}</button>
        <button type="button" data-testid="reserve-request-decline" onClick={decline} disabled={!request} className="h-12 rounded-md border border-red-400/50 bg-red-500/15 px-5 text-[16px] font-semibold text-red-100 transition hover:bg-red-500/25 disabled:opacity-45">{t('decisionModal.reserve.decline')}</button>
        {request?.suggested_brigade_id && suggestedBrigadeName && (
          <button
            type="button"
            data-testid="reserve-request-review-suggested"
            onClick={reviewSuggested}
            disabled={!request}
            className={SURFACE_SECONDARY_BUTTON}
          >
            {t('decisionModal.reserve.acceptSuggested', { brigade: suggestedBrigadeName })}
          </button>
        )}
        <button type="button" data-testid="reserve-request-open-pool" onClick={onOpenReservePanel} disabled={!request} className={SURFACE_PRIMARY_BUTTON_COMPACT}>{t('decisionModal.reserve.openReservePool')}</button>
      </SurfaceModalFooter>
      </div>
    </Modal>
  );
}
