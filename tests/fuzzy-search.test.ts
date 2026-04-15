import { describe, it, expect } from "vitest";
import { fuzzyMatchPids } from "../src/lib/fuzzy-search";
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

const PROCESSES: ProcessInfo[] = [
  makeProcess({ pid: 1, name: "launchd" }),
  makeProcess({ pid: 2, name: "node", exe: "/usr/local/bin/node" }),
  makeProcess({ pid: 3, name: "tsx", exe: "/usr/local/bin/tsx" }),
  makeProcess({ pid: 4, name: "Finder" }),
  makeProcess({ pid: 5, name: "Safari" }),
];

describe("fuzzyMatchPids", () => {
  it("finds exact name match", () => {
    const result = fuzzyMatchPids(PROCESSES, "node");
    expect(result.has(2)).toBe(true);
  });

  it("finds fuzzy name match", () => {
    const result = fuzzyMatchPids(PROCESSES, "nod");
    expect(result.has(2)).toBe(true);
  });

  it("finds by exe path", () => {
    const result = fuzzyMatchPids(PROCESSES, "local/bin/node");
    expect(result.has(2)).toBe(true);
  });

  it("finds by stringified PID", () => {
    const result = fuzzyMatchPids(PROCESSES, "4");
    expect(result.has(4)).toBe(true);
  });

  it("returns empty set for no matches", () => {
    const result = fuzzyMatchPids(PROCESSES, "zzzzzzzzxyz");
    expect(result.size).toBe(0);
  });

  it("returns all items for empty query (fuse.js behavior)", () => {
    const result = fuzzyMatchPids(PROCESSES, "");
    expect(result.size).toBe(PROCESSES.length);
  });

  it("is case insensitive", () => {
    const result = fuzzyMatchPids(PROCESSES, "FINDER");
    expect(result.has(4)).toBe(true);
  });
});
