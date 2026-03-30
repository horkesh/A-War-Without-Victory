# Life Lessons — Calibration, OOB, Combat, Bot AI
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

### [Calibration] Calibration % means nothing if reached through broken mechanics — GOLDEN RULE (2026-03-26) — NEW
- **Context**: 91.7% calibration was inflated by: Drina Corps besieging Sarajevo (wrong corps assignment), brigades silently dropped from sector assignment, brigades >8 hops from front permanently stuck in rear. Fixing all four bugs dropped calibration to 91.4% but made the simulation mechanically correct.
- **Wrong approach**: Hesitating on mechanically correct fixes because they regress calibration %. Offering to revert correct fixes because of -0.3pp. Treating calibration as a decision criterion rather than an indicator.
- **Right approach**: Fix mechanics first. The number follows. A high calibration % with broken mechanics is a lie; a lower % with correct mechanics is a foundation.
- **Do instead**: When a fix is mechanically correct, apply it unconditionally. Report calibration as an indicator, never as a reason to hesitate. The question is always "are the mechanics right?" — if yes, commit.

### [Calibration] When a threshold system isn't biting, check the numerator accounting before tuning the threshold (2026-03-25) — NEW
- **Context**: RS grew from 99k at w40 to 149k at w104 (target 110-120k). Exhaustion thresholds (0.25 half-rate, 0.50 hard cap) weren't constraining growth. Four attempts to fix via constant tuning (displacement reduction, casualty feedback 25%→75%, surge curves) had near-zero effect.
- **Wrong approach**: Tuning constants (feedback rates, surge curves, thresholds) when the system receiving the data has accounting bugs. Three bugs meant the exhaustion numerator tracked only ~60% of actual demographic commitment: pool.available excluded, initial OOB troops invisible, strategic reserve sweeps leaked.
- **Right approach**: Investigate WHY the threshold isn't binding. Diagnostic script showed 86/110 RS municipalities below 0.25 with median ratio 0.08. The thresholds were correct — the data was wrong. Fix the accounting first, THEN tune constants if still needed.
- **Do instead**: Before tuning any threshold/cap system, write a diagnostic that shows the distribution of values relative to the threshold. If most values are far below the threshold, the problem is upstream (data quality), not the threshold itself.


### [Calibration] One change per run + mandatory insanity check — VIOLATED 2026-03-15
- **Violation evidence**: n747 (`56f2ae0`) bundled FOUR independent fixes (offensive_support trigger, auto-join op, force-assign sector, bot AI corps lookup) into a single calibration run. When the first three produced 0 elite battles (n746), attribution was ambiguous. Debug logging after n746 identified Change 4 as the sole blocker — if each fix had been a separate run, identification would have been immediate.
- **Cost**: One wasted calibration cycle (n746). No regression, but delayed root-cause identification.

### [Calibration] Always compute per-turn per-municipality mobilization and compare to attrition rate — "the number looks small" is the clue (2026-03-24) — NEW
- **Context**: FACTION_MOBILIZATION_SCALE.RBiH=0.02 produced only ~3 troops/turn for Stari Grad (39k Bosniaks). Frontline attrition drained ~9/turn. Net: brigades lost ~6/turn and hit dissolution floor after 40 weeks. Zero-battle brigades ended at 146 personnel — drained purely by passive attrition with no reinforcement.
- **Wrong approach**: Setting mobilization scale based on faction-level totals (targeting 120-130k) without checking per-municipality flow. The 0.02 scale hit the right global number but created municipality-level starvation — Sarajevo brigades couldn't sustain themselves while other RBiH corps had surplus.
- **Right approach**: For any mobilization scale change, compute: `per_mun_mobilized = census * BASE_RATE * SCALE * surge`. If < attrition drain per turn (~5-10 for a front-line mun), the brigades will die. Also run `tools/diagnose_run.cjs` and check "combat ineffective concentration" per corps.
- **Do instead**: When tuning mobilization, always check the municipality-level flow, not just faction totals. A scale that produces the right global number can still starve individual municipalities.

### [Calibration] Area-weighted % is blind to siege/positional bugs — brigades can be 80km from home with 92.6% calibration (2026-03-24) — NEW
- **Context**: SRK Sarajevo siege was completely non-functional after w5. Three brigades drifted from Sarajevo to Gorazde (~80km south). Siege-ring sector had zero brigades, zero density, zero eligible attackers for 35 consecutive weeks. Calibration stayed at 92.6% because Sarajevo OSIDs are RBiH in both painted and sim — the siege doesn't flip territory.
- **Wrong approach**: Relying solely on OSID control match % and faction territory shares to validate sim health. These metrics measure WHERE territory is, not WHETHER key military operations are happening. A corps can have zero combat activity for 35 weeks and the calibration number doesn't move.
- **Right approach**: Supplement area-weighted % with positional health checks: (1) siege health — besieging corps must have N+ brigades near siege target, (2) brigade drift — flag brigades > M hops from home with no active operation, (3) corps activity — flag corps with zero eligible attackers for > K consecutive weeks, (4) sector coverage — no sector with > 5 front edges should have zero brigades.
- **Do instead**: After every calibration run, check not just "are the right OSIDs the right color" but "are the right brigades in the right places doing the right things." Add siege health and drift checks to `compare_painted_vs_sim.cjs`. A passing calibration % with a dead siege is worse than a failing calibration % that tells you something is wrong.

