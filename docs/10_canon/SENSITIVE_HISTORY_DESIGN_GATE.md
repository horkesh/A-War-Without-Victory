# Sensitive History Design Gate — Canonical

**Status:** CANON (v0.9.0 gate — moral and design)
**Last Updated:** 2026-04-16
**Authority:** Canon hierarchy, Tier 2 (above Rulebook, below Engine Invariants)
**Owners:** Game Designer, Historian, Product Manager, Documentation Specialist
**Supersedes:** open question #7 in `MASTER_ROADMAP.md` ("Srebrenica — how do we handle the genocide mechanically and narratively?")
**Referenced by:** `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`, `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md`, every future event/rupture/Cost Ledger content PR

---

## 0. Purpose

This is not a feature document. It is a **pre-gold moral and design gate**.

Some topics cannot remain in "open questions" until the end. AWWV depicts the 1992-1995 Bosnian War — a war that included genocide, systematic ethnic cleansing, siege-starvation, and mass atrocity convicted by the International Criminal Tribunal for the former Yugoslavia. A negative-sum wargame that takes its subject seriously must settle the moral question *before* implementation work continues, not after.

This document is the settled answer. Any future work that drifts from it must come back here for explicit re-negotiation, not quiet reinterpretation.

**Core position:** AWWV depicts atrocity without letting the player optimize against it. The game refuses to turn genocide into a manipulable cost-benefit system. Atrocity is a **consequence**, not a **lever**.

---

## 1. The Three Rings

Every depiction of sensitive history in AWWV lives in exactly one of three rings. The ring determines what the system can do with it.

### Ring 1 — Modeled mechanically

The game simulates these as structured state:

- **Enclaves** (`src/sim/combat/enclave_resilience.ts`) — Sarajevo, Bihać, Srebrenica, Žepa, Goražde, and HRHB pockets have explicit OSIDs, resilience caps, supply-linked decay/growth, and garrison mechanics. Enclaves fall when control flips through combat.
- **Displacement** (`src/state/displacement.ts`) — municipalities track `original_population`, `displaced_out`, `displaced_in`, `lost_population`. Triggered by supply starvation, encirclement, front breaches, or paramilitary capture.
- **Paramilitary sweeps** (`src/sim/combat/paramilitary_sweep.ts`) — rear pocket cleanup and adjacent-offensive modes. Each capture increments `war_crimes_events` and records civilian casualties.
- **War crimes counter** — `FactionCapital.war_crimes_events` increments with every paramilitary capture. Feeds into grade anchors (see `VICTORY_AND_PYRRHIC_SCORING.md` §3.2).
- **Rupture consequence** — exactly one: `srebrenica_genocide_1995`, fired when the Srebrenica OSID falls to RS in the 1995 timeframe with enclave formed flag set. Propagates `genocide_condemnation` flag. Locked, idempotent, permanent.

**Implementation-note (data-not-comment name-pool exclusion, 2026-05-07):** Reserved canonical names — operations, formations, event-IDs, persona-IDs — that bot/AI generators could randomly select MUST be excluded from generator data pools by the data files themselves (e.g., `src/sim/combat/operation_names.ts`), not by source comments. Comment-claims-of-exclusion that the data does not enforce produce phantom canon-violations that masquerade as trigger-predicate bugs. Reference: Stupčanica-95 name-collision incident (`759a35cd`, 2026-05-07) — `Operacija Stupčanica` had appeared at w27 not via the trigger predicate but via the bot operation-name pool. Static tests enforcing the exclusion are mandatory. See `docs/10_canon/FORAWWV.md` §XI.2 for the full canonical statement.

### Ring 2 — Represented narratively

The game depicts these in player-facing content, drawing on ICTY judgments and primary sources:

- **Historical events** in `data/scenarios/events/` — Ahmići massacre, Markale I/II shellings, Bijeljina massacre, Kravica raid, Stupni Do, Grabovica/Uždol, Tuzla Gate, Cerska breakthrough, Srebrenica arc (enclave forms → shelling → demilitarization → UN 819 → Morillon → fall).
- **Historical essays** in `data/scenarios/essays/` — ICTY-cited essays for every major atrocity, including the full Srebrenica arc with Krstić, Karadžić, Mladić tribunal findings and the ICJ 2007 genocide declaration.
- **Chronicle entries and Wrapped slides** — endgame narrative drawing on `costLedger`, `historicalComparison`, and `rupture_consequences`.
- **Cost Ledger prose and milestone comparison rows** — prosecutorial / comparative endgame voice, constrained by §4.

