# AWWV Game State Rating — vs. AAA+++ (Paradox-tier) Bar

**Purpose:** Single living "where is the game today, honestly" master. Per-system rating against an AAA+++ / Paradox-tier reference bar, with the exact remaining gap and what work would close it. **Observation-only — no code changes.**

**Updated:** 2026-07-07 docs reconciliation after GUI runway merge and main CI green.

**Studio:** Pyrrhic Games · **Project:** A War Without Victory (AWWV) · **Version:** v0.9.9-beta.1 · **Current release-readiness contract:** required 188w engine-health floor **609/712** after the 2026-06-26 CI-observed re-floor, schema **v36**, 40w structural fingerprint v2 **`6806ddd157044afa`**, and `engine-health-188w` REQUIRED/BLOCKING. The GUI decision-access runway WP-1..WP-9 is merged; the active road is **WP-9 owner friction diaries -> D2 owner full-campaign playthrough -> D3 operator release gate -> D4 final docs/release sweep -> 1.0 tag**. The June 9 `649` / collapse-before-D2 and June 11 `658` floor framing below is historical lineage.

---

## 2026-07-06 Annotation (owner release review — grade caveats, observation-only)

Per §7.2 this annotates rather than rewrites. The 2026-07-06 owner release review (GUI decision-access + Command Authority economy) qualifies three graded rows until played evidence exists:

1. **Row 21 "Inbox + Decision Room loop: A" was contradicted by owner experience** — the shipped panel buried a single decision under ~10 meta-boxes, hard-capped the card list at 4 with no overflow affordance, and deep-links forced the meta-heavy view. WP-1..WP-9 of `../plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md` are merged as of 2026-07-07, covering the flattened Decision Room, quiet-turn digest, own-force unreported discipline, single tactical detail panel, lever convergence, archive spine, qualitative effectiveness display, ambient audio floor, and friction-diary protocol. The row's grade should be re-earned through WP-9 friction diaries, not asserted from contract tests.
2. **Row +N2 "Presidential Command Model + Surface: A" carries an unvalidated economy** — command authority's campaign integral (≤476 CA lifetime ⇒ ~19 max / ~4 hoard-case override acts per 188w, cap-waste, self-penalizing recovery spiral) was never computed or felt; the field is player-only and absent headless, so NO automated gate can see it and D2 was never played. Repair lane: `../plans/2026-07-06-command-authority-economy-plan.md` (CA-0..CA-3).
3. **Grade-coupling rule (standing, from WP-9):** a self-graded UI/product row may not exceed the feel-grade band of the latest owner friction diary (`playtests/TEMPLATE.md`). Contract/browser gates prove routing and truth, not experience; the diary is the instrument for the experience grades.
4. **Row 33 "Music / soundscape / VO" is no longer silent-by-default, but remains asset-limited.** WP-8 unmuted fresh audio preferences, preserved mute/master-volume control, gates playback on first gesture, and added ambient-bed routing plus an asset manifest. It did not ship commissioned ambient beds, music, or VO; the row remains a low C substrate until owner assets and package listening evidence exist.

---

## 2026-06-18 Reconciliation (roadmap/process status)

The June 9 panel grades remain useful as a system-quality snapshot, but the release road and first-hour polish status have moved:

1. **Technical road to 1.0 is closed.** C3, SRK strangle-not-capture default-ON, structural fingerprint v2, and engine-health gating are complete. D2 owner full-campaign playthrough is the sole remaining 1.0 go/no-go gate; no collapse/calibration/build lane should be inserted ahead of D2 without a new owner directive.
2. **First-hour shell residuals have narrowed.** Opening-command display is intentionally UI read-model-only after active startup commander seating failed 188w; Army HQ/OOB commander displays, shell-route exclusivity, event-decision modal ordering, first-hour Records/Chronicle filing, calendar-date decision copy, and top-level `Opening week` chrome are implemented and browser-proved. Remaining work is broader live-browser/axe coverage, richer receipt content, and surface-specific residual raw-copy sweeps.
3. **Srebrenica/Zepa fall ownership is event-owned.** `srebrenica_falls_1995` and `zepa_falls_1995` own the `control_change` fall receipts. Krivaja-95 and Stupcanica-95 are chronology/AAR context and must not be treated as scripted-operation delivery criteria or calibration targets for the fall.
4. **Direct-control residuals are narrower than the June 2 product audit.** The left OOB corps stance combobox/fake local override finding is closed. Remaining doctrine risk is any real mutating sector/personnel/control action that lacks cost, confirmation, and receipt separation.

---

## 2026-06-09 Re-grade (Pyrrhic panel — current `main`)

Four-panel re-grade vs the 2026-05-24 pass below. **Observation-only.** Per §7.2 this annotates rather than rewrites: only **changed rows + new systems + the updated aggregate** are listed here; unchanged rows keep their 2026-05-24 grade in §2. Remediation steps to lift every sub-A system to **A** live in `docs/plans/2026-06-09-path-to-A-system-remediation.md`.

**Headline:** Still **B+ overall — but now broad-based, not engine-carried.** Product shell and content each rose ~half a grade (command-surface convergence + command-card art + reactive-narrative/sensitive-history A-band); engine held A- with the strategic→corps severance (ARMY-GAP-1) closed; **one regression** — Combat A-→B+ on the casualty-realism finding (fix already in flight). Production/go-to-market remains the lone anchor and is operator-owned.

**Changed rows + new systems:**

