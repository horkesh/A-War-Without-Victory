/**
 * Diagnostic: Pool exhaustion analysis for 104w run.
 * Answers: why is RS at 149k+ troops when exhaustion should constrain at ~110k?
 *
 * Usage: node tools/diagnose_pool_exhaustion.cjs [run_dir]
 */

const fs = require('fs');
const path = require('path');

// Find latest 104w run
const runsDir = path.join(__dirname, '..', 'runs');
let resolvedDir;
if (process.argv[2]) {
    resolvedDir = path.resolve(process.argv[2]);
} else {
    const dirs = fs.readdirSync(runsDir)
        .filter(d => d.includes('104w'))
        .sort()
        .reverse();
    if (dirs.length === 0) {
        console.error('No 104w run found.');
        process.exit(1);
    }
    resolvedDir = path.join(runsDir, dirs[0]);
    console.log(`Using latest 104w run: ${dirs[0]}\n`);
}

const state = JSON.parse(fs.readFileSync(path.join(resolvedDir, 'final_save.json'), 'utf8'));

// Load population data (same path as scenario_runner.ts)
const popRaw = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'data', 'derived', 'municipality_population_1991.json'), 'utf8'
));
const pop1991 = popRaw.by_mun1990_id || {};

function getEligiblePop(munId, faction) {
    const entry = pop1991[munId];
    if (!entry || !entry.breakdown) return 0;
    const b = entry.breakdown;
    if (faction === 'RS') return b.serb || 0;
    if (faction === 'RBiH') return b.bosniak || 0;
    if (faction === 'HRHB') return b.croat || 0;
    return 0;
}

const MILITARY_AGE_MALE_FRACTION = 0.28;
const EXHAUSTION_THRESHOLD = 0.25;
const EXHAUSTION_HARD_CAP = 0.50;

// ─── 1. Aggregate pool state ────────────────────────────────────────────────

const pools = state.military?.militia_pools || {};
const poolKeys = Object.keys(pools).sort();

const factionSummary = {};
for (const key of poolKeys) {
    const pool = pools[key];
    const f = pool.faction;
    if (!factionSummary[f]) {
        factionSummary[f] = { available: 0, committed: 0, exhausted: 0, count: 0 };
    }
    factionSummary[f].available += pool.available || 0;
    factionSummary[f].committed += pool.committed || 0;
    factionSummary[f].exhausted += pool.exhausted || 0;
    factionSummary[f].count += 1;
}

console.log('='.repeat(70));
console.log('  POOL STATE AT w104 — AGGREGATE BY FACTION');
console.log('='.repeat(70));
for (const [faction, s] of Object.entries(factionSummary)) {
    console.log(`\n  ${faction} (${s.count} pools):`);
    console.log(`    available:  ${s.available.toLocaleString()}`);
    console.log(`    committed:  ${s.committed.toLocaleString()}`);
    console.log(`    exhausted:  ${s.exhausted.toLocaleString()}`);
    console.log(`    cumulative: ${(s.committed + s.exhausted).toLocaleString()}`);
}

// ─── 2. Active formation personnel ──────────────────────────────────────────

const formations = state.military?.formations || {};
const factionPers = {};
const factionBrig = {};
for (const [id, f] of Object.entries(formations)) {
    if (!f || !f.faction) continue;
    factionPers[f.faction] = (factionPers[f.faction] || 0) + (f.personnel || 0);
    if (f.kind === 'brigade') factionBrig[f.faction] = (factionBrig[f.faction] || 0) + 1;
}

console.log('\n' + '='.repeat(70));
console.log('  ACTIVE FORMATION PERSONNEL AT w104');
console.log('='.repeat(70));
for (const [faction, pers] of Object.entries(factionPers)) {
    const brigs = factionBrig[faction] || 0;
    console.log(`  ${faction}: ${pers.toLocaleString()} across ${brigs} brigades (avg ${Math.round(pers / (brigs || 1))})`);
}

