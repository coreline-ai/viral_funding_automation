export const REDDIT_PREVIEW_SCHEMA_VERSION = "viral-reddit-preview/v1";

const SAFE_COMMUNITY_RE = /^r\/[A-Za-z0-9_]{2,100}$/u;
const SAFE_HTTPS_URL_RE = /^https:\/\/[^\s]+$/iu;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
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
  if (!localeAvailable) return { key: "empty", label: "대상 언어 자료 없음", description: "선택한 언어의 Reddit 참고 자료가 없습니다. 원문으로 대체하지 않습니다." };
  if (localeStale || approvalStatus === "invalidated") return { key: "stale", label: "수정으로 승인 무효", description: "현재 참고 자료가 승인 snapshot과 다릅니다. 직접 작성 초안도 다시 검토하세요." };
  return { key: "reference", label: "참고 자료 · 직접 작성 필요", description: "Reddit 제목·본문은 자동 생성하지 않습니다. 확인된 사실을 참고해 작성자가 직접 입력하세요." };
}

function factsModel(publishFields) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields) ? publishFields : {};
  const rawFacts = fields.facts;
  const rawText = plainText(rawFacts);
  const factRecord = rawFacts && typeof rawFacts === "object" && !Array.isArray(rawFacts) ? rawFacts : null;
  const safeLines = factRecord
    ? [
      ["프로젝트명", safeText(factRecord.name)],
      ["프로젝트 설명", safeText(factRecord.description)],
      ["공개 데모", safeText(factRecord.demoUrl)],
      ["소스", safeText(factRecord.repositoryUrl)],
      ["라이선스", safeText(factRecord.license)],
      ...((Array.isArray(factRecord.features) ? factRecord.features : []).map((item) => ["기능", safeText(item)])),
    ]
    : [];
  const facts = factRecord
    ? safeLines.filter(([, value]) => value.trim()).map(([label, value]) => label === "기능" ? `- ${value}` : `${label}: ${value}`).join("\n")
    : safeText(rawText);
  const rawValues = factRecord
    ? [factRecord.name, factRecord.description, factRecord.demoUrl, factRecord.repositoryUrl, factRecord.license, ...(Array.isArray(factRecord.features) ? factRecord.features : [])]
    : [rawText];
  const hasUnsafe = rawValues.some((value) => plainText(value) && !safeText(value));
  const issues = [];
  if (!facts.trim()) issues.push({ code: "FACTS_MISSING", message: "검증된 사실 자료가 없습니다. 저장소 분석 결과를 다시 확인하세요." });
  if (hasUnsafe) issues.push({ code: "FACTS_UNSAFE", message: "사실 자료의 credential 또는 개인 경로처럼 보이는 값은 미리보기에 표시하지 않습니다." });
  return { facts, issues };
}

