# Issue Report: HoIMapRenderer Never Initializes (2026-02-26)

**Status: RESOLVED — Fix implemented in implemented/20260226_MAP_INITIALIZATION_HANG_FIX.md**

## Summary
The HoI map view (`map_hoi.html`) fails to initialize: the 3D WebGL canvas never appears, the placeholder stays perpetually visible, and no console errors are emitted. The tooltips, hover, click, sidebar, topbar, and status strip all work at the DOM level but the map canvas is absent.

## Root Cause

**The formation overlay refactor (commit `203779b`) accidentally placed the `requestAnimationFrame(() => tryWebGL())` call _inside_ the `tryWebGL` function body, not after it.** As a result, `tryWebGL` is defined but never invoked.

### How this happened

In `map_hoi.ts`, the `init()` function defines a large `tryWebGL` async arrow function (≈200 lines) and then calls it via a double-deferred `requestAnimationFrame`. During the formation overlay refactor, the code that follows the `tryWebGL` definition — the rAF scheduling, the file picker, the topbar/sidebar/statusStrip construction, and the state loading — was **indented one level too deep**, placing it inside the `tryWebGL` closure body.

The brace structure is:

```
function init() {                               // line ~91
  ...
  const tryWebGL = async () => {                 // line ~128
    ...
    if (ok) {                                    // line ~163
      ...
      if (pendingData.formations?.length) {      // line ~200
        ...                                      // tooltip, hover, click, formation click
      }                                          // line ~322
    };                                           // line ~324  ← closes if(ok) — NOT tryWebGL
    // ↓↓↓ EVERYTHING BELOW IS STILL INSIDE tryWebGL ↓↓↓
    requestAnimationFrame(()=>tryWebGL());        // line ~327  ← self-referential, never called initially
    const topBar = new TopCommandBarComponent(...)
    ...
    renderFromState();
  }                                              // line ~425  ← ACTUALLY closes tryWebGL
}                                                // line ~426  ← closes init()
```

Because the rAF that calls `tryWebGL()` lives inside `tryWebGL` itself, it is never reached. `init()` defines `tryWebGL` and returns immediately. Nothing ever calls `tryWebGL()`.

### Secondary issues also introduced by the same refactor

1. **Tooltip/hover/click gated on pending formations data:** `renderer.setHoverCallback()`, `renderer.setClickCallback()`, `showTooltip()`, and the formation click handler are all inside `if (pendingData.formations?.length)` at line ~200. If the renderer initializes before save data loads (the normal case with no IPC bridge), these callbacks will never be registered and the map will have no hover/click/tooltip behavior.

2. **Missing `try/catch` in `init()`:** The user's most recent edit removed the outer `try/catch` around the heightmap fetch and scene construction block, meaning any error during init will propagate as an unhandled rejection rather than being caught and displaying the placeholder error message.

3. **Vite production build error:** `node:fs/promises` and `node:path` imports in `src/data/operational_data.ts` and `src/map/terrain_scalars.ts` are pulled into the browser bundle via transitive imports, causing `npx vite build` to fail. This doesn't affect `vite dev` but blocks production builds.

## Fix Required

1. **Move rAF + file picker + sidebar + topbar + state loaders out of `tryWebGL` body** — decrease their indentation by one level so they sit in `init()` after the `tryWebGL` definition ends.
2. **Move tooltip / hover / click setup out of `if (pendingData.formations?.length)`** — these should be unconditionally registered whenever `renderer.init()` succeeds.
3. **Restore `try/catch` around init body** if the user wants error messages to display in the placeholder div.

## Verification
- Instrumented with `console.log` at `init()` entry, post-guard, pre-overlay, post-overlay, pre-tryWebGL-definition, and pre-rAF-scheduling.
- Confirmed via headless Puppeteer that `init()` runs but `tryWebGL()` is never entered.
- The `[map_hoi] about to define tryWebGL` log appears; `[map_hoi] scheduling tryWebGL via rAF` (placed after the `};` at line 324) never appears — proving those lines are inside the `tryWebGL` closure, not at `init()` scope.
