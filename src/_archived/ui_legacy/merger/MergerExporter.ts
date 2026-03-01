/**
 * Export logic for the Settlement Merger tool.
 * Produces the 3 pipeline output files that are drop-in replacements
 * for derive_operational_settlements.ts output.
 */

import type { MergerState } from './MergerState.js';
import type { CanonicalFeature, ContactEdge } from './types.js';

// Dynamic import for topojson (CJS modules bundled by Vite)
let topojsonServer: typeof import('topojson-server') | null = null;
let topojsonClient: typeof import('topojson-client') | null = null;

async function ensureTopojson(): Promise<void> {
    if (!topojsonServer) {
        topojsonServer = await import('topojson-server');
    }
    if (!topojsonClient) {
        topojsonClient = await import('topojson-client');
    }
}

export interface ExportResult {
    geojson: string;
    mapping: string;
    contactGraph: string;
}

export class MergerExporter {
    /**
     * Export all operational settlements from the current merge state.
     */
    static async export(state: MergerState, canonicalEdges: ContactEdge[]): Promise<ExportResult> {
        await ensureTopojson();

        const features = state.features;
        const mergeGroups = state.mergeGroups;
        const sidToOsid = state.sidToOsid;

        // ── 1. Build the full operational settlement list ──
        // Merge groups + unmerged singletons
        const osFeatures: any[] = [];
        const canonToOp: Record<string, string> = {};

        // Track used OSIDs for singleton OSID generation
        const usedOsids = new Set<string>();
        for (const osid of mergeGroups.keys()) usedOsids.add(osid);

        // Process merge groups
        for (const [osid, group] of mergeGroups) {
            const memberFeatures = group.memberSids
                .map(sid => features.get(sid))
                .filter((f): f is CanonicalFeature => !!f);

            if (memberFeatures.length === 0) continue;

            // Find largest member by population
            let repFeature = memberFeatures[0]!;
            for (const f of memberFeatures) {
                if (f.properties.population_total > repFeature.properties.population_total) {
                    repFeature = f;
                }
            }

            // Merge geometry using topological merge
            const mergedGeom = this.mergeGeometries(memberFeatures);

            // Aggregate population
            const stats = state.getAggregatedStats(group.memberSids);

            const osFeature = {
                type: 'Feature',
                geometry: mergedGeom,
                properties: {
                    osid,
                    sid: repFeature.properties.sid,
                    mun1990_id: repFeature.properties.mun1990_id,
                    mun1990_name: repFeature.properties.mun1990_name,
                    settlement_name: group.label,
                    constituent_sids: group.memberSids,
                    population_total: stats.total,
                    population_bosniaks: stats.bosniaks,
                    population_croats: stats.croats,
                    population_serbs: stats.serbs,
                    population_others: stats.others,
                    ethnic_key: stats.ethnicKey,
                },
            };
            osFeatures.push(osFeature);

            for (const sid of group.memberSids) {
                canonToOp[sid] = osid;
            }
        }

        // Process unmerged singletons
        for (const [sid, f] of features) {
            if (sidToOsid.has(sid)) continue; // Already in a group

            const osid = this.makeSingletonOsid(f, usedOsids);
            usedOsids.add(osid);

            const osFeature = {
                type: 'Feature',
                geometry: f.geometry,
                properties: {
                    osid,
                    sid: f.properties.sid,
                    mun1990_id: f.properties.mun1990_id,
                    mun1990_name: f.properties.mun1990_name,
                    settlement_name: f.properties.settlement_name,
                    constituent_sids: [f.properties.sid],
                    population_total: f.properties.population_total,
                    population_bosniaks: f.properties.population_bosniaks,
                    population_croats: f.properties.population_croats,
                    population_serbs: f.properties.population_serbs,
                    population_others: f.properties.population_others,
                    ethnic_key: f.properties.ethnic_key,
                },
            };
            osFeatures.push(osFeature);
            canonToOp[sid] = osid;
        }

        // Sort features by OSID for determinism
        osFeatures.sort((a, b) => a.properties.osid.localeCompare(b.properties.osid));

        const geojsonFc = {
            type: 'FeatureCollection',
            features: osFeatures,
        };

        // ── 2. Build canonical-to-operational map ──
        const sortedMapping: Record<string, string> = {};
        for (const key of Object.keys(canonToOp).sort()) {
            sortedMapping[key] = canonToOp[key]!;
        }

        // ── 3. Build operational contact graph ──
        const opEdges = new Map<string, any>();
        for (const edge of canonicalEdges) {
            const parentA = canonToOp[edge.a];
            const parentB = canonToOp[edge.b];
            if (!parentA || !parentB || parentA === parentB) continue;
            const [p1, p2] = parentA < parentB ? [parentA, parentB] : [parentB, parentA];
            const edgeKey = `${p1}||${p2}`;
            if (!opEdges.has(edgeKey)) {
                opEdges.set(edgeKey, { a: p1, b: p2, type: edge.type, min_dist: edge.min_dist });
            } else {
                const e = opEdges.get(edgeKey);
                if (edge.type === 'voronoi_border' || edge.type === 'manual_point_touch') e.type = edge.type;
                if (edge.min_dist < e.min_dist) e.min_dist = edge.min_dist;
            }
        }

        const opContactGraph = {
            schema_version: 1,
            parameters: { derived_from: 'manual_merger_tool' },
            nodes: Array.from(usedOsids).sort().map(id => ({ id })),
            edges: Array.from(opEdges.values()).sort((a: any, b: any) => {
                return `${a.a}||${a.b}`.localeCompare(`${b.a}||${b.b}`);
            }),
        };

        return {
            geojson: JSON.stringify(geojsonFc),
            mapping: JSON.stringify(sortedMapping, null, 2),
            contactGraph: JSON.stringify(opContactGraph),
        };
    }

    /** Merge geometries of multiple features using topological merge. */
    private static mergeGeometries(memberFeatures: CanonicalFeature[]): any {
        if (memberFeatures.length === 1) {
            return memberFeatures[0]!.geometry;
        }

        try {
            const fc = {
                type: 'FeatureCollection' as const,
                features: memberFeatures.map((f, idx) => ({
                    type: 'Feature' as const,
                    geometry: f.geometry,
                    properties: { _idx: idx },
                })),
            };
            const topo = topojsonServer!.topology({ members: fc });
            const merged = topojsonClient!.merge(topo as any, (topo as any).objects.members.geometries);
            return merged;
        } catch {
            // Fallback: return the first feature's geometry
            return memberFeatures[0]!.geometry;
        }
    }

    /** Generate OSID for a singleton settlement. */
    private static makeSingletonOsid(f: CanonicalFeature, usedOsids: Set<string>): string {
        const mun = f.properties.mun1990_id;
        const name = f.properties.settlement_name;
        const slug = name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'dj')
            .replace(/[čČćĆ]/g, 'c')
            .replace(/[šŠ]/g, 's')
            .replace(/[žŽ]/g, 'z')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');

        let candidate = `op:${mun}:${slug}`;
        let counter = 2;
        while (usedOsids.has(candidate)) {
            candidate = `op:${mun}:${slug}_${counter}`;
            counter++;
        }
        return candidate;
    }

    /** Trigger browser download. */
    static downloadFile(content: string, filename: string, mimeType: string): void {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
