import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildTerrainMesh, buildFactionOverlayMesh, HeightmapData } from './terrain/TerrainMeshBuilder';
import { buildNightOpsTexture } from './terrain/NightOpsTexture';
import { buildDayOpsTexture } from './terrain/DayOpsTexture';

export class WarMapRenderer {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;

    // Core terrain layers
    private meshDay: THREE.Mesh | null = null;
    private meshNight: THREE.Mesh | null = null;

    // Modes
    public isNightMode: boolean = true;

    constructor(private container: HTMLElement) {
        this.scene = new THREE.Scene();

        // Solid black background (space around the BIH terrain)
        this.scene.background = new THREE.Color(0x04040c);

        const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
        this.camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 50);

        // Default spawn point over central Bosnia
        this.camera.position.set(0, 5.0, 5.0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            logarithmicDepthBuffer: true,
        });

        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

        // Faint ambient light (terrain is unlit standard materials or raw RGB, 
        //   but we use standard material with mostly emissive backing/raw map).
        const ambient = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambient);

        this.bindEvents();
    }

    private bindEvents() {
        window.addEventListener('resize', this.onResize);

        // Mode switching for phase 1
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'n') {
                this.toggleMode();
            }
        });
    }

    private onResize = () => {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };

    public initTerrain(hm: HeightmapData, waterways: any, roads: any, settlements: any, centroids: Map<string, [number, number]>, baseFeatures: any) {
        // Build Night Texture
        const { texture: nightTex } = buildNightOpsTexture(hm, waterways, roads, settlements, centroids, baseFeatures);
        // Build Day Texture
        const { texture: dayTex } = buildDayOpsTexture(hm, waterways, roads, settlements, baseFeatures);

        // Ensure accurate colors
        nightTex.colorSpace = THREE.SRGBColorSpace;
        dayTex.colorSpace = THREE.SRGBColorSpace;

        this.meshNight = buildTerrainMesh(hm, nightTex);
        this.meshDay = buildTerrainMesh(hm, dayTex);

        // Setup initial transparency (crossfading)
        const nightMat = (this.meshNight.material as THREE.MeshStandardMaterial);
        nightMat.transparent = true;
        nightMat.opacity = 1.0;

        const dayMat = (this.meshDay.material as THREE.MeshStandardMaterial);
        dayMat.transparent = true;
        dayMat.opacity = 0.0;

        this.scene.add(this.meshNight);
        this.scene.add(this.meshDay);
    }

    private targetBlend: number = 1.0; // 1.0 = Night, 0.0 = Day
    private currentBlend: number = 1.0;

    public toggleMode() {
        this.isNightMode = !this.isNightMode;
        this.targetBlend = this.isNightMode ? 1.0 : 0.0;
    }

    public setMode(isNight: boolean) {
        this.isNightMode = isNight;
        this.targetBlend = isNight ? 1.0 : 0.0;
    }

    public setBlend(value: number) {
        this.targetBlend = Math.max(0, Math.min(1, value));
        this.currentBlend = this.targetBlend; // immediate snap when drag slider
    }

    public renderFrame() {
        this.controls.update();

        // Animated Crossfade
        if (Math.abs(this.currentBlend - this.targetBlend) > 0.001) {
            this.currentBlend += (this.targetBlend - this.currentBlend) * 0.1;

            if (this.meshDay && this.meshNight) {
                const tmDay = (this.meshDay.material as THREE.MeshStandardMaterial);
                const tmNight = (this.meshNight.material as THREE.MeshStandardMaterial);

                tmDay.opacity = 1.0 - this.currentBlend;
                tmNight.opacity = this.currentBlend;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    public start() {
        this.renderer.setAnimationLoop(() => {
            this.renderFrame();
        });
    }

    public dispose() {
        this.renderer.setAnimationLoop(null);
        window.removeEventListener('resize', this.onResize);
        this.renderer.dispose();
    }

    public getTerrainMesh(): THREE.Mesh | null {
        return this.meshNight; // Return either mesh so the faction overlay can clone its geometry
    }
}