### Ring 3 — Refused

The game will not model, represent, or expose these. This list is exhaustive and binding.

1. **No "commit genocide" decision tree.** Genocide is never a button, a slider, a multi-option event, or a player-authorized instruction. The player does not issue orders like "cleanse settlement X." The player does not select targets for systematic atrocity.
2. **No concentration camp system.** Detention facilities, systematic abuse, or POW-camp mechanics are not modeled as a separate subsystem. The aggregate outcomes are captured by displacement and casualty ledgers; the process is not.
3. **No negotiable condemnation.** Once a rupture is recorded, it is permanent. Condemnation flags are never tradeable at Dayton, never removable through subsequent diplomacy, never mitigable by patron intervention.
4. **No body-count optimization surface.** The Pyrrhic score does not invert under any input. Higher casualties, more war crimes, and more displacement are always neutral-or-worse for every dimension. See `VICTORY_AND_PYRRHIC_SCORING.md` §6.
5. **No "atrocity efficiency" metric.** Paramilitary deployments are never framed as a dominant strategy. The bot AI uses them where historically documented; the UI never suggests "deploy paramilitaries for territorial efficiency."
6. **No alternate-history minimization.** Essays, Chronicle, and Wrapped never frame ahistorical outcomes as "at least it wasn't as bad as the real war." The reverse framing is allowed — "the real war was worse than your path."
7. **No ranking factions by atrocity.** The verdict is per-faction against its own grade anchors. There is no leaderboard of "who killed the most civilians."
8. **No granular attribution of individual victims.** Named civilian victims do not appear as simulated entities with agency. Essays may cite named historical persons in their roles as victims of documented historical events; the simulation does not.
9. **No "justified atrocity" framing.** Retaliatory killings (Kravica, Grabovica/Uždol) are depicted as war crimes in their own right, not as moral equivalence or karmic balancing. All perpetrators are named.
10. **No gamified "prevent genocide" mechanic.** The player cannot earn points for preventing Srebrenica; they can only keep the enclave intact through ordinary military means. The reward is the absence of a `genocide_condemnation` flag, not a badge.
11. **No calendar-driven atrocity recording.** Rupture events fire only on mechanical c2 satisfaction (the §2 criterion-3 game-state condition). Ahistorical campaigns where the c2 condition is not mechanically satisfied carry **no rupture flag** in the verdict packet — historical findings remain in Ring 2 (essays + codex) regardless. The historical calendar alone is not a trigger; the modeled war must produce the trigger condition. (Resolution of Q-CANON-RUPT-4, recommendation §4 Path (d), 2026-05-04.)

**Mechanical enforcement — Ring-3 enabling rejection.** Beyond the design refusals above, the event loader mechanically *rejects* runtime-enabling a Ring-3 sensitive-history family event: no event response option, counterfactual branch, or `enables_events`/`closes_events` directive may open a Ring-3 sensitive-family event. The canonical family set is `RING3_SENSITIVE_FAMILIES` in `src/sim/events/event_families.ts` (with `isRing3SensitiveFamily` prefix matching), enforced by `validateRing3EnablingRejection` at load. This is the rule the codebase and shipped event `source_note`s cite as **"v1.3 packet §3.6 (Ring-3 enabling rejection)"** and the related camp-exposure **named-row carve-out**; this gate document is their canonical home. *(Reconciled 2026-06-07 — prior code/source-note references to a "§3.6" / "§1.3" packet predate this consolidation into the gate doc; the rule itself is unchanged and has been enforced in code throughout.)*

---

## 2. Rupture Expansion Rule

Ruptures are the highest-tier sensitive-history construct in the codebase. They produce locked condemnation flags that cap faction grades and force specific outcome classes.

A historical event becomes eligible for rupture status **only if it meets all four criteria**:

1. **Mass scale** — >1,000 civilian deaths in a bounded event, or systematic over a bounded timeframe.
2. **International legal finding** — ICTY conviction (any of genocide, crimes against humanity, grave breaches) or an ICJ/UN finding of equivalent weight.
3. **Specific trigger condition** — the rupture fires on a discrete, deterministic game-state condition (control of a specific OSID, presence of a flag, turn range), not a cumulative threshold. **This is the BINDING criterion: ruptures fire only on emergent satisfaction of the discrete game-state condition. No calendar-window heuristic substitution is permitted — the historical calendar alone cannot stand in for the OSID/flag/turn predicate.** Counterfactual silence (the rupture not firing because the modeled war produced no fall) is canonically correct and is the responsibility of the §3 ghost-entry register, not the rupture evaluator. (Q-CANON-RUPT-4 resolution, recommendation §5, 2026-05-04.)
4. **Non-reversible** — once recorded, the event is a fact of the world for the remainder of the run.

