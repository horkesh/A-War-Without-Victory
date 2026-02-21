export interface AttackOddsEstimate {
    expected_loss_fraction: number;
    power_ratio: number;
    win_probability: number;
}

function classifyOutcome(powerRatio: number): string {
    if (powerRatio >= 1.6) return 'LIKELY VICTORY';
    if (powerRatio >= 1.2) return 'FAVORABLE';
    if (powerRatio >= 0.9) return 'STALEMATE';
    return 'UNFAVORABLE';
}

function classifyRisk(lossFraction: number): string {
    if (lossFraction <= 0.05) return 'LOW';
    if (lossFraction <= 0.12) return 'MODERATE';
    return 'HIGH';
}

export class AttackOddsPreview {
    private readonly el: HTMLDivElement;

    constructor(parent: HTMLElement) {
        this.el = document.createElement('div');
        this.el.style.cssText = [
            'position:absolute',
            'z-index:20',
            'display:none',
            'pointer-events:none',
            'min-width:220px',
            'max-width:280px',
            'padding:8px 10px',
            'background:rgba(8,10,20,0.92)',
            'border:1px solid rgba(96,124,180,0.55)',
            'color:#c9d7ee',
            'font:11px "IBM Plex Mono", monospace',
            'line-height:1.45',
            'white-space:pre-wrap',
            'box-shadow:0 4px 12px rgba(0,0,0,0.35)',
        ].join(';');
        parent.appendChild(this.el);
    }

    setPosition(clientX: number, clientY: number): void {
        this.el.style.left = `${Math.round(clientX + 14)}px`;
        this.el.style.top = `${Math.round(clientY + 12)}px`;
    }

    show(
        settlementSid: string,
        estimate: AttackOddsEstimate,
        clientX: number,
        clientY: number
    ): void {
        const ratio = Number.isFinite(estimate.power_ratio) ? estimate.power_ratio : 0;
        const winProb = Math.max(0, Math.min(1, estimate.win_probability ?? 0));
        const lossFraction = Math.max(0, Math.min(1, estimate.expected_loss_fraction ?? 0));
        const outcome = classifyOutcome(ratio);
        const risk = classifyRisk(lossFraction);
        this.el.textContent = [
            'ATTACK ODDS',
            `Target: ${settlementSid}`,
            `Power ratio: ${ratio.toFixed(2)}:1`,
            `Win chance: ${(winProb * 100).toFixed(0)}%`,
            `Expected loss: ${(lossFraction * 100).toFixed(1)}%`,
            `Estimate: ${outcome}`,
            `Risk: ${risk}`,
        ].join('\n');
        this.setPosition(clientX, clientY);
        this.el.style.display = 'block';
    }

    hide(): void {
        this.el.style.display = 'none';
    }
}
