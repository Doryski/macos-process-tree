import { describe, it, expect } from "vitest";
import {
  appendSparklineHistory,
  applyStreamTick,
  INITIAL_STREAM_STATE,
  EMPTY_HISTORY,
  MAX_SAMPLES,
} from "../src/lib/sparkline-history";
import type { ProcessInfo } from "../src/types/process";

const makeProcess = (
  overrides: Partial<ProcessInfo> & { pid: number }
): ProcessInfo => ({
  ppid: null,
  name: `process-${overrides.pid}`,
  cpu: 0,
  memory: 0,
  status: "Run",
  exe: "",
  depth: 0,
  has_children: false,
  ...overrides,
});

describe("appendSparklineHistory", () => {
  it("starts a history for new processes", () => {
    const result = appendSparklineHistory(EMPTY_HISTORY, [
      makeProcess({ pid: 1, cpu: 5, memory: 100 }),
    ]);
    expect(result.get(1)).toEqual({ cpu: [5], mem: [100] });
  });

  it("appends samples without mutating the previous history", () => {
    const first = appendSparklineHistory(EMPTY_HISTORY, [
      makeProcess({ pid: 1, cpu: 5, memory: 100 }),
    ]);
    const second = appendSparklineHistory(first, [
      makeProcess({ pid: 1, cpu: 7, memory: 120 }),
    ]);
    expect(first.get(1)).toEqual({ cpu: [5], mem: [100] });
    expect(second.get(1)).toEqual({ cpu: [5, 7], mem: [100, 120] });
    expect(second.get(1)?.cpu).not.toBe(first.get(1)?.cpu);
  });

  it("caps samples at MAX_SAMPLES, keeping the newest", () => {
    const history = Array.from({ length: MAX_SAMPLES + 5 }, (_, i) => i).reduce(
      (acc, cpu) => appendSparklineHistory(acc, [makeProcess({ pid: 1, cpu })]),
      EMPTY_HISTORY
    );
    const cpu = history.get(1)?.cpu ?? [];
    expect(cpu).toHaveLength(MAX_SAMPLES);
    expect(cpu.at(-1)).toBe(MAX_SAMPLES + 4);
    expect(cpu[0]).toBe(5);
  });

  it("drops processes that are gone", () => {
    const first = appendSparklineHistory(EMPTY_HISTORY, [
      makeProcess({ pid: 1 }),
      makeProcess({ pid: 2 }),
    ]);
    const second = appendSparklineHistory(first, [makeProcess({ pid: 2 })]);
    expect(second.has(1)).toBe(false);
    expect(second.get(2)?.cpu).toHaveLength(2);
  });
});

describe("applyStreamTick", () => {
  it("replaces processes and appends a sample", () => {
    const first = applyStreamTick(INITIAL_STREAM_STATE, [makeProcess({ pid: 1, cpu: 1 })]);
    const second = applyStreamTick(first, [makeProcess({ pid: 1, cpu: 2 })]);
    expect(second.processes?.[0].cpu).toBe(2);
    expect(second.history.get(1)?.cpu).toEqual([1, 2]);
  });
});
