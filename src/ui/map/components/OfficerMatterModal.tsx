import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { t } from '../i18n';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';
import {
  SURFACE_LABEL,
  SURFACE_MODAL_BACKDROP,
  SURFACE_MODAL_PANEL_COMPACT,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';
import { strictCompare } from '../../../state/validateGameState';

interface OfficerMatterModalProps {
  itemId: string | null;
  state: LoadedGameState | null;
  onClose: () => void;
  onOpenPersonnel: (target: 'briefing' | 'personnel') => void;
}

function stripOfficerPrefix(itemId: string): string {
  return itemId.startsWith('officer:') ? itemId.slice('officer:'.length) : itemId;
}

function normalizeOfficerSubject(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || null;
}

function officerEventDedupeKey(event: NonNullable<LoadedGameState['pendingOfficerEvents']>[number]): string {
  if (event.type === 'replacement_suggested') {
    const incumbent =
      normalizeOfficerSubject(event.current_commander_id)
      ?? normalizeOfficerSubject(event.current_commander_name)
      ?? normalizeOfficerSubject(event.officer_id)
      ?? normalizeOfficerSubject(event.officer_name)
      ?? normalizeOfficerSubject(event.corps_id)
      ?? normalizeOfficerSubject(event.event_id)
      ?? 'unknown';
    return `${event.type}:${incumbent}`;
  }
  const subject =
    normalizeOfficerSubject(event.officer_id)
    ?? normalizeOfficerSubject(event.current_commander_id)
    ?? normalizeOfficerSubject(event.officer_name)
    ?? normalizeOfficerSubject(event.current_commander_name)
    ?? normalizeOfficerSubject(event.event_id)
    ?? 'unknown';
  return `${event.type}:${subject}`;
}

function findOfficerMatter(
  events: NonNullable<LoadedGameState['pendingOfficerEvents']>,
  rawId: string | null,
): NonNullable<LoadedGameState['pendingOfficerEvents']>[number] | null {
  if (!rawId) return null;
  const exact = events.find((event) => event.event_id === rawId);
  if (exact) return exact;
  const matches = events
    .filter((event) => officerEventDedupeKey(event) === rawId)
    .sort((a, b) => b.turn - a.turn || strictCompare(a.event_id, b.event_id));
  return matches[0] ?? null;
}

function officerEventTypeLabel(type: string): string {
  switch (type) {
    case 'order_pushback':
    case 'army_directive_pushback':
      return t('decisionModal.officer.type.commandObjection');
    case 'replacement_suggested':
      return t('decisionModal.officer.type.replacementSuggested');
    case 'army_co_proposes_op':
      return t('decisionModal.officer.type.autonomousOperation');
    default:
      return t('decisionModal.officer.type.personnelMatter');
  }
}

export function OfficerMatterModal({ itemId, state, onClose, onOpenPersonnel }: OfficerMatterModalProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const rawId = itemId ? stripOfficerPrefix(itemId) : null;
  const event = state?.pendingOfficerEvents
    ? findOfficerMatter(state.pendingOfficerEvents, rawId)
    : null;
  const headerImage = getDecisionHeaderForFamily('officer_event');
  const acknowledgeLabel = event?.type === 'replacement_suggested'
    ? t('decisionModal.officer.keepCurrentCommander')
    : event?.type === 'officer_available'
      ? t('decisionModal.officer.fileAvailabilityNotice')
      : t('decisionModal.officer.acknowledge');
  const guidance = event?.type === 'replacement_suggested'
    ? t('decisionModal.officer.replacementGuidance', {
      officer: event.officer_name ?? t('decisionModal.officer.staffFallback'),
      incumbent: event.current_commander_name ?? t('inbox.item.officer.currentCommanderFallback'),
    })
    : event?.type === 'officer_available'
      ? t('decisionModal.officer.availabilityGuidance', {
        officer: event.officer_name ?? t('decisionModal.officer.staffFallback'),
      })
      : null;

  const acknowledge = async () => {
    if (!event) return;
    const result = await ipc.acknowledgeOfficerEvent(event.event_id);
    if (!result.ok) {
      setLoadError(result.error ?? t('decisionModal.officer.acknowledgeFailed'));
      return;
    }
    onClose();
  };

  // Surface redesign (owner, 2026-11-10): a compact surface — the personnel plate and title
  // on top, the officer and the matter in plain prose, and the three choices in a fixed
  // footer with Army HQ personnel as the gold primary action.
  return (
    <Modal
      isOpen={Boolean(itemId)}
      onClose={onClose}
      zIndex={Z.CRITICAL_MODAL}
      ariaLabelledBy="officer-matter-modal-title"
      backdropClassName={SURFACE_MODAL_BACKDROP}
      panelClassName={SURFACE_MODAL_PANEL_COMPACT}
    >
      {headerImage && (
        <DecisionModalImageHeader
          imageUrl={headerImage}
          imageAlt={t('decisionModal.officer.imageAlt')}
          eyebrow={t('decisionModal.officer.eyebrow')}
          title={t('decisionModal.officer.title')}
          titleId="officer-matter-modal-title"
          description={event ? t('decisionModal.officer.descriptionPending') : t('decisionModal.officer.descriptionResolved')}
          accentClassName="text-amber-300"
        />
      )}
      {event && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-8 py-6">
          <div className={SURFACE_LABEL}>{officerEventTypeLabel(event.type)}</div>
          <div className="text-[24px] font-semibold leading-tight text-[#f6ecd2]">{event.officer_name ?? event.current_commander_name ?? t('decisionModal.officer.staffFallback')}</div>
          {guidance && (
            <div
              data-testid="officer-matter-semantics"
              className="rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-5 py-4 text-[17px] leading-relaxed text-[#ddd1b3]"
            >
              {guidance}
            </div>
          )}
          {event.reason && <div className="rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4 text-[16px] leading-relaxed text-[#c2b69c]">{event.reason}</div>}
        </div>
      )}
      <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-[#262b35] bg-[#12161e] px-8 pb-6 pt-5">
        <button type="button" onClick={onClose} className={SURFACE_SECONDARY_BUTTON}>{t('decisionModal.officer.close')}</button>
        <button type="button" onClick={acknowledge} disabled={!event} className={SURFACE_SECONDARY_BUTTON}>{acknowledgeLabel}</button>
        <button
          type="button"
          onClick={() => onOpenPersonnel(event?.type === 'replacement_suggested' ? 'briefing' : 'personnel')}
          disabled={!event}
          className={SURFACE_PRIMARY_BUTTON_COMPACT}
        >
          {t('decisionModal.officer.openPersonnel')}
        </button>
      </div>
    </Modal>
  );
}
