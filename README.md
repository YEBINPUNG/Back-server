# 팀 프로젝트 협업·회고 AI 매니저 (백엔드)

회의록에서 할 일을 자동으로 추출하고, 진척 패턴으로 지연을 사전에 경고하는 학생 팀 프로젝트용 협업 도구입니다.

- **서비스 접속 주소**: https://yebinpung.duckdns.org
- **백엔드 저장소**: https://github.com/YEBINPUNG/Back-server
- **프론트엔드 저장소**: https://github.com/YEBINPUNG/Front

## 데모 계정 (회원가입 없이 바로 시연)

공통 비밀번호: `Demo1234!`

| 이메일 | 역할 | 설명 |
|---|---|---|
| owner@demo.com | OWNER | 프로젝트 전체 관리 |
| member@demo.com | MEMBER | 태스크/회의록 작성 |
| viewer@demo.com | VIEWER | 읽기 전용 |

로그인 즉시 더미 프로젝트, 회의록 3건, 태스크 12건이 준비되어 있어 회의록→태스크 추출, 업무 보드, HIGH 위험 태스크를 바로 확인할 수 있습니다.

## 해결하는 문제

학생 팀 프로젝트는 회의에서 나온 결정이 실제 작업으로 추적되지 않아 지연을 사후에만 인지합니다. 이 서비스는 회의록에서 작업을 자동 추출하고, 진척 패턴으로 지연을 사전에 경고합니다.

## 핵심 기능

1. **회의록 기반 태스크 변환** — AI가 회의록 원문에서 할 일/담당자/마감일을 구조화해 정리하고, 사람이 승인하면 실제 태스크로 등록됩니다.
2. **업무 보드 + 진척도 대시보드** — 상태별 집계, 멤버별 부하, 진척률, 마감 임박·지연 태스크를 한눈에 봅니다.
3. **태스크 지연 위험 탐지** — 마감까지 남은 일수, 마지막 변경 후 경과일, 담당자 동시 작업 수, 예상 대비 경과 시간을 근거로 AI가 지연 위험을 예측하고 근거를 제시합니다.

## 기술 스택

Node.js 20 · Express 4 · TypeScript(strict) · Prisma 5 · PostgreSQL(Neon) · JWT(Access+Refresh) · bcrypt · Zod · OpenAI 호환 LLM(Groq) · Docker · Caddy(자동 HTTPS) · AWS EC2

## 아키텍처

```
[브라우저] ─ https ─> [Caddy] ── / ───────> 정적 프론트엔드(React/Vite 빌드)
                        └─ /api ─> [Express API] ─┬─ Prisma ─> PostgreSQL(Neon)
                                                  └─ OpenAI 호환 ─> Groq LLM
```

프론트엔드와 API를 같은 도메인에서 서빙(Caddy)하여 CORS 없이 동작하며, Caddy가 Let's Encrypt로 HTTPS 인증서를 자동 발급/갱신합니다.

## 보안

- 비밀번호 bcrypt(cost 12) 해싱, refresh 토큰은 SHA-256 해시만 저장 + 회전
- 모든 API에서 프로젝트 소속·역할(Owner/Member/Viewer)을 서버가 재검증, 비소속자에게는 존재를 숨기기 위해 404
- Prisma ORM 전용(원시 쿼리 없음)으로 SQL 인젝션 차단, 모든 입력은 Zod로 검증
- LLM 프롬프트 인젝션 방어: 회의록을 데이터로 격리 + 구조화 출력 강제 + 서버 재검증, 추출 태스크는 사람 승인 전까지 실제 태스크 미생성
- 모든 변경은 TaskHistory/AuditLog로 추적, 삭제는 Soft Delete
- 로그인·AI 호출 rate limit

## API 요약

기본 경로: `https://yebinpung.duckdns.org/api/v1` · 인증: `Authorization: Bearer <accessToken>`

| 영역 | 대표 엔드포인트 |
|---|---|
| 인증 | `POST /auth/signup` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout` |
| 사용자 | `GET /users/me` |
| 프로젝트 | `GET/POST /projects` · `GET/PATCH/DELETE /projects/:id` · 멤버 초대/역할/제외 |
| 회의록 | `GET/POST /projects/:id/meetings` · `POST /meetings/:id/summarize` · `POST /meetings/:id/extract-tasks` · 추출 태스크 승인/거절 |
| 태스크 | `GET/POST /projects/:id/tasks` · `GET/PATCH/DELETE /tasks/:id` |
| 대시보드 | `GET /projects/:id/dashboard` |
| 위험 | `POST /projects/:id/risk-scan` · `GET /projects/:id/risks` · `GET /tasks/:id/risks` |
| 감사 로그 | `GET /projects/:id/audit-logs` |
| 파일 | `POST /projects/:id/uploads/presign` · `GET /projects/:id/uploads/download` |

에러 응답 포맷: `{ "error": { "code", "message", "details"? } }`

## 로컬 개발

```bash
npm install
cp .env.example .env      # 값 채우기 (DATABASE_URL, JWT_*_SECRET, LLM_API_KEY)
npx prisma migrate dev    # 최초 스키마 적용
npm run seed              # 데모 데이터 시딩
npm run dev               # http://localhost:4000
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버(tsx watch) |
| `npm run build` / `npm start` | 빌드 / 프로덕션 실행 |
| `npm run typecheck` | 타입 검사 |
| `npm run lint` | ESLint |
| `npm test` | Vitest 단위 테스트 |
| `npm run seed` | 데모 데이터 시딩 |

## 배포 (AWS EC2 + Docker + Caddy)

프론트엔드 빌드 결과를 `../Front/dist`에 두고, EC2에서:

```bash
docker compose up -d --build
```

`docker-compose.yml`이 백엔드(app)와 Caddy를 함께 띄웁니다. Caddy는 `DOMAIN` 환경변수의 도메인으로 HTTPS를 자동 구성하고, `/api`는 백엔드로 프록시하며 그 외 경로는 정적 프론트엔드를 서빙합니다. 데이터베이스는 Neon(PostgreSQL), AI는 Groq(무료 티어)를 사용합니다.
