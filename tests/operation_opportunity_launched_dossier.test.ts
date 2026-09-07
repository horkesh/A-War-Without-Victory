import { describe, expect, it } from 'vitest';
import { deriveOperationOpportunityProposals as project } from '../src/ui/map/data/operationOpportunityDossiers';

const deriveOperationOpportunityProposals = (state: any, faction: string) => project(state, faction);

function fixture() {
    return {
        meta: { turn: 176 },
        military: {
            formations: { corps: { id: 'corps', faction: 'RBiH' } },
            named_officer_data: [{ id: 'officer', name: 'Commander Example' }],
            operation_opportunities: [{ proposal_id: 'proposal', opportunity_id: 'opportunity', approver_faction: 'RBiH', primary_corps: 'corps',
                status: 'approved', response_turn: 175, executed_op_id: 'Exact Name',
                last_axis_evaluation: [{ axis: 'corps_readiness', mode: 'required', green: true, reason: 'Reserve assembled' }] }],
            operation_opportunity_resolutions: [{ proposal_id: 'proposal', opportunity_id: 'opportunity', response: 'approve',
                response_turn: 175, executed_op_name: 'Exact Name' }],
            corps_command: { corps: { active_operations: [{ name: 'Exact Name', started_turn: 175, phase: 'execution',
                commander_officer_id: 'officer', commander_assessment_at_launch: 'launch' }] } },
        },
    };
}

describe('BC01 launched opportunity dossier', () => {
    it('withholds live binding without desktop host metadata', () => {
        const state:any=fixture(); delete state.military.operation_opportunities[0].primary_corps;
        expect(deriveOperationOpportunityProposals(state,'RBiH')![0].launch).toBeUndefined();
    });
    it('rejects a sole same-name/start operation hosted by another friendly corps', () => {
        const state:any=fixture();
        state.military.formations.other={id:'other',faction:'RBiH'};
        state.military.corps_command.other=state.military.corps_command.corps;
        delete state.military.corps_command.corps;
        expect(deriveOperationOpportunityProposals(state,'RBiH')![0].launch).toBeUndefined();
    });
    it('rejects a receipt for a different opportunity', () => {
        const state=fixture();state.military.operation_opportunity_resolutions[0].opportunity_id='different';
        expect(deriveOperationOpportunityProposals(state,'RBiH')![0].launch).toBeUndefined();
    });
    it.each(['redirected', 'under_resourced_approved'])('keeps a %s live launch visible', status => {
        const state=fixture(); state.military.operation_opportunities[0].status=status;
        expect(deriveOperationOpportunityProposals(state,'RBiH')![0].launch?.op_name).toBe('Exact Name');
    });
    it('distinguishes a completed launch and rejects a future receipt', () => {
        const state=fixture();
        Object.assign(state.military.operation_opportunity_resolutions[0],{executed_op_aar_id:'aar'});
        expect(deriveOperationOpportunityProposals(state,'RBiH')![0].decision_outcome).toBe('no_active_operation');
        state.meta.turn=174;
        expect(deriveOperationOpportunityProposals(state,'RBiH')).toBeUndefined();
    });
    it('keeps an auto-decided launch visible with exact identity and actual decision evidence', () => {
        const view = deriveOperationOpportunityProposals(fixture(), 'RBiH')![0];
        expect(view.launch).toMatchObject({ corps_id: 'corps', op_name: 'Exact Name', started_turn: 175, phase: 'execution', commander_name: 'Commander Example' });
        expect(view.decision_evidence).toContain('Reserve assembled');
        expect(view.review_id).toBeUndefined();
        expect(view.available_actions.every(a => !a.enabled)).toBe(true);
    });
    it.each(['later', 'duplicate', 'completed', 'wrong-faction'] as const)('never binds a %s operation as the launch', (kind) => {
        const state = fixture();
        if (kind === 'later') state.military.corps_command.corps.active_operations[0].started_turn = 176;
        if (kind === 'duplicate') state.military.corps_command.corps.active_operations.push({ ...state.military.corps_command.corps.active_operations[0] });
        if (kind === 'completed') Object.assign(state.military.operation_opportunity_resolutions[0], { executed_op_aar_id: 'aar' });
        if (kind === 'wrong-faction') state.military.formations.corps.faction = 'RS';
        expect(deriveOperationOpportunityProposals(state, 'RBiH')?.[0]?.launch).toBeUndefined();
    });
    it('does not relabel a defensive T3 authorization as an offensive launch', () => {
        const state = fixture();
        Object.assign(state.military.operation_opportunity_resolutions[0], { executed_op_name: undefined, exit_class: 't3_authorized_no_offensive' });
        state.military.operation_opportunities[0].executed_op_id = '';
        const view = deriveOperationOpportunityProposals(state, 'RBiH')![0];
        expect(view.launch).toBeUndefined();
        expect(view.decision_outcome).toBe('defensive_commitment');
    });
    it('reports approval without a spawned operation truthfully', () => {
        const state = fixture();
        Object.assign(state.military.operation_opportunity_resolutions[0], { executed_op_name: undefined });
        state.military.operation_opportunities[0].executed_op_id = '';
        const view = deriveOperationOpportunityProposals(state, 'RBiH')![0];
        expect(view.launch).toBeUndefined();
        expect(view.decision_outcome).toBe('not_launched');
    });
    it('does not surface another faction or retain a completed old receipt forever', () => {
        expect(deriveOperationOpportunityProposals(fixture(), 'RS')).toBeUndefined();
        const state = fixture(); state.meta.turn = 185;
        Object.assign(state.military.operation_opportunity_resolutions[0], { executed_op_aar_id: 'aar' });
        expect(deriveOperationOpportunityProposals(state, 'RBiH')).toBeUndefined();
    });
});
