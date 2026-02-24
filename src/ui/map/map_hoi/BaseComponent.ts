/**
 * Base for map_hoi class-based components.
 * State lives in class fields; render() updates DOM from state only.
 */

export abstract class BaseComponent {
  readonly el: HTMLElement;

  constructor(container: HTMLElement, tag: keyof HTMLElementTagNameMap = 'div', className?: string, useContainerAsRoot = false) {
    if (useContainerAsRoot && container) {
      this.el = container;
    } else {
      this.el = document.createElement(tag);
      if (className) this.el.className = className;
      container.appendChild(this.el);
    }
  }

  /** Update DOM from current component state. */
  abstract render(): void;

  /** Remove from DOM and clean up. */
  destroy(): void {
    this.el.remove();
  }
}
