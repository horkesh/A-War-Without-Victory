# Command sidebar layout — recorded knowledge (2026-03-27)

**Status:** Documentation only — no code changes in this commit. **Open UX debt:** vertical gap under Presidential toolbar; corps list vertical rhythm.

**Audience:** UI implementers, Pyrrhic GUI audits, future sessions.

---

## 1. What players reported

- The **Command** column (left OOB / order-of-battle sidebar) **starts far below** the **Presidential toolbar** (thin top bar with CHRONICLE, date, ADVANCE TURN).
- **Large apparent blank space** between **corps** rows in the Command sidebar.

---

## 2. Root cause: shared toolbar clearance vs. asymmetric crest

### 2.1 Single CSS variable drives all fixed chrome

`App.tsx` sets:

```tsx
style={{ ['--awwv-toolbar-clearance' as string]: devMode ? '8.5rem' : '7.5rem' }}
```

**Consumers include:**

- `OOBSidebar.tsx` — `top: var(--awwv-toolbar-clearance, 7.5rem)`
- `panelRail.ts` — `DETAIL_PANEL_STYLE`, `LEFT_DETAIL_PANEL_STYLE`, etc.
- `CommandBriefingLayer.tsx` — `top-[7.5rem]` / `top-[8.5rem]` (mirrors clearance)

**7.5rem = 120px** at default 16px root font size.

### 2.2 Presidential bar height is only 3rem (48px)

`PresidentialToolbar.tsx`: main row is `h-12` (`fixed top-0 … h-12`).

### 2.3 Why 120px clearance exists

The **centered floating army crest** is `fixed top-0 left-1/2 -translate-x-1/2`, with a **100×100px** image plus an **8px** army name line above it. That stack extends **well below** the 48px bar.

The clearance was chosen so **panels and the Command Briefing strip** do not draw **under** the crest (and, in dev, under the **dev strip** at `top-12`).

### 2.4 Why the *left* rail looks wasteful

The crest is **centered**. The **left** column does not contain the crest, but it still uses the **same** `top` as the right rail. Visually: a **wide empty band** appears between the **bottom of the thin bar** and the **“Command”** header — that band is **reserved for the center crest**, not for content on the left.

**Summary:** Not a random bug; **one global offset** applied to **all** edges for **one** centered decorative element.

**Files:** `src/ui/map/App.tsx`, `src/ui/map/components/OOBSidebar.tsx`, `src/ui/map/components/panelRail.ts`, `src/ui/map/components/CommandBriefingLayer.tsx`, `src/ui/map/components/PresidentialToolbar.tsx`.

---

## 3. Corps spacing in Command sidebar

### 3.1 List rhythm

In `OOBSidebar.tsx`, the Army section uses:

- `className="p-3 space-y-3"` on the expanded Army container — **12px** vertical gap between sibling blocks (`space-y-3`).
- Faction blocks add **additional** structure: `space-y-2`, horizontal faction dividers with `py-2`, borders, etc.

### 3.2 Corps cards

Each corps is a **`CorpsCard`** wrapped in **`FlipCard`** (`src/ui/map/components/army_hq/FlipCard.tsx`):

- Front: header, cohesion bar, optional commander/equipment/stance rows — **inherently tall**.
- Back: stacked summary sections (fixed content height in typical cases).

**Note:** The flip container uses a **CSS grid** with both faces in **`gridArea: '1/1'`**; the back face has **`maxHeight: '70vh'`** and **`overflow-y-auto`**. If back-face intrinsic height ever competes with the front in layout, track sizing could theoretically inflate the card (worth watching if back content grows).

### 3.3 Summary

**“Blank space between corps”** is mostly **explicit Tailwind spacing** (`space-y-3`) **plus** **tall per-corps cards**, not a single mystery margin.

---

## 4. Why prior “blank space” / agent passes did not flag this

- **Scoped audits:** The **2026-03-26** blank-space remediation wave targeted **numbered BS items** centered on **modals** (War Summary, Army HQ zones, Ops, Pause, Reserve, Chronicle, etc.). The **left Command rail** was **not** a BS-### target.
- **Toolbar work:** The **dynamic toolbar clearance** fix addressed **overlap** between **side panels and the top bar / dev strip**, which **increases** reliance on a **large** `--awwv-toolbar-clearance` — it did **not** optimize **left-column** vertical efficiency under a **center** crest.
- **Checklists:** “No dev leak” / “modal density” checks do not imply **OOB rail** layout review.

**Process lesson:** For map chrome, add an explicit checklist item: **left rail top offset vs. Presidential bar vs. crest footprint** when changing `--awwv-toolbar-clearance` or `PresidentialToolbar`.

---

## 5. Recommended directions (when implementing)

Not prescriptive; pick per design review.

| Direction | Idea |
|-----------|------|
| **A. Split CSS variables** | e.g. `--awwv-left-rail-top` ≈ **clear 48px bar + small margin** (~`3.25rem`–`4rem`), keep `--awwv-toolbar-clearance` for **right** panels and briefing strip **or** recompute per surface. May require **z-index** so the **crest overlaps** the top of the left rail (crest `z-[200]` vs sidebar `z-10`). |
| **B. Smaller crest or lower crest anchor** | Reduces global clearance for everyone. |
| **C. Tighten Army list** | `space-y-3` → `space-y-2`; reduce faction divider padding; optional compact `CorpsCard` mode. |
| **D. FlipCard** | Ensure non-visible face does not inflate grid row height (e.g. absolute positioning for the hidden face — verify visually and for a11y). |

**Risk:** Any change to `top` must **re-verify** overlap with **PresidentialToolbar**, **dev strip**, **load-error bar**, and **CommandBriefingLayer**.

---

## 6. Propagation

This file is linked from **`docs/40_reports/GUI_MASTER.md`**, **`docs/20_engineering/TACTICAL_MAP_SYSTEM.md`** (§13.4), **`docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md`** (§0 note), **`docs/PROJECT_LEDGER.md`**, **`docs/PROJECT_LEDGER_KNOWLEDGE.md`**, and **`docs/10_canon/context.md`** (GUI pointers). **Napkin** (`.claude/napkin.md`) carries a short durable note under GUI / Map.

---

## 7. Related reports

- `docs/40_reports/implemented/20260326_UI_RECHECK_AFTER_DYNAMIC_TOOLBAR_CLEARANCE.md` — clearance context
- `docs/40_reports/implemented/20260327_PROD_BUNDLE_LIVE_MAP_VERIFICATION.md` — production bundle live mode
