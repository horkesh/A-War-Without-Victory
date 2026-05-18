# A War Without Victory — New Player Guide

**A game about losing better.**

This guide is the new-player walkthrough I wished the in-game 8-step tutorial had given me. It fills the gap between "the tutorial is over" and "I know what I'm supposed to be doing."

If you've finished the in-game tutorial and you're still wondering what the buttons mean, start here.

> **Na bosanskom jeziku:** [VODIC_ZA_NOVE_IGRACE.md](VODIC_ZA_NOVE_IGRACE.md) — paralelni vodič na bosanskom. UI labels remain quoted in English because the in-game UI is still English-only.

---

## 1. The premise (read this first)

You are the political leader of one of three factions in the 1992–1995 Bosnian War: **RBiH** (the Republic of Bosnia and Herzegovina, defending), **RS** (Republika Srpska, the Bosnian Serb state), or **HRHB** (Herzeg-Bosnia, the Bosnian Croat state, allied with RBiH).

This is a **negative-sum war game**. There is no "win the war" outcome. The Bosnian War ended with the Dayton Agreement in November 1995, freezing territorial lines and creating two entities inside a single weak state. Every faction ended worse than they started.

Your job is **not to conquer territory or destroy your enemies.** Your job is to **choose how to lose less**. You command through institutions — corps commanders, peace negotiators, foreign patrons — and the war happens through them whether you choose well or badly.

If this framing sounds unusual, it is. Most strategy games reward expansion. This one rewards reading the room.

---

## 2. The turn loop in one minute

Every turn is one week of real time. Each turn you:

1. **READ THE BRIEF** — top-right panel "Presidential Inbox" opens with a brief from your Chief of Staff (three scan points). It tells you what your faction's strategic position requires.
2. **INSPECT** — the left "Command" panel shows your situation. Territory %, exposed front sectors, casualties, alliance state, international pressure. Read it.
3. **DECIDE** — open the toolbar buttons: `SUMMARY` (war stats), `RECORDS` (Army HQ), `OPS` (operations), `EVENTS` (event log), `CODEX` (history essays), `INBOX` (pending decisions). The Decision Room (opened from Army HQ Briefing tab) is where pending choices live.
4. **EXECUTE** — change corps stances (Defensive / Balanced / Offensive / Reorganize), approve or decline staff-proposed operations, accept or reject peace plans, resolve paramilitary incidents.
5. **ADVANCE TURN** (button top-right). The simulation runs one week. Your bots, the AI factions' bots, the engine all step forward.
6. **READ THE AFTERMATH** — a Turn Aftermath modal pops up with what changed: battles fought, ground gained/lost, casualties, command outcomes.
7. **REPEAT** for 188 weeks (the full Bosnian War, April 1992 → November 1995) or until Dayton triggers earlier.

The whole game is this loop.

---

## 3. Faction-specific advice

### Playing RBiH (ARBiH — the Bosnian government)

- Your faction is **defending**. Don't think of yourself as the offensive power; you don't have the equipment for that until late 1994.
- Your starting brief: *"Hold Sarajevo, Tuzla, Zenica, Bihać, and other urban anchors while the army forms under fire."*
- **Hold the cities.** If Sarajevo, Tuzla, Zenica, or Bihać fall to RS or HRHB, your strategic position collapses.
- **Watch the alliance gauge** (left panel, "ALLIANCE GAUGE (BOSNIAK-CROAT)"). It starts at 0.75. If it drops below ~0.5, you'll start fighting HRHB as a second front (this happened historically in spring 1993 — the Croat-Bosniak War within the Bosniak-Serb War).
- **Watch international pressure** (IVP). Higher = more sanctions/no-fly-zone/eventual NATO threat against your *enemies*. Civilian harm in your territory raises IVP.
- Your strategic asset is **time and international attention**. Survive long enough for the world to act, and Dayton will preserve your state.

### Playing RS (VRS — Republika Srpska)