### [Calibration] Offensive territory gains cascade through adjacency — halve expected gains (2026-03-24) — NEW
- **Context**: Plan estimated +2-3pp from offensive paramilitaries sweeping Drina valley. Actual: +0.6pp. The 28 paramilitary captures gave VRS adjacency to 10+ additional OSIDs that regular combat then captured (over-capture). The net was modest because over-capture offset correct captures.
- **Wrong approach**: Estimating linear impact (N OSIDs captured = N OSIDs closer to painted). Territory gains are nonlinear — each capture changes the adjacency graph for regular combat.
- **Right approach**: When estimating calibration impact of territory-changing systems, halve the expected gain and budget for cascade over-capture.
- **Do instead**: Before implementing a territory-changing system, count how many NEW hostile OSIDs become adjacent after the system runs. That's the cascade risk. If cascade OSIDs > direct captures, the system will over-capture unless constrained.

### [Calibration] Coupled anchors need simultaneous fixes — Zepa/Teocak seesaw (2026-03-21) — NEW
- **Context**: Zepa enclave and Teocak corridor are inversely coupled through VRS Drina Corps force allocation. Fixing Zepa alone (285th bump to 1500) blocked Teocak — VRS stayed north and 2nd Romanija blocked rastosnica_2. Fixing Teocak alone (Op Teocak) worked only when Zepa was weak (VRS pushed south, leaving north open).
- **Wrong approach**: Fixing one anchor at a time, testing, seeing the other break, then trying to find a Goldilocks value. This wasted 4 calibration runs. The coupling was structural — no single-variable solution existed.
- **Right approach**: When two anchors are coupled through the same corps' force allocation, fix BOTH simultaneously. Strengthen the defense (OOB bump) AND strengthen the offense (op improvement). Test the combination, not individual changes.
- **Do instead**: Before changing any enclave OOB or corridor operation, check: is there another anchor in the same corps' area that could be affected? If yes, plan both fixes together. Known coupled pairs: Zepa<>Teocak (Drina Corps), Visegrad<>Rogatica (Herzegovina Corps).

### [Calibration] NEVER add a painted-opposite-faction OSID as an operation objective (2026-03-21) — NEW
- **Context**: Added `vitinica_2` (painted RBiH) as an Op Drina objective to maintain 5-objective tempo after micro-OSID merge. VRS captured it at w6 with ratio 29.91. vitinica_2 is part of the Sapna corridor connecting Teocak to Tuzla — a critical lifeline that must stay RBiH throughout the war. Also tried `djulici` (painted RS, valid) but that cascaded into Zepa enclave falling.
- **Wrong approach**: Adding objectives without checking `painted_control_jan1993.json`. Assuming objectives are just tempo placeholders that won't be reached. Not verifying corridor anchors after every op change.
- **Right approach**: Before adding ANY OSID to an operation, check its painted target. If it's painted as the DEFENDING faction, it MUST NOT be an objective — the operation will capture it. Use `node -e "console.log(require('./data/source/calibration/painted_control_jan1993.json').by_settlement_id['op:...:...'])"`.
- **Do instead**: When replacing merged objectives, ONLY use OSIDs whose painted target matches the attacking faction. Always check: vitinica_2 (RBiH), rastosnica_2 (RBiH) = never RS objectives. After any Op Drina change, verify: vitinica_2 RBiH, Teocak connected, Zepa RBiH.

### [Calibration] Data merges have operation-tempo butterfly effects — always verify corridor connectivity (2026-03-21) — NEW
- **Context**: Merging 32 micro-OSIDs (< 1 km2) removed `drinjaca` and `paljevici` from Op Drina Zvornik Sweep (5->3 objectives). The operation completed faster, freeing VRS brigades earlier. Those brigades took `rastosnica_2` before ARBiH Op Teocak could fire (w25), cutting the Teocak-Tuzla corridor — a historically critical lifeline.
- **Wrong approach**: Removing operation objectives without checking what the freed brigades would do. Assuming a data-only change (OSID merge) wouldn't affect simulation behavior. Not diffing yesterday's run against today's run to identify regressions.
- **Right approach**: After any OSID merge, check ALL operations that referenced merged OSIDs. Replace removed objectives with same-area alternatives to maintain operation tempo. After running, verify corridor connectivity (BFS from enclaves/pockets to heartland). Compare with previous run's control map.
- **Do instead**: When removing OSIDs from operations, add replacement objectives of equal count. After calibration runs, check: (1) Teocak->Tuzla, (2) Gorazde connectivity, (3) Srebrenica enclave size, (4) Bihac pocket integrity. Use `bfsComponent()` checks, not visual inspection.

### [Calibration] Operation objective reorder causes 200km butterfly effects — always compare full territory diff (2026-03-21) — NEW
- **Context**: Reordering Op Visegrad objectives SE-first (toward Rogatica) caused RS to take `kalesija_selo` and `seher_2` in Kalesija municipality — 200 km from Visegrad. This encircled 3 ARBiH brigades at Djulici/Vitinica (historically connected). The reorder also shifted 12 OSIDs across Rogatica, Srebrenica, and Pale.
- **Wrong approach**: Evaluating op changes by local effect only (Visegrad captures). Not checking distant consequences. Committing based on aggregate metrics (area-weighted %) without checking structural correctness (corridor integrity, encirclement).
- **Right approach**: After ANY operation change, run full territory diff (`n986 vs n983` style comparison). Check for gains AND losses. Verify no RBiH pocket is newly encircled. A 0.3pp improvement that creates an ahistorical encirclement is WORSE than no change.
- **Do instead**: After calibration runs, always run: (1) territory diff vs previous, (2) BFS connectivity for known corridors, (3) check for new 1-OSID pockets. Never commit based on aggregate % alone.

