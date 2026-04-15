import { describe, it, expect } from "vitest";
import { getDescendantCount } from "../src/lib/child-utils";
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

// DFS pre-order flat tree:
// launchd (1, depth 0)
//   node (2, depth 1)
//     tsx (3, depth 2)
//     worker (4, depth 2)
//   Finder (5, depth 1)
const PROCESSES: ProcessInfo[] = [
  makeProcess({ pid: 1, name: "launchd", depth: 0, has_children: true }),
  makeProcess({ pid: 2, ppid: 1, name: "node", depth: 1, has_children: true }),
  makeProcess({ pid: 3, ppid: 2, name: "tsx", depth: 2 }),
  makeProcess({ pid: 4, ppid: 2, name: "worker", depth: 2 }),
  makeProcess({ pid: 5, ppid: 1, name: "Finder", depth: 1 }),
];

describe("getDescendantCount", () => {
  it("counts direct children", () => {
    const count = getDescendantCount(PROCESSES, new Set([2]));
    // tsx (3) and worker (4) are children of node (2)
    expect(count).toBe(2);
  });

  it("counts nested descendants", () => {
    const count = getDescendantCount(PROCESSES, new Set([1]));
    // node (2), tsx (3), worker (4), Finder (5) are all descendants
    expect(count).toBe(4);
  });

  it("excludes PIDs already in the target set", () => {
    // Kill both node (2) and tsx (3). Only worker (4) is a non-target descendant.
    const count = getDescendantCount(PROCESSES, new Set([2, 3]));
    expect(count).toBe(1);
  });

  it("returns 0 for leaf nodes", () => {
    const count = getDescendantCount(PROCESSES, new Set([3]));
    expect(count).toBe(0);
  });

  it("returns 0 for empty process list", () => {
    const count = getDescendantCount([], new Set([1]));
    expect(count).toBe(0);
  });

  it("returns 0 for empty target set", () => {
    const count = getDescendantCount(PROCESSES, new Set());
    expect(count).toBe(0);
  });
});
