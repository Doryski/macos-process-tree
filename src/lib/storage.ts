const PREFIX = "pt:";

export const loadState = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const saveState = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Silently ignore quota errors
  }
};

export const createDebouncedSaver = <T>(key: string, delayMs: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (value: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => saveState(key, value), delayMs);
  };
};
