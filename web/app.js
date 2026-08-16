const DRAFT_CONFIG = {
  short: {
    label: "짧은 소개 원고",
    filename: "short-post.md",
    evidence: "README · PRIMARY FEATURE",
  },
  community: {
    label: "커뮤니티 원고",
    filename: "community-post.md",
    evidence: "README · VERIFIED FACTS",
  },
  long: {
    label: "상세 소개 원고",
    filename: "long-post.md",
    evidence: "README · FULL SUMMARY",
  },
};

const DRAFT_KEYS = Object.keys(DRAFT_CONFIG);
const PREFLIGHT_CONFIG = {
  accountReady: "GeekNews 가입 후 일주일 경과 확인",
  rulesReviewed: "공식 이용법과 반복 등록 금지 규칙 확인",
  showCategory: "뉴스가 아닌 Show 등록 확인",
  finalCopyReviewed: "커뮤니티 원고 최종 검토",
  trafficCaptured: "게시 직전 GitHub Traffic 수동 캡처",
};
const PREFLIGHT_KEYS = Object.keys(PREFLIGHT_CONFIG);
const EXAMPLE_REPOSITORY_URL = "https://github.com/coreline-ai/memory_node_graph";
const STORAGE_KEY = "coreline-launch:workspace:v1";
const STORAGE_VERSION = 1;
const EXAMPLE_BUTTON_LABEL = "memory_node_graph 예제로 1턴 실행";

const elements = {
  body: document.body,
  form: document.querySelector("#repository-form"),
  input: document.querySelector("#repository-url"),
  generateButton: document.querySelector("#generate-button"),
  exampleButton: document.querySelector("#example-button"),
  feedback: document.querySelector("#command-feedback"),
  welcomePanel: document.querySelector("#welcome-panel"),
  resultWorkspace: document.querySelector("#result-workspace"),
  railEmpty: document.querySelector("#rail-empty"),
  repositoryDetails: document.querySelector("#repository-details"),
  repositoryName: document.querySelector("#repository-name"),
  repositoryOwner: document.querySelector("#repository-owner"),
  repositoryLink: document.querySelector("#repository-link"),
  demoLink: document.querySelector("#demo-link"),
  factReadme: document.querySelector("#fact-readme"),
  factLicense: document.querySelector("#fact-license"),
  factDemo: document.querySelector("#fact-demo"),
  factLanguage: document.querySelector("#fact-language"),
  featureCount: document.querySelector("#feature-count"),
  audienceCount: document.querySelector("#audience-count"),
  limitationCount: document.querySelector("#limitation-count"),
  projectTitle: document.querySelector("#project-title"),
  projectDescription: document.querySelector("#project-description"),
  projectLicense: document.querySelector("#project-license"),
  tabs: [...document.querySelectorAll('[role="tab"][data-draft]')],
  draftPanel: document.querySelector("#draft-panel"),
  draftLabel: document.querySelector("#draft-label"),
  draftEvidence: document.querySelector("#draft-evidence"),
  editor: document.querySelector("#draft-editor"),
  verificationStatus: document.querySelector("#verification-status"),
  characterCount: document.querySelector("#character-count"),
  copyButton: document.querySelector("#copy-button"),
  downloadButton: document.querySelector("#download-button"),
  downloadAllButton: document.querySelector("#download-all-button"),
  baselineStars: document.querySelector("#baseline-stars"),
  baselineForks: document.querySelector("#baseline-forks"),
  baselineOpenIssues: document.querySelector("#baseline-open-issues"),
  baselineCapturedAt: document.querySelector("#baseline-captured-at"),
  baselineRefreshButton: document.querySelector("#baseline-refresh-button"),
  preflightChecks: [...document.querySelectorAll("[data-preflight]")],
  preflightProgress: document.querySelector("#preflight-progress"),
  preflightStatus: document.querySelector("#preflight-status"),
  preflightDownloadButton: document.querySelector("#preflight-download-button"),
  toast: document.querySelector("#toast"),
};

function createDefaultPreflight() {
  return Object.fromEntries(PREFLIGHT_KEYS.map((key) => [key, false]));
}

const state = {
  phase: "idle",
  activeDraft: "short",
  repository: null,
  facts: null,
  summary: null,
  drafts: { short: "", community: "", long: "" },
  initialDrafts: { short: "", community: "", long: "" },
  baseline: null,
  preflight: createDefaultPreflight(),
  baselineLoading: false,
  dirty: false,
  persisted: false,
};

let toastTimer = 0;

function countCharacters(value) {
  return Array.from(value).length;
}

