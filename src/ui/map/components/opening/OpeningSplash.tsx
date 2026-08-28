import { useEffect, useRef } from 'react';
import splashFallback from '../../../warroom/assets/hq_presidential_desk_1992.webp';

// Owner art gate: replace this single value with opening_splash_neutral_master.
export const OPENING_SPLASH_ART = splashFallback;

interface OpeningSplashProps {
  title: string;
  version: string;
  actionLabel: string;
  onDismiss: () => void;
}

export function OpeningSplash({ title, version, actionLabel, onDismiss }: OpeningSplashProps) {
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dismissRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Escape') return;
      event.preventDefault();
      onDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <section
      className="opening-splash"
      role="dialog"
      aria-modal="true"
      aria-labelledby="opening-splash-title"
    >
      <img
        className="opening-splash__art"
        src={OPENING_SPLASH_ART}
        alt=""
        aria-hidden="true"
        data-testid="opening-splash-art"
        draggable="false"
      />
      <div className="opening-splash__shade" aria-hidden="true" />
      <div className="opening-splash__ident">
        <span className="opening-splash__eyebrow">Pyrrhic Games</span>
        <h1 id="opening-splash-title" className="opening-splash__title">{title}</h1>
        <p className="opening-splash__version">{version}</p>
      </div>
      <button
        ref={dismissRef}
        type="button"
        className="opening-splash__dismiss"
        onClick={onDismiss}
      >
        <span>{actionLabel}</span>
        <span aria-hidden="true">Enter / Esc</span>
      </button>
    </section>
  );
}
