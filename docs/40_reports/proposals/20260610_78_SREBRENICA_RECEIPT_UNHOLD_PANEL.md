# §6 Pyrrhic Panel — Un-Hold of the Srebrenica Codex-Receipt (#78)

**Date:** 2026-06-10
**Review type:** READ-ONLY 4-lens §6 panel (owner-delegated UNANIMOUS sign-off, #368 precedent)
**Subject:** Un-holding the `srebrenica_genocide_1995` codex-receipt built under #78 / commit `0ba12216a`
**Authority:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §6 (sign-off structure)

---

## VERDICT: **GO-WITH-NOTES** → conditions below. Un-hold approved.

All four lenses return GO. Two non-blocking conditions attach (prose wording + the build action it implies). None is a BLOCK; none is a SPLIT.

---

## What "un-holding" means mechanically (precise finding)

The #78 receipt code is already **merged and live**, but it is **inert in the production UI**. There are two independent surfacing paths and the panel had to disentangle them:

### Path A — essay-resolver path (ALREADY LIVE in production)
`src/ui/map/components/CodexPanel.tsx:200-211` builds a `CodexRenderContext` with `{ costLedger, gameOver }` from live game state (`GameStateAdapter.ts:2410` → `gameOver = Boolean(meta.game_over)`). The Srebrenica essay carries a `dynamic_sections` entry (`data/scenarios/essays/essay_index.json:3838-3850`, `id: v091_cost_ledger_srebrenica_finding`) gated on `condition: "GAME_OVER AND FINDING:rupture_srebrenica_genocide_1995"`. The resolver (`codexEssayResolver.ts:351` evaluates `FINDING:`, `:566` expands `{cost_rupture_findings}`) renders it from the cost-ledger finding `rupture_srebrenica_genocide_1995` (`cost_ledger.ts:337-348`, category `rupture`, ICTY sources). **This path renders today at game-over with no code change.**

### Path B — sim-side builder path (BUILT, WIRED INTERNALLY, NOT CONSUMED)
`buildRuptureReceiptSections` inside `buildDynamicSections` (`dynamic_section_builder.ts:907-968, 1062`) emits a Ring-2 pointer record `rupture_receipt_srebrenica_genocide_1995 → essay srebrenica_falls_1995`, join key `FINDING:rupture_srebrenica_genocide_1995`, `variant: 'divergence'`. **`VerdictScreen.tsx:25` imports ONLY `buildGhostEntries` — it never calls `buildDynamicSections`/`buildDynamicCodex`.** So Path B is exercised only by tests (`tests/codex_srebrenica_rupture_receipt.test.ts`, 8 cases green).

### The actual HOLD
The commit message states the hold reason verbatim: *"HELD for owner review — final codex/essay wording flagged as factual stub."* The hold is therefore (a) an **owner sign-off on the receipt summary prose** (the `RUPTURE_RECEIPTS[0].summary` string at `dynamic_section_builder.ts:911-912`), and (b) optionally **connecting Path B to a Verdict/codex consumer** so the receipt surfaces at the Verdict screen, not only inside the in-game Codex panel.

**Exact un-hold action (single mechanical step):**
- **Minimum (Path A is already live):** the un-hold is a **content/wording sign-off** — bless the receipt summary string at `src/sim/codex/dynamic_section_builder.ts:911-912` and the cost-ledger finding text at `src/sim/endgame/cost_ledger.ts:344-347` as final (remove the "factual stub" flag). No flag flip, no default change, no guard removal is required for the in-Codex surface.
- **Recommended full fix (closes the D2 legibility gap):** wire `buildDynamicSections`/`buildDynamicCodex` output into the Verdict surface (`VerdictScreen.tsx` / `CinematicVerdict.tsx`) so the receipt is presented at the moment the campaign closes — this is the "surface the climax" win the D2 audit asked for. This is additive read-model rendering; it is the separately-dispatched build the orchestrator runs on a GO.

There is **no `enclave_held_through_turn`-style suppression flag and no §6-defer guard** suppressing the receipt. The `enclave_held_through_turn` flag gates the *counterfactual* `enclave_defended` ghost (the enclave-survived path), which is unrelated. The rupture receipt is gated only on the rupture being recorded in `state.military.negotiation.rupture_consequences`.

---

## LENS 1 — HISTORIAN (factual fidelity) → **GO**

Sources reviewed: `essay_srebrenica_falls_1995.json` (full prose), `essay_index.json:3828-3834` (source list), `cost_ledger.ts:337-348` (finding), `dynamic_section_builder.ts:911-912` (receipt summary).

- **Dates correct:** 6 July 1995 VRS assault, 11 July fall, July genocide window — all accurate.
- **Scale correct:** "over eight thousand" men and boys; cost-ledger states "8,000 killed" as the historical reference. No inflation, no deflation, no rounding-to-minimize.
- **Perpetrator correct:** VRS under Mladić; separation at Potočari including the UN compound; secondary/tertiary mass-grave reburial to conceal — all ICTY-established.
- **Legal record correct and complete:** Krstić (IT-98-33-T, first Srebrenica genocide conviction), Karadžić (IT-95-5/18-T), Mladić (IT-09-92-T), ICJ Bosnia v. Serbia (2007), UN A/54/549 (1999). Citation set matches the canon gate §2 rupture-roster row exactly.
- **No euphemism, no erasure:** the word "genocide" is used where tribunals found genocide (gate §4 Required); Dutchbat failure and the international-protection failure are stated without exculpation or false balance.
- **One drafting note (Drina Corps):** the prompt asked to confirm the "Drina Corps" attribution. The essay attributes the operation to the VRS under Mladić and does not name the Drina Corps specifically. This is **not an error** — it is an omission of a correct detail, and the VRS/Mladić attribution is the higher-order true statement. Optional enrichment, not a blocker.

Historian verdict: **GO.** Content is an accurate reflection of the ICTY-established record. No invented details.

---

## LENS 2 — CANON / §6 COMPLIANCE → **GO**

Checked against `SENSITIVE_HISTORY_DESIGN_GATE.md` Ring rules and §6.

- **Consequence, never reward (gate §0, Ring 3 #4/#10):** the receipt is emitted only when the rupture is *already recorded* by `evaluateRuptureConsequences` (`rupture_consequences.ts:37-70`). It is a read-model observation of a locked fact. It carries no score, no points, no badge. The receipt summary explicitly frames it as "a permanent entry in the historical record." PASS.
- **Read-model only — does NOT alter rupture mechanics (gate §1 Ring 1):** `buildRuptureReceiptSections` reads `state.military.negotiation.rupture_consequences` and writes nothing (proven by the READ-ONLY mutation test, `codex_srebrenica_rupture_receipt.test.ts:118-124`, and by the builder taking a narrow `RuptureConsequenceView`). The rupture trigger/timing/condemnation flag remain wholly owned by `rupture_consequences.ts` — unchanged. PASS.
- **`outcome`-framing refused (gate §6, the enclave_defended precedent):** the receipt is pinned to `variant: 'divergence'` by the type `Extract<SectionVariant, 'divergence'>` (`:898`) AND a runtime defence-in-depth guard throws if any receipt emits `variant: 'outcome'` (`:959-966`). Framing the genocide as a player-induced outcome is mechanically impossible. PASS.
- **Ring guard intact:** `assertRingGuard` (`:184-198`) still refuses all Ring-3 flags (`rupture_flip`, `srebrenica_genocide_did_not_occur`, `genocide_did_not_happen`, score-inversion, `commit_genocide_authorised`). Un-holding touches none of this. PASS.
- **Calibration-inert:** confirmed independently. The receipt builder writes no state and is consumed only by codex/Verdict read surfaces. The commit's own proof: 40w `control_delta.json` BYTE-IDENTICAL (sha256 `9e47df18…`), `political_controllers` identical; the only serialized delta is the *Bijeljina* codex observer-flag (a separate item in the same commit), not the Srebrenica receipt, which has zero 40w footprint (rupture is turn ≥140). Surfacing it in the Verdict UI is pure read-model rendering — no OSID/territory/combat effect. PASS.

Canon verdict: **GO.** Un-holding does not alter rupture mechanics, does not create a Ring-3 surface, and is calibration-inert.

---

## LENS 3 — NARRATIVE / TONE → **GO (with a prose note)**

- **Essay prose (`srebrenica_falls_1995.json`):** somber, restrained, documentary, third-person historical voice. Fully gate-§4 compliant — no second-person "you," no humor, no minimization, no trivializing comparison. Gives the event its proper weight ("not as one atrocity among many, but as the definitive indictment of what the international community permitted to occur"). This is exactly the register the gate prescribes.
- **Receipt summary string (`:911-912`):** *"This campaign recorded the fall of the Srebrenica safe area and the genocide that followed — a locked consequence established by the Tribunal, surfaced here as a permanent entry in the historical record."* Restrained, historical-voice, names the genocide, frames it as a locked fact. **Note:** the phrase "This campaign recorded" is acceptable but slightly process-flavored; a marginally stronger register would foreground the event over the bookkeeping (e.g. lead with the fall and the genocide, then note it as a permanent locked record). This is a polish suggestion, not a violation — the string already satisfies §4.
- **D2 weight question:** the D2 audit's core complaint is that the w140-160 climax is "mechanically locked, narratively absent" — the genocide flips as an invisible flag with no player-facing surface. Surfacing this receipt directly addresses that: it gives the gravest event in the war a somber, explicit, ICTY-cited record at the moment of closure. It is neither sensational nor perfunctory.

Narrative verdict: **GO.** The surfacing is appropriately grave and documentary. Prose polish is optional, non-blocking.

---

## LENS 4 — RED-TEAM (find any reason NOT to un-hold) → **GO (no blocker found)**

Adversarial checks attempted:

1. **Could it read as reward/spectacle?** No. No score, no badge, no celebratory framing; `outcome` variant is type- and runtime-blocked; the surface is a "permanent entry in the historical record." The Pyrrhic score cannot invert (gate Ring-3 #4, independent of this change).
2. **Does it touch rupture timing / the §6 invariant?** No. The builder is read-only off the already-recorded array; `rupture_consequences.ts` is untouched. The rupture still records on the same mechanical predicate (RS controls `op:srebrenica:srebrenica_2` + `srebrenica_enclave_formed` + turn ≥140).
3. **Could the receipt fire ahistorically or in a non-Srebrenica context?** No. It is keyed strictly on a recorded rupture `id === 'srebrenica_genocide_1995'` (`RUPTURE_RECEIPT_BY_ID`, `:918-920`). Unknown rupture ids emit nothing (tested, `:103-110`). It cannot fire unless the genocide rupture is already a locked fact — which itself requires the mechanical fall. Counterfactual silence (enclave held → no rupture → no receipt) is preserved and correct per gate §1.5#11.
4. **Calibration/hash impact beyond the inert read-model?** None for the Srebrenica receipt. The only hash movement in the merged commit came from the *Bijeljina* observer flag (a separate item), proven territory-flat / control_delta byte-identical. The Verdict-wiring build (Path B) renders existing read-model data and writes no state.
5. **Double-surfacing risk?** Path A (in-game Codex panel) and Path B (Verdict screen, if wired) could both show a Srebrenica record. This is acceptable — they are different surfaces (the encyclopedia vs the endgame verdict) and both draw from the same locked finding; there is no contradiction. Worth a glance during the build so the two strings read consistently, but not a blocker.
6. **Idempotency / duplicate ruptures?** Guarded — `seen` set ensures at most one receipt (tested, `:93-101`).

Red-team verdict: **GO.** No tone violation, no factual error, no reward/spectacle vector, no mechanical side-effect, no ahistorical-fire path, no calibration impact. The change is genuinely a read-model surfacing of a locked, ICTY-established fact.

---

## CONDITIONS (GO-WITH-NOTES)

1. **(Required) Wording sign-off:** the owner blesses the receipt summary (`dynamic_section_builder.ts:911-912`) and the cost-ledger finding text (`cost_ledger.ts:344-347`) as **final** — removing the "factual stub" designation that is the literal hold reason in commit `0ba12216a`. The panel finds the existing wording §4-compliant and accurate; the optional Lens-3 polish (foreground the event over the bookkeeping) and the optional Lens-1 enrichment (name the Drina Corps) may be folded in at the owner's discretion but are **not** prerequisites.
2. **(Recommended) Verdict-surface wiring (the actual D2 win):** dispatch the separate build to consume `buildDynamicSections`/`buildDynamicCodex` in the Verdict surface (`VerdictScreen.tsx` / `CinematicVerdict.tsx`) so the receipt presents at campaign close. This is additive read-model rendering, calibration-inert, and must re-confirm: (a) `variant !== 'outcome'`, (b) no state mutation, (c) 40w/188w control_delta byte-identical, (d) Path-A/Path-B strings read consistently.

---

## FINAL

- **VERDICT:** GO-WITH-NOTES (4/4 lenses GO; unanimous). Un-hold approved.
- **Exact un-hold mechanism:** No flag flip or guard removal needed for the in-game Codex surface — Path A is already live (`CodexPanel.tsx:200-211` → essay `dynamic_sections` gated `GAME_OVER AND FINDING:rupture_srebrenica_genocide_1995`). The hold is a **wording sign-off** on the receipt summary at `src/sim/codex/dynamic_section_builder.ts:911-912` (+ cost-ledger finding `src/sim/endgame/cost_ledger.ts:344-347`); the recommended companion build wires `buildDynamicSections` into `VerdictScreen.tsx` (currently imports only `buildGhostEntries`, line 25).
- **Single most important finding:** the receipt is a strictly read-only observation of an already-locked rupture — it cannot record, flip, re-time, or prevent the genocide, and it cannot fire outside a recorded Srebrenica rupture; the genocide mechanics in `rupture_consequences.ts` are untouched.
- **Calibration-inert:** CONFIRMED. Builder writes no state, consumed only by read surfaces; 40w `control_delta` byte-identical (sha256 `9e47df18…`), Srebrenica receipt has zero 40w footprint (rupture is turn ≥140). No OSID/territory/combat effect.