function setFeedback(message = "", tone = "neutral") {
  elements.feedback.textContent = message;
  if (message) elements.feedback.dataset.tone = tone;
  else delete elements.feedback.dataset.tone;
}

function setLoading(loading) {
  state.phase = loading ? "loading" : state.repository ? "success" : "idle";
  elements.body.classList.toggle("is-loading", loading);
  elements.form.setAttribute("aria-busy", String(loading));
  elements.input.disabled = loading;
  elements.generateButton.disabled = loading;
  elements.exampleButton.disabled = loading;
  elements.generateButton.textContent = loading ? "저장소 분석 중" : "콘텐츠 생성";
  elements.exampleButton.textContent = loading ? "실제 저장소 분석 중" : EXAMPLE_BUTTON_LABEL;
}

function showToast(message, tone = "success") {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.dataset.tone = tone;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 1800);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDraftCollection(value) {
  return isRecord(value) && DRAFT_KEYS.every((key) => typeof value[key] === "string");
}

function isBaseline(value) {
  return isRecord(value)
    && typeof value.capturedAt === "string"
    && !Number.isNaN(Date.parse(value.capturedAt))
    && [value.stars, value.forks, value.openIssues]
      .every((count) => Number.isSafeInteger(count) && count >= 0);
}

function isPreflight(value) {
  return isRecord(value) && PREFLIGHT_KEYS.every((key) => typeof value[key] === "boolean");
}

function isStoredWorkspace(value) {
  if (!isRecord(value) || value.version !== STORAGE_VERSION) return false;
  if (typeof value.repoUrl !== "string" || !safeHttpUrl(value.repoUrl)) return false;
  if (typeof value.savedAt !== "string" || Number.isNaN(Date.parse(value.savedAt))) return false;
  if (!isRecord(value.repository) || !isRecord(value.facts) || !isRecord(value.summary)) return false;
  if (!isDraftCollection(value.drafts) || !isDraftCollection(value.initialDrafts)) return false;
  if (!DRAFT_CONFIG[value.activeDraft]) return false;

  const repository = value.repository;
  if (
    typeof repository.name !== "string" ||
    typeof repository.fullName !== "string" ||
    typeof repository.url !== "string" ||
    !safeHttpUrl(repository.url) ||
    typeof repository.visibility !== "string" ||
    !(typeof repository.language === "string" || repository.language === null)
  ) {
    return false;
  }

  const facts = value.facts;
  if (
    typeof facts.hasReadme !== "boolean" ||
    typeof facts.license !== "string" ||
    !(typeof facts.demoUrl === "string" || facts.demoUrl === null) ||
    !Number.isFinite(facts.featureCount) ||
    !Number.isFinite(facts.audienceCount) ||
    !Number.isFinite(facts.limitationCount)
  ) {
    return false;
  }

  return typeof value.summary.name === "string" && typeof value.summary.description === "string";
}

function createWorkspaceSnapshot() {
  return {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    repoUrl: elements.input.value.trim() || state.repository.url,
    repository: state.repository,
    facts: state.facts,
    summary: state.summary,
    drafts: state.drafts,
    initialDrafts: state.initialDrafts,
    activeDraft: state.activeDraft,
    baseline: state.baseline,
    preflight: state.preflight,
  };
}

function persistWorkspace() {
  if (!state.repository || !state.facts || !state.summary) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createWorkspaceSnapshot()));
    state.persisted = true;
    return true;
  } catch {
    state.persisted = false;
    return false;
  }
}

function removeStoredWorkspace() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장소 접근이 막혀도 현재 세션은 계속 사용한다.
  }
}

function restoreWorkspace() {
  let stored;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
  if (!stored) return false;

  let workspace;
  try {
    workspace = JSON.parse(stored);
  } catch {
    removeStoredWorkspace();
    return false;
  }
  if (!isStoredWorkspace(workspace)) {
    removeStoredWorkspace();
    return false;
  }

  state.repository = workspace.repository;
  state.facts = workspace.facts;
  state.summary = workspace.summary;
  state.drafts = { ...workspace.drafts };
  state.initialDrafts = { ...workspace.initialDrafts };
  state.activeDraft = workspace.activeDraft;
  state.baseline = isBaseline(workspace.baseline) ? { ...workspace.baseline } : null;
  state.preflight = isPreflight(workspace.preflight) ? { ...workspace.preflight } : createDefaultPreflight();
  state.phase = "success";
  state.persisted = true;
  updateDirtyState();

  elements.input.value = workspace.repoUrl;
  renderRepository();
  setDraftActionsEnabled(true);
  renderActiveDraft();

  const savedAt = new Date(workspace.savedAt).toLocaleString("ko-KR");
  setFeedback(`이전 작업을 복원했습니다 (${savedAt}). 최신 내용은 콘텐츠 생성을 다시 눌러 확인하세요.`, "restored");
  return true;
}

