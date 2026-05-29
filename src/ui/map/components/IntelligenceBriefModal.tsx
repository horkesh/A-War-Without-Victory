import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';

interface IntelligenceBriefModalProps {
  notificationId: string | null;
  state: LoadedGameState | null;
  onClose: () => void;
}

function stripIntelPrefix(notificationId: string): string {
  return notificationId.startsWith('intel:') ? notificationId.slice('intel:'.length) : notificationId;
}

export function IntelligenceBriefModal({ notificationId, state, onClose }: IntelligenceBriefModalProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const rawId = notificationId ? stripIntelPrefix(notificationId) : null;
  const notification = state?.pendingEventNotifications?.find((entry) => entry.notification_id === rawId) ?? null;
  const headerImage = getDecisionHeaderForFamily('intelligence_notification');

  const acknowledge = async () => {
    if (!notification) return;
    const result = await ipc.dismissEventNotification(notification.notification_id);
    if (!result.ok) {
      setLoadError(result.error ?? 'Intelligence brief could not be acknowledged.');
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(notificationId)}
      onClose={onClose}
      zIndex={Z.CRITICAL_MODAL}
      ariaLabelledBy="intelligence-brief-modal-title"
      backdropClassName="bg-black/75 backdrop-blur-sm"
      panelClassName="w-[min(92vw,560px)] overflow-hidden rounded-lg border border-sky-400/35 bg-panel-bg text-text-primary shadow-2xl"
    >
      {headerImage && (
        <DecisionModalImageHeader
          imageUrl={headerImage}
          imageAlt="Intelligence Channel"
          eyebrow="Intelligence Channel"
          title={notification?.headline ?? 'Intelligence brief'}
          titleId="intelligence-brief-modal-title"
          accentClassName="text-sky-300"
        />
      )}
      <div className="px-5 py-4 text-[12px] leading-relaxed text-text-secondary">
        {notification?.body ?? 'This intelligence brief is no longer pending.'}
      </div>
      <div className="flex justify-end gap-2 border-t border-panel-border bg-black/20 px-5 py-3">
        <button type="button" onClick={onClose} className="border border-panel-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">Close</button>
        <button type="button" onClick={acknowledge} disabled={!notification} className="border border-accent-gold/45 bg-accent-gold/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-gold disabled:opacity-40">Acknowledge</button>
      </div>
    </Modal>
  );
}
