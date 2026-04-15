import type { ProcessInfo } from "../types/process";
import { fuzzyMatchPids } from "./fuzzy-search";

export type SearchMode = "regex" | "fuzzy";

export type FilteredProcess = ProcessInfo & { isDirectMatch: boolean };

const escapeRegex = (str: string) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const regexMatchPids = (
  processes: readonly ProcessInfo[],
  query: string
): Set<number> => {
  let regex: RegExp;
  try {
    regex = new RegExp(query, "i");
  } catch {
    regex = new RegExp(escapeRegex(query), "i");
  }

  const matches = new Set<number>();
  for (const p of processes) {
    if (
      regex.test(p.name) ||
      regex.test(String(p.pid)) ||
      regex.test(p.exe)
    ) {
      matches.add(p.pid);
    }
  }
  return matches;
};

/**
 * Filters processes by regex or fuzzy pattern, preserving ancestor paths in the tree.
 * Ancestors that don't directly match are marked with isDirectMatch: false.
 */
export const filterProcesses = (
  processes: readonly ProcessInfo[],
  query: string,
  mode: SearchMode = "regex",
  includeSubprocesses = false
): FilteredProcess[] => {
  if (!query.trim()) {
    return processes.map((p) => ({ ...p, isDirectMatch: true }));
  }

  // Pass 1: find directly matching PIDs (strategy-based)
  const directMatches =
    mode === "fuzzy"
      ? fuzzyMatchPids(processes, query)
      : regexMatchPids(processes, query);

  // Build ppid lookup for ancestor traversal
  const pidToProcess = new Map<number, ProcessInfo>();
  for (const p of processes) {
    pidToProcess.set(p.pid, p);
  }

  // Pass 2: mark all ancestors of matching PIDs
  const ancestorPids = new Set<number>();
  for (const pid of directMatches) {
    let current = pidToProcess.get(pid);
    while (current?.ppid != null) {
      if (ancestorPids.has(current.ppid)) break;
      ancestorPids.add(current.ppid);
      current = pidToProcess.get(current.ppid);
    }
  }

  // Pass 2.5: collect all descendants of matching PIDs
  const descendantPids = new Set<number>();
  if (includeSubprocesses && directMatches.size > 0) {
    const childrenOf = new Map<number, number[]>();
    for (const p of processes) {
      if (p.ppid != null) {
        const siblings = childrenOf.get(p.ppid);
        if (siblings) siblings.push(p.pid);
        else childrenOf.set(p.ppid, [p.pid]);
      }
    }

    const stack = [...directMatches];
    while (stack.length > 0) {
      const pid = stack.pop()!;
      const children = childrenOf.get(pid);
      if (!children) continue;
      for (const child of children) {
        if (!directMatches.has(child) && !descendantPids.has(child)) {
          descendantPids.add(child);
          stack.push(child);
        }
      }
    }
  }

  // Pass 3: filter to matches + ancestors + descendants, preserving order
  const visiblePids = new Set([
    ...directMatches,
    ...ancestorPids,
    ...descendantPids,
  ]);

  return processes
    .filter((p) => visiblePids.has(p.pid))
    .map((p) => ({
      ...p,
      isDirectMatch: directMatches.has(p.pid),
    }));
};
