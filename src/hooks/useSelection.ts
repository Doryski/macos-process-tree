import { useState, useRef } from "react";
import type { ProcessInfo } from "../types/process";
import {
  togglePid,
  selectRange,
  selectAllPids,
  pruneSelection,
} from "../lib/selection";
import { useLatest } from "./useLatest";

export const useSelection = (visibleRows: readonly ProcessInfo[]) => {
  const [rawSelection, setRawSelection] = useState<ReadonlySet<number>>(
    () => new Set()
  );
  const lastClickedRef = useRef<number | null>(null);
  const visibleRowsRef = useLatest(visibleRows);

  const validPids = new Set(visibleRows.map((r) => r.pid));
  const selectedPids = pruneSelection(rawSelection, validPids);

  // Reads visibleRows from ref to avoid invalidating ProcessRow memo on every data refresh
  const toggleSelect = (pid: number, shiftKey: boolean) => {
    setRawSelection((prev) => {
      if (shiftKey) {
        return selectRange(
          prev,
          visibleRowsRef.current,
          lastClickedRef.current,
          pid
        );
      }
      return togglePid(prev, pid);
    });
    lastClickedRef.current = pid;
  };

  const selectAll = () => {
    setRawSelection(selectAllPids(visibleRowsRef.current));
  };

  const clearSelection = () => {
    setRawSelection(new Set());
    lastClickedRef.current = null;
  };

  return { selectedPids, toggleSelect, selectAll, clearSelection } as const;
};
