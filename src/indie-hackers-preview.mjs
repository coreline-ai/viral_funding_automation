export const INDIE_HACKERS_PREVIEW_SCHEMA_VERSION = "viral-indie-hackers-preview/v1";

const UNSAFE_TEXT_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;
const FIRST_PERSON_BUILD_RE = /\b(?:I|we)\s+(?:built|made|created|launched)\b/iu;

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
  if (!localeAvailable) return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 Indie Hackers 원고가 없습니다. 원문으로 대체하지 않습니다." };
  if (localeStale || approvalStatus === "invalidated") return { key: "stale", label: "수정으로 승인 무효", description: "현재 원고가 승인 snapshot과 다릅니다. lived-experience 입력과 함께 다시 검토하세요." };
  if (approvalStatus === "approved") return { key: "approved", label: "승인 snapshot과 일치", description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다." };
  return { key: "candidate", label: "토론 후보 · 승인 필요", description: "현재 원고는 실제 Indie Hackers 등록 전, 문제·배움·질문 구조를 검토하는 후보입니다." };
}

function contentModel(publishFields) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields) ? publishFields : {};
  const rawTitle = plainText(fields.title);
  const rawBody = plainText(fields.body);
  const title = safeText(rawTitle);
  const body = safeText(rawBody);
  const issues = [];
  if (!title.trim()) issues.push({ code: "TITLE_REQUIRED", message: "Indie Hackers 제목이 비어 있습니다." });
  if (!body.trim()) issues.push({ code: "BODY_REQUIRED", message: "Indie Hackers 본문이 비어 있습니다." });
  if (rawTitle && !title) issues.push({ code: "TITLE_UNSAFE", message: "제목에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  if (rawBody && !body) issues.push({ code: "BODY_UNSAFE", message: "본문에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  const question = /\?/u.test(`${title}\n${body}`);
  if (title.trim() && body.trim() && !question) issues.push({ code: "QUESTION_RECOMMENDED", message: "독자가 답할 수 있는 한 가지 구체 질문을 제목 또는 본문에 직접 넣으세요." });
  return { title, body, characterCount: Array.from(`${title}\n${body}`.trim()).length, question, issues };
}

function experienceModel({ authorInputs = {}, campaignBrief = {}, content }) {
  const motivation = safeText(authorInputs?.motivation).trim();
  const hardDecision = safeText(authorInputs?.hardDecision).trim();
  const failedApproach = safeText(authorInputs?.failedApproach).trim();
  const ownerLike = ["owner", "maintainer"].includes(campaignBrief?.publisherRole)
    && campaignBrief?.ownershipConfirmed === true;
  const firstPerson = FIRST_PERSON_BUILD_RE.test(`${content.title}\n${content.body}`);
  const issues = [];
  for (const [key, label, value] of [
    ["motivation", "실제 만든 이유", motivation],
    ["hardDecision", "어려웠던 결정", hardDecision],
    ["failedApproach", "포기한 접근", failedApproach],
  ]) {
    if (!value) issues.push({ code: `${key.toUpperCase()}_REQUIRED`, message: `${label}을 직접 입력하세요. 원고에 없는 경험을 자동으로 만들지 않습니다.` });
  }
  if (firstPerson && !ownerLike) issues.push({ code: "OWNERSHIP_UNCONFIRMED", message: "`I/we built` 같은 제작 표현은 owner/maintainer 역할과 작성자 관계 확인 뒤에만 사용하세요." });
  const items = [
    { key: motivation ? "motivation_recorded" : "motivation_required", label: motivation ? "만든 이유 기록됨" : "만든 이유 필요", description: motivation || "프로젝트를 시작한 실제 계기를 작성자가 직접 기록하세요." },
    { key: hardDecision ? "decision_recorded" : "decision_required", label: hardDecision ? "어려웠던 결정 기록됨" : "어려웠던 결정 필요", description: hardDecision || "바꾸거나 포기한 실제 구현 선택을 기록하세요." },
    { key: failedApproach ? "failure_recorded" : "failure_required", label: failedApproach ? "포기한 접근 기록됨" : "포기한 접근 필요", description: failedApproach || "쓰지 않기로 한 실제 접근 또는 한계를 기록하세요." },
    {
      key: firstPerson && !ownerLike ? "ownership_required" : firstPerson ? "ownership_confirmed" : "ownership_not_claimed",
      label: firstPerson && !ownerLike ? "제작 귀속 근거 필요" : firstPerson ? "제작 귀속 근거 확인" : "제작 표현 없음",
      description: firstPerson && !ownerLike
        ? "이 원고에는 1인칭 제작 표현이 있습니다. owner/maintainer 역할과 작성자 관계를 확인하세요."
        : firstPerson ? "1인칭 제작 표현의 역할·관계 근거가 local campaign brief에 있습니다."
          : "이 원고에는 1인칭 제작 표현이 없습니다.",
    },
  ];
  return { motivation, hardDecision, failedApproach, firstPerson, ownerLike, items, issues };
}

/**
 * Projects an Indie Hackers title/body into an original, local discussion
 * review sheet. It never creates an account, group, comment, reaction, or
 * post; author experience remains user-provided typed input only.
 */
export function createIndieHackersPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  authorInputs = {},
  campaignBrief = {},
} = {}) {
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const content = localeAvailable ? contentModel(publishFields) : contentModel({});
  const experience = experienceModel({ authorInputs, campaignBrief, content });
  return deepFreeze({
    schemaVersion: INDIE_HACKERS_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    content: deepFreeze({ ...content, valid: content.issues.length === 0 }),
    experience: deepFreeze(experience),
    issues: deepFreeze([...content.issues, ...experience.issues]),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 Indie Hackers의 문제·배움·질문 흐름을 검토하는 로컬 미리보기입니다. 실제 Indie Hackers 계정·그룹·게시물·반응·댓글·등록 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