| # | System | 2026-05-24 | 2026-06-09 | Δ | Driver |
|---|--------|-----------|-----------|---|--------|
| 2 | Combat resolution | A- | **B+** | ↓ | casualty model over-magnitude (military killed ~1.78× RDC; K:W now 1:3.74 ≈ real after PR-1 v2; missing/captured high); ~55.8% from battle-resolution, 43.4% frontline. **Lane-3 investigated + CLOSED-by-HOLD at 649 (owner, 2026-06-09)** — base-rate cuts collapsed territory −63 OSID at 188w (war compensates via battle frequency; owner constraint = keep battle count), realism arc NOT adopted for 1.0. Stays B+. Refs: `20260609_CASUALTY_SOURCE_BREAKDOWN.md`, `20260609_CASUALTY_REALISM_TARGETS.md`, `20260609_combat-realism-lane3-RUN1.md`. |
| 3 | Bot AI — Corps commander | A- | **A** | ↑ | ARMY-GAP-1 closed — `CampaignPlan`/`supply_by_osid`/`recent_losses` now consumed by corps briefing. |
| 4 | Bot AI — Army HQ / political | B+ | **A-** | ↑ | 5 presidential levers (faction-asymmetric) + emergent-signal HQ override; territory-trend drives posture. |
| 11 | Diplomacy / international | B | **B+** | ↑ | Dayton comprehensive negotiation Phases 1-3 (~5.9k LOC: peace_dysfunction, area resolver, Brčko arbitration, entity_autonomy). |
| 15 | Endgame / Verdict | A- | **A** | ↑ | Dayton 5-dimension player-authored peace; verdict consumes negotiation outcomes, not territory-only. |
| 17 | Tactical map (info design) | B+ | **A-** | ↑ | Track C overlays (contested bands, front stability, supply reach, authority/legitimacy modes). |
| 18 | Warroom (React shell) | B | **A-** | ↑ | Converged toolbar IA; native-overlay residue cleaned; StrategicDashboard/EventLog retired. |
| 19 | Warroom (hero art) | A- | **A** | ↑ | Command-card faction art (33 assets) adds period-photo texture. |
| 20 | Army HQ modal | B+ | **A-** | ↑ | Levers removed → clean inspection/records owner (Decision-Room convergence). |
| 21 | Inbox + Decision Room loop | A- | **A** | ↑ | Single lever-issuing host; priority dossier; command-card lens deep-link. |
| 22 | Chronicle / Codex UI | B+ | **A-** | ↑ | Codex tier system + event-dependency-graph unlock + per-response morphing. |
| 29 | Essay / Codex corpus | B+ | **A-** | ↑ | Indexed corpus 96→146; camp/atrocity deposit essays now indexed w/ provenance. |
| 30 | Dynamic Codex / reactive | B+ | **A** | ↑ | Tier system + dependency graph + per-response morph + comparison-atom grammar. |
| 32 | Sensitive-history handling | A- | **A** | ↑ | Ring-3 informational records; source remediation; atrocity essays w/ Ring-2 provenance. |
| 33 | Music / soundscape / VO | D+ | **C-** | ↑ | Real SFX `.ogg` binaries + clean bus; WP-8 unmuted the default tactical audio path, applies preferences before playback, gates on first user gesture, and adds ambient-bed routing/manifest. Still no commissioned music/VO/full soundscape. |
| 36 | CI/CD | B+ | **A-** | ↑ | `release.yml` (tag→Release) + dual-platform packaging matrix with smoke-verify. |
| 37 | Build system | B+ | **A-** | ↑ | Reproducible packaging matrix; determinism static scan tightened. |
| 41 | Localization | C | **C+** | ↑ | Rigorous Bosnian LQA audit + deterministic CI leakage guard (native sign-off still gates B). |
| 42 | Packaging / installer | B | **B+** | ↑ | NSIS+AppImage in CI; `RELEASE_PROCESS.md` + `PLATFORM_TEST_MATRIX.md` landed. |
| +N1 | **AI command chain / officers (real)** | — | **A-** | NEW | v0.9.6 deterministic political→army→corps substrate, now wired end-to-end; opt-in LLM persona harness off the determinism path. |
| +N2 | **Presidential Command Model + Surface** | — | **A** | NEW | 10 levers issuable from one DirectiveCard host; faction-asymmetric stakes preview; commander pushback; CA-cost gating; command-card art wired. |

**Known loose end (not a graded row):** 6 `act_convoy_*` / `act_patron_relations_*` command-card art assets ship but **no lever renders them** (`DIRECTIVE_LEVER_TO_ACT_ID` has no convoy/patron entry) — "ready but unrendered." (Still open as of 2026-06-18.) Historical orphan context: the event-illustration pipeline was wired in #362; Tier-2 orphaned wiring shipped in #365; Tier-1 replay-in-live-play is now shipped; collapse was built then repurposed away from pre-D2 territory gating; AI Advisor remains deferred post-1.0.

**Updated aggregate (2026-06-09):**

| Category | 2026-05-24 | 2026-06-09 | Note |
|----------|-----------|-----------|------|
| Simulation core | ~A- | **~A-** | held; +command-chain integration, −combat realism |
| Frontend / shell | ~B+ | **~A-/B+** | biggest gain — 7 rows up + 1 strong new system |
| Content / lore | ~B+ | **~A-** | reactive narrative + sensitive-history crossed into A-band |
| Code / engineering | ~A- | **~B+/A-** | CI/build up; god-files + telemetry still drag |
| Production / shipping | ~C+ | **~C+** | localization/packaging up; store/trailer/playtest (F/F/C) operator-owned anchor |
| **Weighted overall** | **B+** | **B+ (firm)** | same letter, materially broader base; shell+content caught up to the engine |

**13 rows up · 1 down · 2 strong new systems · 0 other downgrades** since 2026-05-24.

---

---

## 0. Reading guide

**2026-07-06 WP-9 grade honesty note:** UI / command-surface self-grades after the owner-directed GUI decision-access runway may not exceed the latest owner playtest diary's "Did I feel like the President?" band. Use `docs/40_reports/playtests/TEMPLATE.md` for the diary, and treat the score as a cap until a later diary records a higher feel-grade with no new top-three Desk -> Decision -> Advance loop friction.

### Prior art — read first, this file builds on them

This file does **not replace** the existing audit chain. It **updates** it to current state (2026-05-16) and **extends coverage** to systems that prior audits did not formally grade (UI shell, content depth, audio/localization/accessibility, narrative, telemetry, build/CI, soundscape, store readiness).

- **[`2026-04-10 v0.8-to-v0.9 A+++ System Scorecard Plan`](../plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md)** — the canonical engine/systems scorecard. Five weeks old. Most engine grades here build on its grades and either confirm or upgrade based on the 2026-04 through 2026-05 hardening waves.
- **[`audits/20260330_REPO_HEALTH_CONSOLIDATED.md`](audits/20260330_REPO_HEALTH_CONSOLIDATED.md)** — repo health, overlapping-ownership diagnosis. Still load-bearing.
- **[`audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md`](audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md)** — blindspot heuristics + Lane A correctness triage. Most Lane A items have shipped; heuristics remain canonical.
- **[`audits/STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md`](audits/STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md)** — Paradox-style genre mirror. Still the most honest critique of "UI implies clarity the war did not have." Many findings still open.
- **[`audits/20260222_CANON_VS_INDUSTRY_STRUCTURE_AUDIT.md`](audits/20260222_CANON_VS_INDUSTRY_STRUCTURE_AUDIT.md)** — docs structure vs industry GDD/TDD norms.
- **[`audits/20260501_PRESIDENTIAL_PRODUCT_SPINE_C0_AUDIT.md`](audits/20260501_PRESIDENTIAL_PRODUCT_SPINE_C0_AUDIT.md)** — product loop audit. Largely closed by Turn Aftermath + Decision Room + Chronicle waves; remaining gaps surface below.
- **[`audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md`](audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md)** — v0.9.4 shell audit.
- **[`GUI_POLISH_MASTER.md`](GUI_POLISH_MASTER.md)** — 2026-05-16 UI/UX punch-list (this session, 36 findings).

### Grade rubric (extended from the v0.8-to-v0.9 scorecard)

| Grade | Meaning | Paradox-tier mapping |
|------|---------|----------------------|
| `S` / `A+++` | **Genre-defining.** Industry would copy this; players quote it as the reason they bought the game. | Stellaris pop system at launch; CK3 character system; HOI4 division designer. |
| `A++` | **AAA shippable, signature feature.** Owner clear, contracts honest, scenario-proven, UI explains it, players notice the depth. | Most flagship Paradox systems at v1.0. |
| `A+` | **Strong, trustworthy, one polish step from signature.** | Solid Paradox 1.x systems. |
| `A` / `A-` | **Strong but with one or two bounded seams or under-proven product behavior.** | Working Paradox-DLC-era systems. |
| `B+` / `B` / `B-` | **Valuable and playable** but mixes truth with drift, partial ownership, or thin product. | Paradox systems at launch that earned mediocre reviews. |
| `C` | **Structurally present but too partial or fragile to trust broadly.** | Common at indie 1.0 — visible cracks. |
| `D` | **Missing canonical owner/contract; blocked.** | Pre-alpha placeholder. |
| `F` | **Effectively absent.** | Feature listed in roadmap, not in shipped product. |

### Project context (one-paragraph identity)

