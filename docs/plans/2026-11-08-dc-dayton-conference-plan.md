# Dayton conference, boundaries, and constitution

**Status.** Active plan, amended 2026-11-08 (owner: "Adopt all, start"). Implementation base is `efa394894` on `codex/dayton-conference-prototype`; implementation continues on `claude/dayton-conference` in `F:/AWWV-worktrees/dayton-conference`. **Claude owns implementation; Codex owns visual assets** (room plates, drawn base map, signing beat, props) and reviews them against the art asks below. This plan defines the delivery order and review gates. Canonical copy: `docs/plans/2026-11-08-dc-dayton-conference-plan.md` on the implementation branch; this file mirrors it. Record authorization and the test budget for each implementation stage in its evidence directory.

## Player outcome

The Hope Hotel wall map opens a **Boundary Map** that explains who gets each place and why. The treaty binder opens a **Constitution Board** that shows who makes rules, who pays, who carries them out, and who can block or review a decision. The delegation folder explains the mandate and the table draft shows the exchange on offer. All four surfaces refer to the same draft revision. Final review shows the resulting map and constitution together. Verdict reopens the treaty as signed.

Build the first playable slice around **Sapna and Teočak, police, education, and defense**. Each faction gets its own mandate and one opening plus a linked counteroffer. A first-time player should be able to find why a place was assigned to an entity, explain why a claim costs more than a similarly sized one, and trace who handles a concrete decision after signing. Policy cases illustrate the treaty's actual decision rules. A playable postwar campaign belongs to a separate design lane.

## Baseline and authority

| Checkpoint | Foundation |
|---|---|
| Prototype and proposal boundary | Registered Hope Hotel scene, four accessible objects, and desktop validation that preserves the existing institutional fields. [Prototype](F:/AWWV-worktrees/.dayton-design/prototype-evidence/RESULT.md) · [Proposal boundary](F:/AWWV-worktrees/.dayton-design/next-slice/RESULT.md) |
| Settlement record and live route | Pending Dayton opens the conference. Draft and signed views share the resolver's authoritative map and terms. [Record](F:/AWWV-worktrees/.dayton-design/settlement-record/RESULT.md) · [Live route](F:/AWWV-worktrees/.dayton-design/live-conference/RESULT.md) |
| Counteroffer and final review | All three factions reached final review in packaged Electron. RS signed and reopened the same save with 744 map paths and 30 institution rows matching the review. [Packaged proof](F:/AWWV-worktrees/.dayton-design/clause-review/RESULT.md) |

Use the existing pending-Dayton, decline, forced-table and terminal owners. Preview resolves on a disposable clone. Signing writes once and repeat requests use the stored result. Treat wartime control as read-only and retain the country's exterior outline. Store treaty assignments separately. Distinguish the wartime factions from the civil authorities established or recognized by the treaty. Use land area for territorial share and existing grade calculations. Treat condemnation and other protected consequences as locked. Apply the governing protected-ground and enclave rules and route proposed changes to their authority.

### 0. Establish the evidence and decisions

Record the SHA and source versions. Retain one pending save per faction, the signed RS fixture, a historical-default and headless resolution, decline and forced cases, an older signed save, and a non-Dayton ending. Reuse existing receipts. Trace the contract from `GameStateAdapter.ts`, `DaytonNegotiationModal.tsx`, and the desktop bridge through `dayton_negotiation.ts`, `peace_settlement.ts`, and Verdict.

Write a transition table for offered, revised, adopted, final review, signed, declined, forced, and reloaded. Name the valid next action, write owner and save effect in each state. Bring changes to the opening assignment rule, contiguity, package pricing, patron pressure and live rounds to the relevant rule owner before enabling them. Use the applicable historian, canon and Pyrrhic review gates for changes to protected areas or newly authored historical positions.

**Exit.** Reproducible fixtures and expected deltas, a named owner for every affected rule, and a recorded decision for each change that is ready for live use.

### 1. Correct the opening boundary

