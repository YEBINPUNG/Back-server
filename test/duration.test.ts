import { describe, it, expect } from "vitest";
import { parseDurationMs } from "../src/lib/duration";

describe("parseDurationMs", () => {
  it("초/분/시/일 단위를 밀리초로 변환한다", () => {
    expect(parseDurationMs("500ms")).toBe(500);
    expect(parseDurationMs("30s")).toBe(30 * 1000);
    expect(parseDurationMs("30m")).toBe(30 * 60 * 1000);
    expect(parseDurationMs("2h")).toBe(2 * 60 * 60 * 1000);
    expect(parseDurationMs("14d")).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it("앞뒤 공백을 허용한다", () => {
    expect(parseDurationMs("  1h ")).toBe(60 * 60 * 1000);
  });

  it("잘못된 형식이면 예외를 던진다", () => {
    expect(() => parseDurationMs("abc")).toThrow();
    expect(() => parseDurationMs("10")).toThrow();
    expect(() => parseDurationMs("10y")).toThrow();
    expect(() => parseDurationMs("")).toThrow();
  });
});
