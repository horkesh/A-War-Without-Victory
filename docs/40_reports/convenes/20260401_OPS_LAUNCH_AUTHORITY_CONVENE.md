# Operations Launch Authority Convene

**Date:** 2026-04-01  
**Convened by:** Orchestrator  
**Question:** Should AWWV return to operations launched from sectors rather than corps, or is there a better third model?  
**Result:** Do **not** return to sector-launched operations. Keep corps as the real launch authority, but evolve from the current thin corps-launched model to a **third model: sector-nominated, corps-authorized operations / operation dossier model**.

---

## Panel

- Game-design / plausibility panel
- Technical architecture panel
- UI truth / player-review panel
- Commander-behavior / intelligence panel

All four converged on the same core answer:

- pure `sector-launched` is the wrong direction
- the current `corps-launched` direction is broadly right
- the best model is a third way where sectors propose and contextualize, corps authorize, and one canonical operation object is what the player reviews

---

## The Three Models

### 1. Current model: corps-launched

This is the repo’s intended direction today.

Relevant truth in code/docs:
- operations live on `CorpsCommandState`, not on sectors
- the commander loop emits `CorpsOperation`-compatible output
- `sector_offensive.ts` already acts as the lifecycle engine
- the roadmap explicitly says operations must become one singular command object

