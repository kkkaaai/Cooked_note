/**
 * Basic palm rejection heuristics for touch drawing.
 *
 * On iOS with Apple Pencil:
 * - Pencil events have `force > 0`
 * - Finger/palm touches have `force === 0` or report larger contact area
 * - Multiple simultaneous pointers usually indicate palm contact
 *
 * This is a best-effort heuristic — real pencil hardware detection
 * requires native module integration.
 */

/**
 * Returns true if the touch event should be rejected (likely palm/finger noise).
 */
export function shouldRejectTouch(event: { numberOfPointers?: number }): boolean {
  // Reject multi-pointer events during drawing (likely palm + finger)
  if (event.numberOfPointers !== undefined && event.numberOfPointers > 1) {
    return true;
  }

  return false;
}
