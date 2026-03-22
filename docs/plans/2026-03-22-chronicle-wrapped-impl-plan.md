# Chronicle Wrapped Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** "Spotify Wrapped for your war." A 10-slide cinematic reveal at game end showing the most dramatic moments of the player's war. Annotates the Chronicle with turning point markers.

**Architecture:** `generateWrappedSlides()` is a pure analysis function over existing chronicle/game data. `WrappedOverlay` renders 10 slides with click-through navigation. `SpiderChart` is a reusable 6-axis radar for dimension display. No engine changes.

**Tech Stack:** React + Tailwind + inline SVG for spider chart. No new dependencies.

**Design spec:** `docs/plans/2026-03-22-game-chronicle-design.md` §Wrapped

**Prerequisite:** Game Chronicle (Plan 1) must be implemented first.

---

### Task 1: generateWrappedSlides analysis function

**Files:**
- Create: `src/ui/map/components/chronicle/generateWrappedSlides.ts`
- Test: `tests/wrapped_slides.test.ts`

**Step 1: Define types**

```typescript
export interface WrappedSlide {
    id: string;
    title: string;
    subtitle: string;
    heroValue?: string;
    heroLabel?: string;
    detail?: string;
    data?: Record<string, unknown>;
}
```

**Step 2: Write failing tests**

```typescript
describe('generateWrappedSlides', () => {
    it('returns 10 slides', () => {
        const slides = generateWrappedSlides(mockState as any);
        expect(slides).toHaveLength(10);
    });

    it('slide 3 picks the turn with most casualties', () => {
        // Mock state with turn_summaries where turn 15 has 500 casualties
        const slides = generateWrappedSlides(mockState as any);
        const bloodiest = slides.find(s => s.id === 'bloodiest_week');
        expect(bloodiest?.data?.turn).toBe(15);
    });

    it('slide 4 picks the most decorated brigade', () => {
        const slides = generateWrappedSlides(mockState as any);
        const brigade = slides.find(s => s.id === 'best_brigade');
        expect(brigade?.data?.formationId).toBeDefined();
    });
});
```

**Step 3: Implement**

Pure function that reads LoadedGameState and produces 10 slides:
1. your_war — faction + total weeks + verdict
2. the_opening — foundational decision + early territory
3. bloodiest_week — `max(turnSummaries, by total casualties)`
4. best_brigade — `max(formations, by decorations.length + victories)`
5. what_you_built — peak territory %, peak personnel, ops launched
6. what_it_cost — total KIA/WIA all factions, displacement, civilian toll
7. world_watching — international_standing trajectory
8. your_decisions — top 3-5 event choices by dimension impact
9. at_the_table — Dayton capital, packages, final split
10. another_such_victory — final dimensions, pyrrhic score

**Step 4: Verify and commit**

```bash
git commit -m "feat(wrapped): generateWrappedSlides — 10-slide analysis from game data"
```

---

### Task 2: SpiderChart component

**Files:**
- Create: `src/ui/map/components/chronicle/SpiderChart.tsx`

**Step 1: Build 6-axis radar chart**

Inline SVG. Props: `values: Record<string, number>` (0-100), `labels: string[]`, `color: string`.

Renders a hexagonal radar with:
- 6 axes at 60° intervals
- Data polygon filled at each axis's value
- Labels at each axis tip
- Subtle grid lines at 25%, 50%, 75%

**Step 2: Verify**

Run: `npm run desktop:map:build`

**Step 3: Commit**

```bash
git commit -m "feat(wrapped): SpiderChart — 6-axis radar for dimension display"
```

---

### Task 3: WrappedSlide component (10 variants)

**Files:**
- Create: `src/ui/map/components/chronicle/WrappedSlide.tsx`

**Step 1: Build slide renderer**

Each slide is a full-viewport card with:
- Large title text
- Hero metric (big number or visual)
- Supporting detail
- Subtle background (faction-tinted gradient)
- Slide counter (3/10)

Variant rendering based on `slide.id`:
- `your_war`: faction crest + verdict text
- `bloodiest_week`: casualty count + battle names
- `best_brigade`: brigade name + arc badge + stats
- `what_it_cost`: somber numbers, red-tinted
- `another_such_victory`: SpiderChart + pyrrhic score

**Step 2: Verify and commit**

```bash
git commit -m "feat(wrapped): WrappedSlide — 10 slide type variants"
```

---

### Task 4: WrappedOverlay + wiring

**Files:**
- Create: `src/ui/map/components/chronicle/WrappedOverlay.tsx`
- Modify: `src/ui/map/store/gameStore.ts` — add `wrappedOpen`
- Modify: `src/ui/map/App.tsx` — render overlay, trigger from GameOverModal

**Step 1: Build the overlay**

Full-screen overlay with:
- Click/arrow key navigation between slides
- Slide counter
- "VIEW CHRONICLE" button on final slide
- ESC to close

**Step 2: Wire to GameOverModal**

Add "VIEW YOUR WAR" button in GameOverModal that sets `wrappedOpen: true`.

**Step 3: Turning point markers in Chronicle**

After Wrapped completes, annotate ChronicleOverlay with gold star markers at the turns identified by Wrapped analysis (bloodiest week, best brigade's key battle, most impactful decisions).

**Step 4: Verify**

Run: `npx tsc --noEmit`
Run: `npm run desktop:map:build`

**Step 5: Commit**

```bash
git commit -m "feat(wrapped): WrappedOverlay — game-end cinematic + turning point markers"
```

---

## Done Gate

- [ ] generateWrappedSlides() returns 10 slides from game data
- [ ] SpiderChart renders 6-axis radar
- [ ] 10 slide variants render correctly
- [ ] WrappedOverlay navigable (click/arrow/ESC)
- [ ] "VIEW YOUR WAR" button in GameOverModal
- [ ] Turning point markers appear in Chronicle after Wrapped viewed
- [ ] tsc clean, vitest passes, desktop:map:build passes
