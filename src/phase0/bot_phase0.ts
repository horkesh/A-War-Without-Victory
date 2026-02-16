/**
 * Phase 0 Bot AI: automated capital allocation for non-player factions.
 *
 * Simple heuristic bot that invests pre-war capital in municipalities
 * aligned with the faction's ethnic base. Priorities: police → party → paramilitary.
 * TO is RBiH-only.
 *
 * Deterministic: no Math.random(), no Date.now(). Uses strictCompare for ordering.
 */

import type { GameState, FactionId, MunicipalityId, OrganizationalPenetration } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import { getPrewarCapital, PHASE0_FACTION_ORDER } from './capital.js';
import { applyInvestment, isToAllowedForFaction, INVESTMENT_COST } from './investment.js';
import type { InvestmentType } from './investment.js';

/* ── Scoring constants ─────────────────────────────────────────── */
const SCORE_ALREADY_INVESTED    = 30;   // Mild consolidation bonus
const SCORE_DOMINANT_PEN        = 20;   // Own penetration exceeds enemies
const SCORE_HOSTILE_MAJORITY    = -50;  // Strong enemy presence penalty
const SCORE_CONTESTED_BONUS     = 10;   // Low-stability areas are targets
const SCORE_HEAVY_PEN_50        = -40;  // Diminishing returns at 50% pen
const SCORE_HEAVY_PEN_80        = -60;  // Severe diminishing returns at 80%
const SCORE_OWN_CONTROLLER      = 15;   // Political controller alignment
const SCORE_ENEMY_CONTROLLER    = -15;  // Enemy controls municipality
const SCORE_MISSING_MUN         = -200; // Municipality not found sentinel
const SCORE_HOSTILE_THRESHOLD   = -100; // Skip municipalities below this
const ENEMY_PEN_THRESHOLD       = 50;   // Enemy pen level considered "strong"
const STABILITY_CONTESTED_BELOW = 50;   // Stability below this = contested
const PEN_HEAVY_THRESHOLD       = 50;   // Own pen at which diminishing returns kick in
const PEN_VERY_HEAVY_THRESHOLD  = 80;   // Own pen at which severe penalty applies
const TIEBREAKER_MOD            = 5;    // Modulus for deterministic tiebreaker

/* ── Budget constants ──────────────────────────────────────────── */
const BUDGET_FRACTION           = 0.12; // Fraction of capital to spend per turn
const BUDGET_CAP                = 8;    // Maximum budget per turn
const MIN_INVESTMENT_BUDGET     = 4;    // Minimum budget to attempt investment

/* ── Investment type thresholds ────────────────────────────────── */
const POLICE_TARGET_COUNT       = 3;    // Invest in police until this many municipalities
const TO_TARGET_COUNT           = 2;    // TO investment target count (RBiH only)
const PARTY_TARGET_COUNT        = 5;    // Party penetration target count

/**
 * Simple deterministic hash for tie-breaking.
 */
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Score a municipality for investment by a given faction.
 * Higher = more desirable.
 */
function scoreMunicipality(
  state: GameState,
  munId: MunicipalityId,
  factionId: FactionId,
  seed: string
): number {
  const mun = state.municipalities?.[munId];
  if (!mun) return SCORE_MISSING_MUN;

  const op = mun.organizational_penetration;
  let score = 0;

  const ownPen = getFactionPenetration(op, factionId);
  const enemyPen1 = getFactionPenetration(op, getEnemy1(factionId));
  const enemyPen2 = getFactionPenetration(op, getEnemy2(factionId));
  const maxEnemyPen = Math.max(enemyPen1, enemyPen2);

  if (ownPen > 0) score += SCORE_ALREADY_INVESTED;
  if (ownPen > maxEnemyPen) score += SCORE_DOMINANT_PEN;
  if (maxEnemyPen > ENEMY_PEN_THRESHOLD) score += SCORE_HOSTILE_MAJORITY;

  const stability = mun.stability_score ?? 50;
  if (stability < STABILITY_CONTESTED_BELOW) score += SCORE_CONTESTED_BONUS;

  if (ownPen >= PEN_VERY_HEAVY_THRESHOLD) score += SCORE_HEAVY_PEN_80;
  else if (ownPen >= PEN_HEAVY_THRESHOLD) score += SCORE_HEAVY_PEN_50;

  const controller = state.political_controllers?.[munId];
  if (controller === factionId) score += SCORE_OWN_CONTROLLER;
  if (controller && controller !== factionId) score += SCORE_ENEMY_CONTROLLER;

  score += (simpleHash(seed + factionId + munId) % TIEBREAKER_MOD);

  return score;
}

function getFactionPenetration(
  op: OrganizationalPenetration | undefined,
  factionId: FactionId
): number {
  if (!op) return 0;
  switch (factionId) {
    case 'RS': return op.sds_penetration ?? 0;
    case 'RBiH': return op.sda_penetration ?? 0;
    case 'HRHB': return op.hdz_penetration ?? 0;
    default: return 0;
  }
}

