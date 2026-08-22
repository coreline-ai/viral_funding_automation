export const SHOW_HN_PREVIEW_SCHEMA_VERSION = "viral-show-hn-preview/v1";
export const SHOW_HN_MIN_BODY_CHARACTERS = 80;

const SAFE_HTTPS_URL_RE = /^https:\/\/[^\s]+$/iu;
const UNSAFE_TEXT_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;
const SHOW_HN_TITLE_RE = /^show\s+hn\s*:/iu;
const PROMOTIONAL_RE = /(?:upvote|please\s+(?:vote|comment)|best\s+ever|revolutionary|game[ -]?changer)/iu;

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

function safeUrl(value) {
  const candidate = safeText(value).trim();
  return SAFE_HTTPS_URL_RE.test(candidate) ? candidate : "";
}

function contentModel(brief = {}) {
  const raw = {
    title: plainText(brief?.title),
    body: plainText(brief?.body),
    sourceUrl: plainText(brief?.sourceUrl),
    demoUrl: plainText(brief?.demoUrl),
  };
  const title = safeText(raw.title).trim();
  const body = safeText(raw.body).trim();
  const sourceUrl = safeUrl(raw.sourceUrl);
  const demoUrl = safeUrl(raw.demoUrl);
  const issues = [];
  if (!title) issues.push({ code: raw.title ? "TITLE_UNSAFE" : "TITLE_REQUIRED", message: raw.title ? "제목에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." : "작성자가 직접 쓴 Show HN 제목이 필요합니다." });
  else if (!SHOW_HN_TITLE_RE.test(title)) issues.push({ code: "TITLE_PREFIX_REQUIRED", message: "제목은 `Show HN:`으로 시작해야 합니다. 이 앱은 제목을 자동으로 고치지 않습니다." });
  if (!body) issues.push({ code: raw.body ? "BODY_UNSAFE" : "BODY_REQUIRED", message: raw.body ? "본문에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." : "작성자가 직접 쓴 Show HN 설명이 필요합니다." });
  else if (Array.from(body).length < SHOW_HN_MIN_BODY_CHARACTERS) issues.push({ code: "BODY_TOO_SHORT", message: `무엇을 만들었는지, 왜 만들었는지, 무엇이 다른지를 포함해 최소 ${SHOW_HN_MIN_BODY_CHARACTERS}자 이상 직접 작성하세요.` });
  if (raw.sourceUrl.trim() && !sourceUrl) issues.push({ code: "SOURCE_URL_INVALID", message: "원본 URL은 공개 https URL만 표시할 수 있습니다." });
  if (raw.demoUrl.trim() && !demoUrl) issues.push({ code: "DEMO_URL_INVALID", message: "체험 URL은 공개 https URL만 표시할 수 있습니다." });
  if (!sourceUrl) issues.push({ code: "SOURCE_URL_REQUIRED", message: "프로젝트의 원본 source URL을 직접 입력하세요." });
  if (!demoUrl) issues.push({ code: "DEMO_URL_REQUIRED", message: "가입 장벽 없이 체험할 수 있는 공개 demo URL을 직접 입력하세요." });
  if (PROMOTIONAL_RE.test(`${title}\n${body}`)) issues.push({ code: "PROMOTION_LANGUAGE", message: "투표·댓글 요청이나 홍보성 표현을 빼고, 사실·개인적인 동기·기술적 설명으로 직접 다시 쓰세요." });
  return { title, body, sourceUrl, demoUrl, bodyLength: Array.from(body).length, entered: Boolean(raw.title.trim() || raw.body.trim()), issues };
}

function authorGate(brief = {}) {
  const handwritten = brief?.handwrittenConfirmed === true;
  const ownership = brief?.ownershipConfirmed === true;
  const items = [
    {
      key: handwritten ? "handwritten_confirmed" : "handwritten_required",
      label: handwritten ? "직접 작성 확인" : "직접 작성 확인 필요",
      description: handwritten ? "작성자가 이 원고를 직접 작성했고 AI 생성·번역·교정을 사용하지 않았다는 세션 확인값입니다." : "Show HN에 올릴 제목·설명은 작성자가 처음부터 직접 작성해야 합니다. 이 확인은 세션에만 남습니다.",
    },
    {
      key: ownership ? "ownership_confirmed" : "ownership_required",
      label: ownership ? "개인 작업·토론 참여 확인" : "개인 작업·토론 참여 확인 필요",
      description: ownership ? "작성자가 직접 작업했고 게시 후 질문에 참여한다는 세션 확인값입니다." : "프로젝트에 직접 작업했고 댓글 토론에 참여할 수 있는지 작성자가 직접 확인하세요.",
    },
  ];
  return { handwritten, ownership, items, ready: handwritten && ownership };
}

/**
 * Projects only author-entered session text into an original Show HN review
 * sheet. It never reads generated channel fields, calls an LLM, submits a
 * story, opens HN, or exposes votes/comments/account identity.
 */
export function createShowHnPreviewModel({ brief = {} } = {}) {
  const content = contentModel(brief);
  const author = authorGate(brief);
  const issues = [...content.issues];
  if (!author.ready) issues.push({ code: "AUTHOR_CONFIRMATION_REQUIRED", message: "직접 작성과 개인 작업·토론 참여를 모두 작성자가 확인한 뒤에만 수동 제출을 검토하세요." });
  const status = !content.entered
    ? { key: "empty", label: "직접 작성 시작 필요", description: "이 브라우저 세션에서 작성자가 직접 입력한 Show HN 원고만 미리볼 수 있습니다." }
    : issues.length
      ? { key: "needs_input", label: "수동 입력·확인 필요", description: "필수 입력과 직접 작성 확인이 모두 갖춰질 때까지 제출 준비 상태로 보이지 않습니다." }
      : { key: "manual_candidate", label: "작성자 검토 후보", description: "자동 생성물이 아닌 직접 작성 원고입니다. 실제 HN 제출 전 URL과 현재 규칙을 한 번 더 확인하세요." };
  return deepFreeze({
    schemaVersion: SHOW_HN_PREVIEW_SCHEMA_VERSION,
    status: deepFreeze(status),
    content: deepFreeze({ ...content, valid: content.issues.length === 0 }),
    author: deepFreeze(author),
    issues: deepFreeze(issues),
    notice: "이 화면은 Show HN 직접 작성 원고의 읽기 흐름을 확인하는 로컬 미리보기입니다. 실제 Hacker News 화면·계정·투표·댓글·제출·API 요청 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
