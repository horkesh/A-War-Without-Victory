import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';

interface OfficerMatterModalProps {
  itemId: string | null;
  state: LoadedGameState | null;
  onClose: () => void;
  onOpenPersonnel: () => void;
}

function stripOfficerPrefix(itemId: string): string {
  return itemId.startsWith('officer:') ? itemId.slice('officer:'.length) : itemId;
}

export function OfficerMatterModal({ itemId, state, onClose, onOpenPersonnel }: OfficerMatterModalProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const rawId = itemId ? stripOfficerPrefix(itemId) : null;
  const event = state?.pendingOfficerEvents?.find((entry) => entry.event_id === rawId) ?? state?.pendingOfficerEvents?.[0] ?? null;
  const headerImage = getDecisionHeaderForFamily('officer_event');

  const acknowledge = async () => {
    if (!event) return;
    const result = await ipc.acknowledgeOfficerEvent(event.event_id);
    if (!result.ok) {
      setLoadError(result.error ?? 'Officer matter could not be acknowledged.');
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(itemId)}
      onClose={onClose}
      zIndex={Z.CRITICAL_MODAL}
      ariaLabelledBy="officer-matter-modal-title"
      backdropClassName="bg-black/75 backdrop-blur-sm"
      panelClassName="w-[min(92vw,560px)] overflow-hidden rounded-lg border border-amber-400/35 bg-panel-bg text-text-primary shadow-2xl"
    >
      {headerImage && (
        <DecisionModalImageHeader
          imageUrl={headerImage}
          imageAlt="Personnel Office"
          eyebrow="Personnel Office"
          title="Personnel matter"
          titleId="officer-matter-modal-title"
          description={event ? 'A commander or staff matter has been placed on your desk. Acknowledge it or open the personnel dossier for assignment details.' : 'The personnel matter is no longer pending.'}
          accentClassName="text-amber-300"
        />
      )}
      {event && (
        <div className="space-y-2 px-5 py-4 text-[12px]">
          <div className="font-bold text-text-primary">{event.officer_name ?? event.current_commander_name ?? 'Staff officer'}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-text-muted">{event.type.replace(/_/g, ' ')}</div>
          {event.reason && <div className="border border-panel-border bg-panel-card px-3 py-3 text-text-secondary">{event.reason}</div>}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-panel-border bg-black/20 px-5 py-3">
        <button type="button" onClick={onClose} className="border border-panel-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">Close</button>
        <button type="button" onClick={acknowledge} disabled={!event} className="border border-panel-border bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-primary disabled:opacity-40">Acknowledge</button>
        <button type="button" onClick={onOpenPersonnel} disabled={!event} className="border border-accent-gold/45 bg-accent-gold/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-gold disabled:opacity-40">Open personnel</button>
      </div>
    </Modal>
  );
}
