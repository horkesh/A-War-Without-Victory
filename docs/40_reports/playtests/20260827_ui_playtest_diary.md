# UI Playtest Diary — 2026-08-27

**Operator:** Claude (playtest lane, run in parallel with Codex on RE)
**Build:** `lane/playtest-harness` @ `b8d7cb747`, v0.9.9-beta.1
**Method:** real Electron app, real DOM clicks, `tools/playtest/run_electron.ts`
**Scenario:** `apr_1992`, all three factions

> **This diary is the home for the UI playtest lane.** Findings go here, not into
> `PROJECT_LEDGER.md` and not into the findings JSONL. The JSONL survives only as the
> harness's internal dedup index; it is not the record and should not be read as one.
>
> **Nothing below is fixed.** This lane records; it does not repair.

---

## 1. Session scope

| Field | Entry |
| --- | --- |
| Factions played | RBiH, RS, HRHB |
| Turns advanced | RBiH **8/8**, HRHB 8/10, RS 0/10 |
| In-game span | 6 Apr 1992 → 1 Jun 1992 |
| Stability | RBiH 8/8 on three consecutive runs |
| Evidence | `tools/playtest/evidence/`, per-run contact sheets in `tmp-playtest/<run>/contact_sheet.html` |

Everything past turn 9 is **unplayed**. No finding in this diary says anything about
mid- or late-war behaviour.

---

## 2. Three worst friction moments

### 1. The turn refuses to advance and will not say why

**Surface:** turn loop / Decision Room · **Bug** · affects all three factions

RBiH and HRHB both stall at turn 9 (1 Jun 1992); RS stalls at turn 1. Identical state
each time: `ADVANCE TURN ->` is present, enabled, and registers clicks — and the date
does not move. No message. No indication of what is missing.

The engine is *correct* to refuse: a required decision is outstanding. But the required
item lives only inside the Decision Room, and the turn surface shows nothing that leads
to it — no `REVIEW BLOCKERS` affordance, just a `SIGNATURE REQUIRED` badge in the status
bar that does not read as the route.

Two factions reaching the same state at different turns makes this structural, not
event-specific. RS only meets it sooner because it opens with six required decisions
instead of one.

**Evidence:** `tools/playtest/evidence/20260827_turn9_decision_room_blocker.png`

*How badly it misleads: this harness spent several hours concluding ADVANCE was broken.
A player has less information than the harness did.*

### 2. The Decision Room shows optional gestures above the item blocking the turn

**Surface:** Decision Room · **Friction**

With the room open at the stall, the ALL tab lists *Visit the front*, *Address the
nation*, *Decorate a unit* — all optional leadership gestures — above the single `REQ`
item that is actually holding the turn. Header reads `ALL 13 ITEMS · REQ 1 · REC 3 · MON
4 · RECORD 5`, so the count is right there; the ordering is what buries it.

### 3. Allied ground is reported as hostile

**Surface:** status bar · **Bug** · owner-reported, then caught by probe

`Friendly 31.5% | Hostile-held 68.5%` displayed on the same bar as `ALLIED`, while the
Situation panel reads *"Alliance posture: close coordination"*. Friendly + hostile sums
to exactly 100%, so this is a binary player-vs-everyone-else split that ignores alliance
state entirely.

**A fix must track a changing relationship, not a fixed faction list** — the same
campaign degrades to *"strained"* by 1 Jun 1992.

---

## 3. Findings by area

### Content that renders correctly and says the wrong thing

This whole category was invisible to the harness until 2026-08-27. The owner found eight
such defects by reading a single screenshot.

| Finding | Sev | Detail |
| --- | --- | --- |
| Front pairs resolve to one municipality | high | `Aginci (bosanska dubica) - Kozarska dubica (bosanska dubica)`. Owner: should read as one place, *Aginci in Kozarska Dubica*. **Hypothesis, unverified** — Bosanska Dubica was renamed Kozarska Dubica by RS, so both sides may be the same municipality under 1990 and RS names. |
| Allied ground counted hostile | high | See friction #3 above. |
| Place names lower-cased after the first word | medium | `Donji dubovik (bosanska krupa)` should be `Donji Dubovik (Bosanska Krupa)`. Affects most multi-word Bosnian place names. Looks like capitalise-first-letter over an id-derived string. |
| Typography inconsistent | medium | Measured: **5 distinct font families on the in-game surface**. Serif display + large italics on the opening, monospace/condensed sans in the shell. |
| Opening screen needs redesign | high | Owner verbatim: *"screams AI slop design with big italic letters for highlight and so on."* A redesign, not a tweak. Only became the first thing players see on 2026-08-27. |

### The sector → OG rename

