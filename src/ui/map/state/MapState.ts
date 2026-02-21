/**
 * Centralized observable state for the Tactical Map.
 * All mutations go through methods that emit events to subscribers.
 * Render pipeline subscribes and re-renders on state change.
 */

import type {
    LayerVisibility,
    LoadedGameState,
    MapEvent, MapEventListener,
    MapEventType,
    MapStateSnapshot,
    SettlementFillMode,
    StaffMapRegion,
    ZoomLevel,
} from '../types.js';

const DEFAULT_LAYERS: LayerVisibility = {
    politicalControl: true,
    frontLines: true,
    roads: true,
    rivers: true,
    boundary: true,
    munBorders: false,
    minimap: true,
    formations: false,
};

export class MapState {
    private _snapshot: MapStateSnapshot;
    private listeners: Set<MapEventListener> = new Set();

    constructor() {
        this._snapshot = {
            zoomLevel: 0,
            zoomFactor: 1,
            panCenter: { x: 0.5, y: 0.5 },
            layers: { ...DEFAULT_LAYERS },
            settlementFillMode: 'political_control',
            selectedSettlementSid: null,
            hoveredSettlementSid: null,
            selectedFormationId: null,
            controlDatasetKey: 'baseline',
            loadedGameState: null,
            staffMapRegion: null,
        };
    }

    get snapshot(): Readonly<MapStateSnapshot> {
        return this._snapshot;
    }

    subscribe(listener: MapEventListener): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    private emit(type: MapEventType, payload?: unknown): void {
        const event: MapEvent = { type, payload };
        for (const listener of this.listeners) {
            listener(event);
        }
    }

    setZoom(level: ZoomLevel, factor: number): void {
        this._snapshot = {
            ...this._snapshot,
            zoomLevel: level,
            zoomFactor: factor,
        };
        this.emit('zoomChanged');
        this.emit('stateChanged');
    }

    setZoomFactor(factor: number): void {
        // Compute nearest discrete level for LOD decisions
        const diffs = [
            Math.abs(factor - 1),
            Math.abs(factor - 2.5),
            Math.abs(factor - 5),
        ];
        const minIdx = diffs.indexOf(Math.min(...diffs));
        const level = minIdx as ZoomLevel;
        this._snapshot = {
            ...this._snapshot,
            zoomLevel: level,
            zoomFactor: factor,
        };
        this.emit('zoomChanged');
        this.emit('stateChanged');
    }

    setPan(x: number, y: number): void {
        this._snapshot = {
            ...this._snapshot,
            panCenter: {
                x: Math.max(0, Math.min(1, x)),
                y: Math.max(0, Math.min(1, y)),
            },
        };
        this.emit('panChanged');
        this.emit('stateChanged');
    }

    setSelectedSettlement(sid: string | null): void {
        if (this._snapshot.selectedSettlementSid === sid) return;
        this._snapshot = {
            ...this._snapshot,
            selectedSettlementSid: sid,
        };
        this.emit('settlementSelected', sid);
        this.emit('stateChanged');
    }

    setHoveredSettlement(sid: string | null): void {
        if (this._snapshot.hoveredSettlementSid === sid) return;
        this._snapshot = {
            ...this._snapshot,
            hoveredSettlementSid: sid,
        };
        this.emit('settlementHovered', sid);
    }

    setSelectedFormation(formationId: string | null): void {
        if (this._snapshot.selectedFormationId === formationId) return;
        this._snapshot = {
            ...this._snapshot,
            selectedFormationId: formationId,
        };
        this.emit('stateChanged');
    }

    toggleLayer(key: keyof LayerVisibility): void {
        const layers = { ...this._snapshot.layers };
        layers[key] = !layers[key];
        this._snapshot = { ...this._snapshot, layers };
        this.emit('layerToggled', key);
        this.emit('stateChanged');
    }

    setLayer(key: keyof LayerVisibility, value: boolean): void {
        if (this._snapshot.layers[key] === value) return;
        const layers = { ...this._snapshot.layers };
        layers[key] = value;
        this._snapshot = { ...this._snapshot, layers };
        this.emit('layerToggled', key);
        this.emit('stateChanged');
    }

    setControlDataset(key: string): void {
        this._snapshot = { ...this._snapshot, controlDatasetKey: key };
        this.emit('controlDatasetChanged', key);
        this.emit('stateChanged');
    }

    setSettlementFillMode(mode: SettlementFillMode): void {
        if (this._snapshot.settlementFillMode === mode) return;
        this._snapshot = { ...this._snapshot, settlementFillMode: mode };
        this.emit('stateChanged');
    }

    loadGameState(loaded: LoadedGameState): void {
        this._snapshot = {
            ...this._snapshot,
            loadedGameState: loaded,
            controlDatasetKey: `loaded:${loaded.label}`,
        };
        // Enable formations layer when game state is loaded
        const layers = { ...this._snapshot.layers, formations: true };
        this._snapshot = { ...this._snapshot, layers };
        this.emit('gameStateLoaded', loaded);
        this.emit('stateChanged');
    }

    enterStaffMap(region: StaffMapRegion): void {
        this._snapshot = {
            ...this._snapshot,
            staffMapRegion: region,
            zoomLevel: 3 as ZoomLevel,
            zoomFactor: 8,
        };
        this.emit('zoomChanged');
        this.emit('stateChanged');
    }

    exitStaffMap(): void {
        this._snapshot = {
            ...this._snapshot,
            staffMapRegion: null,
            zoomLevel: 2 as ZoomLevel,
            zoomFactor: 5,
        };
        this.emit('zoomChanged');
        this.emit('stateChanged');
    }

    clearGameState(): void {
        this._snapshot = {
            ...this._snapshot,
            loadedGameState: null,
            selectedFormationId: null,
            controlDatasetKey: 'baseline',
        };
        const layers = { ...this._snapshot.layers, formations: false };
        this._snapshot = { ...this._snapshot, layers };
        this.emit('gameStateLoaded', null);
        this.emit('stateChanged');
    }
}
