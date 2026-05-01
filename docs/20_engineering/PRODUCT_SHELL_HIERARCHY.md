# Product Shell Hierarchy

This document defines how the player-facing product shells compose into one coherent experience.

It exists to answer four recurring questions:

- what the primary shell is
- what each shell is allowed to own
- how the shells hand off to one another
- which shell is allowed to summarize versus command

This is not a UI style guide. It is a product-ownership contract.

## Presidential Model

The player is the faction president (wartime political leader). Shell ownership follows from this identity:

- **Warroom** = the president's desk. Strategic guidance, event decisions, campaign overview. The player LIVES here.
- **Army HQ** = the military command center the president visits. Corps briefings, operations review, personnel decisions. The player REVIEWS here.
- **Tactical Map** = the field situation room the president observes. Spatial awareness, front lines, settlement detail. The player OBSERVES here, and occasionally INTERVENES directly.
- **Chronicle** = the presidential archive. The player reviews what has happened.
- **Codex** = the reference library. The player consults background knowledge.

For the full command-level doctrine (strategic guidance, active command, direct intervention), see [PRESIDENTIAL_COMMAND_DOCTRINE.md](PRESIDENTIAL_COMMAND_DOCTRINE.md).

## Core rule

The product is not four separate apps.

It is one command experience with specialized shells:

1. `Warroom` = campaign shell
2. `Tactical Map` = battlespace shell
3. `Army HQ` = command-review shell
4. `Chronicle` = campaign-memory shell
5. `Codex` = knowledge shell

If any shell starts behaving like a second owner of another shell's job, the product drifts.

## Presidential campaign loop

The v0.9 product spine is the campaign loop, not any individual shell.

| Step | Player question | Canonical owner | Secondary surfaces |
|---|---|---|---|
| Brief | What is the situation? | Warroom + Army HQ briefing | Tactical command briefing banner |
| Inspect | Where is it happening? | Tactical Map | Army HQ links and map highlights |
| Decide | What can I do? | Presidential Inbox + Army HQ attention | Toolbar badges and Warroom hotspots |
| Execute | What happens when I end the turn? | Desktop `advance-turn` + canonical turn pipeline | Warroom calendar and tactical toolbar |
| Report | What happened this turn? | Turn aftermath surface | Chronicle and Army HQ records |
| Cost | What did it cost? | Turn aftermath + War Summary; final Cost Ledger at game over | Army HQ records and VerdictScreen |
| Judge | How does history read this? | VerdictScreen at game over; Chronicle/Codex during play | Warroom and Army HQ links |
| Next | What needs attention now? | Presidential Inbox + Army HQ attention | Command briefing banner |

The missing v0.9 handoff, as of the 2026-05-01 C0 audit, is the **Turn Aftermath** owner. The engine already writes `TurnSummary` and the desktop already pushes `turn-report-updated`; the product still needs one player-facing packet that bridges a completed turn into costs, records, and next reviews.

## Shell hierarchy

### 1. Warroom

Warroom is the primary shell.

It owns:
- entry into active play
- campaign context
- phase overview
- return destination from standalone tactical-map use
- high-level strategic summaries

It may summarize:
- command posture
- recent major events
- current campaign state

It must not become:
- a second Army HQ
- a second tactical map
- a full records browser

### 2. Tactical Map

Tactical Map is the battlespace shell.

It owns:
- settlements
- fronts
- sectors
- brigade placement
- spatial selection context
- immediate field-facing order staging

It may summarize:
- operation state as a field snapshot
- command implications of a selected place or formation

It must not become:
- a second Warroom
- a second Army HQ command-review surface
- a debug console for hidden enemy truth

### 3. Army HQ

Army HQ is the command-review shell.

It owns:
- command review
- staff abstractions
- reserve / loan handling
- corps-level operational summaries
- records / AAR ownership
- explanation surfaces for command decisions