| Finding | Sev | Detail |
| --- | --- | --- |
| "thinly held OG" is a category error | high | An OG *is* a collection of formations; you hold ground, not a formation group. The rename swapped the noun and left the terrain adjective. Owner's direction: describe dispersion — *"OG XXY is spread out"*. Copy fix only; **not** a sector-removal refactor. |
| Same sentence in two files, disagreeing | high | `messages.en.ts` says "thinly held front **OGs**"; the hardcoded fallback at `operational_sitrep_views.ts:174-179` still says "**sectors**". Player sees either, depending on code path. |
| "Sector Attack" still says Sector | medium | 104 display strings renamed to OG, 17 still contain "sector". Most are `{sector}` placeholders; **five are player-visible**, all the Sector Attack op type. |

### Design questions — not defects

| Finding | Sev | Detail |
| --- | --- | --- |
| RS opens with 6 required decisions, RBiH with 1 | high | Measured on turn 1 of each. Only **two of six** appear as inbox cards; the rest are room-only. Recorded as a **question** — a heavier RS opening may be intended, but the asymmetry is stated nowhere and the inbox/room split is a discoverability problem either way. |
| The president decides ~once every 7 weeks | high | 26 decisions in 188 turns (headless). For a surface premised on governing by deciding, most of the war is pressing Advance. |
| Four leadership-gesture events have no authored historical default | medium | `address_to_nation`, `visit_to_front`, `strategic_posture_review`, `decorate_a_unit`. Plausibly correct — history offers no default for "did the president visit the front in week 44" — but a "historical" playthrough is silently guessing. |

### Player-facing gaps

| Finding | Sev | Detail |
| --- | --- | --- |
| Controls with no accessible label | medium | Present on **every surface** — desk, war map, army HQ, records, chronicle, codex. Unreadable to a screen reader, ambiguous to everyone else. *(Counted separately per surface by the harness, which badly overstated its share of the ledger. It is one defect.)* |
| Operation directives rejected with reasons never shown | medium | **29 measured instances.** The engine writes `op_directive_rejection {target_osid, reason, turn}`, persists it, projects it to the client — and no surface under `src/ui/` reads it. The player spends Command Authority, gets nothing, is told nothing. |
| Peace-plan modal shows no default and no stakes | medium | Accept / Review Later / Reject, with no `HISTORICAL DEFAULT` marker and no dimension shifts — unlike event decisions, which show both. Affects Cutileiro, Vance-Owen, Owen-Stoltenberg, Contact Group. |
| Three major peace plans carry no per-option stakes | low | `vance_owen_plan_1993`, `owen_stoltenberg_plan_1993`, `contact_group_plan_1994`. The largest political decisions of the war are unlabelled choices. |
| Some surfaces expose no reachable control | medium | `codex`, `desk`, `records`, `army_hq`, `chronicle`, `war_map` each reported this at least once. **Low confidence** — likely navigation state in the driver rather than the app. Needs confirmation before anyone acts on it. |

### Noise, recorded so it is not mistaken for signal

`replace_co` and `request_op` produced ~1,850 `insufficient_command_authority` refusals
under the headless `counterfactual` policy, which fires both levers at every corps every
turn. **No human plays that way.** What it establishes is a ceiling — Command Authority
income supports only a small fraction of continuous lever use — not that any single
refusal is wrong.

---

## 4. Fixed this session (recorded, not open)

| What | Detail |
| --- | --- |
| Desktop app could not start a campaign at all | IPC validator rejected any payload without `decisionMode` while its own callee defaults it; two callers, only one updated by the case-file commit. |
| Blank game screen after start | `manualChunks` split `components/army_hq/` four ways by filename, creating a circular chunk dependency; the TDZ error killed the React render. |
| Case-file opening unreachable | Desktop launch showed the warroom's instant faction picker — the flow the 2026-08-23 plan was written to replace. Now routed through the case-file sequence. |
| Old Command Post flashed before the new opening | Owner-reported. `#main-menu` was visible by default while the desktop path awaited map data, the shell iframe, and state. |

---

## 5. Harness honesty

Ten driver defects were found and fixed this session. **Four share one root: the harness
took an action that changed app state, then measured the state it had just changed.**

| Action | Consequence | Reported as |
| --- | --- | --- |
| blind `Escape` fallback | paused the game | "ADVANCE does not move the date" |
| `Open Decision Room` every pass | navigated off the decision | "0 decision cards" |
| surface tour before the turn loop | stranded the shell in Army HQ | "no ADVANCE control" |
| bare `×` to clear a banner | closed the Decision Room | queue could never be worked |

Every one produced a false critical about the app. Any new interaction must state what it
perturbs before it is added.

Two more worth naming: a `Frame` handle captured once goes stale and then answers queries
with **zero matches instead of throwing**, so the driver reported "0 decision cards" while
the card was visible in its own screenshot. And a readiness regex written through a shell
heredoc turned `\b` into a literal backspace — `tsc` passed, because a backspace inside a
regex literal is valid TypeScript.

---

## 6. Open

