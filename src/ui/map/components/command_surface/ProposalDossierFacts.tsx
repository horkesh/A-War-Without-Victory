/**
 * ProposalDossierFacts: the facts under an operation proposal's dossier header in the
 * Command Surface (command loop L5, 2026-11-15). Lazily loaded by CommandSurface, so the
 * detail copy and the odds logic (proposalDossierDetail.ts) stay out of the map entry chunk.
 *
 * Canonical owner: src/ui/map/components/command_surface/ProposalDossierFacts.tsx
 */
import type { OpProposalCardView } from '../../data/backTheOfficer';
import { buildProposalDossierFacts } from '../../data/proposalDossierDetail';
import { t } from '../../i18n';
import { SurfaceFacts } from '../surface/Surface';

export interface ProposalDossierFactsProps {
  card: OpProposalCardView;
  osidNameMap: Record<string, string> | null;
}

export function ProposalDossierFacts({ card, osidNameMap }: ProposalDossierFactsProps) {
  const { facts } = buildProposalDossierFacts(card, osidNameMap);
  return (
    <div data-testid="proposal-dossier-facts">
      <SurfaceFacts label={t('commandSurface.whatToKnow')} facts={facts} />
    </div>
  );
}

export default ProposalDossierFacts;
