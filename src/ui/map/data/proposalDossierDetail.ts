// Command loop L5 (2026-11-15): proposal dossier DETAIL, the facts under the header.
//
// Loaded only by the lazily imported ProposalDossierFacts, so none of this ships in the
// map entry chunk (which sits at its 3,000 kB limit). The entry keeps the card title,
// the one-sentence header and the map target (proposalDossier.ts, i18n `dossier.*`), the
// same split as stanceMatterCopy.ts / stanceMatterDetail.ts.
//
// Facts, in fixed order, each shown only when known: objective, forces (with donor corps
// and a thin-front warning), odds, cost, what holding back means, and what Withhold and
// Cancel actually do. The odds are a band, never a number, and always attributed:
// "Odds: Karavelić judges them favourable." The band comes from the plan viability the
// corps staff report, bent by the proposing officer's file; where the army staff's unbent
// reading differs, both voices appear. The inputs are the staff's own beliefs about their
// own plan (OpProposalCardView.dossier_inputs), never fog-hidden enemy data.
//
// EN and BCS live here as two dictionaries with the same keys;
// tests/ui/proposal_dossier.test.ts pins that both are complete.
//
// Canonical owner: src/ui/map/data/proposalDossierDetail.ts

import { getActiveLocale } from '../i18n';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeOddsBand, type PlayerSafeOddsBand } from '../../../shared/playerSafeOperationBalance';
import type { OpProposalCardView } from './backTheOfficer';

export const PROPOSAL_DOSSIER_DETAIL_EN = {
  'list.more': '{items} and {count} more',
  objective: 'Objective: take {targets}.',
  forces: 'Forces: {corps} with {brigades}.',
  forcesDonors: 'Drawn partly from {donors}.',
  forcesThin: 'The corps front is already under heavy pressure.',
  judgeCorpsStaff: 'The {corps} staff',
  odds: 'Odds: {judge} judges them {band}.',
  oddsIntel: 'The judgement rests on {intel}.',
  oddsStaff: 'Army staff read them as {band}.',
  cost: 'Cost: {casualties} casualties expected.',
  holdBack: 'If you hold back: answer before the next Advance. Unanswered, the proposal lapses and the plan is not launched.',
  withhold: 'Withhold: the corps drops this plan; its commander may plan again.',
  cancel: 'Cancel: close without answering; an unanswered proposal lapses at Advance.',
  'band.favourable': 'favourable',
  'band.even': 'even',
  'band.hard': 'hard',
  'band.long': 'long',
  'intel.poor': 'poor intelligence',
  'intel.partial': 'partial intelligence',
  'intel.good': 'good intelligence',
  'casualties.light': 'light',
  'casualties.heavy': 'heavy',
  'casualties.severe': 'severe',
} as const;

export type ProposalDossierDetailKey = keyof typeof PROPOSAL_DOSSIER_DETAIL_EN;

export const PROPOSAL_DOSSIER_DETAIL_BCS: Record<ProposalDossierDetailKey, string> = {
  'list.more': '{items} i još {count}',
  objective: 'Cilj: zauzeti {targets}.',
  forces: 'Snage: {brigades} ({corps}).',
  forcesDonors: 'Dijelom iz sastava: {donors}.',
  forcesThin: 'Front korpusa je već pod jakim pritiskom.',
  judgeCorpsStaff: 'Štab ({corps})',
  odds: 'Izgledi: {judge} ih ocjenjuje kao {band}.',
  oddsIntel: 'Ocjena se oslanja na {intel}.',
  oddsStaff: 'Štab armije ih ocjenjuje kao {band}.',
  cost: 'Cijena: očekuju se {casualties} gubici.',
  holdBack: 'Ako odgodite: odgovorite prije sljedećeg poteza. Bez odgovora prijedlog ističe i plan se ne pokreće.',
  withhold: 'Uskrati: korpus odustaje od ovog plana; njegov komandant može planirati ponovo.',
  cancel: 'Otkaži: zatvori bez odgovora; prijedlog bez odgovora ističe na sljedećem potezu.',
  'band.favourable': 'povoljne',
  'band.even': 'izjednačene',
  'band.hard': 'teške',
  'band.long': 'slabe',
  'intel.poor': 'slabe obavještajne podatke',
  'intel.partial': 'djelimične obavještajne podatke',
  'intel.good': 'dobre obavještajne podatke',
  'casualties.light': 'laki',
  'casualties.heavy': 'teški',
  'casualties.severe': 'vrlo teški',
};

export function dossierDetailText(key: ProposalDossierDetailKey, params: Record<string, string | number> = {}): string {
  const table: Record<ProposalDossierDetailKey, string> = getActiveLocale() === 'bcs'
    ? PROPOSAL_DOSSIER_DETAIL_BCS
    : PROPOSAL_DOSSIER_DETAIL_EN;
  const template = table[key] ?? PROPOSAL_DOSSIER_DETAIL_EN[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

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

export interface ProposalDossierFactsView {
  facts: string[];
  odds: ProposalDossierOdds | null;
  casualties: ProposalCasualtyBand | null;
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

  // 3. Odds, attributed; the staff's unbent reading too when it differs.
  let odds: ProposalDossierOdds | null = null;
  if (inputs?.viability !== null && inputs?.viability !== undefined) {
    const staffBand = getPlayerSafeOddsBand(inputs.viability);
    const band = getPlayerSafeOddsBand(officerJudgement(inputs.viability, officer ? inputs.commander_traits : null));
    const intel = intelQuality(inputs.intel_confidence);
    const judge = officer ?? dossierDetailText('judgeCorpsStaff', { corps: card.corps_name });
    odds = { judge, band, intel, staffBand: staffBand !== band ? staffBand : null };
    let line = dossierDetailText('odds', { judge, band: dossierDetailText(`band.${band}`) });
    if (intel) line += ` ${dossierDetailText('oddsIntel', { intel: dossierDetailText(`intel.${intel}`) })}`;
    facts.push(line);
    if (odds.staffBand) facts.push(dossierDetailText('oddsStaff', { band: dossierDetailText(`band.${odds.staffBand}`) }));
  }

  // 4. Cost. The Authority price joins this line with command loop L6.
  const casualties = odds && forces.length > 0 ? casualtyBand(odds.band, forces.length) : null;
  if (casualties) {
    facts.push(dossierDetailText('cost', { casualties: dossierDetailText(`casualties.${casualties}`) }));
  }

  // 5. Stakes: no structured stakes exist for operation proposals yet, so none is shown.

  // 6. If you hold back, and what the refusal buttons do.
  facts.push(dossierDetailText('holdBack'));
  facts.push(dossierDetailText('withhold'));
  facts.push(dossierDetailText('cancel'));

  return { facts, odds, casualties };
}
