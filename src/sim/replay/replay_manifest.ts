import type { ReplayFrameSummary } from './replay_frame_summary.js';

export interface ReplaySaveManifest {
    schema_version: 1;
    frame_count: number;
    frames: ReplayFrameSummary[];
}

export function buildReplaySaveManifest(frames: readonly ReplayFrameSummary[]): ReplaySaveManifest {
    return {
        schema_version: 1,
        frame_count: frames.length,
        frames: [...frames],
    };
}
