# Pyrrhic Decision Register — consolidated (2026-06-07)

> **⚠️ RECONCILED 2026-06-09 (D4 beta-gate sweep) — read this first.** Many items below have
> SHIPPED or changed disposition since 2026-06-07. Quick map (authoritative state = the alpha-band
> session; floor 188w `5f57d17287b87dfb` / 40w `be76e56dd9d288c2` / 52w golden `9b426732…`,
> territory UNCHANGED at 649/712, anchors 30/30):
> - **§1 Presidential Command Model** — Option 1 (faction-asymmetric command friction) SHIPPED (#274/#313/#319); force-launch cost preview SHIPPED (#349/#54).
> - **§3 Event-system observer-flag writer** — SHIPPED (#285); the A3 authorship/dead-bridge fix + dynamic codex morphing SHIPPED (#348 A3; #334 A1c).
> - **§4 §6 VRS strangle-not-capture** — BUILT as contain Lane V (#339, default-off, §6 release-reliability proven); later Srebrenica/Žepa reconciliation supersedes the Krivaja-triggered-fall framing: enclave fall receipts are event-owned, while Krivaja/Stupčanica remain chronology/AAR context. D1 draft recommends SHELVE.
> - **§5 Political-Dimension Propagation** — patron_confidence + military_credibility ACTIVATED (#325); intl_standing + internal_cohesion stay guarded-OFF (task #48). `intl_only`/`cohesion_only` activation = D1-time.
> - **§7 TG Sept-1995** — HVO western robustness (#278) + Sana (#284) shipped; Mistral SW-belt + Ključ PARKED.
> - **§10 Fall-1995 combat-math** — E-A5 launch-halt ACTIVATED + firing (#312/#325); E-B1 still the keystone, D1-time.
> - **Contain Lane A (ARBiH→HVO enclaves)** — BUILT (#341, default-off); measured **calibration-INERT** (the over-capture is a pre-Washington transient already resolved at the 649 end-state). The Central-Bosnia 13-OSID ceiling's real lever is **HVO-side OOB** (#66 scoping), NOT contain. D1 draft recommends SHELVE.
> - **`op:zvornik:zvornik` (tracked item below)** — **RECOVERED by #279 garrison-pin; floor is 30/30 anchors. NO LONGER OPEN** — corrected in that section.
> - **ALPHA BAND COMPLETE (2026-06-09)** + **1.0 Definition-of-Done RATIFIED** (`docs/plans/2026-06-08-v1.0-definition-of-done.md`); we are at the **0.9.9-beta gate**. **B1 casualty missing-fix** (#344) HELD for D1; the **D1 finalization sequence** is drafted (`docs/plans/2026-06-09-d1-finalization-sequence-DRAFT.md`). Version: package.json = **0.9.6-alpha.1**.

**Purpose:** A single Pyrrhic-panel decision register for the ten open decisions distilled from the
2026-06-07 Pyrrhic decision-packet round, plus two tracked open items (a cross-cutting
doc-staleness sweep and the `op:zvornik:zvornik` 188w anchor regression). One section per item:
**Decision / Options / Recommendation / Flags / Build-lane / Status.** Nothing here changes
behavior — it is a decision register, not an implementation. Where a recommendation says "ready",
it is byte-identical-by-construction or docs-only unless the Pyrrhic panel explicitly signs off a
calibration-moving change under the relevant canon/calibration gate.

**Flag legend:** §6 = sensitive-history gate (`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`);
canon = touches canon-tier docs; calibration = can move a baseline; effort = rough size;
risk = primary downside if mishandled.

---

## 1. Presidential Command Model — next packet

- **Decision:** Pick up the next Presidential Command Model packet, building the deferred
  faction-asymmetric political consequences of the already-shipped levers/gestures.
- **Options:**
  1. **Faction-Asymmetric Command Friction** — wire the political consequences currently flagged
     "MECHANICAL ONLY" in `war_phases.ts` (~lines 410 / 483 / 1608 / 1654): RS replace-CO
     officer-corps-revolt, HRHB Zagreb-gate, faction-asymmetric `patron_confidence` deltas.
  2. Patron-demand-refusal → supply loop (the refuse-a-patron-demand path feeding into a
     material-supply consequence).
- **Recommendation:** **BUILD — Option 1.** The levers and gestures already ship; the asymmetric
  consequences are deferred connection work, not new mechanics. The substrate exists, so this is a
  wiring/connection packet. Player-only → historical/headless byte-identical by construction.
  Option 2 is viable but requires first verifying the patron supply channel is not a dead channel
  (recruitment-modifier dead-channel precedent).
- **Flags:** §6 none · canon none · calibration none (player-only, byte-identical) · effort medium
  · risk low (documenting an unbuilt consequence as shipped).
- **Build-lane:** Presidential-command engine lane.
- **Status:** **READY — panel-routed connection packet.** Substrate exists; this is a connection packet.

---

## 2. Standing-OG ADR-0007 flag-flip

- **Decision:** Whether to flip the ADR-0007 standing-OG shared-defense flags on now.
- **Options:** flip now / approve canon review without flipping / leave default-off indefinitely.
- **Recommendation:** **DO NOT FLIP YET — approve the canon / Guardrail-1 review WITHOUT flipping
  the flags.** The 188w proof gate has PASSED, but flag-on is "activation-red": war-cost is lower
  flag-on than flag-off, which violates Guardrail-1 (an activation must not reduce the war's cost).
  The non-primary-defender casualty cap (0.15) is ALREADY BUILT
  (`attack_casualty_distribution.ts:30`). Flip waits on Guardrail-1 going green. Flipping later
  also unblocks the intel-ambush-depth lane (which needs `attack_resolution_osid.ts` frozen).
- **Flags:** §6 none · canon yes (Guardrail-1 review) · calibration yes (flip moves baseline) ·
  effort low (review) / medium (eventual flip) · risk medium (premature flip violates Guardrail-1).
- **Build-lane:** Standing-OG / canon-Guardrail review lane.
- **Status:** **DECISION — approve review, hold the flip on Guardrail-1 green.**

---

## 3. Event-system semantics

- **Decision:** What remains to do on event-system semantics now that alternate-timeline branching
  is decided and implemented.
- **Options:** redesign branching semantics (NO — already ratified) / build the observer-flag
  writer / defer.
- **Recommendation:** **BUILD — observer-flag writer.** Alternate-timeline branching semantics are
  already decided and implemented (ratify/sign, do not redesign). The real gap is the
  observer-flag WRITER: 6 Wave-2 ghost-entries are wired but dormant because positive observer
  flags are never written. The fix is ~80% pure data — author 5 deadline "audit" events mirroring
  the existing negative-flag pattern, zero engine code — plus a small default-OFF engine observer
  for 2-3 threshold flags. The Srebrenica `enclave_held_through_turn` threshold flag needs a §6
  historian gate; the others do not.
- **Flags:** §6 partial (Srebrenica threshold only) · canon none · calibration none (default-off
  observer + data events) · effort low-medium (mostly data) · risk low.
- **Build-lane:** Event-system product/engine lane.
- **Status:** **BUILD-REC — ready for the non-Srebrenica portion; Srebrenica flag §6-gated.**

---

## 4. §6 VRS strangle-not-capture

- **Decision:** Whether to model the historical VRS "strangle, don't capture" posture toward
  isolated enclaves.
- **Options:** faction-AI `contain` posture with emergent release / documented ceiling (no build).
- **Recommendation:** **§6-GATED — faction-AI `contain` posture** (withhold assault on isolated
  enclaves until an emergent 1995-pivot release). Safe by construction: it REMOVES aggression and
  grants no reward. **CRITICAL risk:** the release must reliably fire so Srebrenica / Žepa still
  fall and the genocide rupture is recorded — suppressing the fall would be a WORSE §6 failure than
  not building this. Requires Pyrrhic §6-panel sign-off (unanimous GO; BLOCK, split verdict, or bright-line uncertainty escalates to the owner). Fallback if approval is withheld: a
  documented ceiling (no engine change).
- **Flags:** §6 YES (Pyrrhic §6-panel sign-off; BLOCK, split verdict, or bright-line uncertainty escalates to owner) · canon none · calibration yes (changes enclave
  timing) · effort medium · risk HIGH (a stuck release suppresses the historical fall).
- **Build-lane:** Faction-AI posture lane, under the §6 chain.
- **Status:** **§6-GATED — requires Pyrrhic §6-panel GO; documented-ceiling fallback.**

---

## 5. Political-Dimension Propagation

- **Decision:** Whether to activate Political-Dimension Propagation now that the cohesion blocker
  is resolved.
- **Options:** activate `intl_only` / activate `cohesion_only` / `both_on` / hold.
- **Recommendation:** **CALIBRATION-DECISION — activate `intl_only`** (RS + HRHB hesitant, RBiH
  spared — historically resonant) **BUT only after a mandatory fresh re-measure on current `main`
  first.** The cohesion blocker is RESOLVED (#63 landed), but the prior decision docs are STALE
  post-#63 / #173, so they cannot be trusted for the activation delta. The activation moves the
  baseline (dual-horizon + a historian 1992-plausibility gate). The `cohesion_only` threshold
  (still 40 in code) needs re-derivation on the post-#63 engine. One change per run; `both_on`
  goes last.
- **Flags:** §6 none · canon none · calibration YES (moves baseline) · effort medium · risk medium
  (stale-doc deltas; 1992 plausibility).
- **Build-lane:** Event-system + calibration lane.
- **Status:** **CALIBRATION-DECISION — re-measure on current main, then `intl_only` first.**

---

## 6. Ring-3 sensitive backlog

- **Decision:** Priority order for the remaining Ring-3 sensitive-event authoring backlog.
- **Options:** remediate the highest-canon-risk existing row first / author new sensitive events
  first.
- **Recommendation:** **§6-GATED — remediate `croat_bosniak_war_begins_1993` FIRST.** It still
  carries an unsourced "ethnic cleansing on both sides" symmetry sentence — the highest canon-risk
  sentence in the bank; drop it unless ICTY side-specific sourcing exists. Then, in order: the
  Bijeljina informational event; the 1992-siege pair; and (§6-panel gated) the Srebrenica-column /
  UN-safe-area events. Note `federation_ground_offensive_1995` is an OPERATIONAL overclaim, not a
  §6 issue. Also: 6 non-sensitive deposit essays should be RECLASSIFIED OUT of the §6 lane (they
  are gating §6 review for no reason).
- **Flags:** §6 YES · canon none · calibration none · effort medium · risk high (the symmetry
  sentence is a live canon-risk).
- **Build-lane:** Content/Codex + §6 sign-off chain.
- **Status:** **§6-GATED — remediate symmetry sentence first; reclassify 6 deposit essays out.**

---

## 7. TG Sept-1995 tuning

- **Decision:** What to tune now that TG v3.0 is fully activated on `main`.
- **Options:** HVO Mistral SW-belt via OOB data / Sana corridor timing / Farz-95 confirm /
  Krivaja §6 research.
- **Recommendation:** **CALIBRATION-REC — HVO Mistral SW-belt via OOB data FIRST** (HV
  brigade-pool expansion, ~10 OSID, recovers most of the RS +23 overshoot). Then Sana corridor
  timing; then confirm Farz-95; Krivaja is §6-gated (research only). v3.0 is fully ACTIVATED on
  `main` (#65); the deferred work is the Sept-1995 188w window
  (Sana / Farz-95 / HVO-Mistral / Krivaja). Dual-horizon + re-floor each change.
- **Flags:** §6 partial (Krivaja research only) · canon none · calibration YES · effort
  medium · risk medium (dual-horizon discipline; 40w-clean ≠ 188w-clean).
- **Build-lane:** Calibration / TG-Sept-1995 lane.
- **Status:** **CALIBRATION-REC — OOB-data Mistral SW-belt first.**

---

## 8. FORAWWV open decisions

- **Decision:** Disposition of the three FORAWWV roadmap gates + the Bucket-A promotions.
- **Options / rulings already in motion:**
  - **B-Neg (Dayton):** EXPANDED to a comprehensive state-structure package (deep research in
    progress).
  - **B-MP (multiplayer):** RULED **defer-post-2.0** (see D5).
  - **B-Len (play length):** RULED **single-campaign-1.0 / quick-modes-post-1.0** (see D6).
  - **Bucket-A FORAWWV promotions** (H1.8 / H2.1 / H2.4 + H1.9 "no autonomous degradation"):
    ACCEPTED — orchestrator is applying these to FORAWWV directly.
- **Recommendation:** Ratify the above; no new decision needed beyond letting the Dayton research
  complete.
- **Flags:** §6 none · canon yes (FORAWWV — orchestrator-applied, panel-authorized only) ·
  calibration none · effort varies · risk low.
- **Build-lane:** Canon decision-prep bank / orchestrator FORAWWV lane.
- **Status:** **MOSTLY RULED — Dayton research open; Bucket-A promotions accepted.**

---

## 9. Sarajevo continuous-condition

- **Decision:** Whether/when to model the Sarajevo siege as a continuous battlefield condition.
- **Options:** pull the substrate forward now / full continuous condition now / defer entirely.
- **Recommendation:** **BUILD — hybrid.** Pull the SUBSTRATE forward now: it fixes a real fidelity
  bug — `sarajevo_exception.ts:109` sets `externalSupply = internalSupply`, which makes the Butmir
  tunnel / airlift fictional. Defer the player surface + the default-flip to post-1.0 (§6-panel
  sign-off). Plan: `docs/plans/2026-05-29-b7-sarajevo-siege-continuous-condition-plan.md`
  Phases 0-3.
- **Flags:** §6 partial (default-flip + player surface) · canon none · calibration yes (substrate
  fix may move supply) · effort medium · risk medium.
- **Build-lane:** Design + event-system / supply lane.
- **Status:** **BUILD-REC (substrate) — surface + flip deferred post-1.0.**

---

## 10. Fall-1995 combat-math

- **Decision:** Order of the deferred Fall-1995 combat-math follow-ups.
- **Options:** E-A5 / E-B1 / E-A6 sequencing.
- **Recommendation:** **CALIBRATION-REC.** E-B1 was never built, so the already-shipped E-B4 is
  INERT dead code. Order:
  1. **E-A5 first** — 51:49 Holbrooke launch-halt (~95% built; recovers the RBiH +29 overshoot;
     turn-gated 182, prefer an event-gate over an area-ratio).
  2. **E-B1 second** — corps coherence-decay (the keystone, +3-5pp, lights up E-B4; SPLIT into
     2 changes).
  3. **E-A6 last / optional** — Sloboda scripted op.
  Dual-horizon + re-floor (COMBAT-P14 lesson: 40w-clean ≠ 188w-clean).
- **Flags:** §6 none · canon none · calibration YES · effort medium-high · risk medium
  (E-B1 is a keystone; dual-horizon mandatory).
- **Build-lane:** Calibration / combat-engine lane (NOT event-system).
- **Status:** **CALIBRATION-REC — E-A5 → E-B1 → E-A6.**

---

## Cross-cutting — systemic doc-staleness

Across 6 of the packets, the same systemic doc-staleness recurred. These are being reconciled in
this batch + the parallel canon batch:

- **Free War Phase-1 fossil** — referenced as open in several places; actually closed/validated
  (Slice A.2 52w, PR #98, owner-closed). Bot military stays historical-faithful.
- **ADR-0005 board row + the ADR doc itself** — both describe v3.0 as "NOT STARTED / flag-off
  dormant"; v3.0 is ACTIVATED on `main` (PR #65 `2d1ab9117`).
- **Political-Dimension decision docs** — stale post-#63 / #173; cannot be trusted for activation
  deltas without a fresh re-measure.
- **CALIBRATION_MASTER header** — pointed at the 618 / `a1a7c167` baseline; reconciled in this
  batch to 614 / `0abca945`.
- **§3.6 canon-vs-code drift** — a canon/code mismatch flagged for the canon batch.

---

## ~~Open~~ RESOLVED tracked item — `op:zvornik:zvornik` 188w anchor regression

> **✅ RESOLVED 2026-06-08 (#279 garrison-pin); confirmed by the D4 sweep 2026-06-09.** The sacred
> anchor `op:zvornik:zvornik` was RECOVERED by the **#279 garrison-pin engine fix**
> (`pinGarrisonToMustHoldFrontEdge` in `brigade_front_distribution.ts` + `must_hold vrs_drina=[op:zvornik:zvornik]`
> in the 188w scenario): it pins one idle ≥400-pers same-corps brigade onto the undefended friendly
> `must_hold` OSID so the 245th Mountain's ~w85 recapture is blocked. The 188w floor of record is
> now **30/30 anchors** (`5f57d17287b87dfb`), Zvornik RS. **This item is NO LONGER OPEN.** The
> bot-AI/OOB framing below is HISTORICAL context only.

- **Decision:** ~~How to resolve the new failing 188w anchor.~~ RESOLVED (#279).
- **Symptom (historical):** `op:zvornik:zvornik` was a REGRESSION since the 618 baseline. Three early
  dual-horizon fix attempts were NO-GO'd: a surgical OOB change, a `must_hold` change, and an event
  `control_change`.
- **Root cause (historical):** `arbih_245th_mountain` recaptured `op:zvornik:zvornik` at ~w85 (a 2.03:1
  decisive victory) and held it to w188. The `zvornik_takeover_1992` event DOES flip it RS at w10,
  but it was retaken. This is NOT a #200 side-effect (disproven) and NOT a missing initial flip.
- **Resolution:** the **#279 garrison-pin** (a reusable engine mechanic) — NOT a bot-AI strength
  retune or an event control-change — pins a friendly garrison onto the undefended `must_hold` Drina
  front edge, holding Zvornik RS through w188 (+12 OSID net, NE Drina/Birač corridor).
- **Flags:** §6 none · canon none · calibration yes (delivered +12) · effort medium · risk medium.
- **Build-lane:** Bot-AI / OOB / engine garrison-pin lane.
- **Status:** **RESOLVED — recovered by #279 garrison-pin; 188w 30/30 anchors, Zvornik RS.**
