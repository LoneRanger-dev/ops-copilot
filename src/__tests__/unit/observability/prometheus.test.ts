import { describe, expect, it } from 'vitest';
import { renderPrometheus } from '@/lib/observability/prometheus';

describe('prometheus renderer', () => {
  it('renders counters in prometheus text format', () => {
    const out = renderPrometheus({ a: 1, b: 2 });
    expect(out).toContain('# HELP ops_copilot_counter Generic counters for ops-copilot');
    expect(out).toContain('ops_copilot_counter{name="a"} 1');
    expect(out).toContain('ops_copilot_counter{name="b"} 2');
  });
});
