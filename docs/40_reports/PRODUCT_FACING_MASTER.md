# Product-Facing Master

**Date:** 2026-06-18 reconciliation pass over the original 2026-06-02 audit

**Scope:** Master findings file for missing player-facing product work. This is now a controlling product audit for roadmap and command-board planning; implementation still requires isolated slices, focused tests, and ledger/docs closeout.

**Sources used:** `docs/40_reports/GAME_STATE_RATING_MASTER.md`, `docs/40_reports/20260602_PLAYER_FACING_QA_AUDIT.md`, `docs/plans/COMMAND_BOARD.md`, `docs/plans/MASTER_ROADMAP.md`, `docs/PROJECT_LEDGER.md` through 2026-06-18, live first-hour browser proof recorded in the June 18 polish entries, and genre/product benchmark research from official or primary-facing sources.

**External benchmark links:** Matrix Games [Command: Modern Operations manual announcement](https://www.matrixgames.com/news/command-modern-operations-discover-the-manual), Command: Modern Operations [manual addendum](https://command.matrixgames.com/?page_id=2695), Matrix Games [Command: Modern Operations product page](https://www.matrixgames.com/product/command-modern-operations), Paradox forum [Victoria 3 Journal Entries dev diary](https://admin-forum.paradoxplaza.com/forum/goto/post?id=28039463), Paradox [Hearts of Iron IV product page](https://www.paradoxinteractive.com/games/hearts-of-iron-iv/about?trk=public_profile_project-button), and Paradox [CK3 wiki front page](https://ck3.paradoxwikis.com/).

**Historical recovery note:** A power failure interrupted the original 2026-06-02 audit after browser findings were captured and this file was partially written. The local `dev:map` root-shim failure described there is now closed by the 2026-06-18 first-hour shell/dev-map hardening; do not treat that startup issue as an active product blocker.

**Roadmap wiring:** `docs/plans/COMMAND_BOARD.md` and `docs/plans/MASTER_ROADMAP.md` now treat this master as the live product-facing audit for the presidential command surface and AAA+++ product-shell work. Use it to derive focused implementation lanes; do not treat it as permission for broad UI rewrites or simulation changes.

**Current first-hour note (2026-06-18):** The browser/dev first-hour route now proves faction start -> war-start splash -> war-begins identity brief -> foundational decision -> Records/Chronicle filing. Browser-fallback foundational decisions enter the same decision ledger as desktop decisions; Records and Chronicle badges render with visible separators; first-hour shell chrome uses `Opening week` instead of `Turn 0`/`Week 0`; decision-modal ownership prevents Desk/Warroom shells from stacking while a required decision is open; and ORBAT/Corps/Formation detail surfaces now show display-only opening command labels instead of false turn-0 commander vacancies. See `docs/40_reports/implemented/20260618_FIRST_HOUR_SHELL_RECORDS_CHRONICLE_POLISH.md` and `docs/40_reports/implemented/20260618_COMMANDER_READ_MODEL_SURFACE_PARITY.md`.

**Current sensitive-history ownership note (2026-06-18):** Srebrenica and Zepa fall receipts are event-owned `control_change` receipts (`srebrenica_falls_1995` / `zepa_falls_1995`), not scripted-operation delivery criteria. Krivaja-95 and Stupcanica-95 remain chronology/AAR context only and must not drive donor-reach, defender-power, recovery-window, current-objective, or participant-movement tuning.

**Current route-focus note (2026-06-06):** Records-filed President's Desk consequence rows now route to Army HQ Records -> Decision Consequences with the exact selected row focused, and shell handoff validation accepts the existing Decision Consequences subtab. This tightens BF-07/BF-20 receipt-loop cohesion without changing command authority, simulation, save state, scenario outputs, or generated artifacts.

**Current route/receipt note (2026-06-18):** Patron-defiance material cuts, reserve consequences, operation opportunities, and first-hour foundational decisions now file through shared Records/Chronicle read models with route/count proof. Remaining receipt work is richer authored family content, actor-history depth, and post-turn fixtures, not basic Records/Chronicle filing visibility.

**Historical lane note:** The earlier #138/#141 off-limits gate is closed on `main` as of `b2a96d9a`; current work should follow the Command Board's June 18 residual queue instead of preserving this audit's old active-worktree caveat.

---

## Executive Verdict

AWWV is now much closer to a coherent product than the older scoreboards implied: the player is framed as the president, the President's Desk exists, Command Authority has a visible cost model, command-category cards exist, Decision Room/Army HQ routing exists, Patron Relations is partly surfaced, and the June 16-18 raw-copy and first-hour hardening waves removed many direct slug/id leaks from event decisions, Records, Chronicle, Codex, Army HQ, and operation copy.

The remaining gap is not "no product shell." The gap is that the product shell is still a system map more than a player experience. It exposes the right machinery, but it does not yet consistently answer the player's product questions:

- What is the urgent thing I can do right now?
- Which action is presidential, which action belongs to Army HQ, and which action is only context?
- What will it cost, who will resist it, and where will I see the receipt next turn?
- Why did the war move the way it did?
- Which information is certain, estimated, contested, or institutionally filtered?
- How do Tactical Groups, patrons, events, and presidential command form one playable loop?

**State of the game, product-facing:** `B+` moving toward `A-`. The simulation/canon substrate is stronger than the first-session product, but the first-hour release-polish floor is materially better than the original June 2 audit. The missing work is now primarily command-loop depth, information hierarchy, jargon reduction, TG productization, richer consequence content, localization depth, live-browser/axe evidence, and release-readiness assets.

---

## Live Browser Smoke Findings

Tested in the Codex in-app browser against `http://localhost:3002/` on 2026-06-02.

| ID | Surface | Observation | Player-facing implication | Priority |
| --- | --- | --- | --- | --- |
| BF-01 | First screen | Faction selection is clear and visually appropriate. The map is visible behind it. | Good first signal: player immediately understands faction selection and the geographic subject. | Keep |
| BF-02 | First screen toolbar | Primary toolbar shows `DEV` and `No state loaded` before campaign choice. | Development chrome and internal state wording weaken the first impression. Hide or dev-gate in player mode. | P1 |
| BF-03 | Opening RBiH campaign | "You Are the President" tutorial appears immediately, and the opening brief correctly explains the loop: brief, inspect, decide, execute, report, judge, advance. | The presidential role is now explicit and should be protected as the product spine. | Keep |
| BF-04 | Tutorial / opening brief | The deprecated tutorial overlay is guarded against mounting; the recurring first-session prompt was the presidential opening brief. Fixed 2026-06-05: dismissal now survives same-faction save refreshes and still resets on first load or faction change. | The opening guidance no longer interrupts the onboarding loop after same-campaign navigation/reload; remaining onboarding work is copy/focus/browser proof, not the store persistence bug. | Closed/P1 follow-up |
| BF-05 | Initial live campaign screen | Left panel immediately shows "Operational SITREP", `IVP`, "Composite IVP", exposed front-sector counts, hostile timers, alliance gauge, and corps controls. | Too much expert vocabulary appears before the player has learned priority and consequence. Needs glossary/tooltips or staged disclosure. | P1 |
| BF-06 | President's Desk | Desk has strong visual identity, Command Authority gauge, cost list, strategic situation, and recent-consequence block. | This is the right product center. It should become the default mental home for non-map decisions. | Keep |
| BF-07 | Desk action model | Desk lists costs for presidential levers, but cards mostly route outward rather than showing the next concrete directive/result in place. | The player sees what exists, but the "take action -> confirmation -> receipt" loop is still incomplete. | P0 |
| BF-08 | Command Surface | Six command-category cards exist with counts, urgent badges, and Act/Inspect/Monitor role chips. Home Front now owns the existing supply/economy visibility card by explicit predicate instead of leaving that pressure hidden or counted as War Direction. | This is a strong organizing layer. It should be expanded into the master action directory for all player-facing work. | Keep/P0 |
| BF-09 | Command-card routing | Fixed in the current branch: Command Surface category selection now opens a Warroom-native `Decision Room` host and keeps the URL/shell in `?view=warroom`; browser proof selected `War Direction` and saw `Command Surface`, `Decision Room`, `Strategic Priorities`, and `What is expected of me?`. Regression proof now covers all six command-category cards routing through the warroom host callback and requesting the correct Decision Room lens. | Keep category cards in the Warroom-native host. Remaining work is card-family receipt polish and action/inspect/monitor clarity, not generic Army HQ dumping. | Closed/P1 follow-up |
| BF-10 | Advanced Desk | Advanced view exposes the product loop: Brief, Inspect, Decide, Execute, Report, Cost, Judge, Next. | Good information architecture. Needs stronger reduction and action affordances to avoid becoming another dashboard. | P1 |
| BF-11 | Army HQ | Commander, corps, personnel, OOB, briefing, and records are dense and functional. | Valuable for grognard inspection; still heavy for first-session players. Needs "why this matters" and "recommended act" framing. | P1 |
| BF-12 | Army HQ records | Records tab has the correct categories and now files opening-week foundational decisions before turn aftermath exists. | The turn-0 "empty Records" blocker is closed for foundational choices; later product completeness still depends on richer AARs and future receipt families. | Improved/P1 |
| BF-13 | Personnel | Personnel tab exposes mobilization pool and officer roster; large OOB lists are readable. | Good raw information, but missing trend, source, and consequence framing for mobilization and officers. | P2 |
| BF-14 | War map | Political/supply/operations modes and `+MORE` modes render; map is visually strong. | Map is production-plausible. Remaining work is not rendering but information truth: uncertainty, contestedness, supply brittleness, and actionability. | P1 |
| BF-15 | War map controls | Fixed 2026-06-05: left OOB corps cards show stance as read-only status and no longer wire fake local stance overrides. Later first-hour slices also route command briefing, selection, and formation drilldowns through owner shells/field-inspection routes. | The documented left-panel direct-control exposure is closed. Residual direct-control work should target real mutating controls such as sector overrides/OPSEC/logistics priority and personnel actions, with confirmation/cost/receipt separation. | Closed/P1 residual |
| BF-16 | Toolbar advance | `ADVANCE TURN` appeared disabled while the screen did not make the reason immediately obvious after tutorial/attention state. | Advance gating must always explain the blocker in one visible sentence and route to the exact fix. | P1 |

### Supplemental Browser Pass After Recovery

Tested with Chromium/Playwright against the same local app after restarting Vite through the JS entrypoint. This pass broadened faction and route coverage after the power failure.

| ID | Surface | Observation | Player-facing implication | Priority |
| --- | --- | --- | --- | --- |
| BF-17 | All faction starts | RBiH, RS, and HRHB all open into the same dense command/sidebar structure with `DEV`, SITREP, IVP, exposed sectors, hostile timers, direct stance controls, and no first-turn reduction. | The first-session comprehension problem is systemic, not RBiH-specific. | P1 |
| BF-18 | RS opening | RS starts with six active operations and a `Flagged Operation Health` block for Operation Drina and Operation Koridor. | RS needs a stronger first-turn "already in motion" operational briefing so the player understands inherited operations and what can/cannot be changed. | P1 |
| BF-19 | HRHB opening | HRHB opening showed priority fronts around Banja Luka/DragoÄaj despite HRHB's expected early focus elsewhere. | This may be a legitimate all-front read-model artifact, but it reads suspiciously to a player. Verify player-faction scoping and priority-front explanation before release. | P1 |
| BF-20 | Patron/Diplomacy routing | Original route proof was blocked by stale tutorial/focus state. Subsequent route/receipt work proves patron-defiance records, Records/Chronicle filing, and Warroom-native Decision Room routing; deeper Patron Relations actor history remains open. | Do not reopen this as a tutorial blocker. Treat it as a Patron Relations depth and post-turn browser-fixture lane. | Improved/P1 |
| BF-21 | Toolbar destinations | Original toolbar proof was blocked by stale tutorial/focus state. June 18 proof now covers Records `DECISION LOG · 1`, Chronicle `Political · 1`, Warroom staff -> Army HQ, and shell exclusivity during required decisions. | Core top-route filing proof exists for first-hour Records/Chronicle/Army HQ. Remaining route QA should broaden to post-turn saves, Codex, settings, and packaged/browser accessibility. | Improved/P1 |
| BF-22 | Desk and Command Surface | Desk and Command Surface text remains strong: CA costs, required signatures, recent consequences, category cards, urgent counts. Category cards now open a Warroom-native Decision Room host instead of generic Army HQ briefing, all six category cards have route/lens regression proof, Home Front owns supply/economy visibility counts, enclave briefing cards route to the existing Humanitarian & Siege Ledger, Economy is framed as War Footing, Chief-of-Staff Counsel has stable recommendation ordering, and App-owned Decision Room navigation now handles counter-offer modal targets instead of relying on the generic router no-op. | The spine is viable. The remaining step is owner card art plus full settlement/front picker; every new card family should still complete action/receipt loops and make inspect-only cards explicit. | Keep/P0 |
| BF-23 | Pre-load shell | Before a campaign is loaded, `DESK`, `WAR MAP`, `ARMY HQ`, `RECORDS`, `CHRONICLE`, `CODEX`, and `ADVANCE TURN` are visible in the top chrome while state text says `No state loaded`. | This is useful for developers but poor first-product framing. The first screen should be faction/load/settings focused until a campaign exists, or disabled items must explain themselves. | P1 |
| BF-24 | Post-start navigation | The old exact-selector pass was inconclusive. Later live browser proof verified first-hour Army HQ, Records, and Chronicle routes; Codex/settings/post-turn routes still need release-candidate coverage. | Keep route QA active, but classify it as broader RC evidence instead of an absence of first-hour route wiring. | Improved/P1 |
| BF-25 | Settings access | The second route pass did not find a visible `Settings` entry after starting a campaign through the main faction picker. | Settings exist in code, but player-facing discoverability from the live first-session route needs verification. Audio, accessibility, language, and diagnostics must not be buried. | P1/P2 |
| BF-26 | Advance affordance | `ADVANCE TURN` remained visible but disabled in the tested live flow. | The button needs a nearby reason and one-click route to the blocker; otherwise the player cannot tell whether the game is waiting for a decision, a tutorial state, a save load, or an internal guard. | P1 |
| BF-27 | Strategic Priorities | Fixed in the current branch: the screen now opens with "Your required decisions and safest next inspections", a "What is expected of me?" section, and deterministic `Act` / `Inspect` / `Monitor` orders before the dense priority lanes. Browser text proof on 2026-06-02 showed those labels after opening ARBiH Army HQ. | Keep the ordered worklist as the default first read. Remaining work belongs to BF-28/BF-30: evidence-to-agency copy, route cohesion, and Main Staff containment. | Closed/P1 follow-up |
| BF-28 | Priority evidence | Strategic Priorities exposes raw evidence like `402 EXPOSED FRONTS`, `0 CRITICAL SUSTAINMENT`, and `14 hostile takeover timers` but does not convert that evidence into presidential options or explain whether the player can directly affect it this turn. | Evidence must be attached to available presidential acts, Army HQ context, or "monitor only" labels. Otherwise the player reads alarming numbers without agency. | P1 |
| BF-29 | Main Staff tabs | A role-based pass confirmed distinct `BRIEFING`, `SUMMARY`, `RECORDS`, and `PERSONNEL` tab content, but the screen still reads as one large mixed dump because the map/sidebar text remains in the page flow and the modal repeats global labels. | Main Staff needs stronger containment and hierarchy. The player should understand which tab they are in and what the tab is for without parsing the whole shell. | P1 |
| BF-30 | Main Staff Briefing | The Briefing tab combines daily briefing prose, Strategic Priorities, dossier cards, presidential attention, commander record, all-corps cards, commander detail, and expandable corps sections in one scroll-heavy surface. | Too many purposes are merged: briefing, decision room, commander review, order of battle, and records. It needs separated lanes or a top-level "what to do now" summary before details. | P0/P1 |
| BF-31 | Main Staff Summary | Summary is cleaner than Briefing and provides useful War Summary metrics, but it still repeats large sidebar context and shows alarming operational data without a clear "reviewed / action required / safe to advance" state. | Summary should be the calm executive overview. It should reassure when systems are stable and route only genuinely actionable items onward. | P1 |
| BF-32 | Main Staff Records | Records tab has turn-history, AAR, operation history, decision log, opportunities, Codex route scaffolding, archive-route counts, and opening-week decision filing before first turn aftermath. | The "mostly empty turn-0 Records" finding is superseded for foundational decisions. Remaining work is richer authored AAR/operation/consequence content and post-turn fixture proof. | Improved/P1 |
| BF-33 | Main Staff Personnel | Personnel tab now opens with a presidential command dossier for commander vacancies, low-loyalty commanders, reserve officers, and mobilization strain, before force overview, mobilization pools, full OOB, and officer roster. | Remaining Personnel polish is filters, source/provenance depth, and clearer confirmation/receipt separation for destructive personnel actions. | P1 / Improved |
| BF-34 | Main Staff action ambiguity | Non-destructive expanders (`COMMANDER`, `SECTORS`, `OPERATIONS`, `ORBAT`, `COMBAT RECORD`) sit near potentially mutating actions (`REASSIGN COMMANDER`, `DISMISS`, `ASSIGN FROM POOL`). | Context inspection and presidential action must be visually separated, with costs/confirmation for actions. Otherwise players may not know which clicks inspect and which clicks commit. | P0/P1 |
| BF-35 | Image-card opportunity | Existing repo assets include presidential desk packet thumbnails, decision headers, consequence stills, crests, briefing imagery, and directive/art tests. | Image cards should be an accepted GUI option for command/briefing surfaces: use them to identify action families and emotional context, not as generic decoration. | P1 |
| BF-36 | Alpha-test coverage | The prior inspection was not exhaustive. A later non-destructive alpha pass had to explicitly inventory controls and attempt tabs, desk/warroom controls, map modes, corps expanders, brigade labels, canvas clicks, and settlement/sector access. | Product-facing readiness should require a formal alpha checklist, not ad hoc smoke testing. Every route must have pass/fail evidence. | P0 |
| BF-37 | Opening brief dismissal | Later first-hour hardening confirms browser-preview onboarding dismissal survives shell remounts, and required decisions block competing shell openings while active. | The original dismissal persistence blocker is no longer the active P0. Remaining work is accessibility/focus evidence and clearer route-state assertions in RC browser tests. | Improved/P1 |
| BF-38 | Desk/Warroom navigation topology | Once the Desk opened, the visible control set changed to Warroom/Desk buttons (`Faction Overview`, `Operational Map`, `Calendar`, `Diplomacy`, `Radio Intelligence`, `News & Press`, `Command Briefing`, `Commander`, `CALL ARMY HQ`, `WAR MAP`, `ADVANCE CLEARANCE`, `COMMAND SURFACE`). Standard top-route clicks no longer matched consistently. | Warroom/Desk is promising but needs a route matrix. Every hotspot/card must state destination, whether it is inspect/action/advance, and how to return to map/HQ. | P0/P1 |
| BF-39 | Warroom panels | The alpha pass identified multiple Warroom hotspot-style panels/options but did not yet verify each destination's content quality end-to-end because navigation state and repeated labels made routing noisy. | Treat Warroom as its own product surface requiring complete hotspot/link validation, not as decorative shell around the map. | P1 |
| BF-40 | Map click contract | The tutorial says "Click a settlement to inspect it; click a front edge to inspect the sector." Grid-sampling the map canvas after overlay dismissal did not surface a settlement panel or population formula in the captured text. | Settlement and sector click targets need dedicated QA fixtures or visual test coordinates. The current first-session contract is not verified. | P0/P1 |
| BF-41 | Settlement population consistency | `SettlementDetailContent` correctly documents `Now = Pre-war - out + in` because `out` includes killed/fled; `SelectionPanel` fallback for departed-by-ethnicity uses `osidDisp.out + osidDisp.lost`, which can double-count removals for display breakdowns. | Prewar/current population, departed/killed/fled breakdowns, and ethnic composition must be audited against the same accounting formula before release. | P0/P1 |
| BF-42 | Brigade drilldown | Code supports clickable/expandable brigade rows and ORBAT brigade expanded detail, but the live alpha pass did not successfully reach and click individual brigades from the first-session route. | Brigade clickability should be verified with a fixture route: sidebar brigade row, Army HQ ORBAT row, settlement stationed-unit row, and Formation Detail tabs. | P1 |
| BF-43 | Sector drilldown | Code supports sector panels and sector expanders, but live canvas sampling produced only generic/sidebar sector language in captured text, not a clearly distinct selected-sector panel. | Front-edge/sector click QA needs explicit coordinates, selected-sector state evidence, and confirmation that sector details explain intel, threat, deployment, and actionability. | P1 |
| BF-44 | Army HQ isolation | A visible-DOM pass confirmed Army HQ tabs are reachable, but the tactical map, sidebar, map mode controls, backdrop, and Army HQ dialog are all exposed in the same visible/accessibility surface. Ordinary role selectors initially hit the top toolbar `RECORDS` or failed to resolve modal tabs. | This is a player-facing and QA-readiness issue: modal/dialog surfaces need stronger focus isolation, reading-order containment, and unique control names. | P1 |
| BF-45 | Army HQ Summary sub-tabs | `Overview`, `IVP`, `Convoys`, `Casualties`, `Support`, `OPSEC`, and `Capital` are reachable. Several empty states are clear (`No convoy decisions`, `No local support order`, `No sectors are currently running OPSEC`, `Diplomacy capital is not available`). | Summary has good raw structure, but it still needs a top-level "reviewed / no action / action required" state so the player knows what to do with the tab. | P1 |
| BF-46 | Army HQ Records sub-tabs | `TURN AFTERMATH`, `AFTER-ACTION REPORT`, `OPERATION HISTORY`, `DECISION LOG`, `OPPORTUNITIES`, and `Open Codex` are reachable. Records now has an archive-route summary with tab counts, decision-consequence route counts, latest filed decision, Records/Chronicle filing destinations, localized route chrome, localized family labels, and loaded browser proof across patron, reserve, operation-opportunity, and Chronicle-filed convoy receipts. | Records has moved from bare route scaffolding toward a readable localized receipt archive. Remaining work is richer authored content for future receipt families, not basic route proof or localization. | P1 / Improved |
| BF-47 | Map mode strip | Expanding `+MORE` reveals `CASUALTIES`, `MORALE`, `DEFENSE`, `AUTHORITY`, and `LEGITIMACY`; combined with the base strip, static code confirms nine modes: Political, Ethnic, Supply, Casualties, Morale, Operations, Defense, Authority, Legitimacy. On the tested viewport, expanded controls pushed `POLITICAL` and `ETHNIC` partially off-screen and pushed `LAYERS` beyond the right edge. | The mode set is substantial, but the control strip needs responsive containment and keyboard/accessibility proof before release. | P1 |
| BF-48 | Map mode legends | Static inspection confirms legends for Ethnic, Supply, Casualties, Morale, Operations, Defense, Authority, and Legitimacy. Political mode has no legend by design. Live browser routing did not prove every legend after mode click because expanded mode buttons were not reliably role-clickable. | Mode-by-mode screenshot QA should verify each legend, active state, and meaning. Political mode needs either a deliberate no-legend rationale or a minimal control/contestedness explanation. | P1 |
| BF-49 | Layer menu | `LAYERS` opens live toggles for `FRONTS/FRONT`, `UNITS`, `LABELS`, `SECTORS`, `MINIMAP`, `FOG`, `BORDERS`, and `1991` depending player/dev mode constants. | This is a useful power-user surface, but it needs player copy and scope cleanup: some labels read like debug overlays, and toggles need persistence/keyboard/accessibility coverage. | P2 |
| BF-50 | Warroom hotspot contract | Owner correction 2026-06-02: Warroom objects must keep literal destinations; the President's Desk opens as an overlay and is the entry point for command-surface cards. Browser QA reproduced why this matters: an always-open Desk overlay intercepted a Diplomacy hotspot click. | Warroom is not just decorative; it is a navigation/action shell. It needs a player-facing hotspot matrix, tooltips, non-destructive route proof, and a destructive-pass guard for calendar advance. The Desk overlay must not block room interaction when closed. | P0/P1 |
| BF-51 | Sidebar ORBAT -> brigade | Live sidebar pass clicked `1st Corps` ORBAT and opened a brigade list with individual rows such as `101st Mountain`, including title data for supply, fatigue, and cohesion. Clicking `101st Mountain` opened Formation Detail. | Brigade drilldown is reachable from the sidebar ORBAT route. The remaining issue is hierarchy and action separation, not absence of the route. | Keep/P1 |
| BF-52 | Formation Detail | Formation Detail exposes `Overview`, `Record`, and `Orders`. Overview showed corps, sector, posture, readiness, officer cadre, equipment, cohesion, morale, fatigue, personnel, effectiveness, location, and home municipality. Record showed campaign losses/combat record. Orders showed sector assignment options and warned that override is permanent. | Formation inspection is rich. Sector override is clearly destructive and must be guarded with cost/confirmation/receipt in the destructive pass. | P1 |
| BF-53 | Sector panel | Following the Formation Detail sector link opened `SECTOR INTELLIGENCE` with overview/orbat/logistics/ops tabs, confidence, combat power, force balance, unit condition, front length, brigade count, sector stance, supply priority, linked-settlement count, reinforcement priority buttons, OPSEC toggle, and hostiles. | Sector drilldown is real and useful, but mutating controls (`0.5x/1.0x/1.5x`, `ENABLE OPSEC`) sit inside the inspection panel and need confirmation/receipt separation. | P1 |
| BF-54 | Sector tab accessibility | After closing overlapping Formation Detail, the sector panel's tab roles were visible. `ORBAT` was reachable and showed active frontline elements; `LOGISTICS` and `OPS SNAPSHOT` did not consistently resolve as unique role targets after the first tab switch in the browser pass. | Sector tab UI needs accessibility and automated-test hardening before release, especially because it contains both intel and mutating controls. | P1 |
| BF-55 | Settlement panel | A non-destructive map click selected Donje Ratkovo (Kljuc) and opened `SETTLEMENT INFO` with `Overview`, `Municipality`, and `Timeline` labels, terrain modifier, pre-war/current population, formula copy (`Pre-war + Arrived - Displaced - Killed = Now`), pre-war/current ethnic structure, elevation, local support, and `STAGE WEAPONS SHIPMENT`. | The tutorial's settlement-click contract is now verified for at least one settlement. The settlement panel is strong, but its tab roles did not resolve in the browser pass and `STAGE WEAPONS SHIPMENT` belongs in the destructive queue. | P1 |
| BF-56 | Settlement population sample | Donje Ratkovo showed `Pre-war 3,993 -> Now 3,993`, pre-war Serb 3,946 / 99%, current Serbs 3,946 / 99% plus Others 42 / 1%. This sample is internally plausible, but it did not exercise displacement loss/inflow. | Population accounting still needs fixture coverage with nonzero displaced/killed/fled/arrived values and cross-check against the double-count risk in `SelectionPanel`. | P0/P1 |

---

## Missing Player-Facing Items By Area

### 1. Presidential Command Loop

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Single act surface for all five presidential levers | Command Board says five 1.0 levers are shipped; browser shows Desk cost list and Command Surface cards. `DirectiveCard` now has fixture proof for direct issue, exact display-name target resolution, request-op commander pushback, force-anyway, stand-down, cannot-issue, front-visit availability, and shared receipts. | Every lever should be issuable from a clear Decision Room/Directive Card path, with confirmation, cost, staff pushback, and next-turn receipt; remaining work is broader route/records/patron/event consequence integration, not the core DirectiveCard action host. | P0 |
| Consequence receipt loop | Recent consequences exists; officer resentment and patron defiance receipts exist in code history. Verified 2026-06-02: event promise receipts and patron-defiance supply-cut receipts feed Decision History/Authored Choices, Turn Aftermath, Chronicle, Records, and Diplomacy read-model tests. 2026-06-05/06 Records now shows archive-route counts, Records/Chronicle filing destinations, localized route/family chrome, and loaded browser proof across multiple receipt families. | Keep extending new presidential interventions into the existing receipt/records substrate; the remaining product gap is richer authored content for future receipt families, not absence of the receipt model, route proof, or basic localization. | P0/P1 / Improved |
| Advance-gate clarity | Fixed 2026-06-05: Advance confirmation now shows an explicit blocked panel, routes to pre-advance review, and disables the final Advance button while blockers remain. | Remaining work is browser proof and copy polish, not the modal hard-blocking contract. | Closed/P1 follow-up |
| Command Authority doctrine copy | Desk says "currency of command", toolbar says override resource. | Consistent language: presidential leverage, institutional strain, recovery, and why overuse is dangerous. | P1 |
| Direct-control cleanup | Browser still showed direct corps stance comboboxes in left command panel. Fixed 2026-06-05: left OOB corps cards now show stance as read-only status and no longer wire fake local stance overrides. Personnel now leads with presidential command-risk summaries rather than raw roster-first control framing. | Remaining direct-control cleanup should target real command/action surfaces; the left OOB corps-card stance combobox is closed. | Improved/P1 |
| Patron/army pushback integration | Force-op pushback and patron dead-channel are shipped substrate. DirectiveCard now proves the army side of the loop; patron-defiance receipts are emitted from `patron_defiance_supply_cuts`, Patron Relations shows material cut rows, and Records/Chronicle filing destinations are visible in the decision archive. | Player should see "promise -> resistance -> consequence -> receipt" in the same command family; next work is fuller patron actor history and post-turn browser proof, not substrate creation or basic Records/Chronicle filing visibility. | P1 / Improved |

### 2. Tactical Groups Productization

Tactical Groups are engine-meaningful, but not yet product-complete as a player-facing system.

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| TG completion matrix | Command Board tracks TG as an owned-elsewhere/default-on-ish systems lane; UI grep shows `backTheOfficer` read-models. | A master matrix separating engine, read-model, UI, AAR, tutorial, glossary, and tests. | P0 after active lanes |
| TG identity | Code has TG names, commanders, donor lineage, and aftermath story builders. | Player sees "TG X" as a temporary operational identity with commander, purpose, parent corps, and expected dissolution. | P1 |
| Donor cost visibility | TG donor consumption and cohesion bleed exist in docs/code. | Before authorizing/backing a TG, player sees what donor brigades/corps give up and for how long. | P1 |
| AAR explanation | `backTheOfficer` can project aftermath stories. | After action, player sees whether the TG succeeded, dissolved, harmed donor readiness, or changed officer standing. | P1 |
| Map/HQ representation | Browser did not surface TGs in the turn-0 RBiH flow. | When TGs exist, they should appear in Army HQ, operations history, Chronicle, and map overlays with consistent labels. | P1 |
| Tutorial/glossary | No first-session explanation observed. | Player learns TGs as "temporary cross-corps operational groupings", not a raw acronym. | P2 |

### 3. Events, Decisions, and Consequences

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Full event database | Command Board says 247 rows, 44 choice events, 18 modal-ready rows, future-consequence slices started. | Event rows need authored player-facing modal copy, historical/default labels, branch visibility, and consequence descriptions. | P1 |
| Branch consequence explanation | Existing future-consequence cards are partial. | Player sees "this opens/closes future paths" without raw event IDs or design diagnostics. | P1 |
| Sensitive-history framing | Sensitive-history gate exists; player-facing audit found internal terms leaking before cleanup. | Sensitive content must be framed in-world with source/provenance, not designer labels or gamified reward language. | P0/P1 |
| Decision history legibility | June 2 cleanup fixed many raw IDs, but broader i18n/hardcoded English remains. | Decision log should read like a government archive, not a debug ledger. | P1 |
| Event-to-Codex reach | GAME_STATE_RATING_MASTER says many ledger annotations lack Codex consumers. | Major event consequences should link to Codex explanation and Chronicle memory. | P2 |

### 4. Map Truth and War Friction

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Contestedness layer | Older scoreboards warn UI presents war as too crisp. Browser map is visually strong but clean. | Clear distinction between control, presence, contestedness, authority, legitimacy, and supply confidence. | P1 |
| Supply brittleness | Supply mode renders with status legend. | Player sees why a route is brittle and what actions can relieve it. | P1 |
| Intel confidence | No confidence/uncertainty language in observed first-session flow. | Tooltips/cards should mark estimates, stale intel, and institutional blind spots. | P2 |
| Front priority explanation | Browser shows 402 exposed sectors and priority fronts. | Explain why these are priority and what action family can address them. | P1 |
| Priority-front scoping | Supplemental pass showed HRHB priority fronts around Banja Luka/DragoÄaj. | Confirm priority-front selection is player-faction scoped or explain why distant/allied fronts are shown. | P1 |
| Settlement/OSID language | June 2 cleanup removed many raw OSID inputs, but scoreboards still track OSID jargon risk. | Player sees place names first; internal IDs remain dev-only. | P1 |

### 5. Army HQ, Operations, and AARs

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Operation request picker | Request-op DirectiveCard and the older Army HQ request row now offer deterministic known-objective pickers built from loaded settlement/display-name state. Typed exact-OSID and unique display-name fallback still works, and ambiguous typed names remain blocked before IPC. | Full request operation now has a settlement picker for known objectives without becoming brigade/axis planning; remaining polish is front-family visual grouping and broader card-family loop cohesion. | Improved/P1 |
| Inherited operation briefing | RS starts with six active operations and flagged health for Drina/Koridor. | Factions with active inherited ops need a first-turn "what is already underway" briefing with allowed presidential actions. | P1 |
| Commander rationale | Browser shows officer stats and loyalty; DirectiveCard now has request-op fixture coverage for commander objection prose near the actual action, plus staff-review copy at the objective input. | Every risky directive should show command interpretation and expected pushback; next expansion is consistency across non-request risky surfaces and records. | P1 |
| Operation predictor confidence | GAME_STATE_RATING_MASTER flags predictor confidence as thin. | Before approval: estimated odds, uncertainty band, major reasons, and "what would improve this". | P1 |
| AAR causality | Records tab has AAR and operation history owners but no turn-0 content. | After action: why launched, what happened, why it succeeded/failed, cost, affected TGs/officers/patrons. | P1 |
| OOB source/provenance | Personnel/OOB is rich but source-light to the player. | High-value units and officers should carry provenance/source notes where practical. | P2 |

### 6. Diplomacy and Patrons

Browser coverage note: Patron Relations was not fully inspected in the live UI because the tutorial/HQ interruption blocked the diplomacy route during the smoke test. The findings below are based on current docs, recent commits, and observed routing rather than a completed diplomacy-panel walkthrough.

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Patron Relations as first-class surface | Recent commits #124/#128 add Patron Relations confidence/defiance. | Player sees patron confidence, defiance history, supply cuts, constraints, and next possible diplomatic consequences. | P1 |
| Reliable Patron route | 2026-06-04 route hardening: Warroom `Diplomacy` / telephone opens Patron Relations directly while staying in the Warroom shell; focused route/UI proof covers the loaded-campaign path. Standalone browser dev still needs a deterministic loaded-state fixture. | Next polish is focus-return/browser fixture proof and actor-history depth, not basic route ownership. | P1 |
| Per-actor relationship history | GAME_STATE_RATING_MASTER grades diplomacy as B. | Timeline of external actors: what they did, why they moved, what player decisions changed. | P2 |
| Diplomatic action clarity | Current board treats refuse-patron-demand as event layer, not sixth lever. | Make the boundary clear: what is a command lever, what is an event decision, what is diplomacy context. | P1 |
| Patron receipts | Patron dead-channel fix and patron-defiance consequence receipts are shipped and tested. | Refusing or satisfying a patron should remain visible in Patron Relations, Turn Aftermath, Chronicle, Records, and Authored Choices; polish should focus on route clarity and actor-history context. | P1 |

### 7. Onboarding and First-Session Comprehension

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Tutorial persistence | Browser reproduced skipped tutorial reappearing after navigation. | Skip/dismiss state must persist through Desk, Army HQ, Records, map, and reload rules. | P0 |
| Tutorial navigation blocking | Supplemental pass showed returned tutorial overlay intercepting Chronicle/Codex/Records/Army HQ clicks. | Onboarding overlays must never trap the player out of core navigation after dismissal. | P0 |
| First-turn priority reduction | Browser first turn shows many systems immediately. | First turn should reduce to 2-3 actionable priorities with optional expert expansion. | P1 |
| Faction-specific opening duties | RS begins with active operations; HRHB/RBiH have different opening burdens. | Each faction should get a tailored first-turn duty brief rather than the same dense global sidebar pattern. | P1 |
| Glossary/tooltips | SITREP, IVP, ORBAT, Command Authority, exposed sectors, hostile timers appear early. | Terms should be tooltipped or reworded at first exposure. | P1 |
| "You are not the general" reinforcement | Tutorial says president; side panel still exposes stance controls. | Player should repeatedly learn that orders go through institutions and generals. | P0/P1 |
| War termination expectations | Earlier reports track player guide/war termination. | Onboarding must explain negative-sum outcomes, no conquest win, and cost-based judgment. | P1 |

### 8. Localization and Language Quality

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Full English key extraction | June 2 QA audit identifies broad hardcoded English; recent #139 and active #141 cover only part. | All player-facing strings should have English keys before BCS expansion. | P1 |
| BCS native LQA | GAME_STATE_RATING_MASTER still grades localization C. | Bosnian/Croatian/Serbian terminology reviewed by native speakers with diacritics and sensitive-history care. | P1/P2 |
| Jargon cleanup residual | #137 reworded some jargon, but browser still saw SITREP/IVP/Composite IVP. | Product language should be player-legible by default, with expert terms as secondary. | P1 |
| Sensitive content terminology | Sensitive-history prose cannot be machine-polished only. | Dedicated historian/native review of event and Codex phrasing. | P0/P1 |

### 9. Accessibility and Visual QA

Context note: `GAME_STATE_RATING_MASTER.md` says static P0 accessibility blockers are closed, but live browser/axe evidence remains useful before any release-candidate claim.

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Browser/axe RC pass | Static gates are strong; live browser only smoke-tested here. | RC needs axe/browser evidence across first screen, Desk, Command Surface, Army HQ, Decision modals, map controls. | P1 |
| Focus/modal persistence | Tutorial reappeared and nested over records/HQ during browser test. | Modal state, focus order, and interruption rules need explicit QA. | P0/P1 |
| Responsive/small viewport check | Not covered in this smoke. | Validate all core surfaces at smaller desktop/laptop viewports. | P2 |
| Visual regression suite | Scoreboard calls out Playwright/Percy/Chromatic gap. | Lock screenshots for first-session hero screens and key modals. | P2 |

### 10. Audio, Assets, Packaging, and Launch

| Missing item | Current evidence | Needed player-facing result | Priority |
| --- | --- | --- | --- |
| Real audio | Scoreboard grades music/soundscape D+. | Theme, ambience, UI feedback, stingers, opt-in mix, and asset-backed playback. | P2/P3 |
| Final card art | Command Board notes owner art placeholders for command cards. | Six command cards should have approved final art with consistent style and historical tone. | P1/P2 |
| Store/trailer/press | Scoreboard grades store/trailer as F/operator-owned. | Steam/GOG/itch page, trailer, press kit, screenshots, high-concept public copy. | P3/operator |
| Signed packaging/clean VM | Scoreboard says packaging B with signing/macOS/auto-update gaps. | Release candidate evidence package, signed Windows installer, AppImage proof, clean-VM notes. | P3/operator |
| Telemetry/playtest loop | Local-first diagnostics exist; upload/playtest aggregation absent. | Opt-in playtest telemetry, crash aggregation provider decision, feedback workflow. | P2/P3 |

---

## Product Completion Matrices

### Presidential Command 1.0

| Slice | Current state | Product-facing missing item | Status |
| --- | --- | --- | --- |
| Five levers | Shipped per Command Board. | Unified issue/confirm/receipt path. | Partial |
| Command Authority | Visible in toolbar and Desk. | Consistent doctrine copy and strain explanation. | Partial |
| Desk | Strong visual/product home. | Make it the default route to actions, not just context. | Partial |
| Command Surface | Six cards with counts/urgency; category selection now stays Warroom-native and opens the Decision Room host. | Card-to-Directive-to-Receipt closure for each family plus inspect-only labels. | Partial/Improved |
| Decision Room | Advanced Desk/product loop exists in Army HQ. | Clearer naming and primary act layer. | Partial |
| Pushback | Shipped substrate. | Surface as normal consequence of overreach, not exceptional debug-feeling state. | Partial |
| Patron consequences | Patron Relations/defiance substrate plus tested patron-defiance consequence receipts; material cut rows now appear in Patron Relations, and Records decision rows now expose Records/Chronicle filing destinations. | Full diplomatic/material receipt loop is present at the read-model level; remaining gap is actor-history depth, post-turn browser fixture proof, and per-family receipt quality. | Partial/Mostly built |
| Direct controls | Direct corps stance controls still visible in browser. | Remove/reframe under president-through-generals doctrine. | Open |

### Tactical Groups

| Slice | Current state | Product-facing missing item | Status |
| --- | --- | --- | --- |
| Engine substrate | TG/OG docs and code exist; donor/cohesion lanes active elsewhere. | Do not touch active TG work until handed off. | Active/off-limits |
| Read-model | `backTheOfficer` projections exist in UI data code. | Connect identity, donors, cost, and aftermath everywhere the player expects. | Partial |
| Map representation | Not observed in turn-0 smoke. | TG marker/overlay and operation linkage when active. | Open |
| Army HQ | Related data exists. | TG dossier: commander, donor corps, expected duration, command risk. | Open/partial |
| AAR/Chronicle | Aftermath story builder exists. | Narrative receipt and donor-cost explanation after completion/dissolution. | Partial |
| Tutorial/glossary | Not observed. | Explain TG without acronym-first language. | Open |

### Free War / Emergent Game

| Slice | Current state | Product-facing missing item | Status |
| --- | --- | --- | --- |
| One-game doctrine | Command Board says emergent is the public game; historical is calibration. | Player copy should not expose internal mode split. | Partial |
| Negative-sum verdict | Engine/canon direction is strong. | Tutorial, Codex, and endgame need repeated expectation-setting. | Partial |
| Atrocity bright line | Engine invariant exists. | Sensitive decisions need consequence arcs and historical framing. | Partial |
| Distance-from-history | Read-model exists. | Player-facing explanation should be careful: alternate history, not score-chasing. | Open/partial |
| Event database | Partial modal-ready corpus. | Full historical/counterfactual source + semantics packet before broad authoring. | Open |

---

## AAA+++ Target Definition

Treat `AAA+++` here as an internal quality bar, not a literal budget category. For AWWV it does not mean more mechanics, more chrome, or louder presentation. It means the game reaches a point where the player experience is as disciplined as the simulation:

1. The player always knows their role: president, not corps commander.
2. The player always knows the next meaningful decision, the institutional cost, and who may resist it.
3. The player always receives an aftermath receipt that connects action, friction, result, memory, and future consequence.
4. The map communicates uncertainty and contested authority instead of pretending the war is a clean board state.
5. Tactical Groups, patrons, events, operations, Army HQ, Chronicle, Codex, and AARs all reinforce one loop rather than feeling like separate subsystems.
6. The first ten minutes are faction-specific, legible, and emotionally credible without hiding the game's depth.
7. English, BCS, sensitive-history language, accessibility, visual regression, audio, packaging, and press materials are release-grade.

### AAA+++ Acceptance Gates

| Gate | Required evidence | Failure condition |
| --- | --- | --- |
| Role clarity | Browser recording or screenshots show no direct corps-command affordance in the first-session presidential loop, unless explicitly framed as a request/intent to Army HQ. | Player can directly set corps posture from the main map with no presidential/institutional framing. |
| Action loop | Each core presidential lever has card -> directive -> confirmation -> cost/pushback -> next-turn receipt -> records/chronicle trail. | Cards route to dashboards but do not close into consequences. |
| Onboarding | RBiH, RS, and HRHB each have a 10-minute scripted player path with no modal persistence failures. | Tutorial reappears after dismissal, blocks nav, or exposes dense raw systems before priority. |
| TG productization | TG matrix is green across identity, donor cost, commander, map/HQ surface, AAR, glossary, and tests. | TGs exist as engine/read-model entities but are not explainable to a player. |
| Patron productization | Patron Relations shows confidence, defiance, actor history, material consequences, and event receipts. | Patron actions appear as isolated events or unexplained supply effects. |
| War truth | Map modes and front cards distinguish control, contestedness, presence, supply confidence, and stale/estimated information. | Map appears crisp and certain where the simulation or historical premise is uncertain. |
| Language quality | Hardcoded English extraction is substantially complete; BCS LQA plan and sensitive-history review exist. | UI has residual raw IDs, acronyms, or machine-polished sensitive content in player-facing areas. |
| Release candidate | Browser/axe/visual regression evidence, clean packaged build, real audio path, final card art, settings discoverability, and launch-material checklist exist. | Product is playable only as a dev build with placeholder sound/art and unverified settings/accessibility. |

---

## Genre Benchmark Lessons

These are not prescriptions to clone other games. They are quality standards to steal selectively.

| Reference pattern | What mature games do well | AWWV implication |
| --- | --- | --- |
| HoI-style battle planning/front lines | Separates intent from execution: the player expresses a plan, commanders/units execute under constraints, and the map visualizes the plan. | AWWV should make presidential directives feel like intent transmitted through institutions, not manual corps stance changes. |
| CK3-style tooltips/encyclopedia | Turns unfamiliar terms into just-in-time learning instead of forcing a manual read before play. | SITREP, IVP, ORBAT, exposed sectors, Command Authority, patron defiance, TGs, and sensitive historical terms need nested tooltips/Codex links at first exposure. |
| Victoria-style Journal/Objectives | Gives the player mid-term structure without removing systemic freedom. | Each faction needs opening duties and ongoing "state priorities" that explain what the president is trying to manage this month. |
| Command: Modern Operations FOW/contact model | Treats uncertainty as a first-class interface problem: detections, classifications, confidence, and stale information matter. | AWWV should not make control/front/supply truth look cleaner than it is. Confidence and provenance should appear in map cards and AARs. |
| AGEOD/Gary Grigsby operational reports | Serious wargames earn trust through detailed after-action reporting and logistics explanations. | AWWV's AARs should explain why outcomes happened, not just that they happened. Supply, readiness, donor costs, and commander friction must be readable. |
| Premium strategy release practice | Launch quality depends on settings, localization, accessibility, performance, save/reload, packaging, trailer, screenshots, and support docs as much as mechanics. | AWWV cannot reach AAA+++ while audio/art/settings/packaging/press remain operator-owned gaps outside the product board. |

Benchmark source notes: this audit used official/primary-facing sources where available, including Matrix Games public CMO manual/UI/FOW material and Paradox public wiki/developer-diary search results for HoI4 battle plans, CK3 interface/tooltips, and Victoria 3 Journal Entries. The recommendations above are inferences from those sources and genre patterns, not claims that AWWV should adopt their mechanics.

---

## AAA+++ Upgrade Program

Do not start these work packets until #138, #141, and Car 3 close cleanly. This section is an overseer sequence for after that handoff.

### Phase 0: Stabilize The Player Shell

Goal: stop the current shell from undermining the product premise.

| Work packet | Concrete recommendation | Acceptance evidence |
| --- | --- | --- |
| Tutorial/focus fix | Make tutorial skip/dismiss durable across Desk, map, Army HQ, Records, Chronicle, Codex, route changes, and reload rules. | Browser script proves no dismissed tutorial reappears and no modal blocks top nav after dismissal. |
| Release/dev chrome split | Hide `DEV`, `No state loaded`, disabled top-nav noise, and internal status text from player mode; keep diagnostic visibility behind explicit dev mode. | First-screen browser proof for player build and dev build. |
| Disabled advance reason | Add a single nearby reason when `ADVANCE TURN` is disabled and route to the needed action. | Browser proof for no-state, tutorial-blocked, decision-pending, and ready-to-advance states. |
| Direct-control doctrine | Remove direct corps stance controls from the presidential first-session surface, or reframe them as Army HQ requests with cost/resistance. | Player role audit confirms no unframed direct corps-command controls in primary route. |
| Settings route | Make Settings discoverable before and during campaign: language, audio, accessibility, diagnostics, tutorial restart. | Browser proof from first screen and in-campaign shell. |

### Phase 1: Complete The Presidential Command Spine

Goal: every major player action becomes a closed loop.

| Work packet | Concrete recommendation | Acceptance evidence |
| --- | --- | --- |
| Command Surface closure | Each command-category card opens the exact next directive, not a broad dashboard, unless the card is explicitly "inspect only." | Card-by-card browser walkthrough with before/after state. |
| Directive Cards | Standardize directive cards: premise, available act, cost, signatures, staff/patron/commander resistance, expected receipt, confirm/cancel. Direct issue paths now have the first proof set: stop-op, authorize-op, no-objection request-op, force-launch, replace-CO, elite-deploy, and front-visit availability/initiation show cancel plus next-turn/failure/unavailable receipt states. | Component snapshot and fixture coverage for all five levers plus patron/event decisions; direct issue paths covered by `tests/ui/directive_card_stop_op_action.test.ts` and front-visit substrate by `tests/front_visit_action.test.ts`. |
| Receipts | Standardize next-turn receipts: action taken, actual outcome, cost spent, who resisted, what changed, where to inspect details. | AAR/Records/Chronicle entries generated for each lever in test states. |
| Command Authority copy | Replace mixed "override resource/currency" language with a consistent institutional-strain model. | String inventory and browser proof on toolbar, Desk, directives, and receipts. |
| Desk as home | Make President's Desk the default command home after campaign start; map remains primary inspection, not the whole game shell. | First-session walkthrough starts and returns to Desk after action/advance. |

### Strategic Priorities Redesign Requirement

Current branch status: the first-pass ordered presidential worklist is implemented and browser-verified. Strategic Priorities now starts with an expectation prompt and `Act` / `Inspect` / `Monitor` orders derived from the same deterministic card archive. The requirements below remain the standard for deeper polish, especially evidence-to-agency copy and no-action reassurance.

Required structure:

| Section | What it should answer | Example product rule |
| --- | --- | --- |
| `Required Before Advance` | What must I handle before the turn can advance? | Every item has one action button and one sentence explaining the blocker. If there are none, say so plainly. |
| `Recommended Presidential Acts` | What can the president do this turn? | Each item uses a verb: visit front, approve operation, refuse demand, release reserve, request commander assessment. |
| `Army HQ Context` | What is serious but not directly actionable by the president right now? | Label as context/monitoring, not urgent work. |
| `Evidence` | Why is this item on the list? | Evidence is subordinate to an action or context item, not a repeated standalone dossier. |
| `No Action Needed` | Which scary-looking systems are stable? | Convert `0 critical sustainment` into reassurance, not more noise. |

Concrete recommendations:

1. Replace repeated `Operational SITREP`/`WAR SUMMARY`/`SITREP DOSSIER` labels with human task titles.
2. Never show `same surface` or internal routing labels to the player.
3. Separate urgency from agency: a front can be urgent but not presidentially actionable this turn.
4. Collapse duplicate evidence; show `402 exposed front sectors` once with "why this matters" and "what you can do".
5. Add a top summary: "You have 0 required decisions, 2 recommended reviews, and 1 optional presidential act."
6. If the player is expected to advance, say "No presidential decisions are pending. You may advance after reviewing the situation."
7. If advance is blocked, the Strategic Priorities screen must name the exact blocker and provide the route.

### Main Staff Briefing Redesign Requirement

The Main Staff surface has enough material to become a high-quality command hub, but it currently merges too many jobs. Treat it as four separate player products:

| Tab | Current live read | Required player-facing role |
| --- | --- | --- |
| `Briefing` | Daily quote, Strategic Priorities, dossier cards, presidential attention, commander record, corps grid, and expanders all in one long surface. | Start with a short commander brief and a presidential worklist. Push corps/OOB detail into drill-down panels. |
| `Summary` | Useful War Summary metrics and operational SITREP, but still dominated by repeated shell/sidebar context in the page flow. | Executive overview: stable systems, urgent systems, what changed, and whether advancing is safe. |
| `Records` | Good archive scaffolding, archive-route counts, and opening-week decision filing before first turn aftermath. | Receipt archive: AAR, operation history, decision log, opportunities, Codex links, first-hour decision memory, and clear "nothing yet" states only for categories that truly have no records. |
| `Personnel` | Personnel command dossier now leads with vacancies, low-loyalty commanders, reserve officers, and mobilization strain before OOB, mobilization pools, and officer roster. | Remaining work: replacement-cost framing, filters, source/provenance notes, and destructive-action confirmation/receipts. |

Concrete recommendations:

1. Put a persistent tab-specific title and one-sentence purpose under the Main Staff header.
2. Stop mixing the hidden/global shell text into the same reading order as the active modal; this weakens accessibility and browser test clarity.
3. Separate inspect controls from mutating personnel actions. `REASSIGN COMMANDER`, `DISMISS`, and `ASSIGN FROM POOL` need cost/confirmation and must not visually blend with expanders.
4. Use image cards where they clarify identity: staff briefing header, command family cards, personnel dossier, patron/diplomacy packets, and consequence receipts.
5. Reuse the existing asset direction: `src/ui/map/assets/presidential_desk/packet_thumbnails`, `decision_headers`, `consequence_stills`, crests, and scenario/briefing imagery.
6. Do not use image cards as decorative filler in data-dense tables. Use them to orient the player and distinguish action families.
7. Add a "reviewed" state for Briefing/Summary/Records/Personnel so the player knows what is optional inspection versus required turn work.

### Complete Alpha-Test Matrix

This matrix defines what "inspect everything" must mean before the product-facing audit can be considered exhausted. The 2026-06-02 pass covered many of these surfaces, but it did not fully pass this matrix.

| Area | Required alpha coverage | Current audit status | Release implication |
| --- | --- | --- | --- |
| Faction start | Start RBiH, RS, HRHB; dismiss tutorial; dismiss/read opening brief; verify first task. | Partially tested; first-session density and dismissal issues found. | Not release-ready. |
| Tutorial | Complete all steps, skip, restart from settings, route through top nav after skip, reload dismissed state. | Skip/dismiss issues reproduced; restart/settings not fully verified. | P0 before public alpha. |
| Opening brief | `OPEN DESK`, `READ LATER`, faction-specific copy, brief recall, no stale overlay text. | `READ LATER`/brief state remained ambiguous in automation. | Needs route-state QA. |
| President's Desk | Desk packet, authority header, command surface, recent consequences, records route, advance clearance. | Tested; strong spine, but action closure missing. | Needs loop closure. |
| Warroom hotspots | Faction overview, operational map, calendar, diplomacy, radio intelligence, news/press, command briefing, commander. | Inventory found controls; full destination/content validation incomplete. | Needs dedicated route matrix. |
| Command Surface | Each category card opens correct filtered Decision Room/action family and returns cleanly. | Route host fixed for War Direction in browser and source tests; remaining alpha matrix needs all six categories and return/focus proof. | P0/P1. |
| Army HQ Briefing | Daily briefing, Strategic Priorities, advanced review, dossiers, commander record, corps cards. | Tested; overloaded and confusing. | Redesign needed. |
| Army HQ Summary | Overview, IVP, convoys, casualties, support, OPSEC, capital, map embed. | Tested; cleaner but lacks action/readiness state. | P1. |
| Army HQ Records | Territory trend, archive-route summary, tab counts, AAR, operation history, decision log, opportunities, Codex route, and decision Records/Chronicle filing indicators. | Focused fixture tests cover route counts and Chronicle opening from decision records. Needs post-turn browser fixture. | Improved / Needs browser fixture. |
| Army HQ Personnel | Force overview, mobilization, OOB, officer roster, reserve pool. | Tested; rich but raw. | P1 information hierarchy. |
| Army HQ modal isolation | Dialog focus, backdrop, tab names, map-underlay controls, keyboard tab order, screen-reader order. | Live visible-DOM test found the dialog and map controls exposed together; role selectors were unreliable until node-specific clicks were used. | Needs accessibility/focus containment pass. |
| Army HQ Summary sub-tabs | Overview, IVP, Convoys, Casualties, Support, OPSEC, Capital. | Live node-specific pass reached all seven sub-tabs; empty states exist. | Needs action/readiness/reviewed states. |
| Army HQ Records sub-tabs | Turn aftermath, AAR, operation history, decision log, opportunities, Codex. | Sub-tabs now carry archive counts and Records shows where receipts are filed. Content still needs loaded post-turn browser fixture proof. | Improved / Needs post-turn fixture. |
| Corps cards | Expand/collapse all corps; commander/sector/operation/ORBAT/combat-record expanders. | Partially tested; live route noisy. | Needs fixture and visual proof. |
| Brigade rows | Sidebar brigade, Army HQ ORBAT brigade, settlement stationed-unit brigade, Formation Detail tabs. | Sidebar ORBAT -> brigade -> Formation Detail verified for `101st Mountain`; Army HQ ORBAT and settlement stationed-unit route still need fixture proof. | Partially verified; needs remaining routes and destructive order separation. |
| Formation Detail | Overview, Record, Orders, corps link, sector link, order/override controls. | Overview/Record/Orders verified; sector link verified; sector assignment override identified as destructive. | Needs confirmation/receipt coverage for override actions. |
| Sectors | Sidebar sector, Army HQ sector expander, map front-edge click, sector panel, assigned/reserve brigade rows. | Formation sector link and sector panel verified; sector sidebar list visible; ORBAT tab verified; logistics/ops tab targeting inconsistent; map front-edge click still needs coordinate fixture. | Partially verified; needs tab a11y and front-edge proof. |
| Settlements | Map settlement click, Overview/Municipality/Timeline tabs, stationed units, pending orders, operations, support action. | Map click selected Donje Ratkovo and opened Settlement Info; overview/population/local support verified; tab role targeting inconsistent; nonzero displacement sample not covered. | Partially verified; needs tab a11y and displacement fixtures. |
| Population accounting | Prewar, current, arrived, displaced, killed, fled, ethnic structure, municipality rollup. | Donje Ratkovo sample showed stable prewar/current population; code risk found: `SelectionPanel` fallback can double-count `lost`. | Needs data audit/test with nonzero displacement/loss/inflow. |
| Map modes | Political, ethnic, supply, operations, defense, morale, casualties, authority, legitimacy, layers, +MORE. | Full mode inventory confirmed by live `+MORE` and static map-mode constants; expanded strip overflowed the viewport and role-clicking expanded modes was unreliable. | Needs responsive/accessibility fix and mode-by-mode screenshots. |
| Map mode legends | Ethnic, supply, casualties, morale, operations, defense, authority, legitimacy legends; political/no-legend handling. | Static legends confirmed; live full legend pass incomplete because expanded controls were not reliably role-clickable. | Needs active-state and screenshot proof. |
| Layer toggles | Fronts/front, units, labels, sectors, minimap, fog, borders, 1991. | Live `LAYERS` menu opened and showed layer toggles; static constants confirm dev/live variants. | Needs player/dev split, persistence, and keyboard coverage. |
| Map links | Map mode legends, selection panels, front edges, settlement timeline links, operation links. | Not exhausted. | Needs link matrix. |
| Records/Chronicle/Codex | Top routes, internal links, event/decision/AAR links, return path. | Focused tests cover Records route counts and Chronicle opening from decision consequence rows; turn-0 routes are no longer the only evidence. | Needs post-turn save fixture. |
| Diplomacy/Patrons | Desk/Warroom route, patron surface, actor timeline, demands, receipts. | Route remains incomplete/noisy. | P1/P0 if patron decisions block. |
| Settings | Language, audio, accessibility, diagnostics, tutorial restart, save/load state. | Not fully verified live. | P1 before alpha. |
| Save/reload | Campaign save, reload, tutorial dismissed state, current tab, receipt/archive persistence. | Not covered in this pass. | P0 for alpha. |
| Advance turn | Disabled reason, ready state, confirm modal, aftermath modal, next-turn receipts. | Did not advance by design; disabled reason still unclear. Warroom wall-calendar route is statically mapped to advance-turn and queued as destructive. | Needs controlled fixture. |

Concrete alpha-test recommendation: create a non-destructive `alpha_surface_walkthrough` script with named fixtures and stable selectors/test ids. It should write a report artifact only when explicitly requested; for this master audit, findings are recorded in this file only.

### Destructive Alpha Route Queue

Per owner instruction, take the destructive route only after all non-destructive inspection is complete. "Destructive" means any route that mutates campaign state, consumes Command Authority, advances time, stages/dismisses a directive, changes commander/stance/assignment, writes save data, changes settings persistence, or alters the loaded fixture.

Preconditions before running this queue:

1. Use a disposable save or named alpha fixture, not the user's current play state.
2. Snapshot starting state and final state; record exact faction, date, turn, and URL/screen before each mutation.
3. Keep #138, #141, and Car 3 worktrees untouched until their owner closes them.
4. Do not stage/commit any files as part of the destructive route unless separately requested.
5. Treat every destructive click as a test case with expected cost, confirmation, receipt, and rollback/reload behavior.

| Destructive route | What must be tested last | Expected player-facing proof |
| --- | --- | --- |
| Advance turn | Disabled reason, ready state, wall-calendar/toolbar confirmation, actual advance, aftermath modal, next-turn records. | Player sees why advance is blocked or safe, confirms once, then receives receipts in Records/Chronicle/AAR. |
| Command Surface directive | Each presidential card family that can mutate state: war direction, diplomacy/patrons, home front, command/personnel, conscience/atrocity, record/turn. | Card -> directive -> cost/pushback -> confirm/cancel -> receipt loop closes. Direct military/personnel issue paths, exact typed settlement-name resolution for request-op targets, request-op commander pushback/force-anyway/stand-down/cannot-issue states, front-visit availability/initiation, patron/event consequence receipts, and Warroom-native Decision Room routing now have proof; remaining work is per-family route/receipt polish. |
| Operations | Request/suggest plan, commander selection, G2/assessment view, authorize, force/direct intervention, abort/delay objections. | Player understands commander recommendation, uncertainty, CA cost, and next-turn consequence. |
| Corps stance/direct control | Any remaining direct stance change or equivalent map-side military order. | Either removed/reframed as presidential request, or clearly confirmed as a state-changing command with doctrine/cost. |
| Personnel | Reassign commander, dismiss, assign from pool, reserve recall, elite brigade override/loan termination. | Confirmation names officer/formation, cost, institutional friction, and resulting record. |
| Settlement/home front | Stage local support, municipal support, settlement-specific orders, stationed-unit selection. | Population/support effect preview, accounting consistency, confirmation, receipt. |
| Sectors/fronts | Sector override, OPSEC posture, reserve assignments, front visit. Front Visit now shows deterministic reachable and cut-off fronts from the availability contract. | Selected sector is unambiguous; remaining work is receipt/cross-link polish and destructive sector-control confirmation separation. |
| Diplomacy/patrons | Patron demand, counter-offer, refusal, convoy/peace/Dayton-style decision, external-actor pressure. | Actor confidence/defiance and material consequences are explained before and after. |
| Events/conscience | Paramilitary/atrocity bright-line decisions and sensitive event responses. | Copy is authored, historically sensitive, and records the moral/political consequence without raw IDs. |
| Save/reload/settings | Save current campaign, reload, language/audio/accessibility/tutorial restart, persistence after reload. | Tutorial dismissed state, current route, receipts, and settings survive reload or clearly reset by design. |

### Phase 2: Make The First Ten Minutes Excellent

Goal: a new player understands purpose, stakes, and first decisions without losing depth.

| Work packet | Concrete recommendation | Acceptance evidence |
| --- | --- | --- |
| Faction-specific opening | RBiH, RS, and HRHB get distinct opening briefs, inherited operations, constraints, patrons/allies, and first 2-3 priorities. | Three browser walkthroughs with captured opening text and visible first actions. |
| RS inherited ops | RS starts with active operations; provide a dedicated "already underway" briefing with allowed presidential intervention choices. | RS turn-0 proof showing Drina/Koridor context and possible actions. |
| HRHB scoping check | Verify why HRHB saw Banja Luka/Dragocaj priority fronts; either fix scoping or explain all-front monitoring clearly. | Test fixture/browser proof for HRHB priority-front logic. |
| Progressive disclosure | Replace first-turn acronym wall with priority summary plus expert expansion. | First screen shows 2-3 priorities before raw SITREP/IVP/OOB details. |
| Glossary/Codex links | Terms link to short explanations on first exposure. | Browser proof for SITREP, IVP, ORBAT, Command Authority, TG, patron defiance, exposed sectors. |

### Phase 3: Productize Tactical Groups

Goal: TGs become a comprehensible player-facing phenomenon, not a hidden engine trick.

| Work packet | Concrete recommendation | Acceptance evidence |
| --- | --- | --- |
| TG matrix | Create and maintain a TG completion matrix: engine, read-model, UI, map, Army HQ, AAR, Chronicle, glossary, i18n, tests. | Matrix exists and each future TG lane updates it before merge. |
| TG dossier | Army HQ/operation view shows TG name, commander, parent corps, donor brigades, purpose, expected duration, risk. | Fixture and browser proof for active TG state. |
| Donor-cost preview | Before backing or authorizing a TG, show which formations lose readiness/cohesion/availability. | Directive card proof with donor-cost explanation. |
| TG aftermath | AAR explains success/failure/dissolution, donor strain, commander standing, and institutional consequence. | Turn-advance proof from TG creation through AAR/Records. |
| Map representation | Active TGs appear on map/operations overlay without cluttering normal front display. | Browser proof for map marker/overlay and tooltip. |

### Phase 4: Make War Truth Trustworthy

Goal: the map and reports communicate uncertainty, friction, and authority without lying.

| Work packet | Concrete recommendation | Acceptance evidence |
| --- | --- | --- |
| Contestedness vocabulary | Separate controlled, held, contested, influenced, supplied, and reported. | Legend/cards use distinct language and colors; no over-crisp "truth" for fuzzy states. |
| Confidence indicators | Add source/confidence/staleness to front cards, priority fronts, supply routes, and hostile timers where supported. | UI fixtures show confirmed, estimated, stale, and unknown states. |
| Supply explanation | Supply mode explains why a route is brittle and what action family can help. | Browser proof from a strained/critical supply fixture. |
| Front priority rationale | Priority fronts list "why here" and "what can be done" instead of only sector names/counts. | Browser proof for top two priority fronts per faction. |
| AAR causality | Operation and turn reports explain main reasons for outcome, not just numeric deltas. | AAR fixture with commander, supply, cohesion, donor, patron, and map consequences. |

### Phase 5: Finish Events, Patrons, Chronicle, And Codex

Goal: the war remembers player choices and explains why they matter.

| Work packet | Concrete recommendation | Acceptance evidence |
| --- | --- | --- |
| Event modal corpus | Convert event rows into authored player-facing modals with branch semantics, default historical labels, and consequence previews. | Coverage table for all modal-ready rows and next authoring tranche. |
| Sensitive-history review | Sensitive events get historian/native-language review before broad release. | Review checklist attached to event tranche report. |
| Patron relations | Patron surface shows confidence, defiance, demands, material consequences, actor history, and routes to relevant decisions. | Browser proof for patron demand, refusal, consequence, and receipt. |
| Chronicle memory | Major decisions and operations appear in Chronicle with dates, actors, and consequences. | Turn sequence proof that Chronicle captures decisions without raw IDs. |
| Codex consumption | Codex entries link from terms/events/actors actually seen in play. | Browser proof from event/directive/tooltips into Codex and back. |

### Phase 6: Release-Grade Language, Accessibility, And Visual QA

Goal: remove the last credibility caps.

| Work packet | Concrete recommendation | Acceptance evidence |
| --- | --- | --- |
| i18n completion | Finish English key extraction across all player-facing surfaces, then BCS LQA with diacritics and sensitive terminology. | Key coverage report plus native LQA signoff list. |
| Live accessibility | Run browser/axe checks on first screen, Desk, Command Surface, directives, Army HQ, Records, Chronicle, Codex, map controls, settings. | Axe output and keyboard/focus walkthrough. |
| Visual regression | Add fixed browser screenshots for core product surfaces across desktop and smaller laptop viewports. | Baseline and diff workflow for core screens. |
| Settings QA | Verify language/audio/accessibility/diagnostics/tutorial restart in live route. | Browser proof and fixture tests. |
| Save/reload QA | Save, reload, tutorial dismissed state, command receipts, and active operations survive reload. | Deterministic save/reload test plus browser proof. |

### Phase 7: Production Polish And Launch Readiness

Goal: make it feel finished outside the dev environment.

| Work packet | Concrete recommendation | Acceptance evidence |
| --- | --- | --- |
| Real audio | Implement non-placeholder audio path: UI ticks, restrained ambient bed, alert stingers, audio settings, mute/defaults. | Packaged build proof with audio settings and no console-only stub. |
| Final art | Finish command-card owner art, faction treatment, and screenshot-safe visual assets. | Asset inventory and browser screenshots for command cards. |
| Packaging | Signed Windows package, Linux AppImage proof, clean-VM launch, version/build identity, crash/log location. | Release-candidate build notes. |
| Playtest telemetry | Opt-in diagnostics and playtest feedback aggregation with privacy notes. | Operator-approved telemetry/support workflow. |
| Store/press/trailer | Public high-concept copy, trailer, press kit, screenshot set, feature list, content warnings. | Store checklist and press package ready for review. |

---

## Top 25 Missing Player-Facing Items

| Rank | Item | Owner lane after active work closes | Impact |
| --- | --- | --- | --- |
| 1 | Tutorial dismissal/focus persistence | UI/product QA | Blocks basic navigation and first-session trust. |
| 2 | Card -> directive -> receipt closure | Presidential command | Central product promise. |
| 3 | Direct corps controls removed/reframed | Presidential command/UI | Protects role doctrine. |
| 4 | Advance disabled reason | UI/product QA | Prevents player confusion at the turn boundary. |
| 5 | Faction-specific first-turn briefs | Product/content/UI | Converts depth into comprehension. |
| 6 | TG completion matrix | TG/product oversight | Prevents TGs from remaining engine-only. |
| 7 | TG dossier and donor-cost preview | TG/UI/AAR | Makes new TG layer playable. |
| 8 | Patron Relations reliable route | Diplomacy/UI | New patron layer needs a home. |
| 9 | Patron actor history and receipt discoverability | Diplomacy/events | Receipt substrate exists; the player still needs an obvious route and actor-history context. |
| 10 | Operation predictor confidence | Army HQ/ops | Helps player authorize through uncertainty. |
| 11 | AAR causality standard | AAR/Records/Chronicle | Makes outcomes legible. |
| 12 | Priority-front rationale | Map/warroom | Explains why the game wants attention. |
| 13 | Map contestedness/confidence | Map/graphics/read-model | Prevents UI truthfulness failure. |
| 14 | Supply brittleness explanation | Supply/map | Makes logistics actionable. |
| 15 | First-exposure glossary links | UI/Codex/i18n | Reduces acronym overload. |
| 16 | Event modal authoring tranche | Events/content | Makes decisions feel authored, not tabular. |
| 17 | Sensitive-history review workflow | Historian/content/i18n | Essential for credibility and tone. |
| 18 | Chronicle decision memory | Chronicle/events | Gives the campaign a government archive. |
| 19 | Codex links from live UI | Codex/UI | Turns hidden lore into support. |
| 20 | Settings discoverability | UI/release | Required for accessibility/audio/language. |
| 21 | Hardcoded English/i18n completion | Localization | Caps product credibility until finished. |
| 22 | BCS native LQA | Localization/historian | Subject matter demands it. |
| 23 | Browser/axe/visual regression suite | QA | Needed for release-candidate confidence. |
| 24 | Real audio and final art | Production | Moves from impressive dev build to finished product. |
| 25 | Packaging/store/press/trailer | Operator/release | Needed for public-facing launch. |

---

## Work Packet Prompts For Future Claude Dispatch

These prompts should be used only after the active Claude sequence is cleanly closed and the repo tree is suitable for new work. They are included to make the audit actionable, not to launch work now.

### Prompt A: Tutorial And Shell Stabilization

> Fix the player-shell blockers identified in `docs/40_reports/PRODUCT_FACING_MASTER.md`: tutorial skip/dismiss persistence, modal focus stealing, disabled `ADVANCE TURN` explanation, settings discoverability, and player/dev chrome separation. Do not change simulation behavior. Preserve the president-through-generals doctrine. Add focused browser/Playwright evidence for first screen, RBiH start, skip tutorial, top-nav routes, settings route, and advance disabled/ready states.

### Prompt B: Presidential Command Loop Closure

> Implement one complete presidential-command loop slice from Command Surface card to Directive Card to confirmation to cost/pushback to next-turn receipt to Records/Chronicle. Use existing levers and Command Authority substrate; do not add mechanics. Pick the smallest representative lever that proves the pattern. Include fixture tests and browser proof.

### Prompt C: Tactical Groups Product Matrix

> Create a Tactical Groups product-completion matrix and use it to audit current TG player-facing coverage: identity, commander, parent/donor formations, donor costs, map/HQ appearance, directive preview, AAR/Chronicle receipt, glossary/i18n, and tests. Record findings only unless explicitly asked to implement. Respect active TG lanes and do not modify #138/#141/Car 3 worktrees.

### Prompt D: First Ten Minutes

> Build or specify faction-specific first-ten-minute flows for RBiH, RS, and HRHB. Each flow must show opening duties, inherited operations, patrons/allies/constraints, first 2-3 priorities, glossary links, and a clear path to first advance. Keep the simulation untouched unless separately approved.

### Prompt E: War Truth And AAR Causality

> Audit and then improve map/front/AAR truthfulness: contestedness, supply brittleness, confidence/staleness, priority-front rationale, and operation outcome explanations. Do not invent new mechanics; expose existing read-model truth more honestly. Include browser fixtures and before/after evidence.

---

## What Not To Do

1. Do not add more mechanics until the player loop can explain the mechanics already present.
2. Do not broaden TG work until the TG product matrix exists and active lanes are handed off.
3. Do not treat the Command Board as the only source of product truth; it is a dispatch ledger, not a player-completion map.
4. Do not hide product gaps under "expert wargame" expectations. Serious wargames still owe the player action, cost, and receipt clarity.
5. Do not over-polish art/audio before the first-session shell, command loop, and receipts are stable.
6. Do not let release-facing work stay purely operator-owned forever; store/trailer/press/settings/packaging are part of the product bar.
7. Do not use stale worktree caveats as roadmap truth; verify the current Command Board before dispatch.

---

## Consolidated Priority Queue

These are findings, not permission to start work before the active Claude lanes close.

| Priority | Missing player-facing work | Why it matters |
| --- | --- | --- |
| P1 | Browser/axe route-state proof for first-hour shells. | The tutorial/modal persistence blocker is closed in current first-hour proof, but release-candidate evidence still needs broader accessibility and route-state coverage. |
| P0 | Finish presidential act loop beyond DirectiveCard: deepen each command category from correct route/lens into clear action, inspection, monitor, and receipt flows; archive receipts into Records/Chronicle and make patron/event receipts discoverable. | The core DirectiveCard action host, Warroom-native route host, counter-offer modal ownership, all-six command-card route/lens proof, Home Front supply/economy ownership, Humanitarian & Siege Ledger, War Footing, Chief-of-Staff counsel, and receipt family localization/browser proof are now covered; the remaining product promise is owner card art, full settlement/front picker, and richer future receipt content. |
| P1 | Audit remaining mutating tactical controls against president-through-generals doctrine. | The documented left OOB direct-stance combobox is closed; residual risk is sector/personnel/control actions that still need cost, confirmation, and receipts. |
| P0 | Create TG Product Completion Matrix after active lanes hand off. | TGs are strategically important but not yet player-complete. |
| P1 | Reduce first-turn jargon/density with progressive disclosure and glossary/tooltips. | Current first turn is deep but intimidating and acronym-heavy. |
| P1 | Polish Patron Relations route, actor history, and receipt discoverability. | Patron-defiance receipts, Patron Relations material consequence records, and Records/Chronicle filing visibility exist; patron layers still need fuller actor history and post-turn browser proof. |
| P1 | Complete operation request/approval/AAR readability. | Operations are strong substrate; player needs causality and confidence. |
| P1 | Add map uncertainty/contestedness/supply brittleness explanation. | The map looks good but can imply too much certainty. |
| P1 | Continue i18n EN-key extraction and BCS LQA plan. | Localization is still a credibility cap for this subject matter. |
| P2 | Expand records/Codex/Chronicle consequence reach. | The game needs to remember and explain the war, not just simulate it. |
| P2 | Browser/axe and visual regression proof for core surfaces. | Static tests are not enough for release-candidate UI confidence. |
| P2/P3 | Audio, card art, telemetry, packaging, store, press, trailer. | These are production-facing release gaps, not core-sim blockers. |

---

## Adequacy Judgment: Roadmap and Command Board

The Command Board is adequate as a dispatch ledger but not adequate as the master product-facing roadmap. It tracks active lanes and stop gates well, but it is too operational and too stale in places to answer "what is missing for the player?" without reading several reports and recent commits.

Required expansion after Claude's current sequence lands:

1. Add a `Product-Facing Completion` section or companion board with per-system columns: Player sees, Player does, Cost/constraint shown, Receipt shown, Tutorial/glossary, Localization, AAR/Codex, Tests.
2. Split `Presidential Command Model` from `Presidential Command Surface` into a completion matrix, not long narrative status.
3. Add a Tactical Groups product matrix before more TG work is launched.
4. Add a Patron Relations/president-diplomacy matrix because patron layers are now important enough to confuse players if left as partial read-models.
5. Keep production/operator gaps visible but separate from code-owned player-facing gaps.

Bottom line: the roadmap is good enough to prevent tree collisions. It is not yet good enough to serve as the product owner dashboard for player-facing completeness.
