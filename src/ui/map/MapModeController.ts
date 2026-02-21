export type MapModeId = 'operations' | 'supply' | 'displacement' | 'command';

export const MAP_MODE_ORDER: readonly MapModeId[] = ['operations', 'supply', 'displacement', 'command'];

export function modeFromFunctionKey(key: string): MapModeId | null {
    const normalized = key.toUpperCase();
    if (normalized === 'F1') return 'operations';
    if (normalized === 'F2') return 'supply';
    if (normalized === 'F3') return 'displacement';
    if (normalized === 'F4') return 'command';
    return null;
}

export class MapModeController {
    private mode: MapModeId = 'operations';
    private readonly listeners = new Set<(mode: MapModeId) => void>();

    getMode(): MapModeId {
        return this.mode;
    }

    setMode(next: MapModeId): void {
        if (this.mode === next) return;
        this.mode = next;
        for (const listener of this.listeners) listener(this.mode);
    }

    onChange(listener: (mode: MapModeId) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}