// ─── 3. Strategic reserves ──────────────────────────────────────────────────

const reserves = state.military?.strategic_reserves || {};
console.log('\n' + '='.repeat(70));
console.log('  STRATEGIC RESERVES AT w104');
console.log('='.repeat(70));
for (const [faction, amount] of Object.entries(reserves)) {
    console.log(`  ${faction}: ${Number(amount).toLocaleString()}`);
}
if (Object.keys(reserves).length === 0) console.log('  (empty)');

// ─── 4. Per-municipality exhaustion for RS ──────────────────────────────────

const rsPools = poolKeys.map(k => pools[k]).filter(p => p.faction === 'RS');
const rsMunData = [];
let totalSerbPop = 0, totalSerbMilAge = 0, totalRsCommitted = 0, totalRsExhausted = 0, totalRsAvail = 0;

for (const pool of rsPools) {
    const munId = pool.mun_id;
    const censusEligible = getEligiblePop(munId, 'RS');
    const milAgeMales = Math.max(1, Math.floor(censusEligible * MILITARY_AGE_MALE_FRACTION));
    const committed = pool.committed || 0;
    const exhausted = pool.exhausted || 0;
    const available = pool.available || 0;
    const cumulative = committed + exhausted;
    const exhaustionRatio = censusEligible > 0 ? cumulative / milAgeMales : null;

    totalSerbPop += censusEligible;
    totalSerbMilAge += (censusEligible > 0 ? milAgeMales : 0);
    totalRsCommitted += committed;
    totalRsExhausted += exhausted;
    totalRsAvail += available;

    rsMunData.push({
        munId, censusEligible, milAgeMales, committed, exhausted, available,
        cumulative, exhaustionRatio
    });
}

// Sort: municipalities with census data first (by ratio desc), then zero-census
const withCensus = rsMunData.filter(d => d.censusEligible > 0);
const noCensus = rsMunData.filter(d => d.censusEligible === 0);
withCensus.sort((a, b) => (b.exhaustionRatio || 0) - (a.exhaustionRatio || 0));
noCensus.sort((a, b) => b.committed - a.committed);

const ratios = withCensus.map(d => d.exhaustionRatio).filter(r => r !== null);
const above025 = ratios.filter(r => r >= EXHAUSTION_THRESHOLD).length;
const above050 = ratios.filter(r => r >= EXHAUSTION_HARD_CAP).length;
const median = ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)] : 0;
const max = ratios.length > 0 ? ratios[0] : 0;

console.log('\n' + '='.repeat(70));
console.log('  PER-MUNICIPALITY EXHAUSTION — RS (municipalities WITH census data)');
console.log('='.repeat(70));
console.log(`  Municipalities with census data: ${withCensus.length}`);
console.log(`  Municipalities with ZERO census: ${noCensus.length}`);
console.log(`  Above EXHAUSTION_THRESHOLD (0.25): ${above025}`);
console.log(`  Above EXHAUSTION_HARD_CAP (0.50): ${above050}`);
console.log(`  Median exhaustion ratio: ${median.toFixed(4)}`);
console.log(`  Max exhaustion ratio: ${max.toFixed(4)}`);

const header = `  ${'Municipality'.padEnd(28)} ${'Census'.padStart(8)} ${'MilAge'.padStart(8)} ${'Commit'.padStart(8)} ${'Exhaust'.padStart(8)} ${'Avail'.padStart(8)} ${'Ratio'.padStart(8)} ${'Status'.padStart(12)}`;

console.log(`\n  --- TOP 20 MOST EXHAUSTED RS MUNICIPALITIES (with census) ---`);
console.log(header);
for (const d of withCensus.slice(0, 20)) {
    const status = d.exhaustionRatio >= EXHAUSTION_HARD_CAP ? 'HARD_CAP'
        : d.exhaustionRatio >= EXHAUSTION_THRESHOLD ? 'HALF_RATE'
        : 'NORMAL';
    console.log(`  ${d.munId.padEnd(28)} ${d.censusEligible.toString().padStart(8)} ${d.milAgeMales.toString().padStart(8)} ${d.committed.toString().padStart(8)} ${d.exhausted.toString().padStart(8)} ${d.available.toString().padStart(8)} ${d.exhaustionRatio.toFixed(4).padStart(8)} ${status.padStart(12)}`);
}

