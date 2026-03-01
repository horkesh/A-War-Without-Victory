/**
 * ModeToolbar — SELECT / ATTACK / MOVE mode buttons for the 3D warmap.
 *
 * Positioned above the panel stack. Warmap NATO theme.
 * Keyboard shortcuts: 1/2/3 to switch, Escape to return to SELECT.
 */

import { WARMAP_BUTTON_STYLE } from './WarMapPanelStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InteractionMode = 'select' | 'attack' | 'move';

export interface ModeToolbarCallbacks {
    onModeChange: (mode: InteractionMode) => void;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const ACTIVE_STYLE = WARMAP_BUTTON_STYLE
    .replace('0.20', '0.45')
    .replace('rgba(74,106,144,0.5)', 'rgba(74,106,144,0.8)');

export function buildModeToolbar(
    initialMode: InteractionMode,
    callbacks: ModeToolbarCallbacks,
): HTMLElement {
    const bar = document.createElement('div');
    bar.id = 'warmap-mode-toolbar';
    bar.style.cssText = [
        'position:absolute', 'top:12px', 'right:12px', 'z-index:12',
        'display:flex', 'gap:4px', 'pointer-events:all',
    ].join(';');

    const modes: Array<{ id: InteractionMode; label: string; key: string }> = [
        { id: 'select', label: 'SELECT', key: '1' },
        { id: 'attack', label: 'ATTACK', key: '2' },
        { id: 'move', label: 'MOVE', key: '3' },
    ];

    for (const m of modes) {
        const btn = document.createElement('button');
        btn.textContent = `${m.label} [${m.key}]`;
        btn.dataset.wmMode = m.id;
        btn.style.cssText = m.id === initialMode ? ACTIVE_STYLE : WARMAP_BUTTON_STYLE;
        btn.onclick = () => {
            callbacks.onModeChange(m.id);
            updateActiveButton(bar, m.id);
        };
        bar.appendChild(btn);
    }

    return bar;
}

export function updateActiveButton(bar: HTMLElement, activeMode: InteractionMode): void {
    bar.querySelectorAll('[data-wm-mode]').forEach((el) => {
        const btn = el as HTMLElement;
        btn.style.cssText = btn.dataset.wmMode === activeMode ? ACTIVE_STYLE : WARMAP_BUTTON_STYLE;
    });
}

/**
 * Install keyboard shortcuts for mode switching.
 * Returns a cleanup function to remove the listener.
 */
export function installModeKeyboard(
    callbacks: ModeToolbarCallbacks,
    bar: HTMLElement,
    getCurrentMode: () => InteractionMode,
): () => void {
    function onKeyDown(e: KeyboardEvent): void {
        // Ignore if focus is in an input/select/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        if (e.key === '1') {
            callbacks.onModeChange('select');
            updateActiveButton(bar, 'select');
        } else if (e.key === '2') {
            callbacks.onModeChange('attack');
            updateActiveButton(bar, 'attack');
        } else if (e.key === '3') {
            callbacks.onModeChange('move');
            updateActiveButton(bar, 'move');
        } else if (e.key === 'Escape') {
            if (getCurrentMode() !== 'select') {
                callbacks.onModeChange('select');
                updateActiveButton(bar, 'select');
            }
        }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
}
