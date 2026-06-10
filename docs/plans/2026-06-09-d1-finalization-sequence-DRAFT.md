# D1 — Calibration-Finalization Re-Floor: Dependency-Ordered Execution Plan

**Status:** **DRAFT — for team / owner ratification.** READ-ONLY prep (task #79). No code / data / scenario / baseline changed. This is the build-ready sequence to execute *when D1 is reached* (after the 0.9.9-beta feature-freeze, per the 1.0 Definition-of-Done). It is NOT an authorization to start.

**Author:** calibration + scenario-tester specialist (scenario-creator-runner-tester).

**What D1 is (from `docs/plans/2026-06-08-v1.0-definition-of-done.md` §D1):** the **single** calibration-finalization pass — the LAST legitimate hash-mover before 1.0. Every calibration-LAST item lands here, one-change-per-run, 188w-before-merge, ending in ONE deliberate re-floor = the **frozen 1.0 baseline**. Nothing calibration-moving merges after it (anything "one more" post-tag is a 1.0.1 patch, not a re-open). D1 is gated by **C1** (CI-enforced 188w + platform-stable structural fingerprint) and ends in the **C3** hash + persisted-schema freeze.

---

## 0. Floor of record (confirm before D1 starts)

- **Authoritative now: 188w 649/712 (91.15%), hash `d311eeac18492683`, anchors 30/30, benchmarks 6/6, 0 critical; 40w `235c61f408dc3d95`; 52w `515e0e07ab32db82`** (`CALIBRATION_MASTER.md` header; #325, 2026-06-08).
- **⚠️ Prompt discrepancy:** the task brief said "A3 just re-floored to 188w `5f57d172` / 40w `be76e56d`." **That hash is NOT on `main`.** The `CALIBRATION_MASTER.md` header, the COMMAND_BOARD, and a fresh read-only HEAD 188w (n2024 in the central-Bosnia scoping doc) all confirm `d311eeac18492683`. HEAD is calibration-flat (the post-floor commits are docs/UI/negotiation/free-war-emergent/Codex). **Treat `d311eeac` as the D1 entry floor unless a real re-floor lands first; re-confirm at D1 open.** (The "A3" reference may be a different agent's local/branch hash — flag for the owner.)
- **Anchor status correction:** the 2026-06-07 owner-decision-backlog lists `op:zvornik:zvornik` as an OPEN regression. **That is stale** — the #279 garrison-pin RECOVERED it; the floor is **30/30** as of #312/#316/#325. Zvornik + Sana remain the **sacred-anchor canaries** for every spine run.

---

## 1. Coupling map — what serializes vs what interleaves vs what is gated

The central finding (from `docs/plans/2026-06-08-calibration-prerequisites-sequence.md`): the casualty lanes, ADR-0007, and E-B1 all write the **same `computeDefenderPowerBreakdown` / defender-power-and-attrition surface** (`frontline_attrition.ts` / `attack_casualty_distribution.ts` / `attack_resolution_osid.ts` / `siege_attrition.ts`). Each invalidates the others' tuning against a moving baseline → they **must serialize with a 188w re-floor between each**. Everything else either interleaves or is decision/§6-gated.

| Candidate | Surface it writes | Class | D1 disposition |
|---|---|---|---|
| **Lane 3** (#72) gross attrition / ×2.4 killed-magnitude | **defender-power / front-attrition (SPINE)** | **SERIAL — solo** | Owner risk-gate FIRST (territory-coupled; n553 reverted 0.003) |
| **B1** (#344) casualty missing-fix, `AWWV_CASUALTY_REALISM_V2` | attack-resolution casualty block (same file family) but **MEASURED 0-OSID** | **Orthogonal-by-measurement** | Can batch / land non-solo IF re-confirmed 0-OSID at D1 floor |
| **E-B1** corps-coherence decay | **defender-power surface (SPINE)** | **SERIAL — solo** | After casualty lanes (rides the same surface) |
| **ADR-0007 Phase B** reserve-commit | `brigade_front_distribution.ts` — **largely OFF** the defender-power surface | **Semi-independent** | Already ON in the 649 floor (`ENABLE_STANDING_OG_RESERVE_COMMIT=true`); no D1 action unless re-tuned |
| **Central-Bosnia HVO OOB lever** (A+B) | `bot_corps_stance.ts` + `enclave_resilience.ts` osid_lists — **NOT** the attrition surface | **Independent** | Interleave; A solo then A+B (each 188w) |
| **PDP intl_standing + internal_cohesion** (#48) | political-dimension propagation — **NOT** the combat surface | **Independent (faction-asymmetric)** | Interleave; serial per-channel (intl turn-gated, cohesion threshold-recal) |
| **Intel ambush-depth** (#51) `AWWV_INTEL_AMBUSH_DEPTH` | **attack-resolution / defender-power surface** | **SERIAL — solo** (if activated) | Needs `attack_resolution_osid.ts` frozen → AFTER the spine; reserve-attrition #50/#329 pairing |
| **Reserve-attrition Phase B pairing** (#50/#329) | front-attrition (paired with a frontline_attrition retune) | **SERIAL — solo, PAIRED** | NO-GO −18 solo; needs a paired retune → on the spine if attempted |
| **Contain V** (#339, VRS §6) + **Contain A** (#341, ARBiH) | faction-AI posture (enclave timing) | **§6-gated (V) / measured-INERT (both)** | **RECOMMEND DON'T ACTIVATE** — see §4 |
| **Durable-missing target band** | reporting magnitude (casualty ledger) | **Owner-decision (orthogonal to OSID)** | Resolve number BEFORE Lane-2/B1 land |
| **Krivaja / Srebrenica suppression** | enclave timing | **§6 Pyrrhic-panel (bright line surfaces to owner)** | NOT on D1 (v1.x by definition) |

**Three buckets:**
- **SPINE (serial, solo, 188w re-floor each):** Lane-3 → E-B1 → (intel-ambush + reserve-attrition pairing, if activated). B1 rides this file family but is measured-orthogonal.
- **INDEPENDENT (interleave anytime, still one-change-per-run + 188w):** Central-Bosnia OOB (A→A+B), PDP per-channel (#48).
- **GATED / SHELVE:** Contain V+A (recommend shelve), Krivaja (§6 Pyrrhic-panel; bright line surfaces to owner; OFF the sequence), durable-missing-target (resolve the number, not a run).

---

## 2. Recommended one-change-per-run ORDER

Lead with the spine (so the defender-power surface stops moving), then the independent levers, then the activations (with contain flagged "don't activate"). Each row = one 188w-validated run + a deliberate re-floor on GO. **B1 and the orthogonal lanes can be batched only if their 0-OSID / independence is RE-CONFIRMED at the live D1 floor** (measurements age — re-measure on `main` at D1 open).

| # | Item | Solo / batch | Why here | Expected net OSID |
|---|---|---|---|---|
| **D1-0** | **Re-confirm floor** + re-measure B1 / contain / PDP deltas on live `main` | — | Stale-measurement guard (the prompt's `5f57d172` ghost proves this matters) | 0 (verification) |
| **D1-1** | **Lane-3** front-attrition (bombardment-exposure term FIRST, then base-rate only if needed; **do NOT go to 0.003**) | **SOLO** | Casualty volume is the substrate E-B1 + Guardrail-1 measure against; territory-coupled, highest-risk → goes first while the surface is still movable | **±2–4, direction uncertain** (territory-coupled; could regress — owner risk-gate) |
| **D1-2** | **B1** casualty missing-fix (`AWWV_CASUALTY_REALISM_V2` flip) | **Batchable** *(if re-confirmed 0-OSID)* | Calibration-orthogonal to territory (deaths don't move OSIDs); satisfies the B1 integrity must-have without disturbing the floor | **0** (integrity/reporting only) |
| **D1-3** | **E-B1** corps-coherence decay (SPLIT: module+diagnostics, then the 2 consumers) | **SOLO** | Keystone; rides the same defender-power surface the casualty lanes reshape → must follow them | **+3–5pp band** (keystone; lights up inert E-B4) |
| **D1-4** | **Central-Bosnia HVO OOB — Candidate A** (cap `hvo_central_bosnia` bilateral-war stance to enclave-recapture) | **SOLO** | Independent of the spine (stance, not attrition); fixes the wrong-sign 1993 CB war | **+~6** (6 non-enclave tiles) |
| **D1-5** | **Central-Bosnia HVO OOB — Candidate B** (trim 4 over-generous enclave osid_list tiles) | **SOLO (A+B pair)** | Inert without A; closes the 4 enclave-list locked tiles | **+~4** (A+B ≈ +10 ceiling, 649→~659) |
| **D1-6** | **PDP `international_standing`** (#48) — turn-gate to ~t100+ (1992 anachronism) | **SOLO** | Independent (political surface); intl-isolation pressure is 1994–95, must not ahistorically brake the 1992 RS land-grab | **small, RS-braking late-war** (bounded; was −10 ungated) |
| **D1-7** | **PDP `internal_cohesion`** (#48) — recalibrate the `<40`/`<15` threshold on post-#63 distribution first | **SOLO** | Fires for all factions currently; needs faction-asymmetric threshold re-derivation | **small** (recal-dependent) |
| **D1-8** | **Reserve-attrition Phase B pairing** (#50/#329) — ONLY with a paired frontline_attrition retune | **SOLO, paired** | NO-GO −18 solo; on the spine because it touches front-attrition. **Optional** — shelve if the paired retune isn't ready | **−18 solo → ~0 paired** (target neutral) |
| **D1-9** | **Intel ambush-depth** (#51) `AWWV_INTEL_AMBUSH_DEPTH` flip | **SOLO** | Touches attack-resolution → needs the spine frozen first. **Optional activation experiment** | **uncertain** (activation experiment) |
| **D1-X** | **Contain V (#339) / Contain A (#341)** | — | **RECOMMEND DO NOT ACTIVATE** (measured-inert + §6 reliability risk) — see §4 | **~0** (inert) |

**Batching rule:** the spine items (D1-1, D1-3, D1-8, D1-9) are **always solo** (combat-behavior → 40w-clean is a false-green; corridor attrition compounds only at 188w). The independent levers (D1-4..D1-7) are also run solo under one-change-per-run, but their *re-floors are cheap* (no cross-contamination). **B1 (D1-2)** is the only genuine batch candidate — and only if D1-0 re-confirms 0-OSID.

**Rationale for leading with Lane-3:** it is the only territory-COUPLED spine item and the highest-risk (n553's 0.003 base-rate was reverted). Running it first means the rest of the spine (E-B1) tunes against a *settled* attrition substrate, and a Lane-3 NO-GO doesn't waste downstream re-floors. If the owner's risk appetite says "don't touch Lane-3" (the 649 floor already cut killed −29% via PR-1 v2), then the spine reduces to **E-B1 solo**, and Lane-3 is documented-ceiling.

---

## 3. Per-item gate (every D1 run)

**Universal gate (all rows):**
- **40w byte-identity OR a deliberate signed 40w re-floor** (`235c61f408dc3d95` — late-war levers like central-Bosnia/PDP/contain are inert in 40w → expect byte-identical; spine levers fire in 40w → expect a legitimate 40w hash move).
- **Synchronous 188w pre-merge** (NOT 40w + CI — that is a false-green for combat changes per `feedback_188w_validate_combat_changes_before_merge`).
- **Sacred anchors hold:** `op:zvornik:zvornik` = RS, `op:lukavac:brijesnica_donja_2` = RBiH (the two historically-fragile canaries); Srebrenica + Žepa still FALL (§6 core invariant).
- **Structural fingerprint (C1) stays green** OR is a deliberate, signed re-floor of `CALIBRATION_MASTER.md` + memory. Benchmarks 6/6, 0 critical.
- **One change per run.** Re-floor the hash-of-record on every GO; revert byte-clean on NO-GO.

**Per-item expected direction (summary):**

| Item | Net OSID direction | 40w | 188w canary risk |
|---|---|---|---|
| Lane-3 | ±2–4 (uncertain; could regress) | legit move | HIGH (territory-coupled; Zvornik/Sana) |
| B1 | 0 | byte-identical (flag default-off→on, reporting) | LOW |
| E-B1 | +3–5pp | legit move | MED (keystone, dual-horizon mandatory) |
| Central-Bosnia A | +~6 | byte-identical (late-war stance) | LOW-MED (Žepče/Kiseljak/Lašva cores must still hold HRHB) |
| Central-Bosnia B | +~4 | byte-identical | LOW (cores keep their bonus) |
| PDP intl (gated t100+) | small RS-braking | byte-identical (turn-gated late) | MED (1992 plausibility) |
| PDP cohesion (recal) | small | byte-identical | MED (threshold recal first) |
| Reserve-attrition (paired) | target ~0 | legit move | HIGH (−18 solo) |
| Intel ambush | uncertain | legit move | MED-HIGH |
| Contain V/A | ~0 (inert) | byte-identical | §6 (release reliability) |

---

## 4. Open owner decisions — MUST be resolved BEFORE D1 starts

These three gate the sequence; the rest of the order is deterministic once they're set.

### Decision 1 — Durable-missing target band (the headline number)
- **Conflict:** Pyrrhic casualty-research recommends anchoring durable-missing to **ICTY-DU ~10,500**; the original B1/casualty proposal floated **~2–4k**. Sim currently over-produces missing/captured ~30× (106,153 vs 2–4k) / ~10× vs ICTY-DU.
- **Why it gates D1:** it sets the target for Lane-2 (MIA/surrender-cascade re-split) and B1's missing-fix. It is **orthogonal to OSID territory** (a reporting/ledger magnitude), so it does not threaten the 649 floor — but the number must be fixed before those lanes land or they'll be re-tuned twice.
- **Ask:** **pick the anchor: ICTY-DU ~10,500 (Pyrrhic-recommended) vs ~2–4k.**

### Decision 2 — Contain (V #339 / A #341): activate or shelve?
- **Measured state:** both are default-off and **measured calibration-INERT at the end-state** (path-fidelity only, ~0 OSID). The 1.0 DoD (§B2 / §6.1) already rules **VRS strangle = documented-ceiling for 1.0** — a stuck §6 release would suppress the Srebrenica fall, a worse failure than the fidelity gain. §6.2 of the DoD states §6 mechanics are **v1.x by definition** (cannot land after the final re-floor).
- **Recommendation:** **SHELVE both for 1.0 — do NOT activate at D1.** They buy ~0 calibration and carry a §6 release-reliability risk that the DoD has already adjudicated against. Keep default-off; revisit in v1.x.
- **Ask:** **confirm shelve (recommended) vs a one-time activation experiment behind the §6 gate.** If activated, it is a SOLO spine-adjacent run (touches enclave timing) with an explicit Srebrenica/Žepa-still-fall assertion.

### Decision 3 — Lane-3 risk appetite (the one territory-coupled spine item)
- **State:** Lane-3 (gross attrition / ×2.4 killed-magnitude) is **TERRITORY-COUPLED, not orthogonal**. n553 tried `BASE_ATTRITION_RATE` 0.003 and **reverted**. The 649 floor (PR-1 v2 #316) already moved attrition the *other* way (0.004→0.0045, +13 OSID, killed −29%) — so further lowering attrition for casualty-realism may regress the floor.
- **Ask:** **does the owner want Lane-3 attempted at D1 (accepting a possible floor regression for casualty realism), or is Lane-3 a documented-ceiling** (the 649 floor's −29% killed is "realistic enough")? If shelved, the spine reduces to **E-B1 solo** and D1 is materially lower-risk.

**Secondary (resolve, but lower-gating):** reserve-attrition #50/#329 — attempt the paired retune or shelve (it's optional/−18 solo); intel-ambush #51 — activation experiment or leave default-off.

---

## 5. The freeze handshake (after the last re-floor)

Per the 1.0 DoD §C — once the final D1 run is GO and the last re-floor of `CALIBRATION_MASTER.md` + memory is signed:

1. **Declare the reference platform (C2):** Linux / Node 22 is the determinism authority. Do **not** promise Windows == Linux hashes; document the divergence honestly (the byte-hash baseline CI job was removed for exactly this reason).
2. **C1 must be live FIRST:** the 188w + platform-stable **structural fingerprint** is CI-enforced (retiring the "188w-before-merge" *tribal* rule). D1 cannot freeze on human discipline alone — the false-green risk must be in CI before the freeze.
3. **C3 hash-freeze:** record the frozen **188w / 40w / 52w hashes-of-record** as the **1.0 baseline** in `CALIBRATION_MASTER.md` (and the golden-baseline manifest `data/derived/scenario/baselines/manifest.json`). This is the last legitimate hash-mover.
4. **Persisted-schema freeze:** freeze the save schema (currently v35) and the persisted Decision-Room field surface. Any later persisted field is an **additive-optional migration only** (per DoD conflict-resolution §3).
5. **Definition of "done" for D1:** `npm run test:baselines` green on the frozen manifest; 188w 30/30 anchors + 6/6 benchmarks + 0 critical; Srebrenica/Žepa fall; structural fingerprint green in CI; ledger entry in `PROJECT_LEDGER.md` marking the frozen 1.0 baseline. **After this point, anything calibration-moving is a 1.0.1 patch, not a re-open** (DoD conflict-resolution §4 — "the real trap").

D1 itself is NOT the 1.0 blocker — per the DoD, that is **D2 (the full-campaign playtest, ≥1 per faction)**. D1 produces the *frozen baseline*; D2 produces the *go/no-go*. Both are one-way doors needing explicit owner go.

---

## Appendix — sources read (read-only)

- `docs/plans/2026-06-08-calibration-prerequisites-sequence.md` (the defender-power spine)
- `docs/plans/2026-06-08-v1.0-definition-of-done.md` (D1/C1/C3 framing, contain disposition, version-band)
- `docs/40_reports/CALIBRATION_MASTER.md` (floor of record `d311eeac`)
- `docs/40_reports/proposals/20260609_CENTRAL_BOSNIA_OOB_SCOPING.md` (Candidate A/B, +~10 ceiling)
- `docs/plans/2026-06-07-owner-decision-backlog.md` (PDP / ADR-0007 / Zvornik-stale / §6 items)
- `docs/plans/COMMAND_BOARD.md` (shared-code cluster, open tasks #48/#50/#51, contain PRs #339/#341)
- `git log` (contain #339 VRS §6 default-off, #341 ARBiH Washington-release default-off; B1 #344; #325 floor)
