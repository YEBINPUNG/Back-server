import { callLLMTool, sanitizeRawText } from "../../lib/llm";
import { extractTasksOutputSchema, summarizeOutputSchema, ExtractedTaskDraft } from "./schema";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function summarizeMeetingContent(rawContent: string): Promise<string> {
  const content = sanitizeRawText(rawContent);

  const result = await callLLMTool({
    system:
      "너는 팀 프로젝트 회의록을 정리하는 어시스턴트다. 회의록 원문을 읽고 핵심 논의사항, 결정사항, 다음 액션을 " +
      "간결한 한국어 요약문으로 정리하라. 최대 4000자 이내로 작성하라.",
    userContent: content,
    toolName: "submit_summary",
    toolDescription: "회의록 요약 결과를 제출한다.",
    inputSchema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "회의록 핵심 요약 (한국어, 최대 4000자)" },
      },
      required: ["summary"],
    },
    outputSchema: summarizeOutputSchema,
  });

  return result.summary.trim().slice(0, 4000);
}

export async function extractTasksFromMeetingContent(
  rawContent: string,
  memberNames: string[]
): Promise<ExtractedTaskDraft[]> {
  const content = sanitizeRawText(rawContent);
  const memberHint =
    memberNames.length > 0
      ? `참고로 이 프로젝트의 멤버 이름은 다음과 같다: ${memberNames.join(", ")}. 담당자를 추정할 때 이 목록의 이름을 우선 사용하라.`
      : "";

  const result = await callLLMTool({
    system:
      "너는 팀 프로젝트 회의록에서 할일(태스크)을 추출하는 어시스턴트다. 회의록 원문에서 실제로 결정된 " +
      `할일만 추출하고, 각 항목의 제목, 담당자 추정(텍스트), 마감일 추정(YYYY-MM-DD)을 제시하라. ${memberHint} ` +
      "회의록에 명시되지 않은 담당자나 마감일은 null로 두어라. 할일이 없으면 빈 배열을 반환하라.",
    userContent: content,
    toolName: "submit_extracted_tasks",
    toolDescription: "회의록에서 추출한 태스크 목록을 제출한다.",
    inputSchema: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "태스크 제목" },
              assigneeGuess: { type: ["string", "null"], description: "추정 담당자 이름 (텍스트)" },
              dueDateGuess: { type: ["string", "null"], description: "추정 마감일, YYYY-MM-DD 형식" },
            },
            required: ["title"],
          },
        },
      },
      required: ["tasks"],
    },
    outputSchema: extractTasksOutputSchema,
  });

  // 정규화: 제목 길이 제한, 담당자/마감일 형식 검증(YYYY-MM-DD 아니면 null), 빈 제목 제거
  return result.tasks
    .map((t) => {
      const assignee = (t.assigneeGuess ?? "").trim();
      const due = (t.dueDateGuess ?? "").trim();
      return {
        title: (t.title ?? "").trim().slice(0, 200),
        assigneeGuess: assignee ? assignee.slice(0, 50) : null,
        dueDateGuess: DATE_RE.test(due) ? due : null,
      };
    })
    .filter((t) => t.title.length > 0)
    .slice(0, 50);
}
