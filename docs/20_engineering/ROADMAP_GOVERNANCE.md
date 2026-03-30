# Roadmap Governance

This file exists to stop roadmap drift, milestone inflation, and AI-theater sequencing mistakes.

## Purpose

The roadmap is not a wish list.
It is a sequencing contract.

The main rule is:

**do not place higher-order intelligence or expressive AI work on top of unresolved command ownership**

## Mandatory milestone logic

Use these roadmap bands exactly:

- `v0.8.0.x` = current commander stabilization
- `v0.8.x-final` = command authority cleanup
- `v0.8.1` = commander maturity
- `v0.8.2+` = political / interpretive / higher-level AI layers
- `v0.8-to-v0.9` = repo simplification
- `v0.9.x` = UX refinement after backend truth is real

## Slotting rules

### Put work in `v0.8.0.x` if it:

- makes today's commander trustworthy
- fixes live commander behavior
- improves verification or traceability of current commander output
- clarifies whether operations are actually working right now

### Put work in `v0.8.x-final` if it:

- makes ownership singular
- removes or demotes old command paths
- reduces overlapping decision writers
- adds canonical / transitional ownership annotations

### Put work in `v0.8.1` if it:

- improves commander reasoning quality
- adds memory, belief state, competing options, or decision traces
- replaces threshold jungles with scored tradeoffs

### Put work in `v0.8.2+` only if it:

- adds political behavior
- adds interpretation layers
- adds expressive or higher-level AI on top of already-clean military command truth

### Put work in `v0.8-to-v0.9` if it:

- simplifies repo-wide architecture
- cleans entrypoints
- decomposes giant files
- removes ballast and stringly-typed drift
- aligns docs with runtime truth

### Put work in `v0.9.x` if it:

- improves player-facing presentation after authority is already settled
- refines SITREP, warroom, map presentation, or explanation UX

## Anti-mis-slotting rules

Do not place a task into a later "AI" milestone if it is really fixing:

- overlapping ownership
- duplicate lifecycles
- UI/engine truth mismatch
- dead compatibility ballast
- unclear canonical authority

Those are cleanup tasks, not AI-expansion tasks.

## Mandatory roadmap patch protocol

Before changing `MASTER_ROADMAP.md`, the editor must list:

1. exact milestone changes
2. exact renumbering
3. exact items being moved
4. why each move is required
5. what sequencing risk is avoided

Then and only then should the roadmap be edited.

## Required prose in roadmap updates

Roadmap updates should explicitly preserve these truths:

- operations are the first command object that must become singular and authoritative
- commander maturity happens before political-bot and LLM expansion
- cleanup work is feature-enabling, not optional polish
- UI refinement follows backend authority, not the other way around

## Review question

For every roadmap edit, ask:

**Are we making the system more honest, or just making it sound more advanced?**
