export const PRODUCT_HUNT_PREVIEW_SCHEMA_VERSION = "viral-product-hunt-preview/v1";
export const PRODUCT_HUNT_TAGLINE_CHARACTER_LIMIT = 60;
export const PRODUCT_HUNT_DESCRIPTION_CHARACTER_LIMIT = 260;

const SAFE_HANDLE_RE = /^@?[A-Za-z0-9._-]{2,100}$/u;
const SAFE_HTTPS_URL_RE = /^https:\/\/[^\s]+$/iu;
const UNSAFE_TEXT_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;

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

function count(value) {
  return Array.from(value).length;
}

function safeText(value) {
  const raw = plainText(value);
  return UNSAFE_TEXT_RE.test(raw) ? "" : raw;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 Product Hunt 원고가 없습니다. 원문으로 대체하지 않습니다." };
  if (localeStale || approvalStatus === "invalidated") return { key: "stale", label: "수정으로 승인 무효", description: "현재 원고가 승인 snapshot과 다릅니다. 다시 검토하고 승인하세요." };
  if (approvalStatus === "approved") return { key: "approved", label: "승인 snapshot과 일치", description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다." };
  return { key: "candidate", label: "후보 · 승인 필요", description: "현재 원고는 수동 Product Hunt 등록 전 검토용 후보입니다." };
}

function safeIdentity(value) {
  const raw = plainText(value).trim();
  if (!SAFE_HANDLE_RE.test(raw)) return { handle: "@maker_to_confirm", known: false, label: "Maker 계정 확인 필요" };
  return { handle: raw.startsWith("@") ? raw : `@${raw}`, known: true, label: "Maker 계정 후보" };
}

function contentModel(publishFields) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields) ? publishFields : {};
  const raw = Object.fromEntries(["name", "tagline", "description", "firstComment"].map((key) => [key, plainText(fields[key])]));
  const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, safeText(value)]));
  const issues = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!value.trim()) issues.push({ code: `EMPTY_${key.toUpperCase()}`, field: key, message: `${{ name: "제품명", tagline: "태그라인", description: "설명", firstComment: "Maker 첫 댓글" }[key]}이 비어 있습니다.` });
    if (value && !values[key]) issues.push({ code: `UNSAFE_${key.toUpperCase()}`, field: key, message: `${{ name: "제품명", tagline: "태그라인", description: "설명", firstComment: "Maker 첫 댓글" }[key]}에 credential 또는 개인 경로처럼 보이는 값이 있어 미리보기에 표시하지 않습니다.` });
  }
  const taglineLength = count(values.tagline);
  const descriptionLength = count(values.description);
  if (taglineLength > PRODUCT_HUNT_TAGLINE_CHARACTER_LIMIT) issues.push({ code: "PH_TAGLINE_LIMIT", field: "tagline", message: `태그라인이 ${PRODUCT_HUNT_TAGLINE_CHARACTER_LIMIT}자를 초과했습니다.`, current: taglineLength, limit: PRODUCT_HUNT_TAGLINE_CHARACTER_LIMIT });
  if (descriptionLength > PRODUCT_HUNT_DESCRIPTION_CHARACTER_LIMIT) issues.push({ code: "PH_DESCRIPTION_LIMIT", field: "description", message: `설명이 ${PRODUCT_HUNT_DESCRIPTION_CHARACTER_LIMIT}자를 초과했습니다.`, current: descriptionLength, limit: PRODUCT_HUNT_DESCRIPTION_CHARACTER_LIMIT });
  if (/\b(?:upvote|please vote)\b/iu.test(`${values.tagline}\n${values.description}\n${values.firstComment}`)) {
    issues.push({ code: "VOTE_REQUEST", message: "투표 요청 문구는 Product Hunt 원고에서 제거하세요." });
  }
  return { ...values, taglineLength, descriptionLength, issues };
}

