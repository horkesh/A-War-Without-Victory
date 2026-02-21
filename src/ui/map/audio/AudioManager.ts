export class AudioManager {
    private enabled = false;
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private ambientOsc: OscillatorNode | null = null;
    private ambientGain: GainNode | null = null;

    isEnabled(): boolean {
        return this.enabled;
    }

    async setEnabled(next: boolean): Promise<void> {
        if (this.enabled === next) return;
        this.enabled = next;
        if (!next) {
            this.stopAmbient();
            return;
        }
        await this.ensureContext();
        this.startAmbient();
    }

    async uiClick(): Promise<void> {
        if (!this.enabled) return;
        await this.ensureContext();
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 520;
        gain.gain.value = 0.0001;
        gain.gain.linearRampToValueAtTime(0.018, this.ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.13);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.14);
    }

    private async ensureContext(): Promise<void> {
        if (this.ctx && this.masterGain) return;
        if (typeof window === 'undefined') return;
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.08;
        this.masterGain.connect(this.ctx.destination);
        if (this.ctx.state === 'suspended') await this.ctx.resume();
    }

    private startAmbient(): void {
        if (!this.ctx || !this.masterGain || this.ambientOsc) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 72;
        gain.gain.value = 0.0035;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        this.ambientOsc = osc;
        this.ambientGain = gain;
    }

    private stopAmbient(): void {
        if (!this.ctx) return;
        if (this.ambientOsc) {
            try { this.ambientOsc.stop(); } catch { /* no-op */ }
            this.ambientOsc.disconnect();
            this.ambientOsc = null;
        }
        if (this.ambientGain) {
            this.ambientGain.disconnect();
            this.ambientGain = null;
        }
    }
}
