# Presidential Enclave Decision — OVERRUN vs CONTAIN — Design

**Status:** ⚠️ **DESIGN-DRAFT.** Read-only research + design. NO engine/data/UI code written. **OWNER + §6 SIGN-OFF REQUIRED before build (see §10).** This is a §6-sensitive feature in the highest tier of the canon hierarchy.

**Owner direction (decision, 2026-06-09):** Shelve the two calibration-inert bot-only `contain` lanes (Lane V #339 / Lane A #341 of `docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md`). The strangle-vs-assault choice should NOT be a silent bot behaviour. Convert it into a **presidential DECISION**: when the player's faction holds the besieging corps around an isolated enemy enclave, the President chooses to **OVERRUN** (assault to capture — bloody, displacing, condemned) or **CONTAIN** (siege/squeeze — the historical strangle, slow, emergent release later). This makes the strangle-vs-assault choice the player-AUTHORED moral one — the "authorship of the tragedy" core (memory `player_experience_consequence_loop`, `dynamic_codex_design`).

**Convening:** Game-Designer + Historian. Cross-checked against `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`, `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`, and ICTY findings (Krstić IT-98-33, Karadžić IT-95-5/18, Mladić IT-09-92, Galić IT-98-29, ICJ Bosnia v. Serbia 2007, UN A/54/549).

**Strategy posture (CALIBRATION-LAST):** This is NOT a calibration-moving feature and must not be justified by match-%. The 188w floor (`d311eeac18492683`, anchors 30/30 — `CALIBRATION_MASTER.md`) is a regression GUARD. The bot-side `contain` lanes were shelved precisely because they were calibration-inert; this feature is a soul-system (authored moral choice), not a calibration lever.

---

## 0. What is being replaced and what is reused

The 2026-06-07 design built a **bot-only** 5th `CorpsStance` `contain` driven by `isEnclaveContainable`. The owner is shelving the two outcome-changing lanes (V/A). What survives intact and is **reused**:

- **`isEnclaveContainable(state, osid, besiegingFaction, supplyReach)`** — already shipped, PURE, faction-agnostic predicate (`src/sim/combat/enclave_resilience.ts:596`). Currently feeds only the per-turn diagnostic (`contain_diagnostic.ts`), wired into nothing that affects sim output (Lane 1, byte-identical). **This becomes the trigger predicate for the presidential decision.**
- **`ENCLAVE_DEFINITIONS`** geometry (Ring-1 engine geometry per the gate §1) + `getEnclaveDefForOsid` / `getEnclaveIdForOsid`.
- The BFS isolation signal (`computeSupplyReachabilityOsid` → `isolated_osids`).
- `resilience_start_turn` per enclave (Žepče t30, Srebrenica/Žepa/Teočak t16, Kiseljak/Lašva t40, Goražde/Sarajevo t0).

**The shift:** from a *derived bot stance* to a *presidential decision card*. The bot retains its current behaviour for AI factions (it already assaults/contains via existing ops + stance); the DECISION surfaces ONLY for the **player's** faction, and ONLY where `isEnclaveContainable` is true. This is the deliberate choice the owner wants the player to author.

---

## 1. Trigger — when the decision surfaces

The card surfaces in the **Presidential Decision Room** (the act-host of the 5-lever convergence, `PresidentialDecisionRoomPanel.tsx`; `presidentialDecisionRoom.ts`) under **category 5 "Conscience & Atrocity"** (the §6-protected category, deliberately separate from War Direction — Presidential Command Surface design §9). It is gated by a pure predicate on `GameState`, evaluated per-turn:

A `(playerFaction, enclave)` pair is **decidable** when ALL hold (reads only existing data — no new fields, no scenario tuning, no OSID override):

1. **Player is the besieger.** `state.meta.player_faction` holds the besieging corps; the enclave's `faction` ≠ `player_faction`. (Bot-vs-bot enclaves never surface a player card; bots keep existing behaviour.)
2. **`isEnclaveContainable(state, coreOsid, playerFaction, supplyReach)` is true** for the enclave's capital/core OSID — i.e. (a) the OSID belongs to an enemy enclave, (b) the enclave faction's BFS report lists it isolated (encirclement signal), (c) the current turn is past `resilience_start_turn`.
3. **Not already authored.** No prior `enclave_decision` record exists for this enclave id (idempotent; one authorship per enclave per run — see §6 state).
4. **A live besieging corps exists.** The player faction has at least one corps with a front sector adjacent to the enclave ring (reuse the existing sector-adjacency the bot stance already computes — `evaluateSectorStances`). No phantom decision for an enclave the player isn't actually besieging.

**Default if the player never decides:** the enclave remains in its current emergent state (the bot/engine does NOT auto-overrun the player's enclave on their behalf — the absence of an OVERRUN directive means CONTAIN-by-default, i.e. the historical strangle). Authoring CONTAIN explicitly and never-deciding are the same mechanical path; the difference is whether the player has *seen* the choice (which matters for the Authored-Choices ledger and the §6 awareness requirement, §2c).

**Faction-asymmetric surfacing** (data-derived, never hardcoded outcome):
- **RS besieging an eastern Bosniak enclave** (Srebrenica/Žepa/Goražde) — the §6-eastern case (§5). The card carries the heaviest framing and the genocide-coupling constraint.
- **RBiH besieging an HVO pocket** (Žepče/Lašva/Kiseljak) — the §6-lighter case; Ahmići/Stupni Do are Ring-2, NOT ruptures (gate §2 roster). Still an atrocity-cost decision, but no genocide rupture couples.
- **Cost framing** is faction-asymmetric via the *existing* patron/officer-disposition machinery (RS insubordination/blockade risk; RBiH firmer control; HRHB patron-gated) — exactly as the 5 levers already are (Presidential Command Surface §5). No new asymmetry table; read the existing Diplomacy bands + officer disposition.

---

## 2. The OVERRUN path — cost model

OVERRUN is a presidential **directive** (a new `lever: 'overrun_enclave'` on the existing `PresidentialDecisionRoomDirective` union, or a dedicated decision-surface — build-time choice, §9). Confirming it does NOT itself flip control: it **lifts the besieger's restraint and authorizes the assault**, which then flows through the **existing, already-tested combat path** (the corps generates the assault axis against the enclave core; the resilience-defense bonus still applies; the fall — if it happens — is a normal control-flip). The directive cannot create a flip, a reward, or a casualty by itself; it only removes the restraint. (Mirrors the contain-design bright line §5: "the mechanic only ever removes/adds an attack the bot would generate; the fall flows through the existing combat path.")

Three cost components, all surfaced on the card BEFORE confirm (the §6 awareness requirement):

**2a. Military casualties (your own troops) — tied to equipment-asymmetry / casualty realism.**
Overrunning a dug-in, resilience-hardened pocket is bloody. The cost is NOT a flat number on the card; it is the *emergent* casualty outcome of the existing combat model (the resilience defense bonus `getEnclaveDefenseBonus` + garrison power `getEnclaveGarrisonPower` + the ADR-0007 Path A attrition retune, `CALIBRATION_MASTER.md` PR-1). The card shows a **projection** (a casualty band, drawn from the same predictor the officer pushback uses — `checkLaunchFeasibility` / force-eval), framed as the Chief of Staff's warning: *"V Corps estimates [N]–[M] killed and wounded to take the pocket; the defenders are dug in."* This reuses the force-op pushback surface (Presidential Command Surface §2, the disposition-tinted objection that already shows before force-launch confirm). **No new casualty math** — the realism is already in the combat model; the decision just exposes it as a stake.

**2b. Civilian displacement / death — the §6 surface.**
The fall of an isolated enclave through assault produces displacement and civilian casualties through the **existing** Ring-1 machinery: `src/state/displacement.ts` (the captured municipalities register `displaced_out` / `lost_population`), `seedDisplacementTimerOnFlip`, and — where paramilitaries are present — `paramilitary_sweep.ts` incrementing `war_crimes_events`. The card shows the projected civilian stake as an **integer count, never a percentage or rate** (gate §4: "8,000 is 8,000; not 0.15% of the prewar population"). The decision does NOT introduce a new civilian-casualty model and does NOT let the player select *which* civilians (gate Ring-3 #1, #5). It authorizes the assault; the displacement/casualty is the consequence the existing systems produce.

**2c. Explicit player AWARENESS of the atrocity that follows.**
The card text — in the §4-compliant historical/prosecutorial register (third person, ICTY-cited, no euphemism, no humour) — states plainly what an assault on this specific isolated pocket means, drawing on the relevant ICTY/ICJ record (for the eastern case: the Srebrenica arc, Krstić genocide finding, ICJ 2007). The player cannot OVERRUN *unknowingly*. This is the "authorship of the tragedy" requirement made mechanical: the confirm step is the moment of authorship, recorded.

**2d. The consequence: condemnation + standing/patron hit, NEVER a reward.**
- The OVERRUN authorship is recorded as an **authored choice** (seeds `consequenceReceipts`, surfaces in the Authored-Choices ledger — the repurposed EventLog, Presidential Command Surface §3). This is browsable "what you authored," never celebratory.
- It carries a **patron-confidence + international-standing hit** through the existing dimension channels (the same channels the paramilitary-policy `always_allow` path and the atrocity events already move). Negative-or-neutral only.
- **For the §6-eastern Srebrenica case specifically:** the fall flows to the EXISTING `srebrenica_genocide_1995` rupture predicate (`rupture_consequences.ts:66` — RS controls `op:srebrenica:srebrenica_2` + `srebrenica_enclave_formed` + turn ≥140). OVERRUN does NOT bypass, duplicate, or pre-empt that rupture; it makes the player the proximate author of satisfying its mechanical condition. The condemnation is the rupture's existing `genocide_condemnation` flag → `failure` outcome class (scoring §2). **It is never softened by the player having "chosen via a card."**
- **The Pyrrhic score NEVER inverts** (gate Ring-3 #4; scoring §6 — higher casualties/war-crimes/displacement are always neutral-or-worse). OVERRUN is, in scoring terms, strictly dominated by CONTAIN on every dimension that moves. There is no territory reward that offsets it into a net-positive verdict (scoring §1: a 95/100 with `genocide_condemnation` is still `failure`).

---

## 3. The CONTAIN path — the strangle

CONTAIN authors the historical restraint: the besieging corps maintains pressure on the ring but does NOT generate the assault axis into the core. Mechanically this is the **shelved bot `contain` stance applied as a player-authored directive** — garrison the ring + let the existing supply-isolation starve the pocket; suppress offensive target-generation into the enclave core (the suppression chokepoints from the contain design §1: `buildOffensiveTargets` filter + `evaluateSectorStances` → screening). No new pressure mechanic.

**Costs / character:**
- **Lower immediate military cost** — the corps is not throwing itself at a hardened pocket; freed brigades hold the ring (the contain design §3 SCOPE-RISK note applies: freed brigades must not silently redeploy and tip the western cascade — *measure at build time, do not assume*).
- **Slow, leaves the pocket isolated** — the enclave persists, supply-strangled, civilians trapped. This is NOT a clean or moral outcome; it is the historical siege (Sarajevo/Galić framing, Goražde). The Cost Ledger and Authored-Choices ledger record it as a siege, not a mercy.
- **Emergent release later** — CONTAIN does not freeze the war forever. Release flows through the EXISTING machinery, per faction-pair (§5):
  - **RS-eastern:** the 1995-pivot emergent release (turn ≥140 / defender collapse / supply-critical+isolation-exhaustion) — see §5/§4. The pocket can still fall on the historical timeline even if the player chose CONTAIN earlier; CONTAIN delays the assault, it does not grant the player the power to permanently prevent the historical fall (the §6 bright line, §4a).
  - **RBiH-HVO:** the Washington-Agreement ceasefire (`state.political.rbih_hrhb_state.washington_signed`) freezes the RBiH↔HRHB war via the existing `isRbihHrhbCombatEnabled` / `areRbihHrhbAllied` machinery — the pocket stays HVO-held, matching painted Oct-1995.

**The reward for CONTAIN is the ABSENCE of a condemnation flag — never a badge** (gate Ring-3 #10). CONTAIN is not "the good ending." It is the less-condemned siege. The verdict surface does not award restraint; it merely omits the taint that OVERRUN would have added.

---

## 4. §6 BRIGHT LINES (non-negotiable) and how each is enforced

These are stated explicitly because this feature sits in the highest tier of the canon hierarchy (Sensitive-History gate, Tier 2). Any drift returns here for re-negotiation, not quiet reinterpretation (gate §0).

### (a) The historical Srebrenica/Žepa genocide MUST still occur on the historical path; the rupture stays locked/idempotent; the player's choice can neither ERASE the genocide nor "avoid it to win."

**Enforcement:**
- The `srebrenica_genocide_1995` rupture predicate (`rupture_consequences.ts`) is **untouched**. It fires on its existing mechanical condition (RS controls `srebrenica_2` + enclave-formed + turn ≥140), idempotent and permanent (gate §2 criterion-3; §1 Ring-1 rupture roster).
- **OVERRUN-eastern** routes the fall through the normal control-flip → the rupture fires as it does today. The player is the author; the record is identical and not softened.
- **CONTAIN-eastern does NOT permanently prevent the historical fall.** The 1995-pivot release (§3, §5) MUST fire on the historical path so that Srebrenica still falls and the rupture still records. This is the exact constraint from the shelved Lane V (contain design §2a): "contain MUST NOT prevent Srebrenica from falling on the historical path." A player choosing CONTAIN in 1993 delays the assault; it does not hand the player a button that erases July 1995. **Build-time regression test (mandatory, gate §6 / contain design §4 Lane V):** on the historical path, with the player as RS having authored CONTAIN, assert `srebrenica_2` still flips to RS in the 1995 window and `srebrenica_genocide_1995` still records.
- **Counterfactual divergence is recorded, not rewarded.** If the modeled war genuinely diverges (the enclave is held through the recorded turn by ordinary military means and the §2-criterion-3 condition is never satisfied), the rupture correctly does NOT fire (gate §1 Ring-3 #11; §2 criterion-3 — no calendar-window substitution). The divergence is recorded by the EXISTING `enclave_defended` ghost-entry register (gate §5 — `predEnclaveDefended` / `data/codex/ghost_entries/enclave_defended.md`), in historical voice, with no "less deadly than history" framing and no badge. The presidential decision adds NO new counterfactual recorder; it reuses this canonical pattern.

### (b) OVERRUN NEVER yields a net-positive verdict; the reward for restraint is the ABSENCE of condemnation, never a badge.

**Enforcement:** The Pyrrhic score does not invert under any input (gate Ring-3 #4; scoring §6 monotonicity). Condemnation flags are checked before territorial grades (scoring §2 classification order) — a `genocide_condemnation` forces `failure` regardless of territory. CONTAIN produces no positive flag, no score bonus, no achievement string (gate §4 forbidden: "no War Criminal badges, no Pacifist trophies"). The two paths are asymmetric only in that OVERRUN can ADD a taint; neither path can EARN a reward.

### (c) No civilian-targeting "reward" / no target selection.

**Enforcement:** OVERRUN authorizes an assault on a *military objective* (the enclave core OSID, an existing combat target). The player never selects civilians, populations, or atrocity targets (gate Ring-3 #1, #5, #8). There is no "level of brutality" slider, no paramilitary-doctrine submenu (gate §3 "what it must never become"). Displacement/casualty is the *consequence* the existing displacement + paramilitary systems produce, framed as cost — never as a tunable trade ("X% territory for Y standing" is forbidden, gate §3).

### (d) The decision must read as tragic authorship, not power fantasy.

**Enforcement:** §4-compliant wording throughout (historical/prosecutorial register, third person, ICTY citations, integer civilian counts, no euphemism, no humour, no achievement language). The card lives in the **Conscience & Atrocity** category, deliberately walled off from War Direction (Presidential Command Surface §9). Command-Authority scarcity (the existing ~2 weighty directives/turn cap) means this is not a casual click. The confirm step is framed as authorship of a tragedy, and the receipt surfaces in the Authored-Choices ledger as "what you authored" — not as a victory.

---

## 5. The §6-eastern (VRS-vs-Bosniak, genocide-coupled) vs ARBiH-vs-HVO split

The two faction-pairs share the trigger predicate (`isEnclaveContainable`) and the two-path structure, but differ in canon sensitivity and release condition. This split is inherited from the shelved contain design §2 and is the heart of the §6 care.

| | **VRS-eastern (RS vs Srebrenica/Žepa/Goražde)** | **ARBiH-HVO (RBiH vs Žepče/Lašva/Kiseljak)** |
|---|---|---|
| Rupture coupling | **YES** — `srebrenica_genocide_1995` (Krstić/Karadžić/Mladić/ICJ 2007) | **None** — Ahmići/Stupni Do are Ring-2, explicitly NOT ruptures (gate §2 roster) |
| OVERRUN consequence | Fall routes to existing rupture → `genocide_condemnation` → `failure`. Player is proximate author; DEEPENS the condemnation record (the player authored what history's perpetrators did) — never sanitizes it. | Displacement + standing/patron hit + authored-choice record; atrocity-event content (Ring-2). No genocide rupture. |
| CONTAIN release | 1995-pivot flag/collapse/exhaustion — **MUST fire so Srebrenica still falls + records on the historical path.** Goražde historically did NOT fall (UNPROFOR / April-1994 NATO ultimatum) → CONTAIN there has no forced release. | `washington_signed` ceasefire freeze → pocket stays HVO-held (matches painted Oct-1995). |
| Canon tier | Sensitive-History gate Ring-1; **§6 Pyrrhic-panel "no reward for atrocity" sign-off (bright line surfaces to the owner)** | Ordinary atrocity-event sensitivity; lighter (but still §6-touching) sign-off |
| Failure mode if mis-built | **Genocide erased from the record, or rewarded** (unacceptable) | Calibration/atrocity-framing miss (recoverable) |

**The two hard constraints on the eastern case (restated for emphasis):**
1. **Player-as-RS OVERRUN must NOT sanitize or reward Srebrenica.** Routing through the existing rupture + the §4-compliant prosecutorial framing + the non-inverting score ensures OVERRUN here is the most-condemned action in the game. The card text names it: the Srebrenica genocide, Krstić IT-98-33, ICJ 2007. The player authored it; the game says so.
2. **Player-as-RS CONTAIN must NOT let the player erase the historical fall.** The 1995-pivot release is mandatory on the historical path. CONTAIN is a delay/restraint authorship, not an "avoid the genocide and win" button. A genuinely divergent modeled war (enclave held by military means, rupture condition never met) is recorded by the ghost-entry register as counterfactual — not as a player achievement, and the Ring-2 historical record remains canonical regardless.

---

## 6. Verdict / condemnation wiring + state

**No new condemnation flag and no new rupture** (adding either is a capital-R Decision, gate §2 — the default is "do not add one"). The feature reuses:
- `srebrenica_genocide_1995` rupture (eastern OVERRUN, unchanged predicate).
- The existing dimension channels for patron-confidence / international-standing hits (the same the paramilitary-policy and atrocity events use).
- `war_crimes_events`, `displacement.ts`, `consequenceReceipts` for the authored-choice record.

**Minimal new state (build-time, for owner ratification):** a per-enclave authorship marker so the decision is idempotent (one authorship per enclave per run) and the Authored-Choices ledger / ghost-entry register can read it — e.g. `state.political.enclave_decisions: Record<enclaveId, { authored_turn: number; choice: 'overrun' | 'contain'; player_faction: FactionId }>`. This is a *record of what the player authored*, NOT a new condemnation surface and NOT tradeable at Dayton (gate Ring-3 #3 — no negotiable condemnation). It must be modeled deterministically (sorted iteration, no wall-clock) and round-tripped through `save_migration` like other political state. **Whether this field is acceptable, or whether the authorship can be derived from existing `consequenceReceipts` + rupture records without a new field, is an OPEN QUESTION for owner ratification (§11).**

---

## 7. Faction asymmetry (from data, never hardcoded outcome)

Consistent with the 5 shipped levers (Presidential Command Surface §5; player_command_model memory):
- **RS:** OVERRUN/CONTAIN authorization carries insubordination + patron-blockade risk via the existing officer-disposition + Diplomacy bands. RS bots are most likely to assault historically; the player-RS card surfaces the heaviest §6 framing.
- **RBiH:** firmest presidential control (least pushback friction); the HVO-pocket card is the §6-lighter variant.
- **HRHB:** patron-gated (the player rarely besieges an enclave as HRHB historically; the predicate simply doesn't fire absent an HVO-besieged enemy enclave — emergent, not special-cased).

All asymmetry reads existing data (disposition, Diplomacy bands, patron state). No new asymmetry table; no hardcoded outcome.

---

## 8. Reuse of existing surfaces (summary)

| Need | Reused surface | File |
|---|---|---|
| Trigger predicate | `isEnclaveContainable` (already shipped, PURE, faction-agnostic) | `src/sim/combat/enclave_resilience.ts:596` |
| Enclave geometry | `ENCLAVE_DEFINITIONS`, `getEnclaveDefForOsid` | `src/sim/combat/enclave_resilience.ts` |
| Isolation signal | `computeSupplyReachabilityOsid` → `isolated_osids` | `src/state/supply_reachability_osid.ts` |
| Decision surface (host) | Presidential Decision Room, Conscience & Atrocity category | `PresidentialDecisionRoomPanel.tsx`, `presidentialDecisionRoom.ts`, `presidentialCategories.ts` |
| Directive contract | `PresidentialDecisionRoomDirective` (add `overrun_enclave` / `contain_enclave` levers) | `presidentialDecisionRoom.ts:39` |
| Confirm + pushback | DirectiveCard act-flow (officer objection → confirm) | `army_hq/DirectiveCard.tsx` |
| Casualty projection | force-op pushback predictor (`checkLaunchFeasibility` / force-eval) | combat predictor |
| OVERRUN mechanism | lift restraint → existing assault axis → existing control-flip combat path | `commander/emit.ts` (`buildOffensiveTargets`), `bot_corps_directives.ts` (`evaluateSectorStances`) |
| CONTAIN mechanism | shelved `contain` stance applied as player directive (garrison ring + suppress core targets) | per contain design §1 |
| Displacement / war-crimes | existing Ring-1 machinery | `src/state/displacement.ts`, `paramilitary_sweep.ts` |
| Eastern condemnation | existing rupture (unchanged) | `src/sim/negotiation/rupture_consequences.ts:66` |
| Authored-choice record | `consequenceReceipts` + Authored-Choices ledger | `data/consequenceReceipts.ts`, repurposed EventLog (Pres. Command Surface §3) |
| Counterfactual record | `enclave_defended` ghost entry (canonical pattern) | `dynamic_section_builder.ts` (`predEnclaveDefended`), `data/codex/ghost_entries/enclave_defended.md` |
| Verdict / no-invert | scoring §2 classification order + §6 monotonicity | `src/sim/negotiation/scoring.ts`, `VICTORY_AND_PYRRHIC_SCORING.md` |
| Front-visit reachability precedent | supply-connectivity gate (cut-off enclaves register supply-isolated) | Pres. Command Surface §10 |

---

## 9. Build-lane shape (for the eventual build — NOT authorized here)

If/when ratified, build in the contain-design discipline (one change per run, §6-eastern last):

- **Lane 0 — surface + ARBiH-HVO path (lighter §6).** Wire the Decision Room card + the `contain`/`overrun` directives for the RBiH-vs-HVO case only. Washington-freeze release. Light gate.
- **Lane 1 — VRS-eastern path (FULL §6).** Add the eastern card with the rupture-coupling, the 1995-pivot mandatory release, and the regression test (§4a). Full §6 gate + Pyrrhic §6-panel sign-off (the atrocity-is-never-rewarded bright line surfaces to the owner).
- **Determinism + calibration:** the OVERRUN/CONTAIN *mechanism* changes sim output (it's a real decision), so each lane is a calibration run (40w + 188w, dual-horizon — the false-green-on-188w lesson, memory `feedback_188w_validate_combat_changes_before_merge`). The player-facing card itself is byte-identical to headless/bot runs (bots never see it). Whether the bot retains the existing assault behaviour or also adopts a default-CONTAIN is an OPEN QUESTION (§11).
- **Build-time decision:** new directive levers on the existing union vs a dedicated decision-surface in `decisionSurfaceRegistry` — UI-architecture call for `/ui-ux-developer` at build time.

---

## 10. ⚠️ OWNER + §6 SIGN-OFF REQUIRED before build

This feature touches: enclave mechanics, a rupture's satisfiability, the player-authorized atrocity surface, and the verdict. Per gate §6, the required sign-off (NON-DELEGABLE for the eastern case) is:

| Aspect | Required sign-off |
|---|---|
| New player-facing atrocity-authorization surface | **User approval — NOT delegable** (gate §6 last row: "any change that could produce a reward-for-atrocity effect") |
| Eastern (Srebrenica) rupture-coupling + release | `/historian` (ICTY/ICJ/BB-cited) + `/war-or-game` + `/game-designer` + **user approval** |
| Enclave-mechanics change (Srebrenica/Žepa specifically) | `/gameplay-programmer` + `/historian` |
| Decision-surface UI + Conscience category | `/game-designer` + `/ui-ux-developer` + user review before implementation |
| Verdict / no-invert guarantee | `/game-designer` (verify no Ring-3 surface created by accident) |
| Cost Ledger / card wording | `/narrative-designer` + `/historian` (§4 register) |
| New `enclave_decisions` state field (if added) | `/historian` + `/game-designer` + user approval (treated as new condemnation-adjacent surface) |

**Escalation (gate §6):** any dispute escalates to the user. When in doubt, the answer is "no, not yet, bring it to the user." This doc is a DESIGN-DRAFT; it authorizes NO code.

---

## 11. Open questions for owner ratification

1. **New state field vs derived.** Does `state.political.enclave_decisions` get added (idempotency + ledger read), or must authorship be derived from existing `consequenceReceipts` + rupture records to avoid a new condemnation-adjacent field? (§6)
2. **Bot default after shelving Lanes V/A.** With the bot-only contain lanes shelved, do AI factions keep the *current* assault behaviour (which is calibration-flat at the 30/30 floor), or does the shelving also remove the diagnostic-only predicate's intended future bot use? Confirm the floor stays `d311eeac` byte-identical for headless/bot runs. (§9)
3. **CONTAIN-eastern release semantics.** Is "CONTAIN delays but the 1995-pivot release still forces the historical fall" the owner's intended player experience — i.e. the player-as-RS *cannot* permanently save Srebrenica via CONTAIN, only via a genuinely divergent military hold that never satisfies the rupture condition? (§5 constraint 2)
4. **Goražde / Sarajevo / Bihać / Teočak.** The predicate is faction-agnostic over all 9 enclaves. For RS besieging Goražde (historically held), CONTAIN has no forced release. Should OVERRUN even be *offered* for enclaves history never saw fall (Goražde/Bihać), or should the card surface only for the documented-fall pockets? (Risk: offering OVERRUN-Goražde invites an ahistorical atrocity the record has no rupture for — recorded by ghost-entry, but is that the intent?) (§1, §5)
5. **Does OVERRUN ever surface for the *defender's* enclaves?** Confirmed NO by the predicate (enclave.faction ≠ player_faction) — but worth explicit owner confirmation that the player never gets an "abandon my own enclave" inverse card here. (§1)
6. **Directive lever vs dedicated decision-surface** — UI architecture (build-time, §9).

---

## 12. Provenance

Owner direction 2026-06-09 (shelve bot Lanes V #339 / A #341; build presidential decision). Supersedes the outcome-changing lanes of `docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md` (the `isEnclaveContainable` predicate + diagnostic survive as reused infrastructure). Canon: `SENSITIVE_HISTORY_DESIGN_GATE.md` (§1 rings, §2 rupture rule, §3 player-authorized war-crime surface, §4 wording, §5 ghost entries, §6 sign-off), `VICTORY_AND_PYRRHIC_SCORING.md` (§1 thesis, §2 classification order, §6 monotonicity). Surface: `2026-06-01-presidential-command-surface-design.md` (Decision Room as act-host, Conscience category §9, front-visit reachability precedent §10). Memory: `player_experience_consequence_loop`, `dynamic_codex_design`, `player_command_model`, `enclave_mechanics_research`, `calibration_central_bosnia_hrhb_ceiling`, `feedback_188w_validate_combat_changes_before_merge`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
