// Command loop L5 (2026-11-15): proposal dossier DETAIL, the facts under the header.
//
// Loaded only by the lazily imported ProposalDossierFacts, so none of this ships in the
// map entry chunk. The entry keeps the card title, the one-sentence header and the map
// target (proposalDossier.ts, i18n `dossier.*`), the same split as stanceMatterCopy.ts /
// stanceMatterDetail.ts.
//
// Facts, in fixed order, each shown only when known: objective, forces (with donor corps
// and a thin-front warning), readiness, what holding back means, and what Withhold and
// Cancel actually do. Readiness is a band, never a number, and always attributed:
// "Readiness: Karavelić reports the plan ready." The band comes from the plan viability the
// corps staff report, bent by the proposing officer's file; where the army staff's unbent
// reading differs, both voices appear. The inputs are the staff's own beliefs about their
// own plan (OpProposalCardView.dossier_inputs), never fog-hidden enemy data.
//
// Readiness, not odds (#653 review): the viability score measures staging-area hold, its
// posture and brigade availability, never the target's defenders or terrain, so it cannot
// back combat odds or a casualty forecast. Odds and expected losses wait for a player-safe
// combat assessment (force ratio against believed defenders), which does not exist yet.
//
// EN and BCS live here as two dictionaries with the same keys;
// tests/ui/proposal_dossier.test.ts pins that both are complete.
//
// Canonical owner: src/ui/map/data/proposalDossierDetail.ts

import { getActiveLocale } from '../i18n';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeReadinessBand, type PlayerSafeReadinessBand } from '../../../shared/playerSafeOperationBalance';
import type { OpProposalCardView } from './backTheOfficer';

export const PROPOSAL_DOSSIER_DETAIL_EN = {
  'list.more': '{items} and {count} more',
  objective: 'Objective: take {targets}.',
  forces: 'Forces: {corps} with {brigades}.',
  forcesDonors: 'Drawn partly from {donors}.',
  forcesThin: 'The corps front is already under heavy pressure.',
  judgeCorpsStaff: 'The {corps} staff',
  readiness: 'Readiness: {judge} reports the plan {band}.',
  readinessIntel: 'The report rests on {intel}.',
  readinessStaff: 'Army staff read it as {band}.',
  holdBack: 'If you hold back: answer before the next Advance. Unanswered, the proposal lapses and the plan is not launched.',
  withhold: 'Withhold: the corps drops this plan; its commander may plan again.',
  cancel: 'Cancel: close without answering; an unanswered proposal lapses at Advance.',
  'band.ready': 'ready',
  'band.mostly': 'mostly ready',
  'band.strained': 'strained',
  'band.unready': 'not ready',
  'intel.poor': 'poor intelligence',
  'intel.partial': 'partial intelligence',
  'intel.good': 'good intelligence',
} as const;

export type ProposalDossierDetailKey = keyof typeof PROPOSAL_DOSSIER_DETAIL_EN;

export const PROPOSAL_DOSSIER_DETAIL_BCS: Record<ProposalDossierDetailKey, string> = {
  'list.more': '{items} i još {count}',
  objective: 'Cilj: zauzeti {targets}.',
  forces: 'Snage: {brigades} ({corps}).',
  forcesDonors: 'Dijelom iz sastava: {donors}.',
  forcesThin: 'Front korpusa je već pod jakim pritiskom.',
  judgeCorpsStaff: 'Štab ({corps})',
  readiness: 'Spremnost: {judge} plan ocjenjuje kao {band}.',
  readinessIntel: 'Ocjena se oslanja na {intel}.',
  readinessStaff: 'Štab armije ga ocjenjuje kao {band}.',
  holdBack: 'Ako odgodite: odgovorite prije sljedećeg poteza. Bez odgovora prijedlog ističe i plan se ne pokreće.',
  withhold: 'Uskrati: korpus odustaje od ovog plana; njegov komandant može planirati ponovo.',
  cancel: 'Otkaži: zatvori bez odgovora; prijedlog bez odgovora ističe na sljedećem potezu.',
  'band.ready': 'spreman',
  'band.mostly': 'uglavnom spreman',
  'band.strained': 'napregnut',
  'band.unready': 'nespreman',
  'intel.poor': 'slabe obavještajne podatke',
  'intel.partial': 'djelimične obavještajne podatke',
  'intel.good': 'dobre obavještajne podatke',
};

