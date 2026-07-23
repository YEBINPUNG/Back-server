import { describe, it, expect } from "vitest";
import { ruleBasedAssess } from "../src/modules/risk/rules";
import { TaskFeatures } from "../src/modules/risk/schema";

const baseFeatures: TaskFeatures = {
  daysUntilDue: 10,
  daysSinceLastUpdate: 0,
  assigneeConcurrentTasks: 1,
  elapsedVsEstimate: 0.2,
};

describe("ruleBasedAssess", () => {
  it("여유로운 태스크는 LOW로 판정한다", () => {
    const result = ruleBasedAssess(baseFeatures);
    expect(result.riskLevel).toBe("LOW");
    expect(result.probability).toBeCloseTo(0.05, 5);
  });

  it("마감 임박(2일 이내)은 MEDIUM으로 판정한다", () => {
    const result = ruleBasedAssess({ ...baseFeatures, daysUntilDue: 1 });
    expect(result.riskLevel).toBe("MEDIUM");
    expect(result.probability).toBeCloseTo(0.3, 5);
  });

  it("마감 초과 + 정체 + 과부하 + 예상 초과가 겹치면 HIGH로 판정한다", () => {
    const result = ruleBasedAssess({
      daysUntilDue: -2,
      daysSinceLastUpdate: 6,
      assigneeConcurrentTasks: 5,
      elapsedVsEstimate: 2.0,
    });
    expect(result.riskLevel).toBe("HIGH");
    expect(result.probability).toBeGreaterThanOrEqual(0.6);
    expect(result.probability).toBeLessThanOrEqual(0.95);
  });

  it("마감 초과 시 근거에 경과 일수를 포함한다", () => {
    const result = ruleBasedAssess({ ...baseFeatures, daysUntilDue: -3 });
    const dueReason = result.reasons.find((r) => r.factor === "days_until_due");
    expect(dueReason).toBeDefined();
    expect(dueReason?.note).toContain("3일");
  });

  it("마감일/예상소요가 null이면 해당 근거는 생성하지 않는다", () => {
    const result = ruleBasedAssess({
      daysUntilDue: null,
      daysSinceLastUpdate: 0,
      assigneeConcurrentTasks: 0,
      elapsedVsEstimate: null,
    });
    expect(result.reasons.find((r) => r.factor === "days_until_due")).toBeUndefined();
    expect(result.reasons.find((r) => r.factor === "elapsed_vs_estimate")).toBeUndefined();
    // 항상 기록되는 근거는 유지된다.
    expect(result.reasons.find((r) => r.factor === "days_since_last_update")).toBeDefined();
    expect(result.reasons.find((r) => r.factor === "assignee_concurrent_tasks")).toBeDefined();
  });

  it("확률은 항상 0.05~0.95 범위로 클램프된다", () => {
    const result = ruleBasedAssess({
      daysUntilDue: -100,
      daysSinceLastUpdate: 100,
      assigneeConcurrentTasks: 100,
      elapsedVsEstimate: 100,
    });
    expect(result.probability).toBeLessThanOrEqual(0.95);
    expect(result.probability).toBeGreaterThanOrEqual(0.05);
  });
});
