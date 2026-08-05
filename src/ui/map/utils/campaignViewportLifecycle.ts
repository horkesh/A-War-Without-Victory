export type CampaignReplacementRunner = <Result>(
  replaceCampaign: () => Promise<Result>,
  replacementSucceeded?: (result: Result) => boolean,
  reservation?: number,
) => Promise<Result>;

export interface CampaignReplacementCoordinator {
  reserveReplacement(): number;
  currentReservation(): number;
  appliedReservation(): number;
  runReplacement: CampaignReplacementRunner;
}

/** Serialize replacements and admit an epoch only for the newest successful request. */
export function createCampaignReplacementCoordinator(
  onReplacementSucceeded: () => void,
  hadActiveCampaignBeforeReplacement: () => boolean = () => true,
): CampaignReplacementCoordinator {
  let currentReservation = 0;
  let appliedReservation = 0;
  let replacementQueue: Promise<void> = Promise.resolve();

  const reserveReplacement = () => {
    currentReservation += 1;
    return currentReservation;
  };

  const runReplacement: CampaignReplacementRunner = <Result,>(
    replaceCampaign: () => Promise<Result>,
    replacementSucceeded: (result: Result) => boolean = () => true,
    reservation = reserveReplacement(),
  ): Promise<Result> => {
    const execute = async () => {
      const shouldAdvanceViewportEpoch = hadActiveCampaignBeforeReplacement();
      const result = await replaceCampaign();
      if (
        replacementSucceeded(result)
        && reservation === currentReservation
        && reservation > appliedReservation
      ) {
        appliedReservation = reservation;
        if (shouldAdvanceViewportEpoch) onReplacementSucceeded();
      }
      return result;
    };
    const result = replacementQueue.then(execute, execute);
    replacementQueue = result.then(() => undefined, () => undefined);
    return result;
  };

  return {
    reserveReplacement,
    currentReservation: () => currentReservation,
    appliedReservation: () => appliedReservation,
    runReplacement,
  };
}

/** Advances the UI-only campaign epoch only after replacement succeeds. */
export async function runCampaignViewportReplacement<Result>(
  replaceCampaign: () => Promise<Result>,
  onReplacementSucceeded: () => void,
  replacementSucceeded: (result: Result) => boolean = () => true,
): Promise<Result> {
  const result = await replaceCampaign();
  if (replacementSucceeded(result)) onReplacementSucceeded();
  return result;
}