console.log(`\n  --- BOTTOM 20 LEAST EXHAUSTED RS MUNICIPALITIES (with census) ---`);
console.log(header);
for (const d of withCensus.slice(-20).reverse()) {
    const status = d.exhaustionRatio >= EXHAUSTION_HARD_CAP ? 'HARD_CAP'
        : d.exhaustionRatio >= EXHAUSTION_THRESHOLD ? 'HALF_RATE'
        : 'NORMAL';
    console.log(`  ${d.munId.padEnd(28)} ${d.censusEligible.toString().padStart(8)} ${d.milAgeMales.toString().padStart(8)} ${d.committed.toString().padStart(8)} ${d.exhausted.toString().padStart(8)} ${d.available.toString().padStart(8)} ${d.exhaustionRatio.toFixed(4).padStart(8)} ${status.padStart(12)}`);
}

if (noCensus.length > 0) {
    console.log(`\n  --- RS MUNICIPALITIES WITH ZERO CENSUS (top 20 by committed) ---`);
    console.log(`  These bypass exhaustion entirely! milAgeMales=max(1,0)=1, ratio is astronomical but...`);
    console.log(`  Actually: getEligiblePopulationCount returns 0 → censusEligible=0 → the function skips.`);
    console.log(`  Wait — in ongoing_mobilization, censusEligible <= 0 causes 'continue' (skip mob).`);
    console.log(`  So zero-census municipalities get ZERO ongoing mobilization.`);
    console.log(`  But they still have committed/exhausted from initial pool seeding or reinforcement.`);
    const h2 = `  ${'Municipality'.padEnd(28)} ${'Commit'.padStart(8)} ${'Exhaust'.padStart(8)} ${'Avail'.padStart(8)}`;
    console.log(h2);
    for (const d of noCensus.slice(0, 20)) {
        if (d.committed === 0 && d.exhausted === 0 && d.available === 0) continue;
        console.log(`  ${d.munId.padEnd(28)} ${d.committed.toString().padStart(8)} ${d.exhausted.toString().padStart(8)} ${d.available.toString().padStart(8)}`);
    }
}

// ─── 5. Demographic math ────────────────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('  DEMOGRAPHIC MATH CHECK — RS');
console.log('='.repeat(70));
const rsPersonnel = factionPers['RS'] || 0;
console.log(`  Total Serb census (RS-pool muns with data): ${totalSerbPop.toLocaleString()}`);
console.log(`  Total military-age males (x0.28): ${totalSerbMilAge.toLocaleString()}`);
console.log(`  Active RS troops at w104: ${rsPersonnel.toLocaleString()}`);
console.log(`  % of mil-age males under arms: ${((rsPersonnel / totalSerbMilAge) * 100).toFixed(1)}%`);
console.log(`  Historical VRS peak: ~26-29% of mil-age males`);
console.log(`  Pool committed: ${totalRsCommitted.toLocaleString()}`);
console.log(`  Pool exhausted: ${totalRsExhausted.toLocaleString()}`);
console.log(`  Pool available: ${totalRsAvail.toLocaleString()}`);
console.log(`  Aggregate exhaustion ratio (committed+exhausted)/milAge: ${((totalRsCommitted + totalRsExhausted) / totalSerbMilAge).toFixed(4)}`);

