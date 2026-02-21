export type RightClickIntent =
    | { kind: 'none' }
    | { kind: 'stage_move'; targetSid: string };

export interface RightClickContext {
    selectedFormationId: string | null;
    selectedFormationKind: string | null;
    targetSid: string | null;
    reachableSids: ReadonlySet<string>;
}

/**
 * Resolve right-click action intent deterministically from current selection context.
 * Phase 5 currently supports movement staging from brigade selection.
 */
export function resolveRightClickIntent(ctx: RightClickContext): RightClickIntent {
    if (!ctx.selectedFormationId) return { kind: 'none' };
    if (ctx.selectedFormationKind !== 'brigade') return { kind: 'none' };
    if (!ctx.targetSid) return { kind: 'none' };
    if (!ctx.reachableSids.has(ctx.targetSid)) return { kind: 'none' };
    return { kind: 'stage_move', targetSid: ctx.targetSid };
}
