/**
 * Standalone 3D terrain viewer for Bosnia and Herzegovina.
 * Browser-only; not wired to the game engine.
 * Requires heightmap: run `npm run map:export:heightmap-3d` first (needs DEM).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const HEIGHTMAP_URL = '/data/derived/terrain/heightmap_3d_viewer.json';
const VERTICAL_EXAGGERATION = 0.008;
const WORLD_SCALE = 0.02; // lon/lat delta -> world units (so BiH fits in view)

interface HeightmapData {
    bbox: [number, number, number, number];
    width: number;
    height: number;
    elevations: number[];
}

function showMessage(msg: string): void {
    const el = document.getElementById('message');
    if (el) {
        el.textContent = msg;
        el.classList.add('visible');
    }
}

function hideMessage(): void {
    const el = document.getElementById('message');
    if (el) el.classList.remove('visible');
}

function buildTerrainMesh(data: HeightmapData): THREE.BufferGeometry {
    const [minLon, minLat, maxLon, maxLat] = data.bbox;
    const { width, height, elevations } = data;
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;

    const segsX = width - 1;
    const segsZ = height - 1;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const idx = j * width + i;
            const lon = minLon + (i / (width - 1)) * (maxLon - minLon);
            const lat = maxLat - (j / (height - 1)) * (maxLat - minLat);
            const x = (lon - centerLon) * WORLD_SCALE * 100;
            const z = (lat - centerLat) * WORLD_SCALE * 100;
            const y = (elevations[idx] ?? 0) * VERTICAL_EXAGGERATION;
            positions.push(x, y, z);
        }
    }

    for (let j = 0; j < segsZ; j++) {
        for (let i = 0; i < segsX; i++) {
            const a = j * width + i;
            const b = a + 1;
            const c = a + width;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

async function main(): Promise<void> {
    const containerEl = document.getElementById('canvas-container');
    if (!containerEl) return;
    const container = containerEl;

    let data: HeightmapData;
    try {
        const res = await fetch(HEIGHTMAP_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = (await res.json()) as HeightmapData;
        if (!data.bbox || !data.elevations || !data.width || !data.height) {
            throw new Error('Invalid heightmap format');
        }
    } catch (e) {
        const msg = `Cannot load heightmap.\n\nRun: npm run map:export:heightmap-3d\n(Requires DEM: data/derived/terrain/dem_clip_h6_2.tif)\n\n${(e as Error).message}`;
        showMessage(msg);
        return;
    }

    hideMessage();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.001, 1000);
    const [minLon, minLat, maxLon, maxLat] = data.bbox;
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    camera.position.set(
        (maxLon - centerLon) * WORLD_SCALE * 80,
        2,
        (maxLat - centerLat) * WORLD_SCALE * 80
    );
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    const terrainGeometry = buildTerrainMesh(data);
    const material = new THREE.MeshStandardMaterial({
        color: 0x7a9a6a,
        flatShading: false,
        metalness: 0.1,
        roughness: 0.9,
    });
    const terrain = new THREE.Mesh(terrainGeometry, material);
    scene.add(terrain);

    const light = new THREE.DirectionalLight(0xffffff, 1.4);
    light.position.set(1, 2, 1).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x705040, 0.6));

    function resize(): void {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    window.addEventListener('resize', resize);

    function animate(): void {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

main();