### [Calibration] Always diff yesterday's run before investigating a regression (2026-03-21) — NEW
- **Context**: Teocak was connected yesterday, cut off today. Instead of immediately diffing yesterday's code and run output against today's, time was spent investigating reactive defense, OOB, and supply systems — none of which caused the issue. The actual cause (Op Drina objective count change from micro-OSID merge) was found only after finally bisecting the commits.
- **Wrong approach**: Theorizing about root causes and testing hypotheses without first establishing exactly WHAT changed between the working and broken states.
- **Right approach**: `git checkout <yesterday_commit> -- <files>; npm run sim:scenario:run:40w; diff`. Compare the territory output field by field. The diff immediately shows which OSIDs flipped. Then bisect commits to find which change caused it.
- **Do instead**: When a previously-working feature breaks, FIRST run yesterday's code and compare output. THEN bisect commits. NEVER theorize before establishing the diff. The bisect will tell you exactly which commit broke it.

### [Calibration] Graz Accords cold front check must exclude mixed-opponent sectors (2026-03-21) — NEW
- **Context**: `isSectorColdFront()` checked if `opposing_factions.includes('HRHB')` — but SRK sectors face both HRHB (Kiseljak pocket) and RBiH (Sarajevo enclave). All 5 SRK sectors were forced to `screening` stance (0x entrenchment, 0.5x reactive defense) for the entire war.
- **Wrong approach**: Checking if ANY opponent is the truce partner. A sector facing RS<>HRHB+RBiH is an active combat zone that happens to also border the truce partner.
- **Right approach**: Cold front only when the sector's ONLY opponents are the truce pair. `hasNonTruceFoe` guard.
- **Do instead**: When implementing faction-pair mechanics (truces, alliances), always check whether a third faction is also present. Two-way mechanics applied to three-way contact zones produce false positives.

### [Calibration] Fixing one faction cascades to all others (2026-03-08)
- **Context**: HRHB was taking 6.3k KIA from phantom attrition on cold (Graz Accords) fronts where no combat should occur.
- **Wrong approach**: Fixing HRHB attrition in isolation and expecting other factions to stay stable. After the fix, HRHB was suddenly too healthy, which changed territorial dynamics, which changed RBiH mobilization pressure.
- **Right approach**: Treat faction calibration as a system — fixing HRHB required HRHB pool scale 1.60->1.05 AND RBiH pool scale 0.18->0.25 to maintain equilibrium. All three factions must be re-verified after any single-faction fix.
- **Do instead**: After fixing any faction-specific bug, immediately check all three factions' troop strength, KIA, and territorial outcomes. Budget time for at least one cascade recalibration run.

### [Calibration] Data problems masquerade as engine bugs (2026-03-07)
- **Context**: 84.2% calibration plateau. Combat loop looked broken — VRS wasn't capturing historically-held territory.
- **Wrong approach**: Debugging the combat resolution engine, checking morale, checking attack thresholds. The engine was working correctly — VRS operations simply weren't targeting the right OSIDs.
- **Right approach**: Pre-planned operation target chains in `pre_planned_operations.ts` were missing key OSIDs (Zvornik corridor, Brcko corridor). Adding the correct targets was a data change, not an engine fix.
- **Do instead**: When calibration hits a plateau, check whether operations are targeting the right places before debugging why combat isn't working. Use `weekly_report.jsonl` to trace what was attacked, what was defended, and what was ignored.

### [Calibration] Test override blocks in isolation (2026-03-07)
- **Context**: Calibration overrides interact in unexpected ways. Adding 10+ HRHB cell overrides across multiple regions caused cascading regressions (POSAVINA_NE -9.9pp, SARAJEVO -9.3pp).
- **Wrong approach**: Bulk-adding overrides across regions in one change. Each override shifts force balance, supply lines, and bot targeting — effects compound non-linearly.
- **Right approach**: Add overrides by isolated geographic cluster (one region at a time). Verify each cluster's impact before adding the next. Some overrides are "load-bearing" — removing them causes net losses even though they look wrong individually.
- **Do instead**: Add override changes one cluster at a time, run calibration between each, and measure delta. If a single override causes >1pp regression elsewhere, investigate before adding more.