// ─── 6. Gap analysis ────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('  GAP ANALYSIS: where did the extra troops come from?');
console.log('='.repeat(70));
console.log(`  Active personnel: ${rsPersonnel.toLocaleString()}`);
console.log(`  Pool committed (drawn from pools): ${totalRsCommitted.toLocaleString()}`);
console.log(`  Strategic reserve: ${(Number(reserves['RS']) || 0).toLocaleString()}`);
console.log(`  Gap (active - committed - reserve): ${(rsPersonnel - totalRsCommitted - (Number(reserves['RS']) || 0)).toLocaleString()}`);
console.log(`  This gap = initial formation personnel that was never drawn from pools`);
console.log(`  (OOB-seeded brigades start with personnel but no pool commitment).`);

// ─── 7. Mobilization flow estimate at w104 ──────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('  MOBILIZATION FLOW AT w104 (per turn estimate)');
console.log('='.repeat(70));

const BASE_MOB_RATE = 0.003;
const RS_MOB_SCALE = 0.04;
const RS_SURGE_W104 = 0.8;

let totalMob = 0, fullRate = 0, halfRate = 0, hardCapped = 0, zeroCensusCount = 0;
for (const d of rsMunData) {
    if (d.censusEligible <= 0) { zeroCensusCount++; continue; }
    if (d.exhaustionRatio >= EXHAUSTION_HARD_CAP) { hardCapped++; continue; }
    const exhMult = d.exhaustionRatio >= EXHAUSTION_THRESHOLD ? 0.5 : 1.0;
    if (exhMult === 0.5) halfRate++;
    else fullRate++;
    const raw = d.censusEligible * BASE_MOB_RATE * RS_MOB_SCALE * RS_SURGE_W104 * exhMult;
    totalMob += Math.min(Math.floor(raw), 300);
}

console.log(`  Full-rate municipalities: ${fullRate}`);
console.log(`  Half-rate municipalities: ${halfRate}`);
console.log(`  Hard-capped municipalities: ${hardCapped}`);
console.log(`  Zero-census municipalities (no mob): ${zeroCensusCount}`);
console.log(`  Total RS mobilization per turn at w104: ~${totalMob.toLocaleString()}`);

// ─── 8. pool.available leak analysis ─────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('  POOL.AVAILABLE LEAK ANALYSIS');
console.log('='.repeat(70));

// If pool.available were counted in exhaustion:
let wouldBe025 = 0, wouldBe050 = 0;
for (const d of withCensus) {
    const hypothRatio = (d.committed + d.exhausted + d.available) / d.milAgeMales;
    if (hypothRatio >= EXHAUSTION_HARD_CAP) wouldBe050++;
    else if (hypothRatio >= EXHAUSTION_THRESHOLD) wouldBe025++;
}
console.log(`  Current: ${above025} above threshold, ${above050} above hard cap`);
console.log(`  If pool.available counted: ${wouldBe025} above threshold, ${wouldBe050} above hard cap`);
console.log(`  Total RS pool.available (uncounted in exhaustion): ${totalRsAvail.toLocaleString()}`);

// ─── 9. Casualty feedback check ─────────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('  CASUALTY FEEDBACK CHECK');
console.log('='.repeat(70));
console.log(`  Total RS pool.exhausted: ${totalRsExhausted.toLocaleString()}`);
console.log(`  Expected: ~75% of permanent combat losses (killed + MIA)`);

// Check origin_mun on brigades
let withOrigin = 0, withoutOrigin = 0;
for (const [id, f] of Object.entries(formations)) {
    if (f && f.faction === 'RS' && f.kind === 'brigade') {
        if (f.origin_mun) withOrigin++;
        else withoutOrigin++;
    }
}
console.log(`  RS brigades with origin_mun: ${withOrigin}`);
console.log(`  RS brigades WITHOUT origin_mun: ${withoutOrigin}`);

// ─── 10. Initial vs Final comparison ────────────────────────────────────────

