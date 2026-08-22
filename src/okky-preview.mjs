export const OKKY_PREVIEW_SCHEMA_VERSION = "viral-okky-preview/v1";

const UNSAFE_TEXT_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;
const CONTEXTS = Object.freeze({
  unconfirmed: "게시 문맥 직접 확인 필요",
  project_share: "프로젝트 소개·피드백 요청",
  development_story: "개발 경험 공유",
  technical_question: "기술 질문·의견 요청",
});

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function plainText(value) {
  return typeof value === "string" ? value : "";
}

function safeText(value) {
  const raw = plainText(value);
  return UNSAFE_TEXT_RE.test(raw) ? "" : raw;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 OKKY 원고가 없습니다. 원문으로 대체하지 않습니다." };
  if (localeStale || approvalStatus === "invalidated") return { key: "stale", label: "수정으로 승인 무효", description: "현재 원고가 승인 snapshot과 다릅니다. 게시 문맥과 규칙 확인을 다시 검토하세요." };
  if (approvalStatus === "approved") return { key: "approved", label: "승인 snapshot과 일치", description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다." };
  return { key: "candidate", label: "커뮤니티 글 후보 · 승인 필요", description: "국내 개발자 커뮤니티에서 제목·본문·피드백 질문의 읽기 흐름을 검토하는 후보입니다." };
}

function contentModel(publishFields) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields) ? publishFields : {};
  const rawTitle = plainText(fields.title);
  const rawBody = plainText(fields.body);
  const title = safeText(rawTitle).trim();
  const body = safeText(rawBody).trim();
  const issues = [];
  if (!title) issues.push({ code: rawTitle ? "TITLE_UNSAFE" : "TITLE_REQUIRED", message: rawTitle ? "제목에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." : "OKKY 제목이 비어 있습니다." });
  if (!body) issues.push({ code: rawBody ? "BODY_UNSAFE" : "BODY_REQUIRED", message: rawBody ? "본문에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." : "OKKY 본문이 비어 있습니다." });
  const asksForFeedback = /(?:\?|피드백|의견|어떻게|궁금|조언)/iu.test(`${title}\n${body}`);
  if (title && body && !asksForFeedback) issues.push({ code: "FEEDBACK_QUESTION_RECOMMENDED", message: "국내 개발자가 답할 수 있는 한 가지 구체적인 피드백 질문을 직접 넣으세요." });
  return { title, body, characterCount: Array.from(`${title}\n${body}`.trim()).length, asksForFeedback, issues };
}

function contextModel(brief = {}, operationInputs = {}) {
  const key = Object.hasOwn(CONTEXTS, brief?.context) ? brief.context : "unconfirmed";
  const rulesConfirmed = operationInputs?.boardRules === true;
  const items = [
    {
      key: key === "unconfirmed" ? "context_required" : "context_recorded",
      label: key === "unconfirmed" ? "게시 문맥 확인 필요" : "게시 문맥 기록됨",
      description: key === "unconfirmed" ? "실제 글쓰기 화면에서 맞는 게시판·분류를 직접 확인하세요. 이 선택은 로컬 미리보기용이며 실제 OKKY 분류를 지정하지 않습니다." : CONTEXTS[key],
    },
    {
      key: rulesConfirmed ? "rules_confirmed" : "rules_required",
      label: rulesConfirmed ? "게시판 규칙 확인" : "게시판 규칙 확인 필요",
      description: rulesConfirmed ? "현재 글의 실제 게시판 규칙과 커뮤니티 말투를 직접 확인한 로컬 기록입니다. 게시 직전에 다시 확인하세요." : "대상 게시판의 최신 규칙과 상업적 홍보 제한을 직접 확인하세요.",
    },
  ];
  return { key, label: CONTEXTS[key], rulesConfirmed, items, ready: key !== "unconfirmed" && rulesConfirmed };
}

/**
 * Projects existing Korean title/body fields into an original local community
 * review sheet. It never selects a real board, creates an account, renders
 * comments/recommendations, or contacts OKKY.
 */
export function createOkkyPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  operationInputs = {},
  brief = {},
} = {}) {
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const content = localeAvailable ? contentModel(publishFields) : contentModel({});
  const context = contextModel(brief, operationInputs);
  const issues = [...content.issues];
  if (!context.ready) issues.push({ code: "COMMUNITY_CONTEXT_PENDING", message: "게시 문맥과 대상 게시판 규칙을 모두 직접 확인한 뒤 최종 원고를 검토하세요." });
  return deepFreeze({
    schemaVersion: OKKY_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    content: deepFreeze({ ...content, valid: content.issues.length === 0 }),
    context: deepFreeze(context),
    issues: deepFreeze(issues),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 OKKY의 한국어 커뮤니티 글 읽기 흐름을 검토하는 로컬 미리보기입니다. 실제 OKKY 게시판·계정·댓글·추천·제출·API 요청 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
