// src/shared/hooks/useAutoGrow.ts
import { useLayoutEffect } from "react";

/**
 * Grow a textarea to fit what it holds, every time that changes.
 *
 * The textarea's own `rows` (or a CSS `min-height`) stays the floor: the height
 * is first reset to `auto`, which falls back to it, and only then set to the
 * content's height. A CSS `max-height` stays the ceiling, past which the
 * textarea scrolls as usual.
 *
 * `scrollHeight` is the content plus padding, but the app's boxes are
 * `border-box`, so the border is added back -- without it the box comes out
 * two pixels short and shows a scrollbar for a sliver of text.
 *
 * A layout effect, so the box is sized before the browser paints rather than
 * jumping a frame later.
 *
 * @param ref - The textarea to size.
 * @param value - Its current value; the height is recomputed when it changes.
 */
export function useAutoGrow(
  ref: React.RefObject<HTMLTextAreaElement>,
  value: string
): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    const border = element.offsetHeight - element.clientHeight;
    element.style.height = `${element.scrollHeight + border}px`;
  }, [ref, value]);
}
