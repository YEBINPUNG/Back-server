import { RiskLevel } from "@prisma/client";
import { FeatureReason, RuleBasedAssessment, TaskFeatures } from "./schema";

const THRESHOLDS = {
  dueSoonDays: 2,
  staleDays: 5,
  concurrentTasks: 4,
  elapsedVsEstimateRatio: 1.5,
};

const WEIGHTS = {
  overdue: 0.4,
  dueSoon: 0.3,
  overrun: 0.25,
  stale: 0.2,
  overloaded: 0.15,
};

/** 1차 판정: 피처별 임계값 기반 규칙. LLM 장애 시에도 동작하는 폴백 (설계서 §7.2 2단계) */
export function ruleBasedAssess(features: TaskFeatures): RuleBasedAssessment {
  const reasons: FeatureReason[] = [];
  let score = 0;

  if (features.daysUntilDue !== null) {
    if (features.daysUntilDue < 0) {
      score += WEIGHTS.overdue;
      reasons.push({
        factor: "days_until_due",
        value: features.daysUntilDue,
        note: `마감일이 ${Math.abs(features.daysUntilDue)}일 지났습니다.`,
      });
    } else {
      if (features.daysUntilDue <= THRESHOLDS.dueSoonDays) {
        score += WEIGHTS.dueSoon;
      }
      reasons.push({
        factor: "days_until_due",
        value: features.daysUntilDue,
        note: `마감까지 ${features.daysUntilDue}일`,
      });
    }
  }

  if (features.daysSinceLastUpdate >= THRESHOLDS.staleDays) {
    score += WEIGHTS.stale;
  }
  reasons.push({
    factor: "days_since_last_update",
    value: features.daysSinceLastUpdate,
    note: `${features.daysSinceLastUpdate}일간 상태 변경 없음`,
  });

  if (features.assigneeConcurrentTasks >= THRESHOLDS.concurrentTasks) {
    score += WEIGHTS.overloaded;
  }
  reasons.push({
    factor: "assignee_concurrent_tasks",
    value: features.assigneeConcurrentTasks,
    note: `담당자 동시 진행 ${features.assigneeConcurrentTasks}건`,
  });

  if (features.elapsedVsEstimate !== null) {
    if (features.elapsedVsEstimate >= THRESHOLDS.elapsedVsEstimateRatio) {
      score += WEIGHTS.overrun;
    }
    reasons.push({
      factor: "elapsed_vs_estimate",
      value: features.elapsedVsEstimate,
      note: `예상 소요 대비 ${Math.round(features.elapsedVsEstimate * 100)}% 경과`,
    });
  }

  const probability = Math.min(0.95, Math.max(0.05, Number(score.toFixed(2))));
  const riskLevel: RiskLevel = probability >= 0.6 ? "HIGH" : probability >= 0.3 ? "MEDIUM" : "LOW";

  return { riskLevel, probability, reasons };
}
