const ERROR_COPY: Record<string, string> = {
  pending_required_decisions: 'Presidential decisions are still unsigned. Review the highlighted desk item before advancing.',
  level_2_plus_not_yet_enabled: 'This command channel is not available in the current build.',
  desktop_ipc_unavailable: 'This action requires the desktop app.',
  ipc_unavailable: 'This action requires the desktop app.',
};

const MISSING_GAME_DATA_COPY = 'Required game data could not be found. Reinstall or verify the game files.';

const FILESYSTEM_LOAD_ERROR_PATTERNS = [
  /\bENOENT\b/i,
  /\bno such file or directory\b/i,
  /\bcannot find module\b/i,
  /\bmissing .*file\b.*\bpath\b/i,
  /\b[A-Z]:\\/i,
  /(?:^|[\s'"])(?:\/tmp|\/var|\/home|\/Users)\/\S+/i,
  /\bdata[\\/](?:derived|source|scenarios|ui)[\\/]/i,
  /\b(?:operational_settlements|settlements_a1_viewer|political_control_data)\.(?:geo)?json\b/i,
];

export function playerFacingErrorCopy(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return 'The requested action could not be completed.';
  const mapped = ERROR_COPY[trimmed];
  if (mapped) return mapped;
  if (FILESYSTEM_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return MISSING_GAME_DATA_COPY;
  }
  if (/\b(?:event_id|response_id)\b/i.test(trimmed)) {
    return 'The requested action could not be completed.';
  }
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(trimmed)) {
    return 'The requested action could not be completed.';
  }
  return trimmed;
}
