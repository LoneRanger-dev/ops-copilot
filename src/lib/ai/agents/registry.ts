import type { Surface } from '@/config/constants';
import type { AgentName } from './types';

/**
 * The widget firewall (MASTER_BUILD_SPEC.md §10.3, §1.3, FR-WIDGET-4/5).
 * Three independent layers, each sufficient alone — this module implements
 * layers 1 and 2. Layer 3 (`assertNotWidgetSurface`) is exported here too so
 * every ServiceNow tool and client method can call it, but it is
 * enforced at the call site, not by this registry.
 *
 * **This file will fail review if `WIDGET_AGENTS`/`WIDGET_TOOLS` are ever
 * derived from `CHAT_AGENTS`/`CHAT_TOOLS` by filtering.** They are separate,
 * independently declared lists. A filter bug in a shared derivation would
 * silently widen the widget's reach; two separate literal arrays cannot
 * suffer that failure mode — a mistake in one can only ever be *too
 * narrow*, never too wide.
 */

export const CHAT_AGENTS = [
  'planner',
  'router',
  'task-manager',
  'hybrid-rag',
  'retriever',
  'knowledge-base',
  'servicenow',
  'incident-analyzer',
  'root-cause-analyzer',
  'validator',
  'risk-analyzer',
  'synthesizer',
  'memory',
  'analytics',
  'feedback',
] as const satisfies readonly AgentName[];

/** The widget gets exactly ONE agent. Not a filtered list — a different list. */
export const WIDGET_AGENTS = ['knowledge-base'] as const satisfies readonly AgentName[];

export const CHAT_TOOLS = [
  'kb_search',
  'kb_fetch_document',
  'snow_get_incident',
  'snow_search_incidents',
  'snow_get_similar_incidents',
  'snow_get_sla',
  'analyze_root_cause',
  'assess_risk',
  'escalate_incident',
  'get_conversation_context',
] as const;

export const WIDGET_TOOLS = [
  'kb_search',
] as const satisfies readonly (typeof CHAT_TOOLS)[number][];

export type ToolName = (typeof CHAT_TOOLS)[number];

export interface SurfaceRegistry {
  readonly agents: readonly AgentName[];
  readonly tools: readonly ToolName[];
}

export function getRegistry(surface: Surface): SurfaceRegistry {
  return surface === 'widget'
    ? { agents: WIDGET_AGENTS, tools: WIDGET_TOOLS }
    : { agents: CHAT_AGENTS, tools: CHAT_TOOLS };
}

export class SurfaceViolationError extends Error {
  constructor(tool: string) {
    super(
      `Tool "${tool}" is not reachable from the widget surface. This indicates a registry or routing defect.`,
    );
    this.name = 'SurfaceViolationError';
  }
}

/**
 * Layer 3 defence. MUST be the first statement in every ServiceNow tool and
 * every ServiceNow client method (§10.5.7). Throws rather than returning —
 * a widget request that reaches ServiceNow code is a bug that must be loud.
 */
export function assertNotWidgetSurface(
  ctx: { readonly surface: 'chat' | 'widget' },
  tool: string,
): void {
  if (ctx.surface === 'widget') {
    throw new SurfaceViolationError(tool);
  }
}
