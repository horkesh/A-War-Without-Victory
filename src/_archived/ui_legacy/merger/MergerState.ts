/**
 * Observable state store for the Settlement Merger tool.
 * Follows the HoIMapState subscribe/notify/getSnapshot pattern.
 */

import type { AggregatedStats, CanonicalFeature, MergeGroup } from './types.js';

const MAJORITY_THRESHOLD = 0.40;

type Listener = () => void;

export class MergerState {
    // ── Core data (immutable after construction) ──
    readonly features: Map<string, CanonicalFeature>;
    readonly adjacency: Map<string, Set<string>>;
    readonly municipalities: Map<string, string>; // id → name

    // ── Mutable UI state ──
    mergeGroups = new Map<string, MergeGroup>();
    sidToOsid = new Map<string, string>();
    selectedSids = new Set<string>();
    activeMunicipality: string | null = null;
    hoveredSid: string | null = null;
    colorMode: 'ethnic' | 'merge_group' | 'group_ethnic' = 'ethnic';
    focusedGroupOsid: string | null = null;

    private listeners: Listener[] = [];
    private nextColorIndex = 0;
    private usedOsids = new Set<string>();
    // Cached validation flags — invalidated when groups change
    private _groupValidationCache = new Map<string, { connected: boolean; crossMun: boolean }>();
    private _groupValidationVersion = 0;
    private _lastValidationVersion = -1;

    constructor(
        features: Map<string, CanonicalFeature>,
        adjacency: Map<string, Set<string>>,
        municipalities: Map<string, string>,
    ) {
        this.features = features;
        this.adjacency = adjacency;
        this.municipalities = municipalities;
    }

    // ── Subscribe / notify ──

    subscribe(listener: Listener): () => void {
        this.listeners.push(listener);
        return () => {
            const i = this.listeners.indexOf(listener);
            if (i >= 0) this.listeners.splice(i, 1);
        };
    }

    private notify(): void {
        for (const l of this.listeners) l();
    }

    // ── Selection ──

    toggleSelection(sid: string): void {
        if (this.selectedSids.has(sid)) {
            this.selectedSids.delete(sid);
        } else {
            this.selectedSids.add(sid);
        }
        this.notify();
    }

    clearSelection(): void {
        if (this.selectedSids.size === 0) return;
        this.selectedSids.clear();
        this.notify();
    }

    // ── Merge operations ──

    confirmMerge(): MergeGroup | null {
        if (this.selectedSids.size < 2) return null;

        const memberSids = Array.from(this.selectedSids).sort();

        // Remove any members already in another group
        for (const sid of memberSids) {
            const existingOsid = this.sidToOsid.get(sid);
            if (existingOsid) {
                this.undoMergeInternal(existingOsid);
            }
        }

        const osid = this.makeOsid(memberSids);
        const largest = this.largestMember(memberSids);
        const largestName = this.features.get(largest)?.properties.settlement_name ?? largest;
        const label = memberSids.length === 1
            ? largestName
            : `${largestName} (+${memberSids.length - 1})`;

        const group: MergeGroup = {
            osid,
            memberSids,
            label,
            colorIndex: this.nextColorIndex++,
        };

        this.mergeGroups.set(osid, group);
        for (const sid of memberSids) {
            this.sidToOsid.set(sid, osid);
        }
        this.usedOsids.add(osid);
        this.selectedSids.clear();
        this.invalidateGroupValidation();
        this.notify();
        return group;
    }

    undoMerge(osid: string): void {
        this.undoMergeInternal(osid);
        this.invalidateGroupValidation();
        this.notify();
    }

    /** Dissolve ALL merge groups whose members belong to the given municipality. */
    unmergeAllInMunicipality(munId: string): number {
        const toRemove: string[] = [];
        for (const [osid, group] of this.mergeGroups) {
            // A group belongs to a municipality if its first member is in that mun
            const f = this.features.get(group.memberSids[0]!);
            if (f && f.properties.mun1990_id === munId) {
                toRemove.push(osid);
            }
        }
        for (const osid of toRemove) {
            this.undoMergeInternal(osid);
        }
        if (toRemove.length > 0) {
            this.focusedGroupOsid = null;
            this.invalidateGroupValidation();
            this.notify();
        }
        return toRemove.length;
    }