AWWV is a **deterministic strategic-level simulation of the 1992–1995 Bosnian War**. Three factions (RBiH/RS/HRHB), week-long turns, ~712 settlements (OSIDs), brigade-level OOB, corps/army command chain. Genre: **negative-sum operational wargame** — closer to AGEOD / Combat Mission / Hearts of Iron's grimdark cousin than to Civ. Player commands at army → corps → sector level; brigades never attack independently. Tech: TypeScript + Vite + React + MapLibre + Electron, ~700 source files, ~3500 vitest tests, 156 combat files, 91 state files, ~700+ docs (canon + engineering + reports).

---

## 1. Headline assessment

**One sentence:** AWWV is currently a **B+ simulation core wrapped in a B- product shell**, ~6–9 months of disciplined polish work away from being a credible AAA+++ release on the Paradox shelf — but the gap is **not** in simulation depth (which is already approaching A-tier in several areas); it is in **(a) UI palette/density/onboarding polish, (b) presentation of friction, (c) content reactivity, (d) audio/localization/accessibility, and (e) production-side packaging/store readiness.**

**Strengths that are already at or near AAA+++:**
- Determinism scaffolding + replay + golden-seed regression. Genuinely **better than most Paradox titles** at this — Paradox tolerates non-deterministic hotfixes; AWWV does not.
- Documentation density and self-awareness about technical debt — `docs/PROJECT_LEDGER.md`, `napkin`, `life_lessons`, `MEMORY.md`, master files, prior audit chain. **Better than most studios of comparable team size.**
- Historical research depth (Balkan Battlegrounds knowledge base ingestion, ICTY anchoring, 83 essay corpus, Cost Ledger / Consequences system, Dynamic Codex).
- Sector / front-line truth post-2026-04 hardening — at `A` per prior scorecard, confirmed.

**Weaknesses that are genre-blocking right now:**

**2026-05-18 correction:** The former hidden-decision blocker is closed for engineering scope. `docs/40_reports/audits/20260516_PRESIDENTIAL_INBOX_DECISION_SURFACE_AUDIT.md`, `docs/40_reports/implemented/20260516_GUI_PHASE0_DECISION_SURFACE_AND_POLISH.md`, `docs/40_reports/implemented/20260517_PARAMILITARY_INBOX_AND_REVIEW.md`, and `docs/40_reports/implemented/20260518_INTEL_FRICTION_AAR_ANNOTATION_BATCH12.md` document the surfacing chain from engine-routed paramilitary requests through Inbox / Decision Room / AAR context. Remaining sensitive-history work is richer branching depth, public-safe framing, and authored downstream consequence arcs.
- **Sensitive-history consequence depth.** The engine now asks visible player-facing questions for paramilitary deployment and related decision families; the AAA+++ gap is that those decisions still need deeper downstream arcs, Codex framing, and post-resolution context. This is now a content-reactivity and narrative-framing gap, not an invisible decision queue.
- **UI presents control / front lines / supply / authority with more crispness than the historical war actually had** (Strategic Design Council audit P0; still mostly unaddressed at the visualization layer).
- **First-session player experience.** Tutorial onboarding is present but spread across 4–5 sequential overlays; opening brief is a paragraph block; no in-context glossary; the player cannot tell what the game is for inside the first 10 minutes.
- **No audio system.** Zero ambience, zero stingers, zero UI feedback sounds, no music. For a sober historical wargame this is survivable; for AAA+++ it is not.
- **Localization remains early.** Main Menu, Credits, Side Picker, Settings, Pause Menu, fallback Game Over surfaces, rich VerdictScreen chrome/report/Dayton/milestone labels, Dayton value mappings, outcome-class badges, known condemnation notices, capital-dimension labels, WarCostSummary labels and known divergence notes, CinematicVerdict static chrome plus generated comparison callouts, verdict share-summary wrappers/outcome-class/comparison labels, Codex chrome/generated comparison notes, Chronicle generated comparison notes, Settlement Timeline date/empty/casualty chrome, Presidential Toolbar primary chrome, Turn Aftermath modal/generated prose/archive prose/date labels, War Summary title/tabs/overview/campaign-cost/drag/situation chrome, humanitarian convoy decision chrome, operations-planning parameter chrome, Chief of Staff header chrome and generated briefing prose for stable/no-alert, combat/territory, exhaustion, alerts, command-strain, and Letter Home casualty vignettes, Warroom priority docket/status-bar/date chrome, War Planning map date chrome, Presidential Inbox opening/quiet/panel chrome, Decision Room advance-readiness/pre-advance gate chrome, panel frame chrome, read-model lane/source labels, and owned generated card prose, and deterministic verdict scene prose now use the English/BCS substrate, but broad BCS coverage, terminology review, and native-speaker validation remain a credibility requirement for a Bosnian War game.
- **Accessibility:** v1.0 P0 blockers are closed and statically guarded: clickable-div elimination, WCAG AA contrast tokens, OS + in-game reduced motion, and programmatic form labels were implemented in `07163a48` and re-verified in Batch 18.
- **No marketing / store presence / soundscape / trailer.** Per roadmap "v0.9.1 store marketing" was absorbed into v0.9.5; outreach is operator-owned, not roadmap debt — but for AAA+++ release, the gap is large.

**Verdict against the AAA+++ bar:** **A- as a simulation engine. C+ as a product. B- average overall, weighted by the product gap.** A solid Paradox-tier flagship needs both halves at A+ minimum.

---

## 2. System-by-system rating

**2026-05-16 Phase 0 rating correction:** Rows #12 and #32 below originally record a same-day downgrade caused by the hidden RS paramilitary decision queue. Phase 0 implementation closed that blocker and audited the broader Inbox decision surface. Treat #12 Event / decision system and #32 Sensitive history handling as restored to **A-** for current engineering truth. Their remaining AAA+++ gaps are outcome-arc depth, Codex framing, and future audit discipline, not hidden sensitive-history decisions.

