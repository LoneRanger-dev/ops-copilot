const counters = new Map<string, number>();

export function incrCounter(name: string, value = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + value);
}

export function getCounters(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of counters.entries()) out[k] = v;
  return out;
}

export function resetCountersForTests(): void {
  counters.clear();
}

const metrics = { incrCounter, getCounters, resetCountersForTests };
export default metrics;
