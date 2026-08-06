export function renderPrometheus(counters: Record<string, number>): string {
  const lines: string[] = [];
  lines.push('# HELP ops_copilot_counter Generic counters for ops-copilot');
  lines.push('# TYPE ops_copilot_counter counter');
  for (const [k, v] of Object.entries(counters)) {
    const label = `name=\"${k}\"`;
    lines.push(`ops_copilot_counter{${label}} ${v}`);
  }
  return lines.join('\n') + '\n';
}

export function renderPrometheusWithHistograms(
  counters: Record<string, number>,
  histograms: Record<
    string,
    { buckets: number[]; counts: number[]; sum: number; count: number }
  >,
): string {
  const parts: string[] = [];
  parts.push(renderPrometheus(counters));

  // Render histograms with a consistent metric name prefix
  for (const [name, h] of Object.entries(histograms)) {
    const metricBase = `ops_copilot_histogram_${name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    parts.push(`# HELP ${metricBase} Histogram for ${name}`);
    parts.push(`# TYPE ${metricBase} histogram`);
    let cumulative = 0;
    for (let i = 0; i < h.buckets.length; i++) {
      const cnt = h.counts[i] ?? 0;
      cumulative += cnt;
      parts.push(`${metricBase}_bucket{le="${h.buckets[i]}"} ${cumulative}`);
    }
    // +Inf bucket
    parts.push(`${metricBase}_bucket{le="+Inf"} ${h.count}`);
    parts.push(`${metricBase}_sum ${h.sum}`);
    parts.push(`${metricBase}_count ${h.count}`);
  }

  return parts.join('\n') + '\n';
}

export default renderPrometheus;