### Current rupture roster

| Rupture ID | Event | Criteria check |
|---|---|---|
| `srebrenica_genocide_1995` | Fall of Srebrenica safe area, July 1995 | 8,000+ killed ✓; Krstić genocide conviction, Karadžić, Mladić, ICJ 2007 ✓; RS controls `op:srebrenica:srebrenica_2` + enclave formed + turn ≥140 ✓; locked ✓ |

### Events that are **not** ruptures (and why)

| Event | Deaths (approx.) | ICTY finding | Why not a rupture |
|---|---|---|---|
| Ahmići massacre | ~116 | Blaškić, Kordić, Kupreškić convictions | Scale below mass threshold; operational-level atrocity |
| Markale I/II shellings | 68 + 43 | Findings within Sarajevo siege case law | Part of ongoing siege; no discrete single-event legal finding |
| Bijeljina massacre | ~48 | Arkan indictment (unprosecuted, died 2000) | Scale below mass threshold; no ICTY conviction |
| Stupni Do | ~38 | Kordić conviction | Scale below mass threshold |
| Grabovica / Uždol | 33 + 40 | Cross-faction atrocity records | Scale below mass threshold |
| Kravica raid | 30-35 VRS + 11-13 Serb civilians | Orić indictment (acquitted on command responsibility) | Retaliatory, scale below mass threshold |
| Tuzla Gate | ~71 | Mladić conviction within broader indictment | Part of broader siege-shelling case law |

**These are Ring 2 (narrative), not Ring 3 (refused).** The game depicts them fully — in events, essays, Chronicle, Wrapped. It does not elevate them to locked Ring 1 consequences because they do not meet all four criteria. This is a design decision, not a gap.

### Adding a new rupture

A new rupture requires:

1. All four criteria demonstrably met, cited by `/historian`.
2. A concrete trigger condition that fits into `evaluateRuptureConsequences()` as a pure predicate on `GameState`.
3. Grade-anchor impact analysis — how does the new condemnation flag interact with existing faction grades?
4. Cost Ledger wording draft for the rupture description.
5. Pyrrhic §6-panel sign-off: `/historian` + scenario-tester/calibration + Engine/systems + Red-team (Historian/war-or-game/game-designer seats), unanimous GO = signature.
6. A BLOCK or split panel verdict surfaces to the owner.

Adding a rupture is a capital-R Decision. The default is: do not add one.

---

## 3. Player-Authorized War Crime Surface (Ring 1 — explicit)

The `paramilitary_policy` field on `GameState` (`'always_allow' | 'always_deny' | 'ask'`) is the **only** player-facing surface that authorizes war crimes. This is deliberate.

**What it means:**
- `always_allow` — the player is endorsing every paramilitary capture's civilian cost. The game does not hide or sugar-coat this. Every approved sweep records civilian casualties and increments `war_crimes_events`.
- `always_deny` — paramilitaries do not spawn for the player faction. Bot factions continue to use them historically.
- `ask` — the player sees each pending request with civilian casualty projection and decides one at a time. This is the default.

**What it must never become:**
- A "level of brutality" slider with five or ten positions
- A "paramilitary doctrine" submenu with specialized unit types (execution squads, camp guards, etc.)
- An optimization surface where the player chooses *which* populations to target
- A risk/reward tooltip that frames atrocity as a trade ("50% chance of +5% territory, -3% international standing")

**UI rule:** The `ask` mode presents each decision with: the target population, projected civilian casualties, war-crime-event increment, international standing impact, and historical-citation context. It does not round numbers to make the decision look small. It does not phrase the decision as a military necessity.

---

## 4. Cost Ledger Wording Constraints

The Cost Ledger is the game's closing summary — the closest thing AWWV has to a prosecutorial voice. Its wording carries moral weight. These constraints are binding on every string rendered by `WarCostSummary.tsx`, `VerdictScreen.tsx` including milestone comparison rows, Chronicle endgame entries, and Wrapped slides.

### Required

