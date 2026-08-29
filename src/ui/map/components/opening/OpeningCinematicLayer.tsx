import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import openingMapPortal from '../../assets/opening/opening_map_portal.webp';
import { WarroomScenePlate } from '../warroom/WarroomScenePlate';
import { OPENING_WARROOM_SCENES } from './openingScenes';
import {
  createOpeningTransitionController,
  type OpeningScene,
  type OpeningSceneLoader,
} from './openingTransition';

export interface OpeningCinematicLayerProps {
  scene: OpeningScene;
  neutralSrc: string;
  reducedMotion?: boolean;
  loadScene?: OpeningSceneLoader;
  className?: string;
}

const OPENING_DISSOLVE_QUERY = '(prefers-reduced-motion: reduce), (max-width: 720px), (max-height: 600px)';

/**
 * Atmospheric terrain texture for the existing portal seam. Deterministic relief
 * imagery only: it carries no political border, control, ownership, or gameplay
 * state, and the gradient underneath it in globals.css remains the fallback.
 */
const OPENING_MAP_PORTAL_IMAGE = `url(${openingMapPortal})`;

function sceneSource(scene: OpeningScene, neutralSrc: string): string {
  return scene === 'neutral' ? neutralSrc : OPENING_WARROOM_SCENES[scene].src;
}

function sceneOrigin(scene: OpeningScene): string {
  return scene === 'neutral' ? '50% 44%' : OPENING_WARROOM_SCENES[scene].transformOrigin;
}

function browserImageLoader(
  neutralSrc: string,
  scene: OpeningScene,
  handlers: Parameters<OpeningSceneLoader>[1],
): () => void {
  const image = new Image();
  let active = true;
  const settle = (outcome: 'ready' | 'fail') => {
    if (!active) return;
    active = false;
    image.removeEventListener('load', onLoad);
    image.removeEventListener('error', onError);
    handlers[outcome]();
  };
  const onLoad = () => settle('ready');
  const onError = () => settle('fail');
  image.addEventListener('error', onError, { once: true });
  image.src = sceneSource(scene, neutralSrc);

  if (typeof image.decode === 'function') {
    void image.decode().then(onLoad, onError);
  } else {
    image.addEventListener('load', onLoad, { once: true });
  }

  return () => {
    active = false;
    image.removeEventListener('load', onLoad);
    image.removeEventListener('error', onError);
  };
}

export function OpeningCinematicLayer({
  scene,
  neutralSrc,
  reducedMotion,
  loadScene,
  className,
}: OpeningCinematicLayerProps) {
  const loaderRef = useRef(loadScene);
  loaderRef.current = loadScene;
  const neutralSrcRef = useRef(neutralSrc);
  neutralSrcRef.current = neutralSrc;
  const [controller] = useState(() => createOpeningTransitionController({
    loadScene: (nextScene, handlers) => (
      loaderRef.current?.(nextScene, handlers)
      ?? browserImageLoader(neutralSrcRef.current, nextScene, handlers)
    ),
    reducedMotion: reducedMotion ?? (
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(OPENING_DISSOLVE_QUERY).matches
    ),
  }));
  const [transition, setTransition] = useState(controller.getState);

  useEffect(() => controller.subscribe(() => {
    setTransition(controller.getState());
  }), [controller]);

  useEffect(() => {
    controller.request(scene);
  }, [controller, scene]);

  useEffect(() => {
    if (reducedMotion !== undefined) {
      controller.setReducedMotion(reducedMotion);
      return undefined;
    }
    if (typeof window.matchMedia !== 'function') return undefined;
    const preference = window.matchMedia(OPENING_DISSOLVE_QUERY);
    const onChange = (event: MediaQueryListEvent) => controller.setReducedMotion(event.matches);
    controller.setReducedMotion(preference.matches);
    preference.addEventListener('change', onChange);
    return () => preference.removeEventListener('change', onChange);
  }, [controller, reducedMotion]);

  useEffect(() => () => controller.dispose(), [controller]);

  const incoming = transition.phase !== 'idle'
    && transition.requestedScene !== transition.displayedScene;
  const currentOrigin = sceneOrigin(transition.displayedScene);
  const incomingOrigin = sceneOrigin(transition.requestedScene);
  const layerStyle = {
    '--opening-current-map-origin': currentOrigin,
    '--opening-incoming-map-origin': incomingOrigin,
    '--opening-map-portal-image': OPENING_MAP_PORTAL_IMAGE,
  } as CSSProperties;
  const failedScene = controller.getFailedScene();

  return (
    <section
      className={`opening-cinematic${className ? ` ${className}` : ''}`}
      style={layerStyle}
      role="region"
      aria-label="Opening scene"
      aria-busy={transition.phase !== 'idle'}
      data-opening-phase={transition.phase}
      data-reduced-motion={transition.reducedMotion ? 'true' : 'false'}
    >
      <div
        className="opening-cinematic__plate opening-cinematic__plate--current"
        style={{ transformOrigin: currentOrigin }}
        aria-hidden="true"
      >
        <WarroomScenePlate
          src={sceneSource(transition.displayedScene, neutralSrc)}
          state="current"
          transformOrigin={currentOrigin}
        />
      </div>
      {incoming && (
        <div
          className="opening-cinematic__plate opening-cinematic__plate--incoming"
          style={{ transformOrigin: incomingOrigin }}
          aria-hidden="true"
        >
          <WarroomScenePlate
            src={sceneSource(transition.requestedScene, neutralSrc)}
            state="incoming"
            transformOrigin={incomingOrigin}
          />
        </div>
      )}
      <div className="opening-cinematic__portal" aria-hidden="true" />
      <p className="sr-only" role="status" aria-live="polite">
        {failedScene ? `${failedScene} preview unavailable` : ''}
      </p>
    </section>
  );
}
