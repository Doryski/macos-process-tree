import { describe, it, expect } from "vitest";
import {
  getVisibleRows,
  getDefaultExpandedPids,
  toggleExpanded,
  setAllExpanded,
} from "../src/lib/tree-utils";
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

// A tree like:
// root (1)
//   ├── child-a (2)
//   │   └── grandchild (4)
//   └── child-b (3)
const SAMPLE_TREE: ProcessInfo[] = [
  makeProcess({ pid: 1, depth: 0, has_children: true }),
  makeProcess({ pid: 2, ppid: 1, depth: 1, has_children: true }),
  makeProcess({ pid: 4, ppid: 2, depth: 2, has_children: false }),
  makeProcess({ pid: 3, ppid: 1, depth: 1, has_children: false }),
];

describe("getVisibleRows", () => {
  it("shows all rows when all parents are expanded", () => {
    const expanded = new Set([1, 2]);
    const result = getVisibleRows(SAMPLE_TREE, expanded);
    expect(result.map((r) => r.pid)).toEqual([1, 2, 4, 3]);
  });

  it("hides children of collapsed nodes", () => {
    const expanded = new Set([1]);
    const result = getVisibleRows(SAMPLE_TREE, expanded);
    expect(result.map((r) => r.pid)).toEqual([1, 2, 3]);
  });

  it("hides all children when root is collapsed", () => {
    const expanded = new Set<number>();
    const result = getVisibleRows(SAMPLE_TREE, expanded);
    expect(result.map((r) => r.pid)).toEqual([1]);
  });

  it("handles empty input", () => {
    expect(getVisibleRows([], new Set())).toEqual([]);
  });

  it("handles flat list with no children", () => {
    const flat = [
      makeProcess({ pid: 1, depth: 0 }),
      makeProcess({ pid: 2, depth: 0 }),
    ];
    const result = getVisibleRows(flat, new Set());
    expect(result.map((r) => r.pid)).toEqual([1, 2]);
  });
});

describe("getDefaultExpandedPids", () => {
  it("expands nodes at depth 0 and 1 by default", () => {
    const expanded = getDefaultExpandedPids(SAMPLE_TREE);
    expect(expanded.has(1)).toBe(true);
    expect(expanded.has(2)).toBe(true);
  });

  it("does not expand leaf nodes", () => {
    const expanded = getDefaultExpandedPids(SAMPLE_TREE);
    expect(expanded.has(3)).toBe(false);
    expect(expanded.has(4)).toBe(false);
  });

  it("respects custom maxDepth", () => {
    const expanded = getDefaultExpandedPids(SAMPLE_TREE, 0);
    expect(expanded.has(1)).toBe(true);
    expect(expanded.has(2)).toBe(false);
  });
});

describe("toggleExpanded", () => {
  it("adds PID if not present", () => {
    const result = toggleExpanded(new Set([1]), 2);
    expect(result.has(2)).toBe(true);
    expect(result.has(1)).toBe(true);
  });

  it("removes PID if present", () => {
    const result = toggleExpanded(new Set([1, 2]), 2);
    expect(result.has(2)).toBe(false);
    expect(result.has(1)).toBe(true);
  });
});

describe("setAllExpanded", () => {
  it("returns all parent PIDs when expanding", () => {
    const result = setAllExpanded(SAMPLE_TREE, true);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
    expect(result.size).toBe(2);
  });

  it("returns empty set when collapsing", () => {
    const result = setAllExpanded(SAMPLE_TREE, false);
    expect(result.size).toBe(0);
  });
});
