/**
 * Agent contract (MASTER_BUILD_SPEC.md §10.2). Every agent implements this
 * interface — no bespoke signatures. Agents are pure, independently
 * testable modules: no shared state, no importing each other directly (they
 * compose through the Task Manager, which is Phase 7 scope), no HTTP
 * awareness.
 */
import type { UserRole } from '@/config/constants';
import type { ToolName } from './registry';

export type AgentName =
  | 'planner'
  | 'router'
  | 'task-manager'
  | 'hybrid-rag'
  | 'retriever'
  | 'knowledge-base'
  | 'servicenow'
  | 'incident-analyzer'
  | 'root-cause-analyzer'
  | 'validator'
  | 'risk-analyzer'
  | 'synthesizer'
  | 'memory'
  | 'analytics'
  | 'feedback';

export interface TokenBudget {
  readonly maxTokens: number;
  readonly usedTokens: number;
}

export interface Evidence {
  readonly id: string;
  readonly source: 'kb_chunk' | 'servicenow_incident' | 'conversation_memory';
  readonly sourceId: string;
  readonly excerpt: string;
}

export interface AgentContext {
  readonly traceId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly surface: 'chat' | 'widget';
  readonly conversationId: string | null;
  /** Epoch ms — absolute deadline, not a duration. */
  readonly deadline: number;
  readonly tokenBudget: TokenBudget;
  /** Hard allow-list. The Router (Phase 7) may narrow this further; it can never expand it. */
  readonly allowedTools: readonly ToolName[];
  readonly signal: AbortSignal;
}

export interface AgentError {
  readonly code: string;
  readonly message: string;
}

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
}

export interface AgentResult<T> {
  readonly ok: boolean;
  readonly data: T | null;
  /** Every claim traces to one of these. MUST NOT be empty for an agent making factual claims. */
  readonly evidence: readonly Evidence[];
  readonly confidence: number;
  /** True if the wall-clock deadline or token budget forced an early exit. */
  readonly incomplete: boolean;
  readonly error: AgentError | null;
  readonly usage: TokenUsage;
}

export interface Agent<TIn, TOut> {
  readonly name: AgentName;
  readonly execute: (input: TIn, ctx: AgentContext) => Promise<AgentResult<TOut>>;
}

export function createDeadline(fromNowMs: number): number {
  return Date.now() + fromNowMs;
}

export function isPastDeadline(ctx: Pick<AgentContext, 'deadline'>): boolean {
  return Date.now() > ctx.deadline;
}