    /** Add a single settlement to an existing merge group. */
    addToGroup(osid: string, sid: string): boolean {
        const group = this.mergeGroups.get(osid);
        if (!group) return false;
        if (group.memberSids.includes(sid)) return false;

        // If the settlement is in another group, remove it from there first
        const existingOsid = this.sidToOsid.get(sid);
        if (existingOsid) {
            this.removeFromGroupInternal(existingOsid, sid);
        }

        // Add to group (maintain sorted order)
        group.memberSids.push(sid);
        group.memberSids.sort();
        this.sidToOsid.set(sid, osid);

        // Update label
        const largest = this.largestMember(group.memberSids);
        const largestName = this.features.get(largest)?.properties.settlement_name ?? largest;
        group.label = group.memberSids.length === 1
            ? largestName
            : `${largestName} (+${group.memberSids.length - 1})`;

        this.invalidateGroupValidation();
        this.notify();
        return true;
    }

    /** Remove a single settlement from a merge group. If only 1 member remains, dissolve the group. */
    removeFromGroup(osid: string, sid: string): void {
        this.removeFromGroupInternal(osid, sid);
        this.invalidateGroupValidation();
        this.notify();
    }

    private removeFromGroupInternal(osid: string, sid: string): void {
        const group = this.mergeGroups.get(osid);
        if (!group) return;
        const idx = group.memberSids.indexOf(sid);
        if (idx < 0) return;

        group.memberSids.splice(idx, 1);
        this.sidToOsid.delete(sid);

        if (group.memberSids.length < 2) {
            // Group dissolved — remove last member from sidToOsid too
            for (const remaining of group.memberSids) {
                this.sidToOsid.delete(remaining);
            }
            this.mergeGroups.delete(osid);
            if (this.focusedGroupOsid === osid) {
                this.focusedGroupOsid = null;
            }
        } else {
            // Update label
            const largest = this.largestMember(group.memberSids);
            const largestName = this.features.get(largest)?.properties.settlement_name ?? largest;
            group.label = `${largestName} (+${group.memberSids.length - 1})`;
        }
    }

    private undoMergeInternal(osid: string): void {
        const group = this.mergeGroups.get(osid);
        if (!group) return;
        for (const sid of group.memberSids) {
            this.sidToOsid.delete(sid);
        }
        this.mergeGroups.delete(osid);
        // Keep usedOsids so we don't reuse the name
    }

    // ── Filters ──

    setMunicipality(munId: string | null): void {
        if (this.activeMunicipality === munId) return;
        this.activeMunicipality = munId;
        this.selectedSids.clear();
        this.notify();
    }

    setHover(sid: string | null): void {
        if (this.hoveredSid === sid) return;
        this.hoveredSid = sid;
        this.notify();
    }

    setColorMode(mode: 'ethnic' | 'merge_group' | 'group_ethnic'): void {
        if (this.colorMode === mode) return;
        this.colorMode = mode;
        this.notify();
    }

    setFocusedGroup(osid: string | null): void {
        if (this.focusedGroupOsid === osid) return;
        this.focusedGroupOsid = osid;
        this.notify();
    }

    // ── Computed ──

    getVisibleSids(): string[] {
        if (!this.activeMunicipality) {
            return Array.from(this.features.keys());
        }
        const result: string[] = [];
        for (const [sid, f] of this.features) {
            if (f.properties.mun1990_id === this.activeMunicipality) {
                result.push(sid);
            }
        }
        return result;
    }

