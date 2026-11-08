/**
 * The treaty against the mediator's draft (owner, 2026-11-08: keep the canon grade bands;
 * show what the treaty won). The grade judges the war; this record shows what the table
 * changed: the player's share under the signed map against the mediator's draft (the
 * historical Dayton map with no clause raised), the ground won, given up and refused, and
 * the powers won and refused. Built for preview and signing from the same inputs, stored
 * on the agreement record, read by final review and the Verdict.
 *
 * Deterministic: catalog order, sorted ids, rounded shares; no clock or RNG.
 */
import type { FactionId, GameState } from '../../state/game_state.js';
import type { DaytonAgreementRecord, DaytonProposal, DaytonResult, TerritorialPackage, TreatyAgainstDraft } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { computeSettlementControllers, settlementTerritoryPct } from './peace_settlement.js';
import { getTerritorialPackageById } from './territorial_packages.js';
import { COMPETENCY_PACKAGES } from './competency_packages.js';
import { getConstitutionalChoiceById } from './constitutional_packages.js';
import { reconcileProposalPowers } from './power_overlap.js';

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * @param wartimeState the state with the wartime map at signature (political_controllers untouched by the settlement).
 * @param frontPackages captured-ground packages raised in the proposal, for their names.
 */
export function buildTreatyAgainstDraft(
    wartimeState: GameState,
    player: FactionId,
    proposalIn: DaytonProposal,
    result: DaytonResult,
    agreement: DaytonAgreementRecord,
    frontPackages: readonly TerritorialPackage[],
): TreatyAgainstDraft {
    const proposal = reconcileProposalPowers(proposalIn);
    const draft = settlementTerritoryPct(computeSettlementControllers(wartimeState, 'dayton').controllers);
    const accepted = new Set(result.territorial_packages_accepted);
    const name = (id: string) => getTerritorialPackageById(id, frontPackages)?.name ?? id;
    const land = (ids: readonly string[]) => [...ids].sort(strictCompare).map(id => ({ id, name: name(id) }));

    const asked: TreatyAgainstDraft['powers_won'] = [];
    const signedComp = agreement.terms.competency_allocation ?? {};
    for (const comp of COMPETENCY_PACKAGES) {
        const want = proposal.competency_allocation?.[comp.id];
        if (want && want !== comp.default_owner) asked.push({ kind: 'competency', id: comp.id, asked: want, signed: String(signedComp[comp.id] ?? comp.default_owner) });
    }
    for (const id of Object.keys(proposal.constitutional_choices ?? {}).sort(strictCompare)) {
        const want = proposal.constitutional_choices![id]!;
        const def = getConstitutionalChoiceById(id)?.options.find(o => o.is_default)?.id;
        if (want === def) continue;
        asked.push({ kind: 'constitutional', id, asked: want, signed: String(agreement.terms.constitutional_choices?.[id] ?? def ?? '') });
    }
    if (proposal.entity_autonomy && proposal.entity_autonomy !== 'dayton-historical') {
        asked.push({ kind: 'dial', id: 'entity_autonomy', asked: proposal.entity_autonomy, signed: String(agreement.terms.entity_autonomy ?? 'dayton-historical') });
    }

    return {
        faction: player,
        draft_share: Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, round1(v)])),
        signed_share: Object.fromEntries(Object.entries(agreement.map.territoryPct).map(([k, v]) => [k, round1(v)])),
        land_won: land(proposal.territorial_demands.filter(id => accepted.has(id))),
        land_given: land(proposal.territorial_concessions.filter(id => accepted.has(id))),
        land_refused: land(proposal.territorial_demands.filter(id => !accepted.has(id))),
        powers_won: asked.filter(p => p.asked === p.signed),
        powers_refused: asked.filter(p => p.asked !== p.signed),
    };
}