It may summarize:
- tactical-map state
- campaign status relevant to command review

It must not become:
- the primary campaign shell
- a hidden omniscient debug dashboard

### 4. Chronicle

Chronicle is the campaign-memory shell.

It owns:
- timeline memory
- campaign narrative review
- retrospective dossier-style reading of what has happened so far

It may summarize:
- recent major turns
- campaign arcs
- how the war has unfolded for the player faction

It must not become:
- the operational AAR owner
- the static essay/reference owner
- a second Warroom summary shell

### 5. Codex

Codex is the knowledge shell.

It owns:
- unlocked essays
- historical/contextual reference
- reference material and doctrine-style reading

It may summarize:
- related campaign or faction context

It must not become:
- the main records owner
- a hidden feature reachable only through obscure flows

## Handoff rules

### Warroom -> Tactical Map

Warroom may launch the tactical map.

That launch means:
- the player is moving from campaign shell to battlespace shell
- not leaving the product hierarchy

### Tactical Map -> Warroom

Standalone tactical map must always expose a visible path back to Warroom.

That path is not optional convenience. It is part of the product shell contract.

### Tactical Map -> Army HQ

If the player needs:
- operation review
- command explanation
- reserve handling
- records / AAR

the tactical shell should hand off to Army HQ instead of re-owning the whole flow.

### Warroom -> Chronicle

If Warroom props or desk flavor elements open campaign memory, they should hand off to Chronicle once the tactical shell exists.

Warroom may keep local atmosphere wrappers only when the tactical shell is unavailable.

### Warroom / Army HQ / Tactical Map -> Codex

Any shell may link into Codex.

No shell may hide Codex behind an accidental or debug-only path.

## Ownership boundaries by concept

- `campaign shell`
  - owner: Warroom
- `battlespace truth`
  - owner: Tactical Map
- `command review`
  - owner: Army HQ
- `records / AAR`
  - owner: Army HQ
- `campaign memory / timeline`
  - owner: Chronicle
- `reference / essays`
  - owner: Codex
- `return destination from standalone map`
  - owner: Warroom
- `turn aftermath`
  - owner: dedicated aftermath surface, with links into Army HQ Records, War Summary, Chronicle, and Inbox
- `active-campaign cost so far`
  - owner: aftermath / War Summary; final historical reckoning stays with VerdictScreen

## Player-truth rule inside the shell hierarchy

All shells must obey [PLAYER_VISIBLE_STATE.md](PLAYER_VISIBLE_STATE.md).

That means:
- Warroom does not get to cheat because it is strategic
- Tactical Map does not get to cheat because it is spatial
- Army HQ does not get to cheat because it is a staff abstraction
- Chronicle does not get to cheat because it is retrospective
- Codex does not get to leak debug identifiers because it feels archival

## Debug rule

None of these shells are debug shells by default.

If a debug surface is required, it must be explicit, gated, and documented under [DEBUG_SURFACE_POLICY.md](DEBUG_SURFACE_POLICY.md).

## Immediate consequences for current repo work

- Warroom stays the primary desktop shell.
- Tactical Map remains a supported battlespace shell, but it must keep a visible return path to Warroom.
- Army HQ remains the canonical owner of command review and records.
- Chronicle is the canonical owner of campaign-memory review.
- Tactical operations panels may summarize field conditions, but must not silently re-own Army HQ command authority.
- Warroom desk props may launch Chronicle, but they do not become parallel archive owners.
- Codex must keep a visible top-level affordance and must not depend on hidden keyboard or archival paths.

## Done means

This hierarchy is being followed when:

1. every major player-facing concept names one canonical shell owner
2. standalone tactical map always has a visible route back to Warroom
3. Army HQ owns records and command review without shell duplication elsewhere
4. Chronicle owns campaign-memory review without becoming a second records shell
5. Codex has a visible, intentional entrypoint
6. future UI work stops inventing overlapping shell ownership