    getAggregatedStats(sids: Iterable<string>): AggregatedStats {
        let total = 0, bosniaks = 0, croats = 0, serbs = 0, others = 0;
        for (const sid of sids) {
            const f = this.features.get(sid);
            if (!f) continue;
            total += f.properties.population_total || 0;
            bosniaks += f.properties.population_bosniaks || 0;
            croats += f.properties.population_croats || 0;
            serbs += f.properties.population_serbs || 0;
            others += f.properties.population_others || 0;
        }

        let ethnicKey = 'X';
        if (total > 0) {
            const bPct = bosniaks / total;
            const sPct = serbs / total;
            const cPct = croats / total;
            if (bPct >= MAJORITY_THRESHOLD) ethnicKey = 'B';
            else if (sPct >= MAJORITY_THRESHOLD) ethnicKey = 'S';
            else if (cPct >= MAJORITY_THRESHOLD) ethnicKey = 'C';
            else {
                const max = Math.max(bPct, sPct, cPct);
                if (bPct === max) ethnicKey = 'Bm';
                else if (sPct === max) ethnicKey = 'Sm';
                else ethnicKey = 'Cm';
            }
        }

        return {
            total,
            bosniaks,
            croats,
            serbs,
            others,
            ethnicKey,
            pctB: total > 0 ? (bosniaks / total) * 100 : 0,
            pctC: total > 0 ? (croats / total) * 100 : 0,
            pctS: total > 0 ? (serbs / total) * 100 : 0,
            pctO: total > 0 ? (others / total) * 100 : 0,
        };
    }

    /**
     * Get the ethnic key for a settlement based on its merge group's aggregated ethnicity.
     * If unmerged, returns the settlement's own ethnic key.
     */
    getGroupEthnicKey(sid: string): string {
        const osid = this.sidToOsid.get(sid);
        if (!osid) {
            // Unmerged — use own ethnic key
            return this.features.get(sid)?.properties.ethnic_key ?? 'X';
        }
        const group = this.mergeGroups.get(osid);
        if (!group) return this.features.get(sid)?.properties.ethnic_key ?? 'X';
        const stats = this.getAggregatedStats(group.memberSids);
        return stats.ethnicKey;
    }

    /** Get cached validation flags for a group. Recomputes all flags when groups change. */
    getGroupValidation(osid: string): { connected: boolean; crossMun: boolean } {
        if (this._lastValidationVersion !== this._groupValidationVersion) {
            this._groupValidationCache.clear();
            for (const [gOsid, group] of this.mergeGroups) {
                this._groupValidationCache.set(gOsid, {
                    connected: this.isConnected(group.memberSids),
                    crossMun: this.isCrossMunicipality(group.memberSids),
                });
            }
            this._lastValidationVersion = this._groupValidationVersion;
        }
        return this._groupValidationCache.get(osid) ?? { connected: true, crossMun: false };
    }

    /** Invalidate group validation cache (call after any group mutation). */
    private invalidateGroupValidation(): void {
        this._groupValidationVersion++;
    }

    /** Check if a set of SIDs forms a connected subgraph in the adjacency map. */
    isConnected(sids: Set<string> | string[]): boolean {
        const arr = Array.isArray(sids) ? sids : Array.from(sids);
        if (arr.length <= 1) return true;
        const memberSet = Array.isArray(sids) ? new Set(sids) : sids;
        const visited = new Set<string>();
        const queue = [arr[0]!];
        visited.add(arr[0]!);
        while (queue.length > 0) {
            const cur = queue.pop()!;
            const neighbors = this.adjacency.get(cur);
            if (!neighbors) continue;
            for (const n of neighbors) {
                if (memberSet.has(n) && !visited.has(n)) {
                    visited.add(n);
                    queue.push(n);
                }
            }
        }
        return visited.size === arr.length;
    }

    /** Check if a group's members span multiple municipalities. */
    isCrossMunicipality(memberSids: string[]): boolean {
        if (memberSids.length <= 1) return false;
        const first = this.features.get(memberSids[0]!)?.properties.mun1990_id;
        if (!first) return false;
        for (let i = 1; i < memberSids.length; i++) {
            const mun = this.features.get(memberSids[i]!)?.properties.mun1990_id;
            if (mun && mun !== first) return true;
        }
        return false;
    }

    getMunicipalityCounts(): Map<string, number> {
        const counts = new Map<string, number>();
        for (const f of this.features.values()) {
            const mun = f.properties.mun1990_id;
            counts.set(mun, (counts.get(mun) || 0) + 1);
        }
        return counts;
    }

    // ── Save / Load ──

