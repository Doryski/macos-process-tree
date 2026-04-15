import { useRef, useState, useEffect, startTransition } from "react";
import type { ProcessInfo } from "../types/process";

const MAX_SAMPLES = 20;

type SparklineData = {
  cpu: number[];
  mem: number[];
};

export type SparklineHistory = ReadonlyMap<number, SparklineData>;

const EMPTY_HISTORY: SparklineHistory = new Map();

export const useSparklineHistory = (
  processes: readonly ProcessInfo[] | undefined
): SparklineHistory => {
  const historyRef = useRef(new Map<number, SparklineData>());
  const [snapshot, setSnapshot] = useState<SparklineHistory>(EMPTY_HISTORY);

  useEffect(() => {
    if (!processes) return;

    const history = historyRef.current;
    const currentPids = new Set<number>();

    for (const p of processes) {
      currentPids.add(p.pid);
      const existing = history.get(p.pid);

      if (existing) {
        // Mutate arrays in place — keeps references stable for Sparkline memo
        existing.cpu.push(p.cpu);
        existing.mem.push(p.memory);
        if (existing.cpu.length > MAX_SAMPLES) existing.cpu.shift();
        if (existing.mem.length > MAX_SAMPLES) existing.mem.shift();
      } else {
        history.set(p.pid, { cpu: [p.cpu], mem: [p.memory] });
      }
    }

    // Clean up dead processes
    for (const pid of history.keys()) {
      if (!currentPids.has(pid)) history.delete(pid);
    }

    // New Map wrapper so React detects the change;
    // inner SparklineData objects keep the same array references.
    // startTransition moves this to TransitionLane (lower priority than scroll),
    // so React can interrupt this re-render if a scroll event arrives.
    startTransition(() => {
      setSnapshot(new Map(history));
    });
  }, [processes]);

  return snapshot;
};
