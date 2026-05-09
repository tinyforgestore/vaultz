import { useEffect, useRef, type RefObject } from 'react';

/**
 * Holds the latest props/args in a ref so listeners registered once on
 * mount can read fresh values without re-attaching. Used by every keyboard
 * hook to avoid stale-closure drops.
 */
export function useLatestArgs<T>(args: T): RefObject<T> {
  const ref = useRef(args);
  useEffect(() => {
    ref.current = args;
  });
  return ref;
}
