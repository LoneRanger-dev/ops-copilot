import { NextResponse } from 'next/server';
import { getCounters } from '@/lib/observability/metrics';

export async function GET() {
  return NextResponse.json(getCounters());
}
