// Force-op PUSHBACK objection read-model (Presidential Command Model "force-op pushback").
//
// PURE, defensive read-model (mirrors backTheOfficer.ts purity): given a corps
// commander's disposition + the engine objection query result
// (queryDirectiveObjection → { forceRatio, estimatedCasualties, recommendedAction,
// rejectionReason? }), produce a DISPOSITION-TINTED prose objection — NEVER a clean
// win-%. The number is never the decision; the SOURCE is. The president sees the
// commander's professional judgment, tinted by who he is, before deciding to force the
// op past it.
//
// Tinting (officer_types.ts competence / stubbornness / political_reliability /
// override_tolerance, all 1-5):
//   - low competence            → hedged ("I cannot guarantee…")
//   - high stubbornness + low   → blunt refusal ("I will not throw my men…")
//     political_reliability
//   - high political_reliability → deferential ("It is your decision, but…")
//   - otherwise                  → professional caution.
//
// ⚠ COWED HONORING: a cowed CO (cowed_until_turn >= current turn) complies fully
// without deviation (order_interpretation.ts computeInterpretation early-out). So when
// the CO is cowed we show COMPLIANCE, not an objection — surfacing an objection for a
// cowed officer would misrepresent the engine.
//
// No state mutation; deterministic; no Math.random / Date.now.

/** The commander disposition the tinting reads (subset of NamedOfficer + cowed state). */
export interface ObjectionOfficerInput {
  /** Player-facing officer name. */
  name: string;
  /** Player-facing rank (optional; humanized for the lead-in). */
  rank?: string;
  /** Overall military skill (1-5). Low → hedged uncertainty. */
  competence: number;
  /** Political reliability (1-5). High → deferential; low (+stubborn) → blunt. */
  political_reliability: number;
  /** Autonomy / stubbornness (1-5, optional). High (+low reliability) → blunt refusal. */
  stubbornness?: number;
  /** Override tolerance (1-5, optional). Informational; low → warns of relief risk. */
  override_tolerance?: number;
  /** True when the officer is currently cowed (complies fully — show compliance). */
  is_cowed?: boolean;
}

/** The engine objection query result this read-model narrates. */
export interface ObjectionQueryInput {
  forceRatio: number;
  estimatedCasualties: number;
  recommendedAction: 'launch' | 'delay' | 'abort';
  /** Plan reason code when the directive could not even be built (else undefined). */
  rejectionReason?: string;
}

export type ObjectionTone =
  | 'compliant'      // cowed CO, or recommendedAction === 'launch' (no objection)
  | 'deferential'    // high political_reliability — objects but defers
  | 'blunt'          // high stubbornness + low political_reliability — flat refusal
  | 'hedged'         // low competence — uncertain, cannot guarantee
  | 'professional';  // default caution

export interface DirectiveObjectionView {
  /** True when an objection card should be shown (recommendedAction !== 'launch' and not cowed). */
  shows_objection: boolean;
  /**
   * False when the directive is IMPOSSIBLE — the candidate op could not be built or the
   * corps has no free slot (rejection_reason present). Such a directive is not forceable:
   * the UI must NOT stage it / debit command authority, regardless of cowed state. A cowed
   * CO may not OBJECT to risk, but an unbuildable target / no force / no slot is simply not
   * forceable. True for both the "no objection, stage it" path AND the "objection,
   * Force-anyway available" path.
   */
  issuable: boolean;
  /** The disposition tone driving the prose. */
  tone: ObjectionTone;
  /** Disposition-tinted objection prose (the SOURCE, not the number). Always populated. */
  prose: string;
  /** Plan rejection reason when the directive would no-op (else undefined). */
  rejection_reason?: string;
  /** Strength of the commander's objection: 'delay' (soft) | 'abort' (hard) | null (launch). */
  severity: 'delay' | 'abort' | null;
}

