import type { GameState } from '../../../state/game_state.js';
import { extractWarData } from '../data/war_data_extractor.js';
import { getPlayerFaction, turnToDateString } from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

export class CommandBriefingModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    render(): HTMLElement {
        const factionId = getPlayerFaction(this.gameState) || 'RBiH';
        const isWar = this.gameState.meta.phase === 'war';
        const identity = getWarroomFactionIdentity(factionId);
        
        const container = document.createElement('div');
        container.className = 'wr-modal-newspaper wr-paper-texture';
        container.style.maxWidth = '800px';

        let content = '';

        if (!isWar) {
            content = `
                <div style="font-family: 'Courier New', Courier, monospace; color: #111;">
                    <h2 style="border-bottom: 2px solid #111; padding-bottom: 10px;">COMMAND BRIEFING: PRE-WAR SITUATION</h2>
                    <p style="font-weight: bold; margin-bottom: 20px;">CLASSIFICATION: SECRET</p>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="background: #333; color: #fff; padding: 5px;">> URGENT MATTERS</h3>
                        <ul>
                            <li>Political tensions are rising. Maintain organizational penetration.</li>
                            <li>Ensure key municipalities are secured before hostilities erupt.</li>
                            <li>Monitor opponent paramilitaries assembling near the borders.</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="background: #333; color: #fff; padding: 5px;">> LOGISTICS & SUPPLY</h3>
                        <p>Awaiting authorization for widespread mobilization. Supply caches remain sealed.</p>
                    </div>
                </div>
            `;
        } else {
            const warData = extractWarData(this.gameState, factionId);
            const currentDate = turnToDateString(this.gameState.meta.turn);
            const routedBrigades = warData.ownForces.formationDetails.filter((f) => f.posture === 'routed').length;
            const cutOffBrigades = warData.brigadeMovement.encircled.length;
            const starvingBrigades = warData.ownSupply.criticalCount;
            const strainedMunicipalities = warData.ownSupply.strainedCount;
            const exposedEdges = warData.engagedFrontEdges.filter((edge) => edge.tier === 'exposed');
            const activeOffensives = warData.ownCorpsOps.filter((op) => op.operation != null);
            const commandPriorities = this.buildCommandPriorities({
                routedBrigades,
                cutOffBrigades,
                starvingBrigades,
                strainedMunicipalities,
                exposedEdges: exposedEdges.length,
                activeOffensives: activeOffensives.length,
                activeHostileTimers: warData.ownDisplacement.activeHostileTakeoverTimers,
            });
            const enclaveStatus = this.getEnclaveStatusLine(
                warData.ownDisplacement.activeHostileTakeoverTimers,
                warData.ownDisplacement.activeCamps,
            );
            const logisticsStatus = this.getLogisticsStatusLine(
                starvingBrigades,
                strainedMunicipalities,
                cutOffBrigades,
            );

            content = `
                <div style="font-family: 'Courier New', Courier, monospace; color: #111;">
                    <h2 style="border-bottom: 2px solid #111; padding-bottom: 10px;">COMMAND BRIEFING: ${currentDate}</h2>
                    <p style="font-weight: bold; margin-bottom: 20px;">CLASSIFICATION: TOP SECRET / EYES ONLY</p>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="background: #333; color: #fff; padding: 5px;">> WHAT MATTERS NOW</h3>
                        <ul style="line-height: 1.55; margin: 0; padding-left: 18px;">
                            ${commandPriorities.map((line) => `<li>${line}</li>`).join('')}
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="background: #333; color: #fff; padding: 5px;">> ENCLAVE WARNINGS</h3>
                        <p>${enclaveStatus}</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="background: #333; color: #fff; padding: 5px;">> CONVOY STATUS</h3>
                        <p>${logisticsStatus}</p>
                    </div>

                    <div style="margin-top: 40px; border-top: 1px dashed #666; padding-top: 10px; font-size: 12px; text-align: right;">
                        Generated by ${identity.commandBriefLabel}
                    </div>
                </div>
            `;
        }

