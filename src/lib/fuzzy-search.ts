import Fuse from "fuse.js";
import type { ProcessInfo } from "../types/process";

type FuseProcessItem = ProcessInfo & { pidStr: string };

const FUSE_OPTIONS = {
  keys: ["name", "exe", "pidStr"],
  threshold: 0.2,
  ignoreLocation: true,
};

export const fuzzyMatchPids = (
  processes: readonly ProcessInfo[],
  query: string
): Set<number> => {
  const items: FuseProcessItem[] = processes.map((p) => ({
    ...p,
    pidStr: String(p.pid),
  }));
  const fuse = new Fuse(items, FUSE_OPTIONS);
  const results = fuse.search(query);
  return new Set(results.map((r) => r.item.pid));
};
