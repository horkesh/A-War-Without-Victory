/** Renderer-only classification for canonical desktop state broadcasts. */
export interface GameStateUpdateMetadata {
  campaignReplacement?: boolean;
}

/** Preserve replacement identity while retaining only the latest state JSON. */
export function coalesceGameStateUpdateMetadata(
  current: GameStateUpdateMetadata | undefined,
  incoming: GameStateUpdateMetadata | undefined,
): GameStateUpdateMetadata | undefined {
  if (current?.campaignReplacement || incoming?.campaignReplacement) {
    return { campaignReplacement: true };
  }
  return undefined;
}

export interface GameStateApplicationReservation {
  replacementRevision: number;
  activityRevision: number;
  campaignReplacement: boolean;
}

export interface LatestGameStateApplicationGate {
  captureCurrent(): GameStateApplicationReservation;
  reserveReplacement(): GameStateApplicationReservation;
  admitReserved(stateJson: string, reservation: GameStateApplicationReservation): boolean;
  admitIncoming(stateJson: string, metadata?: GameStateUpdateMetadata): boolean;
}

/**
 * Arbitrates async renderer reads against campaign replacements and state pushes.
 * Older reads lose, exact same-generation payloads are deduplicated, and an
 * intentional replacement remains admissible even when its bytes are identical.
 */
export function createLatestGameStateApplicationGate(): LatestGameStateApplicationGate {
  let replacementRevision = 0;
  let activityRevision = 0;
  let lastAppliedReplacementRevision = -1;
  let lastAppliedStateJson: string | null = null;

  const captureCurrent = (): GameStateApplicationReservation => ({
    replacementRevision,
    activityRevision,
    campaignReplacement: false,
  });

  const reserveReplacement = (): GameStateApplicationReservation => {
    replacementRevision += 1;
    activityRevision += 1;
    return {
      replacementRevision,
      activityRevision,
      campaignReplacement: true,
    };
  };

  const admitReserved = (
    stateJson: string,
    reservation: GameStateApplicationReservation,
  ): boolean => {
    if (reservation.replacementRevision !== replacementRevision) return false;
    if (!reservation.campaignReplacement && reservation.activityRevision !== activityRevision) return false;
    if (
      reservation.replacementRevision === lastAppliedReplacementRevision
      && stateJson === lastAppliedStateJson
    ) return false;

    activityRevision += 1;
    lastAppliedReplacementRevision = reservation.replacementRevision;
    lastAppliedStateJson = stateJson;
    return true;
  };

  return {
    captureCurrent,
    reserveReplacement,
    admitReserved,
    admitIncoming: (stateJson, metadata) => admitReserved(
      stateJson,
      metadata?.campaignReplacement === true ? reserveReplacement() : captureCurrent(),
    ),
  };
}
