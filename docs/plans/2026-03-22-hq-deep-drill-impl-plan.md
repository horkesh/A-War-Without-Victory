# Army HQ Deep Drill-Down Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full depth available without leaving Army HQ. Brigade, operation, and sector sub-cards expand inline within corps cards. Retire legacy ArmyDetail panel.

**Architecture:** Extend existing corps card sections (OrbatSection, OperationsSection, SectorsSection) with expandable sub-cards showing detailed stats, engagement history, equipment, and narrative arcs. Pure UI — no engine changes.

**Tech Stack:** React + Tailwind. No new dependencies.

**Source:** Army HQ Nerve Center Roadmap, Phase 5.

---

### Task 1: Brigade Sub-Card Expansion

**Files:**
- Modify: `src/ui/map/components/army_hq/OrbatSection.tsx`

**Step 1: Read existing OrbatSection**

Understand current brigade display (name + personnel count).

**Step 2: Add expandable detail per brigade**

Click a brigade row → expands to show:
- Personnel / peak / nadir
- Cohesion + morale bars
- Equipment (tanks op/total, artillery op/total) with Math.round
- Narrative arc badge (veteran/bloodied/shattered/risen)
- Engagement history: last 5 battles (osid, outcome, casualties)
- Decorations earned
- Current location OSID

Use existing `FormationView` data — all fields already on LoadedGameState.

**Step 3: Verify**

Run: `npm run desktop:map:build`

**Step 4: Commit**

```bash
git commit -m "feat(hq): brigade sub-card expansion — stats, history, equipment, arc"
```

---

### Task 2: Operation Sub-Card Expansion

**Files:**
- Modify: `src/ui/map/components/army_hq/OperationsSection.tsx`

**Step 1: Enhance OperationExpandedDetail**

The expanded detail already shows preparation status, objectives, axes, and brigade list. Add:
- Per-brigade status within operation (personnel, cohesion, disrupted status)
- Weekly log timeline (if available from `op.weekly_log`)
- Casualty summary (op total inflicted/suffered)
- Commander assessment with personality flavor
- Operation grade (if completed — stars + verdict)

**Step 2: Verify**

Run: `npm run desktop:map:build`

**Step 3: Commit**

```bash
git commit -m "feat(hq): operation sub-card expansion — weekly log, per-brigade status, grade"
```

---

### Task 3: Sector Sub-Card Expansion

**Files:**
- Modify: `src/ui/map/components/army_hq/SectorsSection.tsx`

**Step 1: Enhance SectorExpandedDetail**

Already shows front brigades, reserves, recent battles, sector stats. Add:
- Intel confidence bar (from sector intel data)
- Threat assessment: enemy offensive_signs from sector intel
- Stance recommendation based on threat level
- Brigade positions (which OSID each brigade is at)
- Density visualization (brigades per km of frontage)

**Step 2: Verify**

Run: `npm run desktop:map:build`

**Step 3: Commit**

```bash
git commit -m "feat(hq): sector sub-card expansion — intel, threats, positions, density"
```

---

### Task 4: Operation Readiness Composite Indicator

**Files:**
- Modify: `src/ui/map/components/army_hq/OperationsSection.tsx`

**Step 1: Add composite readiness indicator on collapsed operation cards**

A green/amber/red dot next to the operation name showing at-a-glance readiness:
- Green: all readiness bars > 70%
- Amber: any bar 40-70%
- Red: any bar < 40%

Uses existing `op.readiness` data (intel, supply, cohesion).

**Step 2: Verify**

Run: `npm run desktop:map:build`

**Step 3: Commit**

```bash
git commit -m "feat(hq): operation readiness composite indicator (green/amber/red)"
```

---

---

**Note:** `ArmyDetail.tsx` is already retired (commented out in App.tsx). The OOB Sidebar (left-side Command panel) is a separate component and STAYS.

## Done Gate

- [ ] Brigade sub-cards show stats, history, equipment, narrative arc
- [ ] Operation sub-cards show weekly log, per-brigade status, grade
- [ ] Sector sub-cards show intel confidence, threats, positions
- [ ] Operation readiness dot visible on collapsed operation cards
- [ ] tsc clean, desktop:map:build passes
