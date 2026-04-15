import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProcessTree, killProcess, killProcesses } from "../lib/ipc";

const PROCESS_QUERY_KEY = ["processes"] as const;

export const useProcessQuery = (refetchInterval: number | false) =>
  useQuery({
    queryKey: PROCESS_QUERY_KEY,
    queryFn: getProcessTree,
    refetchInterval,
    refetchIntervalInBackground: false,
  });

export const useKillProcess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pid, signal }: { pid: number; signal: number }) =>
      killProcess(pid, signal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCESS_QUERY_KEY });
    },
  });
};

export const useKillProcesses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pids, signal }: { pids: number[]; signal: number }) =>
      killProcesses(pids, signal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCESS_QUERY_KEY });
    },
  });
};
