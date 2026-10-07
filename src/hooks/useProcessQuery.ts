import { useMutation } from "@tanstack/react-query";
import { killProcess, killProcesses } from "../lib/ipc";

export const useKillProcess = () =>
  useMutation({
    mutationFn: ({ pid, signal }: { pid: number; signal: number }) =>
      killProcess(pid, signal),
  });

export const useKillProcesses = () =>
  useMutation({
    mutationFn: ({ pids, signal }: { pids: number[]; signal: number }) =>
      killProcesses(pids, signal),
  });