    exportMergeState(): string {
        const groups = Array.from(this.mergeGroups.values()).map(g => ({
            osid: g.osid,
            memberSids: g.memberSids,
        }));
        return JSON.stringify({ mergeGroups: groups }, null, 2);
    }

    importMergeState(json: string): void {
        const data = JSON.parse(json);
        // Clear existing
        this.mergeGroups.clear();
        this.sidToOsid.clear();
        this.nextColorIndex = 0;
        this.usedOsids.clear();

        if (data.mergeGroups && Array.isArray(data.mergeGroups)) {
            for (const g of data.mergeGroups) {
                if (!g.osid || !Array.isArray(g.memberSids) || g.memberSids.length < 2) continue;
                // Filter to only SIDs that exist in our features map
                const validSids = g.memberSids.filter((sid: string) => this.features.has(sid));
                if (validSids.length < 2) continue;
                const largest = this.largestMember(validSids);
                const largestName = this.features.get(largest)?.properties.settlement_name ?? largest;
                const label = validSids.length === 1
                    ? largestName
                    : `${largestName} (+${validSids.length - 1})`;
                const group: MergeGroup = {
                    osid: g.osid,
                    memberSids: validSids,
                    label,
                    colorIndex: this.nextColorIndex++,
                };
                this.mergeGroups.set(g.osid, group);
                for (const sid of validSids) {
                    this.sidToOsid.set(sid, g.osid);
                }
                this.usedOsids.add(g.osid);
            }
        }
        this.selectedSids.clear();
        this.invalidateGroupValidation();
        this.notify();
    }

    /**
     * Import merge groups from a canonical_to_operational_map.json mapping.
     * This is the format produced by derive_operational_settlements.ts:
     * { "S100013": "op:banovici:banovici", "S100021": "op:banovici:banovici_selo", ... }
     *
     * Groups with only 1 member (singletons) are skipped since they don't need merging.
     */
    importFromCanonicalMap(mapping: Record<string, string>): void {
        // Clear existing
        this.mergeGroups.clear();
        this.sidToOsid.clear();
        this.nextColorIndex = 0;
        this.usedOsids.clear();

        // Group SIDs by OSID
        const osidToSids = new Map<string, string[]>();
        for (const [sid, osid] of Object.entries(mapping)) {
            // Only include SIDs that exist in our features (handles Mostar split etc.)
            if (!this.features.has(sid)) continue;
            if (!osidToSids.has(osid)) osidToSids.set(osid, []);
            osidToSids.get(osid)!.push(sid);
        }

        // Create merge groups for multi-member groups only
        for (const [osid, sids] of osidToSids) {
            if (sids.length < 2) continue; // Skip singletons

            const memberSids = sids.sort();
            const largest = this.largestMember(memberSids);
            const largestName = this.features.get(largest)?.properties.settlement_name ?? largest;
            const label = `${largestName} (+${memberSids.length - 1})`;

            const group: MergeGroup = {
                osid,
                memberSids,
                label,
                colorIndex: this.nextColorIndex++,
            };

            this.mergeGroups.set(osid, group);
            for (const sid of memberSids) {
                this.sidToOsid.set(sid, osid);
            }
            this.usedOsids.add(osid);
        }

        this.selectedSids.clear();
        this.invalidateGroupValidation();
        this.notify();
    }

    // ── Internal helpers ──

    private largestMember(sids: string[]): string {
        let best = sids[0]!;
        let bestPop = this.features.get(best)?.properties.population_total ?? 0;
        for (let i = 1; i < sids.length; i++) {
            const pop = this.features.get(sids[i]!)?.properties.population_total ?? 0;
            if (pop > bestPop) {
                bestPop = pop;
                best = sids[i]!;
            }
        }
        return best;
    }

    private makeOsid(memberSids: string[]): string {
        const largest = this.largestMember(memberSids);
        const f = this.features.get(largest);
        const mun = f?.properties.mun1990_id ?? 'unknown';
        const name = f?.properties.settlement_name ?? largest;
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
        while (this.usedOsids.has(candidate)) {
            candidate = `op:${mun}:${slug}_${counter}`;
            counter++;
        }
        return candidate;
    }
}
