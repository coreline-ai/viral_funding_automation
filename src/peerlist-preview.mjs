export const PEERLIST_PREVIEW_SCHEMA_VERSION = "viral-peerlist-preview/v1";

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

function safeText(value) {
  const raw = plainText(value);
  return UNSAFE_TEXT_RE.test(raw) ? "" : raw;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 Peerlist 원고가 없습니다. 원문으로 대체하지 않습니다." };
  if (localeStale || approvalStatus === "invalidated") return { key: "stale", label: "수정으로 승인 무효", description: "현재 원고가 승인 snapshot과 다릅니다. 다시 검토하고 승인하세요." };
  if (approvalStatus === "approved") return { key: "approved", label: "승인 snapshot과 일치", description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다." };
  return { key: "candidate", label: "후보 · 승인 필요", description: "현재 원고는 수동 Peerlist Launchpad 등록 전 검토용 후보입니다." };
}

function safeIdentity(value) {
  const raw = plainText(value).trim();
  if (!SAFE_HANDLE_RE.test(raw)) return { handle: "@maker_to_confirm", known: false, label: "공개 maker handle 확인 필요" };
  return { handle: raw.startsWith("@") ? raw : `@${raw}`, known: true, label: "공개 maker handle 후보" };
}

function contentModel(publishFields) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields) ? publishFields : {};
  const raw = Object.fromEntries(["name", "tagline", "comment"].map((key) => [key, plainText(fields[key])]));
  const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, safeText(value)]));
  const labels = { name: "프로젝트명", tagline: "태그라인", comment: "Maker 댓글" };
  const issues = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!value.trim()) issues.push({ code: `EMPTY_${key.toUpperCase()}`, field: key, message: `${labels[key]}이 비어 있습니다.` });
    if (value && !values[key]) issues.push({ code: `UNSAFE_${key.toUpperCase()}`, field: key, message: `${labels[key]}에 credential 또는 개인 경로처럼 보이는 값이 있어 미리보기에 표시하지 않습니다.` });
  }
  if (/\b(?:upvote|please\s+recommend|recommend\s+us)\b/iu.test(`${values.tagline}\n${values.comment}`)) {
    issues.push({ code: "UPVOTE_REQUEST", message: "추천·upvote 요청 문구는 Peerlist 원고에서 제거하세요." });
  }
  return { ...values, issues };
}

function launchReadiness(operationInputs = {}) {
  const individualProfileConfirmed = operationInputs?.individualProfileConfirmed === true;
  const profileVerified = operationInputs?.profileVerified === true;
  const projectCompleteConfirmed = operationInputs?.projectCompleteConfirmed === true;
  const coverRecorded = Boolean(safeText(operationInputs?.coverAssetId).trim());
  const demoUrl = SAFE_HTTPS_URL_RE.test(plainText(operationInputs?.demoUrl).trim()) ? plainText(operationInputs.demoUrl).trim() : "";
  const launchMonday = operationInputs?.launchMonday === true;
  const items = [
    {
      key: individualProfileConfirmed ? "individual_profile_confirmed" : "individual_profile_required",
      label: individualProfileConfirmed ? "개인 profile 조건 확인" : "개인 profile 조건 확인 필요",
      description: individualProfileConfirmed ? "유효한 이름·사진을 가진 개인 profile인지 로컬 확인값으로 기록했습니다." : "회사 profile이 아닌 개인 profile과 이름·사진 조건을 직접 확인하세요.",
    },
    {
      key: profileVerified ? "profile_verified" : "profile_verification_required",
      label: profileVerified ? "Verified profile 확인" : "Verified profile 확인 필요",
      description: profileVerified ? "Verified 상태는 수동 launch 전 다시 확인하세요." : "Launchpad 등록 전 Verified Peerlist Profile인지 직접 확인하세요.",
    },
    {
      key: projectCompleteConfirmed ? "project_complete_confirmed" : "project_complete_required",
      label: projectCompleteConfirmed ? "프로젝트 100% 완료 확인" : "프로젝트 100% 완료 확인 필요",
      description: projectCompleteConfirmed ? "필수 프로젝트 필드가 완성됐다는 로컬 확인값입니다." : "프로필에 추가한 프로젝트의 필수 항목과 100% completion을 직접 확인하세요.",
    },
    {
      key: coverRecorded ? "cover_reference_recorded" : "cover_required",
      label: coverRecorded ? "Cover 자산 참조 기록됨" : "Cover image 준비 필요",
      description: coverRecorded ? "자산 식별값만 확인했습니다. 이 화면은 cover 파일을 렌더하지 않습니다." : "필수 cover image를 준비하고 프로젝트 등록 화면에서 직접 확인하세요.",
    },
    {
      key: demoUrl ? "demo_url_recorded" : "demo_url_required",
      label: demoUrl ? "공개 Demo URL 기록됨" : "공개 Demo URL 확인 필요",
      description: demoUrl ? "공개 URL 후보입니다. 실제 프로젝트 페이지의 demo link인지 수동 등록 직전에 확인하세요." : "프로젝트에 연결할 공개 https demo URL을 직접 확인하세요.",
      value: demoUrl,
    },
    {
      key: launchMonday ? "launch_day_confirmed" : "launch_day_required",
      label: launchMonday ? "Launch day 확인" : "Launch day 확인 필요",
      description: launchMonday ? "월요일 launch eligibility를 로컬에서 확인했습니다. schedule 생성은 이 화면의 범위가 아닙니다." : "월요일 launch eligibility 또는 수동 scheduling 조건을 직접 확인하세요.",
    },
  ];
  return {
    items,
    demoUrl,
    ready: individualProfileConfirmed && profileVerified && projectCompleteConfirmed && coverRecorded && Boolean(demoUrl) && launchMonday,
  };
}

/**
 * Projects Peerlist publish fields into a local Launchpad review surface.
 * It does not access a profile, schedule or launch a project, contact Peerlist,
 * render cover files, or create votes, ranks, reactions, or an actual maker identity.
 */
export function createPeerlistPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  publicHandle = "",
  operationInputs = {},
} = {}) {
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const content = localeAvailable ? contentModel(publishFields) : contentModel({});
  const launch = launchReadiness(operationInputs);
  const issues = [...content.issues];
  if (!launch.ready) issues.push({ code: "LAUNCH_REQUIREMENTS_PENDING", message: "개인 Verified profile·100% 완료 프로젝트·cover·demo·launch day를 모두 확인한 뒤 수동 등록하세요." });
  return deepFreeze({
    schemaVersion: PEERLIST_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    identity: deepFreeze(safeIdentity(publicHandle)),
    content: deepFreeze({ ...content, valid: issues.length === 0 }),
    launch: deepFreeze(launch),
    issues: deepFreeze(issues),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 Peerlist Launchpad field의 읽기 순서와 준비 항목을 검토하는 로컬 미리보기입니다. 실제 Peerlist 화면·profile·cover file·upvote·rank·schedule·launch 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