- **RS advances 0 turns.** `clearReviewQueue` is never *called*: something returns true on
  all 20 clearing passes, prime suspect `resolveOpenDecisionModal` looping on a modal that
  does not close. Next step is to log which clearer returns true per pass — **not** to add
  another route. Handed over after ten attempts; see `tools/playtest/TODO.md` item 10.
- **Turn 9 ceiling** unbroken on RBiH and HRHB.
- **Nothing beyond 1 Jun 1992 has been played through the UI**, so no claim in this diary
  extends to the middle or end of the war.


<!--
Coverage block. Every OPEN finding must appear here, or diary_check reports it
UNDOCUMENTED. Fingerprints are what is read; titles are for humans.
-->
<!-- diary-coverage
071aa478b1c1  [medium] Decision `address_to_nation_rbih` has no authored historical default
072256b5b4e9  [high] A "front" has both sides in the same municipality
07ddb9a5fad8  [high] Player faces almost no decisions across the campaign
0a33a4fe74ef  [low] Lever `replace_co` refused: no_current_co
0ac8f0df01a3  [high] Opening screen needs a complete redesign to match the game aesthetic
102752f61718  [high] The same sentence is maintained in two files and they disagree: "A thinly held front OG needs st
121de4b137cf  [medium] Decision `csq_third_party_mediation_offered` has no authored historical default
182e6e7f012e  [medium] Peace-plan modal offers no historical default and no per-option stakes
1bc0a56b95c2  [medium] Interactive control with no accessible label
1e2303120fe2  [medium] Interactive control with no accessible label
2bfd8975d35e  [medium] The Sector Attack operation type still says "Sector" in player-facing text
35b2632dfcf3  [medium] Surface "in_game" renders text in 5 different font families
410897e96e98  [low] Lever `request_op` refused: insufficient_command_authority (#.#/#)
50b8dda5812e  [medium] Interactive control with no accessible label
50bb59700448  [medium] Typography is inconsistent across surfaces
56b6bda5d71e  [medium] Interactive control with no accessible label
582f880d10c1  [medium] Advance is offered and does nothing when a room-only blocker is outstanding
5ff0afb189d7  [medium] Interactive control with no accessible label
681d5f62ef1f  [medium] Decision `strategic_posture_review_rbih` has no authored historical default
6c2feb3668af  [low] Decision `contact_group_plan_1994` shows no stakes on any option
6c6f24ff39fa  [high] Territory bar counts allied ground as "hostile-held"
6cd4fa018f9a  [critical] Turn cannot be advanced after four attempts
6f579329b22e  [medium] Surface "war_map" has no reachable control
72962be702b1  [medium] Surface "army_hq" has no reachable control
764fd700316e  [medium] Retired term "sector" still in player-visible copy in ui\shared\operational_sitrep_views.ts
78be3027390d  [low] Decision `vance_owen_plan_1993` shows no stakes on any option
78cd60d64f40  [high] Copy says a formation group is "thinly held" — an OG holds ground, it is not held
7afde0e4e2d4  [high] RS opens with six required presidential decisions; RBiH opens with one
7c85fee759a7  [high] Two sources for the same sitrep copy disagree: i18n says "OGs", the hardcoded fallback says "sec
81513817311f  [medium] Surface "desk" has no reachable control
850a3806cfbc  [medium] Interactive control with no accessible label
919e8513877e  [medium] Place names are lower-cased after the first word
91b00300864a  [low] Lever `replace_co` refused: insufficient_command_authority (#/#)
9a16b34a3a19  [medium] Surface "records" has no reachable control
a0ccbbe32a3a  [low] Decision `owen_stoltenberg_plan_1993` shows no stakes on any option
a1259f689f15  [medium] Surface "chronicle" has no reachable control
a3d3e77f12f8  [medium] Decision `decorate_a_unit_rbih` has no authored historical default
ab660671b06e  [high] Territory bar counts allied HVO ground as "hostile-held"
ad599a9641f7  [medium] Retired term "sector" still in player-visible copy in ui\map\i18n\messages.en.ts
adf0fc5fc3d4  [low] Lever `replace_co` refused: insufficient_command_authority (#.#/#)
ae77d671480f  [high] Decision Room room-only blockers are unreachable from the screen that refuses the turn
b615fa723d8f  [medium] Interactive control with no accessible label
b9ce83d06de9  [medium] Decision `visit_to_front_rbih` has no authored historical default
d5daa3a10f94  [high] Priority-front labels pair a settlement with its own municipality under two names
e4b031f59b77  [medium] Surface "codex" has no reachable control
ea9d210f3201  [low] Lever `request_op` refused: insufficient_command_authority (#/#)
f832cc39d03a  [medium] Place names rendered with lower-case words after the first
fc75f83f7348  [medium] Interactive control with no accessible label
ff048ab927a1  [medium] Operation directive rejected with a reason the player is never shown
-->