- Your faction starts with **the largest army and the JNA's heavy equipment**: 360 tanks, 1,350 artillery, 82.5k personnel. Twice the firepower of the other two combined.
- Your starting brief tells you this advantage **is temporary**: international pressure and war exhaustion will erode it.
- **The Posavina Corridor** (Brčko area, northern Bosnia) is your single most strategic objective. It links eastern RS to western RS through a 4-mile-wide bottleneck. If it closes, your state is bisected.
- **Belgrade's attitude matters.** Bottom-right status shows "BELGRADE: CAUTIOUS / SUPPORTIVE / HOSTILE". When Belgrade goes SUPPORTIVE, you get patron benefits. When it goes HOSTILE, you lose support and political legitimacy.
- Your war crimes liability is real. Operations near Foča, Višegrad, Prijedor, Srebrenica, Sarajevo, Goražde all carry ICTY consequences that will follow you to the Verdict screen. The Cost Ledger remembers.
- Your strategic asset is **military superiority for ~18 months**. After that, RBiH catches up in numbers and HRHB stops being a friend.

### Playing HRHB (HVO — Herzeg-Bosnia)

- You're **the smallest faction by far**: 30 brigades, 16 tanks, 52 artillery, 23.8k personnel. RBiH has 78 brigades. RS has 77.
- Your territory is ~15% friendly at Turn 0. You won't grow.
- Your starting brief: *"Protect Herzegovina and exposed Croat communities in central Bosnia while avoiding overextension."* — and *"Manage the Sarajevo alliance and Zagreb patron pressure; either can shift faster than the front."*
- **Two patrons can break you.** Zagreb (Tudjman's Croatia) and Sarajevo (the ARBiH alliance). If Zagreb pulls Croatian support, you lose your equipment pipeline. If the Bosniak-Croat alliance ruptures (it did historically in 1993), you fight a two-front war against ARBiH AND VRS simultaneously.
- **Mostar** is your symbolic capital. Hold it. The historical Mostar Bridge destruction (November 1993) is a Cost Ledger entry that scars the HRHB outcome.
- Your strategic asset is **knowing when to negotiate, retreat, or stand down**. You will not win an attritional war.

---

## 4. The toolbar — what each button does

Top center: faction crest. Date and turn number top-left. Top-right toolbar from left to right:

- **CHRONICLE** — historical timeline + game-state-derived narrative.
- **SUMMARY** — War Summary modal: territory %, military strength, displacement totals, campaign cost, civilian impact, IVP. Read this every 4–8 turns.
- **RECORDS** — opens Army HQ. Four tabs: Briefing (Strategic Priorities heartbeat), Summary (same War Summary), Records (Turn Aftermath, After-Action Report, Operation History, Opportunities), Personnel (full Order of Battle with brigades).
- **OPS** — Field-ops view: shifts the map to operations focus, shows staff-proposed operations on the right.
- **EVENTS** — Event log. Sparse early-war.
- **CODEX** — historical essays. 96+ entries on real events (Bijeljina, Ahmici, Operation Storm, Dayton, etc.). Dynamic sections wire into your run's actual divergence from history.
- **INBOX** — Presidential Inbox count. Shows pending decisions: peace plans, personnel events, convoy decisions, paramilitary reviews.
- **AUTH** (gauge) — your Command Authority. 100/100 max, recovers +2 per turn. Spent on Level 3 overrides: force-launching operations against commander recommendation, manual brigade orders.
- **ADVANCE TURN** — primary action. Click to roll one week forward.

Bottom toolbar: map overlay selector (Political / Ethnic / Supply / Operations / +More for Casualties / Morale / Defense). Status bar shows Friendly %, Hostile-held %, patron/alliance state.

Left column ("Command"):
- **SITUATION** — your faction's territory, sitrep, priority fronts, weakest brigades, casualties, alliance gauge, international pressure. Read this every turn.
- **ARMY** (N brigades) — collapsed list of corps. Click a corps to drill into it.

Click a corps to expand it. Inside a corps panel:
- **Overview / ORBAT / Sectors / Ops Snapshot / Orders** tabs.
- Stance buttons: Defensive / Balanced / Offensive / Reorganize. Sets the corps's posture.
- **"Prepare Operation in HQ"** opens the OpsPlanningModal — your only path to author a brand-new operation.

---

## 5. The OpsPlanningModal (creating an operation)

When you click "Prepare Operation in HQ" you enter a four-phase OPORD authoring flow:

1. **COMMANDER** — pick an officer. Real historical generals. HOME CORPS officers prefer this corps; COMPATIBLE officers can be loaned; OUT OF REGION officers refuse.
2. **PLAN** — name, type, tempo, tolerance, support, plus map-click to add objectives + drag brigades to axes.
   - Use the **Suggest Plan** button (top-right of phase) if you don't know where to start. The AI will pick a viable objective + brigade allocation for you.
   - "Type" options: sector_attack (single sector push), general_offensive (corps-wide assault), strategic_defense (dig in), reorganization (re-deploy), feint (false attack), probe (recon-in-force).
3. **G-2 ASSESSMENT** — your intelligence officer's read on the plan. Force ratio, supply, terrain, opposition.
4. **AUTHORIZE** — confirm. Costs Command Authority if you force-launch against the commander's recommendation.

Your corps commanders also generate their own operation proposals automatically. Those appear in the Ops Snapshot panel and can be Approved / Declined / Force-Launched via OperationBriefingModal when they reach the assessment phase. **Most of your "create" actions will actually be approving what your staff already proposed.** Force-launching your own custom op is the override path.

---

## 6. The Decision Room

Open via Army HQ → BRIEFING tab. This is the central UI for everything that needs your attention.

It shows the **product loop heartbeat** — eight cards in order:
- **BRIEF** — what your staff has reported.
- **INSPECT** — what your staff thinks needs investigation.
- **DECIDE** — pending decisions (peace plans, convoy decisions, paramilitary requests).
- **EXECUTE** — operations awaiting your authorization.
- **REPORT** — turn aftermath summary.
- **COST** — current campaign cost severity.
- **JUDGE** — chronicle memory updates (what the historical record now reflects).
- **NEXT** — what staff predicts will need your attention next turn.

And the **command loop lanes** below:
- **URGENT / DECISIONS / FRONTS / INSPECT / ADVANCE** rows with deep-link buttons.

**The Decision Room is the answer to "what should I do this turn?"**. If you ever feel lost, open it.

---

## 7. Things the game won't tell you that you should know

1. **You cannot win.** Stop trying to. Optimize for *the lowest-cost loss*.
2. **The Cost Ledger is permanent.** Every approved war crime, every overridden commander, every refused peace plan accrues. It shows up in the Verdict screen at game end.
3. **Brigades NEVER attack alone.** You don't issue brigade-level orders. Everything flows through Corps → Sector → Operation. If you find an interface that lets you order a single brigade to attack, it's a dev-only override.
4. **Stance changes are committed immediately** to staff but only execute next turn. You can change stance mid-decision-cycle.
5. **Peace plans are real.** Vance-Owen (Jan 1993), Owen-Stoltenberg (Aug 1993), Contact Group (Jul 1994), Dayton (Nov 1995) — they all appear in-game at historical dates. You can accept any of them. Accepting Vance-Owen at the right moment is a legitimate strategic choice for HRHB and (arguably) RS.
6. **Patron pressure shifts.** Belgrade can withdraw support from RS. Zagreb can withdraw support from HRHB. Washington can pressure RBiH. Watch the IVP and patron-attitude indicators.
7. **The map is a record, not a control panel.** You cannot directly move things on the map. You set stances and approve operations; the staff translates those into brigade movements.
8. **Schwerpunkt** is German for "point of main effort" — used by operations to indicate which objective gets the most brigades.
9. **OPSEC** is operational security: hide an operation from enemy intel. Costs supply.
10. **War exhaustion** rises over time. At STRONG (100), your forces are at max attrition. Dayton becomes harder to refuse.

---

## 8. Common new-player mistakes

1. **Trying to advance the turn at Turn 0 without reading the Brief.** The brief tells you what your faction's strategic position requires. Skip it and you're flying blind.
2. **Setting all corps to Offensive immediately.** Your corps don't have the supply or morale to sustain attacks every turn. Mix Defensive (entrench) + Reorganize (rest) + Offensive (push) per the situation.
3. **Force-launching operations early.** Costs 15 Command Authority. You start at 100, recover +2 per turn. Spend it deliberately; you'll regret it if you're at 20/100 when a real opportunity appears.
4. **Ignoring peace plans.** Each is a real strategic choice. Reject all of them and you commit to fighting until Dayton, by which time your faction has accumulated maximum war crimes and casualties.
5. **Not reading the Codex.** The historical essays explain *why* the events you see happening matter. The dynamic sections also track how your run is diverging from history — useful feedback.
6. **Worrying about hostile units inside your territory.** They might be JNA brigades that haven't withdrawn yet, paramilitary formations that aren't tied to any front, or simply moving in to attack. The Operational Sitrep "exposed front sectors" count is more reliable than counting icons.
7. **Conflating "Friendly %" with "winning"**. Your % can rise while your strategic position deteriorates (e.g. RS capturing rural ethnic-Bosniak villages raises RS Friendly % but accumulates ICTY consequences).
8. **Treating the Belgrade attitude indicator as a meter to maximize.** Belgrade SUPPORTIVE is good for short-term operations but ties you tighter to Milošević's regime, which has long-term IVP costs. RS players: there's a real trade-off.

---

## 9. When you're stuck

- **"I don't know what to do this turn."** Open the Decision Room (Army HQ → Briefing tab). The Strategic Priorities heartbeat shows you.
- **"I don't know how to make an operation."** Click a corps in the Command panel → Ops Snapshot tab → "Prepare Operation in HQ" → Commander phase → Plan phase → click "Suggest Plan" → review → advance phases.
- **"I don't know what this term means."** (No in-game glossary yet.) Until one ships, this Guide's section 7 covers the most-common jargon. Codex essays explain historical context.
- **"The map is too zoomed out."** Map controls bottom-right: + / - zoom, recenter button.
- **"I want to undo my last decision."** You can't. Save/load is the only undo. Save before each ADVANCE TURN if you want safety.
- **"I keep failing the AC-O7-3 hash."** That's a developer-only concern; ignore.

---

## 10. Where to learn more

In-game:
- **Codex** (toolbar) — 96+ historical essays, dynamic sections that respond to your run.
- **Chronicle** (toolbar) — your run's historical timeline as it unfolds.

In-repo (for designers / power users):
- `docs/10_canon/Game_Bible_v0_9_0.md` — design philosophy.
- `docs/10_canon/Rulebook_v0_9_0.md` — player-facing rules.
- `docs/10_canon/Systems_Manual_v0_9_0.md` — complete mechanic spec.
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` — what "winning" means.
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` — moral boundary for war-crimes content.

External:
- Balkan Battlegrounds Vol. I & II (CIA Office of Russian and European Analysis, 2002) — the underlying historical source for the OOB.
- ICTY judgments — Karadžić, Mladić, Blaškić, Kordić, Prlić, et al — the legal record AWWV draws on.

---

## 11. Final thought

This game is not a power fantasy. It is not a strategy puzzle you solve. It is a simulation of a real war, with real names, real places, real losses, and real consequences. You are not supposed to feel good about your choices.

The Codex explains the war's history through ICTY-grounded essays. The Cost Ledger remembers what you did. The Verdict screen at game-end compares your choices against the actual historical outcome.

A war without victory is not a slogan. It is the design statement.

Play accordingly.
