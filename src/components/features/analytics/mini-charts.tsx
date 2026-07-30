interface BarDatum {
  readonly label: string;
  readonly value: number;
}

/** Minimal dependency-free bar chart — no charting library added for this demo scope. */
export function MiniBarChart({
  data,
  unit = '',
}: {
  data: readonly BarDatum[];
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="text-muted-foreground text-xs">
            {d.value}
            {unit}
          </div>
          <div
            className="bg-primary w-full rounded-t-sm"
            style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
          />
          <div className="text-muted-foreground text-[11px]">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Minimal dependency-free sparkline, rendered as a single SVG polyline. */
export function Sparkline({
  points,
  className,
}: {
  points: readonly number[];
  className?: string;
}) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = 100 / Math.max(points.length - 1, 1);

  const coords = points
    .map((p, i) => `${i * step},${100 - ((p - min) / range) * 100}`)
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className}>
      <polyline
        points={coords}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