function setExternalLink(element, value) {
  const safe = safeHttpUrl(value);
  if (!safe) {
    element.hidden = true;
    element.removeAttribute("href");
    return;
  }
  element.href = safe;
  element.hidden = false;
}

function renderRepository() {
  const { repository, facts, summary } = state;
  const owner = repository.fullName.split("/", 1)[0] || "GitHub";

  elements.repositoryName.textContent = repository.name;
  elements.repositoryOwner.textContent = `${owner} / ${repository.visibility}`;
  elements.factReadme.textContent = facts.hasReadme ? "확인" : "없음";
  elements.factLicense.textContent = facts.license || "UNKNOWN";
  elements.factDemo.textContent = facts.demoUrl ? "확인" : "없음";
  elements.factLanguage.textContent = repository.language || "확인 불가";
  elements.featureCount.textContent = String(facts.featureCount);
  elements.audienceCount.textContent = String(facts.audienceCount);
  elements.limitationCount.textContent = String(facts.limitationCount);
  elements.projectTitle.textContent = summary.name;
  elements.projectDescription.textContent = summary.description;
  elements.projectLicense.textContent = facts.license || "UNKNOWN";

  setExternalLink(elements.repositoryLink, repository.url);
  setExternalLink(elements.demoLink, facts.demoUrl);

  const verified = [
    facts.hasReadme ? "README" : null,
    facts.license && facts.license !== "UNKNOWN" ? "License" : null,
    facts.demoUrl ? "Demo" : null,
  ].filter(Boolean);
  elements.verificationStatus.textContent = verified.length
    ? `${verified.join(" · ")} 확인 완료`
    : "확인 가능한 저장소 정보로 원고 생성";

  elements.railEmpty.hidden = true;
  elements.repositoryDetails.hidden = false;
  elements.welcomePanel.hidden = true;
  elements.resultWorkspace.hidden = false;
  renderPreflight();
}

function formatCapturedAt(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "아직 기록되지 않음";
  return new Date(value).toLocaleString("ko-KR");
}

function isPreflightReady() {
  return Boolean(state.baseline) && PREFLIGHT_KEYS.every((key) => state.preflight[key]);
}

function renderPreflight() {
  const baseline = state.baseline;
  elements.baselineStars.textContent = baseline ? baseline.stars.toLocaleString("ko-KR") : "—";
  elements.baselineForks.textContent = baseline ? baseline.forks.toLocaleString("ko-KR") : "—";
  elements.baselineOpenIssues.textContent = baseline ? baseline.openIssues.toLocaleString("ko-KR") : "—";
  elements.baselineCapturedAt.textContent = formatCapturedAt(baseline?.capturedAt);

  for (const checkbox of elements.preflightChecks) {
    checkbox.checked = Boolean(state.preflight[checkbox.dataset.preflight]);
  }

  const complete = PREFLIGHT_KEYS.filter((key) => state.preflight[key]).length;
  const remaining = PREFLIGHT_KEYS.length - complete;
  const ready = isPreflightReady();
  elements.preflightProgress.textContent = `${complete} / ${PREFLIGHT_KEYS.length}`;
  elements.preflightProgress.dataset.state = ready ? "ready" : "pending";
  if (!baseline) {
    elements.preflightStatus.textContent = "공개 GitHub 기준점을 먼저 기록하세요.";
  } else if (ready) {
    elements.preflightStatus.textContent = "직접 게시 전 준비가 완료됐습니다.";
  } else {
    elements.preflightStatus.textContent = `확인 항목 ${remaining}개가 남았습니다.`;
  }

  elements.baselineRefreshButton.disabled = state.baselineLoading || !state.repository;
  elements.baselineRefreshButton.textContent = state.baselineLoading ? "기준점 확인 중" : "게시 직전 기준점 갱신";
  elements.preflightDownloadButton.disabled = !ready;
}

function updateDirtyState() {
  state.dirty = DRAFT_KEYS.some((key) => state.drafts[key] !== state.initialDrafts[key]);
}

function setDraftActionsEnabled(enabled) {
  elements.editor.disabled = !enabled;
  elements.copyButton.disabled = !enabled;
  elements.downloadButton.disabled = !enabled;
  elements.downloadAllButton.disabled = !enabled;
}

