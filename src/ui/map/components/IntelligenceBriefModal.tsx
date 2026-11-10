import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { t } from '../i18n';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';
import {
  SurfaceModalBody,
  SurfaceModalFooter,
  SURFACE_MODAL_BACKDROP,
  SURFACE_MODAL_PANEL_COMPACT,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';

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
      setLoadError(result.error ?? t('decisionModal.intel.acknowledgeFailed'));
      return;
    }
    onClose();
  };

  // Surface redesign (owner, 2026-11-10): a compact surface — intelligence plate and the
  // brief's headline, the brief in 18px prose, Close and File brief (gold) in a fixed footer.
  return (
    <Modal
      isOpen={Boolean(notificationId)}
      onClose={onClose}
      zIndex={Z.CRITICAL_MODAL}
      ariaLabelledBy="intelligence-brief-modal-title"
      backdropClassName={SURFACE_MODAL_BACKDROP}
      panelClassName={SURFACE_MODAL_PANEL_COMPACT}
    >
      {headerImage && (
        <DecisionModalImageHeader
          imageUrl={headerImage}
          imageAlt={t('decisionModal.intel.imageAlt')}
          eyebrow={t('decisionModal.intel.eyebrow')}
          title={notification?.headline ?? t('decisionModal.intel.titleFallback')}
          titleId="intelligence-brief-modal-title"
          accentClassName="text-sky-300"
        />
      )}
      <SurfaceModalBody>
        <p className="m-0 text-[18px] leading-relaxed text-[#ddd1b3]">
          {notification?.body ?? t('decisionModal.intel.bodyFallback')}
        </p>
      </SurfaceModalBody>
      <SurfaceModalFooter>
        <button type="button" onClick={onClose} className={SURFACE_SECONDARY_BUTTON}>{t('decisionModal.intel.close')}</button>
        <button type="button" onClick={acknowledge} disabled={!notification} className={SURFACE_PRIMARY_BUTTON_COMPACT}>{t('decisionModal.intel.acknowledge')}</button>
      </SurfaceModalFooter>
    </Modal>
  );
}
