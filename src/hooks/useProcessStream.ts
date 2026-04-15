import { useState, useEffect, startTransition } from "react";
import { streamProcesses } from "../lib/ipc";
import type { ProcessInfo } from "../types/process";

export const useProcessStream = (intervalMs: number) => {
  const [processes, setProcesses] = useState<ProcessInfo[]>();

  const refetch = () => {
    // Stream auto-pushes; manual refresh is a no-op
  };

  useEffect(() => {
    if (intervalMs === 0) return;

    const { channel } = streamProcesses(
      (tree) => {
        startTransition(() => {
          setProcesses(tree);
        });
      },
      intervalMs,
      10000,
    );

    return () => {
      channel.onmessage = () => {};
    };
  }, [intervalMs]);

  return { data: processes, refetch };
};