function humanizeRank(rank: string): string {
  return rank
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function who(officer: ObjectionOfficerInput): string {
  return officer.rank ? `${humanizeRank(officer.rank)} ${officer.name}` : officer.name;
}

/**
 * Build the disposition-tinted objection for a force-op pushback decision.
 *
 * Returns shows_objection=false (tone 'compliant') when the commander recommends
 * launching OR when he is cowed (he will comply fully — no objection to surface). In
 * every objecting case the prose is voiced by WHO the commander is, not by the raw
 * force ratio: the president must weigh the source, not solve a number.
 */
export function buildDirectiveObjection(
  officer: ObjectionOfficerInput,
  query: ObjectionQueryInput,
): DirectiveObjectionView {
  const name = who(officer);

  // IMPOSSIBLE (checked FIRST, before cowed/launch): the candidate op could not be built
  // or the corps has no free slot. This is NOT issuable regardless of cowed state — a
  // cowed CO complies with risk, but he cannot mount an operation with no force / no
  // reachable ground / no free slot. Surface it as not-issuable so the UI shows
  // "cannot issue" and does NOT stage the order / debit command authority. This must
  // precede the cowed short-circuit, which would otherwise mask it as the
  // no-objection "stage it" path.
  if (query.rejectionReason) {
    return {
      shows_objection: true,
      issuable: false,
      tone: 'professional',
      prose: `${name} reports he cannot mount this operation as ordered — ${plainReason(query.rejectionReason)}.`,
      rejection_reason: query.rejectionReason,
      // An un-buildable directive is the strongest possible objection; the predictor
      // returns 'abort' for these, so report the hard severity.
      severity: query.recommendedAction === 'launch' ? 'abort' : query.recommendedAction,
    };
  }

  // COWED: the officer complies fully (order_interpretation early-out). Show compliance,
  // never an objection — the directive is buildable (rejectionReason handled above).
  if (officer.is_cowed) {
    return {
      shows_objection: false,
      issuable: true,
      tone: 'compliant',
      prose: `${name} acknowledges the order without comment and begins moving his brigades.`,
      severity: null,
    };
  }

  // LAUNCH: the commander already agrees — no objection.
  if (query.recommendedAction === 'launch') {
    return {
      shows_objection: false,
      issuable: true,
      tone: 'compliant',
      prose: `${name} judges the operation sound and is ready to move on your word.`,
      severity: null,
    };
  }

  const severity: 'delay' | 'abort' = query.recommendedAction;

  const lowCompetence = officer.competence <= 2;
  const highReliability = officer.political_reliability >= 4;
  const stubborn = (officer.stubbornness ?? 3) >= 4;
  const lowReliability = officer.political_reliability <= 2;
  const lowTolerance = (officer.override_tolerance ?? 3) <= 2;

  // Blunt refusal: a stubborn, politically-unreliable commander says no flatly. (Checked
  // before deferential/hedged so disposition dominates over the raw competence read.)
  if (stubborn && lowReliability) {
    const tail = severity === 'abort'
      ? `I will not throw my men against that position. The answer is no.`
      : `I will not move until the ground is ready. Order me if you must.`;
    return {
      shows_objection: true,
      issuable: true,
      tone: 'blunt',
      prose: `${name}: "${tail}"`,
      severity,
    };
  }

  // Deferential: a politically-reliable commander objects but yields the decision.
  if (highReliability) {
    const body = severity === 'abort'
      ? `the assault as ordered would be very costly, and I cannot promise it succeeds`
      : `the timing is wrong and we would bleed for little`;
    const tail = lowTolerance
      ? ` It is your decision; I will carry it out.`
      : ` It is your decision; I will carry it out, whatever it costs.`;
    return {
      shows_objection: true,
      issuable: true,
      tone: 'deferential',
      prose: `${name} advises against it — ${body}.${tail}`,
      severity,
    };
  }

  // Hedged: a low-competence commander is uncertain and cannot guarantee anything.
  if (lowCompetence) {
    return {
      shows_objection: true,
      issuable: true,
      tone: 'hedged',
      prose: `${name} is uneasy — "I cannot guarantee this. The enemy may be stronger than we think." He recommends ${severity === 'abort' ? 'we not attempt it' : 'we wait'}.`,
      severity,
    };
  }

  // Professional caution (default): a competent commander lays out the risk and recommends against.
  const body = severity === 'abort'
    ? `the force ratio does not support an assault here; expect heavy losses for an uncertain gain`
    : `conditions are not yet favorable; pressing now risks an avoidable repulse`;
  return {
    shows_objection: true,
    issuable: true,
    tone: 'professional',
    prose: `${name} recommends against the operation as ordered — ${body}.`,
    severity,
  };
}

/** Map a plan rejection reason code to plain player-facing prose. */
export function plainReason(reason: string): string {
  switch (reason) {
    case 'no_available_force': return 'he has too few free brigades to attack';
    case 'objective_unreachable': return 'there is no friendly ground adjacent to stage from';
    case 'objective_already_owned': return 'we already hold that objective';
    case 'objective_uncontrolled': return 'that objective is not an enemy-held position';
    case 'no_available_slot': return 'his corps has no free operation to commit';
    case 'no_adjacency': return 'the approach cannot be traced';
    case 'corps_not_found': return 'this corps cannot be ordered';
    default: return 'the operation cannot be formed as ordered';
  }
}
