/**
 * check_sectorless_brigades.cjs
 *
 * Find all active brigades not assigned to any sector in the latest run.
 * Explains WHY each brigade has no sector (exempt corps, enclave, too far, no sectors for corps).
 */

const graph = require('../data/derived/operational/operational_contact_graph.json');
const save  = require('../data/derived/latest_run_final_save.json');

const ctrl     = save.political.political_controllers;
const sectors  = save.military.corps_front_sectors;     // Record<sector_id, CorpsFrontSector>
const fmns     = save.military.formations;              // Record<fid, FormationState>

const EXEMPT = new Set(['arbih_general_staff','vrs_main_staff','hvo_general_staff']);
const GAP    = 0.0003; // FRONT_EDGE_MAX_GAP ~33m

// ── 1. Build claimed brigade set (appears in any sector) ────────────────────
const claimed = new Set();
for (const sec of Object.values(sectors)) {
    for (const bid of (sec.assigned_brigade_ids ?? [])) claimed.add(bid);
    for (const bid of (sec.reserve_brigade_ids  ?? [])) claimed.add(bid);
}

// ── 2. Build OSID adjacency for BFS (all factions, within 33m) ─────────────
const adj = new Map();
function link(a, b) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
}
for (const e of graph.edges) {
    if (!e.a || !e.b) continue;
    if (e.min_dist !== undefined && e.min_dist > GAP) continue;
    link(e.a, e.b);
}

// ── 3. Build per-faction friendly OSID sets ─────────────────────────────────
const friendlyOsids = { RBiH: new Set(), RS: new Set(), HRHB: new Set() };
for (const [osid, faction] of Object.entries(ctrl)) {
    if (friendlyOsids[faction]) friendlyOsids[faction].add(osid);
}

// ── 4. Connected components per faction (BFS) ───────────────────────────────
function buildComponents(friendly) {
    const compOf = new Map();
    let compId = 0;
    for (const start of friendly) {
        if (compOf.has(start)) continue;
        const queue = [start];
        compOf.set(start, compId);
        let qi = 0;
        while (qi < queue.length) {
            const cur = queue[qi++];
            for (const nb of (adj.get(cur) ?? [])) {
                if (!friendly.has(nb) || compOf.has(nb)) continue;
                compOf.set(nb, compId);
                queue.push(nb);
            }
        }
        compId++;
    }
    return compOf;
}
const compOf = {
    RBiH: buildComponents(friendlyOsids.RBiH),
    RS:   buildComponents(friendlyOsids.RS),
    HRHB: buildComponents(friendlyOsids.HRHB),
};

// ── 5. Collect sector front OSIDs and their component, per corps ────────────
const corpsFrontComp    = new Map(); // corps_id → Set<component_id>
const corpsFrontOsids   = new Map(); // corps_id → Set<osid>
const corpsHasSectors   = new Set();

for (const sec of Object.values(sectors)) {
    const cid = sec.corps_id;
    corpsHasSectors.add(cid);
    if (!corpsFrontOsids.has(cid)) corpsFrontOsids.set(cid, new Set());
    if (!corpsFrontComp.has(cid))  corpsFrontComp.set(cid, new Set());
    for (const ss of (sec.sub_segments ?? [])) {
        for (const o of (ss.friendly_osids ?? [])) {
            corpsFrontOsids.get(cid).add(o);
            // component of this front OSID in faction's space
            const faction = sec.faction;
            const comp = compOf[faction]?.get(o);
            if (comp !== undefined) corpsFrontComp.get(cid).add(comp);
        }
    }
}

