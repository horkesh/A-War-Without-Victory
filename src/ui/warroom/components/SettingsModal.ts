import { getPlayerFaction } from './warroom_utils.js';

export class SettingsModal {
    private gameState: any;

    constructor(gameState: any) {
        this.gameState = gameState;
    }

    render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'wr-dialog';
        container.style.maxWidth = '600px';

        const factionId = getPlayerFaction(this.gameState) || 'RBiH';
        const accentColor = factionId === 'RS' ? '#14316d' : factionId === 'HRHB' ? '#922026' : '#2b5042';

        container.innerHTML = `
            <h2><span class="wr-text-primary">SYSTEM SETTINGS</span></h2>
            <div class="wr-dialog-body" style="text-align: left;">
                <div style="margin-bottom: 20px;">
                    <h3 style="color: ${accentColor}; font-size: 14px; border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 15px;">AUDIO</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span>Master Volume</span>
                        <input type="range" min="0" max="100" value="70" class="wr-range" onchange="console.log('Master volume changed:', this.value)">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span>Music</span>
                        <input type="range" min="0" max="100" value="50" class="wr-range" onchange="console.log('Music volume changed:', this.value)">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Radio Ambience</span>
                        <input type="range" min="0" max="100" value="80" class="wr-range" onchange="console.log('Radio volume changed:', this.value)">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3 style="color: ${accentColor}; font-size: 14px; border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 15px;">VIDEO / UX</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span>CRT Scanline Effect</span>
                        <label class="wr-switch">
                            <input type="checkbox" checked onchange="console.log('CRT effect toggled:', this.checked)">
                            <span class="wr-slider"></span>
                        </label>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span>High Contrast Mode</span>
                        <label class="wr-switch">
                            <input type="checkbox" onchange="console.log('High contrast toggled:', this.checked)">
                            <span class="wr-slider"></span>
                        </label>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Auto-Advance Dialogue</span>
                        <label class="wr-switch">
                            <input type="checkbox" onchange="console.log('Auto-advance toggled:', this.checked)">
                            <span class="wr-slider"></span>
                        </label>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <button class="wr-btn" onclick="this.closest('.wr-dialog').parentElement.querySelector('.modal-close').click()">APPLY & CLOSE</button>
                </div>
            </div>
            
            <style>
                .wr-range {
                    width: 200px;
                    accent-color: ${accentColor};
                }
                .wr-switch {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 20px;
                }
                .wr-switch input { 
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .wr-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #333;
                    transition: .4s;
                    border: 1px solid #666;
                }
                .wr-slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 2px;
                    bottom: 2px;
                    background-color: #999;
                    transition: .4s;
                }
                input:checked + .wr-slider {
                    background-color: ${accentColor};
                }
                input:checked + .wr-slider:before {
                    transform: translateX(20px);
                    background-color: #000;
                }
            </style>
        `;

        return container;
    }
}
