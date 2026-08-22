export const BLUESKY_PREVIEW_SCHEMA_VERSION = "viral-bluesky-preview/v1";
export const BLUESKY_MAX_GRAPHEMES = 300;

export const BLUESKY_LOCALE_OPTIONS = Object.freeze([
  Object.freeze({ value: "unconfirmed", label: "작성 언어 미선택" }),
  Object.freeze({ value: "ko-KR", label: "한국어 (ko-KR)" }),
  Object.freeze({ value: "en-US", label: "English (en-US)" }),
  Object.freeze({ value: "ja-JP", label: "日本語 (ja-JP)" }),
  Object.freeze({ value: "zh-CN", label: "简体中文 (zh-CN)" }),
  Object.freeze({ value: "es-ES", label: "Español (es-ES)" }),
]);

const UNSAFE_BRIEF_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;
const LINK_RE = /https?:\/\/[^\s<>()]+/giu;
const MENTION_RE = /(?:^|[\s(])@([a-z0-9.-]+\.[a-z]{2,})\b/giu;

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

function countGraphemes(value) {
  if (typeof Intl?.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)).length;
  }
  return Array.from(value).length;
}

function utf8ByteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function trimLinkPunctuation(value) {
  return value.replace(/[),.;!?]+$/u, "");
}

function facetCandidates(value) {
  const text = plainText(value);
  const links = Array.from(new Set((text.match(LINK_RE) ?? []).map(trimLinkPunctuation).filter(Boolean)))
    .map((value) => ({ kind: "link", value }));
  const mentions = [];
  for (const match of text.matchAll(MENTION_RE)) mentions.push(`@${match[1]}`);
  return deepFreeze([...links, ...Array.from(new Set(mentions)).map((value) => ({ kind: "mention", value }))]);
}

function localeModel(value) {
  return BLUESKY_LOCALE_OPTIONS.find((option) => option.value === value) ?? BLUESKY_LOCALE_OPTIONS[0];
}

/**
 * Session-only Bluesky short-post review. It detects only local text
 * candidates; it never resolves a handle, builds facets, accesses AT Protocol,
 * or stores an account credential.
 */
export function createBlueskyPreviewModel({ brief = {} } = {}) {
  const source = brief && typeof brief === "object" && !Array.isArray(brief) ? brief : {};
  const rawBody = plainText(source.body);
  const body = safeText(rawBody);
  const locale = localeModel(String(source.locale ?? ""));
  const facets = facetCandidates(rawBody);
  const graphemeCount = countGraphemes(body);
  const utf8Bytes = utf8ByteLength(body);
  const issues = [];
  if (!rawBody.trim()) issues.push({ code: "BODY_REQUIRED", message: "짧은 게시문을 직접 입력하세요." });
  if (rawBody && !body) issues.push({ code: "UNSAFE_BODY", message: "본문에 credential 또는 개인 경로처럼 보이는 값이 있어 미리보기에 표시하지 않습니다." });
  if (locale.value === "unconfirmed") issues.push({ code: "LOCALE_REQUIRED", message: "작성 언어를 선택하세요. 이 선택은 자동 번역이나 계정 설정 변경을 하지 않습니다." });
  if (graphemeCount > BLUESKY_MAX_GRAPHEMES) {
    issues.push({ code: "GRAPHEME_LIMIT", message: `게시문은 ${BLUESKY_MAX_GRAPHEMES} grapheme 이하여야 합니다.` });
  }
  if (facets.length && source.facetsReviewed !== true) {
    issues.push({ code: "FACET_REVIEW_REQUIRED", message: "URL 또는 @handle 후보가 있습니다. 실제 URL·handle·표시 범위를 직접 확인하세요." });
  }
  const empty = !rawBody.trim() && locale.value === "unconfirmed";
  const valid = issues.length === 0;
  return deepFreeze({
    schemaVersion: BLUESKY_PREVIEW_SCHEMA_VERSION,
    status: deepFreeze(empty
      ? { key: "empty", label: "수동 게시문 입력 필요", description: "Bluesky는 생성 채널이 아닙니다. 작성 언어와 짧은 게시문을 직접 입력하세요." }
      : valid
        ? { key: "manual_candidate", label: "수동 검토 후보", description: "이 화면은 로컬 줄바꿈·grapheme·facet 후보 확인용이며 실제 게시 준비 완료 상태가 아닙니다." }
        : { key: "needs_input", label: "입력·링크 확인 필요", description: "아래 항목을 보완한 뒤 실제 Bluesky 게시 화면의 규칙과 계정 상태를 별도로 확인하세요." }),
    content: deepFreeze({
      body,
      graphemeCount,
      graphemeRemaining: BLUESKY_MAX_GRAPHEMES - graphemeCount,
      utf8Bytes,
      valid,
      issues: deepFreeze(issues),
    }),
    locale: deepFreeze({ value: locale.value, label: locale.label, confirmed: locale.value !== "unconfirmed" }),
    facets: deepFreeze({
      candidates: facets,
      reviewed: source.facetsReviewed === true,
      description: facets.length
        ? "아래 후보는 로컬 정규식 진단일 뿐입니다. 실제 handle DID 해석·URL metadata·facet byte offset 계산은 하지 않습니다."
        : "URL 또는 @handle 후보가 없습니다. 실제 게시 시 서식과 링크 표시는 해당 서비스가 결정합니다.",
    }),
    notice: "이 화면은 Bluesky 짧은 게시문의 읽기 폭과 길이·URL/@handle 후보만 확인하는 로컬 미리보기입니다. 실제 Bluesky UI·계정·피드·반응·facet 해석·AT Protocol write 또는 API 요청 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
