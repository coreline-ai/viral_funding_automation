export const DISQUIET_PREVIEW_SCHEMA_VERSION = "viral-disquiet-preview/v1";

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

function safeText(value) {
  const raw = plainText(value);
  return UNSAFE_TEXT_RE.test(raw) ? "" : raw;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 Disquiet 원고가 없습니다. 원문으로 대체하지 않습니다." };
  if (localeStale || approvalStatus === "invalidated") return { key: "stale", label: "수정으로 승인 무효", description: "현재 원고가 승인 snapshot과 다릅니다. 다시 검토하고 승인하세요." };
  if (approvalStatus === "approved") return { key: "approved", label: "승인 snapshot과 일치", description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다." };
  return { key: "candidate", label: "후보 · 승인 필요", description: "현재 원고는 수동 Disquiet 제품 등록·연결 포스트 전 검토용 후보입니다." };
}

function contentModel(publishFields) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields) ? publishFields : {};
  const raw = Object.fromEntries(["productName", "tagline", "productLink", "postBody"].map((key) => [key, plainText(fields[key])]));
  const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, safeText(value)]));
  const labels = { productName: "제품명", tagline: "태그라인", productLink: "제품 링크", postBody: "연결 포스트" };
  const issues = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!value.trim()) issues.push({ code: `EMPTY_${key.replace(/[A-Z]/gu, (letter) => `_${letter}`).toUpperCase()}`, field: key, message: `${labels[key]}이 비어 있습니다.` });
    if (value && !values[key]) issues.push({ code: `UNSAFE_${key.replace(/[A-Z]/gu, (letter) => `_${letter}`).toUpperCase()}`, field: key, message: `${labels[key]}에 credential 또는 개인 경로처럼 보이는 값이 있어 미리보기에 표시하지 않습니다.` });
  }
  const productLink = SAFE_HTTPS_URL_RE.test(values.productLink.trim()) ? values.productLink.trim() : "";
  if (values.productLink.trim() && !productLink) {
    issues.push({ code: "PRODUCT_LINK_INVALID", field: "productLink", message: "제품 링크는 공개 https URL 후보만 표시할 수 있습니다." });
  }
  return { ...values, productLink, issues };
}

function productReadiness({ campaignBrief = {}, operationInputs = {}, productLink = "" }) {
  const ownerLike = ["owner", "maintainer"].includes(campaignBrief?.publisherRole) && campaignBrief?.ownershipConfirmed === true;
  const productRegistered = operationInputs?.productRegistered === true;
  const productReviewApproved = operationInputs?.productReviewApproved === true;
  const items = [
    {
      key: ownerLike ? "product_ownership_confirmed" : "product_ownership_required",
      label: ownerLike ? "제품 제작·등록 권한 확인" : "제품 제작·등록 권한 확인 필요",
      description: ownerLike ? "게시자 역할과 관계 확인값이 제품 제작·등록 권한 후보로 기록되었습니다." : "Disquiet에는 본인이 만든 제품만 등록할 수 있습니다. 게시자 역할과 제품 관계를 직접 확인하세요.",
    },
    {
      key: productRegistered ? "product_registered" : "product_registration_required",
      label: productRegistered ? "제품 등록·검토 요청 확인" : "제품 등록·검토 요청 필요",
      description: productRegistered ? "제품을 먼저 등록하고 검토를 요청한 로컬 확인값입니다." : "일반 포스트만 작성하면 메인 피드에 보이지 않을 수 있습니다. 제품을 먼저 등록하고 검토를 요청하세요.",
    },
    {
      key: productReviewApproved ? "product_review_approved" : "product_review_required",
      label: productReviewApproved ? "제품 검토 승인 확인" : "제품 검토 승인 확인 필요",
      description: productReviewApproved ? "제품 검토 승인 상태를 로컬에서 확인했습니다. 실제 서비스 상태는 수동 게시 직전에 다시 보세요." : "등록 후 검토 요청·승인 상태를 직접 확인한 뒤 제품 연결 포스트를 준비하세요.",
    },
    {
      key: productLink ? "product_link_recorded" : "product_link_required",
      label: productLink ? "공개 제품 링크 후보 기록됨" : "공개 제품 링크 확인 필요",
      description: productLink ? "공개 https URL 후보입니다. 실제 등록된 제품과 일치하는지 수동 게시 직전에 확인하세요." : "제품 상세 또는 공개 체험으로 연결되는 https URL을 직접 확인하세요.",
      value: productLink,
    },
  ];
  return { items, ready: ownerLike && productRegistered && productReviewApproved && Boolean(productLink) };
}

/**
 * Projects Disquiet product fields into a local product-first review surface.
 * It never registers or reviews a product, creates a post, opens a login,
 * renders a real account, or contacts Disquiet.
 */
export function createDisquietPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  campaignBrief = {},
  operationInputs = {},
} = {}) {
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const content = localeAvailable ? contentModel(publishFields) : contentModel({});
  const product = productReadiness({ campaignBrief, operationInputs, productLink: content.productLink });
  const issues = [...content.issues];
  if (!product.ready) {
    issues.push({ code: "PRODUCT_CONNECTION_PENDING", message: "제품 제작 권한·제품 등록·검토 승인·공개 링크를 모두 확인한 뒤 연결 포스트를 수동 작성하세요." });
  }
  return deepFreeze({
    schemaVersion: DISQUIET_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    content: deepFreeze({ ...content, valid: issues.length === 0 }),
    product: deepFreeze(product),
    issues: deepFreeze(issues),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 Disquiet의 제품 우선·연결 포스트 구조를 검토하는 로컬 미리보기입니다. 실제 Disquiet 화면·계정·제품 등록·검토·업보트·댓글·게시 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
