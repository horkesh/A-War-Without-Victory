import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { NATO_TOKENS, factionFill } from '../../src/map/nato_tokens.js';

const GEOJSON_PATH = resolve('data/derived/A1_BASE_MAP.geojson');
const OUTPUT_PATH = resolve('data/derived/A1_MAP_SNAPSHOT.png');

/** Deterministic paper grain overlay (no random/timestamp). */
function drawPaperGrain(ctx: any, width: number, height: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    // Subtle noise spots
    for (let i = 0; i < 5000; i++) {
        const x = (i * 131) % width;
        const y = (i * 197) % height;
        ctx.fillRect(x, y, 1, 1);
    }
    // Subtle cross-hatch
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    for (let i = 0; i < width; i += 10) {
        ctx.moveTo(i, 0); ctx.lineTo(i, height);
    }
    for (let i = 0; i < height; i += 10) {
        ctx.moveTo(0, i); ctx.lineTo(width, i);
    }
    ctx.stroke();
    ctx.restore();
}

async function render() {
    console.time('Total Execution');
    console.log('--- A1 Map Snapshot Engine (v8 Tactical Detail) ---');

    console.log('1/5 Loading A1 Base Map...');
    const data = JSON.parse(readFileSync(GEOJSON_PATH, 'utf-8'));
    const features = data.features;

    console.log('2/5 Defining Operational Viewport (MSR Focus)...');
    let msrMinX = Infinity, msrMinY = Infinity, msrMaxX = -Infinity, msrMaxY = -Infinity;

    features.forEach((f: any) => {
        if (f.properties?.role === 'road' && f.properties?.nato_class === 'MSR') {
            const visit = (pt: number[]) => {
                if (!pt || pt.length < 2 || typeof pt[0] !== 'number') return;
                if (pt[0] === 0 && pt[1] === 0) return;
                msrMinX = Math.min(msrMinX, pt[0]);
                msrMinY = Math.min(msrMinY, pt[1]);
                msrMaxX = Math.max(msrMaxX, pt[0]);
                msrMaxY = Math.max(msrMaxY, pt[1]);
            };
            const type = f.geometry.type;
            const coords = f.geometry.coordinates;
            if (type === 'LineString') coords.forEach(visit);
            else if (type === 'MultiLineString') coords.forEach((ln: any) => ln && ln.forEach(visit));
        }
    });

    const width = 2400;
    const height = 1800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const margin = Math.max(msrMaxX - msrMinX, msrMaxY - msrMinY) * 0.1;
    const vMinX = msrMinX - margin;
    const vMaxX = msrMaxX + margin;
    const vMinY = msrMinY - margin;
    const vMaxY = msrMaxY + margin;

    const scale = Math.min(width / (vMaxX - vMinX), height / (vMaxY - vMinY));
    const offX = (width - (vMaxX - vMinX) * scale) / 2 - vMinX * scale;
    const offY = (height - (vMaxY - vMinY) * scale) / 2 - vMinY * scale;

    const projectX = (x: number) => x * scale + offX;
    const projectY = (y: number) => y * scale + offY;

    console.log(`Operational Bounds: X[${msrMinX.toFixed(1)}, ${msrMaxX.toFixed(1)}] Y[${msrMinY.toFixed(1)}, ${msrMaxY.toFixed(1)}]`);
    console.log(`Viewport: X[${vMinX.toFixed(1)}, ${vMaxX.toFixed(1)}] Y[${vMinY.toFixed(1)}, ${vMaxY.toFixed(1)}] Scale: ${scale.toFixed(4)}`);

    // Background - White outside BiH
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // --- BiH Clipping Mask ---
    const boundaryFeatures = features.filter((f: any) => f.properties?.role === 'boundary');

    if (boundaryFeatures.length > 0) {
        ctx.save();
        ctx.beginPath();
        boundaryFeatures.forEach((f: any) => {
            const type = f.geometry.type;
            const coords = f.geometry.coordinates;
            const polys = type === 'Polygon' ? [coords] : (type === 'MultiPolygon' ? coords : []);
            polys.forEach((rings: any) => {
                rings.forEach((ring: any, ri: number) => {
                    ring.forEach((pt: any, i: number) => {
                        const x = projectX(pt[0]), y = projectY(pt[1]);
                        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    });
                    ctx.closePath();
                });
            });
        });
        ctx.clip();
    }

    // Surface Fill (NATO Paper)
    ctx.fillStyle = NATO_TOKENS.paper;
    ctx.fillRect(0, 0, width, height);
    drawPaperGrain(ctx, width, height);

    // --- Grid Lines (Reflective of SVG Unit Space) ---
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.lineWidth = 0.5;
    const gridSpacing = 100;

    ctx.beginPath();
    for (let x = Math.floor(vMinX / gridSpacing) * gridSpacing; x <= vMaxX; x += gridSpacing) {
        const sx = projectX(x);
        ctx.moveTo(sx, 0); ctx.lineTo(sx, height);
    }
    for (let y = Math.floor(vMinY / gridSpacing) * gridSpacing; y <= vMaxY; y += gridSpacing) {
        const sy = projectY(y);
        ctx.moveTo(0, sy); ctx.lineTo(width, sy);
    }
    ctx.stroke();

    // Grid Labels
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '600 9pt monospace';
    for (let x = Math.floor(vMinX / gridSpacing) * gridSpacing; x <= vMaxX; x += gridSpacing) {
        ctx.fillText(Math.round(x).toString(), projectX(x) + 4, 15);
    }
    for (let y = Math.floor(vMinY / gridSpacing) * gridSpacing; y <= vMaxY; y += gridSpacing) {
        ctx.fillText(Math.round(y).toString(), 5, projectY(y) - 4);
    }

    const background = [];
    const urban = [];
    const rivers = [];
    const msrs = [];
    const secondaryRoads = [];
    const controlRegions = [];
    const settlements: any[] = [];

    const isCoordinateValid = (pt: number[]) => pt && (pt[0] < 5000 && pt[0] > -5000 && pt[1] < 5000 && pt[1] > -5000);

    for (const f of features) {
        const props = f.properties || {};
        const role = props.role;

        if (role === 'river') rivers.push(f);
        else if (role === 'road') {
            if (props.nato_class === 'MSR') msrs.push(f);
            else secondaryRoads.push(f);
        } else if (role === 'control_region') {
            controlRegions.push(f);
        } else if (role === 'settlement') {
            let sample = f.geometry.coordinates;
            if (f.geometry.type !== 'Point') sample = sample[0] && sample[0][0];
            if (isCoordinateValid(sample)) {
                settlements.push(f);
                if (f.geometry.type.includes('Polygon')) urban.push(f);
            }
        } else {
            background.push(f);
        }
    }

    console.log(`Categorized: ${rivers.length} rivers, ${msrs.length} MSRs, ${controlRegions.length} control zones`);
    console.log('4/5 Rendering Tactical Layers...');

    // 0. LANDMASS CONTEXT
    ctx.strokeStyle = 'rgba(100, 90, 80, 0.4)';
    ctx.lineWidth = 2.0;
    boundaryFeatures.forEach((f: any) => {
        const type = f.geometry.type;
        const coords = f.geometry.coordinates;
        const polys = type === 'Polygon' ? [coords] : (type === 'MultiPolygon' ? coords : []);
        polys.forEach((rings: any) => {
            if (!rings || !rings[0]) return;
            ctx.beginPath();
            rings[0].forEach((pt: any, i: number) => {
                const x = projectX(pt[0]), y = projectY(pt[1]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });
    });

    // 0b. CONTROL REGIONS (Faction Overlays)
    controlRegions.forEach((f: any) => {
        const faction = f.properties.controller as any;
        if (!faction) return;
        ctx.fillStyle = factionFill(faction, 0.15);

        const type = f.geometry.type;
        const coords = f.geometry.coordinates;
        const polys = type === 'Polygon' ? [coords] : (type === 'MultiPolygon' ? coords : []);

        polys.forEach((rings: any) => {
            ctx.beginPath();
            rings.forEach((ring: any) => {
                ring.forEach((pt: any, i: number) => {
                    const x = projectX(pt[0]), y = projectY(pt[1]);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.closePath();
            });
            ctx.fill();

            // Subtle dashed border
            ctx.strokeStyle = factionFill(faction, 0.4);
            ctx.lineWidth = 0.8;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            rings[0].forEach((pt: any, i: number) => {
                const x = projectX(pt[0]), y = projectY(pt[1]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.setLineDash([]);
        });
    });

    // 2. URBAN AREAS - Tactical Red (Legacy Overlays)
    ctx.fillStyle = 'rgba(180, 50, 50, 0.1)';
    settlements.filter((s: any) => s.properties.nato_class !== 'SETTLEMENT').forEach((f: any) => {
        const coords = f.geometry.coordinates;
        const type = f.geometry.type;
        if (type === 'Point') return;

        const polys = type === 'Polygon' ? [coords] : (type === 'MultiPolygon' ? coords : []);
        polys.forEach((rings: any) => {
            ctx.beginPath();
            rings.forEach((ring: any) => {
                ring.forEach((pt: any, i: number) => {
                    const x = projectX(pt[0]), y = projectY(pt[1]);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.closePath();
            });
            ctx.fill();
        });
    });

    // 3. RIVERS (hydrography - Dusty Blue)
    ctx.strokeStyle = NATO_TOKENS.hydrography;
    ctx.lineWidth = 1.2;
    rivers.forEach((f: any) => {
        const coords = f.geometry.coordinates;
        const lines = f.geometry.type === 'LineString' ? [coords] : (f.geometry.type === 'MultiLineString' ? coords : []);
        ctx.beginPath();
        lines.forEach((line: any) => {
            if (!line) return;
            line.forEach((pt: any, i: number) => {
                const x = projectX(pt[0]), y = projectY(pt[1]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
        });
        ctx.stroke();
    });

    // 4. SECONDARY ROADS (Subtle)
    ctx.strokeStyle = NATO_TOKENS.secondaryRoad;
    ctx.lineWidth = 0.5;
    secondaryRoads.forEach((f: any) => {
        const coords = f.geometry.coordinates;
        const lines = f.geometry.type === 'LineString' ? [coords] : (f.geometry.type === 'MultiLineString' ? coords : []);
        ctx.beginPath();
        lines.forEach((line: any) => {
            if (!line) return;
            line.forEach((pt: any, i: number) => {
                const x = projectX(pt[0]), y = projectY(pt[1]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
        });
        ctx.stroke();
    });

    // 5. MSR Network (high contrast but subtle)
    ctx.strokeStyle = NATO_TOKENS.MSR;
    ctx.lineWidth = 1.2;
    msrs.forEach((f: any) => {
        const coords = f.geometry.coordinates;
        const lines = f.geometry.type === 'LineString' ? [coords] : (f.geometry.type === 'MultiLineString' ? coords : []);
        ctx.beginPath();
        lines.forEach((line: any) => {
            if (!line) return;
            line.forEach((pt: any, i: number) => {
                const x = projectX(pt[0]), y = projectY(pt[1]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
        });
        ctx.stroke();
    });

    // Map Border
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    // Restore clipping mask
    ctx.restore();

    // 6. LABELS - Major cities only
    console.log('   - Adding Tactical Labels (major cities only)...');
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const majorCityPop = 20000;

    // De-duplicate and filter major cities
    const citiesMap = new Map();
    settlements.forEach((s: any) => {
        const pop = s.properties?.pop ?? 0;
        if (pop < majorCityPop) return;

        let name = s.properties?.name;
        if (!name) return;

        // Sarajevo / Mostar consolidation
        const lowerName = name.toLowerCase();
        if (lowerName.includes('sarajevo') || lowerName === 'ilidža' || lowerName === 'ilidza') {
            name = 'Sarajevo';
        } else if (lowerName.includes('mostar')) {
            name = 'Mostar';
        }

        let coords = s.geometry.coordinates;
        if (s.geometry.type !== 'Point') {
            // For polygons, take the first point of the first ring
            coords = s.geometry.type === 'Polygon' ? coords[0][0] : coords[0][0][0];
        }
        if (!coords || typeof coords[0] !== 'number') return;

        if (!citiesMap.has(name) || pop > citiesMap.get(name).pop) {
            citiesMap.set(name, { name, pop, coords });
        }
    });

    const labeledCities = Array.from(citiesMap.values())
        .sort((a: any, b: any) => b.pop - a.pop);

    labeledCities.forEach((city: any) => {
        const px = projectX(city.coords[0]);
        const py = projectY(city.coords[1]);

        if (px < 50 || px > width - 50 || py < 50 || py > height - 50) return;

        // Subtle typography 11pt, Dark Grey
        ctx.font = '400 11pt "Inter", sans-serif';
        ctx.fillStyle = '#444';

        // Text Halo for legibility
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(city.name, px, py - 10);
        ctx.fillText(city.name, px, py - 10);
    });

    console.log('5/5 Saving High-Detail Snapshot...');
    const buffer = await canvas.encode('png');
    writeFileSync(OUTPUT_PATH, buffer);
    console.log(`\x1b[32mFinal Snapshot (v8): ${OUTPUT_PATH}\x1b[0m`);

    console.timeEnd('Total Execution');
}

render().catch(err => {
    console.error(err);
    process.exit(1);
});

