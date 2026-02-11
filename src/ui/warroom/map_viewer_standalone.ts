/**
 * Standalone War Planning Map viewer — no warroom.
 * Open via dev server: http://localhost:3000/map_viewer_standalone.html
 * (Opening the HTML file directly (file://) will not load /data/ — use the server.)
 */

import { WarPlanningMap } from './components/WarPlanningMap.js';

async function main(): Promise<void> {
    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
        const root = document.getElementById('map-scene');
        if (root) {
            root.innerHTML = '<div style="padding:2rem;font-family:sans-serif;color:#fff;max-width:480px;">' +
                '<p><strong>War Planning Map</strong></p>' +
                '<p>This page must be opened via the dev server, not as a file.</p>' +
                '<p>Run: <code>npm run dev:warroom</code> then open <code>http://localhost:3000/map_viewer_standalone.html</code></p>' +
                '</div>';
        }
        return;
    }

    const root = document.getElementById('map-scene');
    if (!root) {
        console.error('map-scene root not found');
        return;
    }

    const map = new WarPlanningMap();
    map.setCloseCallback(() => { /* standalone: no-op */ });
    root.appendChild(map.getContainer());

    await map.loadData();
    map.show();
}

main().catch((e) => console.error('War Planning Map standalone load failed', e));
