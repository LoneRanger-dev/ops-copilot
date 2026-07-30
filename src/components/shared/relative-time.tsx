'use client';

import { useEffect, useState } from 'react';

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(seconds) >= secondsInUnit || unit === 'second') {
      return rtf.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return rtf.format(0, 'second');
}

/**
 * Renders a relative timestamp (§23.3 shared components), e.g. "3 hours ago".
 *
 * Computed only after mount — "now" differs between server render time and
 * client hydration time, so rendering the relative string during SSR risks a
 * hydration mismatch. The absolute ISO date is always in the DOM via `title`
 * and as the initial (pre-hydration) text content.
 */
export function RelativeTime({ dateTime }: { dateTime: string }) {
  const [label, setLabel] = useState(() => new Date(dateTime).toLocaleString());

  useEffect(() => {
    setLabel(formatRelative(dateTime));
    const interval = setInterval(() => setLabel(formatRelative(dateTime)), 60_000);
    return () => clearInterval(interval);
  }, [dateTime]);

  return (
    <time dateTime={dateTime} title={new Date(dateTime).toLocaleString()}>
      {label}
    </time>
  );
}
