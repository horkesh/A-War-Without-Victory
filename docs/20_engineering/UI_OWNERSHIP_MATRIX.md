# UI Ownership Matrix

This file defines which UI surface canonically owns which player-facing concept.

For shell hierarchy and handoff rules between Warroom, Tactical Map, Army HQ, and Codex, see [PRODUCT_SHELL_HIERARCHY.md](PRODUCT_SHELL_HIERARCHY.md).

## Purpose

One concept should have one canonical UI owner.

Other surfaces may summarize or link to it, but they do not become co-owners of the same truth.

## Surface classes

- `canonical owner` = the main place where the concept is reviewed or acted on
- `secondary summary` = may summarize, but not become an independent logic owner
- `debug-only` = developer/investigation use only

## Matrix

### Warroom

**Canonical owner of:**
- high-level campaign shell
- session flow
- return destination from standalone tactical-map use
- high-level strategic overview

**May summarize but not own:**
- detailed operations internals
- low-level formation debugging

### Tactical Map

**Canonical owner of:**
- physical battlespace view
- settlements, fronts, brigades, sectors
- selection-driven spatial context
- immediate local military situation

**May summarize but not own:**
- full operations review
- political decision history
- Codex as a knowledge system

### Army HQ

**Canonical owner of:**
- staff abstractions
- command review
- reserve/loan handling
- personnel and command-chain context
- explanation surfaces for command decisions

**May summarize but not own:**
- raw map-level truth
- Codex primary browsing

### Codex

**Canonical owner of:**
- historical/contextual reference
- unlocked essays and interpretive reference material

**May summarize but not own:**
- live operations command
- live tactical selection logic

## Ownership rules

1. If a concept appears in multiple places, one surface must be named canonical.
2. Secondary surfaces must link or summarize, not fork their own truth.
3. Debug-only views must never quietly become player surfaces.
4. If a new feature cannot name its canonical UI owner, it is not ready.

## Immediate known applications

- `operations`
  - canonical owner: Army HQ / command review flow
  - tactical map may visualize via field snapshots, but should not become a second operations truth

- `AAR / operation history`
  - canonical owner: Army HQ `RECORDS`
  - other shells may link into it, but should not reopen orphan history ownership elsewhere

- `return from standalone tactical map`
  - canonical owner: Warroom shell
  - tactical map must expose the path, but Warroom owns the destination

- `Codex access`
  - canonical owner: Codex panel/system
  - Army HQ and Warroom may link to it, but must not hide it behind obscure flows

- `threat assessment`
  - canonical owner: Army HQ as staff abstraction
  - must not silently show raw enemy internals

## Done means

This matrix is being followed when:

1. every major concept has one named canonical owner
2. no screen becomes a second hidden logic owner
3. standalone tactical map, Warroom, Army HQ, and Codex form one coherent shell
4. future roadmap work can point to a canonical surface instead of inventing one