// ── 6. BFS distance from brigade location to nearest corps sector front ──────
function distToCorpsFront(locOsid, faction, corpsId) {
    const friendly = friendlyOsids[faction];
    if (!friendly) return Infinity;
    const frontSet = corpsFrontOsids.get(corpsId);
    if (!frontSet || frontSet.size === 0) return Infinity;
    if (frontSet.has(locOsid)) return 0;

    const visited = new Set([locOsid]);
    let frontier = [locOsid];
    let dist = 0;
    while (frontier.length > 0 && dist < 30) {
        dist++;
        const next = [];
        for (const cur of frontier) {
            for (const nb of (adj.get(cur) ?? [])) {
                if (visited.has(nb) || !friendly.has(nb)) continue;
                visited.add(nb);
                if (frontSet.has(nb)) return dist;
                next.push(nb);
            }
        }
        frontier = next;
    }
    return Infinity;
}

// ── 7. Find sectorless brigades ──────────────────────────────────────────────
const sectorless = [];

for (const [fid, f] of Object.entries(fmns)) {
    if (f.status !== 'active') continue;
    if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
    if (!f.location_osid) continue;

    const corpsId = f.corps_id;
    if (EXEMPT.has(corpsId)) continue;
    if (claimed.has(fid)) continue;

    // Determine why no sector
    let reason = 'unknown';

    if (!corpsId) {
        reason = 'no_corps_id';
    } else if (!corpsHasSectors.has(corpsId)) {
        reason = 'corps_has_no_sectors';
    } else {
        const faction = f.faction;
        const locOsid = f.location_osid;
        const locComp = compOf[faction]?.get(locOsid);
        const frontComps = corpsFrontComp.get(corpsId);

        if (locComp === undefined) {
            reason = 'location_not_in_friendly_territory';
        } else if (frontComps && !frontComps.has(locComp)) {
            reason = 'disconnected_from_corps_front (enclave/pocket)';
        } else {
            const dist = distToCorpsFront(locOsid, faction, corpsId);
            if (dist === Infinity) reason = 'beyond_reach (BFS found no path)';
            else if (dist > 8)    reason = `too_far (${dist} hops > MAX_ASSIGNMENT_HOPS=8)`;
            else                  reason = `reachable_but_missed (${dist} hops) — bug?`;
        }
    }

    sectorless.push({
        id: fid,
        name: f.name ?? fid,
        corps: corpsId ?? '?',
        faction: f.faction,
        home: f.home_osid?.split(':')?.[1] ?? '?',
        loc: f.location_osid?.split(':')?.[1] ?? '?',
        pers: f.personnel ?? 0,
        reason,
    });
}

// ── 8. Output ────────────────────────────────────────────────────────────────
if (sectorless.length === 0) {
    console.log('✓ All active brigades are assigned to a sector.');
    process.exit(0);
}

console.log(`\n=== SECTORLESS BRIGADES (${sectorless.length} total) ===\n`);

// Group by reason
const byReason = {};
for (const b of sectorless) {
    (byReason[b.reason] = byReason[b.reason] ?? []).push(b);
}

for (const [reason, list] of Object.entries(byReason).sort()) {
    console.log(`\n--- ${reason} (${list.length}) ---`);
    for (const b of list.sort((a,z) => a.corps.localeCompare(z.corps) || a.name.localeCompare(z.name))) {
        console.log(`  [${b.faction}] ${b.name.padEnd(38)} corps=${b.corps.padEnd(22)} home=${b.home.padEnd(15)} loc=${b.loc.padEnd(15)} pers=${b.pers}`);
    }
}

// Summary by corps
console.log('\n=== BY CORPS ===');
const byCorps = {};
for (const b of sectorless) {
    (byCorps[b.corps] = byCorps[b.corps] ?? []).push(b);
}
for (const [corps, list] of Object.entries(byCorps).sort()) {
    console.log(`  ${corps.padEnd(30)} ${list.length} sectorless`);
}

console.log(`\nTotal sectors in game: ${Object.keys(sectors).length}`);
console.log(`Total active brigades: ${Object.values(fmns).filter(f => f.status==='active' && (f.kind==='brigade'||f.kind==='og')).length}`);
