import { useState, useEffect, startTransition } from "react";
import { beginStream, stopStream, streamProcesses } from "../lib/ipc";
import {
  applyStreamTick,
  INITIAL_STREAM_STATE,
} from "../lib/sparkline-history";
import type { ProcessInfo } from "../types/process";

export const useProcessStream = (intervalMs: number) => {
  const [state, setState] = useState(INITIAL_STREAM_STATE);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    if (intervalMs === 0 && refreshKey === 0) return;

    let isActive = true;
    let activeStreamId: number | undefined;

    const startStream = (streamId: number) => {
      if (!isActive) {
        stopStream(streamId);
        return;
      }
      activeStreamId = streamId;
      const handleUpdate = (tree: ProcessInfo[]) => {
        if (!isActive) return;
        startTransition(() => {
          setState((prev) => applyStreamTick(prev, tree));
        });
        if (intervalMs === 0) stopStream(streamId);
      };
      streamProcesses(handleUpdate, streamId, intervalMs);
    };

    beginStream().then(startStream);

    return () => {
      isActive = false;
      if (activeStreamId !== undefined) stopStream(activeStreamId);
    };
  }, [intervalMs, refreshKey]);

  return { ...state, refetch };
};