function getEnemy1(factionId: FactionId): FactionId {
  switch (factionId) {
    case 'RS': return 'RBiH';
    case 'RBiH': return 'RS';
    case 'HRHB': return 'RS';
    default: return 'RS';
  }
}

function getEnemy2(factionId: FactionId): FactionId {
  switch (factionId) {
    case 'RS': return 'HRHB';
    case 'RBiH': return 'HRHB';
    case 'HRHB': return 'RBiH';
    default: return 'RBiH';
  }
}

/**
 * Count municipalities where a faction has invested in a specific way.
 */
function countInvestedMunicipalities(
  state: GameState,
  factionId: FactionId,
  checkType: 'police' | 'to' | 'party' | 'paramilitary'
): number {
  if (!state.municipalities) return 0;
  let count = 0;
  const munIds = Object.keys(state.municipalities).sort(strictCompare);

  for (const munId of munIds) {
    const op = state.municipalities[munId]?.organizational_penetration;
    if (!op) continue;

    switch (checkType) {
      case 'police':
        if (op.police_loyalty === 'loyal' && state.political_controllers?.[munId] === factionId) count++;
        break;
      case 'to':
        if (op.to_control === 'controlled') count++;
        break;
      case 'party': {
        const pen = getFactionPenetration(op, factionId);
        if (pen > 0) count++;
        break;
      }
      case 'paramilitary': {
        const opAny = op as Record<string, unknown>;
        if (factionId === 'RS' && ((opAny.paramilitary_rs as number) ?? 0) > 0) count++;
        else if (factionId === 'RBiH' && ((opAny.patriotska_liga as number) ?? 0) > 0) count++;
        else if (factionId === 'HRHB' && ((opAny.paramilitary_hrhb as number) ?? 0) > 0) count++;
        break;
      }
    }
  }
  return count;
}

/**
 * Choose investment type for a faction based on current state.
 */
function chooseInvestmentType(
  state: GameState,
  factionId: FactionId
): InvestmentType {
  const policeCount = countInvestedMunicipalities(state, factionId, 'police');
  if (policeCount < POLICE_TARGET_COUNT) return 'police';

  if (isToAllowedForFaction(factionId)) {
    const toCount = countInvestedMunicipalities(state, factionId, 'to');
    if (toCount < TO_TARGET_COUNT) return 'to';
  }

  const partyCount = countInvestedMunicipalities(state, factionId, 'party');
  if (partyCount < PARTY_TARGET_COUNT) return 'party';

  return 'paramilitary';
}

/**
 * Run Phase 0 bot investments for all non-player factions.
 *
 * Called before the Phase 0 engine pipeline each turn.
 * Iterates factions in PHASE0_FACTION_ORDER (deterministic).
 * Skips the player faction. Each bot invests 1-2 times per turn
 * based on available capital.
 *
 * Mutates state in place.
 */
export function runPhase0BotInvestments(
  state: GameState,
  playerFaction: FactionId | undefined,
  seed: string
): void {
  if (!state.municipalities) return;

  for (const factionId of PHASE0_FACTION_ORDER) {
    // Skip player faction
    if (factionId === playerFaction) continue;

    const capital = getPrewarCapital(state, factionId);
    const budget = Math.min(BUDGET_CAP, Math.floor(capital * BUDGET_FRACTION));
    if (budget < MIN_INVESTMENT_BUDGET) continue;

    // Score and rank municipalities
    const munIds = Object.keys(state.municipalities).sort(strictCompare);
    const scored: Array<{ munId: MunicipalityId; score: number }> = [];

    for (const munId of munIds) {
      const score = scoreMunicipality(state, munId, factionId, seed);
      if (score > SCORE_HOSTILE_THRESHOLD) {
        scored.push({ munId, score });
      }
    }

    // Sort by score descending, ties by munId (deterministic)
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return strictCompare(a.munId, b.munId);
    });

    // Choose investment type
    const investType = chooseInvestmentType(state, factionId);
    const cost = INVESTMENT_COST[investType].municipality;

    // First investment: top municipality
    if (scored.length > 0 && capital >= cost) {
      const target = scored[0];
      applyInvestment(
        state,
        factionId,
        investType,
        { kind: 'municipality', mun_ids: [target.munId] }
      );
    }

    // Second investment if budget allows and different municipality available
    const remainingCapital = getPrewarCapital(state, factionId);
    if (scored.length > 1 && remainingCapital >= MIN_INVESTMENT_BUDGET) {
      // Choose a different type for diversity
      const secondType: InvestmentType = investType === 'police' ? 'party' : 'police';
      const secondCost = INVESTMENT_COST[secondType].municipality;
      if (remainingCapital >= secondCost) {
        applyInvestment(
          state,
          factionId,
          secondType,
          { kind: 'municipality', mun_ids: [scored[1].munId] }
        );
      }
    }
  }
}
