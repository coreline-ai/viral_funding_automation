export const MASTODON_PREVIEW_SCHEMA_VERSION = "viral-mastodon-preview/v1";
export const MASTODON_MAX_LOCAL_LIMIT = 100_000;

export const MASTODON_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ value: "unconfirmed", label: "공개 범위 미선택" }),
  Object.freeze({ value: "public", label: "Public · 공개 피드 후보" }),
  Object.freeze({ value: "unlisted", label: "Quiet public · 공개 피드 제외 후보" }),
  Object.freeze({ value: "private", label: "Followers · 팔로워 공개 후보" }),
  Object.freeze({ value: "direct", label: "Private mention · 수신자 확인 필요" }),
]);

const UNSAFE_BRIEF_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;
const LINK_RE = /https?:\/\/[^\s<>()]+/giu;

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
  const text = plainText(value);
  return UNSAFE_BRIEF_RE.test(text) ? "" : text;
}

function countCharacters(value) {
  return Array.from(value).length;
}

function trimLinkPunctuation(value) {
  return value.replace(/[),.;!?]+$/u, "");
}

function linksIn(value) {
  return Array.from(new Set((plainText(value).match(LINK_RE) ?? []).map(trimLinkPunctuation).filter(Boolean)));
}

function positiveInteger(value) {
  const text = plainText(value).trim();
  if (!text) return { value: null, state: "empty" };
  if (!/^[0-9]+$/u.test(text)) return { value: null, state: "invalid" };
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < 1 || number > MASTODON_MAX_LOCAL_LIMIT) {
    return { value: null, state: "invalid" };
  }
  return { value: number, state: "valid" };
}

function visibilityModel(value) {
  return MASTODON_VISIBILITY_OPTIONS.find((option) => option.value === value) ?? MASTODON_VISIBILITY_OPTIONS[0];
}

function expectedCharacterCount(body, links, urlReserve) {
  if (!links.length || !urlReserve) return countCharacters(body);
  const rawLinkCharacters = links.reduce((total, link) => total + countCharacters(link), 0);
  return countCharacters(body) - rawLinkCharacters + (links.length * urlReserve);
}

/**
 * Session-only Mastodon status review. Instance limits are user-entered notes;
 * no instance endpoint, authentication, account lookup, or write payload exists.
 */
