import { z } from "zod";
import { RiskLevel } from "@prisma/client";

export const llmRiskRefinementSchema = z.object({
  riskLevel: z.nativeEnum(RiskLevel),
  probability: z.number().min(0).max(1),
  narrative: z.string().trim().min(1).max(500),
});

export type LlmRiskRefinement = z.infer<typeof llmRiskRefinementSchema>;

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
