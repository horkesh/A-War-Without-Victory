import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';

interface CounterOfferModalProps {
  offerId: string | null;
  state: LoadedGameState | null;
  onClose: () => void;
}

function stripCounterOfferPrefix(offerId: string): string {
  return offerId.startsWith('counter-offer:') ? offerId.slice('counter-offer:'.length) : offerId;
}

function responseLabel(response: string): string {
  if (response === 'conditional_accept') return 'Conditional accept';
  if (response === 'counter') return 'Counter proposal';
  if (response === 'accept') return 'Accept';
  if (response === 'reject') return 'Reject';
  return response.replace(/[_-]+/g, ' ');
}

function formatInstitution(value: string | undefined): string {
  if (!value) return 'Not specified';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CounterOfferModal({ offerId, state, onClose }: CounterOfferModalProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const rawId = offerId ? stripCounterOfferPrefix(offerId) : null;
  const offer = state?.pendingCounterOffers?.find((entry) => entry.id === rawId) ?? null;
  const title = offer ? `Counter-offer from ${offer.author}` : 'Counter-offer';
  const headerImage = getDecisionHeaderForFamily('counter_offer');

  const submitAsCounter = async () => {
    if (!offer) return;
    const result = await ipc.submitCounterOffer({
      parentOfferId: offer.parentOfferId,
      planId: offer.planId,
      response: offer.response === 'counter' ? 'counter' : 'conditional_accept',
      proposedSplit: offer.proposedSplit,
      rider: offer.rider,
    });
    if (!result.ok) {
      setLoadError(result.error ?? 'Counter-offer response could not be submitted.');
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(offerId)}
      onClose={onClose}
      zIndex={Z.CRITICAL_MODAL}
      ariaLabelledBy="counter-offer-modal-title"
      backdropClassName="bg-black/75 backdrop-blur-sm"
      panelClassName="w-[min(94vw,680px)] overflow-hidden rounded-lg border border-accent-gold/35 bg-panel-bg text-text-primary shadow-2xl"
    >
      {headerImage && (
        <DecisionModalImageHeader
          imageUrl={headerImage}
          imageAlt="Negotiation channel"
          eyebrow="Negotiation channel"
          title={title}
          titleId="counter-offer-modal-title"
          description={offer
            ? 'A cited counter-proposal is on your desk. Review the territorial split, institutional model, and rider before deciding whether to answer through your own counter-proposal.'
            : 'This counter-offer is no longer pending.'}
        />
      )}

      {offer && (
        <div className="space-y-4 px-5 py-4 text-[12px]">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="border border-panel-border bg-panel-card px-3 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Plan</div>
              <div className="mt-1 text-[12px] font-bold text-text-primary">{offer.planName}</div>
            </div>
            <div className="border border-panel-border bg-panel-card px-3 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Response</div>
              <div className="mt-1 text-[12px] font-bold text-text-primary">{responseLabel(offer.response)}</div>
            </div>
            <div className="border border-panel-border bg-panel-card px-3 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Chain</div>
              <div className="mt-1 text-[12px] font-bold text-text-primary">Depth {offer.chainDepth}</div>
            </div>
          </div>

          <div className="border border-panel-border bg-panel-card px-3 py-3">
            <div className="mb-2 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Territorial split</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(['RBiH', 'RS', 'HRHB'] as const).map((faction) => (
                <div key={faction} className="rounded border border-white/10 bg-black/20 px-2 py-2">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted">
                    {faction}
                  </div>
                  <div className="mt-1 text-[16px] font-bold text-text-primary">{offer.proposedSplit[faction]}%</div>
                  <div className="mt-0.5 text-[9px] text-text-muted">{getPlayerSafePoliticalFactionName(faction)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="border border-panel-border bg-panel-card px-3 py-3">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Institutional model</div>
              <div className="mt-1 text-[12px] text-text-secondary">{formatInstitution(offer.institutionalModel)}</div>
            </div>
            <div className="border border-panel-border bg-panel-card px-3 py-3">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Source</div>
              <div className="mt-1 text-[12px] text-text-secondary">{offer.sourceCitation || 'No citation provided'}</div>
            </div>
          </div>

          {offer.rider && (
            <div className="border border-accent-gold/25 bg-accent-gold/8 px-3 py-3">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-accent-gold">Rider</div>
              <div className="mt-1 text-[12px] text-text-secondary">{offer.rider}</div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-panel-border bg-black/20 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="border border-panel-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary"
        >
          Review later
        </button>
        <button
          type="button"
          onClick={() => void submitAsCounter()}
          disabled={!offer}
          className="border border-accent-gold/45 bg-accent-gold/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-gold disabled:opacity-40"
        >
          Submit as counter-proposal
        </button>
      </div>
    </Modal>
  );
}
