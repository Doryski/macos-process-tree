import { invoke, Channel } from "@tauri-apps/api/core";
import type { ProcessInfo } from "../types/process";

export type KillResult = {
  pid: number;
  success: boolean;
  error: string | null;
};

export const getProcessTree = () => invoke<ProcessInfo[]>("get_process_tree");

export const killProcess = (pid: number, signal: number) =>
  invoke<void>("kill_process", { pid, signal });

export const killProcesses = (pids: number[], signal: number) =>
  invoke<KillResult[]>("kill_processes", { pids, signal });

export const streamProcesses = (
  onUpdate: (tree: ProcessInfo[]) => void,
  baseIntervalMs: number = 2000,
  maxIntervalMs: number = 10000,
) => {
  const channel = new Channel<ProcessInfo[]>();
  channel.onmessage = onUpdate;

  const promise = invoke("stream_processes", {
    onUpdate: channel,
    baseIntervalMs,
    maxIntervalMs,
  });

  return { channel, promise };
};
