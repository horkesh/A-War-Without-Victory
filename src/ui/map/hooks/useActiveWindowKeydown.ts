import { useEffect, useRef } from 'react';

/** Owns a window keydown listener only while its UI surface accepts input. */
export function useActiveWindowKeydown(
  active: boolean,
  onKeyDown: (event: KeyboardEvent) => void,
): void {
  const activeRef = useRef(active);
  const onKeyDownRef = useRef(onKeyDown);
  activeRef.current = active;
  onKeyDownRef.current = onKeyDown;

  useEffect(() => {
    if (!active) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      onKeyDownRef.current(event);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);
}