The retained signed RS fixture assigned `op:zvornik:sapna` and `op:ugljevik:teocak_krstac_2` to RS before contiguity. The allocator worked with area quotas inside prewar municipalities, and each place fell outside its remaining Federation quota. Neither was the subject of an accepted concession. The research data lists both municipalities on the Federation side. Start by correcting that baseline. [Research data](F:/AWWV-worktrees/dayton-conference-prototype/data/source/peace_plans/plan_maps_research.json:4869) · [Tuzla Canton geography](https://tk.gov.ba/o-kantonu)

1. Verify the Sapna and Teočak cores, adjacent cells and the connecting routes against boundary evidence. Record what each aggregate game cell represents. Where a verified line crosses a cell, document the placement rule and affected footprint. Flag insufficient evidence. Take changes to the map substrate or protected anchors through their project owners.
2. Encode audited opening assignments in reproducible source data. Audit the rest of the Dayton map for the same defect, especially split prewar municipalities, urban centres, corridors and special areas. Mark each assignment verified, approximate with an identified rule, or unresolved. Retain a per-cell diff and evidence.
3. Keep opening assignments, package effects, arbitration and connectivity adjustments distinct. Recheck protected anchors, Brčko and Posavina. For a corridor show what it connects and every cell involved. Report proposed changes to absorption or corridor policy separately for rule approval.
4. Derive captured-ground packages against the corrected opening line and audit fixed packages for overlaps or special-status conflicts. Measure intentional changes in historical-default and headless resolutions that use the repaired map.

**Surfaces.** `data/source/peace_plans/`, `tools/peace/build_peace_settlement_maps.cjs`, `data/derived/peace/`, `peace_settlement.ts`, `settlement_contiguity.ts`, and `package_area_resolver.ts`.

**Exit.** In the retained fixtures the verified Sapna and Teočak cores open and sign on the Federation side unless an approved modeled clause changes them. Every changed cell has an attributable reason. The reviewed map has zero unexplained regressions and meets the protected-anchor and connectivity checks.

**Checkpoint 2026-11-08 (Claude).** Root cause confirmed by replaying the allocator: the quota pass fills municipal shares in sorted cell order, and the cells are coarser than the IEBL, so the alphabet decided which cell of a split municipality crossed the line (Zvornik: Đulići and Rastošnica consumed the Federation quota before Sapna; Ugljevik: Jasikovac before Teočak). The historian seat audited every cell of the 28 split municipalities plus the eastern enclaves, the Goražde corridor municipalities and Brčko: 252 cells, 190 verified, 57 approximate, 5 unresolved ([audit](../40_reports/20261108_DAYTON_IEBL_CELL_AUDIT.md); source `data/source/peace_plans/dayton_cell_assignments.json`; pipeline `tools/peace/iebl_cell_audit/`). The method reads the 1991 census as republished on the post-1995 municipal structure, so the IEBL is known per settlement. `peace_settlement.ts` now fixes audited cells before the quota pass and charges them against the side's quota; unresolved cells fall to the quota; verified cells are protected from the contiguity pass (which otherwise routed the Goražde corridor through Istočno Sarajevo). Measured on the painted October 1995 base: 33 cells change, RS 48.4 → 47.3, RBiH 32.1 → 33.0, HRHB 19.5 → 19.7; RS one piece, the Federation one piece plus the two Posavina canton exclaves. Open owner decisions, recorded for stage 0: the tiebreak for the 5 unresolved cells (Oštra Luka, Stari Majdan, Veličani, Tošići, Trnovo town); the Trnovo town note in the research report (BHAS puts the town in RS Trnovo); Mostar's weakest per-cell calls (Hodbina, Gornja Drežnica); Jajce read as HRHB under the canton layer. A6 (enclave held at signature) is not yet modelled; the eastern enclave cells are fixed RS as history records and the A6 rule will override that table when it lands.

### 2. Price land for bargaining

Show both **area** and **bargaining value**. Today captured-ground prices and patron capacity scale with area, while the eight fixed packages use authored prices. Prototype one deterministic price model that the UI, validator and bot evaluator can all explain.

| Component | Design |
|---|---|
| Area | Use a bounded area contribution and one opening charge per package. Report territorial share separately. |
| Population and civic importance | Use prewar population bands, documented urban centres, municipal seats and major service hubs. Audit the existing urban list against the operational settlement data. Count a civic role once even when multiple tags describe it. |
| Strategic access | Measure documented bridges, crossings and corridors by what they connect. Count a route once when several cells form it. Allow a small rural cell to carry substantial value. |
| Delegation stakes | Model a bounded premium from a reviewed mandate or a threatened connection. Explain the source of the objection. |
| Fixed packages and patron pressure | Show the rationale for any retained fixed-package premium. Evaluate a bargaining-value ceiling alongside the existing area ceiling and require the applicable approval for any change to protected classes or intervention rules. |

Use prewar population and durable civic roles to price a place. Record displacement and losses separately, so killing or displacing civilians can never make a place cheaper. Keep identity and protected rights outside the price calculation.

Compare small, medium and high premiums on the same fixtures. Include Centar Sarajevo and Gornja Rovna as an equal-area comparison, one high-value rural connection, and Brčko under special status. Use an urban marginal price at least twice the comparable rural price before package overhead as a first balance hypothesis. Check that the premium is meaningful in the displayed package total and that all three factions can afford plausible offers. Record the selected weights, caps and rationale before activation.

**Surfaces.** `front_packages.ts`, `territorial_packages.ts`, `patron_leverage.ts`, `bot_negotiation.ts`, `src/desktop/dayton_proposal.ts`, and the read model. Inputs include `operational_settlements.geojson`, `urban_osids.json`, and reviewed feature sources.

**Exit.** Identical cell sets report identical area across price variants. The breakdown adds to the price used by preview and signing. The patron model accounts for the cost of a compact city. Overlap, cap, refusal and stable-order checks pass, and the three faction witnesses remain playable.

### 3. Build the Constitution Board

Show named jurisdictions for the **BiH state, Federation, Republika Srpska, Federation cantons, municipalities, and treaty-defined special jurisdictions**. Use Annex 4 and the Federation Constitution as historical starting points. Label later implementation and reform with their effective dates. Give authored game alternatives their own provenance.

| First subjects | What the treaty specifies | Case the player can trace |
|---|---|---|
| Police | Local command, appointments, operating jurisdiction, cross-boundary powers, and dispute review | An investigation crosses the entity line. Who initiates, who must cooperate or approve, and who rules on a dispute? |
| Education | Curriculum, standards, school operation, funding, and review | A canton changes its curriculum. Who decides, who pays, and who can require a change? |
| Defense | Command, force organization, deployment approval, finance, and oversight | A deployment is proposed. Which authorities must act before it can proceed? |

Give each power a stable clause ID, scope, rule maker, operator, funding authority, required consents, dispute authority and effective stage as applicable. A shared power specifies the decision rule. Resolve overlaps between legacy toggles and competency rows into one operative assignment or explicitly distinct responsibilities. Show any conflicting assignment before final review. A place card names its responsible jurisdictions and labels any pending status. Treat international oversight as a defined role with a mandate and dates.

After these three subjects pass, expand to revenue and reconstruction, courts and rights, representation and voting, and return, justice and oversight. Map all existing competencies and legacy choices to named powers. Display legacy agreements with the authority data they actually contain and indicate where details are unavailable.

**Surfaces.** `negotiation_types.ts`, the institutional, constitutional and competency catalogs, the resolver and the binder viewer. The resolver owns the effective division of powers.

**Exit.** Each of the first three subjects can be inspected by power and place. The three decision cases follow the agreement's roles. If a delegation asks for one outcome and the resolver projects another, the board shows both.

### 4. Join the views, deepen bargaining, and sign

- **Boundary Map.** Offer wartime control, opening line, current projection, and signed views as appropriate. For each changed place show the sequence, the source or clause and the reason. Highlight exact package members and show price and related concessions. Distinguish an approximate boundary from agreed arbitration. Provide a list for keyboard access or unavailable geometry.
- **Constitution Board.** Show a matrix and an inspectable decision path. Selecting a power switches the map to the relevant jurisdiction layer. Selecting a place opens its authorities and governing clauses. Compare the opening and current rules side by side. Keep maps in proportion and use labels and patterns alongside colour.
- **Bargaining.** Start with a curated exchange for each faction, linking land or access to a specific power. Show the author, demand, concession in return, dependencies and reason. Let the player amend permitted clauses and review the result. Start with existing counteroffer and decline routes. Record any change to live round limits, refusal or deadlock through stage 0.
- **Agreement.** Extend the authoritative record with versioned reasons, jurisdiction and powers, decision rules, price explanation and stable clause links as needed. Review the current resolver result before enabling sign. A draft edit invalidates the preview and late replies are discarded. Sign through the canonical owner, then reopen the recorded map and powers without deriving them from later catalogs. Legacy and other endings follow their existing display paths.
- **Room.** Keep the four hotspots and their labeled equivalents. Return from either view to the same draft, clause, focus and scroll position. Give stale, loading, failed, and unresolved states distinct labels. Keep signing reachable in final review.

**Surfaces.** `src/ui/map/dayton_conference/`, Dayton modal and settlement viewer, `GameStateAdapter.ts`, EN and BCS messages, Verdict, and the existing IPC and save projection where the new fields cross those boundaries.

**Exit.** A first-time player on each faction can explain a boundary, a price, a trade and a decision path. Across the fixtures show a real agreed transfer, a dropped demand with a stable projection, and an offered institutional term that resolves differently. Review, signature and reload agree on the operative treaty.

### 5. Complete the production presentation

Retain the registered Hope Hotel room. Replace the 2172 × 724 arrival proof with a native **3840 × 1280** panoramic master and a verified standard-screen framing. Compose any additional full-frame scene for 3:1 from the start. Record sources, reconstruction notes, rights, safe areas, outline registration, dimensions and export checksums. Render the live terms and map as separate UI. Add rooms or cues when a walkthrough identifies a specific need. [Wright-Patterson venue history](https://www.wpafb.af.mil/News/Article-Display/Article/818636/providing-the-place-wpafb-and-the-dayton-peace-accords/)

**Exit.** Capture 3426 × 1186, 3440 × 1440, 2560 × 1080, 1920 × 1080 and 1280 × 720, including representative views at the highest supported interface scale. Verify exact hotspot alignment, readable terms, map proportions, keyboard access, reduced motion, muted playback, and reachable signing in the packaged app.

## Amendments adopted 2026-11-08

Owner review of the packaged walkthrough (clause-review, RS and RBiH captures) found the plan sound on correctness and thin on experience: an empty room with a blank board, a small static map, a counteroffer that leaks raw cost numbers, and a final review that lists thirty institution rows with live contradictions (police "decentralized" and "State" on one sheet). The seven amendments below are adopted in full. Stage 0, stage 1 and the verification gates stand as written; the stages below are modified where named.

### A1. The war in the room (modifies stage 4 "Room" and the delegation folder)

The delegation folder is the campaign's receipt, generated from state, never authored per faction:
- territory held now against the faction's peak, enclaves kept and lost, condemnation flags and what they cost at the table;
- who holds the pen: the patron's override authority in plain words, with the threshold at which the patron signs over the player's head;
- bargaining capital and the dimensions it came from (`compute_capital.ts`);
- **the refused plans**: every earlier peace plan (`peace_plan_history`) with who refused it, the share it offered, and the military and civilian dead since that refusal (cost ledger). Verify first whether casualties can be read per turn or only as totals; if totals only, show the total at signing against the plan's date.
Exit: a first-time player can say what they refused, when, and what it cost, without leaving the folder.

**Checkpoint 2026-11-08 (Claude).** Built. `sim/negotiation/delegation_folder.ts` builds the brief for the player's faction when the table opens and stores it on the pending packet (`delegation_folder`, optional; older saves show the folder unavailable). Settlement counts now and at the war's height (reconstructed from per-turn deltas; the three factions' reconstructed starts sum to all 712 cells), enclaves, condemnation exactly as the verdict collects it (`currentCondemnationFlags`, extracted from scoring with unchanged behaviour), patron authority against the force threshold, refused catalog plans with their offered shares. The dead come from the Verdict's own sources (`war_dead.ts`: casualty-ledger killed plus civilian killed), stamped on each plan answer (`resolved_turn`, `dead_at_resolution` on `peace_plan_history`), because the per-battle tallies miss non-battle attrition and disagreed with the Verdict by a factor of two on the RBiH fixture. Saves from before the stamp state weeks and displacement only. Budget and readouts moved to the draft. Visual check on the RBiH fixture at 1280 × 720: `F:/AWWV-worktrees/.dayton-design/delegation-folder/`. Owner ruling 2026-11-08: the folder keeps the all-sides soldier dead ("Keep all-sides"); it is the first surface before the Verdict to show other sides' military losses, while in-war screens stay scoped to the player's side. Open item noted: the Verdict's faction report counts "casualties taken" from brigade records (killed and wounded) while its cost summary counts killed only.

### A2. Bounded rounds with a deadline (modifies stage 4 "Bargaining"; stage 0 records the rule)

Replace the single counteroffer with **three rounds**. Each round the mediator tables a draft; each delegation answers in plain language with a reason (never a cost figure); patron pressure rises each round; the third round is take-it-or-leave-it and deadlock ends in imposition through the existing forced path. The pending packet carries the round counter and the per-round responses (state and save-schema change: stage 0 transition table gains `round 1..3`). Reuse `counter_offer_generator.ts`, the threshold bots and `selectPatronForced`. Historical premises for the copy (length of the conference, the final-night deadline, Belgrade holding the pen for Pale, Brčko deferred to arbitration) go to the historian before authoring.
Exit: three rounds reachable for each faction in packaged Electron; no numeric cost visible to the player; imposition reachable by refusing three times.

**Checkpoint 2026-11-08 (Claude); stage 0 rule recorded.** Built, not yet packaged. Rule: a round is a tabled draft (`table-dayton-round`), saved on `pending_dayton.rounds`. At most three rounds. Each tabled round adds `ROUND_PRESSURE_STEP` = 10 patron authority points, two steps at most, through `effectiveDaytonOverride`. That one helper serves bot willingness, territorial forcing and its area budget, institutional forcing and constitutional forcing. No tabled round means no change, so headless and historical-default signing are byte-identical (tested). After round three the room offers only sign or decline. Decline uses the existing path, so the forced table is the deadlock outcome; a decline clears the rounds and the forced table starts without pressure. Replies carry a `reason_code` (accept, accept under patron pressure, close counter, far counter, refusal) and the room shows a plain sentence per delegation, never the engine's cost figures. The conference hides every cost: a "room to bargain" meter replaces the capital line, Demand and Concede buttons carry no figures, and competency and constitutional options hide their costs while reachability locks still apply. Free probing is gone from the draft; the preview remains for the projected treaty and as the review retry. Remaining for this exit: packaged walkthrough of three rounds per faction, and imposition by refusal.

**Walkthrough checkpoint 2026-11-08 (Claude).** Fifteen engine-level strategies on the three retained pending saves (`F:/AWWV-worktrees/.dayton-design/rounds-walkthrough/`). Rule changes recorded here as stage 0 decisions: (1) a fixed package moves only cells across the inter-entity line and only the parties' own cells; a player never concedes its own protected ground, Brčko excepted (D1); protected heartlands and audited cells are never absorbed or cut by the contiguity corridor; (2) the validator refuses what the room does not offer; (3) one treaty autonomy measure (competencies counted once, historical Dayton = 100) for the stored index, dysfunction and the readout; (4) the mediator's deadline adds `ROUND_WILLINGNESS_STEP` = 5 % of capital per tabled round (two steps) to every delegation's willingness and to the signing objection line, on top of the patron authority step. Open for the owner: whether the grade should register treaty gains inside a canon band (scoring is canon; RS is capped by condemnation, RBiH's A band is open-ended and A+ needs zero war-crimes events), and what the Goražde corridor package should mean now that the audited map already gives the Federation the corridor (the package still covers all of Foča, Goražde and Višegrad).

### A3. The map is the hero and shows change (modifies stage 4 "Boundary Map" and stage 5)

- The wall map in the room is live: the current projected line is composited onto the board at its hotspot bounds in the warroom's diegetic style. The board is never blank once the preview resolves.
- Opening it gives a full-bleed Boundary Map with a scrub between **wartime front → opening line → current draft → signed line**; changed cells pulse and are listed with their reason; the refused earlier plans are selectable ghost outlines (A1 data).
- Colour by **entity** (Federation against RS) with faction hatching inside the Federation, because Dayton drew the inter-entity line. Labels and patterns alongside colour; keyboard list retained.
- Art ask (Codex): a drawn base map in the warroom register, and a room plate whose board is a real map board at known bounds.

### A4. The treaty reads as a treaty (modifies stage 3 and the binder)

The binder is organised as annexes: boundary (Annex 2), constitution (Annex 4), return (Annex 7), military (Annex 1A), Brčko. Each clause carries a plain "what this means for you" line. The three first subjects (police, education, defense) are deep; the rest shallow with their authority data. **The toggle-versus-competency contradictions visible in the packaged proof are the first fix of the lane**: one operative assignment per power, shown once.

### A5. The signature lands (adds to stage 4 "Agreement")

One signing beat between final review and the Verdict: the final map, the three signatures, the date, the cost line from the folder. The forced table after a decline looks and reads differently from the free table (the mediator's ultimatum; what declining cost). Art ask (Codex): the signing plate.

### A6. Roadmap first items (adds to stages 1, 2 and 4)

- **Enclave held at signature** stays with its holder with a corridor on the Goražde precedent (stage 1 opening rule; historian and sensitive-history panel sign-off; measured on the retained fixtures).
- **Protected ground is a price class**, very expensive rather than impossible, with the patron refusing to carry it (stage 2 price class, stage 4 bargaining).
- **The decliner's stakes** are explicit: at minimum the forced-table presentation in A5; any engine change to the eight weeks goes through stage 0.

### A7. Stage 2 cut down

Keep area, the existing urban list as a civic premium, and the protected class. Strategic-access scoring (bridges, crossings, corridors by what they connect), the delegation-stakes premium and the subject expansion beyond the first three go to the post-1.0 backlog (roadmap §10).

### Structure and order

- The room panels **replace** the legacy modal's internals (`DaytonNegotiationModal.tsx`); the room must not wrap the old form.
- Order: (1) binder contradictions and the opening boundary (stages 3-overlap and 1, visible defects); (2) A1, A2, A3 (the experience); (3) constitution depth (stage 3); (4) production art (stage 5) and A5.
- Each slice keeps the plan's gates: focused tests and typecheck first; the full suite and 188-week run for anything that moves territory; packaged sign-and-reload proof before a slice is called done.

## Verification and delivery

| Gate | Question and pass criteria |
|---|---|
| Cheap preflight | Run `npm run typecheck` and focused Vitest for the changed surfaces. Start with `dayton_d1_area_brcko`, `settlement_contiguity`, `dayton_player_budget_enforcement`, `dayton_institutional_expansion`, and affected Dayton UI tests. Verify source coverage, expected offers, selectors and normal startup before long tests. |
| Authority and persistence | Run Dayton IPC, parity, headless, decline/imposition, and endgame round-trip tests. Exercise stale requests, failure and retry, duplicate signature, old saves and other endings. Separate approved deltas from unexplained differences. |
| Protected gameplay | For territory-moving or calibration-affecting work, run the project-required full suite, authorized 188-week campaign, protected anchors and deterministic artifact checks. Record the actual campaign command, expected runtime, source SHA, approved deltas and stopping criteria before launch. |
| Packaged proof | After focused tests and browser walkthroughs, run `npm run desktop:package:dir`. Budget 5–10 minutes for packaging and bounded native proof. Verify all three faction walkthroughs, an older save, and one exact sign and relaunch through Field Records using isolated profiles. Record executable and renderer hashes, process exits, signed bytes and the rendered comparisons. |
| Closeout | Keep one independent reviewer per implementation slice, plus the applicable specialist panel. Record decisions, receipts, limitations and focused review corrections. Update the existing engineering contract, ledger and cooperation file as stages land. The owner controls activation and integration. |

Stop the affected stage on an unsupported historical assignment, unexplained territory change, invalid cost or authority, stale signature, protected-anchor breach, or failed package preflight. Diagnose with the smallest reproducible check before repeating an expensive run. Retain command, stdout, stderr, exit, source hashes and screenshots in named stage directories under `F:/AWWV-worktrees/.dayton-design/`.

## Governing references

- [War Termination Spec](F:/AWWV-worktrees/dayton-conference-prototype/docs/10_canon/WAR_TERMINATION_SPEC.md) · [Victory and Pyrrhic Scoring](F:/AWWV-worktrees/dayton-conference-prototype/docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md) · [Sensitive History Design Gate](F:/AWWV-worktrees/dayton-conference-prototype/docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md)
- [Desktop IPC contract](F:/AWWV-worktrees/dayton-conference-prototype/docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md) · [Agent workflow and validation rules](F:/AWWV-worktrees/dayton-conference-prototype/docs/20_engineering/AGENT_WORKFLOW.md) · [RD handoff](F:/AWWV-worktrees/dayton-conference-prototype/handoffs/20261107_dayton_end_map_to_conference.md)
- [Annex 2, Inter-Entity Boundary Line](https://www.ohr.int/dayton-peace-agreement/annex-2/?print=print) · [Dayton Accords map collection](https://findingaids.loc.gov/repositories/7/resources/623) · [Tuzla Canton geography](https://tk.gov.ba/o-kantonu)
- [Annex 4, Constitution of Bosnia and Herzegovina](https://www.ohr.int/dayton-peace-agreement/annex-4/?print=pdf) · [Federation Constitution, Part III](https://parlamentfbih.gov.ba/dom_naroda/bos/parlament/o_parlamentu/ustavfbih.html) · [Agreement on Implementing the Federation](https://www.ohr.int/ohr_archive/agreement-dayton-101195-4/)
