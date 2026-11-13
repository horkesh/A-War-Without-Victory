# Sensitive-copy lane: panel record and implementation (2026-11-13)

**Lane:** sensitive-copy (out-of-scope register lane B: R2', R3, S9; plus R8), from the 2026-11-12 player-surface review.
**Canon record:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1 (Ring 1 rupture window), §4 (new Required and Forbidden rules, bound surfaces), §6 ("Record (Sensitive-copy lane, 2026-11-13)").
**Authority:** owner-delegated Pyrrhic panel sign-off (AGENT_WORKFLOW.md). No rupture, condemnation flag or FORAWWV text changed; nothing here can reward atrocity, so the eight-seat bright-line panel was not required (Canon seat ruling).

## Panel

Five independent seats, blind to each other in round one, implementer excluded; the lane lead integrated and did not vote.

| Seat | Round 1 | Round 2 (integrated packet) | Round 3 (amended) |
|---|---|---|---|
| Historian | GO-WITH-CHANGES | GO | GO |
| Narrative Designer | GO-WITH-CHANGES | GO | GO |
| Canon Compliance | GO-WITH-CHANGES | GO | GO |
| Red-team | GO-WITH-CHANGES | **BLOCK** (ledger responsible-side table) | GO |
| Game Designer | GO-WITH-CHANGES | GO | GO |

Result: **unanimous GO**. The round-2 block was resolved by adopting the Red-team replacement verbatim, then re-polling every seat.

### Decisions that came from the seats

- **No responsible-side column in the Humanitarian Ledger.** The Game Designer found that `src/state/displacement.ts` books siege and encirclement displacement with `caused_by` = the side holding the besieged municipality. The Red-team showed the same-side merge proposed in round 2 still left cross-ethnic siege losses on the defender (Serbs displaced or killed in RBiH-held Sarajevo under VRS fire would read "RBiH forces / Serbs"). The table now reads "Displaced or killed, by people", summed over every `caused_by` key. Side labels ("RBiH / RS / Herzeg-Bosnia forces", "Responsible side not recorded") ship as unused keys; a responsible column may return only after the engine attribution is fixed under its own §6 panel.
- **"Displaced or killed".** The engine's `refugees_created` is displaced + killed + fled abroad, and its triggers include starvation, encirclement and front movement (Historian, Red-team), so "Displaced" alone hid the dead and "Driven out" overstated expulsion.
- **Note line** (Red-team, screenshot laundering): "These figures were produced by this campaign's simulation and do not describe the historical war."
- **Srebrenica receipt** names the perpetrators and the victims (§1 Ring 3 #9), dates only the historical killings (the in-campaign fall has no upper bound), cites Krstić IT-98-33-T (Trial 2001, Appeals upheld 2004) and ICJ Bosnia and Herzegovina v. Serbia and Montenegro (2007, its own finding). The 7,000–8,000 count was left out because no seat verified it. One English source: the builder summary equals the i18n EN (Canon).
- **Verdict empty state** "No outcome data is available for this side." Seats split three ways on "presuda"/"ocjena"; the integrator took the Red-team form, which avoids a court-sounding "no verdict" beside a tribunal citation and introduces no new term.
- **BCS corps names:** Glavni štab ARBiH (Historian: best attested; "Generalštab" weaker for 1992–95), Komanda JNA u Hercegovini (descriptive; no such formation is documented), HVO zones as "OZ …" to mirror the EN data (the OZ → zborno područje rename came in late 1993; era-dependent names are a follow-up).
- **Replay figures hidden.** The Historian found the casualty reader, like the displaced reader, reads fields no production code writes (`casualty_totals_by_faction`, `casualties_by_faction`, `military.casualties`, `total_displaced`; verified with `tools/hooks/whowrites.mjs`). The live manifest is built by the same reader, so both always showed 0.
- **Sibling verdict copy (§4-bound):** Cost Ledger badges "RS command / RBiH command / Herzeg-Bosnia command" (were "Serb command / Bosnian government command / Croat command"), "Permanent condemnation" (was "Locked condemnation"), milestone column "This campaign" (was "You").

## What changed

| Item | Files |
|---|---|
| R2' Humanitarian Ledger | `src/ui/map/components/HumanitarianLedgerPanel.tsx`, `humanitarianLedger.*` keys |
| R3 Verdict strings, receipt | `src/ui/map/components/VerdictScreen.tsx`, `src/sim/codex/dynamic_section_builder.ts` (summary text only), `verdict.record.*` keys |
| S9 BCS corps names | `src/ui/map/utils/formatters.ts` (`localizedCorpsName`, `formatCorpsDisplayName`), `CorpsDetail.tsx`, `CommanderSelectionModal.tsx`, `army_hq/OrderInterpretationPanel.tsx`, `corps.name.*` keys |
| R8 Replay scrubber | `src/ui/map/components/replay/ReplayScrubber.tsx`, `replay.*` keys |
| E1–E3 | `warCost.findingFaction.*`, `warCost.findingSeverity.rupture`, `verdict.milestone.cell.you` |
| Tests | `tests/ui/sensitive_copy_lane.test.ts` (new); updated pins in `endgame_verdict_screen_mount`, `replay_scrubber_autoplay`, `war_cost_summary`, `cinematic_verdict` |

Data (`data/source/oob_corps.json`) and the save format are untouched: the EN display is still the data `name`, and only the BCS render maps known corps ids to i18n.

## Follow-ups (not in this change)

1. Engine: attribute siege and encirclement displacement to the besieger or a separate bucket (`src/state/displacement.ts`, pressure path). Changes perpetrator attribution, so it needs its own §6 panel.
2. Engine: the non-ethnic-split fallback in `src/state/displacement.ts` books all lost population as killed Bosniaks (Historian: distorts the victim table; schedule soon).
3. The two ledger tables carry per-people "Killed" figures from different fields (`civilian_casualties` vs the displacement aggregates); reconcile them or label them as different measures (four seats).
4. `src/sim/replay/replay_frame_summary.ts` readers read fields the engine never writes; fix, then restore the figures with the §4 labels.
5. Era-dependent HVO OZ → ZP names; the EN data label "JNA Herzegovina Command" is not a documented formation (owner rename); `hvo_northwest_bosnia` / `hvo_tomislavgrad` ids do not match their labels; ARBiH 6th and 7th Corps absent from the data.
6. `verdict.scene.headline.earlyPeace` is an "X, not Y" construction; BCS verdict-scene strings miss diacritics (step-5 sweep owns diacritics).
7. Corps names still reach the screen without the helper in some paths (for example `TurnAftermathModal` rows and the Chief of Staff alert subject label); sweep them.
8. BCS grammar: 60 BCS templates take `{corps}` / `{corpsName}`, and some put it where BCS needs an oblique case ("Zabrinut sam zbog 1. korpus" wants the genitive "1. korpusa"; "sa 1. korpus" wants the instrumental). The BCS names are nominative only. Rephrase those templates to a nominative slot or add inflected name keys, in a BCS copy pass.

Evidence (votes, packets): the panel's round files were kept in the lane session's scratchpad; the decisions above are their complete content as integrated.