### [Calibration] One change per run + mandatory insanity check (2026-03-11, updated from 2026-03-10)
- **Context**: n500 bundled three structural changes — attribution impossible when defense collapsed. Separately, n587 insanity check found morale-0 zombie brigades and 50:1 casualty ratios that pure metrics (area%, benchmarks) never caught. Earlier, "brigades idling in deep rear" (#1) and "83% catastrophic attacks from posture bug" (#2) went undetected for multiple runs because nobody looked at the actual save state.
- **Wrong approach**: (1) Bundling multiple changes into one run. (2) Trusting area% and benchmark pass/fail as sufficient evidence of healthy behavior. Metrics can pass while the sim produces absurdities.
- **Right approach**: One change -> one fresh 40w run -> comparison tool -> **/war-or-game insanity check**. The insanity check is NOT optional — it catches behavioral bugs that metrics miss. Check: brigade states (morale-0? stuck in rear? combat-ineffective attacking?), casualty ratios (>20:1?), tempo (zero-battle weeks?), troop strengths, equipment (`composition` field, NOT `equipment`).
- **Do instead**: After every calibration run, invoke /war-or-game or manually inspect the save for absurdities. Record both metrics AND insanity-check findings in CALIBRATION_MASTER.md. If you skip the insanity check, you will eventually ship a run with a fundamental behavioral bug hidden behind passing benchmarks.

### [Calibration] Constants need inline range documentation (2026-03-06)
- **Context**: UN airdrops were set to 15 pts/turn — silently dominating RBiH's entire supply system. Only discovered during the n159 audit when drilling into a cascade failure.
- **Wrong approach**: Treating constants as opaque tuning levers. No documentation of expected value range or system impact.
- **Right approach**: Constants get inline docs noting their expected range and which subsystems they dominate. When AIRDROP_MAX_SUPPLY_PER_TURN was capped 15->3, the entire RBiH supply flow changed.
- **Do instead**: When adding a constant, document: expected range, what happens at min/max, and which systems it dominates. A buried constant can be the true control knob while its "documented" parameters do nothing.

### [Calibration] Measure secondary region deltas, not just the target (2026-03-07)
- **Context**: n237 — adding HRHB overrides caused POSAVINA_NE to drop -9.9pp and SARAJEVO -9.3pp. The HRHB region improved; two others regressed.
- **Wrong approach**: Only checking the target region's delta after a change.
- **Right approach**: After every override or pool change, check 2-3 secondary regions that share a border or supply line with the changed area. Faction changes trigger cascades: weaker HRHB -> VRS easier wins -> different front geometry -> different casualty distribution.
- **Do instead**: Always run a full-region ATH diff after any calibration change, not just the target region.

### [Calibration] Supply is a three-faction cascade — change one, verify all (2026-03-06)
- **Context**: PATRON_AID_SCALE at 6 meant RBiH felt near-zero embargo. Raising it to 12 broke HRHB. Each faction's supply formula interacts.
- **Wrong approach**: Tuning one faction's supply constants and checking only that faction's outcome.
- **Right approach**: Supply cascade validation: RBiH (UN airdrops + patron) -> RS (self-sufficient + patron) -> HRHB (Croatian pipeline + embargo). All three must be checked after any supply constant change.
- **Do instead**: Have a supply validation checklist: after any supply change, check all three factions' reserve levels, run a 40w scenario, verify no faction hits critical unexpectedly.

### [Calibration] Confidence thresholds should be named constants, not magic numbers (2026-03-05)
- **Context**: Sector intelligence used raw float comparisons throughout GUI and bot code. Changing a threshold required finding every comparison site.
- **Wrong approach**: Inline threshold comparisons: `if (confidence > 0.5)`. Each site independently defines "good enough."
- **Right approach**: `sector_intel_constants.ts` defines named tiers: CONFIDENCE_ROUGH_STRENGTH=0.2, CONFIDENCE_FRONT_BRIGADES=0.3, CONFIDENCE_FULL_STRENGTH=0.5, CONFIDENCE_DEEP_INTEL=0.8. Every consumer uses the same gates.
- **Do instead**: Any threshold that gates information or behavior should be a named constant. If you have two float comparisons that look similar but use slightly different values, they're silently diverging.

### [Calibration] Home affinity in assignment cannot be a primary sort key (2026-03-17) — NEW
- **Evidence**: Tried 4 approaches to fix 3rd Corps displacement (Tesanj brigades at Gornji Vakuf): primary sort by home (n843), 0.5x distance (n844), pre-pass all (n845), pre-pass rear-only (n846). ALL regressed calibration from 5/6 to 4/6 benchmarks. The -2 hop discount (n842 baseline) is the sweet spot.
- **Root cause**: Pulling brigades home weakens active fronts. The home-distance effectiveness mechanic already penalizes displacement (floor 0.70), so the sim self-corrects over time. Forcing home assignment disrupts the balance.
- **Rule**: Brigade displacement is a STRUCTURAL issue (operations move units, garrison-fill reassigns by proximity). Fix with post-operation return-to-home logic, not assignment algorithm weighting. Never make home affinity a primary sort key in garrison fill.

### [OOB] Home brigades must be strong enough to survive the initial blitz (2026-03-15) — NEW
- **Context**: Gradacac fell to VRS at w23 (PR 19.24 — essentially undefended). The 213th Vitezka started at 550 personnel and was swept at w5 during the VRS blitz, displaced to Doboj, and never returned. Gradacac was never captured historically — the 213th was one of ARBiH's strongest formations. Similarly, the 215th Vitezka at Bijela (700 pers) was overrun at w7.
- **Wrong approach**: Starting brigades at 550-700 personnel and expecting the recruitment pool to reinforce them in time. The VRS blitz hits at w3-w7 with PR 5-19 — brigades need to be combat-capable from turn 0.
- **Right approach**: Brigades defending critical positions (Gradacac, Bijela, Teocak, etc.) must start with enough personnel to absorb the initial blitz (1200-1500 pers). The pool reinforces them AFTER the front stabilizes, not before. Don't use `hold_municipalities` as a substitute for adequate initial strength — a properly manned home brigade holds its position naturally.
- **How to apply**: When reviewing OOB for a position that should hold historically, check: (1) is the home brigade's initial_personnel enough to survive a PR 2-3:1 attack? (2) does the brigade have defense_terrain_bonus appropriate for the terrain? (3) is the brigade available from turn 0 (not gated behind available_from)?

### [OOB] Verify unit identity across sources before treating as separate formations (2026-03-21) — NEW
- **Context**: `rs_rogatica_brigade` and `rs_1st_podrinje` were both in the OOB — same unit (renamed when transferred from SRK to Drina Corps Nov 1992). Phantom brigade inflated Drina strength by 1800 personnel, causing 6pp Drina region error.
- **Do instead**: When OOB has two units with the same home municipality or overlapping area, verify they aren't the same unit under different names. Cross-reference Wikipedia, ICTY, and Balkan Battlegrounds. Unit redesignation on corps transfer was common in VRS.

### [Combat] Flat reserve pooling erases organizational structure (2026-03-13)
- **Context**: The reactive defense model computed `sectorReserves = totalPower - physicalPower` — a single aggregate number for all reserves. The corps spends significant effort on home-municipality affinity assignment (Phase 2a in `classifyBrigadesByTerritory`), positioning brigades where they belong. But in combat, a brigade the corps placed 1 hop from a key point contributed identically to one 8 hops away. The corps's organizational work was invisible to the combat system.
- **Wrong approach**: Pooling all reserves into one number and drawing a fraction. This is simple but erases two critical dimensions: physical distance (how far is the reserve from the fight?) and organizational motivation (is this the brigade's home?). Result: probes are meaningless (same defense everywhere), corps positioning doesn't matter, 74% of front OSIDs that are empty get the same defense as occupied ones in many cases.
- **Right approach**: Per-brigade contribution with distance decay (BFS hops through friendly territory) and home-municipality motivation bonus. Each reserve brigade's contribution = `brigadePower x distanceDecay(hops) x homeBonus`. Casualty distribution uses the same weights — brigades that contributed more to defense absorb more casualties.
- **Do instead**: When a higher-level system (corps) makes positioning decisions, the lower-level system (combat) MUST respect those decisions. If combat treats all reserves as interchangeable, the organizational layer is wasted. Check: does the combat model differentiate between a well-positioned reserve and a distant one? If not, the model is too aggregate.

### [Combat] Defense non-uniformity requires per-entity spatial weighting (2026-03-13)
- **Context**: Defense evolved through three models: (1) `totalPower / edges x density` (n500 — completely uniform), (2) `physicalPower + reactiveResponse` (n524 — two tiers: at-OSID vs flat reactive), (3) REACTIVE_DEFENSE_RATIO=1.5 (n651 — stronger reactive, actually MORE uniform). All are aggregate models that compute a single sector-wide number. Per-entity tracking was never done.
- **Wrong approach**: Computing aggregate defense and dividing equally. This worked for "is the sector defended at all?" but couldn't express "WHERE is it defended strongly vs weakly?" — which is the entire point of probes, concentration, and maneuver.
- **Right approach**: Per-brigade contribution with spatial weighting. Each brigade's contribution depends on BFS distance to the specific attacked OSID. This makes defense genuinely non-uniform: strong near concentrations, weak at the periphery. The extra computation (BFS per brigade per battle, bounded by max 5 hops) is trivial.
- **Do instead**: When a model needs spatial variation within a single organizational unit (sector, region, zone), aggregate division doesn't work. You need per-entity contribution with spatial weighting. Ask: "does the model produce different defense values at different points in the sector?" If the answer is "only two tiers" or "uniform," the model is too coarse.

### [Combat] Personnel ratio trumps multipliers (2026-03-10)
- **Context**: Sarajevo fell despite enclave resilience, urban defense bonus, and terrain multipliers. 4 RBiH brigades (2,000 pers) vs 4 RS brigades (5,100 pers + 160 tanks + 120 artillery). Power ratio 3.5-18x at each OSID.
- **Wrong approach**: Stacking more multipliers on defense (enclave 0.005->0.02, urban 1.5->2.0, tank penalty). Each helped marginally but none could bridge a 5:1 raw personnel + equipment gap. Multiplier-stacking cannot fix a volume problem.
- **Right approach**: Add RAW VOLUME to the defense — enclave garrison power representing organized civilian defense (TDF, Patriotic League, police, volunteers). Formula: `population x 5% x 15% x resilienceMult`. This provides meaningful base defense regardless of how few brigades the OOB seeds.
- **Do instead**: When a power ratio is extreme (>3:1), look for missing volume (troops, militia, civilian defense), not better multipliers. Multipliers scale what exists; if there's not enough to scale, they're useless.

### [Combat] Enclave defense is multi-layered — all layers needed simultaneously (2026-03-10)
- **Context**: Fixing Sarajevo required 5 simultaneous changes, none sufficient alone: supply detection, resilience scaling, urban tank penalty, urban defense, garrison volume.
- **Wrong approach**: Trying each fix in isolation. Resilience scaling alone didn't matter because supply misclassified -> resilience decayed. Urban tank penalty alone didn't matter because personnel ratio was extreme. Each fix addressed one layer of a multi-layer problem.
- **Right approach**: Identify all the layers that should be contributing to defense, verify each is actually functioning, then fix all broken layers together. Test the combined effect.
- **Do instead**: For complex outcomes (city defense, enclave survival), trace EVERY contributing system: supply state -> resilience building -> defense bonus -> equipment penalties -> urban terrain -> garrison volume. If any layer reads wrong, the combined defense collapses.

### [Bot AI] New mechanics competing with bot AI need explicit target exclusion (2026-03-07)
- **Context**: Paramilitary brigades competed with bot AI for undefended rear pocket OSIDs. Bot AI struck immediately; paramilitaries with MARCH_TURNS=2 never captured anything.
- **Wrong approach**: Assume bot AI and new mechanics will naturally share territory. Set MARCH_TURNS and expect the system to work.
- **Right approach**: Bot AI must explicitly exclude paramilitary target OSIDs from its offensive targets. New mechanics that compete for territory must gate the bot's access to that target class.
- **Do instead**: When adding any new mechanic that captures OSIDs, immediately check `generateCorpsDirectives` and `bot_brigade_ai_osid.ts` for conflicts. Add explicit exclusions before wiring the mechanic.

### [Calibration] Sector-coverage defenders must NOT be physically displaced (2026-03-27) — NEW
- **Context**: The 217th ARBiH at Gradacac was "retreated" from a position it never occupied when a remote OSID it was covering flipped. This evacuated Gradacac, allowing RS walk-in.
- **Wrong approach**: Treating all defenders identically in retreat logic regardless of whether they're physically present at the lost OSID.
- **Right approach**: Guard displacement with `isPhysicalDefender` check. Sector-coverage defenders take morale/disruption penalties but stay at their physical location.
- **Do instead**: When writing retreat/displacement logic triggered by OSID loss, always check whether the defending brigade is physically located at the lost OSID or merely providing sector coverage. Only physically-present brigades should be forced to relocate.

### [Calibration] garrison tag pins brigades but operations can still pull them — remove from op if garrison needed (2026-03-27) — NEW
- **Context**: 255th with `garrison:true` was still pulled to Op Teocak staging. Garrison blocks `evaluateSectorMarch` but NOT operation `force_staging`.
- **Wrong approach**: Assuming `garrison:true` prevents all movement. It only prevents sector march.
- **Right approach**: Garrison prevents sector march only. If a brigade must hold a position, also remove it from any operation's brigade list. The garrison tag and operation assignment are independent systems — both must be checked.
- **Do instead**: When a brigade must hold a fixed position, verify it is (1) tagged `garrison:true` AND (2) not listed in any operation's brigade array. Grep for the brigade ID in `pre_planned_operations.ts` and `triggered_operations.ts`. A garrisoned brigade in an op will march to staging when the op fires.

### [Calibration] Probe operations must match sector_attack in all type gates — missing gate silently disables probes (2026-03-27) — NEW
- **Context**: `bot_corps_directives.ts` attack-type gate checked for `sector_attack` but not `probe`. All probe operations were silently excluded from the attack pipeline for the entire war. Battle count was 44; after fix, 62. HRHB attacks went from 0 to 8.
- **Wrong approach**: Adding a new operation type (probe) and only wiring it into the execution path, not the eligibility gates upstream.
- **Right approach**: When adding any new operation type, grep for ALL existing type checks (gates, filters, switch statements) and ensure the new type is included where appropriate.
- **Do instead**: After adding a new op type, run `grep -r "sector_attack" src/` and verify every gate that checks for `sector_attack` also handles the new type. A missing gate is silent — no error, no warning, just zero operations of that type.

### [Calibration] Displaced minority populations should flow to friendly territory pools, not sit stranded in enemy municipalities (2026-03-27) — NEW
- **Context**: Bosniak populations expelled from east Herzegovina accumulated in RS-held municipality pools where no ARBiH brigade could recruit them. 4th Corps had 11.5 personnel/turn supply vs ~3000/turn demand — 2/10 brigades healthy. Rerouting displaced Bosniaks to ARBiH-held municipalities (Mostar, Jablanica, Konjic) fixed the supply-demand mismatch: 9/10 healthy.
- **Wrong approach**: Leaving displaced minority pools in enemy territory. The mobilization system correctly reads per-municipality pools, but if the municipality is enemy-held, those pools are unreachable — a silent resource leak.
- **Right approach**: Displaced minority populations should drain to the nearest friendly-held municipality pool of their faction, modeling refugee flows to safe territory.
- **Do instead**: When reviewing pool diagnostics, check for "stranded pools" — minority faction pools in enemy-held municipalities with no local brigade to recruit them. These are displaced populations that should be rerouted. Use `tools/diagnose_run.cjs` stranded pool check.

### [Calibration] Probes are recon, not campaigns — they should not trigger operation cooldown or double exhaustion (2026-03-28) — NEW
- **Context**: Completed probes set `last_completed_operation` which triggered 5-turn theater cooldown. Additionally, `evaluateOperationProgress` processed probes alongside `advanceSectorOffensives`, causing double exhaustion (+20 instead of +5). Combined: after one probe, corps had +20 exhaustion (near 30 max) and 5-turn cooldown. Corps launched 1-2 probes then went permanently idle.
- **Wrong approach**: Treating probe completion identically to full operation completion in the cooldown and lifecycle systems.
- **Right approach**: `evaluateOperationProgress` skips probe/feint (lifecycle managed by `advanceSectorOffensives`). Probes don't set `last_completed_operation` — they're recon designed to enable the follow-up, not block it.
- **Do instead**: When adding a new operation type, verify it's handled by exactly ONE lifecycle manager and that completion side-effects (cooldown, exhaustion) are appropriate for its weight class.

### [Calibration] Half-implemented bilateral scaling silently inverts ratios — verify both sides of any paired multiplier (2026-03-28) — NEW
- **Context**: `getPowerRatioCasualtyMult()` returned `[attCasMult, defCasMult]`. Both callers used `const [, defCasMult]` — discarding the attacker multiplier. Defenders got power-ratio-scaled casualties; attackers didn't. Result: inverted casualty ratio (0.55 att:def instead of 1.5-3.0).
- **Wrong approach**: Implementing only half of a bilateral system. The empty destructuring slot `[,` made it look intentional.
- **Right approach**: When a function returns paired values (attacker/defender, input/output, min/max), verify BOTH are consumed. An unused return value in a pair is a bug until proven otherwise.
- **Do instead**: After adding any function that returns paired multipliers, grep for all callers and verify both values are captured and applied. Destructuring `[, second]` should be a code smell in combat math.

### [Bot AI] Stale-count reads cause oscillation — always track planned movements (2026-03-16) — NEW
- **Evidence**: `evaluateSectorMarch` in `bot_brigade_eval_front.ts` used `countCorpsBrigadesAtOsid()` to check overstacking. Since all brigades evaluate against the same static state in one pass, 7 brigades at OSID X all see count=7 and all march to OSID Y. Next turn: all 7 at Y, march back to X. Perpetual oscillation.
- **Root cause**: Per-entity evaluation loop reads shared static state without tracking the effects of earlier entities' decisions in the same loop.
- **Rule**: Any per-entity evaluation loop that reads entity counts at locations MUST maintain a running adjustment map (departures/arrivals) so entity N sees the effects of entities 1..N-1's decisions. This applies to: overstacking redistribution, front gap filling, sector march, and any future per-brigade movement evaluation.
- **Fix**: `columnAssignments: Map<Osid, number>` passed through `BrigadeEvaluationContext`, decremented on departure, incremented on arrival, checked before issuing movement orders.

### [Calibration] Forced commitment after probes contradicts the purpose of recon — if intel says "they're stronger," defend (2026-03-29) — NEW
- **Context**: `MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT=2` forced corps to launch full attack after 2 probes regardless of predicted outcome. ARBiH issued 81 offensive orders in 40 weeks (1992) — historically almost entirely defensive. The probe system correctly gathered intel showing VRS superiority, then the forced commitment mechanic said "attack anyway."
- **Wrong approach**: Adding a consecutive probe counter to prevent "infinite probe loops." The counter treats the symptom (probing repeatedly) without addressing why: `getSectorIntelConfidence` returns the mean across all enemy sectors, so probing one sector doesn't raise the mean above threshold.
- **Right approach**: Check freshness per-sector-pair. If a specific enemy sector was recently probed, don't probe it again. After all stale sectors are probed, evaluate the intel. If it says "enemy is stronger," the correct response is "defend" — no forced commitment.
- **Do instead**: Never force a bot to attack when its own intelligence assessment says it will lose. The purpose of recon is to inform the decision, not to create an obligation to act.

### [Calibration] Artificial doctrine gates mask broken emergent decision-making — fix the predictor, not the gate (2026-03-29) — NEW
- **Context**: ARBiH 81 orders in 1992. Initial investigation suggested adding more doctrine overrides (max_attack_share, aggression_modifier, stance restrictions). User corrected: "I don't want artificial coding telling them to be passive. Their bots should emergently know NOT to attack."
- **Wrong approach**: Layering faction-specific doctrine gates, stance restrictions, and attack share caps to artificially suppress attacks. These mask the real problem: the combat predictor allows attacks at ratio 0.7 (predicted stalemate), fog of war gives a flat 15% discount on defender power regardless of intel quality, and counter-attacks bypass the normal decision chain.
- **Right approach**: Fix the evaluation so the bot makes correct decisions emergently. Raise attack threshold to costly_victory (1.0) — faction-neutral. Scale fog with intel confidence — makes probing meaningful. Gate counter-attacks through the predictor. ARBiH in 1992 stops attacking because VRS is stronger, not because a flag says "defensive."
- **Do instead**: When a faction is doing something ahistorical, ask "why does the bot THINK this is a good idea?" before adding gates. If the predictor is wrong, fix the predictor. If the threshold is too lenient, raise it for everyone. Faction-specific overrides are a last resort, not a first response.

### [Process] JNA ghosts for early ops must be topology-verified — adjacent to objectives, not just nearby (2026-03-29) — NEW
- **Context**: Added JNA ghosts to Op Prsten at srednje/podlugovi. They were near Ilijas objectives but NOT adjacent to hotonj (objective 2). Op processes objectives sequentially, got stuck on hotonj (only rs_3rd_sarajevo with 1200 pers, predicts repulsed). 6000 ghost personnel sat idle.
- **Wrong approach**: Placing ghosts at "nearby" RS OSIDs without checking adjacency to EACH sequential objective.
- **Right approach**: For each ghost, verify it is adjacent to at least one early objective in the axis sequence. If the axis processes objectives 1->2->3 and the ghost is only adjacent to objective 5, it will never fight.
- **Do instead**: Before adding a JNA ghost to an op axis, check adjacency via `operational_contact_graph.json`. The ghost's location OSID must share an edge with at least one of the first 3 objectives in the sequence.

### [Calibration] Home recall for line-assigned brigades is catastrophically wrong — BiH brigades routinely deployed far from home (2026-03-29) — NEW
- **Context**: Added FAR_FROM_HOME_LINE_THRESHOLD=5 to allow line-assigned brigades >5 hops from home to be recalled. 59% of RS brigades and 67% of RBiH brigades abandoned their positions simultaneously. n1207 dropped to 85.7%.
- **Wrong approach**: Treating distance-from-home as a signal for misdeployment. In the Bosnian War, territorial brigades were routinely deployed across their corps zone (1KK Banja Luka brigades at Donji Vakuf = normal). The recall conflated "operational deployment" with "drift."
- **Right approach**: The previous behavior (only recalling unassigned/orphaned brigades) was correct. Drift is a problem only for brigades that are NOT assigned to any sector and NOT in any operation. Line-assigned brigades are where the sector system put them — that IS their assignment.
- **Do instead**: Never recall line-assigned brigades based on distance from home. Fix drift through better sector assignment (home-municipality affinity at assignment time), not post-hoc recall.

### [Calibration] JNA ghosts that accelerate early ops cascade through operation queues — verify downstream timing (2026-03-29) — NEW
- **Context**: Added 2 JNA ghosts to Op Prijedor's Sanski Most/Kljuc axes. Prijedor succeeded fully (10/10) and ended 3 turns early. This caused Op Corridor to start early, which injected Op Jajce into the chain, which stalled for 9 turns, which prevented bot AI from organically capturing Jajce. Net: -10pp in Central Bosnia.
- **Wrong approach**: Adding ghosts to an op without checking the downstream queue. 1KK's chain is Prijedor->Corridor->Jajce->Donji Vakuf. Making Prijedor faster cascades through the entire chain.
- **Right approach**: Before adding ghosts to any queued op, check (a) what ops follow in the queue, (b) whether the bot AI was already handling those objectives organically, (c) whether earlier completion shifts timing harmfully.
- **Do instead**: After adding ghosts, run the scenario and diff not just the target region but ALL downstream op regions. Jajce was fine without Prijedor ghosts because bot AI captured it via uncontested occupation at t6-9.

### [Calibration] Paramilitary scope exclusions silently prevent entire regions from being modeled (2026-03-29) — NEW
- **Context**: RS offensive paramilitary scope was hardcoded to Drina valley only. The entire Krajina (Prijedor, Sanski Most, Kljuc) — site of some of the war's most documented ethnic cleansing — was excluded. 6 OSIDs stayed RBiH for 40 weeks with zero defenders because no paramilitary could target them.
- **Wrong approach**: Not checking scope constants when investigating territorial mismatches. The anomaly detector had 26 checks but none compared against painted targets.
- **Right approach**: When territory mismatches persist with zero defenders, check the paramilitary scope constants and the rear pocket cluster size threshold.
- **Do instead**: After adding paramilitaries for a region, verify the scope includes all relevant municipalities. Run the anomaly detector's new undefended_painted_mismatch check (#27) to catch any remaining gaps.

### [Calibration] Slot cap must exclude completed (recovery-phase) ops — counting them starves the pipeline (2026-03-30) — NEW
- **Context**: Fix 1 added a slot cap to `emit.ts buildOperations` to prevent zombie op accumulation. The cap checked `briefing.active_operations.length >= getMaxOperationSlots(n)`. Recovery-phase ops are completed and cooling down — they're still in `active_operations` but no longer consuming real capacity. With cap=1 for a 12-brigade corps, any completed op blocked new op emission for 2-3 turns, creating an 18-week combat drought in n1217.
- **Wrong approach**: Counting all ops in `active_operations` against the cap. Recovery ops are done — they're dead weight in the array, not real competitors for the slot.
- **Right approach**: Filter: `const activeSlotUsers = briefing.active_operations.filter(op => op.phase !== 'recovery')`. Cap applies only to planning + execution phase ops.
- **Do instead**: When implementing any slot/capacity cap on an array that has a lifecycle (planning→execution→recovery→removed), always ask: "which lifecycle phases represent real capacity consumption?" Cap only those phases.

### [Calibration] Implementing a feedback write without a feedback read is half-done — verify the consumer exists (2026-03-30) — NEW
- **Context**: Fix 2 wrote `OperationHistoryEntry` records in `emit.ts buildUpdatedState` so the commander would remember failed objectives. The intent was for `plan.ts selectOpportunityTargets()` to query history and apply a cooldown before re-targeting recently-failed OSIDs. The write was implemented and committed. The read was not. History was inert for the entire n1217 run.
- **Wrong approach**: Implementing the producer of a feedback loop, verifying the data is written, calling it done. The loop only closes when there's a consumer.
- **Right approach**: Before merging any "memory" or "feedback" fix, verify: (a) writer exists, (b) reader exists, (c) reader is reachable on the code path that should benefit. For op_history: `plan.ts selectOpportunityTargets()` must query `briefing.previous_state?.operation_history` and filter targets that appear in recent `osids_lost` entries.
- **Do instead**: When writing a feedback mechanism, immediately search for where it will be read. If the reader doesn't exist yet, either implement it in the same commit or mark the fix as PARTIAL in the ledger.
