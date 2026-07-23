import { PrismaClient, ProjectRole, TaskStatus, ExtractStatus, RiskLevel } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo1234!";
const DAY = 24 * 60 * 60 * 1000;

async function main() {
  console.log("시딩 시작...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: { email: "owner@demo.com", passwordHash, name: "김오너" },
  });
  const member = await prisma.user.upsert({
    where: { email: "member@demo.com" },
    update: {},
    create: { email: "member@demo.com", passwordHash, name: "이멤버" },
  });
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@demo.com" },
    update: {},
    create: { email: "viewer@demo.com", passwordHash, name: "박뷰어" },
  });

  const project = await prisma.project.create({
    data: {
      name: "졸업작품 - 팀 협업 매니저",
      description: "회의록 기반 태스크 자동화 데모 프로젝트",
      dueDate: new Date(Date.now() + 30 * DAY),
      members: {
        create: [
          { userId: owner.id, role: ProjectRole.OWNER },
          { userId: member.id, role: ProjectRole.MEMBER },
          { userId: viewer.id, role: ProjectRole.VIEWER },
        ],
      },
    },
  });

  const now = Date.now();

  // 회의록 3건: 추출 전/후 상태를 섞어 구성한다.
  const meeting1 = await prisma.meetingNote.create({
    data: {
      projectId: project.id,
      authorId: owner.id,
      title: "1차 킥오프 회의",
      rawContent:
        "오늘 회의에서는 프로젝트 범위를 확정했다. 이멤버가 로그인 API를 구현하기로 했고, " +
        "지민이 대시보드 화면을 담당하기로 했다. 다음 회의는 다음 주 월요일.",
      meetingDate: new Date(now - 14 * DAY),
      summary: null, // 아직 AI 요약 실행 전
    },
  });

  const meeting2 = await prisma.meetingNote.create({
    data: {
      projectId: project.id,
      authorId: member.id,
      title: "2차 중간 점검 회의",
      rawContent:
        "지난 주 진행상황을 공유했다. 로그인 API는 완료됐고, 대시보드는 지연 중이라 다음 주까지 " +
        "마무리하기로 했다. 새로운 태스크로 회의록 요약 기능을 추가하기로 논의했다.",
      meetingDate: new Date(now - 7 * DAY),
      summary: "로그인 API 완료, 대시보드 지연 중. 회의록 요약 기능이 신규 태스크로 논의됨.",
    },
  });

  const meeting3 = await prisma.meetingNote.create({
    data: {
      projectId: project.id,
      authorId: owner.id,
      title: "3차 최종 점검 회의",
      rawContent:
        "발표 준비 관련 논의를 진행했다. 시연 시나리오 정리가 필요하고, 배포 환경 점검도 필요하다. " +
        "발표 자료는 이번 주 금요일까지 완성하기로 했다.",
      meetingDate: new Date(now),
      summary: null,
    },
  });

  // 태스크 12건: TODO / 진행중 / 완료 상태를 섞고, HIGH 위험 태스크를 하나 포함한다.
  const tasksData = [
    {
      title: "로그인 API 구현",
      assigneeId: member.id,
      status: TaskStatus.DONE,
      dueDate: new Date(now - 10 * DAY),
      estimatedHours: 8,
      sourceMeetingId: meeting1.id,
    },
    {
      title: "회원가입 API 구현",
      assigneeId: member.id,
      status: TaskStatus.DONE,
      dueDate: new Date(now - 9 * DAY),
      estimatedHours: 6,
      sourceMeetingId: null,
    },
    {
      title: "대시보드 화면 퍼블리싱",
      assigneeId: owner.id,
      status: TaskStatus.IN_PROGRESS,
      dueDate: new Date(now + 1 * DAY),
      estimatedHours: 12,
      sourceMeetingId: meeting1.id,
    },
    {
      title: "회의록 요약 기능 연동",
      assigneeId: member.id,
      status: TaskStatus.IN_PROGRESS,
      dueDate: new Date(now + 2 * DAY),
      estimatedHours: 10,
      sourceMeetingId: meeting2.id,
    },
    {
      title: "태스크 지연 탐지 로직 구현",
      assigneeId: owner.id,
      status: TaskStatus.IN_PROGRESS,
      dueDate: new Date(now - 1 * DAY),
      estimatedHours: 16,
      sourceMeetingId: null,
    },
    {
      title: "발표 자료 초안 작성",
      assigneeId: owner.id,
      status: TaskStatus.TODO,
      dueDate: new Date(now + 5 * DAY),
      estimatedHours: 4,
      sourceMeetingId: meeting3.id,
    },
    {
      title: "시연 시나리오 정리",
      assigneeId: member.id,
      status: TaskStatus.TODO,
      dueDate: new Date(now + 3 * DAY),
      estimatedHours: 3,
      sourceMeetingId: meeting3.id,
    },
    {
      title: "배포 환경 점검",
      assigneeId: owner.id,
      status: TaskStatus.TODO,
      dueDate: new Date(now + 4 * DAY),
      estimatedHours: 5,
      sourceMeetingId: meeting3.id,
    },
    {
      title: "DB 인덱스 최적화",
      assigneeId: member.id,
      status: TaskStatus.TODO,
      dueDate: null,
      estimatedHours: 4,
      sourceMeetingId: null,
    },
    {
      title: "API 문서 정리",
      assigneeId: null,
      status: TaskStatus.TODO,
      dueDate: new Date(now + 10 * DAY),
      estimatedHours: 3,
      sourceMeetingId: null,
    },
    {
      title: "감사 로그 화면 구현",
      assigneeId: owner.id,
      status: TaskStatus.TODO,
      dueDate: new Date(now + 7 * DAY),
      estimatedHours: 6,
      sourceMeetingId: null,
    },
    {
      title: "리스크 배지 UI 적용",
      assigneeId: member.id,
      status: TaskStatus.TODO,
      dueDate: new Date(now + 6 * DAY),
      estimatedHours: 4,
      sourceMeetingId: null,
    },
  ];

  const createdTasks = [];
  for (const data of tasksData) {
    createdTasks.push(await prisma.task.create({ data: { ...data, projectId: project.id } }));
  }

  // "태스크 지연 탐지 로직 구현"에 상태 변경 이력 + HIGH 위험 평가를 부여해 데모 시연에 바로 노출되게 한다.
  const highRiskTask = createdTasks.find((t) => t.title === "태스크 지연 탐지 로직 구현")!;
  await prisma.taskHistory.create({
    data: {
      taskId: highRiskTask.id,
      actorId: owner.id,
      field: "status",
      oldValue: "TODO",
      newValue: "IN_PROGRESS",
      createdAt: new Date(now - 6 * DAY),
    },
  });
  await prisma.taskRiskAssessment.create({
    data: {
      taskId: highRiskTask.id,
      riskLevel: RiskLevel.HIGH,
      probability: 0.82,
      reasons: [
        { factor: "days_until_due", value: -1, note: "마감일이 1일 지났습니다." },
        { factor: "days_since_last_update", value: 6, note: "6일간 상태 변경 없음" },
        { factor: "assignee_concurrent_tasks", value: 4, note: "담당자 동시 진행 4건" },
        { factor: "elapsed_vs_estimate", value: 1.6, note: "예상 소요 대비 160% 경과" },
      ],
    },
  });

  // 회의록1: 추출된 태스크 중 하나는 승인 완료, 하나는 대기 상태로 남겨 승인 플로우를 바로 시연할 수 있게 한다.
  await prisma.extractedTask.create({
    data: {
      meetingNoteId: meeting1.id,
      title: "로그인 API 구현",
      assigneeGuess: "이멤버",
      dueDateGuess: new Date(now - 10 * DAY),
      status: ExtractStatus.APPROVED,
      taskId: createdTasks.find((t) => t.title === "로그인 API 구현")!.id,
    },
  });

  await prisma.extractedTask.create({
    data: {
      meetingNoteId: meeting1.id,
      title: "대시보드 화면 설계",
      assigneeGuess: "지민",
      dueDateGuess: new Date(now + 1 * DAY),
      status: ExtractStatus.PENDING,
    },
  });

  console.log("시딩 완료!");
  console.log(`데모 계정 (공통 비밀번호: ${DEMO_PASSWORD})`);
  console.log("  - owner@demo.com  (OWNER)");
  console.log("  - member@demo.com (MEMBER)");
  console.log("  - viewer@demo.com (VIEWER)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
