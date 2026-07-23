# Kiro IDE 인계 문서 — 팀 프로젝트 협업·회고 AI 매니저 백엔드

> 이 저장소는 원본 설계서(`design.md` 성격의 마크다운)를 기준으로 Claude Code에서 1차 구현을 마친 상태입니다.
> 이후 작업은 Kiro IDE에서 이어서 진행합니다. 이 문서는 "무엇이 되어 있고, 무엇이 안 되어 있고, 다음에 뭘 해야 하는지"를 정리한 인계 자료입니다.

---

## 1. 현재 상태 요약

- **타입체크 통과**: `npx tsc --noEmit -p tsconfig.json` 클린 (0 에러)
- **스모크 테스트 완료**: `tsx src/server.ts`로 기동 → `GET /health` 200 응답, `POST /api/v1/auth/signup` 유효성 검증(Zod) 정상 동작 확인. **단, 실제 PostgreSQL 연결 및 Anthropic API 호출은 아직 검증되지 않음** (로컬에 DB/키가 없었음).
- **DB 마이그레이션 미실행**: `prisma/schema.prisma`는 작성되어 있으나 `prisma migrate dev`를 아직 실행한 적 없음 (로컬 Postgres가 없었음). Kiro 환경에서 최초 마이그레이션을 생성해야 함.
- **시드 스크립트 미실행**: `prisma/seed.ts` 작성 완료, 실행 여부 미검증(DB 없어서).
- **테스트 코드 없음**: 단위/통합 테스트는 아직 작성되지 않음 (설계서 로드맵에도 명시적 테스트 단계는 없었음).
- **Docker 빌드 미검증**: `Dockerfile` 작성만 하고 `docker build`는 실행해본 적 없음 (로컬에 Docker 없음).
- **AWS 리소스 없음**: RDS/S3/EC2/ALB/CloudFront 등 실제 인프라는 전혀 프로비저닝되지 않음. 코드상 연동 지점만 준비됨.

## 2. 기술 스택 (설치 완료, `package.json` 참고)

Node.js 20 · Express 4 · TypeScript(strict) · Prisma 5 · PostgreSQL · JWT(access+refresh) · bcrypt · Zod · `@anthropic-ai/sdk` · `@aws-sdk/client-s3` + presigner · `node-cron` · `pino`/`pino-http` · `helmet` · `cors` · `express-rate-limit`

의존성은 이미 `npm install`로 설치되어 `node_modules/`에 존재하지만, Kiro 환경(새 머신/새 클론)에서는 다시 `npm install` 필요.

## 3. 디렉터리 구조 (실제 생성된 파일 기준)

```
prisma/
├── schema.prisma          # 전체 DB 스키마 (User~AuditLog)
└── seed.ts                # 데모 계정 3개 + 프로젝트1 + 회의록3 + 태스크12

src/
├── app.ts                 # Express 앱 조립 (helmet/cors/rate-limit/에러핸들러)
├── server.ts              # 엔트리포인트, cron 등록, graceful shutdown
├── config/env.ts          # Zod 기반 환경변수 검증
├── routes/index.ts        # 전체 라우터 조립 (모듈별 라우터를 /api/v1 하위에 마운트)
├── middlewares/
│   ├── auth.ts            # requireAuth (JWT access 검증)
│   ├── projectRole.ts     # requireProjectRole + 리소스별 resolver (task/meeting/extractedTask)
│   ├── validate.ts        # zod 기반 body/query/params 검증
│   ├── errorHandler.ts    # AppError/ZodError/Prisma 에러 → 통일된 JSON 에러 포맷
│   └── rateLimit.ts       # 로그인/LLM 호출 rate limit
├── lib/
│   ├── prisma.ts, logger.ts, AppError.ts
│   ├── jwt.ts, hash.ts, duration.ts   # 인증 관련 유틸
│   ├── llm.ts              # Anthropic tool-use 호출 래퍼 + zod 재검증 + 프롬프트 인젝션 가드
│   ├── s3.ts                # presigned URL 생성 (업로드/다운로드)
│   └── audit.ts             # AuditLog 기록 헬퍼
├── modules/
│   ├── auth/       # 회원가입/로그인/refresh(회전)/logout
│   ├── users/      # GET /users/me
│   ├── projects/   # 프로젝트 CRUD + 멤버 초대/역할변경/제외 (last-owner 보호 포함)
│   ├── meetings/   # 회의록 CRUD + AI 요약 + AI 태스크 추출 + 승인/거절 플로우
│   ├── tasks/      # 태스크 CRUD + 필드 변경 자동 TaskHistory 기록 + 삭제 권한 분기
│   ├── dashboard/  # 상태별 개수/멤버 부하/진척률/임박·지연 태스크/위험 배지 집계
│   └── risk/       # 피처 계산(features.ts) → 규칙 판정(rules.ts) → LLM 보정(ai.ts) → service
└── jobs/riskScan.ts # node-cron 매일 09:00(Asia/Seoul) 전체 프로젝트 위험 스캔
```