function renderActiveDraft({ focus = false } = {}) {
  const config = DRAFT_CONFIG[state.activeDraft];
  elements.editor.value = state.drafts[state.activeDraft];
  elements.draftLabel.textContent = config.label;
  elements.draftEvidence.textContent = config.evidence;
  elements.characterCount.textContent = `${countCharacters(elements.editor.value).toLocaleString("ko-KR")}자`;

  for (const tab of elements.tabs) {
    const active = tab.dataset.draft === state.activeDraft;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) elements.draftPanel.setAttribute("aria-labelledby", tab.id);
  }
  if (focus) elements.editor.focus();
}

function selectDraft(key, options) {
  if (!DRAFT_CONFIG[key] || state.phase !== "success") return;
  state.activeDraft = key;
  renderActiveDraft(options);
  persistWorkspace();
}

function sanitizeFilename(value) {
  const cleaned = String(value ?? "repository")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "repository";
}

function triggerDownload(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const fallback = document.createElement("textarea");
  fallback.value = value;
  fallback.setAttribute("readonly", "");
  fallback.style.position = "fixed";
  fallback.style.opacity = "0";
  document.body.append(fallback);
  fallback.select();
  const copied = document.execCommand("copy");
  fallback.remove();
  if (!copied) throw new Error("copy failed");
}

function buildBundle() {
  const sections = DRAFT_KEYS.map((key) => {
    const title = DRAFT_CONFIG[key].label.replace(/ 원고$/, "");
    return `## ${title}\n\n${state.drafts[key].trim()}`;
  });
  return `# ${state.summary.name} 바이럴 콘텐츠 패키지\n\n${sections.join("\n\n---\n\n")}\n`;
}

function buildPreflightReport() {
  const checklist = PREFLIGHT_KEYS
    .map((key) => `- [${state.preflight[key] ? "x" : " "}] ${PREFLIGHT_CONFIG[key]}`)
    .join("\n");
  const baseline = state.baseline;
  return `# ${state.summary.name} GeekNews Show 게시 준비 문서

생성 시각: ${new Date().toISOString()}

## 게시 대상

- 채널: GeekNews Show
- 저장소: ${state.repository.url}
- 공개 데모: ${state.facts.demoUrl || "없음"}
- 공식 이용법: https://news.hada.io/guidelines
- Show 목록: https://news.hada.io/show

## 공개 GitHub 기준점

- 수집 시각: ${baseline.capturedAt}
- Star: ${baseline.stars}
- Fork: ${baseline.forks}
- Open Issue/PR: ${baseline.openIssues}
- GitHub Traffic: 관리자 화면에서 별도 캡처

## 직접 게시 전 확인

${checklist}

## 최종 커뮤니티 원고

${state.drafts.community.trim()}

## 게시 원칙

- 실제 등록은 자동화하지 않는다.
- 본인 또는 소속 조직 프로젝트는 뉴스가 아닌 Show로 등록한다.
- 삭제·숨김·스팸 지적이 있으면 유사 글을 다시 등록하지 않는다.
`;
}

async function requestGeneration(repoUrl) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("서버 응답을 읽지 못했습니다.");
  }
  if (!response.ok) {
    throw new Error(payload?.error?.message || "콘텐츠를 생성하지 못했습니다.");
  }
  return payload;
}

async function requestBaseline(repoUrl) {
  const response = await fetch("/api/baseline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("기준점 응답을 읽지 못했습니다.");
  }
  if (!response.ok) {
    throw new Error(payload?.error?.message || "GitHub 기준점을 가져오지 못했습니다.");
  }
  if (!isBaseline(payload.baseline)) {
    throw new Error("GitHub 기준점 형식을 확인할 수 없습니다.");
  }
  return payload;
}

async function generateRepository(repoUrl) {
  setLoading(true);
  setFeedback("GitHub 저장소와 README를 확인하고 있습니다.");
  try {
    const payload = await requestGeneration(repoUrl);
    state.repository = payload.repository;
    state.facts = payload.facts;
    state.summary = payload.summary;
    state.drafts = { ...payload.drafts };
    state.initialDrafts = { ...payload.drafts };
    state.baseline = isBaseline(payload.baseline) ? { ...payload.baseline } : null;
    state.preflight = createDefaultPreflight();
    state.activeDraft = "short";
    state.dirty = false;
    state.persisted = false;
    renderRepository();
    setDraftActionsEnabled(true);
    setLoading(false);
    renderActiveDraft();

    const persisted = persistWorkspace();
    if (persisted) {
      setFeedback("콘텐츠 3종을 생성하고 이 브라우저에 저장했습니다. 수정 후 복사하거나 내려받으세요.", "success");
    } else {
      setFeedback("콘텐츠 3종을 생성했습니다. 브라우저 저장은 사용할 수 없어 새로고침 전에 내려받으세요.", "restored");
    }
    elements.projectTitle.setAttribute("tabindex", "-1");
    elements.projectTitle.focus();
  } catch (error) {
    setLoading(false);
    setFeedback(error.message || "콘텐츠를 생성하지 못했습니다.", "error");
    elements.input.focus();
  }
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.phase === "loading") return;

  const repoUrl = elements.input.value.trim();
  if (!repoUrl) {
    setFeedback("공개 GitHub 저장소 URL을 입력하세요.", "error");
    elements.input.focus();
    return;
  }
  if (state.dirty && !window.confirm("수정 중인 원고가 있습니다. 새 저장소를 분석할까요?")) return;

  await generateRepository(repoUrl);
});

