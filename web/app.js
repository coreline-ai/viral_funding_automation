import { countXWeightedCharacters } from "/x-text.mjs";

const DRAFT_CONFIG = {
  x1: {
    label: "X 단일 게시물 1안",
    filename: "x-single-1.md",
    evidence: "X · SINGLE · 280 WEIGHTED",
    help: "프로젝트 한 줄 설명 중심의 1안입니다. 한글·emoji·URL을 X 가중 기준으로 확인합니다.",
  },
  x2: {
    label: "X 단일 게시물 2안",
    filename: "x-single-2.md",
    evidence: "X · FEATURE · 280 WEIGHTED",
    help: "대표 기능 중심의 2안입니다. 실제 화면 이미지와 함께 쓰기 전에 문구를 확인하세요.",
  },
  x3: {
    label: "X 단일 게시물 3안",
    filename: "x-single-3.md",
    evidence: "X · AUDIENCE · 280 WEIGHTED",
    help: "대상 사용자와 기술 구성을 강조한 3안입니다. 1·2안과 동시에 게시하지 마세요.",
  },
  xThread: {
    label: "X 스레드 1안",
    filename: "x-thread.md",
    evidence: "X · THREAD · SEGMENT CHECK",
    help: "--- 구분선마다 별도 게시물입니다. 각 구간의 X 가중 길이를 검사합니다.",
  },
  threads: {
    label: "Threads Build in Public 연속 게시",
    filename: "threads-series.md",
    evidence: "THREADS · BUILD IN PUBLIC",
    help: "문제·불편·해결·실행·피드백 흐름입니다. 실제 대표 이미지를 첫 게시물에 첨부하세요.",
  },
  reddit: {
    label: "Reddit 제목·본문 작업본",
    filename: "reddit-post.md",
    evidence: "REDDIT · SUBREDDIT GATE",
    help: "대상 서브레딧, 계정 조건, 플레어와 자기홍보 규칙을 직접 확인하기 전에는 게시하지 마세요.",
  },
  linkedin: {
    label: "LinkedIn 게시물 작업본",
    filename: "linkedin-post.md",
    evidence: "LINKEDIN · PROFESSIONAL STORY",
    help: "만든 이유와 기술적 해결, 대상 사용자, 협업 피드백을 중심으로 최종 말투를 다듬으세요.",
  },
  disquiet: {
    label: "Disquiet 제품 등록·연결 포스트",
    filename: "disquiet-product.md",
    evidence: "DISQUIET · PRODUCT FIRST",
    help: "제품을 먼저 등록·검토받은 뒤 제품에 연결된 포스트로 사용합니다.",
  },
  facebook: {
    label: "Facebook Reels·그룹 작업본",
    filename: "facebook-post.md",
    evidence: "FACEBOOK · ORIGINAL · GROUP RULES",
    help: "Reels는 기존 세로 영상을 재사용하고, 그룹 본문은 대상 그룹 규칙을 확인한 뒤 한 곳씩 게시하세요.",
  },
  instagram: {
    label: "Instagram Reels 작업본",
    filename: "instagram-reels.md",
    evidence: "INSTAGRAM · REELS · ASSET GATE",
    help: "기존 세로 영상, 표지 문구, 모바일 안전 영역과 프로필 링크를 검수한 뒤 게시하세요.",
  },
  productHunt: {
    label: "Product Hunt 론칭 작업본",
    filename: "product-hunt-launch.md",
    evidence: "PRODUCT HUNT · LAUNCH PACK",
    help: "제품 정보·Gallery 자산·Maker 첫 댓글을 실제 계정과 현재 제품 화면에 맞춰 본인의 영어로 재작성하세요.",
  },
  peerlist: {
    label: "Peerlist Launchpad 작업본",
    filename: "peerlist-launchpad.md",
    evidence: "PEERLIST · VERIFIED LAUNCH",
    help: "프로필 인증, 프로젝트 완성도와 월요일 론칭 일정을 확인하고 제품 소개를 본인의 영어로 재작성하세요.",
  },
  indieHackers: {
    label: "Indie Hackers Build in Public",
    filename: "indie-hackers-post.md",
    evidence: "INDIE HACKERS · BUILD IN PUBLIC",
    help: "광고문 대신 실제 제작 계기와 어려웠던 결정, 현재 한계와 피드백 질문을 본인 경험으로 보강하세요.",
  },
  okky: {
    label: "OKKY 프로젝트 소개 작업본",
    filename: "okky-post.md",
    evidence: "OKKY · COMMUNITY REVIEW",
    help: "게시판 규칙을 확인하고 국내 개발자가 이해할 수 있는 개발 경험과 구체적인 피드백 질문으로 다듬으세요.",
  },
  geeknews: {
    label: "GeekNews Show 원고",
    filename: "geeknews-show.md",
    evidence: "GEEKNEWS · SHOW · HUMAN REVIEW",
    help: "Show 분류, 계정 가입 1주, 중복 등록, 실제 말투 검토는 아래 체크리스트에서 확인합니다.",
  },
  dev: {
    label: "DEV 기술 글 작업본",
    filename: "dev-article.md",
    evidence: "DEV · SUBSTANTIAL CONTENT GATE",
    help: "실제 제작 계기, 코드·명령 예제, 설계 트레이드오프와 실패 사례를 직접 보강해야 합니다.",
  },
  shorts: {
    label: "YouTube Shorts 게시 준비",
    filename: "youtube-shorts.md",
    evidence: "SHORTS · 1080×1920 · ASSET GATE",
    help: "샷리스트 작업본입니다. 실제 세로 영상의 규격·권리·개인정보를 검수한 뒤 게시하세요.",
  },
  showHn: {
    label: "Show HN 사람 검토 작업본",
    filename: "show-hn.md",
    evidence: "SHOW HN · HOLD · AUTHOR REVIEW",
    help: "앞선 채널 피드백을 반영하고 작성자 본인의 영어로 다시 쓴 뒤에만 제출하세요.",
  },
};

