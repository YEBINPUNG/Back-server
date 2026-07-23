import { z } from "zod";
import { RiskLevel } from "@prisma/client";

// LLM 원출력은 느슨하게 파싱만 한다. 대소문자/범위 정규화는 ai.ts에서 수행.
export const llmRiskRawSchema = z.object({
  riskLevel: z.string(),
  probability: z.coerce.number(),
  narrative: z.string().nullish(),
});

/** 정규화된 LLM 위험 보정 결과 */
export interface LlmRiskRefinement {
  riskLevel: RiskLevel;
  probability: number;
  narrative: string;
}

export interface TaskFeatures {
  daysUntilDue: number | null;
  daysSinceLastUpdate: number;
  assigneeConcurrentTasks: number;
  elapsedVsEstimate: number | null;
}

export interface FeatureReason {
  factor: string;
  value: number;
  note: string;
}

export interface RuleBasedAssessment {
  riskLevel: RiskLevel;
  probability: number;
  reasons: FeatureReason[];
}
