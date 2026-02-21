/**
 * Tactical Map — entry point.
 * Creates and initializes the MapApp.
 */

import { MapApp } from './MapApp.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new MapApp('map-root');
    (window as unknown as { __awwvMapApp?: MapApp }).__awwvMapApp = app;
    app.init().catch((err) => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
            statusEl.classList.add('error');
        }
    });
});
