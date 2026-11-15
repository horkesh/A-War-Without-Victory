// Command loop L5 (2026-11-15): proposal dossiers.
//
// Every offensive proposal the president sees carries a short dossier, so there is
// something to decide on (docs/40_reports/proposals/20261114_COMMAND_LOOP_PROPOSAL.md
// §5A). A header (who asks, with what, for what) and up to six facts, each shown only
// when known: objective (with Show on map), forces, odds, cost, what holding back
// means, and what the two refusal buttons actually do.
//
// Rules:
// - The odds are a band, never a number, and always attributed: "Karavelić judges:
//   favourable." The band comes from the plan viability the corps staff report, bent by
//   the proposing officer's file ratings; where the army staff's unbent reading differs,
//   both voices appear. An unattributed band from the true ratio would be a win
//   percentage in costume.
// - Read-only and deterministic: no state, no randomness, no clock. The inputs are the
//   staff's own beliefs about their own plan (OpProposalCardView.dossier_inputs), never
//   fog-hidden enemy data.
//
// Canonical owner: src/ui/map/data/proposalDossier.ts

import type { OpProposalCardView } from './backTheOfficer';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeOddsBand, type PlayerSafeOddsBand } from '../../../shared/playerSafeOperationBalance';
import type { FieldOperationPlanTarget } from '../utils/fieldInspectionTarget';
import { t, type MessageKey } from '../i18n';

export type ProposalCasualtyBand = 'light' | 'heavy' | 'severe';
export type ProposalIntelQuality = 'poor' | 'partial' | 'good';

export interface ProposalDossierOdds {
  /** Who judges: the proposing officer, or the corps staff when he is unknown. */
  judge: string;
  band: PlayerSafeOddsBand;
  intel: ProposalIntelQuality | null;
  /** The army staff's unbent reading, only when it differs from the judge's. */
  staffBand: PlayerSafeOddsBand | null;
}

export interface ProposalDossier {
  /** The card title, localized; generated plans are named after their origin settlement. */
  title: string;
  /** One sentence: who asks, with what, for what. */
  header: string;
  /** The dossier lines, in fixed order; a fact with nothing known is left out. */
  facts: string[];
  odds: ProposalDossierOdds | null;
  casualties: ProposalCasualtyBand | null;
  /** Map focus for Show on map; null when no settlement is known. */
  fieldTarget: FieldOperationPlanTarget | null;
}

/** How far an officer's file bends his reading of the staff's viability figure. */
const AGGRESSIVENESS_BEND = 0.06;
const COMPETENCE_BEND = 0.02;
const TRAIT_MIDPOINT = 3;
const MAX_LISTED = 3;

const BAND_KEYS: Record<PlayerSafeOddsBand, MessageKey> = {
  favourable: 'dossier.band.favourable',
  even: 'dossier.band.even',
  hard: 'dossier.band.hard',
  long: 'dossier.band.long',
};

const INTEL_KEYS: Record<ProposalIntelQuality, MessageKey> = {
  poor: 'dossier.intel.poor',
  partial: 'dossier.intel.partial',
  good: 'dossier.intel.good',
};

const CASUALTY_KEYS: Record<ProposalCasualtyBand, MessageKey> = {
  light: 'dossier.casualties.light',
  heavy: 'dossier.casualties.heavy',
  severe: 'dossier.casualties.severe',
};

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The officer's own reading: aggressive officers read the same plan more hopefully,
 * competent ones a little more hopefully too (they trust their staff work).
 */
export function officerJudgement(
  viability: number,
  traits: { competence: number; aggressiveness: number } | null,
): number {
  if (!traits) return clampUnit(viability);
  return clampUnit(
    viability
      + (traits.aggressiveness - TRAIT_MIDPOINT) * AGGRESSIVENESS_BEND
      + (traits.competence - TRAIT_MIDPOINT) * COMPETENCE_BEND,
  );
}

export function intelQuality(confidence: number | null): ProposalIntelQuality | null {
  if (confidence === null) return null;
  if (confidence < 0.4) return 'poor';
  if (confidence < 0.7) return 'partial';
  return 'good';
}

/** Expected own losses, from the judged odds and how many brigades are committed. */
export function casualtyBand(band: PlayerSafeOddsBand, brigadeCount: number): ProposalCasualtyBand {
  if (band === 'long') return 'severe';
  if (band === 'hard') return brigadeCount >= 4 ? 'severe' : 'heavy';
  if (band === 'even') return brigadeCount >= 4 ? 'heavy' : 'light';
  return 'light';
}

function listWithMore(items: readonly string[]): string {
  if (items.length <= MAX_LISTED) return items.join(', ');
  return t('dossier.list.more', { items: items.slice(0, MAX_LISTED).join(', '), count: items.length - MAX_LISTED });
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

  // Header: who asks, with what, for what.
  const header = targetNames.length > 0 && forces.length > 0
    ? t(forces.length === 1 ? 'dossier.header.one' : 'dossier.header.many', {
      asker,
      count: forces.length,
      target: targetNames[0],
    })
    : t('dossier.header.plain', { asker, operation: title });

  const facts: string[] = [];

  // 1. Objective.
  if (targetNames.length > 0) {
    facts.push(t('dossier.fact.objective', { targets: listWithMore(targetNames) }));
  }

  // 2. Forces, and what is left thin.
  if (forces.length > 0) {
    const donors = (card.donors ?? []).map((donor) => donor.corps_name).filter((name) => name.length > 0);
    let line = t('dossier.fact.forces', { corps: card.corps_name, brigades: listWithMore(forces) });
    if (donors.length > 0) line += ` ${t('dossier.fact.forcesDonors', { donors: donors.join(', ') })}`;
    if (inputs?.pressure === 'heavy' || inputs?.pressure === 'critical') line += ` ${t('dossier.fact.forcesThin')}`;
    facts.push(line);
  }

  // 3. Odds, attributed; the staff's unbent reading too when it differs.
  let odds: ProposalDossierOdds | null = null;
  if (inputs?.viability !== null && inputs?.viability !== undefined) {
    const staffBand = getPlayerSafeOddsBand(inputs.viability);
    const band = getPlayerSafeOddsBand(officerJudgement(inputs.viability, officer ? inputs.commander_traits : null));
    const intel = intelQuality(inputs.intel_confidence);
    const judge = officer ?? t('dossier.judge.corpsStaff', { corps: card.corps_name });
    odds = { judge, band, intel, staffBand: staffBand !== band ? staffBand : null };
    let line = t('dossier.fact.odds', { judge, band: t(BAND_KEYS[band]) });
    if (intel) line += ` ${t('dossier.fact.oddsIntel', { intel: t(INTEL_KEYS[intel]) })}`;
    facts.push(line);
    if (odds.staffBand) facts.push(t('dossier.fact.oddsStaff', { band: t(BAND_KEYS[odds.staffBand]) }));
  }

  // 4. Cost. The Authority price joins this line with command loop L6.
  const casualties = odds && forces.length > 0 ? casualtyBand(odds.band, forces.length) : null;
  if (casualties) {
    facts.push(t('dossier.fact.cost', { casualties: t(CASUALTY_KEYS[casualties]) }));
  }

  // 5. Stakes: no structured stakes exist for operation proposals yet, so none is shown.

  // 6. If you hold back, and what the refusal buttons do.
  facts.push(t('dossier.fact.holdBack'));
  facts.push(t('dossier.fact.withhold'));
  facts.push(t('dossier.fact.cancel'));

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

  return { title, header, facts, odds, casualties, fieldTarget };
}
