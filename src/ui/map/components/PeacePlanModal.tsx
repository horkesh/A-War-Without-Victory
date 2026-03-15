/**
 * Peace Plan Modal — STUB component.
 *
 * Renders when a pending peace plan is passed via props.
 * Full UI implementation in a later phase (IPC integration, consequence preview, etc.).
 *
 * TODO (Phase 2 full UI):
 * - Add peace plan data to LoadedGameState via GameStateAdapter
 * - Wire IPC handlers for accept/reject (resolve-peace-plan channel)
 * - Show consequence preview ("Rejecting will cost X credibility...")
 * - Integrate with turn advancement flow
 */
import { PEACE_PLANS } from '../../../sim/negotiation/peace_plan_data';

export interface PeacePlanModalProps {
    /** The pending peace plan ID. */
    planId: string;
    /** Bot faction responses (faction -> 'accepted' | 'rejected'). */
    botResponses: Record<string, 'accepted' | 'rejected'>;
    /** Called when the player makes a decision. */
    onRespond?: (response: 'accepted' | 'rejected') => void;
}

export function PeacePlanModal({ planId, botResponses, onRespond }: PeacePlanModalProps) {
    const planDef = PEACE_PLANS.find(p => p.id === planId);
    if (!planDef) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
        }}>
            <div style={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #444',
                borderRadius: 8,
                padding: 32,
                maxWidth: 600,
                width: '90%',
                color: '#e0e0e0',
                fontFamily: 'system-ui, sans-serif',
            }}>
                <h2 style={{ margin: '0 0 8px 0', color: '#ffd700' }}>
                    Peace Plan Proposed
                </h2>
                <h3 style={{ margin: '0 0 16px 0', fontWeight: 'normal', color: '#aaa' }}>
                    {planDef.name}
                </h3>

                <p style={{ lineHeight: 1.5, marginBottom: 16 }}>
                    {planDef.narrative}
                </p>

                <div style={{ marginBottom: 16 }}>
                    <strong>Proposed territorial split:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        <li>RBiH: {planDef.proposed_split.RBiH}%</li>
                        <li>RS: {planDef.proposed_split.RS}%</li>
                        <li>HRHB: {planDef.proposed_split.HRHB}%</li>
                    </ul>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <strong>Institutional model:</strong>{' '}
                    {planDef.institutional_model.replace(/_/g, ' ')}
                </div>

                <div style={{ marginBottom: 24 }}>
                    <strong>Other factions:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {Object.entries(botResponses).map(([faction, response]) => (
                            <li key={faction}>
                                {faction}:{' '}
                                <span style={{
                                    color: response === 'accepted' ? '#4caf50' : '#f44336'
                                }}>
                                    {response}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    <button
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#2e7d32',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 14,
                        }}
                        onClick={() => {
                            if (onRespond) onRespond('accepted');
                            else console.log('[PeacePlanModal] Player accepted:', planDef.id);
                        }}
                    >
                        Accept Plan
                    </button>
                    <button
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#c62828',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 14,
                        }}
                        onClick={() => {
                            if (onRespond) onRespond('rejected');
                            else console.log('[PeacePlanModal] Player rejected:', planDef.id);
                        }}
                    >
                        Reject Plan
                    </button>
                </div>

                <p style={{ marginTop: 16, fontSize: 12, color: '#888', textAlign: 'center' }}>
                    (Stub UI -- full implementation in a later phase)
                </p>
            </div>
        </div>
    );
}
