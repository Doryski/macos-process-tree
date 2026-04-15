import type { ProcessInfo } from "../types/process";

/**
 * Counts descendant processes of the given PIDs that are NOT in the target set.
 * Uses the DFS pre-order flat array property: descendants of a node at depth D
 * are all subsequent nodes with depth > D until a node with depth <= D appears.
 */
export const getDescendantCount = (
  processes: readonly ProcessInfo[],
  targetPids: ReadonlySet<number>
): number => {
  if (targetPids.size === 0) return 0;

  let count = 0;
  let trackingDepth: number | null = null;

  for (const p of processes) {
    // If we're tracking descendants and this node is deeper, it's a descendant
    if (trackingDepth !== null && p.depth > trackingDepth) {
      if (!targetPids.has(p.pid)) count++;
      continue;
    }

    // Reset tracking
    trackingDepth = null;

    // Start tracking if this is a target
    if (targetPids.has(p.pid)) {
      trackingDepth = p.depth;
    }
  }

  return count;
};
