import { useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import type { DebouncedFunc } from "lodash";

/**
 * Returns a ref whose `.current` is a debounced version of `callback`.
 *
 * The debounced function always invokes the *latest* callback, so callers
 * don't need to worry about stale closures.  Pending calls are automatically
 * cancelled on unmount.
 *
 * Callers should access `.current` inside effects or event handlers
 * (not during render), which aligns with React 19's ref access rules.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): React.RefObject<DebouncedFunc<(...args: Args) => void> | null> {
  const callbackRef = useRef(callback);
  const debouncedRef = useRef<DebouncedFunc<(...args: Args) => void> | null>(null);

  // Sync the callback ref after every render so the debounced wrapper
  // always calls the latest version.
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Create the debounced function once (or recreate if delay changes).
  useEffect(() => {
    debouncedRef.current = debounce(
      (...args: Args) => callbackRef.current(...args),
      delay
    );

    return () => {
      debouncedRef.current?.cancel();
      debouncedRef.current = null;
    };
  }, [delay]);

  return debouncedRef;
}