## 4. 아직 구현되지 않았거나 단순화한 부분 (설계서 대비 차이)

Kiro에서 이어갈 때 우선순위를 정하는 데 참고하세요.

| 항목 | 상태 | 비고 |
|---|---|---|
| 파일 업로드 API 라우트 | ❌ 미구현 | `lib/s3.ts`에 presigned URL 생성 함수는 있으나, 이를 노출하는 Express 라우트(`POST /uploads` 등)는 아직 없음. 설계서 6장 API 명세에도 명시적 업로드 엔드포인트가 없어서 lib만 준비해둔 상태. 필요하면 라우트 추가 필요. |
| 무중단 배포 | ❌ 미구현 | 설계서 §9.3에 "추후 과제"로 명시됨. 현재는 단순 pull & 재기동 가정. |
| Github Actions CI/CD 워크플로우 파일 | ❌ 미구현 | `.github/workflows/*.yml` 없음. |
| 테스트 코드 (unit/integration) | ❌ 없음 | 설계서 로드맵에도 별도 단계 없었음. Kiro에서 추가 시 Jest/Vitest 등 선택 필요. |
| ESLint 설정 | ⚠️ 부분적 | `package.json`에 `lint` 스크립트만 있고 실제 `.eslintrc`는 없음. 실행하면 실패함. |
| 실제 DB 마이그레이션 파일 | ❌ 없음 | `prisma/migrations/` 폴더 자체가 없음. `npx prisma migrate dev --name init`을 Kiro 환경(DB 연결 가능한 곳)에서 최초 실행해야 함. |
| Anthropic 실제 호출 검증 | ❌ 미검증 | API 키가 없어 `lib/llm.ts`의 tool-use 호출을 실제로 테스트하지 못함. 모델명은 `.env.example`에 `claude-sonnet-5`로 기본값 지정. |
| AWS 인프라 | ❌ 없음 | RDS/S3/EC2/ALB/CloudFront 전부 미프로비저닝. |
| 회의록 첨부파일 등 부가 기능 | ❌ | 설계서에도 명시되지 않은 범위라 구현 안 함. |

## 5. Kiro에서 바로 이어서 할 일 (우선순위 순)

