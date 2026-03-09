import type { GameState } from '../../../state/game_state.js';
import { extractWarData } from '../data/war_data_extractor.js';
import { getPlayerFaction, turnToDateString } from './warroom_utils.js';

export class OperationalSituationModal {
    private gameState: GameState;
    private onOpenMap: () => void;

    constructor(gameState: GameState, onOpenMap: () => void) {
        this.gameState = gameState;
        this.onOpenMap = onOpenMap;
    }

    render(): HTMLElement {
        const factionId = getPlayerFaction(this.gameState) || 'RBiH';
        const isWar = this.gameState.meta.phase === 'war';
        const accentColor = factionId === 'RS' ? '#14316d' : factionId === 'HRHB' ? '#922026' : '#2b5042';
        
        const container = document.createElement('div');
        container.className = 'wr-dialog';
        container.style.maxWidth = '700px';

        let content = '';

        if (!isWar) {
            content = `
                <h2><span class="wr-text-primary">OPERATIONAL SITUATION</span></h2>
                <div class="wr-dialog-body" style="text-align: left;">
                    <p style="margin-bottom: 20px;">The situation is tense but no widespread military operations are currently underway.</p>
                    <p style="margin-bottom: 20px;">Review political intelligence on the map to prepare for potential escalation.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button class="wr-btn" id="wr-btn-open-map-situ">OPEN TACTICAL MAP</button>
                    </div>
                </div>
            `;
        } else {
            const warData = extractWarData(this.gameState, factionId);
            const currentDate = turnToDateString(this.gameState.meta.turn);
            
            const routedBrigades = warData.ownForces.formationDetails.filter(f => f.posture === 'routed').length;
            const cutOffBrigades = warData.brigadeMovement.encircled.length;
            const starvingBrigades = warData.ownSupply.criticalCount;
            const attacksConducted = warData.ownCorpsOps.filter(o => o.operation?.type === 'general_offensive' || o.operation?.type === 'sector_attack').length;
            
            content = `
                <h2><span class="wr-text-primary">OPERATIONAL SITUATION</span></h2>
                <div class="wr-dialog-body" style="text-align: left; font-family: 'Courier New', Courier, monospace;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 5px;">
                        <span>DATE: ${currentDate}</span>
                        <span>TURN: ${this.gameState.meta.turn}</span>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: ${accentColor}; font-size: 14px; margin-bottom: 5px;">SECTOR STRESS</h3>
                        <ul style="list-style-type: square; padding-left: 20px;">
                            <li>Active Offensives: ${attacksConducted}</li>
                            <li>Brigades Routed: ${routedBrigades}</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: ${accentColor}; font-size: 14px; margin-bottom: 5px;">LOGISTICS SUMMARY</h3>
                        <ul style="list-style-type: square; padding-left: 20px;">
                            <li>Brigades Cut Off: ${cutOffBrigades}</li>
                            <li>Brigades Starving: ${starvingBrigades}</li>
                            <li>Overall Supply Status: ${starvingBrigades > 0 ? '<span style="color: red;">CRITICAL</span>' : '<span style="color: #00e878;">NOMINAL</span>'}</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: ${accentColor}; font-size: 14px; margin-bottom: 5px;">FRONT SUMMARY</h3>
                        <p>Total Formations Deployed: ${warData.ownForces.totalBrigades}</p>
                        <p>Total Manpower in Field: ${warData.ownForces.totalPersonnel.toLocaleString()}</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <button class="wr-btn" id="wr-btn-open-map-situ" style="font-family: inherit; font-weight: bold;">PROCEED TO DESK MAP</button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = content;

        // Wire up the button
        setTimeout(() => {
            const btn = container.querySelector('#wr-btn-open-map-situ');
            if (btn) {
                btn.addEventListener('click', () => {
                    // Close this modal
                    const closeBtn = container.parentElement?.querySelector('.modal-close') as HTMLButtonElement;
                    if (closeBtn) closeBtn.click();
                    
                    // Open map
                    this.onOpenMap();
                });
            }
        }, 0);

        return container;
    }
}
