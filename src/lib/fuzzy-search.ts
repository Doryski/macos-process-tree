import Fuse from "fuse.js";
import type { ProcessInfo } from "../types/process";

const FUSE_OPTIONS = {
  keys: [
    "name",
    "exe",
    { name: "pid", getFn: (p: ProcessInfo) => String(p.pid) },
  ],
  threshold: 0.2,
  ignoreLocation: true,
};

const fuseCache = new WeakMap<readonly ProcessInfo[], Fuse<ProcessInfo>>();

const getFuse = (processes: readonly ProcessInfo[]) => {
  const cached = fuseCache.get(processes);
  if (cached) return cached;
  const fuse = new Fuse(processes, FUSE_OPTIONS);
  fuseCache.set(processes, fuse);
  return fuse;
};

export const fuzzyMatchPids = (
  processes: readonly ProcessInfo[],
  query: string
): Set<number> =>
  new Set(getFuse(processes).search(query).map((r) => r.item.pid));
