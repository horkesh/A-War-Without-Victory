import type { GameState } from '../../../state/game_state.js';
import { toCommandBriefingView } from '../../shared/command_briefing_views.js';
import { resolveCommandBriefingHeadline, resolveCommandBriefingItemCopy } from '../../map/data/commandBriefingCopy.js';
import { t } from '../../map/i18n/index.js';
import { getPlayerFaction, turnToDateString } from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/**
 * CommandBriefingModal — Warroom command briefing surface.
 *
 * DATA BOUNDARY: the only permitted direct gameState read beyond meta.* fields is
 * military.last_briefing (line ~55). This is acceptable: last_briefing is a pre-computed
 * engine message packet, not raw operational data. Do not add further military.* or
 * political.* reads.
 */
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

        if (!isWar) {
            container.innerHTML = `
                <div style="font-family: 'Courier New', Courier, monospace; color: #111;">
                    <h2 style="border-bottom: 2px solid #111; padding-bottom: 10px;">${escapeHtml(t('commandBriefing.modal.preWarTitle'))}</h2>
                    <p style="font-weight: bold; margin-bottom: 20px;">${escapeHtml(t('commandBriefing.modal.classificationSecret'))}</p>

                    <div style="margin-bottom: 20px;">
                        <h3 style="background: #333; color: #fff; padding: 5px;">${escapeHtml(t('commandBriefing.modal.urgentMatters'))}</h3>
                        <ul>
                            <li>${escapeHtml(t('commandBriefing.modal.preWarUrgent.0'))}</li>
                            <li>${escapeHtml(t('commandBriefing.modal.preWarUrgent.1'))}</li>
                            <li>${escapeHtml(t('commandBriefing.modal.preWarUrgent.2'))}</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="background: #333; color: #fff; padding: 5px;">${escapeHtml(t('commandBriefing.modal.logisticsSupply'))}</h3>
                        <p>${escapeHtml(t('commandBriefing.modal.preWarSupply'))}</p>
                    </div>
                </div>
            `;
            return container;
        }

        const rawBriefing = this.gameState.military?.last_briefing;
        const briefing = rawBriefing && rawBriefing.faction === factionId
            ? toCommandBriefingView(rawBriefing)
            : undefined;
        const currentDate = turnToDateString(this.gameState.meta.turn);
        const items = briefing?.items ?? [];
        const itemsHtml = items.length > 0
            ? items.map((item) => {
                const copy = resolveCommandBriefingItemCopy(item);
                const tone = item.severity === 'critical'
                    ? 'font-weight: bold;'
                    : item.severity === 'warning'
                        ? 'font-style: italic;'
                        : '';
                const detail = copy.detail ? ` <span>${escapeHtml(copy.detail)}</span>` : '';
                return `<li style="${tone}">${escapeHtml(copy.title)}.${detail}</li>`;
            }).join('')
            : `<li>${escapeHtml(t('commandBriefing.modal.noPacket'))}</li>`;

        container.innerHTML = `
            <div style="font-family: 'Courier New', Courier, monospace; color: #111;">
                <h2 style="border-bottom: 2px solid #111; padding-bottom: 10px;">${escapeHtml(t('commandBriefing.modal.titleWithDate', { date: currentDate }))}</h2>
                <p style="font-weight: bold; margin-bottom: 20px;">${escapeHtml(t('commandBriefing.modal.classificationTopSecret'))}</p>

                <div style="margin-bottom: 20px;">
                    <h3 style="background: #333; color: #fff; padding: 5px;">${escapeHtml(t('commandBriefing.modal.commandSummary'))}</h3>
                    <p>${escapeHtml(briefing ? resolveCommandBriefingHeadline(briefing) : t('commandBriefing.headline.none'))}</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3 style="background: #333; color: #fff; padding: 5px;">${escapeHtml(t('commandBriefing.modal.whatMatters'))}</h3>
                    <ul style="line-height: 1.55; margin: 0; padding-left: 18px;">
                        ${itemsHtml}
                    </ul>
                </div>

                <div style="margin-top: 40px; border-top: 1px dashed #666; padding-top: 10px; font-size: 12px; text-align: right;">
                    ${escapeHtml(t('commandBriefing.modal.generatedBy', { label: identity.commandBriefLabel }))}
                </div>
            </div>
        `;

        return container;
    }
}
