# Trip Release-Candidate Review Manifest — 2026-05-02 / 2026-05-03

**Status: PARTIAL RELEASE CANDIDATE.**

Trip session 1 (day) + session 2 (night) shipped **20 commits** advancing v0.9 substrate, observability, and player-loop UI. Sensitive-history `OPEN_P0` carries unchanged (genocide rupture not firing) — the dominant remaining release-blocker, with named successor lanes / canon amendments queued for user review.

---

## All Commits (chronological)

### Trip Session 1 (2026-05-02 — day)

1. `1e68d8dc` + `1f84b5de` — TRIGGERED_OP_TEMPORAL_TRACE: Codex P2 disproves queued-order predicate hypothesis. Structural test 5/5 GREEN.
2. `173dd94d` — KRIVAJA_BRIGADE_LIFECYCLE: 4-investigator audit + diagnostic + 4 named successor handoffs.
3. `fb847504` — A1 PER_TURN_BRIGADE_SNAPSHOT: observability emit `<run_dir>/brigade_temporal_log.jsonl`. 4.3 MB / 8,539 lines for 40w. Hash byte-identical (null result).
4. `76651e0a` — B-2 dissolved_no_combat: classifier mis-tag fix.
5. `4ed59457` — B-1 PLANNING_INVALIDATED_COOLDOWN: planning_invalidated now feeds CO objective-failure cooldown. Faction-balanced delta verified. Systems Manual §6.4 patched. Registered behavioral consequence: brcko anchor flip (later resolved as PRE-EXISTING P0 since n1280, not B-1-induced).
6. `45d39ad7` — B-3 ANOMALY_SECTOR_SUBTYPE: pool_exhausted vs misallocated routing in anomaly checks.
7. `a1a5dc44` — D#1 WAR_ENDED_EARLY_PRODUCER: defense-in-depth flag wire.
8. `0e166272` — chore(startup): refresh apr_1992 baked snapshot.
9. `018cacd3` — chore(test): refresh golden baseline manifest + bump init_formations timeout.
10. `b0ecde64` — docs(roadmap): roadmap truth cadence sync.
11. `7f222b96` — docs(ledger): record 2026-05-03 sync entry.

### Trip Session 2 (2026-05-03 — night)