function manualDraftModel(brief = {}) {
  const raw = {
    title: plainText(brief?.title),
    body: plainText(brief?.body),
    postType: ["text", "link"].includes(brief?.postType) ? brief.postType : "unconfirmed",
    nsfw: brief?.nsfw === true,
    spoiler: brief?.spoiler === true,
  };
  const title = safeText(raw.title);
  const body = safeText(raw.body);
  const issues = [];
  if (raw.title && !title) issues.push({ code: "TITLE_UNSAFE", message: "직접 작성 제목에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  if (raw.body && !body) issues.push({ code: "BODY_UNSAFE", message: "직접 작성 본문에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  if (!title.trim()) issues.push({ code: "TITLE_REQUIRED", message: "직접 작성 제목이 필요합니다. 자동 생성하지 않습니다." });
  if (!body.trim()) issues.push({ code: "BODY_REQUIRED", message: "직접 작성 본문이 필요합니다. 자동 생성하지 않습니다." });
  if (raw.postType === "unconfirmed") issues.push({ code: "POST_TYPE_REQUIRED", message: "대상 커뮤니티가 허용하는 게시 유형(text/link)을 직접 확인하세요." });
  return { title, body, postType: raw.postType, nsfw: raw.nsfw, spoiler: raw.spoiler, issues };
}

function communityModel({ authorInputs = {}, operationInputs = {} }) {
  const rawSubreddit = plainText(authorInputs?.subreddit).trim();
  const community = SAFE_COMMUNITY_RE.test(rawSubreddit) ? rawSubreddit : "";
  const rules = safeText(authorInputs?.rules).trim();
  const flair = safeText(authorInputs?.flair).trim();
  const ruleUrl = SAFE_HTTPS_URL_RE.test(plainText(operationInputs?.ruleUrl).trim()) ? plainText(operationInputs.ruleUrl).trim() : "";
  const rulesCheckedAt = ISO_DATE_RE.test(plainText(operationInputs?.rulesCheckedAt).trim()) ? plainText(operationInputs.rulesCheckedAt).trim() : "";
  const communityConfirmed = operationInputs?.subreddit === true;
  const selfPromoRulesConfirmed = operationInputs?.selfPromoRules === true;
  const items = [
    {
      key: community && communityConfirmed ? "community_confirmed" : "community_required",
      label: community && communityConfirmed ? "대상 커뮤니티 확인" : "대상 커뮤니티 확인 필요",
      description: community ? `${community}를 입력했습니다. 실제 community 선택과 해당 규칙을 직접 다시 확인하세요.` : "예: r/sideproject. 실제 게시할 community를 직접 입력하고 확인하세요.",
      value: community,
    },
    {
      key: rules && ruleUrl && rulesCheckedAt && selfPromoRulesConfirmed ? "rules_confirmed" : "rules_required",
      label: rules && ruleUrl && rulesCheckedAt && selfPromoRulesConfirmed ? "커뮤니티·자기홍보 규칙 확인" : "커뮤니티·자기홍보 규칙 확인 필요",
      description: rules && ruleUrl && rulesCheckedAt && selfPromoRulesConfirmed ? "규칙 요약·공개 규칙 URL·확인일을 로컬에 기록했습니다. 규칙은 게시 직전에 다시 확인하세요." : "규칙 요약, 공개 규칙 URL, 확인일, 자기홍보 허용 조건을 직접 확인하세요.",
      value: ruleUrl,
    },
    {
      key: flair ? "flair_recorded" : "flair_required",
      label: flair ? "Flair 확인 기록됨" : "Flair 조건 확인 필요",
      description: flair ? "입력한 flair가 해당 community에서 실제로 사용 가능한지 수동 게시 직전에 확인하세요." : "Flair가 필수인지, 필요 없다면 그 사실을 직접 확인해 기록하세요.",
      value: flair,
    },
  ];
  return { community, rules, flair, ruleUrl, rulesCheckedAt, items };
}

/**
 * Projects reference-only Reddit facts and a human-entered, session-only brief
 * into a local submission-structure review. It does not generate a title/body,
 * resolve a community or flair, render an account/feed, or contact Reddit.
 */
export function createRedditPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  authorInputs = {},
  operationInputs = {},
  brief = {},
} = {}) {
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const facts = localeAvailable ? factsModel(publishFields) : factsModel({});
  const manualDraft = manualDraftModel(brief);
  const community = communityModel({ authorInputs, operationInputs });
  const issues = [...facts.issues, ...manualDraft.issues];
  if (status.key !== "empty" && community.items.some((item) => item.key.endsWith("required"))) {
    issues.push({ code: "COMMUNITY_CONTEXT_REQUIRED", message: "community·규칙·flair 조건을 확인한 뒤 직접 작성한 초안을 검토하세요." });
  }
  return deepFreeze({
    schemaVersion: REDDIT_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    facts: deepFreeze(facts),
    manualDraft: deepFreeze(manualDraft),
    community: deepFreeze(community),
    issues: deepFreeze(issues),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 Reddit의 community·게시 유형·제목·본문 작성 순서를 검토하는 로컬 구조 미리보기입니다. 실제 Reddit 화면·계정·flair 해석·NSFW/spoiler 적용·투표·댓글·제출 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}