### 2.1 Simulation core (engine)

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 1 | **Determinism + turn pipeline** | **A+** | Sacred rules enforced; deterministic RNG; sorted iteration via `strictCompare`; golden-seed regression; 151-step war pipeline; 40w hash byte-stable across baseline reruns; real-save byte-identity; adapter-after-deserialize contract; direct continue-from-save final-save/hash equivalence; replay tail equivalence for resumed runs. | Full V8 packaging-build determinism cross-platform proof remains operator/platform evidence, not a missing engine contract. | `tests/scenario_continue_from_save_equivalence.test.ts` and `docs/40_reports/implemented/20260519_SAVE_REPLAY_DETERMINISM_PROOF.md` close the former save-continue/hash-chain and replay-equivalence gap. Next lift is reproducible packaged-build evidence across clean hosts/signing environments, not another save/load proof. |
| 2 | **Combat resolution** | **A-** | 156 files in `src/sim/combat/`. Lanchester concentration, urban/forest/elevation modifiers, defensive fire (P1 1.8× cap), graduated morale curve, sub-segment ID fix, sector-anchored launch contract. Hot path profiled and cut aggressively in 2026-05-15 lanes. | Defensive friction (artillery/terrain/entrenchment) is now considered in launch feasibility, but **predictor confidence** during planning is still under-proven; combat outcomes can surprise a tutorial-grade player. | A "Why did this happen?" mini-AAR per battle (already partially via Chronicle COST cards) + tuned predictor confidence band. The math is solid; the explanation surface is thin. |
| 3 | **Bot AI — Corps commander (intelligent)** | **A-** | `src/sim/combat/commander/` (10 files). Real authority, real memory, competing options, explainable choices — meets Priority 3 from 2026-03-30 consolidated audit. Subordinate index + enemy-equipment context + must-hold queue all profiled and committed 2026-05-15. Batch 41 (UI-2, 2026-05-18) added a Decision Room pushback signal card (`pushback:player-army-co`) that promotes existing `order_refused` / `order_pushback` / `order_modified` events plus PARTIAL/REFUSED `armyCoDecisionTraces` rationale into the Decision Room and routes back to the Army HQ briefing tab (existing OrderInterpretationPanel + ArmyCoPushbackPanel owners). | Decision Room now flags refused/pushed-back/modified directives ahead of advance-turn; per-corps stance rationale outside the briefing tab is still thin. Pushback panel still also renders on the advance modal (canonical). | Continue surfacing per-corps stance rationale inside the corps briefing dossier; the Decision Room ledger entry is now data-driven. ~5 days. |
| 4 | **Bot AI — Army HQ / political layer** | **B+** | Functional. President bot + persona scaffolding for Claude-as-faction QA infrastructure landed. RBiH/RS/HRHB officer growth / degradation visible in 188w runs. | Army-HQ → corps directive bridge is real but **decisions still feel mechanical** — bot picks a stance, not a campaign theme. Mladić-class autonomous-launch warnings shipped; richer "personality" beyond override-tolerance still pending. | Add 1 narrative trait + 1 doctrinal trait per army commander, surfaced in Personnel tab. Already designed in `architect` agent prompts. ~7 days content + 3 days wiring. |
| 5 | **Bot AI — Brigade level / tactical** | **A-** | 15 `bot_*.ts` files. Sector-anchored brigade assignment, depletion guards, slot-cap recovery, sub-segment ID prefix fix, return-to-corps + sectorMarch + sectorAttack + pocketEvacuation + homeDefense + uncontestedOccupation all profiled and cached. Front-density indexed. | "Brigade never fights" still classifies ~78 cases per 40w run (split per 2026-05-15 into `loan`/`operation_participant`/`sector_front`/`sector_reserve`/`sector_rear`); `sector_front` live-inert is the live target lane. | Close the `sector_front` inert subset (~61 cases per 40w). ~5 days. |
| 6 | **Operations system** | **A-** | 22 files. Operations Singularity plan executed; `corps_operation_helpers.ts` is canonical factory; `sector_offensive.ts` is canonical lifecycle owner. Operation opportunity dossier surface + force-quality + footprint + redirect DTO all shipped. Batch 14 adds an Army HQ Records -> Operation History completed-operation deep review from existing AAR fields. Batch 15 files player-scoped completed-operation AAR cards in Chronicle and routes them back to the Records owner. Batch 16 preserves the completed-operation id from Chronicle and auto-opens the matching History row. Batch 17 adds per-axis objective status chips from existing `axis_summaries`. | Reinforcement-bounded launch truth is in place, Records has a compact post-mortem that now covers overall objective/provenance review plus per-axis outcome labels, and Chronicle gives completed operations a narrative time-placement route that lands on the exact AAR row. The compact Records/Chronicle handoff now exhausts the current completed-operation AAR fields for player-facing review. | A larger Paradox-tier operation overlay now needs a new presentation mandate or richer authored/simulation fields; do not invent new schema solely to decorate the existing compact Records owner. |
| 7 | **Sector / front-line system** | **A** | Strong post-2026-04 (triple-junction connectivity, isolated pocket consolidation, sector-anchored launch). Sector demarcation overlay removed 2026-05-16 (cleaner map). | Sector visibility on the map is now lean (no demarcation lines); promotion to **A+** needs the residual ambiguous territorial classification audit from the prior scorecard. | Bounded content audit per prior scorecard (~5 days). |
| 8 | **Supply / logistics / corridor** | **B** | Supply pressure modeling lives; ethnic supply constraints exist. The presidential Decision Room surfaces player-scoped supply risk from `supplySummaryByFaction[playerFaction]` and `supplyStateByOsid`; the tactical map has a supply-reach overlay; and 2026-05-23 closes `BRIEF-GAP-1` by adding player-faction supply/corridor risk to the sim-side command briefing from canonical `supply_state_by_osid` / `supply_corridors_osid` reports. | Supply is now visible in the briefing/Decision Room/map stack, but still lacks richer operational affordances: why a corridor is brittle, what action can relieve it, and how logistics priority changes expected endurance. | Polish supply affordances: corridor drill-down, relief-path hints, and clearer logistics-priority effect explanation. Mechanics already exist; the next lift is player interpretation. ~5-7 days. |
| 9 | **Early war / militia / formation emergence** | **A-** | 18 files; militia pools, JNA dissolution, authority degradation, control flip. Recent OOB-data lane (Lane 2 `be7e0715`) closed BUG-01. Army HQ Personnel now shows selected-faction mobilization pool health from existing `mobilizationSummary`: available, committed, exhausted, strategic reserve, exhaustion percentage, and largest available pools. | Basic pool visibility is now live, but players still need recent-emergence trends, pool-decay explanation, and JNA equipment-transfer visibility. | Extend the Personnel mobilization surface with recent emergence rows / decay trend and JNA transfer context when canonical state exposes those signals. ~4-6 days. |
| 10 | **Officer / personnel system** | **B+** | Three-tier officers (army/corps/operation), succession, accolades, command friction multiplier. v0.8 Command Chain CLOSED. Persona-grounded LLM commanders side-channel landed (default OFF). Mini-bios are surfaced in Army HQ/OOB; 2026-05-23 adds Chronicle `personnel` "Officer of the Week" cards for completed-operation commanders and Personnel trait chips from existing `command_style` / `known_for` fields. | Officers now have visible identity beats, but the first-pass authored content is still concentrated on opening commanders and lacks portraits/deeper relationship arcs. CK3 character depth is out of scope; HOI4-style broad trait readability remains the achievable next lift. | Expand historically reviewed mini-bio/trait coverage beyond first-pass opening commanders and consider portrait/asset treatment. Do not wire traits into behavior without a separate design/canon lane. ~7-10 days content + UI polish. |
| 11 | **Diplomacy / international system** | **B** | Bilateral ceasefire, patron events, bot negotiation responses. UN Resolutions and arms embargo authored as essays. Dayton system + dimension merge shipped. The Warroom diplomatic telephone now opens a dedicated read-only Diplomacy panel with active proposals, negotiation timeline, international pressure, what-moves-the-needle hints, external actor bands, and per-actor stance prose derived from existing support/constraint/isolation/sanctions signals. | Diplomacy is no longer panel-absent, but it is still mostly a read-model over event/proposal state rather than a deep per-turn geopolitical system. No diplomatic map view, no rich per-power history, and no treaty/actor relationship drill-down. | Extend canonical state/read-models for per-power stance causes, treaty history, and diplomatic map context. Avoid adding mechanics until the existing panel has richer historical/player-facing explanation. ~7-10 days. |
| 12 | **Event / decision system** | **A-** | 10 files in `src/sim/events/`. ~244 consequence events live (per 2026-05-10 closure). Catalog +24 events in 2026-05-05 Wave 13–16. EU4-style decision events with `event_types.ts` predicates correctly using `>=`. The 2026-05-16 paramilitary inbox blocker is closed for engineering scope. June 18 first-hour work also made decision timing player-safe with calendar dates and confirmed Srebrenica/Zepa fall rows (`srebrenica_falls_1995` / `zepa_falls_1995`) are event-owned `control_change` receipts. | Volume is good; remaining AAA+++ gap is branching depth and consequence arcs, not invisible decision queues or operation-delivered Srebrenica/Zepa fall mechanics. | Each P0 decision family (Srebrenica, Markale, Dayton, Storm, paramilitary) needs richer downstream arcs and Codex framing. Cost Ledger ties exist; arc authoring is the gap. Guard Srebrenica/Zepa through event receipt/canon tests, not Krivaja/Stupcanica operation tuning. |
| 13 | **Cost Ledger + Consequences** | **A-** | v0.9.0 CLOSED-FOR-AGENT-SCOPE. Inventory: 244 events / 827 effects / 18 live substrates / 0 partial-reader / 0 unknown. Reader annotations + tokens (`ANNOTATION:<tag>`, `{cost_annotations}`) shipped Wave 19. | The system is **structurally complete**. The promotion to A+ is consumer-side: how many essays / Chronicle cards / Codex sections actually surface the consequence tokens. v0.9.1 dynamic Codex is partial. | Author 20+ more dynamic Codex sections that consume real ledger annotations. Per Memory: 60 v0.9.1 sections already authored, growing. ~14 days for the next wave. |
| 14 | **Economy / wartime industrial** | **C+** | Reserves tracked; supply pressure tracked; manpower implicit via brigades. No explicit war-economy game. | Per Game Bible the project is intentionally **not** a Vic3-style economy game — but at AAA+++ players still expect an economic surface (recruitment cost, equipment scarcity, mobilization waves). Currently abstract. | Decision: either (a) explicitly disown economy as out of scope and lean in to scarcity instead, with UI to match, or (b) add a thin economy layer (manpower pool, equipment delivery, scarcity events). The current half-state is the gap. ~3 days for (a), ~20 days for (b). |
| 15 | **Endgame / Verdict / Pyrrhic scoring** | **A-** | VerdictScreen exists; v0.9.0 Pyrrhic scoring contract shipped per `2026-04-14-v090-victory-pyrrhic-scoring-contract-plan`. Compare-to-historical baseline + divergence note system shipped. Six historical scenarios. 2026-05-18 adds a cinematic verdict band, deterministic share summary, and mobile lower-flow controls for Report/Reckoning/Codex/Replay over existing scoring truth. Batch 44 (UI-5, 2026-05-18) subdivides the long FactionReport into stable named sections (`faction-report-score`, `faction-report-dimensions`, `faction-report-statistics`, `faction-report-dayton`) and wraps the lower-priority three in `<details open>` with a `sm:hidden` summary toggle — desktop renders dense and unchanged, mobile gains tap-to-collapse without removing any score/Cost Ledger field. | Cinematic verdict band, mobile lower-flow, and faction-report mobile subdivision are in. Remaining lifts are content-side (more authored verdict prose tied to Cost Ledger tokens) and visual polish. | Next: authored verdict prose layer + Playwright mobile capture. ~3-5 days. |

