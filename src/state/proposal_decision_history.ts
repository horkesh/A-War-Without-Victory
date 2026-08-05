/**
 * Durable identity for an ordinary autonomy-proposal disposition.
 *
 * A proposal may remain visible in the current review queue and in the archive
 * during the resolution turn, so every writer and reader must dedupe on the
 * same persisted identity rather than on a presentation-only row id.
 */
export interface ProposalDecisionIdentitySource {
    id: string;
    resolved_turn: number;
}

export function proposalDecisionIdentity(record: ProposalDecisionIdentitySource): string {
    return `${record.id}::${record.resolved_turn}`;
}

export function proposalDecisionLedgerId(record: ProposalDecisionIdentitySource): string {
    return `proposal:${proposalDecisionIdentity(record)}`;
}
