const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";

  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${UNITS[unitIndex]}`;
};

export const formatCpu = (cpu: number) => `${cpu.toFixed(1)}%`;