const DRAFT_KEYS = Object.keys(DRAFT_CONFIG);
const X_SINGLE_KEYS = new Set(["x1", "x2", "x3"]);
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
const STORAGE_VERSION = 3;
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
  editorHelp: document.querySelector("#editor-help"),
  draftStatus: document.querySelector("#draft-status"),
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
  activeDraft: "x1",
  repository: null,
  facts: null,
  summary: null,
  drafts: Object.fromEntries(DRAFT_KEYS.map((key) => [key, ""])),
  initialDrafts: Object.fromEntries(DRAFT_KEYS.map((key) => [key, ""])),
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

function renderDraftValidation() {
  const value = elements.editor.value;
  if (X_SINGLE_KEYS.has(state.activeDraft)) {
    const weightedLength = countXWeightedCharacters(value.trim());
    const valid = weightedLength <= 280;
    elements.characterCount.textContent = `${weightedLength.toLocaleString("ko-KR")} / 280 가중자`;
    elements.verificationStatus.textContent = valid
      ? "X 형식 검사 통과 · 게시 전 문구 확인 필요"
      : "X 280 가중자 초과 · 줄인 뒤 복사할 수 있습니다";
    elements.draftStatus.dataset.state = valid ? "ready" : "error";
    elements.copyButton.disabled = state.phase !== "success" || !valid;
    return;
  }

  if (state.activeDraft === "xThread") {
    const segments = value.split(/\n\s*---\s*\n/u).map((segment) => segment.trim()).filter(Boolean);
    const lengths = segments.map((segment) => countXWeightedCharacters(segment));
    const maximum = lengths.length ? Math.max(...lengths) : 0;
    const valid = segments.length > 0 && maximum <= 280;
    elements.characterCount.textContent = `${maximum.toLocaleString("ko-KR")} / 280 최대`;
    elements.verificationStatus.textContent = valid
      ? `X 스레드 ${segments.length}개 구간 검사 통과`
      : "X 스레드 구간 중 280 가중자 초과 또는 빈 원고";
    elements.draftStatus.dataset.state = valid ? "ready" : "error";
    elements.copyButton.disabled = state.phase !== "success" || !valid;
    return;
  }

  elements.characterCount.textContent = `${countCharacters(value).toLocaleString("ko-KR")}자`;
  const validations = {
    threads: ["Threads · 대표 이미지와 최종 말투 확인 필요", "ready"],
    reddit: ["Reddit · 서브레딧과 계정·규칙 확인 전 게시 금지", "warning"],
    linkedin: ["LinkedIn · 전문적 맥락과 최종 말투 확인 필요", "ready"],
    disquiet: ["Disquiet · 제품 등록·검토 후 연결 포스트로 사용", "warning"],
    facebook: ["Facebook · 원본 영상과 그룹 규칙 확인 전 게시 금지", "warning"],
    instagram: ["Instagram · 원본 세로 영상·표지·프로필 링크 검수 필요", "warning"],
    productHunt: ["Product Hunt · 제품 페이지·자산·작성자 영어 검토 필요", "warning"],
    peerlist: ["Peerlist · 프로필·완성도·일정·작성자 영어 확인 필요", "warning"],
    indieHackers: ["Indie Hackers · 실제 제작 경험과 작성자 영어 보강 필요", "warning"],
    okky: ["OKKY · 게시판 규칙과 커뮤니티 말투 확인 필요", "warning"],
    geeknews: ["GeekNews Show · 계정·중복·최종 말투 검토 필요", "warning"],
    dev: ["DEV · 실제 경험과 실행 예제 보강 전 게시 금지", "warning"],
    shorts: ["YouTube Shorts · 실제 1080×1920 영상 검수 필요", "warning"],
    showHn: ["Show HN · 앞선 피드백 반영과 작성자 영어 검토 전 보류", "warning"],
  };
  const [message, status] = validations[state.activeDraft] || ["수동 검토가 필요합니다.", "warning"];
  elements.verificationStatus.textContent = message;
  elements.draftStatus.dataset.state = status;
  elements.copyButton.disabled = state.phase !== "success";
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

function migrateStoredWorkspace(value) {
  if (!isRecord(value)) return value;

  let workspace = value;
  if (workspace.version === 1) {
    if (!isRecord(workspace.drafts) || !isRecord(workspace.initialDrafts)) return value;
    if (!["short", "community", "long"].every((key) => typeof workspace.drafts[key] === "string")) return value;
    if (!["short", "community", "long"].every((key) => typeof workspace.initialDrafts[key] === "string")) return value;

    const mapV1Drafts = (drafts) => ({
      x1: drafts.short,
      x2: drafts.short,
      x3: drafts.short,
      xThread: "",
      threads: "",
      reddit: "",
      linkedin: "",
      disquiet: "",
      geeknews: drafts.community,
      dev: drafts.long,
      shorts: "",
      showHn: "",
    });
    workspace = {
      ...workspace,
      version: 2,
      drafts: mapV1Drafts(workspace.drafts),
      initialDrafts: mapV1Drafts(workspace.initialDrafts),
      activeDraft: { short: "x1", community: "geeknews", long: "dev" }[workspace.activeDraft] || "x1",
      migratedFrom: 1,
    };
  }

  if (workspace.version !== 2) return workspace;
  const legacyKeys = ["x1", "x2", "x3", "xThread", "threads", "reddit", "linkedin", "disquiet", "geeknews", "dev", "shorts", "showHn"];
  if (!isRecord(workspace.drafts) || !isRecord(workspace.initialDrafts)) return value;
  if (!legacyKeys.every((key) => typeof workspace.drafts[key] === "string")) return value;
  if (!legacyKeys.every((key) => typeof workspace.initialDrafts[key] === "string")) return value;

  const expandDrafts = (drafts) => Object.fromEntries(
    DRAFT_KEYS.map((key) => [key, typeof drafts[key] === "string" ? drafts[key] : ""]),
  );
  return {
    ...workspace,
    version: STORAGE_VERSION,
    drafts: expandDrafts(workspace.drafts),
    initialDrafts: expandDrafts(workspace.initialDrafts),
    activeDraft: DRAFT_CONFIG[workspace.activeDraft] ? workspace.activeDraft : "x1",
    migratedFrom: workspace.migratedFrom || 2,
  };
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
    workspace = migrateStoredWorkspace(JSON.parse(stored));
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
  const migrationNote = workspace.migratedFrom === 1
    ? " 기존 3종 원고를 이동했으며, 전체 채널 초안은 콘텐츠 생성을 다시 눌러 만드세요."
    : workspace.migratedFrom === 2
      ? " 기존 12종 원고를 유지했으며, 신규 6종은 콘텐츠 생성을 다시 눌러 만드세요."
      : " 최신 내용은 콘텐츠 생성을 다시 눌러 확인하세요.";
  setFeedback(`이전 작업을 복원했습니다 (${savedAt}).${migrationNote}`, "restored");
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
  elements.editorHelp.textContent = config.help;
  renderDraftValidation();

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

${state.drafts.geeknews.trim()}

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
    state.activeDraft = "x1";
    state.dirty = false;
    state.persisted = false;
    renderRepository();
    setDraftActionsEnabled(true);
    setLoading(false);
    renderActiveDraft();

    const persisted = persistWorkspace();
    if (persisted) {
      setFeedback(`채널 원고 ${DRAFT_KEYS.length}종을 생성하고 이 브라우저에 저장했습니다. 상태를 확인한 뒤 필요한 원고만 사용하세요.`, "success");
    } else {
      setFeedback(`채널 원고 ${DRAFT_KEYS.length}종을 생성했습니다. 브라우저 저장은 사용할 수 없어 새로고침 전에 내려받으세요.`, "restored");
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
  renderDraftValidation();
  if (state.activeDraft === "geeknews" && state.preflight.finalCopyReviewed) {
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
  showToast(`채널 원고 ${DRAFT_KEYS.length}종을 하나의 Markdown 파일로 저장했습니다.`);
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