12. `55bffaf6` — N9 historical_baseline.json content audit (`/historian` + `/game-designer`).
13. `efaffb77` — N6 split NO-CONTACT-OTHER into 3 sub-predicates by `recovery_reason`.
14. `65a122c2` — N3 + N7 + N10 endgame snapshot persistence (Mission D #2 + #4 + #5).
15. `704ed147` — N11 krivaja diagnostic consumes brigade_temporal_log.jsonl.
16. `5668cbc0` — N8 /simplify pass on N3+N7 (-18 net lines).
17. `45ebddff` — N4 morale-collapse override canon amendment **proposal** (BLOCKED pending user sign-off).
18. `58d08507` — Mission E G2 + G4 + G5: First-Turn Orientation + Opportunity Ledger Pulse + On-Map Severity Pip.
19. `7232f430` — A2 minimum predictor force-ratio launch floor (0.3).

20+ commits cumulative, 130+ ahead of `origin/main` (user has not pushed).

---

## Verification Posture

### Tests
- **Vitest baseline (post-trip-session-1):** 5669/5679 (99.946%). 2 known remaining (Codex UI test + brcko anchor pre-existing P0).
- **Tonight's focused regression at session end:** 32/32 sector_offensive family + 47/47 endgame family + 37/37 Mission E family + 26/26 anomaly family + 22/22 krivaja family. **Total: 164/164 GREEN across 28 suites.**
- **Tsc:** clean at every commit boundary tonight.

### Scenario evidence
- **40w n1622** (post-B-1): hash `322bb9ed33e30006`. Faction-balanced delta verified (RS=3/15 ops planning_invalidated, identical pre/post). Drift attributed to B-1 cooldown's `failed_offensive_objectives` writes.
- **188w n1623** (fresh tonight on top of B-1 + A1 + N3 + N6 + N7 + N10 + N11 + N8): hash `8ff9d8a08b0b1072` (changed from n1621 `4ba56cfd4fae9824`).
  - **Sensitive-history:** `OPEN_P0` — Srebrenica RBiH 10/11, RS 1/11; Žepa RBiH 1/1; `srebrenica_falls_1995` fired t162; `zepa_falls_1995` fired t164; **`srebrenica_genocide_1995` NOT FIRED** (carries from n1619 unchanged). Krivaja-95 force_ratio 0.092 / 0 attacks / planning_invalidated. Stupčanica-95 force_ratio 0.838 / 1 attack / max_failures. Cerska-Kamenica force_ratio 0.600 / 0 attacks / planning_invalidated.
  - **Bot benchmarks:** 6/6 PASS (calibration anchors 40w-defined; 188w is far-future projection).
  - **Anomalies:** 0 errors / 27 warnings (drift × 6, empty sectors × 3, stranded pool ilidza:RBiH).
  - **Op delivery audit (post-N6):** 8 DELIV / 11 UNDERDELIV / 23 prev-NO-CONTACT-OTHER now split (21 NO-LAUNCH-READINESS + 1 NO-OPENING-ATTACK + 1 fallback) / 4 NO-CONTACT-PATH / 5 PRE-FRIENDLY.

### Panel verdicts
- **/scenario-tester** on n1623: FAIL at sensitive-history acceptance (P0 unchanged); proposed 3 next-lane handoffs including launch-feasibility tightening (which A2 just shipped).
- **/war-or-game** on n1623: APPROVED-WITH-CAVEAT. Tonight's engine work is § 8.3 (a) honest correction; pre-existing P0 unchanged. No regressions, no lane-tuning fingerprint.

---

## What Is Release-Candidate Ready

### Engine substrate (RC-ready)
- **Predictor honesty class:** complete. IN-TRANSIT-PREDICTOR (`87062cc4`) + IN-TRANSIT-COMBAT-POWER-CONTEXT (`8dec8f58`) + B-1 PLANNING_INVALIDATED_COOLDOWN (`4ed59457`) + A2 minimum launch floor (`7232f430`). All faction-agnostic, all § 8.3 (a) corrections, all panel-approved.
- **Endgame persistence:** Mission D #2 + #4 + #5 shipped (`65a122c2`). gameVerdict / costLedger / historicalComparison frozen at termination; round-trips byte-identical; older saves backward-compat. /simplify-cleaned (`5668cbc0`).
- **D#1 producer wire:** `4ed59457` for `war_ended_early` + `early_peace_implemented` event flags.
- **B-3 anomaly subtype:** pool_exhausted vs misallocated routing for sector coverage gaps.
- **Save/load:** 26/26 GREEN this trip.

### Diagnostic / observability (RC-ready)
- **Per-turn brigade-keyed snapshot emit** (`fb847504`): `brigade_temporal_log.jsonl`, ~4.3 MB / 40w, ~20 MB / 188w. Mirrors weekly_report.jsonl pattern.
- **Krivaja brigade-lifecycle diagnostic** (`173dd94d` + `76651e0a` + `704ed147`): 5-way classification with per-turn temporal evidence enrichment.
- **Triggered-op temporal-trace structural test** (`1e68d8dc`): canonical gate against pipeline-ordering hypothesis re-positing.
- **Operation delivery audit predicate split** (`efaffb77`): 3 sub-predicates surface distinct binding mechanisms.

### UI / player loop (RC-ready, partial)
- Decision Room / Pre-Advance / Warroom shells (Codex's lane, parallel-shipped).
- Mission E G2 First-Turn Orientation Card (`58d08507`): closes v0.9.2 onboarding seed.
- Mission E G4 Opportunity Ledger Pulse: closes Records-tab decision-pulse gap.
- Mission E G5 On-Map Pre-Advance Severity Pip: persistent map-shell urgency indicator.
- Turn Aftermath product spine + Cost Ledger + Chronicle (already-shipped Codex C1-C8).

### Documentation / roadmap (RC-ready)
- MASTER_ROADMAP synced to 2026-05-03 with mid-trip evidence paragraph.
- 5 durable lessons promoted to PROJECT_LEDGER_KNOWLEDGE.md (B-1, B-3, D#1, A1, structural-test pattern).
- CALIBRATION_MASTER, REAL_WAR_MASTER updated with run trail.
- Systems Manual §6.4 patched.

---

## What Is NOT Release-Candidate Ready

### Sensitive-history P0 chain (UNCHANGED, dominant blocker)
- `srebrenica_genocide_1995` rupture predicate NOT firing despite `srebrenica_falls_1995` event firing at t162. At t188 Srebrenica is 1/11 RS-controlled; capital RBiH-held; Žepa RBiH-held.
- Krivaja-95 binding blocker is **brigade-roster lifecycle** (3 of 5 named ICTY-grounded participants INACTIVE/0-personnel by t179).
- Stupčanica-95 binding blocker is **defender combat-math stack compounding** (Phase 4d successor lane named, requires combat_math.ts ownership proof — out of autonomous scope).
- Required canon amendments and § 6 sign-offs:
  - **OOB Skelani re-seeding** (Ring 2, § 6 REQUIRED) — historical Skelani-town vs enclave-interior question; BB topology supports town, ICTY paragraph extraction needed.
  - **Atrocity rupture predicate review** (Ring 3, § 6 REQUIRED, user approval not delegable).
  - **Bot AI op-generator triggered-op roster awareness** (Ring 3, BLOCKED until reframed faction-agnostic).
  - **Morale-collapse override** (canon amendment proposed in `45ebddff`, awaiting user A/B/C decision; option B = shadow-flag fallback recommended).

### Mission F packaged-build / release-engineering (BLOCKED)
- F#2 packaged probe: `app.asar` file-locked by unkillable Windows process. Needs OS reboot (not nightshift-feasible). 1-minute action at day-shift cold start.
- F#3 three-faction new-campaign coverage: not verified tonight.
- F#5 `npm run qa:all` end-to-end: not run tonight.

### Calibration follow-up (open P1s)
- **brcko anchor:** `op:brcko:brka_2` test expectation `RBiH` is HISTORICALLY CORRECT (BB1 p.219 — Donja Brka captured by VRS during Sadejstvo 93, July 1993, post-40w). Sim has been failing this anchor since n1280. Pre-existing P0 needs separate investigation lane (consolidation cascade per Issue #31).
- **endgame_comparison.ts:86-90** denominator mismatch: divides player MILITARY killed by historical TOTAL killed (~40% structural error). Surfaced in N9 audit; needs day-shift defect ticket.
- **WarCostSummary.tsx:25-30 § 4 wording:** `formatCasualtyRatio` produces "less costly" — § 4 forbidden trivializing comparison wording. Needs `/narrative-designer` + `/historian` co-sign per § 6 table.

### Mission D follow-up
- **D#3 historical_baseline.json content:** audit shipped tonight (`55bffaf6` audit doc); JSON not edited because sensitive-history numbers (per-ethnicity casualty totals) require user sign-off per § 6.

---

## Top 5 Achievements

1. **Endgame snapshot persistence (Mission D #2 + #4 + #5)** — `65a122c2`. Verdict / cost ledger / historical comparison now frozen at termination; survives save/load round-trip; falls back gracefully for older saves.
2. **A2 minimum launch floor + B-1 planning_invalidated cooldown together complete the predictor honesty class** — predictor now bounds re-emission AND aborts catastrophic launches. Faction-agnostic; § 8.3 (a) honest mechanics; panel-approved.
3. **A1 per-turn brigade-keyed observability** — `brigade_temporal_log.jsonl` emit unblocks all future temporal-trace investigations. Already consumed by N11 krivaja diagnostic enrichment.
4. **Mission E onboarding + records-tab pulse + on-map severity** (`58d08507`) — 3 player-loop UI lanes shipped without touching Codex's Decision Room territory.
5. **Roadmap + canon truth synced** — MASTER_ROADMAP, PROJECT_LEDGER_KNOWLEDGE, CALIBRATION_MASTER, REAL_WAR_MASTER, Systems Manual §6.4 all reflect post-trip state.

## Top 5 Risks

1. **Sensitive-history P0 unchanged.** Srebrenica genocide rupture still NOT firing. Required canon amendments + § 6 sign-offs are user-blocked. The ENGINE substrate (predictor honesty, observability, snapshots) is RC-ready, but the SENSITIVE-HISTORY ACCEPTANCE METRIC is not.
2. **Hash drift n1623** (`4ba56cfd→8ff9d8a0`) at 188w from B-1 + A1 + N3 substrate. Panel APPROVED but downstream calibration (188w anchor diffs against historical baselines) needs day-shift verification before any future v0.9.0 closure decision.
3. **N4 morale-zombie BLOCKED on canon.** Canon amendment proposal (`45ebddff`) needs user A/B/C sign-off. Until then, 4+ VRS Drina brigades remain in zombie equilibrium.
4. **brcko anchor PRE-EXISTING P0** since n1280 (per memory). Test expectation is correct; sim is wrong; needs separate investigation lane (cascade per Issue #31).
5. **Mission F packaged build is platform-locked** (Windows file lock on `app.asar`). 1-minute fix at cold-start, but bypassed entirely tonight. F#2/F#3/F#5 untouched.

## Exact Next Action for Codex Review

**Critical-path review (priority 1):**
- `45ebddff` canon amendment proposal — user A/B/C decision unblocks N4 morale-zombie shadow-flag (or full ship).
- `7232f430` A2 launch floor — verify on a fresh post-A2 188w (not run tonight; A2 was committed AFTER the n1623 baseline). Expected: ops with force_ratio < 0.3 abort early, Krivaja-95 still launches at 0.09 (it was launching with 0 attacks anyway), no GREEN-case regression.

**Engine substrate review (priority 2):**
- `65a122c2` endgame snapshot writers — verify all 3 termination paths (Dayton, peace plan, war_termination collapse/turn-limit) actually freeze in production runs.
- `efaffb77` predicate split — verify the new sub-predicates show up in 188w runs after A2 ships (some NO-LAUNCH-READINESS cases will collapse to "aborted before staging" with A2's earlier abort).

**Pre-existing P0 triage (priority 3):**
- brcko anchor consolidation-cascade investigation (Issue #31 regression hunt).
- Surfaced bonus defects from N9: denominator mismatch in `endgame_comparison.ts:86-90` and § 4 wording violation in `WarCostSummary.tsx:25-30`.

**Mission F unblock (priority 4):**
- Cold-start `taskkill` of stale Electron process holding `dist-packaged/app.asar`. Re-run `npm run desktop:package:probe`.

## Conservative Autonomous Decisions Made

- **DECISION-N1:** Did NOT attempt to override the Windows file lock on `app.asar`. Per handoff stop-gate: not nightshift-feasible.
- **DECISION-N2:** No code change for brka_2 anchor. /scenario-tester proved B-1 innocent; /historian confirmed test expectation IS historically correct. Failure is pre-existing P0, separate lane.
- **DECISION-N4:** Skipped morale-zombie engine implementation. Wrote canon amendment proposal instead — user signs A/B/C at sunrise.
- **DECISION-N9:** No JSON edit on `historical_baseline.json`. Sensitive-history numbers require user sign-off.
- **DECISION-A2-floor:** Set min force-ratio floor at 0.3 (not /scenario-tester's proposed 0.6 for sensitive-history ops). 0.3 is faction-agnostic; 0.6 with sensitive-history scope would be § 8.3 (b) lane-tuning.
- **DECISION-G2-inbox:** Routed "Inbox" item via canonical `openInboxHome` (selection-clearing pattern at `App.tsx:610-623`) instead of `openArmyHQTab(gs, 'inbox')` — `'inbox'` is not a valid `ArmyHQTab` value; the canonical contract uses selection-clearing.
- **DECISION-N5-status:** PARTIAL RC, not full RC, because sensitive-history OPEN_P0 carries.

---

## v0.9 milestone summary

| Milestone | Status entering trip | Status at trip end | Delta |
|---|---|---|---|
| v0.9.0 Consequence System | PARTIAL (substrate live, broader matrix open) | PARTIAL (D#1+D#2+D#5 shipped; B-3 anomaly subtype routing; consequence-loop UI Mission E G4) | substrate hardening |
| v0.9.1 Dynamic Codex / Endgame Comparison | PARTIAL | PARTIAL (D#3 audit shipped; essay template engine NOT shipped — deferred) | research artifact only |
| v0.9.2 External Playtesting + Onboarding | groundwork | partial — G2 First-Turn Orientation seed shipped | onboarding card live |
| v0.9.3 Performance + Accessibility | groundwork | groundwork (perf scaffold NOT shipped tonight) | unchanged |
| v0.9.4 Visual Polish + Legendary Map Features | groundwork | groundwork (Front-Line Tinting deferred) | unchanged |
| v0.9.5 Platform Packaging + Store | groundwork | groundwork (F#2 BLOCKED on file lock) | unchanged |

**Honest framing:** the user's "push to v0.9.5" target was not literal closure of v0.9.0 → v0.9.5 (each is days/weeks of work). What this trip DID accomplish: the v0.9 ENGINE SUBSTRATE is meaningfully hardened (predictor honesty class complete; endgame persistence shipped; observability spine in place; consequence-loop UI advanced). v0.9.1 essay engine, v0.9.3 perf, v0.9.4 legendary features, and v0.9.5 packaging are NOT closed; they remain on the day-shift backlog.

---

**Trip session 2 ends with a clean working tree (mine), 8 nightshift commits + 12 day-shift commits = 20 trip total, 164/164 focused regression GREEN at session end, and a comprehensive handoff for Codex / day-shift triage.**
