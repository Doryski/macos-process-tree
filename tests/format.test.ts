import { describe, it, expect } from "vitest";
import { formatBytes, formatCpu } from "../src/lib/format";

describe("formatBytes", () => {
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(157286400)).toBe("150.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });
});

describe("formatCpu", () => {
  it("formats cpu percentage", () => {
    expect(formatCpu(0)).toBe("0.0%");
    expect(formatCpu(50.5)).toBe("50.5%");
    expect(formatCpu(100)).toBe("100.0%");
  });
});
