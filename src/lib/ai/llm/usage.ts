import type { ModelInfo } from './models';

/** Token/cost accounting from a usage object (MASTER_BUILD_SPEC.md §23.5 AI task 2). */
export interface Usage {
  readonly promptTokens: number;
  readonly completionTokens: number;
}

export function computeCostUsd(usage: Usage, model: ModelInfo): number {
  const inputCost = (usage.promptTokens / 1000) * model.inputPricePer1k;
  const outputCost = (usage.completionTokens / 1000) * model.outputPricePer1k;
  return Number((inputCost + outputCost).toFixed(6));
}

export function totalTokens(usage: Usage): number {
  return usage.promptTokens + usage.completionTokens;
}
