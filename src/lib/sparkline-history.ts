import type { ProcessInfo } from "../types/process";

export const MAX_SAMPLES = 20;

type SparklineData = {
  cpu: readonly number[];
  mem: readonly number[];
};

export type SparklineHistory = ReadonlyMap<number, SparklineData>;

export const EMPTY_HISTORY: SparklineHistory = new Map();

const appendSample = (samples: readonly number[] | undefined, value: number) =>
  [...(samples ?? []), value].slice(-MAX_SAMPLES);

export const appendSparklineHistory = (
  history: SparklineHistory,
  processes: readonly ProcessInfo[]
): SparklineHistory =>
  new Map(
    processes.map((p) => {
      const previous = history.get(p.pid);
      return [
        p.pid,
        {
          cpu: appendSample(previous?.cpu, p.cpu),
          mem: appendSample(previous?.mem, p.memory),
        },
      ] as const;
    })
  );

export type StreamState = {
  processes: ProcessInfo[] | undefined;
  history: SparklineHistory;
};

export const INITIAL_STREAM_STATE: StreamState = {
  processes: undefined,
  history: EMPTY_HISTORY,
};

export const applyStreamTick = (
  state: StreamState,
  processes: ProcessInfo[]
): StreamState => ({
  processes,
  history: appendSparklineHistory(state.history, processes),
});
