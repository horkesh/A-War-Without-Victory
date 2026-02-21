import * as THREE from 'three';

export interface HeightmapData {
    bbox: [number, number, number, number];
    width: number;
    height: number;
    elevations: number[];
}

const WORLD_SCALE = 2.0;
const VERT_EXAG = 0.00022;
const BIH_CENTER_LON = (15.62 + 19.72) / 2;
const BIH_CENTER_LAT = (42.46 + 45.37) / 2;

export function wgsToWorld(lon: number, lat: number, elevM: number): [number, number, number] {
    return [
        (lon - BIH_CENTER_LON) * WORLD_SCALE,
        elevM * VERT_EXAG,
        -(lat - BIH_CENTER_LAT) * WORLD_SCALE,
    ];
}

export function buildTerrainMesh(data: HeightmapData, baseTexture: THREE.CanvasTexture): THREE.Mesh {
    const { width, height, elevations, bbox } = data;
    const [minLon, , maxLon, maxLat] = bbox;
    const numVerts = width * height;
    const positions = new Float32Array(numVerts * 3);
    const uvs = new Float32Array(numVerts * 2);

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const idx = j * width + i;
            const lon = minLon + (i / (width - 1)) * (maxLon - minLon);
            const lat = maxLat - (j / (height - 1)) * (bbox[3] - bbox[1]);
            const elev = elevations[idx] ?? 0;
            const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
            positions[idx * 3] = wx;
            positions[idx * 3 + 1] = wy;
            positions[idx * 3 + 2] = wz;
            uvs[idx * 2] = i / (width - 1);
            uvs[idx * 2 + 1] = 1 - j / (height - 1);
        }
    }

    const numCells = (width - 1) * (height - 1);
    const indices = new Uint32Array(numCells * 6);
    let ii = 0;
    for (let j = 0; j < height - 1; j++) {
        for (let i = 0; i < width - 1; i++) {
            const a = j * width + i;
            const b = a + 1, c = (j + 1) * width + i, d = c + 1;
            indices[ii++] = a; indices[ii++] = c; indices[ii++] = b;
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        map: baseTexture,
        roughness: 0.92,
        metalness: 0.0,
    });

    return new THREE.Mesh(geometry, material);
}

export function buildFactionOverlayMesh(terrainMesh: THREE.Mesh, factionTexture: THREE.CanvasTexture): THREE.Mesh {
    const mat = new THREE.MeshBasicMaterial({
        map: factionTexture,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
    });
    const mesh = new THREE.Mesh(terrainMesh.geometry, mat);
    mesh.position.y += 0.001; // Tiny lift to avoid Z-fighting
    return mesh;
}
