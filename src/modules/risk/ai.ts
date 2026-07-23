import { Task } from "@prisma/client";
import { callLLMTool } from "../../lib/llm";
import { logger } from "../../lib/logger";
import { llmRiskRefinementSchema, LlmRiskRefinement, RuleBasedAssessment, TaskFeatures } from "./schema";

/**
 * 2차 판정: 피처 값 + 태스크 컨텍스트를 LLM에 넣어 확률을 보정하고 자연어 근거를 생성한다.
 * LLM 호출이 실패하면 null을 반환하여 호출부가 규칙 기반 결과로 폴백하도록 한다 (설계서 §7.2 3단계).
 */
export async function refineRiskWithLLM(
  task: Task,
  features: TaskFeatures,
  ruleAssessment: RuleBasedAssessment
): Promise<LlmRiskRefinement | null> {
  try {
    const context = JSON.stringify({
      task: {
        title: task.title,
        status: task.status,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
      },
      features,
      ruleBasedAssessment: ruleAssessment,
    });

    return await callLLMTool({
      system:
        "너는 팀 프로젝트 태스크의 지연 위험을 평가하는 어시스턴트다. 서버가 계산한 결정적 피처 값과 " +
        "규칙 기반 1차 판정 결과가 주어진다. 이 값들을 참고하여 확률을 미세 조정하고, 왜 위험한지(혹은 " +
        "위험하지 않은지) 한국어 한 문장으로 설명하라. 근거 없이 임의로 확률을 크게 바꾸지 마라.",
      userContent: context,
      toolName: "submit_risk_assessment",
      toolDescription: "태스크 지연 위험 평가 결과를 제출한다.",
      inputSchema: {
        type: "object",
        properties: {
          riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          probability: { type: "number", description: "0.0 ~ 1.0 사이의 지연 확률" },
          narrative: { type: "string", description: "위험 판단에 대한 한국어 설명 한 문장" },
        },
        required: ["riskLevel", "probability", "narrative"],
      },
      outputSchema: llmRiskRefinementSchema,
      maxRetries: 1,
    });
  } catch (err) {
    logger.warn({ err, taskId: task.id }, "LLM 위험도 보정 실패 — 규칙 기반 결과로 폴백");
    return null;
  }
}
