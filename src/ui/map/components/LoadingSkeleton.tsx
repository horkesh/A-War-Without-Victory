/**
 * LANE-V094-LOADING-AND-ERROR — first-paint scenario-load skeleton.
 *
 * Lightweight placeholder shown while `loadedGameState === null` (no save
 * loaded yet) AND no other shell (MainMenu / SidePicker / Warroom) is
 * already covering the screen. Replaces the previous blank screen on
 * cold start before the first save resolves.
 *
 * Design rules (from v0.9.4 Phase 1+2 audit § P1-C / QW-2):
 *   - Reuses canonical `panel-shimmer` keyframe (`globals.css` shimmer
 *     1.5s) — no new animation vocabulary.
 *   - Faction-symmetric: no faction colors, no faction copy. Pure
 *     monochrome amber/panel-bg.
 *   - <5 KB component; instant render; no async work in mount path.
 *   - Layout placeholder only: top toolbar bar, left sidebar, map area,
 *     bottom strip — mirrors the real shell's gross structure so first
 *     real frame doesn't visually jump.
 *   - Auto-dismiss at App root: when `loadedGameState !== null`, this
 *     component is unmounted by the App's conditional render.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic mechanism,
 * no §6 surface. UI-only — does NOT enter sim path.
 */
import React from 'react';
import { Z } from '../../shared/zIndex';

export interface LoadingSkeletonProps {
  /** Optional override for the loading caption. Default: "LOADING SCENARIO". */
  caption?: string;
}

/**
 * MapShellSkeleton — first-paint placeholder.
 *
 * The component is intentionally pure: no hooks, no store reads, no
 * IPC. The caller decides when to mount/unmount.
 */
export function LoadingSkeleton({ caption = 'LOADING SCENARIO' }: LoadingSkeletonProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 bg-panel-bg flex flex-col"
      style={{ zIndex: Z.LOADING_SKELETON }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={caption}
      data-testid="map-shell-skeleton"
    >
      {/* Top toolbar shimmer (mirrors PresidentialToolbar's h-12). */}
      <div className="h-12 w-full border-b border-panel-border panel-shimmer" />

      <div className="flex flex-1 min-h-0">
        {/* Left rail shimmer (mirrors OOBSidebar). */}
        <div className="w-64 border-r border-panel-border flex flex-col gap-2 p-3">
          <div className="h-6 w-3/4 bg-panel-card rounded panel-shimmer" />
          <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
          <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
          <div className="h-4 w-5/6 bg-panel-card rounded panel-shimmer" />
          <div className="mt-3 h-32 w-full bg-panel-card rounded panel-shimmer" />
          <div className="mt-2 h-4 w-2/3 bg-panel-card rounded panel-shimmer" />
          <div className="h-4 w-1/2 bg-panel-card rounded panel-shimmer" />
        </div>

        {/* Map area shimmer with centered caption. */}
        <div className="flex-1 relative bg-panel-card panel-shimmer">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="font-mono uppercase tracking-[0.30em] text-amber-400 text-[12px] opacity-80"
              data-testid="map-shell-skeleton-caption"
            >
              {caption}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom strip shimmer (mirrors BottomStatusStrip). */}
      <div className="h-8 w-full border-t border-panel-border panel-shimmer" />
    </div>
  );
}
