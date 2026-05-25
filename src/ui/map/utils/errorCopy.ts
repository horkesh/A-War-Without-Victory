const ERROR_COPY: Record<string, string> = {
  pending_required_decisions: 'Presidential decisions are still unsigned. Review the highlighted desk item before advancing.',
  level_2_plus_not_yet_enabled: 'This command channel is not available in the current build.',
  desktop_ipc_unavailable: 'This action requires the desktop app.',
  ipc_unavailable: 'This action requires the desktop app.',
};

export function playerFacingErrorCopy(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return 'The requested action could not be completed.';
  const mapped = ERROR_COPY[trimmed];
  if (mapped) return mapped;
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(trimmed)) {
    return 'The requested action could not be completed.';
  }
  return trimmed;
}
