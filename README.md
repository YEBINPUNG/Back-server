# 팀 프로젝트 협업·회고 AI 매니저 — 백엔드

회의록에서 태스크를 자동 추출하고, 진척 패턴으로 지연을 사전에 경고하는 협업 도구의 백엔드입니다.
설계서(`design.md` 등 협업 문서) 기준으로 구현되었습니다.

## 기술 스택

Node.js 20 · Express 4 · TypeScript · Prisma · PostgreSQL · JWT(Access+Refresh) · Zod · Anthropic API(Claude) · AWS S3(presigned URL)

## 로컬 실행

### 1. 준비물

- Node.js 20 이상
- PostgreSQL (로컬 또는 Docker)
- Anthropic API 키 (`ANTHROPIC_API_KEY`)

### 2. 설치 및 환경변수

```bash
npm install
cp .env.example .env
# .env를 열어 DATABASE_URL, JWT_*_SECRET, ANTHROPIC_API_KEY 등을 채워 넣는다
```

### 3. DB 마이그레이션 + 시딩

```bash
npm run prisma:migrate   # 최초 마이그레이션 생성/적용
npm run seed              # 데모 계정/프로젝트 시딩
```

### 4. 개발 서버 실행

```bash
npm run dev
# http://localhost:4000/health 로 헬스체크 확인
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | tsx watch로 개발 서버 실행 |
| `npm run build` | TypeScript 빌드 (`dist/`) |
| `npm start` | 빌드된 결과 실행 (프로덕션) |
| `npm run typecheck` | 타입 검사만 수행 |
| `npm run prisma:migrate` | 로컬 마이그레이션 생성/적용 |
| `npm run prisma:deploy` | 운영 마이그레이션 적용 |
| `npm run seed` | 데모 데이터 시딩 |

## 데모 계정 (시딩 후 사용 가능)

공통 비밀번호: `Demo1234!`

| 이메일 | 역할 |
|---|---|
| owner@demo.com | OWNER |
| member@demo.com | MEMBER |
| viewer@demo.com | VIEWER |

로그인 즉시 회의록 → 태스크 추출, 보드, HIGH 위험 태스크를 바로 확인할 수 있도록 더미 프로젝트 1개, 회의록 3건, 태스크 12건이 시딩됩니다.

## 디렉터리 구조

```
src/
├── app.ts / server.ts     # Express 앱 & 엔트리포인트
├── config/                # env 로딩·검증 (zod)
├── middlewares/           # auth, projectRole, validate, errorHandler, rateLimit
├── modules/               # auth, users, projects, meetings, tasks, dashboard, risk
├── lib/                   # prisma, llm(Anthropic), s3, jwt, hash, audit, logger
├── jobs/                  # riskScan.ts (node-cron 일일 위험 스캔)
└── routes/                # 라우터 조립
prisma/
├── schema.prisma
└── seed.ts
```

## 보안 구현 요약

- bcrypt(cost 12) 비밀번호 해시, 평문 로깅 없음
- Access(30분)/Refresh(14일, httpOnly+Secure+SameSite=Strict 쿠키, DB 해시 저장 + 회전) JWT
- 모든 API에서 프로젝트 소속/역할을 서버가 재검증 (`requireProjectRole`), 비소속은 404로 존재 은닉
- Prisma ORM만 사용 (raw query 없음) → SQL 인젝션 방지
- 모든 요청 바디/쿼리 Zod 검증
- LLM 프롬프트 인젝션 3단 방어: 시스템 프롬프트 격리 → tool-use 강제 JSON + Zod 재검증 → 사람 승인(ExtractedTask PENDING→APPROVED) 전까지 Task 미생성
- 로그인 5회/분, LLM 호출 API 10회/분/사용자 rate limit
- 모든 변경은 TaskHistory/AuditLog로 추적, 삭제는 Soft Delete

## 배포

`Dockerfile`은 멀티스테이지 빌드로 프로덕션 이미지를 생성합니다. EC2(Docker) + ALB + RDS(PostgreSQL) + S3 구성을 기준으로 작성되었습니다. 프론트엔드는 S3 + CloudFront로 별도 배포합니다.

필요 환경변수는 `.env.example`을 참고하세요.
