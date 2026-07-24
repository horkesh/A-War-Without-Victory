import { useEffect, useState } from 'react';
import { Z } from '../../shared/zIndex';
import { t, type MessageKey } from '../i18n';

export type CoachmarkId =
  | 'decision-room'
  | 'operation-opportunity'
  | 'chronicle-filter'
  | 'codex';

export interface CoachmarkDef {
  id: CoachmarkId;
  title: string;
  body: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

export const COACHMARKS: ReadonlyArray<CoachmarkDef> = Object.freeze([
  {
    id: 'decision-room',
    title: "President's Desk",
    body: 'Review pending decisions and staff handoffs before you advance the week.',
    titleKey: 'coachmark.decisionRoom.title',
    bodyKey: 'coachmark.decisionRoom.body',
  },
  {
    id: 'operation-opportunity',
    title: 'Operation Opportunity',
    body: 'Authorize, redirect, delay, or decline staff-proposed operations from their dossier.',
    titleKey: 'coachmark.operationOpportunity.title',
    bodyKey: 'coachmark.operationOpportunity.body',
  },
  {
    id: 'chronicle-filter',
    title: 'Chronicle Filters',
    body: 'Filter the campaign record when you need to reconstruct why the front changed.',
    titleKey: 'coachmark.chronicleFilter.title',
    bodyKey: 'coachmark.chronicleFilter.body',
  },
  {
    id: 'codex',
    title: 'Codex',
    body: 'Open historical context and reference essays without leaving the tactical map.',
    titleKey: 'coachmark.codex.title',
    bodyKey: 'coachmark.codex.body',
  },
]);

const COACHMARKS_BY_ID = new Map(COACHMARKS.map((coachmark) => [coachmark.id, coachmark]));

export function getCoachmarkStorageKey(id: CoachmarkId): string {
  return `awwv.coachmark.${id}.seen`;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hasSeenCoachmark(id: CoachmarkId): boolean {
  return getStorage()?.getItem(getCoachmarkStorageKey(id)) === 'true';
}

function markSeen(id: CoachmarkId): void {
  getStorage()?.setItem(getCoachmarkStorageKey(id), 'true');
}

function resolveCoachmarkTarget(target: EventTarget | null): { element: HTMLElement; coachmark: CoachmarkDef } | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>('[data-coachmark-id]');
  const rawId = element?.dataset.coachmarkId;
  if (!element || !rawId) return null;
  const coachmark = COACHMARKS_BY_ID.get(rawId as CoachmarkId);
  if (!coachmark || hasSeenCoachmark(coachmark.id)) return null;
  return { element, coachmark };
}

interface ActiveCoachmark {
  coachmark: CoachmarkDef;
  top: number;
  left: number;
}

export function CoachmarkLayer(): JSX.Element | null {
  const [active, setActive] = useState<ActiveCoachmark | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const show = (event: Event) => {
      const resolved = resolveCoachmarkTarget(event.target);
      if (!resolved) return;
      const rect = resolved.element.getBoundingClientRect();
      markSeen(resolved.coachmark.id);
      setActive({
        coachmark: resolved.coachmark,
        top: Math.max(56, rect.bottom + 8),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 296)),
      });
    };

    const hide = () => setActive(null);

    document.addEventListener('mouseover', show, true);
    document.addEventListener('focusin', show, true);
    document.addEventListener('mouseout', hide, true);
    document.addEventListener('focusout', hide, true);
    return () => {
      document.removeEventListener('mouseover', show, true);
      document.removeEventListener('focusin', show, true);
      document.removeEventListener('mouseout', hide, true);
      document.removeEventListener('focusout', hide, true);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      data-testid="coachmark-layer"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: active.top,
        left: active.left,
        width: 280,
        zIndex: Z.TOOLTIP,
        pointerEvents: 'none',
      }}
      className="rounded border border-amber-400/35 bg-[#16140f]/95 px-3 py-2 text-[#f3ead0] shadow-2xl"
    >
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
        {t(active.coachmark.titleKey)}
      </div>
      <div className="mt-1 text-xs leading-snug text-[#d7cab7]">
        {t(active.coachmark.bodyKey)}
      </div>
    </div>
  );
}
