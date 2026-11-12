# Player surface and agency review

**Date:** 2026-11-11
**Asked by the owner:** "Did you redesign the left side panel (order of battle), the unit panels, sectors and so on? I'd like this to be comprehensive and for the game to speak one design language. Who sets posture? Can a brigade posture be set? Do a thorough review. Player experience is above all else."
**Basis:** the surface-redesign branch (#566), read in code and played in the dev build as RBiH at 1280 × 720, turn 0.

## 1. Short answers

- **Was the map side redesigned?** Only lightly. The order-of-battle sidebar, the unit (formation) panel, the sector panel, the settlement panel and the other map rails got a 13 px text floor, an opaque plane with a gold border and a wider sidebar. Their layout, structure and visual style were not touched. They still speak three older styles (below).
- **Who sets posture?** The army's own commanders, every turn. Brigade posture is written by the brigade-orders AI (`bot_brigade_ai_osid.ts`, `bot_brigade_eval_attack.ts`); corps stance by the corps-stance AI (`bot_corps_stance.ts`).
- **Can the player set a brigade's posture?** No, and canon says that is right: "The player does NOT set posture directly at any echelon … commanders PROPOSE posture/stance changes and the president approves or declines them" (Rulebook §5.5). The problem is that the approving half does not reach the player either (§2).

## 2. Agency: what the player is told vs what the player can do

| # | What the player sees | What is actually true | Effect on the player |
|---|---|---|---|
| A1 | Unit panel: **"Posture: Awaiting first posture order"** and "posture expected in a coming briefing". | Nobody will ever ask the player. The posture is set by the commanders; the label shows "awaiting" only until the first AI turn. | Reads as a task the player must do and cannot find. |
| A2 | Unit panel has an **Orders** tab. | The tab holds one sentence ("managed by the corps commander … issued through Army HQ directives") and no link or control. | A dead end with the most action-promising name in the panel. |
| A3 | Canon (Rulebook §5.5, §531; PLAYER_TURN_GUIDE): the president **reviews CO-proposed brigade postures and sector stances**. | Brigade posture proposals do not exist in the engine. Corps-stance proposals exist, but only at autonomy level 1 (Assisted); every live campaign starts at level 2 (owner, 2026-08-31, so all three armies fight without a human answering every plan). | The canon command loop for posture is unreachable by default and half unbuilt. |
| A4 | Sector panel: logistics priority and OPSEC buttons. | Those work. The canon "approve the sector stance" step has no control; its failure string (`corpsFront.stageStanceFailed`) is orphaned. | Stance is shown ("OG stance: defend") but not discussable. |
| A5 | Command Autonomy (reachable only from Army HQ). | Switching to Assisted is what makes stance proposals appear in the Command Surface, but nothing says so. | The one route to "approve posture" is hidden behind an unexplained setting. |
| A6 | — | Dead order hooks with no screen: `stagePostureOrderAction`, `stageAssignBrigadeToSectorAction`, `assignBrigadeToSectorOverrideAction`; IPC `stageAttackOrder`, `stageMoveOrder`, `stageDeployOrder`, `stageUndeployOrder`. The last four are correctly unused (brigades attack only through corps operations; the president does not move units). | No player effect today; they mislead anyone extending the UI. |

**Owner decision needed (posture model).** Three ways to make the screen tell the truth, smallest first:
1. **Say it plainly.** The unit panel shows the commander's posture as the commander's ("Set by the 1st Corps commander: Defend"), the Orders tab becomes "Command" and links straight to the directives that do reach this brigade (replace commander, front visit, request an operation, deploy reserves), and the autonomy setting explains that Assisted sends stance proposals to the president.
2. **Bring corps/sector stance to the president at level 2.** Stance proposals become Command Surface matters at the default level without the level-1 hold on operations.
3. **Build canon in full.** Add brigade-posture proposals for the president's approval. This is a mechanics change (sim, determinism, calibration) and needs the canon owners.

Recommendation: do 1 now (presentation only, no sim change); decide 2 vs 3 separately.

## 3. One design language: where the game stands

Today the player meets four visual languages:
- **Surface** (the approved Command Surface style, shared parts in `surface/Surface.tsx`): Desk, Inbox, Command Surface, Advance, event decisions, Army HQ, Diplomacy, Warroom previews, Chronicle, peace plan, officer matters, Settings, counter-offer/convoy/reserve/paramilitary, intelligence brief, end-of-week aftermath.
- **Tactical rail** (dark boxes, amber caps headers, mixed mono/sans): order-of-battle sidebar, unit panel, settlement panel, army reserve, corps/OG panels, order queue, legends.
- **Dossier paper** (cream paper, typewriter type): the sector ("OG Intelligence") panel, parts of the Army HQ dossier.
- **Legacy glass** (translucent blur, 10–12 px text, amber-400): operation planning (`ops_modal/*`, ~15 files), operation briefing, after-action report, operation history, Codex, verdict and game over, peace status, economy, enclave dashboard, humanitarian ledger, autonomy, AI advisor, commander selection, recruitment, onboarding tutorial, main and pause menus, side picker, Warroom status bar, bottom strip, toolbar, tooltips, radial menu, stack overlay, replay.

A scan finds older-style markers (glass panels, blur, sub-13 px text, amber-400) in **116 component files**.

Map-side findings from the live check:
- **M1. Panels open in different places and widths:** unit and sector panels float beside the sidebar at about 384 px; the settlement panel docks at the right edge at 320 px; the Presidential Inbox also takes the right edge.
- **M2. The sector panel is paper on a dark map:** cream background, typewriter type, its own tab bar; own-side figures show "—" and "REDACTED" at turn 0 ("Staff returns incomplete … and 8 more expected").
- **M3. Possible naming defect:** RBiH 1st Corps sector 0 is called "OG Bileća"; Bileća is in eastern Herzegovina, far from the 1st Corps. Needs a check of the sector-naming rule before any UI work.
- **M4. The unit panel mixes three type styles** (mono green unit name, condensed sans labels, small chips) and an odd single "Artillery 1" bar under TO&E.
- **M5. The order-of-battle sidebar** is a stack of accordions with amber caps headers and prose ("Widespread thinly held front OGs need staff review"); it is the first thing on the map and the least like the surfaces.

## 4. Proposed sequence (player experience first)

1. **Truthful command (A1, A2, A5)** — presentation only. Posture shown as the commander's; Orders → Command with real directive links; autonomy explained. Small, high value.
2. **Map rail system** — one rail frame for every map panel (same place, width, header, tabs, close), built from the surface parts: order of battle, unit, sector (dark, not paper), settlement, corps/OG, army reserve, order queue. Fixes M1, M2, M4, M5.
3. **Operations family** — operation planning, briefing, after-action report and history as surfaces (the largest legacy block, and the one the player uses most after the Desk).
4. **Records and end states** — Codex, verdict, game over, peace status, economy, enclave, humanitarian ledger.
5. **Shell** — main and pause menus, side picker, onboarding tutorial, toolbar, Warroom status bar, bottom strip, tooltips, radial menu.
6. **Posture model** (owner choice 2 or 3) as its own mechanics lane.

Each step: same gates as the redesign (tsc, affected tests, both screen sizes rendered, entry chunk, full suite, player-experience gate), EN and BCS copy.
