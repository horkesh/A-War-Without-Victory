import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { t, type MessageKey } from '../i18n';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';
import {
  SurfaceFigure,
  SurfaceModalBody,
  SurfaceModalFooter,
  SURFACE_LABEL,
  SURFACE_MODAL_BACKDROP,
  SURFACE_MODAL_PANEL_COMPACT,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';

interface CounterOfferModalProps {
  offerId: string | null;
  state: LoadedGameState | null;
  onClose: () => void;
}

function stripCounterOfferPrefix(offerId: string): string {
  return offerId.startsWith('counter-offer:') ? offerId.slice('counter-offer:'.length) : offerId;
}

function responseLabel(response: string): string {
  const labelKeys: Record<string, MessageKey> = {
    conditional_accept: 'decisionModal.counterOffer.responseConditional',
    counter: 'decisionModal.counterOffer.responseCounter',
    accept: 'decisionModal.counterOffer.responseAccept',
    reject: 'decisionModal.counterOffer.responseReject',
  };
  return t(labelKeys[response] ?? 'decisionModal.counterOffer.responseUnknown');
}

function formatInstitution(value: string | undefined): string {
  if (!value) return t('decisionModal.counterOffer.notSpecified');
  const labelKeys: Record<string, MessageKey> = {
    union_3_republics: 'decisionModal.counterOffer.institution.union3Republics',
    cantons: 'decisionModal.counterOffer.institution.cantons',
    cantonized: 'decisionModal.counterOffer.institution.cantons',
    '10_provinces': 'decisionModal.counterOffer.institution.tenProvinces',
  };
  return t(labelKeys[value] ?? 'decisionModal.counterOffer.institutionUnknown');
}

export function CounterOfferModal({ offerId, state, onClose }: CounterOfferModalProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const rawId = offerId ? stripCounterOfferPrefix(offerId) : null;
  const offer = state?.pendingCounterOffers?.find((entry) => entry.id === rawId) ?? null;
  const authorLabel = offer
    ? offer.author === 'PLAYER'
      ? t('decisionModal.counterOffer.yourDelegation')
      : getPlayerSafePoliticalFactionName(offer.author)
    : '';
  const title = offer ? t('decisionModal.counterOffer.titleFrom', { author: authorLabel }) : t('decisionModal.counterOffer.titleFallback');
  const headerImage = getDecisionHeaderForFamily('counter_offer');
  const unavailableReason = t('decisionModal.counterOffer.descriptionResolved');

  const submitAsCounter = async () => {
    if (!offer) return;
    const result = await ipc.submitCounterOffer({
      parentOfferId: offer.id,
      planId: offer.planId,
      response: offer.response === 'counter' ? 'counter' : 'conditional_accept',
      proposedSplit: offer.proposedSplit,
      rider: offer.rider,
    });
    if (!result.ok) {
      setLoadError(result.error ?? t('decisionModal.counterOffer.submitFailed'));
      return;
    }
    onClose();
  };

  // Surface redesign (owner, 2026-11-10): a compact surface — plate and title, the offer's
  // figures, split, model, source and rider in plain 15–19px type, and the two answers in
  // a fixed footer.
  return (
    <Modal
      isOpen={Boolean(offerId)}
      onClose={onClose}
      zIndex={Z.CRITICAL_MODAL}
      ariaLabelledBy="counter-offer-modal-title"
      backdropClassName={SURFACE_MODAL_BACKDROP}
      panelClassName={SURFACE_MODAL_PANEL_COMPACT}
    >
      {headerImage && (
        <DecisionModalImageHeader
          imageUrl={headerImage}
          imageAlt={t('decisionModal.counterOffer.imageAlt')}
          eyebrow={t('decisionModal.counterOffer.eyebrow')}
          title={title}
          titleId="counter-offer-modal-title"
          description={offer
            ? t('decisionModal.counterOffer.descriptionPending')
            : t('decisionModal.counterOffer.descriptionResolved')}
        />
      )}

      {offer && (
        <SurfaceModalBody>
          <div className="grid gap-3 sm:grid-cols-3">
            <SurfaceFigure label={t('decisionModal.counterOffer.plan')} value={offer.planName} />
            <SurfaceFigure label={t('decisionModal.counterOffer.response')} value={responseLabel(offer.response)} />
            <SurfaceFigure label={t('decisionModal.counterOffer.chain')} value={t('decisionModal.counterOffer.chainDepth', { depth: offer.chainDepth })} />
          </div>

          <section className="flex flex-col gap-2">
            <div className={SURFACE_LABEL}>{t('decisionModal.counterOffer.territorialSplit')}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['RBiH', 'RS', 'HRHB'] as const).map((faction) => (
                <SurfaceFigure
                  key={faction}
                  label={getPlayerSafePoliticalFactionName(faction)}
                  value={<span className="font-mono text-[22px]">{offer.proposedSplit[faction]}%</span>}
                />
              ))}
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <SurfaceFigure label={t('decisionModal.counterOffer.institutionalModel')} value={<span className="text-[16px] font-normal text-[#ddd1b3]">{formatInstitution(offer.institutionalModel)}</span>} />
            <SurfaceFigure label={t('decisionModal.counterOffer.source')} value={<span className="text-[16px] font-normal text-[#ddd1b3]">{offer.sourceCitation || t('decisionModal.counterOffer.noCitation')}</span>} />
          </div>

          {offer.rider && (
            <div className="flex flex-col gap-1.5 rounded-md border border-accent-gold/30 bg-accent-gold/[0.06] px-5 py-4">
              <div className={SURFACE_LABEL}>{t('decisionModal.counterOffer.rider')}</div>
              <div className="text-[16px] leading-relaxed text-[#ddd1b3]">{offer.rider}</div>
            </div>
          )}
        </SurfaceModalBody>
      )}

      {!offer && (
        <div
          id="counter-offer-unavailable-reason"
          className="px-8 py-6 text-[16px] leading-relaxed text-[#c2b69c]"
        >
          {unavailableReason}
        </div>
      )}

      <SurfaceModalFooter>
        <button
          type="button"
          onClick={onClose}
          className={SURFACE_SECONDARY_BUTTON}
        >
          {t('decisionModal.counterOffer.reviewLater')}
        </button>
        <button
          type="button"
          onClick={() => void submitAsCounter()}
          disabled={!offer}
          aria-describedby={!offer ? 'counter-offer-unavailable-reason' : undefined}
          title={!offer ? unavailableReason : undefined}
          className={SURFACE_PRIMARY_BUTTON_COMPACT}
        >
          {t('decisionModal.counterOffer.submit')}
        </button>
      </SurfaceModalFooter>
    </Modal>
  );
}