1. **환경변수 설정**
   - `.env.example`을 `.env`로 복사 후 실제 값 채우기 (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ANTHROPIC_API_KEY` 필수, `S3_BUCKET`/AWS 키는 파일 업로드 기능 만들 때까지는 비워둬도 서버는 기동됨 — 단 `S3_BUCKET` 옵셔널 처리 이미 되어 있음).
2. **DB 준비**
   ```bash
   npm install
   npx prisma migrate dev --name init   # 최초 마이그레이션 생성 + 적용
   npm run seed                          # 데모 데이터 시딩
   ```
3. **개발 서버 기동 후 실사용 검증**
   ```bash
   npm run dev
   ```
   - `owner@demo.com` / `member@demo.com` / `viewer@demo.com` (공통 비밀번호 `Demo1234!`)로 로그인
   - 회의록 요약(`POST /meetings/:id/summarize`)과 태스크 추출(`POST /meetings/:id/extract-tasks`)을 **실제 Anthropic API 키로 처음 호출**해보고, tool-use 응답 스키마가 기대대로 오는지 확인 (SDK 버전/모델명 이슈 있을 수 있음 — 특히 `ANTHROPIC_MODEL` 값이 실제 사용 가능한 모델 ID인지 재확인).
   - 위험 스캔(`POST /projects/:id/risk-scan`) 실행 후 `GET /projects/:id/risks`로 결과 확인.
4. **위 표의 미구현 항목 중 필요한 것부터 채우기** (특히 파일 업로드 라우트, 실제 DB 마이그레이션, 테스트 코드 여부는 Kiro 진행 전에 우선순위를 정하는 게 좋음).
5. **배포 준비**는 인프라(RDS/EC2/S3 등)가 프로비저닝된 이후 진행.

## 6. 데모 계정 (시딩 후)

| 이메일 | 비밀번호 | 역할 |
|---|---|---|
| owner@demo.com | Demo1234! | OWNER |
| member@demo.com | Demo1234! | MEMBER |
| viewer@demo.com | Demo1234! | VIEWER |

시딩되는 더미 프로젝트: 회의록 3건(요약 전/후 혼합), 태스크 12건(TODO/IN_PROGRESS/DONE 혼합, 그 중 "태스크 지연 탐지 로직 구현" 1건은 마감 초과 + HIGH 위험 평가가 미리 부여되어 있어 대시보드/위험 화면을 즉시 시연 가능).

## 7. 참고: 주요 설계 결정 (원본 설계서에 없던 구현 세부사항)

Kiro에서 코드를 읽을 때 "왜 이렇게 했는지" 궁금할 수 있는 부분들입니다.

- **Refresh 토큰 쿠키 경로를 `/api/v1/auth`로 제한**: 다른 API 요청에는 refresh 토큰이 실리지 않도록 최소 노출.
- **비소속 사용자는 프로젝트/태스크/회의록 조회 시 403이 아니라 404**: 설계서 §5 "존재 자체 은닉" 원칙을 그대로 따름.
- **Task 삭제 권한**: Owner는 전체, Member는 `task.assigneeId === req.user.userId`인 경우만 — `middlewares/projectRole.ts`에서 MEMBER 이상만 통과시키고, 실제 "본인 담당인지"는 `modules/tasks/service.ts`의 `canDeleteTask()`에서 재검증.
- **최소 1명 Owner 보장**: 프로젝트 멤버 역할 변경/제외 시 `assertNotLastOwner()`로 마지막 Owner를 강등/제외하지 못하도록 막음 (설계서에 명시되진 않았으나 실무적으로 필요해서 추가).
- **AI 출력 검증 2단 방어**: Anthropic tool-use로 JSON 스키마를 강제한 뒤(1차), 그 결과를 다시 Zod로 파싱(2차)해서 실패 시 1회 재시도 후 에러. (`lib/llm.ts`의 `callLLMTool`)
- **위험도 평가는 LLM 실패에도 항상 동작**: `modules/risk/ai.ts`의 `refineRiskWithLLM`은 실패 시 `null`을 반환하고, `modules/risk/service.ts`가 그 경우 규칙 기반 결과(`rules.ts`)만으로 저장.
- **TaskHistory 자동 기록**: `modules/tasks/service.ts`의 `updateTask()`가 변경 전/후 필드를 비교해서 변경된 필드만 `TaskHistory`에 자동 기록 (요청 바디에 없는 필드는 비교 대상에서 제외).

## 8. 의존성 보안 점검 기록 (2026-07-23)

`npm install` 후 `npm audit` 및 `npm audit fix`를 실행했습니다.

- 결과: 취약점 **4개**가 남아 있음 — moderate 2개, high 1개, critical 1개.
- `npm audit fix` 결과: `up to date` — 호환성을 유지하는 자동 수정은 적용할 수 없었음.
- `tar` 취약점(critical/high): Prisma 계열의 간접 의존성(`@mapbox/node-pre-gyp` → `tar`)에서 발생. 현재 잠금 파일 기준으로 안전한 자동 업데이트 경로가 없음.
- `uuid` 취약점(moderate): `node-cron@3.0.2~3.0.3`의 간접 의존성. `node-cron@4.6.0`으로 올리면 해결 가능하지만, 메이저 버전 변경이라 cron 위험 스캔 동작을 검증해야 함.
- **현재 결정:** `npm audit fix --force`는 실행하지 않음. 강제 업데이트는 `node-cron` 변경으로 기능이 깨질 수 있으므로, 배포 전 별도 브랜치에서 의존성 업그레이드와 위험 스캔 회귀 테스트를 수행할 것.
- 개발 및 DB 연결 작업은 계속 진행 가능. 다만 실제 배포 전에 남은 취약점 해결 여부를 팀과 확인할 것.

## 9. 원본 설계서

이 문서와 함께, 최초 요청 시 제공된 마크다운 설계서(기술 스택 §1, 아키텍처 §2, 디렉터리 §3, DB 스키마 §4, 권한 매트릭스 §5, API 명세 §6, AI 파이프라인 §7, 보안 §8, 배포 §9, 데모 §10, 로드맵 §11)를 함께 참고하세요. 구현은 그 설계서를 1:1로 따르되, 위 §4/§7에서 언급한 지점들만 실무적으로 보강했습니다.