export function createMastodonPreviewModel({ brief = {} } = {}) {
  const source = brief && typeof brief === "object" && !Array.isArray(brief) ? brief : {};
  const raw = {
    instanceAlias: plainText(source.instanceAlias),
    body: plainText(source.body),
    contentWarning: plainText(source.contentWarning),
  };
  const content = {
    instanceAlias: safeText(raw.instanceAlias),
    body: safeText(raw.body),
    contentWarning: safeText(raw.contentWarning),
  };
  const limit = positiveInteger(source.characterLimit);
  const urlReserve = positiveInteger(source.urlReservedCharacters);
  const visibility = visibilityModel(String(source.visibility ?? ""));
  const rawLinks = linksIn(raw.body);
  const links = linksIn(content.body);
  const rawCharacterCount = countCharacters(content.body);
  const expectedCount = expectedCharacterCount(content.body, links, urlReserve.value);
  const issues = [];

  if (!raw.instanceAlias.trim()) issues.push({ code: "INSTANCE_REQUIRED", message: "게시할 Mastodon 인스턴스 별칭을 로컬 표시용으로 입력하세요." });
  if (raw.instanceAlias && !content.instanceAlias) issues.push({ code: "UNSAFE_INSTANCE", message: "인스턴스 별칭에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  if (!raw.body.trim()) issues.push({ code: "BODY_REQUIRED", message: "status 본문을 직접 입력하세요." });
  if (raw.body && !content.body) issues.push({ code: "UNSAFE_BODY", message: "본문에 credential 또는 개인 경로처럼 보이는 값이 있어 미리보기에 표시하지 않습니다." });
  if (raw.contentWarning && !content.contentWarning) issues.push({ code: "UNSAFE_CONTENT_WARNING", message: "content warning에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  if (limit.state === "empty") issues.push({ code: "LIMIT_REQUIRED", message: "선택한 인스턴스에서 확인한 status 문자 상한을 직접 입력하세요." });
  if (limit.state === "invalid") issues.push({ code: "LIMIT_INVALID", message: `문자 상한은 1~${MASTODON_MAX_LOCAL_LIMIT.toLocaleString("en-US")} 사이의 정수여야 합니다.` });
  if (rawLinks.length && urlReserve.state === "empty") issues.push({ code: "URL_RESERVE_REQUIRED", message: "URL이 있습니다. 해당 인스턴스의 URL 예약 문자 수를 직접 확인해 입력하세요." });
  if (urlReserve.state === "invalid") issues.push({ code: "URL_RESERVE_INVALID", message: `URL 예약 문자는 1~${MASTODON_MAX_LOCAL_LIMIT.toLocaleString("en-US")} 사이의 정수여야 합니다.` });
  if (visibility.value === "unconfirmed") issues.push({ code: "VISIBILITY_REQUIRED", message: "공개 범위 후보를 선택하고 실제 계정의 기본 공개 범위를 별도로 확인하세요." });
  if (content.contentWarning && source.contentWarningReviewed !== true) issues.push({ code: "CONTENT_WARNING_REVIEW_REQUIRED", message: "content warning은 본문을 접어 보이게 할 수 있습니다. 실제 표시와 규칙을 직접 확인하세요." });
  if (source.rulesReviewed !== true) issues.push({ code: "RULES_REVIEW_REQUIRED", message: "선택 인스턴스의 규칙과 공개 범위 영향을 직접 확인하세요." });
  if (limit.value && expectedCount > limit.value) {
    issues.push({ code: "CHARACTER_LIMIT", message: `로컬 예상 문자 ${expectedCount.toLocaleString("ko-KR")}자가 입력한 상한 ${limit.value.toLocaleString("ko-KR")}자를 초과합니다.` });
  }

  const empty = !raw.instanceAlias.trim() && !raw.body.trim() && !raw.contentWarning.trim() && limit.state === "empty" && visibility.value === "unconfirmed";
  const valid = issues.length === 0;
  return deepFreeze({
    schemaVersion: MASTODON_PREVIEW_SCHEMA_VERSION,
    status: deepFreeze(empty
      ? { key: "empty", label: "수동 status 입력 필요", description: "Mastodon은 생성 채널이 아닙니다. 인스턴스별 설정과 본문을 직접 입력하세요." }
      : valid
        ? { key: "manual_candidate", label: "수동 검토 후보", description: "이 화면은 로컬 줄바꿈·입력 상한·공개 범위 확인용이며 실제 게시 준비 완료 상태가 아닙니다." }
        : { key: "needs_input", label: "인스턴스·공개 범위 확인 필요", description: "아래 항목을 보완한 뒤 실제 Mastodon 인스턴스의 현재 규칙과 계정 설정을 별도로 확인하세요." }),
    content: deepFreeze({
      ...content,
      rawCharacterCount,
      expectedCharacterCount: expectedCount,
      characterLimit: limit.value,
      characterRemaining: limit.value === null ? null : limit.value - expectedCount,
      urlReservedCharacters: urlReserve.value,
      links: deepFreeze(links),
      valid,
      issues: deepFreeze(issues),
    }),
    visibility: deepFreeze({ value: visibility.value, label: visibility.label, confirmed: visibility.value !== "unconfirmed" }),
    checks: deepFreeze({ rulesReviewed: source.rulesReviewed === true, contentWarningReviewed: source.contentWarningReviewed === true }),
    notice: "이 화면은 Mastodon status의 읽기 폭·입력한 인스턴스 상한·공개 범위·content warning만 확인하는 로컬 미리보기입니다. 실제 Mastodon UI·인스턴스·계정·timeline·reaction·authentication·API 요청 또는 write 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
