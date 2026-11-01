/**
 * Utility functions for DOM and interaction handling.
 */

/**
 * Accurately detects if a mouse event occurred on any scrollbar
 * (including window scrollbar, form scrollbars, modal scrollbars, etc.).
 *
 * In standard browser layouts:
 * - Vertical scrollbars occupy the right margin of a scrollable element (between clientWidth and offsetWidth).
 * - Horizontal scrollbars occupy the bottom margin of a scrollable element (between clientHeight and offsetHeight).
 *
 * This prevents dropdown menus or selectors from prematurely closing when
 * the user clicks, drags, or uses arrows on a scrollbar to navigate content.
 */
export function isClickOnScrollbar(event: MouseEvent | TouchEvent): boolean {
  if (!('clientX' in event)) {
    return false;
  }

  // 1. Check window/root viewport scrollbar
  if (
    event.clientX >= document.documentElement.clientWidth ||
    event.clientY >= document.documentElement.clientHeight
  ) {
    return true;
  }

  // 2. Traverse up through target and its ancestors
  let el = event.target as HTMLElement | null;
  while (el && el !== document.documentElement) {
    try {
      const style = window.getComputedStyle(el);
      const hasScrollY =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight;
      const hasScrollX =
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth;

      // Check vertical scrollbar
      if (hasScrollY) {
        const rect = el.getBoundingClientRect();
        const scrollbarStartX = rect.left + el.clientLeft + el.clientWidth;
        if (event.clientX >= scrollbarStartX - 2 && event.clientX <= rect.right + 2) {
          return true;
        }
      }

      // Check horizontal scrollbar
      if (hasScrollX) {
        const rect = el.getBoundingClientRect();
        const scrollbarStartY = rect.top + el.clientTop + el.clientHeight;
        if (event.clientY >= scrollbarStartY - 2 && event.clientY <= rect.bottom + 2) {
          return true;
        }
      }
    } catch {
      // Ignore errors for unstyled/detached nodes
    }

    el = el.parentElement;
  }

  return false;
}