Representative anchors:
- [game_state.ts](/F:/A-War-Without-Victory/src/state/game_state.ts#L446)
- [emit.ts](/F:/A-War-Without-Victory/src/sim/combat/commander/emit.ts#L83)
- [sector_offensive.ts](/F:/A-War-Without-Victory/src/sim/combat/sector_offensive.ts#L1)
- [MASTER_ROADMAP.md](/F:/A-War-Without-Victory/docs/plans/MASTER_ROADMAP.md#L77)
- [MASTER_ROADMAP.md](/F:/A-War-Without-Victory/docs/plans/MASTER_ROADMAP.md#L162)

#### Strengths

- Best match to the command-chain thesis of the game.
- Best fit for later command friction, army review, and commander personality.
- Better historical echelon fit than sector sovereignty.
- Already closer to roadmap “operations singularity” than any sector-first model.

#### Weaknesses

- Still too abstract and detached from frontage reality.
- Can feel like “HQ fantasy ops” if not grounded in real local opportunities.
- Currently not actually singular in implementation: multiple writers still create operations.
- Encourages corps-wide surplus abstraction that can strip sectors too aggressively.

#### Verdict

Directionally correct, but not mature enough as-is.

---

### 2. Return model: sector-launched

This would mean operations are born primarily from a sector and treated as sector authority.

#### Strengths

- Very legible locally.
- Easy to explain on the map.
- Better immediate answer to “why here, why now?” because the launch is visibly tied to a front segment.

#### Weaknesses

- Wrong command echelon: sectors are frontage containers, not commanders.
- Creates local cleverness but higher-level stupidity.
- Pushes the game toward automatic threshold behavior instead of real corps judgment.
- Reintroduces split ownership just as the roadmap is trying to eliminate it.
- Lies to the UI: sectors may appear to own ops that actually require corps-wide resource arbitration.
- Weak fit for future order interpretation, override, and command review.

#### Verdict

Do not return to this. It is attractive spatially but wrong architecturally and strategically.

---

### 3. Third model: sector-nominated, corps-authorized operations

This is the panel’s recommended model.

It has two closely related expressions:

- backend phrasing: `sector-nominated, corps-authorized`
- UI phrasing: `operation dossier / command packet`

They are the same idea.

#### Definition

- Sectors do **not** launch operations.
- Sectors generate **opportunity packets**:
  - local objectives
  - readiness
  - reserve cost
  - corridor / frontage risk
  - likely defender reaction
  - whether launch would violate defense floor
- Corps command compares packets across sectors and chooses what to do:
  - launch
  - defer
  - merge
  - downgrade to probe
  - reject
- One canonical operation object is then created.
- `sector_offensive.ts` remains the sole lifecycle engine.
- UI shows an **operation dossier**:
  - proposed by corps
  - anchored to one or more sectors
  - reviewed in Army HQ / Warroom / ops modal

#### Strengths

- Preserves the right command echelon.
- Grounds operations in actual frontage opportunity.
- Supports genuinely intelligent commander behavior:
  - competing intents
  - memory
  - scarcity
  - reserve budgeting
  - rejection for intelligible reasons
- Gives the clearest truthful UI.
- Strongest fit for roadmap operations singularity.
- Strongest fit for later army/corps coherence and command-review UX.

#### Weaknesses

- Requires disciplined implementation.
- Needs a true canonical creation gateway.
- Slightly less instantly obvious than pure sector launch unless the dossier always shows primary sector / affected sectors clearly.

#### Verdict

Best model by a clear margin.

---

## Why The Panel Rejected Sector Sovereignty

The decisive argument was this:

A sector can know that something looks attackable.  
A sector cannot honestly decide:

- whether this is the one offensive the corps should commit to this month
- which other sector can be safely thinned
- whether an elite reserve should be preserved for another axis
- whether prior failure in this area should bias the corps away from another attempt
- whether political / army-level command friction should block or reshape the effort

Those are corps-level tradeoffs.

So sector launch authority would produce:

- more local plausibility
- less real intelligence
- more hidden rails
- worse ownership

That is the opposite of what `v0.8.1` and `v0.8.x-final` are trying to achieve.

---

## Best Final Recommendation

### Keep

- corps as the only true launch authority
- `sector_offensive.ts` as the lifecycle owner
- sectors as the spatial reality source

### Change

- stop thinking in terms of “corps launches from nowhere”
- require every offensive op to be anchored to a **sector opportunity packet**
- make the player review one **operation dossier / command packet**, not a bare corps impulse

### Concrete rule set

1. Only one gateway may create or mutate canonical `CorpsOperation` records.
2. Every current injector becomes an `OperationRequest` producer, not a direct writer.
3. Sectors produce opportunity packets; they do not directly create operations.
4. Corps chooses among packets and authorizes the operation.
5. The operation object stores:
   - proposing corps
   - primary sector
   - affected sectors
   - staging logic
   - participating brigades
   - rationale / trace
6. UI surfaces are scoped views of the same object:
   - Army HQ / Warroom = review / authorization / explanation
   - Ops modal = editing / briefing surface
   - sector panel / map = local context and readiness

---

## Architectural Implication

The technical panel made one especially important point:

The repo does **not** currently have true corps-owned launch authority.
It has multiple live writers to `active_operations`.

Known peer writers include:
- commander output application
- legacy directive launch
- pre-planned injection
- triggered operations
- corridor breach special case
- legacy named-op path

So the choice is not really:

- current corps-launch vs sector-launch

It is:

- keep moving toward singular corps-owned canonical ops
- or regress into even more split authority

Returning to sector launch would be regression.

---

## UI / UX Implication

The UI panel’s strongest point:

`sector-launched` is easiest to read locally, but most misleading globally.

The best truthful player model is:

- **Operation object** = thing being reviewed
- **Corps** = executor / proposer
- **Army HQ / Warroom** = authorization and explanation surface
- **Sector** = local context, not owner

That means the future UI should not ask the player to think:

- “this sector launched an operation”

It should ask the player to think:

- “this corps is proposing an operation here, anchored in this sector situation, for these reasons, at these risks”

---

## Commander Intelligence Implication

The commander-behavior panel was especially clear:

If you want commanders to feel intelligent, operation launch must happen where:

- belief state lives
- memory lives
- scarcity lives
- competing intents are arbitrated

That is corps level, not sector level.

The right role for sectors is:

- observer
- proposer
- constraint source
- geometry source

Not sovereign attacker.

---

## Final Orchestrator Synthesis

### Decision

Do **not** return to operations launched from sectors.

### Preferred model

Adopt the third model:

**sector-nominated, corps-authorized operations**  
presented to the player as an **operation dossier / command packet**

### Why

It gives the best combination of:

- historical plausibility
- singular ownership
- commander intelligence
- truthful UI
- roadmap fit

### Short form

- current model: right echelon, too thin
- sector model: better local feel, wrong authority
- third model: best overall

---

## Recommended Next Step

If this becomes roadmap work, the first implementation target should not be “rewrite ops around sectors.”

It should be:

**Define the canonical `OperationRequest` / opportunity-packet gateway**

That gateway should:

- unify all current operation writers
- accept sector-derived packets
- let corps choose among them
- materialize one canonical `CorpsOperation`

That is the cleanest bridge from today’s messy mixed system to the recommended model.
