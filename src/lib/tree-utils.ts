import type { ProcessInfo } from "../types/process";

/**
 * Derives visible rows from the flat DFS pre-order array based on which nodes are expanded.
 * O(n) single pass — skips children of collapsed nodes by comparing depth levels.
 */
export const getVisibleRows = (
  processes: readonly ProcessInfo[],
  expandedPids: ReadonlySet<number>
) => {
  const result: ProcessInfo[] = [];
  let skipDepth = Infinity;

  for (const process of processes) {
    if (process.depth > skipDepth) continue;

    skipDepth = Infinity;
    result.push(process);

    if (process.has_children && !expandedPids.has(process.pid)) {
      skipDepth = process.depth;
    }
  }

  return result;
};

/**
 * Collects all PIDs that should be initially expanded (depth 0 and 1 by default).
 */
export const getDefaultExpandedPids = (
  processes: readonly ProcessInfo[],
  maxDepth = 1
) => {
  const expanded = new Set<number>();

  for (const p of processes) {
    if (p.has_children && p.depth <= maxDepth) {
      expanded.add(p.pid);
    }
  }

  return expanded;
};

/**
 * Toggles a PID in the expanded set. Returns a new Set.
 */
export const toggleExpanded = (
  expandedPids: ReadonlySet<number>,
  pid: number
) => {
  const next = new Set(expandedPids);
  if (next.has(pid)) {
    next.delete(pid);
  } else {
    next.add(pid);
  }
  return next;
};

/**
 * Expands all nodes or collapses all.
 */
export const setAllExpanded = (
  processes: readonly ProcessInfo[],
  expand: boolean
) => {
  if (!expand) return new Set<number>();

  const expanded = new Set<number>();
  for (const p of processes) {
    if (p.has_children) expanded.add(p.pid);
  }
  return expanded;
};
