import { invoke, Channel } from "@tauri-apps/api/core";
import type { ProcessInfo } from "../types/process";

export type KillResult = {
  pid: number;
  success: boolean;
  error: string | null;
};

export const killProcess = (pid: number, signal: number) =>
  invoke<void>("kill_process", { pid, signal });

export const killProcesses = (pids: number[], signal: number) =>
  invoke<KillResult[]>("kill_processes", { pids, signal });

export const beginStream = () => invoke<number>("begin_stream");

export const streamProcesses = (
  onUpdate: (tree: ProcessInfo[]) => void,
  streamId: number,
  intervalMs: number
) => {
  const channel = new Channel<ProcessInfo[]>();
  channel.onmessage = onUpdate;
  return invoke("stream_processes", { onUpdate: channel, streamId, intervalMs });
};

export const stopStream = (streamId: number) =>
  invoke("stop_stream", { streamId });
