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
  toast: document.querySelector("#toast"),
};

const state = {
  phase: "idle",
  activeDraft: "short",
  repository: null,
  facts: null,
  summary: null,
  drafts: { short: "", community: "", long: "" },
  initialDrafts: { short: "", community: "", long: "" },
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

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty || state.persisted) return;
  event.preventDefault();
  event.returnValue = "";
});

if (!restoreWorkspace()) renderActiveDraft();
