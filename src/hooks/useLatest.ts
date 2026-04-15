import { useRef, useInsertionEffect } from "react";

/**
 * Keeps a ref synced with the latest value, updated via useInsertionEffect
 * (safe for concurrent mode — never mutates during render).
 * Use to read fresh values inside stable callbacks without adding dependencies.
 */
export const useLatest = <T>(value: T) => {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  });
  return ref;
};