export function dossierDetailText(key: ProposalDossierDetailKey, params: Record<string, string | number> = {}): string {
  const table: Record<ProposalDossierDetailKey, string> = getActiveLocale() === 'bcs'
    ? PROPOSAL_DOSSIER_DETAIL_BCS
    : PROPOSAL_DOSSIER_DETAIL_EN;
  const template = table[key] ?? PROPOSAL_DOSSIER_DETAIL_EN[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export type ProposalIntelQuality = 'poor' | 'partial' | 'good';

export interface ProposalDossierReadiness {
  /** Who reports: the proposing officer, or the corps staff when he is unknown. */
  judge: string;
  band: PlayerSafeReadinessBand;
  intel: ProposalIntelQuality | null;
  /** The army staff's unbent reading, only when it differs from the judge's. */
  staffBand: PlayerSafeReadinessBand | null;
}

export interface ProposalDossierFactsView {
  facts: string[];
  readiness: ProposalDossierReadiness | null;
}

/** How far an officer's file bends his reading of the staff's viability figure. */
const AGGRESSIVENESS_BEND = 0.06;
const COMPETENCE_BEND = 0.02;
const TRAIT_MIDPOINT = 3;
const MAX_LISTED = 3;

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The officer's own reading: aggressive officers report the same plan as readier,
 * competent ones a little readier too (they trust their staff work).
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

function listWithMore(items: readonly string[]): string {
  if (items.length <= MAX_LISTED) return items.join(', ');
  return dossierDetailText('list.more', { items: items.slice(0, MAX_LISTED).join(', '), count: items.length - MAX_LISTED });
}

function knownStrings(values: readonly (string | undefined)[] | undefined): string[] {
  return (values ?? []).filter((value): value is string => (
    typeof value === 'string' && value.length > 0 && !/^unreported/i.test(value)
  ));
}

export function buildProposalDossierFacts(
  card: OpProposalCardView,
  osidNameMap: Record<string, string> | null,
): ProposalDossierFactsView {
  const inputs = card.dossier_inputs;
  const targetOsids = (card.target_osids ?? []).filter((osid) => osid.length > 0);
  const targetNames = targetOsids.length > 0
    ? targetOsids.map((osid) => getOsidDisplayName(osid, osidNameMap))
    : knownStrings(card.targets);
  const forces = knownStrings(card.forces);
  const officer = card.commander && !card.commander.lost ? card.commander.name : null;
  const facts: string[] = [];

  // 1. Objective.
  if (targetNames.length > 0) {
    facts.push(dossierDetailText('objective', { targets: listWithMore(targetNames) }));
  }

  // 2. Forces, and what is left thin.
  if (forces.length > 0) {
    const donors = (card.donors ?? []).map((donor) => donor.corps_name).filter((name) => name.length > 0);
    let line = dossierDetailText('forces', { corps: card.corps_name, brigades: listWithMore(forces) });
    if (donors.length > 0) line += ` ${dossierDetailText('forcesDonors', { donors: donors.join(', ') })}`;
    if (inputs?.pressure === 'heavy' || inputs?.pressure === 'critical') line += ` ${dossierDetailText('forcesThin')}`;
    facts.push(line);
  }

  // 3. Readiness, attributed; the staff's unbent reading too when it differs.
  let readiness: ProposalDossierReadiness | null = null;
  if (inputs?.viability !== null && inputs?.viability !== undefined) {
    const staffBand = getPlayerSafeReadinessBand(inputs.viability);
    const band = getPlayerSafeReadinessBand(officerJudgement(inputs.viability, officer ? inputs.commander_traits : null));
    const intel = intelQuality(inputs.intel_confidence);
    const judge = officer ?? dossierDetailText('judgeCorpsStaff', { corps: card.corps_name });
    readiness = { judge, band, intel, staffBand: staffBand !== band ? staffBand : null };
    let line = dossierDetailText('readiness', { judge, band: dossierDetailText(`band.${band}`) });
    if (intel) line += ` ${dossierDetailText('readinessIntel', { intel: dossierDetailText(`intel.${intel}`) })}`;
    facts.push(line);
    if (readiness.staffBand) facts.push(dossierDetailText('readinessStaff', { band: dossierDetailText(`band.${readiness.staffBand}`) }));
  }

  // 4. Odds and cost: no player-safe combat assessment exists for a ready plan, so no
  //    odds or casualty forecast is shown. The Authority price joins with command loop L6.
  // 5. Stakes: no structured stakes exist for operation proposals yet, so none is shown.

  // 6. If you hold back, and what the refusal buttons do.
  facts.push(dossierDetailText('holdBack'));
  facts.push(dossierDetailText('withhold'));
  facts.push(dossierDetailText('cancel'));

  return { facts, readiness };
}
