import { describe, it, expect } from "vitest";
import {
  togglePid,
  selectRange,
  selectAllPids,
  pruneSelection,
} from "../src/lib/selection";
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
  cmd: [],
  depth: 0,
  has_children: false,
  ...overrides,
});

const ROWS: ProcessInfo[] = [
  makeProcess({ pid: 1 }),
  makeProcess({ pid: 2 }),
  makeProcess({ pid: 3 }),
  makeProcess({ pid: 4 }),
  makeProcess({ pid: 5 }),
];

describe("togglePid", () => {
  it("adds PID to empty selection", () => {
    const result = togglePid(new Set(), 1);
    expect(result.has(1)).toBe(true);
    expect(result.size).toBe(1);
  });

  it("removes PID from selection", () => {
    const result = togglePid(new Set([1, 2]), 1);
    expect(result.has(1)).toBe(false);
    expect(result.has(2)).toBe(true);
  });
});

describe("selectRange", () => {
  it("selects all PIDs between two indices", () => {
    const result = selectRange(new Set(), ROWS, 1, 4);
    expect([...result].sort()).toEqual([1, 2, 3, 4]);
  });

  it("works in reverse direction", () => {
    const result = selectRange(new Set(), ROWS, 4, 1);
    expect([...result].sort()).toEqual([1, 2, 3, 4]);
  });

  it("falls back to toggle when fromPid is null", () => {
    const result = selectRange(new Set(), ROWS, null, 3);
    expect(result.size).toBe(1);
    expect(result.has(3)).toBe(true);
  });

  it("falls back to toggle when fromPid not in rows", () => {
    const result = selectRange(new Set(), ROWS, 99, 3);
    expect(result.size).toBe(1);
    expect(result.has(3)).toBe(true);
  });

  it("preserves existing selection", () => {
    const result = selectRange(new Set([5]), ROWS, 1, 2);
    expect(result.has(5)).toBe(true);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
  });
});

describe("selectAllPids", () => {
  it("selects all visible PIDs", () => {
    const result = selectAllPids(ROWS);
    expect(result.size).toBe(5);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("pruneSelection", () => {
  it("removes PIDs not in valid set", () => {
    const result = pruneSelection(new Set([1, 2, 3]), new Set([1, 3]));
    expect(result.size).toBe(2);
    expect(result.has(2)).toBe(false);
  });

  it("preserves referential identity when no pruning needed", () => {
    const selection = new Set([1, 2]);
    const result = pruneSelection(selection, new Set([1, 2, 3]));
    expect(result).toBe(selection);
  });

  it("returns new set when pruning is needed", () => {
    const selection = new Set([1, 2, 99]);
    const result = pruneSelection(selection, new Set([1, 2]));
    expect(result).not.toBe(selection);
    expect(result.size).toBe(2);
  });
});
