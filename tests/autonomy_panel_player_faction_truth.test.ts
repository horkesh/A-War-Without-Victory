import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { filterPendingProposalsForPlayer, type PendingProposalReview } from '../src/ui/map/components/AutonomyPanel.js';

describe('AutonomyPanel player-faction truth', () => {
    it('filters pending proposals by the active player faction instead of hardcoded RBiH', () => {
        const proposals: PendingProposalReview[] = [
            {
                id: 'rbih_1',
                turn: 5,
                faction: 'RBiH',
                domain: 'military',
                description: 'RBiH proposal',
                proposed_action: 'SET_STANCE:rbih_1:defensive',
            },
            {
                id: 'rs_1',
                turn: 5,
                faction: 'RS',
                domain: 'ops',
                description: 'RS proposal',
                proposed_action: 'APPROVE_OP:rs_1:plan_1',
            },
            {
                id: 'hrhb_1',
                turn: 5,
                faction: 'HRHB',
                domain: 'military',
                description: 'HRHB proposal',
                proposed_action: 'SET_STANCE:hrhb_1:offensive',
            },
        ];

        expect(filterPendingProposalsForPlayer(proposals, 'RS').map((proposal) => proposal.id)).toEqual(['rs_1']);
        expect(filterPendingProposalsForPlayer(proposals, 'HRHB').map((proposal) => proposal.id)).toEqual(['hrhb_1']);
        expect(filterPendingProposalsForPlayer(proposals, 'RBiH').map((proposal) => proposal.id)).toEqual(['rbih_1']);
    });

    it('receives playerFaction from App when the autonomy panel is opened', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/ui/map/App.tsx'), 'utf8');

        expect(source).toContain('<AutonomyPanel');
        expect(source).toContain('playerFaction={playerFaction}');
    });
});
