let nextTimerId = 0;

export interface DevTimer {
  end: () => void;
}

const NOOP_TIMER: DevTimer = {
  end: () => undefined,
};

export function createDevTimer(label: string, enabled: boolean): DevTimer {
  if (!enabled) return NOOP_TIMER;
  const timerLabel = `${label} #${nextTimerId++}`;
  let ended = false;

  console.time(timerLabel);

  return {
    end: () => {
      if (ended) return;
      ended = true;
      console.timeEnd(timerLabel);
    },
  };
}
