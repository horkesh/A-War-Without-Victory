#!/usr/bin/env node
/**
 * Campaign proof auditor — reads a scenario run's final_save.json and reports
 * evidence for pipeline-owned behavior from the DG2-DG6 campaign.
 *
 * Usage: node tools/audit_campaign_proof.cjs <run_dir>
 *
 * Reports:
 * - Stranded brigade lifecycle evidence (any formations with stranded_status)
 * - Rupture consequence evidence (any recorded rupture_consequences)
 * - Verdict/condemnation state (negotiation capital + dimensions)
 * - Cost ledger inputs (casualty_ledger summary)
 */

const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) {
    console.error('Usage: node tools/audit_campaign_proof.cjs <run_dir>');
    process.exit(1);
}

const finalPath = path.join(runDir, 'final_save.json');
if (!fs.existsSync(finalPath)) {
    console.error('final_save.json not found in', runDir);
    process.exit(1);
}

const state = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const formations = state.military?.formations ?? {};
const negotiation = state.military?.negotiation ?? {};
const turn = state.meta?.turn ?? 0;

console.log('=== CAMPAIGN PROOF AUDIT ===');
console.log('Run:', runDir);
console.log('Turn:', turn);
console.log('Hash:', state.meta?.state_hash ?? 'unknown');
console.log('');

// ── Stranded brigade lifecycle ──
console.log('--- STRANDED BRIGADE LIFECYCLE ---');
const stranded = [];
for (const [id, f] of Object.entries(formations).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (f.stranded_status && f.stranded_status !== 'none') {
        stranded.push({
            id,
            status: f.stranded_status,
            since_turn: f.stranded_since_turn,
            last_reachable: f.last_reachable_turn,
            cohesion: f.cohesion,
            morale: f.morale,
            personnel: f.personnel,
            lifecycle: f.lifecycle_status,
            location: f.location_osid,
            destruction_turn: f.destruction_turn,
        });
    }
}
if (stranded.length === 0) {
    console.log('  No formations with active stranded_status. Step may not have triggered.');
} else {
    console.log('  Formations with non-none stranded_status:', stranded.length);
    for (const s of stranded) {
        console.log(`  ${s.id}: ${s.status} (since t${s.since_turn}, cohesion=${s.cohesion}, morale=${s.morale}, personnel=${s.personnel})`);
        if (s.destruction_turn) console.log(`    collapsed at t${s.destruction_turn}, lifecycle=${s.lifecycle}, location=${s.location}`);
    }
}
console.log('  VERDICT:', stranded.length > 0 ? 'STEP EXECUTED — lifecycle evidence found' : 'STEP NOT TRIGGERED — no stranded brigades');
console.log('');

// ── Rupture consequences ──
console.log('--- RUPTURE CONSEQUENCES ---');
const ruptures = negotiation.rupture_consequences ?? [];
if (ruptures.length === 0) {
    const srebrenicaCtrl = state.political?.political_controllers?.['op:srebrenica:srebrenica_2'];
    const eventFlags = state.military?.event_flags ?? {};
    console.log('  No rupture consequences recorded.');
    console.log('  Srebrenica OSID controller:', srebrenicaCtrl ?? 'unknown');
    console.log('  srebrenica_enclave_formed flag:', eventFlags.srebrenica_enclave_formed ?? false);
    console.log('  Turn:', turn, '(minimum for Srebrenica rupture: 140)');
    if (turn < 140) console.log('  VERDICT: NOT ARISEN — turn < 140 threshold');
    else if (srebrenicaCtrl !== 'RS') console.log('  VERDICT: NOT ARISEN — Srebrenica not RS-controlled');
    else console.log('  VERDICT: UNEXPECTED — conditions met but no rupture recorded (BUG?)');
} else {
    console.log('  Rupture consequences:', ruptures.length);
    for (const r of ruptures) {
        console.log(`  ${r.id}: perpetrator=${r.perpetrator_faction}, turn=${r.recorded_turn}, flag=${r.condemnation_flag}`);
    }
    console.log('  VERDICT: STEP EXECUTED — rupture consequence recorded');
}
console.log('');

// ── Negotiation capital / verdict inputs ──
console.log('--- VERDICT INPUTS ---');
const capital = negotiation.capital ?? {};
for (const faction of ['RBiH', 'RS', 'HRHB'].sort()) {
    const cap = capital[faction];
    if (cap) {
        console.log(`  ${faction}: territory=${cap.territory_controlled_pct?.toFixed(1)}%, casualties_taken=${cap.military_casualties_taken}, war_crimes=${cap.war_crimes_events}, civilian_cas=${cap.civilian_casualties_caused}`);
    }
}
const dims = negotiation.strategic_dimensions;
if (dims) {
    console.log('  Strategic dimensions present: yes');
} else {
    console.log('  Strategic dimensions present: no');
}
console.log('');

// ── Cost ledger inputs ──
console.log('--- COST LEDGER INPUTS ---');
const casualtyLedger = state.military?.casualty_ledger;
if (casualtyLedger) {
    for (const faction of ['RBiH', 'RS', 'HRHB'].sort()) {
        const cl = casualtyLedger[faction];
        if (cl) {
            console.log(`  ${faction}: killed=${cl.killed ?? 0}, wounded=${cl.wounded ?? 0}, missing=${cl.missing_captured ?? 0}`);
        }
    }
} else {
    console.log('  No casualty_ledger found');
}
console.log('');

console.log('=== AUDIT COMPLETE ===');