- **Historical voice, third-person.** Not "you caused" or "you ordered." The war happened; the ledger records it.
- **ICTY case citations** where applicable: Krstić (IT-98-33-T), Karadžić (IT-95-5/18-T), Mladić (IT-09-92-T), Blaškić (IT-95-14-T), Kordić (IT-95-14/2-T), Kupreškić (IT-95-16-T), Orić (IT-03-68), ICJ Bosnia v. Serbia (2007), UN A/54/549 (1999).
- **Specific names for specific atrocities.** "Srebrenica genocide," not "a mass killing." "Ahmići massacre," not "a village incident."
- **Civilian casualty counts as integers**, not as percentages or rates. 8,000 is 8,000; not "0.15% of the prewar population."

### Forbidden

- **Euphemisms.** "Ethnic cleansing" not "demographic shift." "Mass killing" not "casualties." "Genocide" when a tribunal has found genocide.
- **Trivializing comparisons.** "85% as bad as history" is not allowed. "Your war was less deadly than the historical baseline" is not allowed.
- **Minimization.** "Despite some losses," "some international condemnation," "a few war crimes" are not allowed.
- **Player-second-person framing.** The ledger speaks to the player about what happened, not about what the player did. "The war produced X" not "you produced X."
- **Achievement-style language.** No "War Criminal" badges, no "Pacifist" trophies, no unlock messages at endgame.
- **Humor or ironic distance.** No wry observations, no gallows humor, no deadpan. The voice is serious throughout.

### Tone reference

Draw the register from: ICTY summary judgments, UN investigative reports, ICRC situation reports, the Balkan Battlegrounds historical volumes. Not from: sports commentary, Paradox Interactive endgame summaries, news magazine prose.

---

## 5. Essays and Codex

Historical essays in `data/scenarios/essays/` are Ring 2 representation. They are the place where the game carries the record of what happened. Every ICTY-relevant atrocity has or will have an essay.

### Constraints on essay content

- **ICTY findings cited verbatim or near-verbatim** where the tribunal produced a specific finding.
- **Named historical perpetrators in their documented roles** (Krstić, Karadžić, Mladić, Arkan, Orić, Blaškić, Kordić, etc.).
- **Named historical victims only when the source record names them** and their families have consented (via published memorial sources) or they are public historical figures.
- **No alternate-history essays that minimize real-world events.** A "ghost essay" for a path not taken may describe the path-not-taken outcome; it may not say "the real war was worse" as a comparison.
- **No author voice.** Essays are in the register of historical documentation, not first-person commentary.

### Unlock model

All historical essays are available from scenario start. There is no "unlock the Srebrenica essay by completing the war" mechanic. The historical record is not a reward.

### Dynamic / ghost sections

When a player's war diverges from history (e.g., Srebrenica enclave held), the essay may gain a `dynamic_sections` block that notes the divergence in historical voice: *"In this campaign, the Srebrenica enclave did not fall; the pocket was relieved by ARBiH 2nd Corps on week X."* This is neither celebratory nor minimizing — it is historical recording of the counterfactual.

### Counterfactual register (canonical pattern)

The Mission E `enclave_defended` ghost entry is the §3-compliant counterfactual recorder for sensitive-history divergence. It is the canonical pattern for any future "what the modeled war produced instead of the historical atrocity" annotation:

- **Predicate location:** `src/sim/codex/dynamic_section_builder.ts` — `predEnclaveDefended()` gates emission on the `enclave_held_through_turn` flag (set when ARBiH retains `op:srebrenica:srebrenica_2`, `op:zepa:zepa_2`, `op:gorazde:gorazde_2` at the recorded turn).
- **Narrative location:** `data/codex/ghost_entries/enclave_defended.md` — historical-voice text register, no celebration, no minimization, no "less deadly than history" framing.
- **Canonical role:** This is the §3 register for ahistorical paths where the §1.5 #11 / §2 criterion-3 mechanical condition for a rupture is not satisfied. The Ring 2 historical record (essays + ICTY citations) remains canonical and accessible regardless; the ghost entry observes the divergence without overwriting either layer.

Any future canon-permitted counterfactual recorder (for other Ring-1 sensitive events) must follow this shape: a deterministic predicate on a flag set by the simulation's own observation system, plus a narrative file in the §4-compliant register. (Q-CANON-RUPT-4 resolution, recommendation §5, 2026-05-04.)

---

## 6. Sign-Off Structure

Changes that touch sensitive history require explicit multi-party review. No exceptions.

