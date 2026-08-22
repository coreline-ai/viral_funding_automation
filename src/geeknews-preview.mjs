export const GEEKNEWS_PREVIEW_SCHEMA_VERSION = "viral-geeknews-preview/v1";

const SAFE_HTTPS_URL_RE = /^https:\/\/[^\s]+$/iu;
const UNSAFE_TEXT_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;
const PROMOTION_HEURISTIC_RE = /(?:최고|혁신|지금\s*바로|클릭|best|revolutionary|game[ -]?changer|must[ -]?see)/iu;

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

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 GeekNews Show 원고가 없습니다. 원문으로 대체하지 않습니다." };
  if (localeStale || approvalStatus === "invalidated") return { key: "stale", label: "수정으로 승인 무효", description: "현재 원고가 승인 snapshot과 다릅니다. Show 원고와 직접 등록 조건을 다시 검토하세요." };
  if (approvalStatus === "approved") return { key: "approved", label: "승인 snapshot과 일치", description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다. 실제 GeekNews 등록은 하지 않습니다." };
  return { key: "candidate", label: "Show 원고 후보 · 승인 필요", description: "직접 만든 작업의 Show 등록 전, 제목·설명·공개 체험 조건을 검토하는 후보입니다." };
}

function contentModel(publishFields) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields) ? publishFields : {};
  const rawTitle = plainText(fields.title);
  const rawBody = plainText(fields.body);
  const title = safeText(rawTitle).trim();
  const body = safeText(rawBody).trim();
  const issues = [];
  if (!title) issues.push({ code: rawTitle ? "TITLE_UNSAFE" : "TITLE_REQUIRED", message: rawTitle ? "제목에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." : "GeekNews Show 제목이 비어 있습니다." });
  if (!body) issues.push({ code: rawBody ? "BODY_UNSAFE" : "BODY_REQUIRED", message: rawBody ? "본문에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." : "GeekNews Show 본문이 비어 있습니다." });
  if (title && body && PROMOTION_HEURISTIC_RE.test(`${title}\n${body}`)) {
    issues.push({ code: "PROMOTION_LANGUAGE_REVIEW", message: "반복 홍보·클릭 유도처럼 읽힐 수 있는 표현을 사람의 설명과 실제 한계 중심으로 다시 검토하세요." });
  }
  return { title, body, characterCount: Array.from(`${title}\n${body}`.trim()).length, issues };
}

function readinessModel({ sourceUrl, demoUrl, operationInputs = {}, preflight = {} }) {
  const source = safeUrl(sourceUrl);
  const demo = safeUrl(demoUrl);
  const accountReady = operationInputs?.accountAge === true || preflight?.accountReady === true;
  const showConfirmed = operationInputs?.showCategory === true || preflight?.showCategory === true;
  const rulesReviewed = preflight?.rulesReviewed === true;
  const finalCopyReviewed = preflight?.finalCopyReviewed === true;
  const entries = [
    {
      key: source ? "source_ready" : "source_required",
      label: source ? "원본 저장소 후보 확인" : "원본 저장소 확인 필요",
      description: source ? "이 화면에는 공개 https 저장소 후보만 표시합니다. 실제 등록 URL과 일치하는지 직접 확인하세요." : "직접 만든 작업의 공개 저장소 또는 원본 URL을 확인하세요.",
      value: source,
    },
    {
      key: demo ? "demo_ready" : "demo_required",
      label: demo ? "직접 체험 URL 후보 확인" : "직접 체험 URL 확인 필요",
      description: demo ? "가입·이메일 입력 없이 직접 체험 가능한지 실제 브라우저에서 다시 확인하세요." : "Show에는 소개 페이지만 아닌 직접 체험 가능한 공개 URL을 준비하세요.",
      value: demo,
    },
    {
      key: accountReady ? "account_ready" : "account_required",
      label: accountReady ? "가입 기간 확인" : "가입 후 일주일 확인 필요",
      description: accountReady ? "로컬 확인값입니다. 실제 등록 직전에 계정 상태를 다시 확인하세요." : "스팸 방지 가입 기간을 직접 확인하세요.",
    },
    {
      key: showConfirmed ? "show_confirmed" : "show_required",
      label: showConfirmed ? "Show 유형 확인" : "Show 유형 확인 필요",
      description: showConfirmed ? "직접 만든 서비스·제품·오픈소스는 뉴스가 아닌 Show로 수동 등록합니다." : "직접 만든 작업은 뉴스 등록이 아니라 Show 유형을 직접 선택해야 합니다.",
    },
    {
      key: rulesReviewed ? "rules_reviewed" : "rules_required",
      label: rulesReviewed ? "반복 등록·운영 규칙 확인" : "반복 등록·운영 규칙 확인 필요",
      description: rulesReviewed ? "반복 홍보·짧은 간격 재등록 제한을 포함한 현재 규칙을 로컬에서 확인했습니다." : "반복 등록, 과도한 홍보, 직접 체험 조건을 포함한 최신 운영 규칙을 확인하세요.",
    },
    {
      key: finalCopyReviewed ? "copy_reviewed" : "copy_review_required",
      label: finalCopyReviewed ? "최종 원고 확인" : "최종 원고 확인 필요",
      description: finalCopyReviewed ? "현재 Show 원고를 수동 게시 전에 직접 검토했다는 로컬 기록입니다." : "제목·본문이 실제 작업과 한계만 설명하는지 마지막으로 직접 검토하세요.",
    },
  ];
  return {
    source,
    demo,
    submissionType: "show",
    newsSubmissionEnabled: false,
    entries,
    ready: Boolean(source && demo && accountReady && showConfirmed && rulesReviewed && finalCopyReviewed),
  };
}

/**
 * Projects existing GeekNews title/body fields into a local Show review
 * sheet. It only records a fixed Show intent; it never opens GeekNews,
 * chooses News, creates an account, uploads media, or submits a post.
 */
export function createGeekNewsPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  sourceUrl = "",
  demoUrl = "",
  operationInputs = {},
  preflight = {},
} = {}) {
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const content = localeAvailable ? contentModel(publishFields) : contentModel({});
  const readiness = readinessModel({ sourceUrl, demoUrl, operationInputs, preflight });
  const issues = [...content.issues];
  if (!readiness.ready) {
    issues.push({ code: "SHOW_READINESS_PENDING", message: "공개 원본·직접 체험 URL·가입 기간·Show 유형·반복 등록 규칙·최종 원고를 모두 직접 확인한 뒤 수동 등록하세요." });
  }
  return deepFreeze({
    schemaVersion: GEEKNEWS_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    content: deepFreeze({ ...content, valid: content.issues.length === 0 }),
    readiness: deepFreeze(readiness),
    issues: deepFreeze(issues),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 GeekNews Show의 제목·설명·공개 체험 준비를 확인하는 로컬 미리보기입니다. 실제 GeekNews 화면·계정·뉴스 유형·이미지·점수·댓글·등록·API 요청 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
