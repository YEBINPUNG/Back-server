import { describe, it, expect } from "vitest";
import { sanitizeRawText } from "../src/lib/llm";

describe("sanitizeRawText", () => {
  it("제어 문자를 제거한다", () => {
    const raw = "안녕\u0000하세요\u0007 회의록\u001F입니다";
    const result = sanitizeRawText(raw);
    expect(result).toBe("안녕하세요 회의록입니다");
  });

  it("개행/탭 같은 일반 공백 문자는 보존한다", () => {
    const raw = "첫 줄\n둘째 줄\t탭";
    const result = sanitizeRawText(raw);
    expect(result).toBe("첫 줄\n둘째 줄\t탭");
  });

  it("최대 길이를 초과하면 잘라낸다", () => {
    const raw = "a".repeat(30000);
    const result = sanitizeRawText(raw, 20000);
    expect(result.length).toBe(20000);
  });

  it("최대 길이 이하면 그대로 둔다", () => {
    const raw = "짧은 회의록";
    expect(sanitizeRawText(raw)).toBe(raw);
  });
});
