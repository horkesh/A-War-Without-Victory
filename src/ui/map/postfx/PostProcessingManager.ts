import * as THREE from 'three';

export type PostFxQualityPreset = 'low' | 'balanced' | 'high';

const PRESET_ORDER: readonly PostFxQualityPreset[] = ['low', 'balanced', 'high'];

export class PostProcessingManager {
    private preset: PostFxQualityPreset = 'balanced';

    getPreset(): PostFxQualityPreset {
        return this.preset;
    }

    cyclePreset(): PostFxQualityPreset {
        const idx = PRESET_ORDER.indexOf(this.preset);
        this.preset = PRESET_ORDER[(idx + 1) % PRESET_ORDER.length]!;
        return this.preset;
    }

    apply(renderer: THREE.WebGLRenderer, viewportWidthPx: number): void {
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        let targetRatio = dpr;
        if (this.preset === 'low') targetRatio = Math.min(1.0, dpr);
        if (this.preset === 'balanced') targetRatio = Math.min(1.5, dpr);
        if (this.preset === 'high') targetRatio = Math.min(2.0, dpr);
        // Keep deterministic frame cost envelope on very wide screens.
        if (viewportWidthPx > 2200 && this.preset !== 'high') targetRatio = Math.min(targetRatio, 1.25);
        renderer.setPixelRatio(Math.max(1, targetRatio));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = this.preset === 'high' ? 1.06 : this.preset === 'balanced' ? 1.0 : 0.94;
    }
}
