import { GET as prometheusGET } from '@/app/api/v1/metrics/prometheus/route';

export async function GET() {
  // Expose same Prometheus-format metrics at /metrics for easier scraping.
  return prometheusGET();
}

export default GET;