| Change type | Required sign-off |
|---|---|
| New rupture added | Pyrrhic §6-panel: Historian + scenario-tester/calibration + Engine/systems + Red-team (incl. `/historian` + `/war-or-game` + `/game-designer`), unanimous GO = signature; BLOCK or split surfaces to the owner |
| Change to rupture trigger or description | `/historian` + `/game-designer` |
| New atrocity event | `/historian` + `/narrative-designer` |
| Change to atrocity event content | `/historian` + `/narrative-designer` |
| New condemnation flag | `/historian` + `/game-designer`, Pyrrhic §6-panel sign-off (unanimous GO = signature; BLOCK or split surfaces to the owner) |
| Change to paramilitary policy surface | `/game-designer` + `/ui-ux-developer`, Pyrrhic §6-panel sign-off before implementation (BLOCK or split surfaces to the owner) |
| Cost Ledger wording change | `/narrative-designer` + `/historian` |
| New essay touching atrocity | `/historian` + `/narrative-designer` |
| Change to enclave mechanics | `/gameplay-programmer` + `/historian` (for Srebrenica/Žepa specifically) |
| Any change that could produce a "reward for atrocity" effect | Pyrrhic §6-panel sign-off (Historian + scenario-tester/calibration + Engine/systems + Red-team), unanimous GO required. This is a values bright line, not merely a gate: the atrocity-is-never-rewarded principle, if ever in question, surfaces to the owner. |

### Evidence required for each sign-off

- `/historian` reviews must cite ICTY, ICJ, or published academic-historical sources. BB (Balkan Battlegrounds) is acceptable; Wikipedia is not.
- `/war-or-game` reviews must test the change against "would a real Bosnian War observer find this absurd" — reference REAL_WAR_MASTER.md.
- `/game-designer` reviews must verify the change does not create a Ring 3 refused surface by accident.
- `/narrative-designer` reviews must verify §4 wording constraints are met.

### Escalation

Any sign-off dispute escalates to the Pyrrhic §6-panel for a formal vote. A BLOCK verdict or any split — and any question touching the atrocity-is-never-rewarded bright line — surfaces to the owner. Do not resolve sensitive-history disputes inside role review without panel sign-off. When in doubt, the answer is "no, not yet, bring it to the panel."

---

## 7. What This Document Does Not Cover

This gate is specifically about **sensitive history representation**. Out of scope:

- General gameplay balance (covered in `VICTORY_AND_PYRRHIC_SCORING.md`)
- Officer-level `war_crimes_record` annotations (informational per Rulebook; do not affect gameplay)
- Faction bot political personality (covered in `docs/plans/2026-03-24-v080-political-leader-bot-plan.md`)
- International intervention and NATO mechanics (covered in events + design docs)

If a design question touches sensitive history AND one of these areas, this gate takes precedence for the sensitive-history aspects.

---

## 8. Life Lessons (durable rules for future work)

Three rules derived from settling this gate. These belong in `docs/life_lessons.md` and should be applied any time this area is touched:

1. **Atrocity is a consequence, not a lever.** The moment a sensitive-history feature becomes a player-optimizable trade-off, it is wrong. Every new feature in this space must answer "is this a lever?" with "no."
2. **The boundary between what is modeled and what is refused must be explicit.** A feature that lives in neither Ring 1, Ring 2, nor Ring 3 does not exist yet. If you cannot place it in a ring, do not build it.
3. **When in doubt, the answer is no.** This is a real gate, not a paragraph. The cost of an unwanted addition to this system is much higher than the cost of a delay.

---

## 9. References

### Code
- `src/sim/combat/enclave_resilience.ts` — enclave definitions and resilience
- `src/sim/combat/paramilitary_sweep.ts` — sweep mechanics and war-crime recording
- `src/sim/negotiation/rupture_consequences.ts` — rupture enforcement (header comment says: *"Ring 2 of the sensitive-history boundary"*)
- `src/state/displacement.ts` — displacement state shape
- `src/state/negotiation_types.ts` — RuptureConsequence, condemnation_flags types
- `src/sim/endgame/cost_ledger.ts` — ledger builder
- `src/ui/map/components/VerdictScreen.tsx` — canonical endgame UI

### Content
- `data/scenarios/events/war_1992.json`, `war_1993.json`, `war_1994.json`, `war_1995.json`
- `data/scenarios/essays/srebrenica_falls_1995.json` and atrocity-focused essays

### Canon and design
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` — scoring model
- `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md` — original design discussion
- `docs/10_canon/Rulebook_v0_9_0.md` §5.8 (war_crimes_record) — officer war_crimes_record informational-only rule
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §15.2 (War Crimes Records) — same

### Historical sources
- ICTY completed cases: https://www.icty.org/en/cases
- ICJ Bosnia v. Serbia (2007)
- UN A/54/549 (1999) — Srebrenica fall report
- Balkan Battlegrounds vols. I-II
