import { describe, it, expect } from "vitest";
import { filterProcesses } from "../src/lib/filter";
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

const PROCESSES: ProcessInfo[] = [
  makeProcess({ pid: 1, name: "launchd", has_children: true }),
  makeProcess({ pid: 2, ppid: 1, name: "node", depth: 1, has_children: true }),
  makeProcess({
    pid: 3,
    ppid: 2,
    name: "tsx",
    depth: 2,
    exe: "/usr/local/bin/tsx",
  }),
  makeProcess({ pid: 4, ppid: 1, name: "Finder", depth: 1 }),
  makeProcess({ pid: 5, ppid: 1, name: "Safari", depth: 1 }),
];

describe("filterProcesses", () => {
  it("returns all processes with isDirectMatch:true when query is empty", () => {
    const result = filterProcesses(PROCESSES, "");
    expect(result).toHaveLength(5);
    expect(result.every((p) => p.isDirectMatch)).toBe(true);
  });

  it("filters by process name", () => {
    const result = filterProcesses(PROCESSES, "node");
    const pids = result.map((r) => r.pid);
    expect(pids).toContain(2);
  });

  it("preserves ancestor paths", () => {
    const result = filterProcesses(PROCESSES, "tsx");
    const pids = result.map((r) => r.pid);
    // tsx (3) matches directly, node (2) and launchd (1) are ancestors
    expect(pids).toContain(3);
    expect(pids).toContain(2);
    expect(pids).toContain(1);
    // Finder and Safari should not be included
    expect(pids).not.toContain(4);
    expect(pids).not.toContain(5);
  });

  it("marks ancestors as not direct matches", () => {
    const result = filterProcesses(PROCESSES, "tsx");
    const tsx = result.find((r) => r.pid === 3);
    const node = result.find((r) => r.pid === 2);
    const launchd = result.find((r) => r.pid === 1);

    expect(tsx?.isDirectMatch).toBe(true);
    expect(node?.isDirectMatch).toBe(false);
    expect(launchd?.isDirectMatch).toBe(false);
  });

  it("supports regex patterns", () => {
    const result = filterProcesses(PROCESSES, "^(Finder|Safari)$");
    const pids = result.map((r) => r.pid);
    expect(pids).toContain(4);
    expect(pids).toContain(5);
    expect(pids).toContain(1); // ancestor
  });

  it("handles invalid regex gracefully (falls back to literal)", () => {
    const result = filterProcesses(PROCESSES, "[invalid");
    // Should not throw, treats as literal string
    expect(result).toBeDefined();
  });

  it("searches by PID", () => {
    const result = filterProcesses(PROCESSES, "^3$");
    expect(result.find((r) => r.pid === 3)?.isDirectMatch).toBe(true);
  });

  it("searches by exe path", () => {
    const result = filterProcesses(PROCESSES, "usr/local");
    expect(result.find((r) => r.pid === 3)?.isDirectMatch).toBe(true);
  });

  it("is case insensitive", () => {
    const result = filterProcesses(PROCESSES, "finder");
    expect(result.find((r) => r.pid === 4)?.isDirectMatch).toBe(true);
  });

  it("defaults to regex mode", () => {
    const result = filterProcesses(PROCESSES, "^node$");
    expect(result.find((r) => r.pid === 2)?.isDirectMatch).toBe(true);
  });

  describe("includeSubprocesses", () => {
    const DEEP_PROCESSES: ProcessInfo[] = [
      makeProcess({ pid: 1, name: "launchd", has_children: true }),
      makeProcess({
        pid: 2,
        ppid: 1,
        name: "node",
        depth: 1,
        has_children: true,
      }),
      makeProcess({ pid: 3, ppid: 2, name: "tsx", depth: 2, has_children: true }),
      makeProcess({ pid: 6, ppid: 3, name: "worker", depth: 3 }),
      makeProcess({ pid: 4, ppid: 1, name: "Finder", depth: 1 }),
      makeProcess({ pid: 5, ppid: 1, name: "Safari", depth: 1 }),
    ];

    it("includes children of direct matches", () => {
      const result = filterProcesses(PROCESSES, "node", "regex", true);
      const pids = result.map((r) => r.pid);
      expect(pids).toContain(2); // direct match
      expect(pids).toContain(3); // child (tsx)
      expect(pids).toContain(1); // ancestor (launchd)
    });

    it("marks descendants as not direct matches", () => {
      const result = filterProcesses(PROCESSES, "node", "regex", true);
      expect(result.find((r) => r.pid === 2)?.isDirectMatch).toBe(true);
      expect(result.find((r) => r.pid === 3)?.isDirectMatch).toBe(false);
    });

    it("includes recursive descendants", () => {
      const result = filterProcesses(DEEP_PROCESSES, "node", "regex", true);
      const pids = result.map((r) => r.pid);
      expect(pids).toContain(3); // child
      expect(pids).toContain(6); // grandchild (worker)
      expect(result.find((r) => r.pid === 6)?.isDirectMatch).toBe(false);
    });

    it("preserves ancestors alongside descendants", () => {
      const result = filterProcesses(DEEP_PROCESSES, "tsx", "regex", true);
      const pids = result.map((r) => r.pid);
      expect(pids).toContain(1); // ancestor
      expect(pids).toContain(2); // ancestor
      expect(pids).toContain(3); // direct match
      expect(pids).toContain(6); // descendant
    });

    it("does not include descendants when toggle is off", () => {
      const result = filterProcesses(PROCESSES, "node", "regex", false);
      const pids = result.map((r) => r.pid);
      expect(pids).toContain(2); // direct match
      expect(pids).not.toContain(3); // child excluded
    });

    it("has no effect on empty query", () => {
      const result = filterProcesses(PROCESSES, "", "regex", true);
      expect(result).toHaveLength(5);
      expect(result.every((p) => p.isDirectMatch)).toBe(true);
    });

    it("keeps isDirectMatch true when descendant also matches directly", () => {
      const result = filterProcesses(DEEP_PROCESSES, "node|tsx", "regex", true);
      expect(result.find((r) => r.pid === 2)?.isDirectMatch).toBe(true);
      expect(result.find((r) => r.pid === 3)?.isDirectMatch).toBe(true);
      // worker is a descendant of both matches but not a direct match
      expect(result.find((r) => r.pid === 6)?.isDirectMatch).toBe(false);
    });

    it("works with fuzzy mode", () => {
      const result = filterProcesses(PROCESSES, "node", "fuzzy", true);
      const pids = result.map((r) => r.pid);
      expect(pids).toContain(2); // direct match
      expect(pids).toContain(3); // descendant
    });
  });

  describe("fuzzy mode", () => {
    it("finds fuzzy matches", () => {
      const result = filterProcesses(PROCESSES, "nde", "fuzzy");
      expect(result.find((r) => r.pid === 2)?.isDirectMatch).toBe(true);
    });

    it("preserves ancestor paths in fuzzy mode", () => {
      const result = filterProcesses(PROCESSES, "tsx", "fuzzy");
      const pids = result.map((r) => r.pid);
      expect(pids).toContain(3); // direct match
      expect(pids).toContain(2); // ancestor (node)
      expect(pids).toContain(1); // ancestor (launchd)
    });

    it("marks ancestors as not direct matches in fuzzy mode", () => {
      const result = filterProcesses(PROCESSES, "tsx", "fuzzy");
      expect(result.find((r) => r.pid === 3)?.isDirectMatch).toBe(true);
      expect(result.find((r) => r.pid === 2)?.isDirectMatch).toBe(false);
      expect(result.find((r) => r.pid === 1)?.isDirectMatch).toBe(false);
    });

    it("returns all processes with empty query in fuzzy mode", () => {
      const result = filterProcesses(PROCESSES, "", "fuzzy");
      expect(result).toHaveLength(5);
      expect(result.every((p) => p.isDirectMatch)).toBe(true);
    });
  });
});
