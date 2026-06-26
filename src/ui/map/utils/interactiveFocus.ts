export function isInteractiveElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') return true;
  const tag = element.tagName.toUpperCase();
  return tag === 'INPUT'
    || tag === 'TEXTAREA'
    || tag === 'SELECT'
    || tag === 'BUTTON'
    || tag === 'A'
    || element.getAttribute('role') === 'button'
    || element.getAttribute('role') === 'tab'
    || element.getAttribute('role') === 'menuitem';
}

export function isFocusInInteractiveControl(): boolean {
  return isInteractiveElement(document.activeElement);
}

export function isKeyboardEventFromInteractiveControl(event: KeyboardEvent): boolean {
  return isInteractiveElement(event.target instanceof Element ? event.target : null);
}
