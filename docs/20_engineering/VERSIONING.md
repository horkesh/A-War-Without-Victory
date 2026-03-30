> **Roadmap:** Version scheme only. Full development roadmap is at [`docs/plans/MASTER_ROADMAP.md`](../plans/MASTER_ROADMAP.md).

# AWWV Versioning System

## Format

```
MAJOR.MINOR.PATCH[-tag]
```

- **MAJOR** — Game era (0 = development, 1 = release/gold)
- **MINOR** — Milestone within the era
- **PATCH** — Individual builds within a milestone
- **tag** — Optional pre-release qualifier (e.g., `-alpha`, `-beta`, `-rc1`)

## Version 1.0.0 = Gold

**1.0.0 is the shipping product.** A fully stable, feature-complete war strategy game. Everything before 1.0.0 is development. Everything after is live product.

---

## Post-1.0 Versioning

### Patches: 1.0.x
Bugfixes and hotfixes. No new features. No balance changes.

### Feature Updates: 1.x.0
New content, balance changes, quality-of-life improvements, system expansions.

Each 1.x.0 can have its own hotfix patches (1.1.1, 1.1.2, etc.)

### Named Updates (studio-style)
Major updates get codenames for communication. See `docs/plans/MASTER_ROADMAP.md` for the full post-1.0 content plan.

### Major Overhauls: 2.0.0
Reserved for fundamental engine/design changes that break save compatibility or represent a new generation of the game.

---

## Version Mapping to Git

- **Tags**: Every milestone bump gets a git tag: `v0.2.0`, `v0.3.0-alpha`, `v1.0.0`
- **package.json**: `version` field updated at each milestone
- **Patch increments**: Not every commit bumps the version — only meaningful milestones
- **Calibration runs** (n-numbers): Internal tracking continues independently. n-numbers are development session IDs, not version numbers. They don't appear in the version string.
- **Canon versions** (v0.6, v0.7): Document versions are independent of game version. Canon tracks documentation state, not software state.

---

## Version Bump Protocol

1. Decide which milestone the work completes
2. Update `package.json` version
3. Create git tag: `git tag -a v0.X.0 -m "Milestone: description"`
4. Update `docs/PROJECT_LEDGER.md` with version note
5. Push tag: `git push origin v0.X.0`

Patch bumps (0.X.1, 0.X.2) are for significant fixes within a milestone — not every commit.
