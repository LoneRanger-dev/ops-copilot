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

export default renderPrometheus;