elements.exampleButton.addEventListener("click", () => {
  if (state.phase === "loading") return;
  elements.input.value = EXAMPLE_REPOSITORY_URL;
  elements.form.requestSubmit();
});

for (const tab of elements.tabs) {
  tab.addEventListener("click", () => selectDraft(tab.dataset.draft));
  tab.addEventListener("keydown", (event) => {
    const current = DRAFT_KEYS.indexOf(state.activeDraft);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % DRAFT_KEYS.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + DRAFT_KEYS.length) % DRAFT_KEYS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = DRAFT_KEYS.length - 1;
    else return;
    event.preventDefault();
    selectDraft(DRAFT_KEYS[next]);
    elements.tabs[next].focus();
  });
}

elements.editor.addEventListener("input", () => {
  state.drafts[state.activeDraft] = elements.editor.value;
  elements.characterCount.textContent = `${countCharacters(elements.editor.value).toLocaleString("ko-KR")}자`;
  if (state.activeDraft === "community" && state.preflight.finalCopyReviewed) {
    state.preflight.finalCopyReviewed = false;
    renderPreflight();
  }
  updateDirtyState();
  persistWorkspace();
});

elements.copyButton.addEventListener("click", async () => {
  try {
    await copyText(state.drafts[state.activeDraft]);
    showToast("현재 원고를 복사했습니다.");
  } catch {
    showToast("자동 복사에 실패했습니다. 원고를 직접 선택해 복사하세요.", "error");
    elements.editor.focus();
    elements.editor.select();
  }
});

elements.downloadButton.addEventListener("click", () => {
  const prefix = sanitizeFilename(state.repository?.name);
  triggerDownload(`${prefix}-${DRAFT_CONFIG[state.activeDraft].filename}`, state.drafts[state.activeDraft]);
  showToast("현재 원고를 Markdown으로 저장했습니다.");
});

elements.downloadAllButton.addEventListener("click", () => {
  const prefix = sanitizeFilename(state.repository?.name);
  triggerDownload(`${prefix}-viral-content-pack.md`, buildBundle());
  showToast("콘텐츠 3종을 하나의 Markdown 파일로 저장했습니다.");
});

for (const checkbox of elements.preflightChecks) {
  checkbox.addEventListener("change", () => {
    const key = checkbox.dataset.preflight;
    if (!PREFLIGHT_CONFIG[key] || state.phase !== "success") return;
    state.preflight[key] = checkbox.checked;
    persistWorkspace();
    renderPreflight();
  });
}

elements.baselineRefreshButton.addEventListener("click", async () => {
  if (!state.repository || state.baselineLoading) return;
  state.baselineLoading = true;
  renderPreflight();
  try {
    const payload = await requestBaseline(state.repository.url);
    if (payload.repository?.fullName !== state.repository.fullName) {
      throw new Error("현재 저장소와 기준점 저장소가 일치하지 않습니다.");
    }
    state.baseline = { ...payload.baseline };
    state.preflight.trafficCaptured = false;
    persistWorkspace();
    showToast("게시 직전 GitHub 공개 기준점을 갱신했습니다.");
  } catch (error) {
    showToast(error.message || "GitHub 기준점을 갱신하지 못했습니다.", "error");
  } finally {
    state.baselineLoading = false;
    renderPreflight();
  }
});

elements.preflightDownloadButton.addEventListener("click", () => {
  if (!isPreflightReady()) return;
  const prefix = sanitizeFilename(state.repository?.name);
  triggerDownload(`${prefix}-geeknews-show-preflight.md`, buildPreflightReport());
  showToast("게시 준비 문서를 Markdown으로 저장했습니다.");
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty || state.persisted) return;
  event.preventDefault();
  event.returnValue = "";
});

if (!restoreWorkspace()) renderActiveDraft();
