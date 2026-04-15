import type { ProcessInfo } from "../types/process";

export const togglePid = (
  selection: ReadonlySet<number>,
  pid: number
): Set<number> => {
  const next = new Set(selection);
  if (next.has(pid)) {
    next.delete(pid);
  } else {
    next.add(pid);
  }
  return next;
};

export const selectRange = (
  selection: ReadonlySet<number>,
  visibleRows: readonly ProcessInfo[],
  fromPid: number | null,
  toPid: number
): Set<number> => {
  if (fromPid === null) return togglePid(selection, toPid);

  const fromIndex = visibleRows.findIndex((r) => r.pid === fromPid);
  const toIndex = visibleRows.findIndex((r) => r.pid === toPid);

  if (fromIndex === -1 || toIndex === -1) return togglePid(selection, toPid);

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  const next = new Set(selection);

  for (let i = start; i <= end; i++) {
    next.add(visibleRows[i].pid);
  }

  return next;
};

export const selectAllPids = (
  visibleRows: readonly ProcessInfo[]
): Set<number> => new Set(visibleRows.map((r) => r.pid));

export const pruneSelection = (
  selection: ReadonlySet<number>,
  validPids: ReadonlySet<number>
): ReadonlySet<number> => {
  let needsPrune = false;
  for (const pid of selection) {
    if (!validPids.has(pid)) {
      needsPrune = true;
      break;
    }
  }
  if (!needsPrune) return selection;

  const next = new Set<number>();
  for (const pid of selection) {
    if (validPids.has(pid)) next.add(pid);
  }
  return next;
};
