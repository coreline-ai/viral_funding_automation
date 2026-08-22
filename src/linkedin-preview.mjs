export const LINKEDIN_PREVIEW_SCHEMA_VERSION = "viral-linkedin-preview/v1";
export const LINKEDIN_POST_CHARACTER_LIMIT = 3000;

const SAFE_HANDLE_RE = /^@?[A-Za-z0-9._-]{2,100}$/u;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) {
    return {
      key: "empty",
      label: "대상 언어 원고 없음",
      description: "선택한 언어의 LinkedIn 원고가 없습니다. 원문으로 대체하지 않습니다.",
    };
  }
  if (localeStale || approvalStatus === "invalidated") {
    return {
      key: "stale",
      label: "수정으로 승인 무효",
      description: "현재 원고가 승인 snapshot과 다릅니다. 다시 검토하고 승인하세요.",
    };
  }
  if (approvalStatus === "approved") {
    return {
      key: "approved",
      label: "승인 snapshot과 일치",
      description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다.",
    };
  }
  return {
    key: "candidate",
    label: "후보 · 승인 필요",
    description: "현재 원고는 게시 전 점검용 후보입니다. 실제 게시 전 사람 승인이 필요합니다.",
  };
}

function safeIdentity(value) {
  const raw = String(value ?? "").trim();
  if (!SAFE_HANDLE_RE.test(raw)) {
    return {
      handle: "@preview_account",
      known: false,
      label: "계정 정보 미확인",
      initials: "P",
    };
  }
  const handle = raw.startsWith("@") ? raw : `@${raw}`;
  const initials = handle.slice(1).replace(/[._-]/gu, "").slice(0, 2).toUpperCase() || "P";
  return {
    handle,
    known: true,
    label: "게시 대상 계정",
    initials,
  };
}

function bodyIssues(body) {
  const issues = [];
  if (!body.trim()) {
    issues.push({ code: "EMPTY_FIELD", message: "LinkedIn 게시 본문이 비어 있습니다." });
  }
  const length = Array.from(body).length;
  if (length > LINKEDIN_POST_CHARACTER_LIMIT) {
    issues.push({
      code: "LINKEDIN_LIMIT",
      message: `LinkedIn 게시 본문이 ${LINKEDIN_POST_CHARACTER_LIMIT.toLocaleString("ko-KR")}자를 초과했습니다.`,
      current: length,
      limit: LINKEDIN_POST_CHARACTER_LIMIT,
    });
  }
  return issues;
}

/**
 * Produces a safe local LinkedIn draft-review model. It is intentionally a
 * local visual simulation, accepts no credentials or profile IDs, and never
 * performs DOM/network work.
 */
export function createLinkedInPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  publicHandle = "",
} = {}) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields)
    ? publishFields
    : {};
  const body = typeof fields.body === "string" ? fields.body : "";
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const characterCount = Array.from(body).length;
  const issues = localeAvailable ? bodyIssues(body) : [];
  const content = {
    body,
    characterCount,
    limit: LINKEDIN_POST_CHARACTER_LIMIT,
    remaining: LINKEDIN_POST_CHARACTER_LIMIT - characterCount,
    overLimit: characterCount > LINKEDIN_POST_CHARACTER_LIMIT,
    valid: issues.length === 0,
    issues: deepFreeze(issues),
  };

  return deepFreeze({
    schemaVersion: LINKEDIN_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    identity: deepFreeze(safeIdentity(publicHandle)),
    content: deepFreeze(content),
    settings: deepFreeze({
      audience: "공개 범위 · 게시 직전 확인",
      comments: "댓글 설정 · 게시 직전 확인",
    }),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 LinkedIn 게시 전 줄바꿈·읽기 폭·길이 검토용 로컬 미리보기입니다. 실제 LinkedIn 화면·게시물·게시 예약 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