function launchReadiness({ authorInputs, operationInputs, productUrlCandidate }) {
  const pricing = safeText(authorInputs?.pricing).trim();
  const topic = safeText(authorInputs?.topic).trim();
  const galleryReferenceRecorded = Boolean(safeText(operationInputs?.galleryAssetId).trim());
  const productUrl = SAFE_HTTPS_URL_RE.test(plainText(productUrlCandidate).trim()) ? plainText(productUrlCandidate).trim() : "";
  const makerConfirmed = operationInputs?.makerAccountConfirmed === true;
  const launchConfirmed = operationInputs?.launchReady === true;
  const items = [
    {
      key: makerConfirmed ? "maker_confirmed" : "maker_required",
      label: makerConfirmed ? "Maker 계정·대표 권한 확인" : "Maker 계정·대표 권한 확인 필요",
      description: makerConfirmed ? "로컬 운영 확인값입니다. 실제 개인 Maker 계정으로 수동 등록하세요." : "Product Hunt 등록에는 개인 계정과 프로젝트 대표 권한을 직접 확인해야 합니다.",
    },
    {
      key: launchConfirmed && productUrl ? "url_candidate_confirmed" : "url_confirmation_required",
      label: launchConfirmed && productUrl ? "제품 URL 후보·공개 상태 확인" : "제품 URL·공개 상태 확인 필요",
      description: productUrl
        ? "검증된 공개 링크를 후보로 표시합니다. 실제 제품 페이지인지 수동 등록 직전에 확인하세요."
        : "검증된 공개 제품 URL 후보가 없습니다. 직접 제품 페이지 URL을 확인하세요.",
      value: productUrl,
    },
    {
      key: pricing ? "pricing_recorded" : "pricing_required",
      label: pricing ? "가격 입력됨" : "가격 입력 필요",
      description: pricing ? "표시된 가격이 현재 제품의 실제 가격과 일치하는지 게시 직전에 확인하세요." : "Free, Paid 또는 Free trial/plan 등 실제 가격 상태를 입력하세요.",
      value: pricing,
    },
    {
      key: topic ? "topic_recorded" : "topic_required",
      label: topic ? "Topic 입력됨" : "Topic 입력 필요",
      description: topic ? "관련성이 가장 높은 소수 Topic인지 수동 등록 화면에서 확인하세요." : "관련성이 가장 높은 Product Hunt Topic을 직접 선택하세요.",
      value: topic,
    },
    {
      key: galleryReferenceRecorded ? "gallery_reference_recorded" : "gallery_required",
      label: galleryReferenceRecorded ? "Gallery 자산 참조 기록됨" : "Thumbnail·Gallery 준비 필요",
      description: galleryReferenceRecorded ? "자산 식별값만 확인했습니다. 실제 등록 화면에서 square thumbnail과 gallery 2개 이상을 직접 확인하세요." : "이 미리보기는 파일을 렌더하지 않습니다. square thumbnail과 gallery 2개 이상을 직접 준비하세요.",
    },
  ];
  return { items, productUrl, ready: makerConfirmed && launchConfirmed && Boolean(pricing) && Boolean(topic) && galleryReferenceRecorded && Boolean(productUrl) };
}

/**
 * Projects Product Hunt publish fields into a local launch-review sheet.
 * It does not submit a product, show rank/votes/reviews, render gallery files,
 * persist asset references, or contact Product Hunt.
 */
export function createProductHuntPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  publicHandle = "",
  authorInputs = {},
  operationInputs = {},
  productUrlCandidate = "",
} = {}) {
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const content = localeAvailable ? contentModel(publishFields) : contentModel({});
  const launch = launchReadiness({ authorInputs, operationInputs, productUrlCandidate });
  const issues = [...content.issues];
  if (!launch.ready) issues.push({ code: "LAUNCH_INPUTS_REQUIRED", message: "가격·Topic·Maker 권한·제품 URL·Thumbnail/Gallery 준비를 모두 확인한 뒤 수동 등록하세요." });
  return deepFreeze({
    schemaVersion: PRODUCT_HUNT_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    identity: deepFreeze(safeIdentity(publicHandle)),
    content: deepFreeze({ ...content, valid: issues.length === 0 }),
    launch: deepFreeze(launch),
    issues: deepFreeze(issues),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 Product Hunt launch field의 읽기 순서와 준비 항목을 검토하는 로컬 미리보기입니다. 실제 Product Hunt 화면·thumbnail/gallery 파일·투표·순위·리뷰·등록·예약 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
