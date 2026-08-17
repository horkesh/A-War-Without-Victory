# Sensitive History Design Gate — Canonical

**Status:** CANON (v0.9.0 gate — moral and design)
**Last Updated:** 2026-08-16
**Amended:** 2026-08-16 — §10 added ("Provenance and the Integrity of the Historical Record"); §7 scope entry for officer-level `war_crimes_record` corrected to point at §10. Sections §0–§9 keep their existing numbers; nothing was renumbered.
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

- **Enclaves** (`src/sim/combat/enclave_resilience.ts`) — Sarajevo, Bihać, Srebrenica, Žepa, Goražde, and HRHB pockets have explicit OSIDs, resilience caps, supply-linked decay/growth, and garrison mechanics. Enclaves generally fall when control flips through combat; the 1995 Srebrenica and Žepa fall receipts are the explicit exception, authored by sensitive-history event `control_change` effects.
- **Displacement** (`src/state/displacement.ts`) — municipalities track `original_population`, `displaced_out`, `displaced_in`, `lost_population`. Triggered by supply starvation, encirclement, front breaches, or paramilitary capture.
- **Paramilitary sweeps** (`src/sim/combat/paramilitary_sweep.ts`) — rear pocket cleanup and adjacent-offensive modes. Each capture increments `war_crimes_events` and records civilian casualties.
- **War crimes counter** — `FactionCapital.war_crimes_events` increments with every paramilitary capture. Feeds into grade anchors (see `VICTORY_AND_PYRRHIC_SCORING.md` §3.2).
- **Rupture consequence** — exactly one: `srebrenica_genocide_1995`, fired when the event-owned Srebrenica fall receipt has produced RS control of the Srebrenica OSID in the July 1995 window with the enclave formed flag set. Propagates `genocide_condemnation` flag. Locked, idempotent, permanent.

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
| `srebrenica_genocide_1995` | Fall of Srebrenica safe area, July 1995 | 8,000+ killed ✓; Krstić genocide conviction, Karadžić, Mladić, ICJ 2007 ✓; RS controls `op:srebrenica:srebrenica_2` + enclave formed + event-owned fall-receipt window turn ≥160 ✓; locked ✓ |

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

### §2a — Emergent-cumulative condemnation (verdict-time, non-rupture)

Adopted 2026-08-10 (Pyrrhic §6 panel: calibration/canon-§6/historian/red-team, GO-with-conditions; owner-directed). Distinct from ruptures (§2: discrete, recorded, permanent, ICTY-adjudicated), the verdict MAY apply a verdict-time **emergent-cumulative condemnation flag** — currently `authorized_cleansing_condemnation` — subject to ALL of:

- **(0) Non-erosion.** §2a does NOT amend, relax, or create precedent against §2 criterion 3's binding discrete-trigger requirement for **rupture** status, nor against criterion 11's calendar prohibition. Criterion 3 continues to govern rupture eligibility without exception; a future proposal citing §2a as precedent for a cumulative *rupture* trigger is out of scope and must be re-blocked. §2a is a structurally distinct, lower-severity, **non-adjudicative** construct: it MUST never be cited with a specific ICTY/ICJ finding, never named after a specific historical incident (Ahmići, Kravica, etc.), never given a Ring-2 essay or Chronicle "recorded on turn X" framing, and is labeled everywhere as a general aggregate severity judgment over the faction's own **modeled** harm — not an accusation of any named event.
- **(i) Emergent-only.** Applies only when `decision_mode === 'emergent'`; historical/unset mode is byte-identical.
- **(ii) Modeled-atrocity-driven, never calendar.** The trigger is a UNION of calendar-CLEAN emergent signals, each produced solely by the modeled war (never by scripted `humanitarian_impact`/calendar-windowed events): **(a)** `war_crimes_events_emergent ≥ 1` — any single player/bot-authorized paramilitary sweep (sole writer `recordWarCrime`; a pattern requirement is a §6-forbidden "free atrocity budget", and a single authorized cleansing was already atrocity-grade — Bijeljina/Zvornik/Višegrad/Foča 1992, ICTY *Vasiljević*/*Kunarac*/*Krajišnik*); **OR (b)** `civilian_casualties_caused ≥ 15,000` (causer-attributed, from the emergent displacement pipeline) — catastrophic siege/encirclement harm, backstopping the displacement blind spot; 2.7× above a lone Sarajevo-scale siege (~3,500–5,500, ICTY *Galić* — a single brutal siege must NOT trip) and 1.84× below a modeled multi-municipality campaign (~27,541). `refugees_created` is deliberately NOT gated (too coarse; ordinary front movement displaces on all sides).
- **(iii) Monotonic + non-reducing.** More atrocity never yields a better outcome (A0). The flag only taints (→ `hollow_victory`), never improves.
- **(iv) Not tradeable.** Recomputed from terminal state — never negotiable, removable, or mitigable (a stronger guarantee than a rupture's mid-game window).
- **(v) Genocide precedence.** A discrete `genocide_condemnation` rupture governs (forces `failure`); §2a never down-grades the more severe finding.
- **(vi) Thresholds cited + panel-set.** The trigger constants carry stated, cited rationale and are never curve-fit to a target grade.

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

> **Provenance is governed by §10.** Sourcing, citation, and the removal or downgrade of any adjudicated finding — in essays, in officer `war_crimes_record` annotations, or anywhere else the game states that a named real person was charged, convicted, acquitted, or the subject of a tribunal finding — is ruled by §10, not by this section.

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
- The **gameplay effect** of officer-level `war_crimes_record` annotations. They are informational and do not affect simulation mechanics (`Rulebook_v0_9_0.md` §5.8, `Engine_Invariants_v0_9_0.md` §15.2). **Their content is IN scope, and is governed by §10.** *Informational-for-gameplay does not mean removable-as-content.* A record that changes no simulation output is still a statement the game makes about a named real person, and the fact that deleting it moves no metric is a reason for care, not a licence. Prior to the 2026-08-16 amendment this entry read as a flat out-of-scope disclaimer, and an automated pass used it as cover to delete adjudicated findings that no gate was watching.
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

### Provenance (see §10)
- `docs/provenance/OFFICER_OOB_PROVENANCE.json` — the officer/OOB provenance manifest
- `tools/diagnostics/officer_oob_provenance.ts` — the harness that reads it
- `tests/officer_war_crimes_record_guard.test.ts` — the superset guard that makes deletion of a `war_crimes_record` loud
- `data/scenarios/officers/apr1992_officers.json`, `data/source/oob_brigades.json` — the playable rows that carry `war_crimes_record`

---

## 10. Provenance and the Integrity of the Historical Record

**Status:** CANON. Adopted 2026-08-16.

**Numbering note.** This is a top-level section, not a subsection of §5. Its subject is not "Essays and Codex"; it governs every surface on which the game states something adjudicated about a named real person. It is numbered §10 and placed after §9 deliberately: §1, §2, §4, §5 and above all §6 are load-bearing tokens cited by name across code, plans, event data and the ledger; §8 is cited by number elsewhere, including in the sub-section form "§8.3"; and at least one external citation of "§7" is already stale, pointing at a section whose content moved. Renumbering to open a slot mid-document would have multiplied exactly the citation drift this section exists to stop.

### 10.0 Scope, and how scope is determined

These rules bind any record the game ships that states or implies an **adjudication against a named real person** — that the person was indicted, convicted, acquitted, sentenced, had proceedings dismissed or discontinued, or was referred to another forum — and any process, automated or human, that removes, downgrades, or re-dispositions such a record.

**They also reach formations, in part. §10.5 rules on exactly which part, and names what governs the rest.**

**Applicability is read off structured data, never off the record's own description of itself.** A machine determines that these rules apply by the presence of the adjudication-bearing structure on a row keyed to a named person: today, a `war_crimes_record` on an officer or `elite_commander` row, and the `court_record_citation` field of the provenance manifest. A rule whose reach is self-declared will be complied with by exactly those authors who have already mis-declared. The pre-correction Odžak row carried its own scope note — "formation identity and command attribution only" — and that note was false; the identical sentence is boilerplate across the great majority of manifest rows, so it distinguishes nothing. **Any future provenance rule must key on a predicate a machine reads off structured data, not on a claim the author makes about what their row covers.**

**The disease this section names.** *A green provenance gate bought with a fabricated source is the same disease as one bought by deleting the record.* Both convert an open research question into a closed one without doing the research, and both leave the harness reporting success. Every rule below is written so that neither exit is available.

**No counts in canon prose — none, not even a dated one.** No count of records, officers, rows or findings appears in this section, and none may be introduced into it. The authority for any magnitude is `tools/diagnostics/officer_oob_provenance.ts`, run against the manifest at the moment the question is asked. Where a magnitude must be conveyed in prose, convey it as a pattern rather than a quantity — *"the dominant citation pattern in the manifest"* — a form that is true, stable, and not falsified by the next commit.

This is stronger than the usual "date the number and name the harness" discipline, and it is stronger for a measured reason. While this amendment was being reviewed, three seats independently counted the manifest's records and returned three different figures; one seat counted the same expression against the same file twice, twenty minutes apart, and got two answers. Nobody was wrong and nobody disagreed. The files were uncommitted and another lane was writing to them, so the artifact moved underneath the measurement. **A number in canon is a claim about a moving file, made at a moment the reader cannot recover.** `Rulebook_v0_9_0.md` §5.8 is the cautionary case in this very investigation: it asserts a fixed count of officers carrying `war_crimes_record` annotations, the figure is stale, and it drifted in the direction that under-reports what the game asserts about real people.

### 10.1 Rule 1 — An uncited finding is uncited, not untrue

> An adjudicated finding that lacks a citation is UNCITED, NOT UNTRUE. No automated provenance rule, and no reviewer acting for want of a citation alone, may remove it; the gap must be raised. Whether a record states an adjudicated finding is the question to be established by research, not a premise the record may assert about itself.

The remedy for a missing citation is a citation. It is never a deletion, and it is never a downgrade adopted because the citation could not be found (§10.2).

**The hazard, stated so it cannot be designed around: Andrić and pre-correction Živanović present identically at observation — empty `court_record_citation` — and require opposite outcomes.** For Andrić no adjudication had ever occurred, so this rule's predicate never attached; there was nothing here that forbade the removal. For Živanović the row asserted an ICTY genocide indictment that has never existed anywhere — and that assertion had to go — yet the man is under a Court of BiH indictment for crimes against humanity with an international arrest warrant outstanding, so deleting the record wholesale would have replaced one falsehood with a worse one.

It follows that **no rule keyed on the emptiness of a citation field can decide either case.** The field is silent about which case it is looking at. Only research separates them, and until the research is done the correct state is HELD (§10.4) — not deleted, and not `supported`.

**Do not cite the Andrić or Arsić removals as precedent for wrongful deletion.** No adjudication existed for either man, this rule's predicate never attached, and those removals were never forbidden by this section. They were wrong for reasons recorded elsewhere. Enshrining them here would enshrine a misreading of the rule.

### 10.2 Rule 2 — The citation must be a citation for the adjudication

> An adjudication is not established by a source for the identity. A conviction, acquittal, indictment, sentence, dismissal, discontinuance, or referral asserted against a named real person requires its own claim-scoped citation in `court_record_citation`, identifying the court and the case. A populated `source`, `citation`, or `source_tier` on the row speaks to identity and never to the adjudication. Where no claim-scoped citation is locatable, the disposition is HELD — never `supported`.

**What counts as a complete claim-scoped citation.**

> A stable tribunal or court case reference — court plus case number, or a case-record identifier resolving to the court's own register — is a complete claim-scoped citation. A date is additionally required only where the date is itself the claim in dispute: a confirmation date, a ruling date, or a tenure boundary the record asserts.

**Why the rule does not demand a date in every case.** An earlier draft of this section required court, case number *and* date on every adjudication. Mechanized against the live manifest, that reading sent nearly every adjudicated row to HELD — the ICTY convictions among them, whose citations name the tribunal, the case number and the tribunal's own live case-record page but no date. Mladić, Krstić, Tolimir, Galić, Blaškić, Praljak, Kordić, Delić, Orić and Halilović all failed it.

That outcome was blocking for three reasons, and the third is the one that generalises. It is **factually false about the best-established facts in the game**. It **destroys HELD's discriminating power** — if HELD holds both a genocide conviction and a media-sourced indictment, the label distinguishes nothing, and the one row that needs it is camouflaged among the many that do not. And it is **a mass re-disposition bought by a missing field**, which is the third exit §10.0 exists to close and which this very rule forbids one paragraph earlier. A rule that would have deleted the record for want of a citation and a rule that would demote the record for want of a date are the same error at different volumes.

The reference test is discrimination, not severity: under the rule as written, Živanović's Court of BiH indictment still fails it — no case number, no register entry, media reporting only — Šiljeg still passes as a finding-about-a-person, and Mladić stays `supported`. The rule separates the row that needs separating and leaves the rest alone.

**Interim state until `held` exists.**

> Until `held` exists as a disposition value (§10.7 obligation 1), a row in this position remains `supported` and MUST record the absence of a docket reference in `adjudication_search_note`. This is a known, tracked non-compliance and is not a licence to treat the row as verified.

**No row may be re-dispositioned under this rule until `held` exists.** The only compliant value has nowhere to land, so touching the row would force an overclaim in one direction or an erasure in the other. That Živanović's record is non-compliant on the day this section lands is the correct and honest state of the tree, and it is recorded here as such rather than rounded away by a disposition that does not fit.

**Why claim-scoped and not row-scoped.** Provenance in this repo is per-row, but the claims inside a row are not of one kind. The pre-correction Živanović row — which shipped — carried a real book, a real page, a resolved scholarly tier, `confidence: exact` and `disposition: supported`. Every one of those fields was true, and every one of them was about his command of the Drina Corps. None was about the ICTY genocide indictment the same row asserted, which does not exist. A rule barring an adjudication "without a locatable source" is satisfied by that row, and rule 1 then forbids deleting it: the false genocide accusation ships, protected by both rules at once. The rule must therefore demand a source **for the adjudication**, in the field that carries adjudications, or it fails on the record that motivated it.

**Why the enumeration is exhaustive and disposition-neutral.** The list is *conviction, acquittal, indictment, sentence, dismissal, discontinuance, referral*, and it deliberately does not privilege inculpatory outcomes. **An unsourced acquittal is the more dangerous kind, because nobody instinctively challenges it.** An under-sourced acquittal read as exoneration is a §4 minimisation running in the opposite direction from the one this repo usually guards against, and it is harder to catch precisely because it flatters the subject. There is a live instance: the Belgrade acquittal recorded in the Živanović row rests on media reporting, the ruling date could not be separated from the publication date, and no Serbian case number was obtainable. It is held to the same standard as the indictment in the same row, and the row says so.

**On downgrading.** A record may be downgraded **only when research establishes the lesser fact** — when a source shows the person was named in findings rather than charged, or that the proceeding reached a different stage than the record claims. **A downgrade adopted because a citation could not be found is forbidden.** It is a deletion of content by another name, it is a §4 minimisation, and rule 1 bars it as squarely as it bars removal. The distinction is not academic: converting the Živanović record to `named_in_findings` for want of a docket reference "would tell the player that a man under a confirmed CAH indictment and an international warrant was never accused." Where the lesser fact is not established, the disposition is HELD.

### 10.3 Rule 3 — Absence from one docket is not absence from all

**ABSENCE FROM ONE DOCKET IS NOT ABSENCE FROM ALL.** Before downgrading, re-dispositioning, or removing an adjudication against a named person, search every forum with competence: the ICTY and its successor the IRMCT; the Court of Bosnia and Herzegovina; the cantonal and district courts of BiH; the War Crimes Prosecutor's Office and courts of Serbia; and the county courts of Croatia. **"Not indicted by the ICTY" is a finding about the ICTY, not about the person.**

**Corollary — record it as a finding, not as a charge.** A tribunal finding *about* a person in a case against others is not a charge against that person. Such a record is retained and is typed as a finding; it is not typed as a charge, and it is not removed for failing to be one. The wording matters: a rule saying such a record "must not be recorded as one" is one dropped word away from authorising deletion, and there is a live record that a careless reading would destroy — the Šiljeg record *is* a finding-about-a-person-in-a-case-against-others, carrying `verdict: "named_in_findings"` with empty `charges`, and it is correct as it stands.

**A negative search has its own field.** The narrative of a search that found nothing is evidence about the search, not a citation of a court record. It is recorded in a dedicated `adjudication_search_note` field. **Negative assertions are forbidden in `court_record_citation`**, which holds an affirmative docket reference or nothing at all. This is not a hypothetical tidiness rule: rows in the live manifest currently satisfy `court_record_citation` with prose that opens "NOT AN ICTY ACCUSED" and "NOT AN ACCUSED — findings only", and because the harness tests only that the field is non-empty, **a sentence asserting that no indictment exists scores as a present citation.** The rule and the code must be brought into line together; the migration is named in §10.7.

**Per-forum minimum.** A negative-search record states, for each forum searched: the forum, the instrument or register actually consulted, what surfaced, and what could not be established. It does not round any of these up into a conclusion.

- **Content template — record key `officer:vrs_zivanovic` in `docs/provenance/OFFICER_OOB_PROVENANCE.json`.** It searches each competent forum separately and reports each separately: it distinguishes the ICTY non-accusation from the live Court of BiH indictment from the distinct Serbian proceeding, declines to guess an S1-1-K case number, declines to state a confirmation date it could not establish, and labels its own weakest evidence media-tier. That is the standard. Its **placement is the defect** this rule corrects — the narrative belongs in `adjudication_search_note`, not in `court_record_citation`.
- **Cross-anchor template — record key `officer:hvo_siljeg`, `verification_note`, in the same file.** Where a cited document is not held in the repo, anchor the citation to an existing in-repo citation of the same document produced independently, and record the agreement field by field. Same placement caveat as above.

### 10.4 Dispositions: what "not yet established" is called

**HELD** — the adjudication is corroborated but not docket-verified. The record is retained, the claim ships attributed to the tier that actually supports it, and the row records forum, charge, and the absence of a docket reference. HELD is discharged only by a docket reference: case number and date from the court register or a court or prosecution publication. HELD does not expire and never converts to deletion by lapse of time.

**A known hole in this routing, named rather than hidden.** §10.2 sends "no claim-scoped citation locatable" to HELD, but HELD is defined above as *corroborated* and not docket-verified. **An adjudication asserted with no corroboration at all therefore routes to a state whose own definition excludes it** — it is not HELD, it is not `supported`, and §10.1 bars deleting it. This is not hypothetical: the Šiljeg row asserted a BiH State Court conviction and a ten-year sentence with no case number, no date, no judgement, and no source in any forum. It resolved only because genuine ICTY findings about him turned up; had they not, this section would have had no state for it. The vocabulary gap is recorded as §10.7 obligation 5, and it is a gap of two kinds, not one.

**HELD's home is `HELD_REGISTER`, not `NEEDS_EVIDENCE_ALLOWLIST`.** The reason is not that one list drains and the other does not — neither drains by lapse of time, and both discharge on evidence, so that argument separates nothing. The decisive line is the allowlist's own precondition: *"Adding an entry means asserting that the search is EXHAUSTED, not pending. If you are still looking, the record is not ready for this list."* **HELD is definitionally still looking.** The allowlist asserts *no upstream exists and we searched everything*; HELD asserts *an upstream exists and we have not yet cited the docket*. Filing a HELD row there is not a rot risk that matures later — **it is a false assertion at the moment of insertion**, made about every entry. That is what makes the two buckets a matter of fact rather than taste, and it separates the live rows cleanly: officers for whom both source volumes were searched in full and nothing was found belong in the allowlist and stay playable; Živanović does not, because a case number exists and someone can find it.

A `HELD_REGISTER` entry's basis records what §10.4 already requires of the row — **forum, charge, and what is missing** — so each entry is self-describing about what would close it and the register reads as a worklist rather than a graveyard. This is a content convention, not a gate design; the gate is specified in §10.7.

**HELD governs adjudications. `omitted_candidates` governs identities.** The manifest already carries a third state — `omitted_candidates`, with `disposition: "omitted"`, a reason enforced by `omitted_candidate_missing_reason` and a still-playable check enforced by `omitted_candidate_still_playable`. That machinery is correct and must be used rather than duplicated. But it is **row-granular, and adjudications are claim-granular.** Sending a `war_crimes_record` to `omitted_candidates` removes the whole officer from playable data — deletion by another name, which rule 1 forbids. The two states are therefore not interchangeable: an identity that cannot be sourced at all is an `omitted_candidate`; an adjudication that cannot be docket-verified is HELD on a row that stays playable.

**`unsupported_pending_research` is the default for an identity record whose evidence is missing.** The manifest already declares `default_missing_evidence_disposition: "unsupported_pending_research"` — a genuinely pending state. Where an implementation has substituted `omitted`, it has baked in the conclusion that the research will fail. Absence of evidence downgrades confidence; it does not delete a person.

### 10.5 Formations and unit-existence rows — how far this section reaches

**A formation matter arising under §10.1 or §10.4 does not require §6 panel sign-off, and must not be routed to one.** §10 lives inside a sensitive-history gate, so a reader who arrives here on a brigade home will find a document about genocide, ruptures and condemnation flags, and the surrounding text will suggest convening the panel. It does not apply. A formation's provenance is ordinary data correctness held to an honest evidentiary standard; it is not sensitive-history content. Routing brigade homes to the §6 panel would collapse the gate under its own volume and devalue it for the cases that genuinely need it, which is a cost to the atrocity record and not merely to throughput. Sign-off for these matters is the ordinary OOB-data review path.

**Ruling: §10.1 and §10.4 reach formations. §10.2 and §10.3 do not.** The rest is governed by the temporal-scope rule in `FORAWWV.md` §XIII, which at the time of this amendment is drafted and **not adopted** — so the second half of the protection does not exist yet, and this section says so rather than implying coverage it does not have.

**What triggers it, read off structured data.** For a person the trigger is a `war_crimes_record`. For a formation the trigger is an **existence-at-epoch claim** — a row in `data/source/oob_brigades.json` asserting `available_from`, and any `omitted_candidates` entry that removes a formation from playable data. Both are schema features. Neither is something an author declares or can decline to declare.

**§10.1 applies verbatim in its unit form:**

> A 1995 snapshot cannot establish that a formation did not exist in April 1992, any more than an empty citation field establishes that a court made no finding.

An absence in a source is not a positive finding of non-existence, whatever the subject of the source. The remedy for a formation whose existence at the scenario epoch cannot be sourced is a citation or a HELD-equivalent disposition, never removal from playable data. This is not a hypothetical extension: HRHB brigade rows have been removed from playable data as duplicates, and the `omitted_candidates` entries backing them cite a Croatian Defence Council order of battle dated **October 1995** — a real citation, to a real source, incapable by its date of establishing anything about April 1992. Those particular merges may well be correct on other evidence; the doctrine that permitted them is what this ruling closes.

**§10.4 applies:** an identity that cannot be sourced at all is an `omitted_candidate` with a stated reason; a claim about that formation that cannot be established is HELD on a row that stays playable. The claim-versus-row granularity distinction carries over unchanged.

**This reach sunsets; it is not provisional pending someone's attention.** When `FORAWWV.md` §XIII is adopted, **§10.5's formation reach reverts to a pointer at §XIII.** Two seats reached this from opposite reasoning and the same conclusion: without the sunset, two canon documents govern the same rows and drift apart — the exact failure §10.0's numbering note is written to prevent, arriving from the other direction — and this gate accretes non-sensitive-history material indefinitely, which is the slow version of the collapse the §6 disclaimer above guards against.

**§10.2 and §10.3 do not apply.** A formation has no docket, no forum, and no acquittal. Their analogue — that a citation must positively establish the epoch of the claim it supports, and that a citation silent on epoch is a violation rather than an exemption — is the subject of `FORAWWV.md` §XIII and is **not in force**. Until it is, the live gap is not wrongful deletion but its mirror: **an unsourced existence claim riding past the row's own disclaimer.** Posavina brigade rows assert `available_from: 0` — an existence-at-epoch claim — and they *do* carry provenance entries, `disposition: supported`, cited to a page of the narrative. But those entries' own scope notes read *"Exact formation identity only; gameplay personnel, **timing**, and combat statistics are separately authored."* The manifest therefore disclaims timing in the same breath as the playable row asserts it, and nothing checks that a row's claims stay inside the scope its own provenance entry declares. The timing is believed correct on the narrative evidence, and that is not the point: the evidence for it lives in a test-file comment rather than in the manifest, so the game asserts an epoch the provenance record explicitly declines to support. A claim can be true and still be unsourced where the game states it. **Note what this costs the disclaimer as an instrument:** here it is accurate, and it still provides no protection, because a scope note that nothing enforces is a description of good intentions. This is §10.0's rule about self-declared scope arriving from the other direction.

**A third state, and §10 reaches it: corroborated, contradicted, and knowingly shipped wrong.** A formation row may carry a value the evidence positively contradicts, retained deliberately because the engine cannot represent the sourced one. This is a **class, not an exception**, and there are already two live members, identical in shape:

- `brigade:rs_5th_podrinje` — ships `op:vlasenica:sebiocina`; `conflict_note` opens *"REVERTED TO VLASENICA ON CALIBRATION GROUNDS, NOT ON EVIDENCE GROUNDS… KNOWN-WRONG"*; the source places the brigade at Goražde and never at Vlasenica at any date.
- `brigade:hvo_hrvoje_vukcic_brigade` — ships `home_mun: odzak` and `corps: hvo_northwest_bosnia` while its citation sources Jajce under Central Bosnia; `conflict_note` opens *"REVERTED TO ODŽAK / hvo_northwest_bosnia ON CALIBRATION GROUNDS…"*.

Both carry `disposition: "supported"`, and both compensate with a prose instruction — *"Do not read the disposition field as covering it"* — which is exactly the self-declared scope §10.0 says a reader may not rely on and a machine cannot see at all.

The retention is correct and §10.1 protects it — **a finding is not withdrawn by being unimplementable.** What is not correct is `supported`.

**Ruling: an engine constraint may force the value the game ships; it may never make that value `supported`.** Where the two diverge, the divergence must be expressible in the disposition and not only in prose. The present vocabulary cannot express it — HELD means corroborated-but-unverified, `omitted` means unsourced, and neither means *sourced, contradicted, and overridden on engine grounds*. That gap is named here rather than papered over, and closing it belongs with the code obligations in §10.7.

**THE BAR — without which this state is a licence, not a category.** *"The engine cannot represent the sourced value"* is the easiest justification anyone will ever have to write, and nothing checks it. Left unbounded, this state is a place to put any inconvenient correction with §10.1's protection as cover — **the mirror of the deletion doctrine §10 exists to close, arriving through the door §10 just built.** The enforceable distinction:

> **"We tried it and the brigade died" is a measurement. "No supplied cell exists" is a constraint.**

A row claiming this state must cite **a reproducible enumeration or a named engine constraint demonstrating that the sourced value is infeasible** — not a record that implementing it produced a bad outcome.

> The bar is on **the shape of the evidence, not its strength.** A measurement can be extensive and still not qualify. `rs_5th_podrinje` taking 857 casualties with `battles_fought: 0` across 172 turns is a large, careful, entirely genuine measurement — and it establishes only that *this* placement failed. What earns the third state is the enumeration that followed: the candidate set for a supplied VRS brigade in Goražde municipality at t0 has **zero** members. **The first tells you an attempt failed; only the second tells you no attempt can succeed.**

**The bar applies per row, and membership in this class is a claim to be established, not a status conferred by writing a `conflict_note`.** A row is not in this state because its own note says it is — that is §10.1's premise-the-record-asserts-about-itself, in formation clothing.

**The enumeration must exist as a test, not only in a run report.** A run report is not reachable from the row, and the constraint it records will outlive anyone's memory of it. The test must **fire when its premise dies**: if the supply model or the topology later changes so that a supplied cell does exist, it goes red and tells someone the third-state row can now be discharged. Otherwise the override outlives the constraint that justified it, silently and indefinitely. This is the standing lesson about pins from the other side — pins get removed by people who do not know why they exist; **this one has to announce when it stops being true.**

### 10.6 Why this section exists

Rule 1 exists because an automated provenance pass deleted adjudicated findings — including a live Court of BiH indictment — on the inference that a blank citation field meant the history was not real, and then wrote a test asserting the deleted field was `undefined`, so that restoring the truth read as a regression.

Rule 2 exists because rule 1, shipped alone, would have **protected** the pre-correction Živanović row: every field on it was true, none was about the adjudication it asserted, and the false genocide accusation would have ridden out under rule 1's shelter.

Rule 3 exists because a canon reviewer ruled Živanović a non-accused on the strength of the ICTY docket alone — *"I checked one docket and wrote a universal"* — when the Prosecutor's Office of BiH had filed and the Court of BiH had confirmed an indictment for crimes against humanity at Srebrenica and Žepa in December 2021, with an international arrest warrant requested in 2023 after he failed to appear. Had that ruling shipped, the game would have stated that a man under a live crimes-against-humanity indictment was never accused: a §4 minimisation worse than the mis-attribution being corrected.

### 10.7 Enforcement, and what this section does not do

**Remediation under this section is baseline-moving and territory-inert. The correct disposition is an observer re-bless, not a revert.** Read this before concluding that a red baseline means your restoration was wrong.

`initializeNamedOfficers` in `src/sim/combat/officer_system.ts` assigns the whole officer array to `state.military.named_officer_data`, prose included. `bio_short`, `known_for`, `political_alignment_note` and `war_crimes_record` therefore serialize verbatim into `final_save.json`. The moment anyone obeys §10.1 and restores a deleted finding, or merely adds a citation to one, `npm run test:baselines` goes **RED** against `data/derived/scenario/baselines/manifest.json`.

**The discriminator is not the manifest.** It is `control_delta.json` byte-identical plus an unmoved structural fingerprint. When those two hold, the change touched observer prose and nothing the simulation reads: re-bless the observer baselines and keep the correction. This repo has already shipped a defect *with a test defending it* on this exact surface — a provenance pass deleted findings and then asserted their absence, so that restoring the truth read as a regression. **A test that goes red on a correct fix is a hypothesis about the test, not proof the fix is wrong.** Anyone who reverts a §10 remediation because three baselines went red has re-committed the original error with the harness's blessing.

**This section does not amend §6.** The sign-off table stands as written. A change to the content of an adjudicated record is already covered by the existing §6 rows for atrocity content, and requires `/historian` review meeting §6's evidence standard. What §10 adds is that **no automated gate, and no reviewer acting on a gate's output alone, may discharge such a change** — a green harness is not a sign-off.

**Known non-compliance on adoption.** This section does not pretend the tree already satisfies it. As of the amendment date the following rows contradict rules stated above, each bound to the obligation that discharges it. A section that names its violations and binds them to numbered obligations is resolved; one that ships quietly while rows contradict it is not.

| Row | Contradicts | Discharged by |
|---|---|---|
| `officer:vrs_zivanovic` | §10.2 — `supported` on an adjudication with no case number and no confirmation date | Obligation 1 (`held` must exist; no re-disposition before it does) |
| `brigade:rs_5th_podrinje` | §10.5 — `supported` on a row whose shipped home the evidence contradicts | Obligation 5 |
| `brigade:hvo_hrvoje_vukcic_brigade` | §10.5 — same shape: `supported` while the citation sources Jajce and the row ships Odžak | Obligation 5 |

None of the three may be re-dispositioned before its obligation lands — expressly under §10.2 for the adjudication, and for the same reason under §10.5 for the two formations: the compliant value does not exist yet, so touching the row would force an overclaim in one direction or an erasure in the other. Their non-compliance is the honest state of the tree and is recorded rather than rounded away.

**Code obligations created by this section.** These are stated here because the rules are unenforceable without them; they are engineering work, tracked separately, and are not themselves canon:

**Obligations 1, 3, 4 and 5 are one change.** `held` and `media` have the identical coupling — each is a value the harness currently treats as a violation the moment it appears, and each is therefore hostage to the same severity ruling. Landing either alone converts a doctrinal improvement into a red gate.

**Obligation 5 joins them for the severity reason, not the partition reason.** Every new non-`supported` value needs a severity answer, and answering "what severity does HELD carry" in isolation leaves the question reopened the moment the contradicted state arrives — with the tempting answer *"whatever we did for HELD"*, **which is wrong, because the two states have different discharge conditions.** HELD discharges on a docket reference. The contradicted state discharges on an **engine change**, and may never discharge at all. Two states that end in different ways cannot carry the same severity by default. So the coherent unit of work is **the harness's epistemic vocabulary as a whole**: settle every non-`supported` disposition and the severity it carries once, in one table, rather than one value at a time.

**The safe cut, for when the whole unit will not fit in one change.** Land 1 + 3 + 4 together with the residual assertion already in place, and let 5 follow — the residual holds the line, because a value with no register is caught by construction. **Do not cut the other way: obligation 5 without obligation 4 has no severity to carry.**

Obligation 2 is separable. Obligation 6 is independent.

*(Note the two groupings are different claims and both hold: 1, 3, 4 and 5 are one change because they share a severity axis; the partition requirement below binds 1, 4 and 5 because those three are dispositions. `media` is a source tier, not a disposition, so it sits in the first grouping and not the second.)*

1. **HELD must exist as a value — and it cannot land alone.** `IdentityDisposition` in `tools/diagnostics/officer_oob_provenance.ts` offers `supported`, `unsupported_pending_research`, `conflict` and `omitted`. Until it also offers `held`, §10.2's "the disposition is HELD — never `supported`" has nowhere to land.

   **The ordering constraint.** `unsupported_disposition` fires for any disposition `!== 'supported'`, and the violation helper defaults to **blocking**. So the moment a row goes HELD it is a blocking violation. `held` therefore requires a severity ruling for `unsupported_disposition` — which is obligation 4 — and obligation 4 is sequenced behind other work. **An engineer told to land HELD "first" is being given an impossible order**; the two land together or neither does.

   **The repair hazard, which is worse than the ordering.** The fails-closed provenance test does not explode when HELD appears — it fails exactly one assertion, predictably and legibly. The obvious repair is to add the HELD ids to `NEEDS_EVIDENCE_ALLOWLIST`. That repair is **green, plausible, and wrong**, for the reason given in §10.4: it makes an exhausted-search assertion about a live search. **Partition the gate instead — see the partition requirement below.**

   **PARTITION, DO NOT SAMPLE — a joint condition on obligations 1, 4 and 5.** Today the gate is strong because it is *one* filter against *one* list, `disposition !== 'supported'` compared exhaustively. That exhaustiveness holds only because there is exactly one non-`supported` bucket, and this section adds two more values — `held` and obligation 5's contradicted state. Splitting the filter naively destroys the property that made it fail closed. The refactor must therefore:

   - **Route, never exempt.** Filter the non-`supported` set into registers such that every row lands in **exactly one**, and assert each register exhaustively in both directions. The union of the partitions is the original set, so nothing leaves the gate: setting a row to `held` without registering it still fails. HELD is not excused from the fails-closed check, it is routed to a second exhaustive assertion inside it.
   - **Exhaustive means exhaustive.** Each register is compared whole — **never with a containment or partial matcher.** One partial matcher anywhere in this refactor and the gate stops failing closed while still reading as though it does.
   - **Carry a residual assertion.** Rows whose disposition matches no register bucket must be asserted **empty in their own right**. Without it, **obligation 5's new value is the one that escapes on the day it lands** — no register, no bucket, and no test that notices. That is the standing lesson about guards whose wiring is uncovered while the guard itself is correct.
   - **Keep the basis-length floor on every register**, and require that a `HELD_REGISTER` basis **name a forum**. The length floor is a crude proxy and it is kept because it works: it is what made an author write far enough to record that every occurrence of a surname in both source volumes was a different man in a different army. Naming a forum is machine-checkable and turns the register into a worklist.

   **The property that decides the shape, and it is this whole investigation in one line.** Under a shared list, a HELD row and an unsourced row fail **the same assertion with the same diagnostic**, and a future reader cannot tell which contract was breached. The partition makes **the failure name the state.** That matters here more than it usually would: **every defect in this investigation was two distinguishable things presenting identically at observation** — Andrić and pre-correction Živanović, both an empty `court_record_citation`, opposite correct outcomes. Write the gate so the diagnostic tells them apart.
2. **A field for negative searches, and a check that keeps them out of every citation field.** `OfficerOobProvenanceEntry` in `tools/diagnostics/officer_oob_provenance.ts` must declare `adjudication_search_note`, and the harness must reject a negative assertion in `court_record_citation` rather than accepting any non-empty string. **Scope this to any citation field, not to `court_record_citation` alone** — the reflex has already spread: `brigade:rs_5th_podrinje`'s plain `citation` now opens *"MUNICIPALITY ONLY — THIS CITATION DOES NOT COVER THE home_osid."* That is a true and careful statement standing in the wrong field, where it reads to the harness as a citation. Scope negation belongs in the structured coverage field Edit 2 introduces, and a negation of any kind belongs nowhere in a citation. Until both land, the rows named in §10.3 satisfy the harness with prose that denies the very thing the field records. Migrating those rows is part of the same change. **Declare `verification_note` in the same pass.** The manifest already carries it on live rows and the schema declares it nowhere, so nothing reads it — the same disease as obligation 3, sitting untreated in the same file beside its own cure. Declaring it is not the same as adopting it for negative searches: it records how a positive citation was verified, and merging the two roles would let a verification note satisfy a search requirement.
3. **The harness must be able to see media-tier sourcing — carefully.** `ACCEPTED_SOURCE_TIERS` in the same file has no `media` value, so a row that honestly labels its own evidence media-tier can say so only in prose, invisible to every machine check. Both `/historian` and red-team review asked for it. Note the coupling: outside the accepted set, `media` yields a blocking violation; simply inside it, `media` is silently promoted to fully acceptable evidence and the Belgrade acquittal would then read as properly sourced — **worse than prose, because it would be wrong and machine-endorsed.** `media` must be representable and must not be sufficient.
4. **A raised gap must be able to hold a merge.** Rule 1's only mechanism is raising the gap. A raise that gates nothing is a raise nobody has to answer, and the severity and volume of the existing citation-gap warning must be resolved before rule 1 has teeth.
5. **The disposition vocabulary is short of a CLASS of states, not of one value.** Implement it as a class or the second case resurfaces the next time an unsourced accusation is found. Two are already live and they are not points on one axis:
   - **Sourced but contradicted.** The evidence establishes one value and the game ships another, retained on engine-representability grounds — §10.5's case, currently `disposition: "supported"` with a prose instruction not to read the disposition as covering it. **The name must contain the word "contradicted"**, so that no reader can mistake it for a weaker `supported`.
   - **Asserted but uncorroborated.** An adjudication stated against a named person with no support in any forum — §10.4's named hole. HELD does not cover it, because HELD means corroborated.
   
   The discriminator between these and HELD is clean and worth stating: **HELD is discharged by research; sourced-but-contradicted is discharged by code.** HELD says *we may yet be right*. Contradicted says *we know we are wrong and cannot yet act on it*. One is epistemic, the other implementational, and collapsing them would let a known-wrong shipped value inherit the respectability of an open research question.
6. **`Rulebook_v0_9_0.md` §5.8 must stop stating a count.** Correct the figure, then delete the bare integer and point at the data and at `tests/officer_war_crimes_record_guard.test.ts`.

---
