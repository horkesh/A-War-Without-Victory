# Operations Launch Authority Addendum - Sector-Scoped Corps Launch

**Date:** 2026-04-01  
**Purpose:** Clarify the earlier convene after a more precise formulation of the proposed model.

## Clarified Question

The earlier convene answered the wrong version of the sector model.

The real proposal is **not**:

- sectors launch operations independently

The real proposal is:

- the **corps commander** still authorizes and launches the operation
- but to do so, he must choose a **sector**
- the initial brigade pool for that operation is limited to brigades **assigned to that sector**
- from that sector-scoped pool, he selects participants, objectives, and operation commander

This is a much stronger and more serious proposal than true sector-launched ops.

---

## Revised Comparison

### 1. Current broad corps-launched model

Definition:
- corps command chooses an operation from a corps-wide view
- brigades can effectively be drawn from the broader corps resource picture
- sectors matter, but are not a hard launch container

#### Strengths

- Highest operational flexibility
- Best fit for corps-wide concentration of effort
- Best fit for ad hoc brigade grouping and multi-axis planning
- Easiest way to represent corps-level reserve decisions

#### Weaknesses

- Too easy for corps logic to strip the line globally
- Too detached from frontage truth
- Can produce “floating HQ ops” that do not feel anchored to a real local formation of effort
- Makes it easier to hide garrison cannibalization behind abstract surplus logic

#### Verdict

Powerful, but too loose.

---

### 2. Clarified proposal: sector-scoped corps launch

Definition:
- corps remains the sole launch authority
- every operation starts from a selected sector
- the default brigade pool comes from brigades assigned to that sector

#### Strengths

- Much better local grounding than the current broad corps model
- Makes the player’s mental model cleaner:
  - “this corps is launching from this sector”
- Strong natural protection against corps-wide garrison stripping
- Gives sectors real importance without turning them into fake mini-commanders
- Much more legible for UI, ops review, and commander explanations
- Better fit for the Bosnian War’s local pressure points and front-fragmented offensives

#### Weaknesses

- If implemented as a **hard sector-only rule**, it becomes too rigid
- Real Bosnian operations often pulled from neighboring frontage, ad hoc groupings, and reserve concentrations
- Hard sector-only launch risks making sector boundaries more important than the war really was
- Could accidentally punish intelligent concentration:
  - a corps sees a real opportunity
  - but cannot mass enough force because the “wrong” brigades happen to sit just outside the chosen sector
- Can reintroduce fake behavior where brigades are shuffled between sectors first just to satisfy the launch rule

#### Verdict

Very promising as a **default anchor**, but too rigid if absolute.

---

### 3. Best model after clarification: sector-anchored corps launch with bounded reinforcement

This is now the best answer.

Definition:

- corps command is the only launch authority
- every operation must declare a **primary sector**
- by default, the operation draws from brigades assigned to that sector
- it may also draw a **limited reinforcement envelope** from:
  - adjacent sectors
  - corps reserve / spare pool
  - explicitly loaned brigades
- any non-primary-sector brigades must be visible as reinforcements, not silently absorbed into the same pool

In plain English:

- operations are **sector-anchored**
- not **sector-imprisoned**

---

## Why This Is Better Than Both Alternatives

### Better than the current broad corps model

Because it forces every operation to answer:

- where is this operation actually starting?
- what frontage is taking the risk?
- what local brigades are carrying the main burden?

That makes operations feel real instead of abstract.

### Better than hard sector-scoped launch

Because it preserves real corps-level concentration.

The corps commander can still say:

- “this is a Central Bosnia operation, but I am reinforcing it with one brigade from the neighboring quiet sector”

That is much more historically and operationally believable than:

- “this sector may use only its own roster forever”

---

## Recommended Rule Set

### Canonical launch rules

1. Corps command remains the only authority that launches operations.
2. Every operation must name a **primary sector**.
3. The default participant pool is brigades assigned to that sector.
4. Additional brigades may only join through explicit reinforcement rules:
   - adjacent-sector support
   - corps reserve support
   - temporary loan / attachment
5. Those non-primary-sector brigades must be tagged in the operation object as reinforcements or attachments.

### Recommended operational semantics

- **Main effort** should usually come from the primary sector.
- **Supporting effort** may come from adjacent sectors if the corps judges the risk acceptable.
- **Deep cross-corps pooling** should remain exceptional and visible.
- **Operation review UI** should always show:
  - primary sector
  - affected sectors
  - brigades from primary sector
  - reinforcing brigades from outside it

---

## Best UI / UX Framing

The player should not experience the system as:

- “launch from sector”

or

- “launch from corps”

The player should experience it as:

- “Corps X is proposing Operation Y in Sector Z”

With an operation dossier that shows:

- primary sector
- participating brigades
- reinforcing brigades
- objectives
- staging logic
- why this sector was chosen
- what risk is being accepted elsewhere

That gives you:

- local clarity
- honest hierarchy
- visible tradeoffs

---

## Final Recommendation

### Do not use

- pure sector-launched operations
- pure broad corps-wide free-pool operations
- hard sector-only launch with zero reinforcement flexibility

### Use

**sector-anchored corps-authorized operations with bounded reinforcement**

That means:

- corps command launches
- sector gives the op its local identity
- sector brigades form the default pool
- neighboring or reserve brigades can reinforce, but only explicitly

---

## Short Verdict

Your clarified model is better than the earlier one and much closer to the right answer.

But the best version is not:

- `sector-only`

It is:

- `sector-anchored, corps-authorized, reinforcement-bounded`

That is the cleanest blend of:

- believable command
- local realism
- protection against line stripping
- intelligible UI
- future commander intelligence

---

## Best Next Architectural Step

If this becomes implementation work, the operation object should gain these fields:

- `primary_sector_id`
- `supporting_sector_ids`
- `primary_sector_brigades`
- `attached_brigades`
- `reinforcement_source`

And launch logic should be reworked around:

- choose primary sector
- derive default eligible brigade pool from that sector
- allow explicit bounded reinforcement from outside it
- record the tradeoff in the operation trace

That would turn this from a theory into a clean canonical model.