        container.innerHTML = content;
        return container;
    }

    private buildCommandPriorities(args: {
        routedBrigades: number;
        cutOffBrigades: number;
        starvingBrigades: number;
        strainedMunicipalities: number;
        exposedEdges: number;
        activeOffensives: number;
        activeHostileTimers: number;
    }): string[] {
        const lines: string[] = [];

        if (args.routedBrigades > 0) {
            lines.push(`CRITICAL: ${args.routedBrigades} brigade${args.routedBrigades === 1 ? '' : 's'} routed in recent fighting.`);
        }
        if (args.cutOffBrigades > 0) {
            lines.push(`${args.cutOffBrigades} brigade${args.cutOffBrigades === 1 ? '' : 's'} currently cut off from stable command routes.`);
        }
        if (args.starvingBrigades > 0) {
            lines.push(`${args.starvingBrigades} brigade${args.starvingBrigades === 1 ? '' : 's'} report critical supply shortages.`);
        } else if (args.strainedMunicipalities > 0) {
            lines.push(`${args.strainedMunicipalities} municipality${args.strainedMunicipalities === 1 ? '' : 'ies'} remain on strained sustainment footing.`);
        } else {
            lines.push('No critical sustainment collapse is reported in the current command picture.');
        }
        if (args.exposedEdges > 0) {
            lines.push(
                args.exposedEdges === 1
                    ? '1 front edge is rated exposed and requires sector review.'
                    : `${args.exposedEdges} front edges are rated exposed and require sector review.`,
            );
        }
        if (args.activeOffensives > 0) {
            lines.push(
                args.activeOffensives === 1
                    ? '1 corps operation remains active and should be reviewed against supply and front pressure.'
                    : `${args.activeOffensives} corps operations remain active and should be reviewed against supply and front pressure.`,
            );
        }
        if (args.activeHostileTimers > 0) {
            lines.push(
                args.activeHostileTimers === 1
                    ? '1 hostile population-pressure timer requires headquarters attention.'
                    : `${args.activeHostileTimers} hostile population-pressure timers require headquarters attention.`,
            );
        }
        if (lines.length === 0) {
            lines.push('No immediate crisis items are flagged in the current command summary.');
            lines.push('Use the operational situation and reports folders to review quieter fronts before advancing the turn.');
        }
        return lines;
    }

    private getEnclaveStatusLine(activeHostileTimers: number, activeCamps: number): string {
        if (activeHostileTimers > 0) {
            return `${activeHostileTimers} enclave or pocket pressure timer${activeHostileTimers === 1 ? '' : 's'} are active. Review the command packet before accepting attritional delay.`;
        }
        if (activeCamps > 0) {
            return `No active enclave-collapse timer is tripped, but ${activeCamps} displacement camp${activeCamps === 1 ? '' : 's'} signal continuing humanitarian strain.`;
        }
        return 'No enclave-collapse alert is active in the current headquarters summary. Continue monitoring isolated sectors through reports and the desk map.';
    }

    private getLogisticsStatusLine(starvingBrigades: number, strainedMunicipalities: number, cutOffBrigades: number): string {
        if (starvingBrigades > 0) {
            return `Supply routing is under visible stress: ${starvingBrigades} brigade${starvingBrigades === 1 ? '' : 's'} are starving, and immediate reprioritization is advised.`;
        }
        if (cutOffBrigades > 0) {
            return `Command routes are disrupted for ${cutOffBrigades} brigade${cutOffBrigades === 1 ? '' : 's'}. Review local access on the desk map before issuing further pressure orders.`;
        }
        if (strainedMunicipalities > 0) {
            return `${strainedMunicipalities} municipality${strainedMunicipalities === 1 ? '' : 'ies'} are assessed as logistically strained. Sustainment is holding, but there is no guarantee of slack.`;
        }
        return 'No critical logistics alarm is currently surfaced by the command shell. This is a staff summary, not a promise that every route is safe.';
    }
}
