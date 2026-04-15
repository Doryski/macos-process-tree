import { useState } from "react";
import type { ProcessInfo } from "../types/process";
import {
  getVisibleRows,
  getDefaultExpandedPids,
  toggleExpanded,
  setAllExpanded,
} from "../lib/tree-utils";
import { filterProcesses } from "../lib/filter";
import type { SearchMode } from "../lib/filter";
import { useLatest } from "./useLatest";
import { loadState, createDebouncedSaver } from "../lib/storage";

const saveExpandedPids = createDebouncedSaver<number[]>("expandedPids", 500);
const saveSearchQuery = createDebouncedSaver<string>("searchQuery", 300);

const loadExpandedPids = (): Set<number> | null => {
  const arr = loadState<number[] | null>("expandedPids", null);
  return arr ? new Set(arr) : null;
};

// Prune stale PIDs and persist to localStorage
const persistExpandedPids = (
  pids: Set<number>,
  processes: readonly ProcessInfo[] | undefined
) => {
  if (processes?.length) {
    const validPids = new Set(processes.map((p) => p.pid));
    saveExpandedPids([...pids].filter((pid) => validPids.has(pid)));
  } else {
    saveExpandedPids([...pids]);
  }
};

export const useProcessTree = (
  processes: readonly ProcessInfo[] | undefined,
  searchMode: SearchMode = "regex",
  includeSubprocesses = false
) => {
  // null = user hasn't interacted yet (and no persisted state), derive defaults from processes
  const [userExpandedPids, setUserExpandedPids] = useState<Set<number> | null>(
    loadExpandedPids
  );
  const [searchQuery, setSearchQuery] = useState(() =>
    loadState("searchQuery", "")
  );

  const processesRef = useLatest(processes);

  // Default expanded pids — derived during render, no useEffect needed
  const defaultExpanded = processes?.length
    ? getDefaultExpandedPids(processes)
    : new Set<number>();
  const defaultExpandedRef = useLatest(defaultExpanded);

  const expandedPids = userExpandedPids ?? defaultExpanded;

  const filtered = processes
    ? filterProcesses(processes, searchQuery, searchMode, includeSubprocesses)
    : [];

  const visibleRows = getVisibleRows(filtered, expandedPids);

  // All state mutations persist directly — no useEffect needed
  const toggle = (pid: number) =>
    setUserExpandedPids((prev) => {
      const next = toggleExpanded(prev ?? defaultExpandedRef.current, pid);
      persistExpandedPids(next, processesRef.current);
      return next;
    });

  const expandAll = () => {
    if (!processesRef.current) return;
    const next = setAllExpanded(processesRef.current, true);
    persistExpandedPids(next, processesRef.current);
    setUserExpandedPids(next);
  };

  const collapseAll = () => {
    const next = setAllExpanded([], false);
    persistExpandedPids(next, processesRef.current);
    setUserExpandedPids(next);
  };

  const updateSearchQuery = (query: string) => {
    setSearchQuery(query);
    saveSearchQuery(query);
  };

  return {
    visibleRows,
    expandedPids,
    searchQuery,
    setSearchQuery: updateSearchQuery,
    toggle,
    expandAll,
    collapseAll,
    totalCount: processes?.length ?? 0,
    filteredCount: filtered.length,
  };
};
