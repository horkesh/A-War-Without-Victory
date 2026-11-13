import type { ReplayFrameSummary } from './replay_frame_summary.js';

/**
 * Replay manifest schema.
 *
 * v2 (2026-11-13): frames carry `totalCasualties` (military casualties from the
 * casualty ledger) and `totalDisplacedOrKilled` (refugees_created from the
 * displacement aggregates), each `number | null`.
 *
 * v1 frames carried `totalCasualties` / `totalDisplaced` read from fields the
 * engine never wrote, so every v1 figure is 0 whatever happened in the war.
 * Readers still accept v1 manifests (old run directories and save sidecars), but
 * they drop those two figures to `null` so the UI hides them instead of showing
 * a false zero (SENSITIVE_HISTORY_DESIGN_GATE §4).
 */
export const REPLAY_MANIFEST_SCHEMA_VERSION = 2 as const;

export interface ReplaySaveManifest {
    schema_version: typeof REPLAY_MANIFEST_SCHEMA_VERSION;
    frame_count: number;
    frames: ReplayFrameSummary[];
}

/** A v1 manifest as written before 2026-11-13. Its casualty and displaced figures are always 0. */
export interface LegacyReplaySaveManifestV1 {
    schema_version: 1;
    frame_count: number;
    frames: Array<Omit<ReplayFrameSummary, 'totalCasualties' | 'totalDisplacedOrKilled'> & {
        totalCasualties?: unknown;
        totalDisplaced?: unknown;
    }>;
}

export type ReadableReplaySaveManifest = ReplaySaveManifest | LegacyReplaySaveManifestV1;

export function buildReplaySaveManifest(frames: readonly ReplayFrameSummary[]): ReplaySaveManifest {
    return {
        schema_version: REPLAY_MANIFEST_SCHEMA_VERSION,
        frame_count: frames.length,
        frames: [...frames],
    };
}

/** True for a manifest a reader can play: schema v1 or v2 with a frames array. */
export function isReadableReplaySaveManifest(value: unknown): value is ReadableReplaySaveManifest {
    if (!value || typeof value !== 'object') return false;
    const manifest = value as { schema_version?: unknown; frames?: unknown };
    return (manifest.schema_version === 1 || manifest.schema_version === REPLAY_MANIFEST_SCHEMA_VERSION)
        && Array.isArray(manifest.frames);
}

/**
 * The frames of a readable manifest as current summaries. v1 frames keep turn,
 * date, formations and control; their casualty and displaced figures become
 * `null` because v1 never recorded them.
 */
export function readReplayManifestFrames(manifest: ReadableReplaySaveManifest | null | undefined): ReplayFrameSummary[] {
    if (!isReadableReplaySaveManifest(manifest)) return [];
    if (manifest.schema_version === REPLAY_MANIFEST_SCHEMA_VERSION) return manifest.frames;
    return manifest.frames.map((frame) => ({
        turn: frame.turn,
        date: frame.date,
        activeFormations: frame.activeFormations,
        totalCasualties: null,
        totalDisplacedOrKilled: null,
        controlByFaction: frame.controlByFaction,
    }));
}
