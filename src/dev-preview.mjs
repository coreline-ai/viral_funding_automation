export const DEV_PREVIEW_SCHEMA_VERSION = "viral-dev-preview/v1";
const UNSAFE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;
function freeze(value) { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } return value; }
function text(value) { const raw = typeof value === "string" ? value : ""; return UNSAFE.test(raw) ? "" : raw; }
function status({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) return { key: "empty", label: "대상 언어 자료 없음", description: "선택한 언어의 DEV 참고 자료가 없습니다. 원문으로 대체하지 않습니다." };
  if (localeStale || approvalStatus === "invalidated") return { key: "stale", label: "수정으로 검토 무효", description: "현재 참고 자료가 바뀌었습니다. 사람이 직접 쓴 article을 다시 검토하세요." };
  return { key: "human_draft", label: "사람 작성 article 필요", description: "DEV article은 facts만으로 자동 생성하지 않습니다. 실제 사례·코드·실패·AI 공개를 작성자가 직접 넣으세요." };
}
function facts(fields) {
  const record = fields?.facts && typeof fields.facts === "object" && !Array.isArray(fields.facts) ? fields.facts : {};
  const lines = [["프로젝트", text(record.name)], ["설명", text(record.description)], ["데모", text(record.demoUrl)], ["소스", text(record.repositoryUrl)], ["라이선스", text(record.license)], ...((Array.isArray(record.features) ? record.features : []).map((v) => ["기능", text(v)]))]
    .filter(([, value]) => value.trim()).map(([label, value]) => label === "기능" ? `- ${value}` : `${label}: ${value}`);
  return lines.join("\n");
}
function article(brief = {}) {
  const title = text(brief.title).trim(); const body = text(brief.body).trim(); const tags = text(brief.tags).trim(); const disclosure = text(brief.disclosure).trim();
  const issues = [];
  if (!title) issues.push({ code: "TITLE_REQUIRED", message: "article 제목을 직접 입력하세요. 자동 생성하지 않습니다." });
  if (!body) issues.push({ code: "BODY_REQUIRED", message: "article 본문을 직접 입력하세요. facts를 게시 글로 바꾸지 않습니다." });
  if (!disclosure) issues.push({ code: "DISCLOSURE_REQUIRED", message: "AI가 도운 범위 또는 AI 미사용 사실을 직접 공개하세요." });
  return { title, body, tags, disclosure, issues };
}
/** Local human-draft review only: no DEV account, markdown rendering, tags lookup, or write operation. */
export function createDevPreviewModel({ publishFields = {}, locale = "", localeAvailable = true, localeStale = false, approvalStatus = "unreviewed", authorInputs = {}, brief = {} } = {}) {
  const current = status({ localeAvailable, localeStale, approvalStatus });
  const reference = localeAvailable ? facts(publishFields) : "";
  const draft = article(brief);
  const checks = [["실제 기술 사례", text(authorInputs.realCase)], ["코드·실행 예", text(authorInputs.code)], ["실패·한계", text(authorInputs.failure)], ["AI 사용 공개", text(authorInputs.aiDisclosure)]].map(([label, value]) => ({ label, value, ready: Boolean(value) }));
  const issues = [...draft.issues, ...checks.filter((item) => !item.ready).map((item) => ({ code: "AUTHOR_EVIDENCE_REQUIRED", message: `${item.label}을 직접 입력하세요.` }))];
  return freeze({ schemaVersion: DEV_PREVIEW_SCHEMA_VERSION, locale: String(locale ?? ""), status: freeze(current), reference: freeze({ facts: reference }), article: freeze(draft), checks: freeze(checks), issues: freeze(issues), emptyMessage: current.key === "empty" ? current.description : "", notice: "이 화면은 DEV article의 사람 작성 준비 상태를 검토하는 로컬 미리보기입니다. 실제 DEV 계정·태그·게시·예약·API 요청 기능이 아닙니다.", externalWriteCount: 0 });
}
