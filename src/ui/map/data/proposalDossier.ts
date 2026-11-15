// Command loop L5 (2026-11-15): proposal dossiers, entry-chunk core.
//
// Every offensive proposal the president sees carries a short dossier, so there is
// something to decide on (docs/40_reports/proposals/20261114_COMMAND_LOOP_PROPOSAL.md
// §5A). This module holds what the Decision Room card list needs: a localized title, the
// one-sentence header (who asks, with what, for what) and the map target for Show on map.
// The facts under the header (objective, forces, attributed odds, cost, holding back, the
// refusal buttons) live in proposalDossierDetail.ts, which only the lazily loaded
// ProposalDossierFacts imports, because the map entry chunk is at its limit.
//
// Read-only and deterministic: no state, no randomness, no clock.
//
// Canonical owner: src/ui/map/data/proposalDossier.ts

import type { OpProposalCardView } from './backTheOfficer';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import type { FieldOperationPlanTarget } from '../utils/fieldInspectionTarget';
import { t } from '../i18n';

export interface ProposalDossier {
  /** The card title, localized; generated plans are named after their origin settlement. */
  title: string;
  /** One sentence: who asks, with what, for what. */
  header: string;
  /** Map focus for Show on map; null when no settlement is known. */
  fieldTarget: FieldOperationPlanTarget | null;
}

function knownStrings(values: readonly (string | undefined)[] | undefined): string[] {
  return (values ?? []).filter((value): value is string => (
    typeof value === 'string' && value.length > 0 && !/^unreported/i.test(value)
  ));
}

export function buildProposalDossier(
  card: OpProposalCardView,
  osidNameMap: Record<string, string> | null,
): ProposalDossier {
  const inputs = card.dossier_inputs;
  const targetOsids = (card.target_osids ?? []).filter((osid) => osid.length > 0);
  const targetNames = targetOsids.length > 0
    ? targetOsids.map((osid) => getOsidDisplayName(osid, osidNameMap))
    : knownStrings(card.targets);
  const forces = knownStrings(card.forces);
  const officer = card.commander && !card.commander.lost ? card.commander.name : null;
  const asker = officer ?? card.corps_name;
  // A generated plan has no name of its own; the read model names it in English after its
  // origin settlement, so the title is rebuilt here in the active language.
  const title = card.objective_origin_osid
    ? t('dossier.title.advanceFrom', { place: getOsidDisplayName(card.objective_origin_osid, osidNameMap) })
    : card.op_name;

  const header = targetNames.length > 0 && forces.length > 0
    ? t(forces.length === 1 ? 'dossier.header.one' : 'dossier.header.many', {
      asker,
      count: forces.length,
      target: targetNames[0],
    })
    : t('dossier.header.plain', { asker, operation: title });

  const stagingOsids = inputs?.staging_osid ? [inputs.staging_osid] : [];
  const fieldTarget: FieldOperationPlanTarget | null = targetOsids.length > 0 || stagingOsids.length > 0
    ? {
      kind: 'field-operation-plan',
      proposalId: card.proposal_id,
      corpsId: card.corps_id,
      objectiveOsids: targetOsids,
      stagingOsids,
      formationIds: inputs?.brigade_ids ?? [],
    }
    : null;

  return { title, header, fieldTarget };
}
