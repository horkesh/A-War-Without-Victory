# Feature Done Means

This file defines the minimum completion block required for meaningful changes.

## Purpose

Do not accept "we cleaned it up" or "it works now" as completion language.

Every meaningful change must answer the same structured questions.

## Required completion block

Every serious feature, refactor, roadmap patch, or architecture fix must end with:

```md
Canonical owner:
Demoted path:
Player-visible truth:
Canonical UI surface:
Done means:
```

## What each line means

### `Canonical owner`

What system, file family, or surface truly owns this after the change?

### `Demoted path`

What old path is removed, reduced, declared transitional, or explicitly not authoritative anymore?

### `Player-visible truth`

What is the player actually allowed to see after this change?

### `Canonical UI surface`

Where does the player primarily review or act on this concept?

### `Done means`

What test, visible behavior, report, or acceptance gate proves this is real?

## Review rule

If a task cannot fill in all five lines clearly, it is not ready to be called done.

## Relationship to existing governance

This file does not replace:

- `docs/20_engineering/COMMAND_AUTHORITY_GATES.md`
- `docs/20_engineering/ROADMAP_GOVERNANCE.md`

It makes the completion language shorter, clearer, and more owner-friendly.
