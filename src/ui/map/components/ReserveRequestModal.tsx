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

interface ReserveRequestModalProps {
  requestId: string | null;
  state: LoadedGameState | null;
  onClose: () => void;
  onOpenReservePanel: () => void;
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

export function ReserveRequestModal({ requestId, state, onClose, onOpenReservePanel }: ReserveRequestModalProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const rawId = requestId ? stripReservePrefix(requestId) : null;
  const request = state?.pendingReserveRequests?.find((entry) => entry.request_id === rawId) ?? null;
  const commandFallback = t('decisionModal.reserve.commandFallback');
  const corpsName = request ? getPlayerFacingCorpsName(request.corps_id, state?.formations ?? [], commandFallback) : commandFallback;
  const causeCopy = request ? getArmyReserveRequestCauseCopy(request) : null;
  const headerImage = getDecisionHeaderForFamily('reserve_request');

  const decline = async () => {
    if (!request) return;
    const result = await ipc.declineReserveRequest(request.request_id, 'Presidential desk declined reserve commitment after review.');
    if (!result.ok) {
      setLoadError(result.error ?? 'Reserve request could not be declined.');
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(requestId)}
      onClose={onClose}
      zIndex={Z.CRITICAL_MODAL}
      ariaLabelledBy="reserve-request-modal-title"
      backdropClassName="bg-black/75 backdrop-blur-sm"
      panelClassName="w-[min(92vw,620px)] overflow-hidden rounded-lg border border-sky-400/35 bg-panel-bg text-text-primary shadow-2xl"
    >
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
        <div className="space-y-3 px-5 py-4 text-[12px]">
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-panel-border bg-panel-card px-2 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionModal.reserve.priority')}</div>
              <div className="mt-1 text-[15px] font-bold text-text-primary">{request.priority}</div>
            </div>
            <div className="border border-panel-border bg-panel-card px-2 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionModal.reserve.travel')}</div>
              <div className="mt-1 text-[15px] font-bold text-text-primary">{request.travel_hops}</div>
            </div>
            <div className="border border-panel-border bg-panel-card px-2 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionModal.reserve.purpose')}</div>
              <div className="mt-1 text-[12px] font-bold text-text-primary">{getReserveRequestPurposeLabel(request.purpose, request.reason)}</div>
            </div>
          </div>
          {causeCopy && (
            <div className="border border-panel-border bg-panel-card px-3 py-3 text-text-secondary">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{causeCopy.label}</div>
              <div className="mt-1 text-text-primary">{causeCopy.summary}</div>
              <div className="mt-1">{causeCopy.detail}</div>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-panel-border bg-black/20 px-5 py-3">
        <button type="button" onClick={onClose} className="border border-panel-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">{t('decisionModal.reserve.close')}</button>
        <button type="button" onClick={decline} disabled={!request} className="border border-red-400/45 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-200 disabled:opacity-40">{t('decisionModal.reserve.decline')}</button>
        <button type="button" onClick={onOpenReservePanel} disabled={!request} className="border border-accent-gold/45 bg-accent-gold/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-gold disabled:opacity-40">{t('decisionModal.reserve.openReservePool')}</button>
      </div>
    </Modal>
  );
}