const initialPath = path.join(resolvedDir, 'initial_save.json');
if (fs.existsSync(initialPath)) {
    const init = JSON.parse(fs.readFileSync(initialPath, 'utf8'));
    const iPools = init.military?.militia_pools || {};
    let iAvail = 0, iCommit = 0, iExhaust = 0, iPers = 0;
    for (const key of Object.keys(iPools)) {
        const p = iPools[key];
        if (p.faction === 'RS') {
            iAvail += p.available || 0;
            iCommit += p.committed || 0;
            iExhaust += p.exhausted || 0;
        }
    }
    for (const [id, f] of Object.entries(init.military?.formations || {})) {
        if (f && f.faction === 'RS') iPers += f.personnel || 0;
    }
    console.log('\n' + '='.repeat(70));
    console.log('  INITIAL (w0) vs FINAL (w104) — RS');
    console.log('='.repeat(70));
    console.log(`  Initial: avail=${iAvail.toLocaleString()}, commit=${iCommit.toLocaleString()}, exhaust=${iExhaust.toLocaleString()}, pers=${iPers.toLocaleString()}`);
    console.log(`  Final:   avail=${totalRsAvail.toLocaleString()}, commit=${totalRsCommitted.toLocaleString()}, exhaust=${totalRsExhausted.toLocaleString()}, pers=${rsPersonnel.toLocaleString()}`);
    console.log(`  Delta:   avail=${(totalRsAvail - iAvail).toLocaleString()}, commit=${(totalRsCommitted - iCommit).toLocaleString()}, exhaust=${(totalRsExhausted - iExhaust).toLocaleString()}, pers=${(rsPersonnel - iPers).toLocaleString()}`);
    console.log(`  Personnel growth: ${iPers.toLocaleString()} -> ${rsPersonnel.toLocaleString()} (+${(rsPersonnel - iPers).toLocaleString()}, +${((rsPersonnel - iPers) / iPers * 100).toFixed(1)}%)`);
}

// ─── 11. Root cause summary ──────────────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('  ROOT CAUSE SUMMARY');
console.log('='.repeat(70));
console.log(`
  1. EXHAUSTION RATIO DENOMINATOR:
     exhaustionRatio = (committed + exhausted) / milAgeMales
     pool.available is NOT counted. This means municipalities can
     mobilize indefinitely into pool.available without hitting the cap.
     Strategic reserve sweeps excess pool.available but that manpower
     is also invisible to exhaustion.

  2. MAGNITUDE OF THE LEAK:
     RS pool.available at w104: ${totalRsAvail.toLocaleString()}
     RS strategic reserve: ${(Number(reserves['RS']) || 0).toLocaleString()}
     Total "invisible" manpower: ${(totalRsAvail + (Number(reserves['RS']) || 0)).toLocaleString()}

  3. INITIAL BRIGADE PERSONNEL NOT IN COMMITTED:
     OOB-seeded brigades start with personnel (e.g. 1500-2000 each)
     but this is never drawn from pools — pool.committed doesn't
     reflect it. The gap between active personnel and committed
     shows this: ${(rsPersonnel - totalRsCommitted).toLocaleString()} troops exist that
     were never "committed" from any pool.

  4. LOW CASUALTY FEEDBACK:
     RS pool.exhausted = ${totalRsExhausted.toLocaleString()}
     At 75% feedback rate, this implies only ~${Math.round(totalRsExhausted / 0.75).toLocaleString()} permanent
     RS casualties over 104 weeks. If RS had 83 brigades in heavy
     combat, this seems very low.

  RECOMMENDED FIXES:
  A. Include pool.available in exhaustion numerator:
     exhaustionRatio = (committed + exhausted + available) / milAgeMales
     "How much of your demographic base has been TAPPED?"

  B. Count initial brigade personnel as committed:
     When OOB brigades are created, increment their home pool's
     committed by their starting personnel. Currently this gap
     means ~${(rsPersonnel - totalRsCommitted).toLocaleString()} RS troops are invisible to exhaustion.

  C. Investigate low casualty feedback:
     ${totalRsExhausted.toLocaleString()} exhausted suggests either (a) few permanent losses,
     or (b) applyCasualtyPoolExhaustion is not being called for
     all battle types (e.g. frontline attrition may not feed back).
`);
