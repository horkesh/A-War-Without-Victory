import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerFacingCorpsName } from '../../shared/playerFacingLabels';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
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

export function ReserveRequestModal({ requestId, state, onClose, onOpenReservePanel }: ReserveRequestModalProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const rawId = requestId ? stripReservePrefix(requestId) : null;
  const request = state?.pendingReserveRequests?.find((entry) => entry.request_id === rawId) ?? null;
  const corpsName = request ? getPlayerFacingCorpsName(request.corps_id, state?.formations ?? [], 'Assigned command') : 'Assigned command';
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
          imageAlt="Army HQ Request"
          eyebrow="Army HQ Request"
          title="Reserve request"
          titleId="reserve-request-modal-title"
          description={request ? `${corpsName} is asking for a reserve commitment. Review the request, then open the reserve pool to assign a formation or decline it here.` : 'The reserve request is no longer pending.'}
          accentClassName="text-sky-300"
        />
      )}
      {request && (
        <div className="space-y-3 px-5 py-4 text-[12px]">
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-panel-border bg-panel-card px-2 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Priority</div>
              <div className="mt-1 text-[15px] font-bold text-text-primary">{request.priority}</div>
            </div>
            <div className="border border-panel-border bg-panel-card px-2 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Travel</div>
              <div className="mt-1 text-[15px] font-bold text-text-primary">{request.travel_hops}</div>
            </div>
            <div className="border border-panel-border bg-panel-card px-2 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Purpose</div>
              <div className="mt-1 text-[12px] font-bold text-text-primary">{request.purpose ?? request.reason}</div>
            </div>
          </div>
          <div className="border border-panel-border bg-panel-card px-3 py-3 text-text-secondary">{request.description}</div>
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-panel-border bg-black/20 px-5 py-3">
        <button type="button" onClick={onClose} className="border border-panel-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">Close</button>
        <button type="button" onClick={decline} disabled={!request} className="border border-red-400/45 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-200 disabled:opacity-40">Decline</button>
        <button type="button" onClick={onOpenReservePanel} disabled={!request} className="border border-accent-gold/45 bg-accent-gold/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-gold disabled:opacity-40">Open reserve pool</button>
      </div>
    </Modal>
  );
}