### 2.2 Frontend / shell

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 16 | **Tactical map (rendering)** | **B+** | MapLibre + Deck.gl counters default-on; PMTiles; 27 settlement labels; map mode legend; 30° pitched BiH-bounded camera; sector demarcation removed; click picking with screen-space fallback. | Map is **functional** but does not yet **look** AAA+++. No weather, no day/night, no season, no terrain shading depth, no animated front-line tension. HOI4 / Stellaris move when nothing's happening; AWWV is static. | (a) Subtle terrain hillshade as a permanent base layer; (b) animated front-line "breathing" pulse when stance changes; (c) seasonal map tint per week (winter snow, summer green); (d) battle-flash markers for the current turn. ~15 days. |
| 17 | **Tactical map (information design)** | **B+** | Track C C1-C4 implemented: contested/disputed bands, front stability classification, supply reach/isolation overlay, and separate Authority/Legitimacy map modes. | Major Strategic Design Council map findings are addressed in the tactical map by `implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`. Remaining risk is visual validation and richer command-friction/exhaustion presentation outside this map layer. | Add browser/Playwright captures for the four map surfaces, then continue non-map friction/exhaustion presentation work. |
| 18 | **Warroom (React shell)** | **B** | Hotspot contract restored; dynamic board overlays restored; paper map + date overlays render; priority docket. The stale 2026-05-16/22 issues for no-state CTA, visible hotspot labels, Comic Sans fallback, diplomacy telephone routing, and tactical chrome bleed are closed and guarded. The wall-calendar label now avoids viewport-scaled type, and the Warroom advance affordance has stronger command weight. | Warroom is no longer carrying the old P0/P1 shell blockers. Remaining lift is visual validation in packaged Electron, denser priority-docket hierarchy, and richer authored room-state art/animations. | Capture a fresh packaged-Electron Warroom visual pass, then tune docket density and scene-state art. |
| 19 | **Warroom (hero art)** | **A-** | 15 room images planned (`prewar/year1-4` × 3 factions); flag baked into art; desk map projected as overlay; clean-room art direction shipped. | Art direction is **the strongest single visual asset** in the project. Lifting to AAA+++ needs a tiny additional layer: subtle ambient animation (window light shift, paper flutter, candle flicker per faction's exhaustion state). | Animation pass on the room art (sprite-anim, ~3 frames per element). ~10 days; needs artist. |
| 20 | **Army HQ modal** | **B+** | 4 tabs (BRIEFING / SUMMARY / RECORDS / PERSONNEL). CoS briefing + Decision Room synthesis. Force quality dossier + opportunity surface live. June 18 first-hour polish adds a compact corps Command Access strip, sector/operation-first corps drilldowns, archive-first Records routing, routeable command-briefing chips, Personnel vacancy counts that honor opening read-model commanders, and atomic Tactical Map field-inspection handoffs. | The stale "first-paint hierarchy" blocker is materially reduced. Remaining density lift is clearer reviewed/no-action/action-required state, destructive-action confirmation separation, and broader live-browser/accessibility proof. | Keep Army HQ as the inspection/records owner; route presidential priorities through Decision Room. Capture post-turn and accessibility fixtures instead of rebuilding the modal from scratch. |
| 21 | **Presidential Inbox + Decision Room loop** | **A-** | Command-loop lanes + product-loop heartbeat + source handoffs + active dossier + pre-advance review + priority docket all wired. June 18 route ownership makes pre-advance priority review, tactical `1 REVIEW`, and operation-opportunity actions open the Warroom-native Decision Room while Army HQ stays evidence/source handoff. Required decisions block competing Desk/Warroom shells, and event/inbox copy now uses calendar dates. | Decision Room first-paint is safer, but command-card families still need richer per-family action/inspect/monitor clarity and future receipt content. | Continue with per-family command-loop depth and post-turn receipt fixtures; do not route presidential blockers back into generic Army HQ briefing. |
| 22 | **Chronicle / Codex / narrative UI** | **B+** | Chronicle review filters (all/headlines/cost/combat/politics/humanitarian/military/diplomacy/narrative); COST cards for severe turns; Codex dynamic sections authored against Cost Ledger tokens. Turn-record deep linking. June 18 first-hour work files resolved foundational decisions into Chronicle before any turn aftermath archive exists and keeps raw response/consequence ids out of visible copy. | Chronicle is no longer missing opening-week decision memory; the remaining gap is presentation drama and deeper authored consequence reach. | Expand chapter/recap visual treatment and consequence prose using existing Cost Ledger/Codex tokens. |
| 23 | **Turn Aftermath modal / records** | **A** | Judgment / Memory packet shipped (cost / signal / action / territory / quiet). Routes to Inbox / War Summary / Records / Chronicle / Codex. 2026-05-23 adds one deterministic authored line per aftermath tone, then localizes modal chrome, metrics, generated headlines, cost reasons, signal wrapper labels, judgment prose, campaign pulse/cost archive prose, cost-driver labels, Records-panel chrome, and War Summary overview/campaign-cost/drag/situation chrome through the English/BCS substrate. | Immediate and archived aftermath reports now have stronger narrative beats and first-pass BCS coverage. Remaining lift is broader Chronicle chapter recap and endgame prose depth. | Keep Turn Aftermath stable; route future narrative work to Chronicle chapter recap / endgame prose. |
| 24 | **Onboarding / tutorial** | **B+** | OnboardingOverlay is the single mounted first-run tutorial owner; PeaceWarTransition is armed only by a live peace-to-war loaded-state transition. OpeningBrief is a 3-bullet scan card with Begin / Read later. CoachmarkLayer covers Decision Room, Operation Opportunity, Chronicle filters, and Codex on first hover. June 18 first-hour proof confirms browser-preview onboarding dismissal survives shell remounts and the opening sequence reaches foundational decision -> Records/Chronicle filing without stale shell stacking. | Live browser/Playwright first-session capture remains useful, but the old tutorial persistence/nav-blocker is not the active P0. | Continue visual/playtest validation and first-ten-minute clarity, not substrate replacement. |
| 25 | **Side picker / first-run** | **B** | 3-faction picker; load save; continue last run; AWWV version label. Current source and `tests/ui_shell_frame_contract.test.ts` prove the old GUI_POLISH P0-2 emoji issue is closed: `SidePickerOverlay.tsx` uses the project icon system and the rendered button copy is emoji-free. | Remaining first-run lift is visual/playtest validation and richer side-selection onboarding, not the stale emoji blocker. | Keep first-surface tone checks in shell-frame contracts; route future work to onboarding/playtest validation rather than rebuilding the picker. |
| 26 | **Pause menu / settings** | **B** | PauseMenu + SettingsScreen exist. Escape now clears map selections before opening Pause, leaves Army HQ to its own modal owner, and Settings owns Escape above the global pause shortcut. Settings already covers audio, accessibility, language, diagnostics, and tutorial restart where eligible. | Keyboard discoverability and settings breadth are better than the stale C+ row, but no key remapping and richer display/video controls remain. | Add key-remap/display controls and a compact shortcut reference when those substrates are designed. The core Escape tree is closed. ~4-6 days. |
| 27 | **Performance / framerate** | **B** | 2026-05-18 n1881 profile kept 40w hash `42607f83870e01d5` and identified sector reconstruction/reconciliation as the dominant measured target. Batch 8 Task 3 added opt-in child attribution inside `recoverDroppedFrontEdges(...)`; Batch 9 implemented build-scoped reuse of that setup and timed n1885 at `96896.459ms` / `2422.411ms per turn`. Batch 10 Task 5 proved n1881/n1885/fresh-profile artifact byte-identity and found the next measured leaders are `buildFactionSectors:RS` and `buildFactionSectors:RBiH`. Batch 11 added sidecar child attribution under `buildFactionSectors:*`; Batch 12 descended into `buildMultiSectorsForCorps(...)`; Batch 13 attributed `buildSectorFromSubSegments(...)`; Batch 14 optimized repeated active-formation scan lists inside that sector-object path; Batch 15 adds a `buildFactionSectors(...)` active-combat index and fresh profile evidence. | Performance is **acceptable at 40w**, mainline target is 188w campaign. Sector reconstruction is still the next big lever, but Batch 15 sidecar evidence still leaves `buildFactionSectors:RS/RBiH`, per-corps construction, brigade classification, and `recoverDroppedFrontEdges:*` as candidates. | Choose the next cut from Batch 15 sidecar evidence and prove it with focused sector tests plus 40w output; do not claim full-harness wins from single noisy runs. |

### 2.3 Content / lore / historical depth

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 28 | **Historical fidelity (sim)** | **A** | 712 OSIDs, 247 brigades, ICTY/BB/museum-anchored OOB, six historical scenarios (apr 1992/1993/1994/1995), 188w runs cover full war. Anomaly detector flags ahistorical drift. | Already a **research grade** above most wargames in this period. Promotion to A+ needs explicit author-attribution per OOB entry so the player can see "Sourced from: ICTY judgment X, OSID Y, page Z." | Wire existing knowledge-ingest provenance into a per-OSID / per-brigade tooltip. ~7 days. |
| 29 | **Essay / Codex corpus** | **B+** | 83 essays on disk (per Memory). 3-pass QA audit 2026-03-25 fixed 24 corrections across 18 essays. Source hierarchy ICTY > museum > BB > Wikipedia. ~13 missing 1992 events still need authoring. | At AAA+++ scale, the corpus would be 200+ essays + interactive maps per battle + voice-over narration. AWWV is at solid book-quality text without media. | Author the missing 13 essays + add inline maps per essay. ~30 days plus art/photo licensing. |
| 30 | **Dynamic Codex / reactive narrative** | **B+** | 60+ v0.9.1 sections authored; ghost-entry system; faction-scoped findings; 18+ packet types (Srebrenica, Dayton, Storm, etc.). Consumes Cost Ledger tokens. | The depth is there; the **reach** is shallow — many ledger annotations have no Codex consumer yet. | Each new consequence event should pair with an essay section addition. Continue waves. ~ongoing. |
| 31 | **Chronicle as narrative spine** | **A-** | Per-turn cards, severity filters, COST card emission, ChronicleSpine + SpiderChart visualization, deep-link to Turn Records, chapter mode, deterministic chapter summaries, and a localized campaign recap synthesized from chapter count, month range, dominant thread, headline anchors, opening/closing chapter, and sensitive-history signal count. | Chronicle now has a real chapter-level narrative spine. Remaining lift is presentation drama: richer session-end layout, better chapter art/state treatment, and visual capture proof. | Polish the recap/chapter visual treatment and add packaged/browser captures; future prose depth should consume existing Cost Ledger/Codex tokens instead of adding a new state owner. |
| 32 | **Sensitive history handling (Srebrenica, Markale, camps, paramilitaries)** | **A-** | SENSITIVE_HISTORY_DESIGN_GATE in canon. §6 triple sign-off chain on shape changes. Stupčanica name-collision fix. Camps reported via Cost Ledger annotation, not gamified. The 2026-05-16 RS paramilitary UI-surfacing drift is closed for engineering scope. June 18 correction confirms Srebrenica/Zepa falls are event-owned `control_change` receipts, with Krivaja/Stupcanica restricted to chronology/AAR context. | Engine handling is exemplary; remaining AAA+++ gap is deeper authored framing, downstream consequence arcs, and receipt/canon guard coverage, not hidden sensitive-history choices or operation-delivery tuning. | Audit future sensitive-history decision families against Inbox/Decision Room as they are added, author the Codex foreword, and keep Srebrenica/Zepa receipt work in event/§6 guard lanes. |
| 33 | **Music / soundscape / VO** | **D+** | A silent, disabled-by-default tactical-map audio substrate now exists: stable cue manifest, no-op bus, local mute/master-volume settings, peace-plan and turn-review hook points, cue readiness metadata, a pure event adapter, explicit-timestamp cooldown suppression, and a root-mounted observer that suppresses initial hydration while turning later loaded-state turn summaries into silent-bus cue calls. | This is still not real shipped audio: no approved assets, no asset-backed playback service, no ambience/music/VO content, and no audible mix. AAA+++ still needs 1 main theme, 4-6 ambient pieces, UI feedback, stingers, and optional narration. | Build asset-backed opt-in service after approved packaged assets exist, then commission/integrate the score and sound design. ~45-60 days depending on composer/audio pipeline. |

### 2.4 Code / engineering

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 34 | **Code maintainability / god files** | **B** | Decomposition program CLOSED per 2026-04-14 — `attack_resolution_osid.ts` 1809→907 (-49.9%), 7 tranches extracted. `war_phases.ts` (151 steps), `sector_offensive.ts`, `electron-main.cjs` remain large but non-blocking. | God files were the documented risk; they have been bounded. Promotion to B+ would mean `war_phases.ts` step-pack extraction. | Optional bounded decomposition pass. ~10 days. |
| 35 | **Test suite** | **A-** | 3513 tests / 298 suites passing (vitest). 137 vitest suites + node:test in parallel. Determinism tests, lifecycle legacy tests, integration tests, CSS z-index gate, modal gate. Husky pre-commit `npx tsc --noEmit`. | Coverage is **broad and disciplined**. AAA+++ adds visual regression (Playwright/Percy/Chromatic) and load testing. | Playwright visual regression for the 8 hero screens. ~7 days. |
| 36 | **CI/CD** | **B+** | Baseline Regression + Desktop Release Guard green; AppImage + NSIS smoke + artifact upload; 4-job release matrix. v0.9.5 platform packaging audit closed 6/8 P1, 4/8 P2. | Missing: macOS support, code signing, auto-update, Steam integration. v0.9.5 audit §6 R7 flags these. | Per `2026-04-06-v095-platform-packaging-store-plan` — signing + macOS + auto-update is ~30 days + commercial certs. |
| 37 | **Build system** | **B+** | Vite, Electron, electron-builder. `npm run desktop:map:build` clean. Reproducible-build harness gated on P1-G3/G4 (which shipped). | Promotion needs reproducible-build proof + signed artifacts. | Per same plan. |
| 38 | **Architecture documentation** | **A+** | CANON.md hierarchy, Engine Invariants, Phase Specs, Systems Manual, Rulebook, Game Bible, ADRs, CODE_CANON, REPO_MAP, master files per system, and a traceable High Concept one-pager in `docs/50_launch/marketing/high_concept.md`. Better than most studios this size. | The core architecture/product framing gap is closed. Further promotion would require keeping public-facing launch collateral synchronized with current evidence as features move. | Keep the High Concept, claims inventory, store copy, and press kit refreshed before public release claims. |
| 39 | **Telemetry / observability** | **B-** | Anomaly detector lives; `data/derived/_debug/` for profile artifacts. Cost Ledger annotation. CI logs. Default-off local-first crash diagnostics now cover global `error` / `unhandledrejection` events, Settings export/clear/consent, and localized React error-boundary crashes with `uiSurface` zones. | No upload provider / Sentry-equivalent aggregation. No anonymized opt-in playtest telemetry stream. Post-launch triage is still manual export rather than live ops. | Add an opt-in upload adapter/provider, crash aggregation dashboard, and privacy-reviewed playtest telemetry events. ~10-14 days. |

### 2.5 Production / shipping

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 40 | **Accessibility** | **B** | v0.9.3 a11y lane shipped semantic landmarks and tablist arrow keys. Commit `07163a48` closed the four v1.0 P0 blockers: clickable controls, WCAG AA contrast tokens, reduced-motion gates, and form labels. Batch 18 re-verified the static gate suite (33 tests) on current HEAD. | Browser/axe spot-check evidence and broader visual/assistive-technology QA remain useful before a release-candidate claim. | Keep static guards as the P0 gate of record; add browser/axe spot-check evidence during RC validation rather than rebuilding the closed lane. |
| 41 | **Localization** | **C** | English remains the default, but the game is no longer English-only: a typed i18n substrate with English fallback exists, Main Menu/Credits/Side Picker localize core shell copy, Settings has first-pass ASCII BCS copy including its Audio section, the in-game Pause Menu localizes common command actions, fallback endgame shells localize outcome/standings copy, rich VerdictScreen chrome/report/Dayton labels localize mobile tabs/footer actions plus FactionReport labels, CinematicVerdict localizes static chrome, deterministic scene prose, and generated comparison callouts, WarCostSummary localizes static labels/formatter strings/generated divergence notes, verdict share-summary wrappers/outcome-class/comparison labels localize, Codex chrome localizes, Codex/Chronicle endgame generated comparison notes share that formatter, Settlement Timeline localizes date/empty/casualty chrome, Presidential Toolbar localizes primary shell chrome/current-turn suffix/command-authority accessibility text, Turn Aftermath localizes modal/records chrome plus generated per-turn/archive prose and map-shared date labels, War Summary localizes its title/tabs/overview/campaign-cost/campaign-drag/situation chrome, humanitarian convoy decision chrome localizes, operations-planning parameter chrome localizes, Chief of Staff localizes header chrome, current generated briefing prose, and all 25 shipped Letter Home casualty vignette templates, Warroom priority docket/status-bar/date chrome and War Planning map date chrome localize, Presidential Inbox localizes opening/quiet/panel chrome, and Decision Room localizes advance-readiness/pre-advance gate chrome, panel frame chrome, read-model lane/source labels, and owned generated card prose. | Coverage is still incomplete, unreviewed by native speakers, ASCII-only, and missing major surfaces such as broad Chronicle prose, rich Verdict authored prose/source-provided labels, source-provided Decision Room prose, map overlays, event prose, broader operation-planning chrome/prose, launch copy, and terminology review. | Translation memory + broad UI extraction + native-speaker BCS review + release terminology pass. ~60 days first language; ~20 days per additional. |
| 42 | **Packaging / installer / clean-VM verification** | **B** | NSIS + AppImage smoke + dev-host approximation pass (2026-05-09). Clean-VM cosmetic items remain operator-only (SmartScreen UX, Settings→Apps, %APPDATA% persistence, uninstaller registry). | Signed installer, code-signing certs, macOS .dmg, auto-update channel. | Per v0.9.5 audit §6 R7 + commercial certs. ~14 days work + cert lead time. |
| 43 | **Store presence (Steam / GOG / itch)** | **F** | None. v0.9.1 store marketing folded into v0.9.5 and then absorbed; outreach is operator-owned. | At AAA+++, Steam page + store assets + trailer + Press Kit is part of launch. | ~30 days of marketing + asset production. **Operator-owned, not engineering.** |
| 44 | **Playtesting / community** | **C** | v0.9.2 package shipped (recruitment copy, feedback schema, runbook, tester quickstart, known-issues template, triage board, weekly digest, package manifest). Operator-owned outreach. | Closed-beta cohort + Discord / forum + bug-tracker public surface. | ~14 days infrastructure + ongoing operator work. |
| 45 | **Trailer / press kit / marketing collateral** | **F** | None observed. | AAA+++ needs: 1 announce trailer, 1 deep-dive dev video per major system, 8 press screenshots, faction reveal art set. | ~30 days video + asset production. **Operator-owned.** |

---

## 3. Aggregate score

### 3.1 Per-category averages

| Category | Systems | Average grade | Equivalent Paradox-tier |
|----------|--------:|--------------:|-------------------------|
| Simulation core | 15 | ~A- | Solid Paradox 1.x flagship system. |
| Frontend / shell | 12 | ~B+ | Above average wargame; below Paradox launch standard. |
| Content / lore | 6 | ~B+ | Strong text content, missing media. |
| Code / engineering | 6 | ~A- | **Above industry average.** Best-in-class for team size. |
| Production / shipping | 6 | ~C+ | The category dragging the overall down. |

### 3.2 Weighted overall

Weighting simulation/code at 35%, frontend at 25%, content at 20%, production at 20%:

`(0.35 × A-) + (0.25 × B+) + (0.20 × B+) + (0.20 × C+) ≈ **B+ overall**`

For **AAA+++ / Paradox-tier release**, every category needs to average **A** or better. AWWV needs **1.5–2 release cycles of disciplined polish** to clear that bar, with the work front-loaded into production/shipping and frontend visualization.

---

## 4. Top 10 leverage moves to reach AAA+++

**2026-05-16 Phase 0 update:** Leverage move #1 is now shipped for engineering scope. The remaining version of that move is no longer "make the player see the decision"; it is "deepen the consequences": author downstream arcs for P0 decision families and add Codex framing for why sensitive-history decisions are handled this way.

Ordered by **(impact / effort)**. These are the work items where one unit of investment produces the most movement toward AAA+++. They are mostly **product / presentation**, not simulation — because simulation is already close.

| # | Move | Lifts | Effort | Why it's the highest leverage |
|---|------|-------|------:|------------------------------|
| 1 | **Deepen sensitive-history consequence arcs (#12, #32)** — the paramilitary inbox truth drift is closed; remaining lift is downstream outcome depth and Codex framing | Sensitive-history credibility and replay depth | ~14d | The player can now see and resolve the war-crimes-adjacent paramilitary decision family. The next AAA+++ lift is making those choices echo through authored downstream arcs rather than stopping at surfacing. |
| 2 | **Map information-design pass (#17)** — contested bands, front stability, supply reach, authority/legitimacy/control as three layers | Tactical map now B+; next lift requires browser visual validation and friction/exhaustion presentation | Implemented 2026-05-16 | Track C C1-C4 closed by `implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`; follow-on is validation/polish, not missing read-model substrate |
| 3 | **Soundscape commission (#33)** — 1 theme + 4–6 ambient + UI set + 3–5 stingers | Lifts shell category by half a grade across all subsystems | ~60d (composer) | Silence is the loudest tell that a wargame is not AAA. |
| 4 | **Onboarding + tutorial consolidation (#24)** | Lifts player-acquisition odds dramatically; cuts churn | Implemented 2026-05-16 | Track D closed the overlay stack, coachmarks, opening brief rewrite, and proof report. Remaining work is visual/playtest validation. |
| 5 | **GUI polish punch-list (this session's GUI_POLISH_MASTER.md)** — 36 items, ~7 person-days | Lifts every shell surface by visible chunk | ~7d | Highest velocity per day in the entire roadmap. Already scoped. |
| 6 | **Cinematic Verdict + Chronicle Chapter (#15, #31)** — endgame feels like CK3 dynasty close, not a stat dump | Lifts narrative + endgame; produces shareable moments | ~24d | Endgame moments drive word-of-mouth more than any other surface. |
| 7 | **Localization to BCS (#41)** | Lifts credibility ceiling; opens the actual market for the game | ~60d | The Bosnian War without Bosnian translation is a credibility cap. |
| 8 | **Diplomacy panel (#11)** | Lifts diplomacy from B- to B+; closes the biggest visible-system gap | ~10d | Per-event reactive → per-turn proactive flip. |
| 9 | **Accessibility RC spot-check (#40)** | P0 closed; release-candidate evidence polish | ~2d | Static P0 gates are closed, but browser/axe spot-check evidence is still useful before an RC claim. |
| 10 | **Officer character expansion (#10)** | Lifts personnel B+ → A-; player remembers commanders as people | ~7-10d | Mini-bios, trait chips, and Officer-of-the-Week are now live for available authored fields; broader historian-reviewed coverage/portraits are the remaining dramatic-density boost. |
| 11 | **High Concept one-pager + press kit (#38, #45)** | Required for review pipeline; current docs are dense | ~7d eng + 30d marketing | Reviewer / streamer onboarding currently impossible. |

**Estimated total of these 11:** ~265 person-days. With 1 dev + 1 composer + 1 translator + 1 artist + 1 PM in parallel, that's **~3 calendar months** of disciplined polish to take AWWV from B+ to credible A+ AAA+++ launch — **assuming #1 ships first as a 1-week unblocker**.

---

## 5. What is already AAA+++ (don't break these)

Genuine strengths to **protect and not over-engineer**:

- **Determinism discipline.** Few studios this size enforce it. Continue the "one change per calibration run" rule.
- **Historical fidelity / research depth.** ICTY anchoring, Cost Ledger, sensitive-history design gate. Best-in-class.
- **Documentation density.** CANON / Systems Manual / Phase Specs / Engine Invariants / per-system master files. Industry-grade.
- **Testing culture.** 3500 tests, 298 suites, husky pre-commit, Baseline Regression CI. Above average.
- **Self-aware audit chain.** This file is itself the 9th or 10th comprehensive audit in 4 months. Studios that audit themselves ship.
- **Pyrrhic team / skills system.** 60+ skills under `.claude/skills/` enforce role-based discipline. Force-multiplier infrastructure.
- **Sector / front-line truth.** A-tier post-2026-04 hardening. Stop touching it; let it stabilize.
- **Operations Singularity.** Canonical owner clear; lifecycle owned; reinforcement-bounded. Hard-won.

---

## 6. What is NOT covered in this rating

- **Live financial / business model assessment** — out of scope.
- **Multiplayer** — not in canon; AWWV is single-player deterministic. No grade applied.
- **Modding tools** — not in canon; deferred forever or to post-1.0.
- **Mobile / console** — not in scope.
- **VR / AR** — not in scope.

These are explicitly **out of the AAA+++ rating** because they are not the kind of game AWWV is trying to be. A grim-historical single-player wargame should not chase scope it does not need.

---

## 7. How to use this file

1. **Read the prior audits first** (§0) — they are still load-bearing. This file is the **most recent** snapshot, not the only one.
2. When a system is promoted (or demoted), update its row + the aggregate (§3) + the leverage list (§4). Don't rewrite — annotate.
3. When a grade changes, log the shift in `docs/PROJECT_LEDGER.md` so the history is preserved.
4. The leverage list (§4) is the **answer** to "what should we do next, in priority order, to reach AAA+++." Use it for sprint planning.
5. The "What is already AAA+++" list (§5) is the **don't-break** list. Use it as a regression-watch checklist.

---

## 8. Cross-references

- [GUI_MASTER.md](GUI_MASTER.md) · [GUI_POLISH_MASTER.md](GUI_POLISH_MASTER.md) · [WARROOM_MASTER.md](WARROOM_MASTER.md)
- [COMBAT_MASTER.md](COMBAT_MASTER.md) · [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md) · [SECTOR_MASTER.md](SECTOR_MASTER.md)
- [REAL_WAR_MASTER.md](REAL_WAR_MASTER.md) · [MUST_HOLD_MASTER.md](MUST_HOLD_MASTER.md) · [BOSNIAK_CROAT_CONFLICT_MASTER.md](BOSNIAK_CROAT_CONFLICT_MASTER.md)
- [MAP_GEOMETRY_MASTER.md](MAP_GEOMETRY_MASTER.md)
- [`../plans/MASTER_ROADMAP.md`](../plans/MASTER_ROADMAP.md) · [`../plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md`](../plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md)
- All prior audits referenced in §0.

---

**End of rating pass — no code changes made. Recommended next step:** schedule the **GUI polish punch-list** (move #4, ~7 days) since it is the cheapest path to a half-grade lift across the whole shell category, and dispatch the **Map information-design pass** (move #1, ~30 days) in parallel since it gates the largest "Paradox feel" promotion.
