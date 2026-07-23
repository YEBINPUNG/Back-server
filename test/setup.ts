// 테스트 실행 시 env 검증(src/config/env.ts)이 통과하도록 더미 값을 채운다.
// 실제 .env가 있으면 dotenv가 우선 로드하지만, CI 등 .env가 없는 환경을 위한 폴백이다.
const defaults: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/testdb?schema=public",
  JWT_ACCESS_SECRET: "test-access-secret-1234567890",
  JWT_REFRESH_SECRET: "test-refresh-secret-1234567890",
  LLM_API_KEY: "test-llm-key",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
