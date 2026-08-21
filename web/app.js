import {
  channelSpec,
  copyBlockReason,
  createDraftDocument,
  displayCompletionState,
  displayCompletionStatus,
  hashPublishFields,
  matchesFieldContract,
  parsePublish,
  serializePublish,
  translationFactsFromSummary,
  validatePublish,
} from "/drafts.mjs";
import {
  CAMPAIGN_BRIEF_DEFS,
  authorInputDefs,
  channelProfile,
  defaultLocale,
  preferredProvider,
  requiredAuthorInputs,
  supportedLocales,
  supportMode,
  validateTypedInputs,
} from "/channel-profiles.mjs";
import { countXWeightedCharacters } from "/x-text.mjs";
import { compositionRequestFingerprint } from "/request-fingerprint.mjs";
import { SOURCE_LOCALE, SUPPORTED_LOCALES, localeLabel } from "/locales.mjs";
import { platformForChannel, platformReadinessList } from "/platform-registry.mjs";
import { dryRunConnectorForChannel } from "/platforms/registry.mjs";
import { assessApprovalRevision } from "/publish-intent.mjs";
import {
  EXTERNAL_CREDENTIAL_VAULT_STATUS,
  assessPlatformReadiness,
  emptyPlatformReadiness,
  normalizePlatformReadiness,
  platformReadinessSchema,
  readinessReportMarkdown,
} from "/platform-readiness.mjs";
import { upgradeWorkspaceApprovalSnapshots, upgradeWorkspacePlatformReadiness } from "/workspace-migration.mjs";
import { automationGoLiveAssessment, automationGoLiveReportMarkdown } from "/automation-go-live.mjs";
import { createThreadsPreviewModel } from "/threads-preview.mjs";

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
    label: "Reddit 참고 자료",
    filename: "reddit-reference.md",
    evidence: "REDDIT · REFERENCE ONLY",
    help: "이 자료는 게시문이 아닙니다. 대상 서브레딧 규칙을 확인한 뒤 작성자가 직접 제목과 본문을 작성하세요.",
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
    help: "게시문이 아니라 검증 자료입니다. 실제 기술 사례를 직접 쓰고 AI 보조 사실을 공개해야 합니다.",
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
    help: "생성 제목·본문을 사용하거나 윤문하지 말고, 작성자가 본인의 영어로 처음부터 직접 써야 합니다.",
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
const STORAGE_VERSION = 7;
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
  channelGrid: document.querySelector("#channel-grid"),
  goLiveInternalStatus: document.querySelector("#go-live-internal-status"),
  goLiveExternalStatus: document.querySelector("#go-live-external-status"),
  goLiveDecision: document.querySelector("#go-live-decision"),
  goLivePublishCapability: document.querySelector("#go-live-publish-capability"),
  goLiveScope: document.querySelector("#go-live-scope"),
  goLiveDeferredInputs: document.querySelector("#go-live-deferred-inputs"),
  goLiveReportButton: document.querySelector("#go-live-report-button"),
  automationReadiness: document.querySelector("#automation-readiness"),
  readinessStatusGrid: document.querySelector("#readiness-status-grid"),
  platformReadinessForm: document.querySelector("#platform-readiness-form"),
  platformReadinessFields: document.querySelector("#platform-readiness-fields"),
  platformReadinessStatus: document.querySelector("#platform-readiness-status"),
  readinessReportButton: document.querySelector("#readiness-report-button"),
  readinessDryRunButton: document.querySelector("#readiness-dry-run-button"),
  readinessDryRunResult: document.querySelector("#readiness-dry-run-result"),
  dryRunSafetyControls: document.querySelector("#dry-run-safety-controls"),
  dryRunCredentialHandle: document.querySelector("#dry-run-credential-handle"),
  dryRunKillSwitch: document.querySelector("#dry-run-kill-switch"),
  dryRunEvidenceButton: document.querySelector("#dry-run-evidence-button"),
  tabs: [...document.querySelectorAll('[role="tab"][data-draft]')],
  draftPanel: document.querySelector("#draft-panel"),
  draftLabel: document.querySelector("#draft-label"),
  draftEvidence: document.querySelector("#draft-evidence"),
  editor: document.querySelector("#draft-editor"),
  translationEditor: document.querySelector("#translation-editor"),
  localeSelect: document.querySelector("#locale-select"),
  providerField: document.querySelector("#provider-field"),
  providerAuto: document.querySelector("#provider-auto"),
  providerGrok: document.querySelector("#provider-grok"),
  providerCodex: document.querySelector("#provider-codex"),
  providerReadiness: document.querySelector("#provider-readiness"),
  translateButton: document.querySelector("#translate-button"),
  reviewButton: document.querySelector("#review-button"),
  revalidateButton: document.querySelector("#revalidate-button"),
  revertButton: document.querySelector("#revert-button"),
  translateAllButton: document.querySelector("#translate-all-button"),
  approvalActorLabel: document.querySelector("#approval-actor-label"),
  approvalActor: document.querySelector("#approval-actor"),
  composeWorkbench: document.querySelector("#compose-workbench"),
  constraintProvider: document.querySelector("#constraint-provider"),
  constraintFields: document.querySelector("#constraint-fields"),
  constraintLength: document.querySelector("#constraint-length"),
  constraintFacts: document.querySelector("#constraint-facts"),
  authorInputs: document.querySelector("#author-inputs"),
  validationIssues: document.querySelector("#validation-issues"),
  completionBadge: document.querySelector("#completion-badge"),
  translateStatus: document.querySelector("#translate-status"),
  authorReady: document.querySelector("#author-ready"),
  authorReadyLabel: document.querySelector("#author-ready-label"),
  approvalSnapshotStatus: document.querySelector("#approval-snapshot-status"),
  threadsPreviewWorkbench: document.querySelector("#threads-preview-workbench"),
  threadsEditorView: document.querySelector("#threads-editor-view"),
  threadsPreviewView: document.querySelector("#threads-preview-view"),
  threadsPreviewPanel: document.querySelector("#threads-preview-panel"),
  threadsPreviewStatus: document.querySelector("#threads-preview-status"),
  threadsPreviewFrame: document.querySelector("#threads-preview-frame"),
  threadsPreviewCards: document.querySelector("#threads-preview-cards"),
  threadsPreviewEmpty: document.querySelector("#threads-preview-empty"),
  threadsPreviewNotice: document.querySelector("#threads-preview-notice"),
  threadsPreviewDesktop: document.querySelector("#threads-preview-desktop"),
  threadsPreviewMobile: document.querySelector("#threads-preview-mobile"),
  compareEditors: document.querySelector("#compare-editors"),
  emptyTranslation: document.querySelector("#empty-translation"),
  sourceLocaleLabel: document.querySelector("#source-locale-label"),
  targetLocaleLabel: document.querySelector("#target-locale-label"),
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
  documents: Object.fromEntries(DRAFT_KEYS.map((key) => [key, createDraftDocument(key)])),
  activeLocale: SOURCE_LOCALE,
  provider: "grok",
  apiNonce: "",
  readiness: { grok: null, codex: null },
  translateLoading: false,
  translateMode: null,
  approvalLoading: false,
  dryRunLoading: false,
  dryRunReceipt: null,
  dryRunEvidence: null,
  dryRunCredentialHandle: "",
  dryRunKillSwitchLocked: false,
  baseline: null,
  preflight: createDefaultPreflight(),
  baselineLoading: false,
  threadsPreviewMode: "editor",
  threadsPreviewViewport: "desktop",
  dirty: false,
  persisted: false,
};

let toastTimer = 0;
let translateElapsedTimer = 0;
let translateAbort = null;

function countCharacters(value) {
  return Array.from(value).length;
}

function activeDocument() {
  return state.documents[state.activeDraft];
}

function localeEntry(locale) {
  return activeDocument()?.locales?.[locale] ?? null;
}

function activePublishFields() {
  if (state.activeLocale !== SOURCE_LOCALE) return localeEntry(state.activeLocale)?.publishFields ?? null;
  return localeEntry(SOURCE_LOCALE)?.publishFields ?? activeDocument()?.publishFields ?? {};
}

function translationFacts() {
  return state.summary ? translationFactsFromSummary(state.summary) : {};
}

function providerLabel() {
  if (state.provider === "codex") return "Codex OAuth";
  if (state.provider === "auto") return "자동 추천";
  return "Grok OAuth";
}

function currentAuthorInputs(channel = state.activeDraft) {
  return state.documents[channel]?.internal?.authorInputs ?? {};
}

function currentOperationInputs(channel = state.activeDraft) {
  return state.documents[channel]?.internal?.operationInputs ?? {};
}

function currentCampaignBrief(channel = state.activeDraft) {
  const document = state.documents[channel];
  return {
    publisherRole: "curator",
    accountVoice: "personal",
    ownershipConfirmed: false,
    goal: "",
    audience: "",
    targetLocale: defaultLocale(channel),
    ...(document?.internal?.campaignBrief ?? {}),
  };
}

function targetLocaleFor(channel = state.activeDraft) {
  const profile = channelProfile(channel);
  const requested = currentCampaignBrief(channel).targetLocale;
  return profile?.supportedLocales?.includes(requested) ? requested : (profile?.defaultLocale ?? defaultLocale(channel));
}

function missingAuthorInputKeys(channel = state.activeDraft) {
  return validateTypedInputs(channel, currentAuthorInputs(channel), { scope: "content" })
    .filter((issue) => issue.code !== "UNKNOWN_INPUT")
    .map((issue) => issue.key);
}

function missingOperationInputKeys(channel = state.activeDraft) {
  return validateTypedInputs(channel, currentOperationInputs(channel), { scope: "operations" })
    .filter((issue) => issue.code !== "UNKNOWN_INPUT")
    .map((issue) => issue.key);
}

function newRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function cloneLocale(entry) {
  if (!entry) return null;
  return {
    ...entry,
    publishFields: entry.publishFields ? structuredClone(entry.publishFields) : entry.publishFields,
  };
}

function readinessLabel(entry) {
  if (!entry) return "확인 중";
  if (entry.securityStatus === "disabled") return "보안 격리 미검증";
  if (entry.securityStatus === "experimental") return "보안 실험 모드";
  if (entry.status === "ready") return "준비됨";
  if (entry.status === "login_required") return "로그인 필요";
  if (entry.status === "unavailable") return "미설치";
  if (entry.status === "auth_unknown") return "인증 미확인";
  if (entry.status === "installed") return "설치됨";
  return entry.status || "확인 불가";
}

function completionLabel(status) {
  return {
    candidate: "콘텐츠 후보",
    needs_input: "입력 필요",
    invalid: "콘텐츠 오류",
    reference_ready: "참고 자료 준비",
    manual_only: "직접 작성",
    stale: "오래됨",
  }[status] ?? status;
}

function lengthRuleText(profile) {
  const rules = profile?.lengthRules ?? {};
  const parts = [];
  if (rules.bodyWeighted) parts.push(`본문 ${rules.bodyWeighted} 가중자`);
  if (rules.segmentWeighted) parts.push(`구간 ${rules.segmentWeighted} 가중자`);
  if (rules.taglineChars) parts.push(`태그라인 ${rules.taglineChars}자`);
  if (rules.descriptionChars) parts.push(`설명 ${rules.descriptionChars}자`);
  if (profile?.ctaPolicy) parts.push(profile.ctaPolicy);
  return parts.join(" · ") || "채널 정책을 확인하세요";
}

function setProvider(provider) {
  state.provider = provider === "codex" || provider === "auto" ? provider : "grok";
  renderProviderControls();
}

function isTranslationAllowed(channel) {
  return supportMode(channel) === "compose" && targetLocaleFor(channel) !== SOURCE_LOCALE;
}

function sourceFieldsFor(channel) {
  const document = state.documents[channel];
  return document?.locales?.[SOURCE_LOCALE]?.publishFields ?? document?.publishFields ?? {};
}

function hasTranslatableSource(channel) {
  const fields = sourceFieldsFor(channel);
  if (!matchesFieldContract(channel, fields)) return false;
  return validatePublish(channel, fields, { facts: translationFacts() }).ok;
}

function needsTargetLocale(channel) {
  const target = targetLocaleFor(channel);
  const entry = state.documents[channel]?.locales?.[target];
  return !entry || Boolean(entry.stale);
}

function batchTranslateTargets() {
  return DRAFT_KEYS.filter((key) => (
    isTranslationAllowed(key)
    && hasTranslatableSource(key)
    && needsTargetLocale(key)
    && missingAuthorInputKeys(key).length === 0
  ));
}

function setTranslateStatus(text, tone = "neutral") {
  elements.translateStatus.textContent = text;
  elements.translateStatus.dataset.tone = tone;
}

function startTranslateClock(render) {
  clearInterval(translateElapsedTimer);
  render();
  translateElapsedTimer = setInterval(render, 1000);
}

function stopTranslateClock() {
  clearInterval(translateElapsedTimer);
}

async function requestJson(url, body, { signal } = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(state.apiNonce ? { "X-Viral-Nonce": state.apiNonce } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error("서버 응답을 읽지 못했습니다."); }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || "요청에 실패했습니다.");
    error.code = payload?.error?.code ?? "REQUEST_FAILED";
    error.retryable = response.status === 429 || response.status === 503 || Boolean(payload?.error?.retryable);
    error.retryAfter = response.headers.get("retry-after");
    throw error;
  }
  return payload;
}

function composeRequestInput(channel) {
  const sourceFields = sourceFieldsFor(channel);
  const targetLocale = targetLocaleFor(channel);
  const provider = state.provider === "auto" ? preferredProvider(channel) : state.provider;
  return {
    channel,
    provider,
    sourceLocale: SOURCE_LOCALE,
    targetLocale,
    publishFields: sourceFields,
    facts: translationFacts(),
    authorInputs: currentAuthorInputs(channel),
    operationInputs: currentOperationInputs(channel),
    campaignBrief: currentCampaignBrief(channel),
  };
}

function createCompositionAttempt(channel) {
  const input = composeRequestInput(channel);
  return {
    requestId: newRequestId(),
    idempotencyKey: newRequestId(),
    requestFingerprint: compositionRequestFingerprint(input),
    input,
  };
}

async function ensureApiCapabilities() {
  if (state.apiNonce) return;
  const response = await fetch("/api/v1/capabilities");
  const payload = await response.json();
  if (!response.ok || !payload?.nonce) throw new Error(payload?.error?.message || "로컬 API 보안 연결을 초기화하지 못했습니다.");
  state.apiNonce = payload.nonce;
}

async function requestApprovalRevision() {
  await ensureApiCapabilities();
  const context = currentApprovalContext();
  const payload = await requestJson("/api/v1/approval-revisions", {
    schemaVersion: "viral-approval-revision-request/v1",
    requestId: newRequestId(),
    ...context,
  });
  if (!payload?.approvalRevision?.copyText) throw new Error("승인 snapshot 응답을 확인하지 못했습니다.");
  return payload.approvalRevision;
}

function assertCurrentCompositionAttempt(channel, payload, attempt) {
  if (!attempt || payload.requestFingerprint !== attempt.requestFingerprint) {
    throw new Error("응답 지문이 요청과 달라 결과를 적용하지 않았습니다.");
  }
  const currentFingerprint = compositionRequestFingerprint(composeRequestInput(channel));
  if (currentFingerprint !== attempt.requestFingerprint) {
    throw new Error("원문 또는 작성자 입력이 생성 중 변경되어 결과를 적용하지 않았습니다.");
  }
}

function applyComposedLocale(channel, payload, attempt) {
  assertCurrentCompositionAttempt(channel, payload, attempt);
  const document = state.documents[channel];
  if (!document.locales) document.locales = {};
  const targetLocale = payload.targetLocale ?? targetLocaleFor(channel);
  const existing = document.locales[targetLocale];
  if (existing) {
    document.internal = {
      ...document.internal,
      // `previousEnglish` is retained only for old saved workspaces.
      previousCompositions: {
        ...(document.internal?.previousCompositions ?? {}),
        [targetLocale]: cloneLocale(existing),
      },
    };
  }
  document.locales[targetLocale] = {
    publishFields: payload.publishFields,
    englishSummary: payload.summary ?? payload.englishSummary,
    updatedAt: payload.composedAt ?? payload.translatedAt ?? new Date().toISOString(),
    sourceHash: payload.sourceHash,
    requestFingerprint: payload.requestFingerprint,
    compositionId: payload.compositionId,
    stale: false,
    composedHash: hashPublishFields(payload.publishFields),
    provider: payload.provider,
    supportMode: payload.supportMode,
    contentStatus: payload.contentStatus,
    operationsStatus: payload.operationsStatus,
    approvalStatus: payload.approvalStatus,
    publishReady: payload.publishReady,
    validation: payload.validation,
    evidence: payload.evidence ?? [],
  };
}

async function requestTranslation(channel, { signal } = {}) {
  await ensureApiCapabilities();
  const attempt = createCompositionAttempt(channel);
  const { input } = attempt;
  const body = {
    schemaVersion: "viral-compose-request/v1",
    requestId: attempt.requestId,
    idempotencyKey: attempt.idempotencyKey,
    requestFingerprint: attempt.requestFingerprint,
    channel,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    sourceHash: hashPublishFields(input.publishFields),
    facts: input.facts,
    sourceDraft: { publishFields: input.publishFields },
    publishFields: input.publishFields,
    authorInputs: input.authorInputs,
    operationInputs: input.operationInputs,
    campaignBrief: input.campaignBrief,
    approvalStatus: channel === state.activeDraft ? currentApprovalStatus() : "unreviewed",
    provider: state.provider,
  };
  let payload;
  try {
    payload = await requestJson("/api/v1/drafts/compose", body, { signal });
  } catch (error) {
    // A transport failure has no durable result in the browser. One retry keeps
    // the same idempotency key and lets the server return the in-flight/result.
    if (error.name !== "AbortError" && !error.code && !signal?.aborted) {
      payload = await requestJson("/api/v1/drafts/compose", body, { signal });
    } else {
      throw error;
    }
  }
  if (payload.contentStatus === "needs_input" || !payload.publishFields) {
    const missing = (payload.missingInputs ?? missingAuthorInputKeys(channel)).join(", ");
    throw new Error(missing ? `작성자 입력이 필요합니다: ${missing}` : "작성자 입력이 필요합니다.");
  }
  applyComposedLocale(channel, payload, attempt);
  return payload;
}

function hydrateDocuments(items) {
  return Object.fromEntries(DRAFT_KEYS.map((key) => {
    const original = items?.[key] ?? createDraftDocument(key);
    const document = createDraftDocument(key, {
      ...original,
      publishFields: original.publishFields,
      internal: original.internal,
    });
    const publishFields = document.publishFields ?? {};
    return [key, {
      ...document,
      locales: {
        [SOURCE_LOCALE]: {
          publishFields,
          updatedAt: new Date().toISOString(),
          sourceHash: hashPublishFields(publishFields),
        },
        ...original.locales,
      },
    }];
  }));
}

function documentsFromLegacyDrafts(drafts) {
  return Object.fromEntries(DRAFT_KEYS.map((key) => {
    const text = drafts[key] ?? "";
    const publishFields = key === "showHn" ? {} : parsePublish(key, text);
    return [key, {
      ...createDraftDocument(key, { publishFields }),
      locales: {
        [SOURCE_LOCALE]: {
          publishFields,
          updatedAt: new Date().toISOString(),
          sourceHash: hashPublishFields(publishFields),
          legacyMarkdown: text,
        },
      },
    }];
  }));
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function activePlatformReadinessRecord(channel = state.activeDraft) {
  const platform = platformForChannel(channel);
  if (!platform) return null;
  const stored = state.documents[channel]?.internal?.platformReadiness;
  try {
    const normalized = jsonClone(normalizePlatformReadiness(stored ?? emptyPlatformReadiness(platform)));
    if (!normalized.account.targetLocale) normalized.account.targetLocale = state.activeLocale;
    return normalized;
  } catch {
    return null;
  }
}

function currentPlatformReadinessAssessment(channel = state.activeDraft) {
  const platform = platformForChannel(channel);
  const readiness = activePlatformReadinessRecord(channel);
  if (!platform || !readiness) {
    return {
      status: "blocked",
      platform: platform ?? "",
      channel,
      readiness: null,
      accountTarget: null,
      assetHash: null,
      dryRunEligible: false,
      canStartDryRun: false,
      issues: [{ code: "SENSITIVE_READINESS_INPUT", message: "readiness 입력에 허용되지 않는 민감 정보 또는 개인 경로가 있습니다." }],
    };
  }
  return assessPlatformReadiness({ channel, readiness, operationInputs: currentOperationInputs(channel), targetLocale: channel === state.activeDraft ? state.activeLocale : undefined });
}

function updatePlatformReadiness(mutator, { render = false } = {}) {
  const document = activeDocument();
  const current = activePlatformReadinessRecord();
  if (!document || !current) return;
  const next = jsonClone(current);
  mutator(next);
  try {
    const normalized = normalizePlatformReadiness(next);
    document.internal = { ...document.internal, platformReadiness: normalized };
    setTranslateStatus("계정·권한·자산 readiness를 로컬 작업공간에 저장했습니다. 원고 승인 전 다시 확인하세요.", "neutral");
  } catch (error) {
    setTranslateStatus(error.message || "민감 정보 또는 개인 경로는 readiness에 저장할 수 없습니다.", "error");
  }
  if (render) renderPlatformReadiness();
  renderDraftValidation();
  if (!render) renderThreadsPreview();
  persistWorkspace();
}

function setReadinessPath(target, path, value) {
  const keys = path.split(".");
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    if (!isRecord(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys.at(-1)] = value;
}

function readableReadinessIssue(assessment) {
  if (assessment.status === "ready_for_phase_3") return "계정·정책·권한·자산 사전조건을 확인했습니다. 승인 snapshot을 만든 뒤 local dry-run만 실행할 수 있습니다.";
  const first = assessment.issues?.[0];
  return first ? `${first.code}: ${first.message}` : "외부 준비 상태를 확인하세요.";
}

function currentDryRunEligibility(assessment = currentPlatformReadinessAssessment()) {
  const connector = dryRunConnectorForChannel(state.activeDraft);
  const approval = currentApprovalAssessment();
  const ready = state.phase === "success"
    && Boolean(connector)
    && assessment.dryRunEligible === true
    && approval.status === "approved"
    && /^[A-Za-z0-9._:-]{8,160}$/u.test(state.dryRunCredentialHandle)
    && state.dryRunKillSwitchLocked
    && !state.dryRunLoading;
  let reason = "";
  if (!connector) reason = "이 채널은 local dry-run connector 대상이 아닙니다.";
  else if (state.phase !== "success") reason = "콘텐츠를 먼저 생성하세요.";
  else if (approval.status !== "approved") reason = approval.status === "invalidated" ? approvalInvalidationMessage(approval) : "현재 원고를 사람이 검토한 뒤 승인 snapshot을 만드세요.";
  else if (!assessment.dryRunEligible) reason = readableReadinessIssue(assessment);
  else if (!/^[A-Za-z0-9._:-]{8,160}$/u.test(state.dryRunCredentialHandle)) reason = "비밀값이 아닌 외부 vault credential reference를 8자 이상 입력하세요.";
  else if (!state.dryRunKillSwitchLocked) reason = "실제 게시 잠금(kill switch) 유지 여부를 확인하세요.";
  else if (state.dryRunLoading) reason = "local dry-run을 준비하고 있습니다.";
  return { ready, reason, connector, approval };
}

function renderDryRunReceipt() {
  if (!elements.readinessDryRunResult) return;
  const receipt = state.dryRunReceipt;
  const revision = activeDocument()?.internal?.approvalRevision;
  if (!receipt || receipt.channel !== state.activeDraft || receipt.approvalRevisionId !== revision?.revisionId || currentApprovalAssessment().status !== "approved") {
    elements.readinessDryRunResult.textContent = "";
    elements.readinessDryRunResult.dataset.state = "";
    return;
  }
  elements.readinessDryRunResult.textContent = `local dry-run 완료 · ${receipt.receiptId} · ${receipt.requestCount}개 payload 계획 · 외부 write ${receipt.networkWriteCount}회`;
  elements.readinessDryRunResult.dataset.state = "ready";
}

function appendReadinessControl(grid, {
  label,
  value,
  path,
  type = "text",
  options = [],
  wide = false,
  hint = "",
  onChange,
} = {}) {
  const wrapper = document.createElement("label");
  if (wide) wrapper.dataset.wide = "true";
  const title = document.createElement("span");
  title.textContent = label;
  let input;
  if (type === "checkbox") {
    wrapper.className = "readiness-check";
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value === true;
    input.addEventListener("change", () => onChange(input.checked));
  } else if (type === "select") {
    input = document.createElement("select");
    for (const option of options) {
      const item = document.createElement("option");
      item.value = option.value ?? option;
      item.textContent = option.label ?? option;
      input.append(item);
    }
    input.value = options.some((option) => (option.value ?? option) === value) ? value : (options[0]?.value ?? options[0] ?? "");
    input.addEventListener("change", () => onChange(input.value));
  } else {
    input = document.createElement("input");
    input.type = type;
    input.value = value ?? "";
    input.addEventListener(type === "date" ? "change" : "input", () => onChange(input.value));
  }
  input.dataset.platformReadiness = path;
  input.disabled = state.phase !== "success" || state.approvalLoading;
  if (hint) input.title = hint;
  if (type === "checkbox") wrapper.append(input, title);
  else wrapper.append(title, input);
  grid.append(wrapper);
}

function appendReadinessFieldset(container, legendText, description = "") {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "readiness-fieldset";
  const legend = document.createElement("legend");
  legend.textContent = legendText;
  fieldset.append(legend);
  if (description) {
    const help = document.createElement("p");
    help.textContent = description;
    fieldset.append(help);
  }
  const grid = document.createElement("div");
  grid.className = "readiness-control-grid";
  fieldset.append(grid);
  container.append(fieldset);
  return grid;
}

function updateManualOperationInput(key, value) {
  const document = activeDocument();
  document.internal = {
    ...document.internal,
    operationInputs: { ...currentOperationInputs(), [key]: value },
  };
  renderDraftValidation();
  persistWorkspace();
}

function appendManualOperationControls(container) {
  const channel = state.activeDraft;
  const grid = appendReadinessFieldset(container, "수동 운영 확인", "이 채널은 자동 게시 대상이 아닙니다. 기존 operation gate만 이곳에서 동일하게 기록합니다.");
  const defs = authorInputDefs(channel).filter((def) => def.scope === "operations");
  const explicit = new Set(defs.map((def) => def.key));
  const generic = (channelProfile(channel)?.prepublishGates ?? [])
    .filter((gate) => !explicit.has(gate.key))
    .map((gate) => ({ key: gate.key, label: gate.message, type: "boolean", scope: "operations" }));
  for (const def of [...defs, ...generic]) {
    const value = currentOperationInputs()[def.key];
    if (def.type === "boolean") {
      appendReadinessControl(grid, {
        label: def.label,
        value,
        path: `manual.${def.key}`,
        type: "checkbox",
        onChange: (next) => updateManualOperationInput(def.key, next),
      });
    } else if (def.type === "locale") {
      appendReadinessControl(grid, {
        label: def.label,
        value,
        path: `manual.${def.key}`,
        type: "select",
        options: (channelProfile(channel)?.supportedLocales ?? SUPPORTED_LOCALES).map((locale) => ({ value: locale, label: localeLabel(locale) })),
        onChange: (next) => updateManualOperationInput(def.key, next),
      });
    } else {
      appendReadinessControl(grid, {
        label: def.label,
        value,
        path: `manual.${def.key}`,
        type: def.type === "url" ? "url" : (def.type === "date" ? "date" : "text"),
        wide: true,
        onChange: (next) => updateManualOperationInput(def.key, next),
      });
    }
  }
  if (defs.length + generic.length === 0) {
    const note = document.createElement("p");
    note.className = "readiness-note";
    note.textContent = "이 채널에는 코드화된 operation gate가 없습니다. 플랫폼의 최신 수동 등록 규칙은 게시 직전에 직접 확인하세요.";
    grid.append(note);
  }
}

function readImageOrVideoDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const isVideo = String(file.type).startsWith("video/");
    const media = document.createElement(isVideo ? "video" : "img");
    const finish = () => {
      const width = Number(isVideo ? media.videoWidth : media.naturalWidth) || 0;
      const height = Number(isVideo ? media.videoHeight : media.naturalHeight) || 0;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    media.addEventListener(isVideo ? "loadedmetadata" : "load", finish, { once: true });
    media.addEventListener("error", finish, { once: true });
    media.src = url;
  });
}

async function inspectLocalAsset(file) {
  if (!file) return;
  try {
    const [buffer, dimensions] = await Promise.all([file.arrayBuffer(), readImageOrVideoDimensions(file)]);
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    updatePlatformReadiness((record) => {
      record.asset = {
        hash,
        fileName: String(file.name ?? "").split(/[\\/]/u).at(-1) ?? "",
        mimeType: file.type,
        sizeBytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        altText: record.asset?.altText ?? "",
        rightsConfirmed: record.asset?.rightsConfirmed === true,
        publicUrl: record.asset?.publicUrl ?? "",
      };
    }, { render: true });
  } catch {
    setTranslateStatus("자산 hash 또는 해상도를 읽지 못했습니다. 파일을 다시 선택하세요.", "error");
  }
}

function appendAssetControls(container, record, schema) {
  const grid = appendReadinessFieldset(container, "자산 readiness", schema.requiresAsset
    ? "파일 자체는 저장·업로드하지 않습니다. SHA-256·형식·크기·해상도와 권리 확인만 로컬에 기록합니다."
    : "텍스트 dry-run 후보입니다. 이 플랫폼은 미디어 없이 account/app readiness를 확인할 수 있습니다.");
  if (!schema.requiresAsset) {
    const note = document.createElement("p");
    note.className = "readiness-note";
    note.textContent = "텍스트 전용 원고는 asset 없이 사전조건을 통과할 수 있습니다. 기존 채널 operation gate는 별도로 계속 적용됩니다.";
    grid.append(note);
    return;
  }
  const picker = document.createElement("label");
  picker.dataset.wide = "true";
  const title = document.createElement("span");
  title.textContent = "로컬 이미지 또는 영상 선택";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
  input.disabled = state.phase !== "success";
  input.addEventListener("change", () => inspectLocalAsset(input.files?.[0]));
  picker.append(title, input);
  grid.append(picker);
  const asset = record.asset ?? {};
  appendReadinessControl(grid, {
    label: "대체 텍스트 / 접근성 설명",
    value: asset.altText,
    path: "asset.altText",
    wide: true,
    onChange: (next) => updatePlatformReadiness((nextRecord) => {
      nextRecord.asset = { ...(nextRecord.asset ?? {}), altText: next };
    }),
  });
  appendReadinessControl(grid, {
    label: "자산 권리·사용 허가를 확인했습니다",
    value: asset.rightsConfirmed,
    path: "asset.rightsConfirmed",
    type: "checkbox",
    onChange: (next) => updatePlatformReadiness((nextRecord) => {
      nextRecord.asset = { ...(nextRecord.asset ?? {}), rightsConfirmed: next };
    }),
  });
  if (schema.requiresPublicAssetUrl) {
    appendReadinessControl(grid, {
      label: "공개 HTTPS 자산 URL",
      value: asset.publicUrl,
      path: "asset.publicUrl",
      type: "url",
      wide: true,
      onChange: (next) => updatePlatformReadiness((nextRecord) => {
        nextRecord.asset = { ...(nextRecord.asset ?? {}), publicUrl: next };
      }),
    });
  }
  const note = document.createElement("p");
  note.className = "readiness-note";
  note.textContent = asset.hash
    ? `선택한 파일: ${asset.mimeType || "unknown"} · ${asset.sizeBytes || 0} bytes · ${asset.width || 0}×${asset.height || 0} · SHA-256 ${asset.hash.slice(0, 12)}…`
    : "파일을 선택하면 SHA-256와 형식·크기·해상도를 로컬에서 계산합니다. 파일 내용과 경로는 저장하지 않습니다.";
  grid.append(note);
}

function renderReadinessStatusGrid(assessment) {
  if (!elements.readinessStatusGrid) return;
  const completion = displayCompletionState(activeDocument(), {
    locale: state.activeLocale,
    validationOk: currentCompletionStatus() !== "invalid",
    authorInputs: currentAuthorInputs(),
    operationInputs: currentOperationInputs(),
    campaignBrief: currentCampaignBrief(),
    approvalStatus: currentApprovalStatus(),
  });
  const approval = currentApprovalAssessment();
  const profile = platformReadinessSchema(assessment.platform || platformForChannel(state.activeDraft));
  const rows = [
    ["CONTENT", completion.contentStatus === "candidate" ? "후보" : "확인 필요", completion.contentStatus === "candidate" ? "ready" : "blocked"],
    ["OPERATION", completion.operationsStatus === "ready" ? "확인" : "대기", completion.operationsStatus === "ready" ? "ready" : "blocked"],
    ["APPROVAL", approval.status === "approved" ? "snapshot 승인" : (approval.status === "invalidated" ? "무효" : "미승인"), approval.status === "approved" ? "ready" : "blocked"],
    ["CONNECTION", assessment.status === "ready_for_phase_3" ? "사전조건 충족" : (profile.automationMode === "manual_only" || profile.automationMode === "draft_only" ? "수동 유지" : "차단"), assessment.status === "ready_for_phase_3" ? "ready" : (profile.automationMode === "manual_only" || profile.automationMode === "draft_only" ? "manual" : "blocked")],
    ["INTENT", currentDryRunEligibility(assessment).ready ? "local dry-run 가능" : "승인·connector 대기", currentDryRunEligibility(assessment).ready ? "ready" : "blocked"],
  ];
  elements.readinessStatusGrid.replaceChildren();
  for (const [label, value, stateValue] of rows) {
    const card = document.createElement("article");
    card.dataset.state = stateValue;
    const title = document.createElement("strong");
    title.textContent = label;
    const detail = document.createElement("span");
    detail.textContent = value;
    card.append(title, detail);
    elements.readinessStatusGrid.append(card);
  }
}

function renderPlatformReadiness() {
  if (!elements.platformReadinessFields || !elements.platformReadinessStatus) return;
  const assessment = currentPlatformReadinessAssessment();
  renderReadinessStatusGrid(assessment);
  const container = elements.platformReadinessFields;
  container.replaceChildren();
  const platform = assessment.platform || platformForChannel(state.activeDraft);
  const connector = dryRunConnectorForChannel(state.activeDraft);
  if (elements.dryRunSafetyControls) elements.dryRunSafetyControls.hidden = !connector;
  if (elements.dryRunCredentialHandle && elements.dryRunCredentialHandle.value !== state.dryRunCredentialHandle) {
    elements.dryRunCredentialHandle.value = state.dryRunCredentialHandle;
  }
  if (elements.dryRunKillSwitch) elements.dryRunKillSwitch.checked = state.dryRunKillSwitchLocked;
  if (!platform || !assessment.readiness) {
    elements.platformReadinessStatus.textContent = "지원하지 않는 readiness 입력입니다. 민감 정보와 개인 경로를 제거하세요.";
    elements.platformReadinessStatus.dataset.state = "blocked";
    elements.readinessReportButton.disabled = true;
    elements.readinessDryRunButton.disabled = true;
    renderDryRunReceipt();
    renderThreadsPreview();
    return;
  }
  const record = assessment.readiness;
  const schema = platformReadinessSchema(platform);
  const manual = schema.automationMode === "manual_only" || schema.automationMode === "draft_only";
  if (manual) {
    appendManualOperationControls(container);
  } else {
    const account = record.account;
    const accountGrid = appendReadinessFieldset(container, "계정 대상", "계정 ID는 공개 profile/Page/channel 식별자만 입력합니다. 비밀번호나 인증값은 입력하지 않습니다.");
    appendReadinessControl(accountGrid, { label: "계정 유형", value: account.accountType, path: "account.accountType", type: "select", options: schema.accountTypes, onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.accountType", next)) });
    appendReadinessControl(accountGrid, { label: "공개 profile/Page ID", value: account.profileId, path: "account.profileId", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.profileId", next)) });
    appendReadinessControl(accountGrid, { label: "게시 대상 ID", value: account.targetId, path: "account.targetId", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.targetId", next)) });
    appendReadinessControl(accountGrid, { label: "대상 유형", value: account.targetType, path: "account.targetType", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.targetType", next)) });
    appendReadinessControl(accountGrid, { label: "공개 handle", value: account.handle, path: "account.handle", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.handle", next)) });
    appendReadinessControl(accountGrid, { label: "계정 책임자", value: account.owner, path: "account.owner", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.owner", next)) });
    appendReadinessControl(accountGrid, { label: "공개 profile URL", value: account.profileUrl, path: "account.profileUrl", type: "url", wide: true, onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.profileUrl", next)) });
    appendReadinessControl(accountGrid, { label: "Timezone", value: account.timezone, path: "account.timezone", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.timezone", next)) });
    appendReadinessControl(accountGrid, { label: "게시 언어", value: account.targetLocale, path: "account.targetLocale", type: "select", options: supportedLocales(state.activeDraft).map((locale) => ({ value: locale, label: localeLabel(locale) })), onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "account.targetLocale", next)) });

    const app = record.developerApp;
    const appGrid = appendReadinessFieldset(container, "Developer App·권한", "App ID와 승인된 scope만 기록합니다. 실제 OAuth credential은 외부 vault에만 보관합니다.");
    appendReadinessControl(appGrid, { label: "Developer App 준비를 확인했습니다", value: app.configured, path: "developerApp.configured", type: "checkbox", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "developerApp.configured", next)) });
    appendReadinessControl(appGrid, { label: "Developer App ID", value: app.appId, path: "developerApp.appId", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "developerApp.appId", next)) });
    appendReadinessControl(appGrid, { label: "등록 redirect URI", value: app.redirectUri, path: "developerApp.redirectUri", type: "url", wide: true, onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "developerApp.redirectUri", next)) });
    for (const scope of schema.requiredScopes) {
      appendReadinessControl(appGrid, { label: `승인 scope: ${scope}`, value: app.approvedScopes.includes(scope), path: `developerApp.scope.${scope}`, type: "checkbox", onChange: (checked) => updatePlatformReadiness((nextRecord) => {
        const currentScopes = new Set(nextRecord.developerApp.approvedScopes ?? []);
        if (checked) currentScopes.add(scope); else currentScopes.delete(scope);
        nextRecord.developerApp.approvedScopes = [...currentScopes].sort();
      }) });
    }
    appendReadinessControl(appGrid, { label: "외부 credential vault 준비를 확인했습니다", value: app.credentialVaultConfirmed, path: "developerApp.credentialVaultConfirmed", type: "checkbox", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "developerApp.credentialVaultConfirmed", next)) });
    const vaultNote = document.createElement("p");
    vaultNote.className = "readiness-note";
    vaultNote.textContent = `credential 저장 상태: ${EXTERNAL_CREDENTIAL_VAULT_STATUS}. 이 앱에는 credential 입력 칸·저장소·외부 요청이 없습니다.`;
    appGrid.append(vaultNote);

    const policyGrid = appendReadinessFieldset(container, "정책 snapshot", "공식 정책을 직접 확인한 URL과 날짜를 기록합니다. 확인일이 30일을 넘으면 재확인이 필요합니다.");
    appendReadinessControl(policyGrid, { label: "공식 정책 URL", value: record.policy.url, path: "policy.url", type: "url", wide: true, onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "policy.url", next)) });
    appendReadinessControl(policyGrid, { label: "정책 확인일", value: record.policy.verifiedAt, path: "policy.verifiedAt", type: "date", onChange: (next) => updatePlatformReadiness((nextRecord) => setReadinessPath(nextRecord, "policy.verifiedAt", next)) });
    appendAssetControls(container, record, schema);
  }
  elements.platformReadinessStatus.textContent = readableReadinessIssue(assessment);
  elements.platformReadinessStatus.dataset.state = assessment.status === "ready_for_phase_3" ? "ready" : (manual ? "manual" : "blocked");
  elements.readinessReportButton.disabled = state.phase !== "success";
  const dryRun = currentDryRunEligibility(assessment);
  elements.readinessDryRunButton.disabled = !dryRun.ready;
  elements.readinessDryRunButton.textContent = dryRun.connector
    ? `${platformReadinessSchema(platform).platform === "threads" ? "Threads" : platform === "x" ? "X" : "LinkedIn"} local dry-run 실행`
    : "이 채널은 local dry-run 대상이 아닙니다";
  elements.readinessDryRunButton.title = dryRun.ready
    ? "승인 snapshot과 readiness를 대조해 local payload 계획·receipt만 만듭니다. 외부 플랫폼 요청은 0회입니다."
    : dryRun.reason;
  elements.dryRunEvidenceButton.disabled = !state.dryRunEvidence
    || state.dryRunEvidence.channel !== state.activeDraft
    || state.dryRunEvidence.approvalRevisionId !== activeDocument()?.internal?.approvalRevision?.revisionId
    || currentApprovalAssessment().status !== "approved";
  renderDryRunReceipt();
  renderThreadsPreview();
}

function currentApprovalContext() {
  const document = activeDocument();
  const sourceFields = localeEntry(SOURCE_LOCALE)?.publishFields ?? document?.publishFields ?? {};
  const readiness = currentPlatformReadinessAssessment();
  return {
    channel: state.activeDraft,
    targetLocale: state.activeLocale,
    publishFields: activePublishFields() ?? {},
    sourcePublishFields: sourceFields,
    facts: translationFacts(),
    authorInputs: currentAuthorInputs(),
    operationInputs: currentOperationInputs(),
    campaignBrief: currentCampaignBrief(),
    assetHash: readiness.assetHash ?? null,
    accountTarget: readiness.accountTarget ?? null,
    approvedBy: document?.internal?.approvalActor ?? "",
    // Checking the control is the explicit human confirmation for the selected
    // language; the server snapshots this boolean with the exact copy.
    localeReviewed: true,
  };
}

function currentApprovalAssessment() {
  return assessApprovalRevision(activeDocument()?.internal?.approvalRevision, currentApprovalContext());
}

function currentApprovalStatus() {
  return currentApprovalAssessment().status === "approved" ? "approved" : "unreviewed";
}

function approvalInvalidationMessage(assessment = currentApprovalAssessment()) {
  if (assessment.status !== "invalidated") return "";
  const labels = {
    PUBLISH_FIELDS_CHANGED: "게시 필드",
    SOURCE_CHANGED: "원문",
    FACTS_CHANGED: "사실",
    LOCALE_CHANGED: "게시 언어",
    AUTHOR_INPUTS_CHANGED: "작성자 입력",
    OPERATION_INPUTS_CHANGED: "운영 입력",
    CAMPAIGN_BRIEF_CHANGED: "캠페인 정보",
    ASSET_CHANGED: "자산",
    ACCOUNT_TARGET_CHANGED: "계정 대상",
    APPROVER_CHANGED: "승인자",
    LOCALE_REVIEW_REQUIRED: "언어 검토",
  };
  const changed = assessment.reasons.map((reason) => labels[reason] ?? "승인 snapshot").join(", ");
  return `${changed}이(가) 바뀌어 승인 snapshot이 무효화되었습니다. 다시 승인하세요.`;
}

function currentCopyText() {
  const assessment = currentApprovalAssessment();
  const revision = activeDocument()?.internal?.approvalRevision;
  if (assessment.valid && revision?.targetLocale === state.activeLocale) return revision.copyText;
  const fields = activePublishFields();
  if (!fields) return "";
  return serializePublish(state.activeDraft, fields);
}

function currentCompletionStatus() {
  const document = activeDocument();
  const translation = state.activeLocale === SOURCE_LOCALE ? null : localeEntry(state.activeLocale);
  const missingTranslation = state.activeLocale !== SOURCE_LOCALE && !translation;
  const fields = activePublishFields() ?? {};
  const validation = missingTranslation || state.activeDraft === "showHn"
    ? { ok: true, issues: [] }
    : validatePublish(state.activeDraft, fields, { facts: translationFacts(), campaignBrief: currentCampaignBrief() });
  return displayCompletionStatus(document, {
    locale: state.activeLocale,
    stale: Boolean(translation?.stale),
    missingTranslation,
    validationOk: validation.ok,
    authorInputs: currentAuthorInputs(),
    operationInputs: currentOperationInputs(),
    campaignBrief: currentCampaignBrief(),
    approvalStatus: currentApprovalStatus(),
  });
}

function renderDraftValidation() {
  const document = activeDocument();
  const translation = state.activeLocale === SOURCE_LOCALE ? null : localeEntry(state.activeLocale);
  const missingTranslation = state.activeLocale !== SOURCE_LOCALE && !translation;
  const fields = activePublishFields() ?? {};
  const validation = missingTranslation || state.activeDraft === "showHn"
    ? { ok: true, issues: [] }
    : validatePublish(state.activeDraft, fields, { facts: translationFacts(), campaignBrief: currentCampaignBrief() });
  const completionStatus = currentCompletionStatus();
  const completionState = displayCompletionState(document, {
    locale: state.activeLocale,
    stale: Boolean(translation?.stale),
    missingTranslation,
    validationOk: validation.ok,
    authorInputs: currentAuthorInputs(),
    operationInputs: currentOperationInputs(),
    campaignBrief: currentCampaignBrief(),
    approvalStatus: currentApprovalStatus(),
  });
  let block = state.phase !== "success"
    ? "콘텐츠를 먼저 생성하세요."
    : copyBlockReason(document, {
      locale: state.activeLocale,
      stale: Boolean(translation?.stale),
      missingTranslation,
      validation,
      completionStatus,
      authorInputs: currentAuthorInputs(),
      operationInputs: currentOperationInputs(),
      campaignBrief: currentCampaignBrief(),
      approvalStatus: currentApprovalStatus(),
    });
  const approvalAssessment = currentApprovalAssessment();
  if (state.phase === "success" && approvalAssessment.status === "invalidated") {
    block = approvalInvalidationMessage(approvalAssessment);
  }
  if (elements.completionBadge) {
    const content = completionStatus === "stale" ? "오래됨" : completionLabel(completionState.contentStatus);
    const approval = approvalAssessment.status === "approved" ? "snapshot 승인" : approvalAssessment.status === "invalidated" ? "snapshot 무효" : "미승인";
    elements.completionBadge.textContent = `${content} · 운영 ${completionState.operationsStatus === "ready" ? "확인" : "대기"} · ${approval}`;
  }
  elements.approvalSnapshotStatus.textContent = approvalAssessment.status === "approved"
    ? `승인 snapshot ${activeDocument()?.internal?.approvalRevision?.revisionId ?? ""} · ${activeDocument()?.internal?.approvalRevision?.approvedAt ?? ""}`
    : approvalInvalidationMessage(approvalAssessment);

  if (X_SINGLE_KEYS.has(state.activeDraft)) {
    elements.characterCount.textContent = `${countXWeightedCharacters(String(fields.body ?? "").trim()).toLocaleString("ko-KR")} / 280 가중자`;
  } else if (state.activeDraft === "xThread") {
    const segments = Array.isArray(fields.segments) ? fields.segments : [];
    const maximum = segments.length ? Math.max(...segments.map((segment) => countXWeightedCharacters(segment))) : 0;
    elements.characterCount.textContent = `${maximum.toLocaleString("ko-KR")} / 280 최대`;
  } else if (state.activeDraft === "productHunt") {
    elements.characterCount.textContent = `태그라인 ${countCharacters(fields.tagline ?? "")}/60 · 설명 ${countCharacters(fields.description ?? "")}/260`;
  } else {
    elements.characterCount.textContent = `${countCharacters(currentCopyText()).toLocaleString("ko-KR")}자`;
  }

  const fallback = {
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

  if (block) {
    elements.verificationStatus.textContent = block;
    elements.draftStatus.dataset.state = validation.ok ? "warning" : "error";
  } else if (X_SINGLE_KEYS.has(state.activeDraft)) {
    elements.verificationStatus.textContent = "X 형식 검사 통과 · 게시 전 문구 확인 필요";
    elements.draftStatus.dataset.state = "ready";
  } else if (state.activeDraft === "xThread") {
    const segments = Array.isArray(fields.segments) ? fields.segments : [];
    elements.verificationStatus.textContent = `X 스레드 ${segments.length}개 구간 검사 통과`;
    elements.draftStatus.dataset.state = "ready";
  } else {
    const [message, status] = fallback[state.activeDraft] || ["수동 검토가 필요합니다.", "warning"];
    elements.verificationStatus.textContent = message;
    elements.draftStatus.dataset.state = status;
  }

  const canCopy = state.phase === "success" && !block && completionState.publishReady;
  elements.copyButton.disabled = !canCopy;
  elements.downloadButton.disabled = !canCopy;
  elements.copyButton.title = block || "현재 게시 필드만 복사합니다.";
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
  return upgradeWorkspaceToV7(upgradeWorkspaceToV6(upgradeWorkspaceToV5(upgradeWorkspaceToV4({
    ...workspace,
    version: 3,
    drafts: expandDrafts(workspace.drafts),
    initialDrafts: expandDrafts(workspace.initialDrafts),
    activeDraft: DRAFT_CONFIG[workspace.activeDraft] ? workspace.activeDraft : "x1",
    migratedFrom: workspace.migratedFrom || 2,
  }))));
}

function upgradeWorkspaceToV4(workspace) {
  if (!isRecord(workspace) || workspace.version === 4 || workspace.version >= 5) return workspace;
  if (workspace.version !== 3) return workspace;
  return {
    ...workspace,
    version: 4,
    documents: documentsFromLegacyDrafts(workspace.drafts),
    activeLocale: SOURCE_LOCALE,
    migratedFrom: workspace.migratedFrom || 3,
  };
}

function upgradeWorkspaceToV5(workspace) {
  if (!isRecord(workspace) || workspace.version >= 5) return workspace;
  if (workspace.version !== 4) return workspace;
  const documents = Object.fromEntries(Object.entries(workspace.documents ?? {}).map(([channel, document]) => [
    channel,
    {
      ...document,
      internal: {
        ...(document?.internal ?? {}),
        previousCompositions: {
          ...(document?.internal?.previousCompositions ?? {}),
          ...(document?.internal?.previousEnglish ? { "en-US": document.internal.previousEnglish } : {}),
        },
      },
    },
  ]));
  return { ...workspace, version: 5, documents };
}

function upgradeWorkspaceToV6(workspace) {
  return upgradeWorkspaceApprovalSnapshots(workspace);
}

function upgradeWorkspaceToV7(workspace) {
  return upgradeWorkspacePlatformReadiness(workspace);
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

  return typeof value.summary.name === "string"
    && typeof value.summary.description === "string"
    && isRecord(value.documents);
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
    documents: state.documents,
    activeDraft: state.activeDraft,
    activeLocale: state.activeLocale,
    provider: state.provider,
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
    workspace = upgradeWorkspaceToV7(upgradeWorkspaceToV6(upgradeWorkspaceToV5(upgradeWorkspaceToV4(migrateStoredWorkspace(JSON.parse(stored))))));
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
  state.documents = workspace.documents ?? documentsFromLegacyDrafts(workspace.drafts);
  state.drafts = draftViewFromDocuments(state.documents);
  state.initialDrafts = { ...state.drafts };
  state.activeDraft = workspace.activeDraft;
  state.activeLocale = SUPPORTED_LOCALES.includes(workspace.activeLocale) ? workspace.activeLocale : SOURCE_LOCALE;
  state.provider = workspace.provider === "codex" || workspace.provider === "auto" ? workspace.provider : "grok";
  state.baseline = isBaseline(workspace.baseline) ? { ...workspace.baseline } : null;
  state.preflight = isPreflight(workspace.preflight) ? { ...workspace.preflight } : createDefaultPreflight();
  state.phase = "success";
  state.persisted = true;
  updateDirtyState();

  elements.input.value = workspace.repoUrl;
  renderRepository();
  setDraftActionsEnabled(true);
  renderActiveDraft();

  fetchReadiness();

  const savedAt = new Date(workspace.savedAt).toLocaleString("ko-KR");
  const migrationNote = workspace.migratedFrom === 1
    ? " 기존 3종 원고를 이동했으며, 전체 채널 초안은 콘텐츠 생성을 다시 눌러 만드세요."
    : workspace.migratedFrom === 2
      ? " 기존 12종 원고를 유지했으며, 신규 6종은 콘텐츠 생성을 다시 눌러 만드세요."
      : workspace.migratedFrom === 3
        ? " 구조화 초안은 콘텐츠 생성을 다시 눌러 만드세요."
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

function platformInventoryState(profile) {
  if (profile.status === "manual_only") return "hold";
  if (profile.status === "draft_only" || profile.status === "needs_reverify") return "gate";
  if (profile.tier === "A1") return "draft";
  return "gate";
}

function platformInventoryLabel(profile) {
  if (profile.status === "manual_only") return "manual-only · 자동화 없음";
  if (profile.status === "draft_only") return "draft-only · 사람 검토";
  if (profile.status === "needs_reverify") return "정책 재확인 필요";
  if (profile.tier === "A1") return "A1 · 첫 dry-run pilot";
  if (profile.tier === "A2") return "A2 · 후속 검증군";
  return `${profile.tier} · 준비 조건 확인`;
}

// The UI exposes a fixed local-only dry-run action for Threads, X, and
// LinkedIn. It has no connector picker, OAuth form, or external platform
// request.
function renderPlatformInventory() {
  if (!elements.channelGrid) return;
  elements.channelGrid.replaceChildren();
  for (const profile of platformReadinessList()) {
    const card = document.createElement("article");
    card.dataset.state = platformInventoryState(profile);
    card.dataset.platform = profile.id;
    card.setAttribute("aria-label", `${profile.label}: ${platformInventoryLabel(profile)}`);

    const title = document.createElement("strong");
    title.textContent = profile.label;
    const detail = document.createElement("span");
    detail.textContent = platformInventoryLabel(profile);
    card.append(title, detail);
    elements.channelGrid.append(card);
  }
}

function renderAutomationGoLiveDecision() {
  const assessment = automationGoLiveAssessment();
  elements.goLiveInternalStatus.textContent = assessment.internalPreparationStatus === "complete" ? "완료" : "대기";
  elements.goLiveExternalStatus.textContent = assessment.externalInputsStatus === "deferred" ? "후순위" : assessment.externalInputsStatus;
  elements.goLiveDecision.textContent = assessment.decision;
  elements.goLivePublishCapability.textContent = assessment.actualPublishCapability ? "활성" : "차단";
  elements.goLiveScope.textContent = "Threads · 승인된 단일 텍스트 1건 · 자동 재시도/예약/미디어/교차 게시 없음";
  elements.goLiveDeferredInputs.replaceChildren();
  for (const item of assessment.deferredExternalInputs) {
    const row = document.createElement("li");
    row.textContent = item.label;
    elements.goLiveDeferredInputs.append(row);
  }
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
  renderPlatformInventory();
  renderPlatformReadiness();
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

function draftViewFromDocuments(documents = state.documents) {
  return Object.fromEntries(DRAFT_KEYS.map((key) => {
    const fields = documents[key]?.locales?.[SOURCE_LOCALE]?.publishFields ?? documents[key]?.publishFields ?? {};
    return [key, serializePublish(key, fields)];
  }));
}

function syncDraftsFromDocuments() {
  state.drafts = draftViewFromDocuments();
}

function updateDirtyState() {
  syncDraftsFromDocuments();
  state.dirty = DRAFT_KEYS.some((key) => state.drafts[key] !== state.initialDrafts[key]);
}

function setDraftActionsEnabled(enabled) {
  elements.editor.disabled = !enabled;
  elements.translationEditor.disabled = !enabled;
  elements.localeSelect.disabled = !enabled;
  elements.downloadAllButton.disabled = !enabled;
  renderTranslateControls();
  renderDraftValidation();
  renderPlatformReadiness();
}

function renderReadiness() {
  const grok = readinessLabel(state.readiness.grok);
  const codex = readinessLabel(state.readiness.codex);
  elements.providerReadiness.textContent = `Grok ${grok} · Codex ${codex}`;
  const selected = state.provider === "auto"
    ? state.readiness[preferredProvider(state.activeDraft) ?? "grok"]
    : state.readiness[state.provider];
  const tone = selected?.status === "ready"
    ? "success"
    : selected?.status === "login_required" || selected?.status === "unavailable"
      ? "error"
      : "neutral";
  elements.providerReadiness.dataset.tone = tone;
}

function renderProviderControls() {
  const nonCompose = supportMode(state.activeDraft) !== "compose" || targetLocaleFor() === SOURCE_LOCALE;
  const enabled = state.phase === "success" && !state.translateLoading && !nonCompose;
  elements.providerField.hidden = nonCompose;
  elements.providerAuto.disabled = !enabled;
  elements.providerGrok.disabled = !enabled;
  elements.providerCodex.disabled = !enabled;
  elements.providerAuto.setAttribute("aria-pressed", state.provider === "auto" ? "true" : "false");
  elements.providerGrok.setAttribute("aria-pressed", state.provider === "grok" ? "true" : "false");
  elements.providerCodex.setAttribute("aria-pressed", state.provider === "codex" ? "true" : "false");
  renderReadiness();
}

function providerExecutionReady(channel = state.activeDraft) {
  const provider = state.provider === "auto" ? preferredProvider(channel) : state.provider;
  const readiness = state.readiness[provider ?? "grok"];
  return Boolean(provider && readiness?.status === "ready" && readiness?.securityStatus !== "disabled");
}

function providerBlockedHint(channel = state.activeDraft) {
  const provider = state.provider === "auto" ? preferredProvider(channel) : state.provider;
  const readiness = state.readiness[provider ?? "grok"];
  if (readiness?.securityStatus === "disabled") return "OAuth provider는 보안 격리 검증 전에는 실행할 수 없습니다.";
  if (readiness?.status === "login_required") return "OAuth CLI 로그인 후 다시 시도하세요.";
  if (readiness?.status === "unavailable") return "OAuth provider를 사용할 수 없습니다.";
  return "엔진 상태를 확인하는 중입니다.";
}

function renderConstraintSummary() {
  const profile = channelProfile(state.activeDraft);
  const recommended = preferredProvider(state.activeDraft);
  elements.constraintProvider.textContent = recommended
    ? `${recommended === "codex" ? "Codex OAuth" : "Grok OAuth"} (자동 추천)`
    : "사용 안 함";
  elements.constraintFields.textContent = (profile?.publishFields ?? []).join(", ") || "게시 필드 없음";
  elements.constraintLength.textContent = lengthRuleText(profile);
  const facts = translationFacts();
  const locks = [facts.name, facts.license, facts.demoUrl, facts.repositoryUrl].filter(Boolean);
  elements.constraintFacts.textContent = locks.join(" · ") || "저장소 분석 후 표시됩니다.";
}

function renderAuthorInputs() {
  const channel = state.activeDraft;
  const mode = supportMode(channel);
  const defs = authorInputDefs(channel);
  elements.authorInputs.hidden = mode === "manual_only";
  elements.authorInputs.replaceChildren();
  if (mode === "manual_only") return;

  const appendControl = ({ def, value, onChange }) => {
    const label = document.createElement("label");
    const title = document.createElement("span");
    title.className = "section-label";
    title.textContent = def.label;
    let input;
    if (def.type === "boolean") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = value === true;
      input.addEventListener("change", () => onChange(input.checked));
    } else if (def.type === "select" || def.type === "locale") {
      input = document.createElement("select");
      const options = def.type === "locale"
        ? (channelProfile(channel)?.supportedLocales ?? SUPPORTED_LOCALES)
        : def.options ?? [];
      for (const optionValue of options) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = localeLabel(optionValue);
        input.append(option);
      }
      input.value = options.includes(value) ? value : options[0] ?? "";
      input.addEventListener("change", () => onChange(input.value));
    } else {
      input = document.createElement("textarea");
      input.value = value ?? "";
      input.addEventListener("input", () => onChange(input.value));
    }
    input.dataset.authorInput = def.key;
    input.disabled = state.phase !== "success" || state.translateLoading;
    input.setAttribute("aria-describedby", `author-hint-${def.key}`);
    const hint = document.createElement("p");
    hint.className = "author-hint";
    hint.id = `author-hint-${def.key}`;
    hint.textContent = def.hint;
    label.append(title, input, hint);
    elements.authorInputs.append(label);
  };

  const campaignHeading = document.createElement("p");
  campaignHeading.className = "section-label";
  campaignHeading.textContent = "게시자·캠페인 정보";
  elements.authorInputs.append(campaignHeading);
  const brief = currentCampaignBrief(channel);
  for (const def of CAMPAIGN_BRIEF_DEFS) {
    appendControl({
      def,
      value: brief[def.key],
      onChange: (next) => {
        const document = activeDocument();
        document.internal = {
          ...document.internal,
          campaignBrief: { ...currentCampaignBrief(channel), [def.key]: next },
        };
        renderDraftValidation();
        renderPlatformReadiness();
        renderTranslateControls({ renderInputs: def.key === "targetLocale" });
        persistWorkspace();
      },
    });
  }

  if (defs.length > 0) {
    const inputHeading = document.createElement("p");
    inputHeading.className = "section-label";
    inputHeading.textContent = "채널 입력·운영 확인";
    elements.authorInputs.append(inputHeading);
  }
  for (const def of defs) {
    const value = def.scope === "operations"
      ? currentOperationInputs(channel)[def.key]
      : currentAuthorInputs(channel)[def.key];
    appendControl({
      def,
      value,
      onChange: (next) => {
        const document = activeDocument();
        const field = def.scope === "operations" ? "operationInputs" : "authorInputs";
        const current = def.scope === "operations" ? currentOperationInputs(channel) : currentAuthorInputs(channel);
        document.internal = { ...document.internal, [field]: { ...current, [def.key]: next } };
        renderDraftValidation();
        renderPlatformReadiness();
        renderTranslateControls({ renderInputs: false });
        persistWorkspace();
      },
    });
  }

  const explicitOperationKeys = new Set(defs.filter((def) => def.scope === "operations").map((def) => def.key));
  const genericGates = (channelProfile(channel)?.prepublishGates ?? [])
    .filter((gate) => !explicitOperationKeys.has(gate.key));
  if (genericGates.length > 0) {
    const gateHeading = document.createElement("p");
    gateHeading.className = "section-label";
    gateHeading.textContent = "게시 운영 조건 확인";
    elements.authorInputs.append(gateHeading);
  }
  for (const gate of genericGates) {
    appendControl({
      def: { key: gate.key, label: gate.message, type: "boolean", scope: "operations", hint: "실제 게시 직전에 직접 확인한 경우에만 선택하세요." },
      value: currentOperationInputs(channel)[gate.key],
      onChange: (next) => {
        const document = activeDocument();
        document.internal = {
          ...document.internal,
          operationInputs: { ...currentOperationInputs(channel), [gate.key]: next },
        };
        renderDraftValidation();
        renderPlatformReadiness();
        persistWorkspace();
      },
    });
  }
}

function renderValidationIssues(issues = []) {
  const review = activeDocument()?.internal?.lastReview;
  const items = [
    ...issues.map((issue) => ({
      group: issue.group ?? "format",
      text: issue.message ?? String(issue),
    })),
    ...(review?.issues ?? []).map((text) => ({ group: "policy", text: `검토: ${text}` })),
    ...(review?.suggestions ?? []).map((text) => ({ group: "format", text: `제안: ${text}` })),
  ];
  elements.validationIssues.hidden = items.length === 0;
  elements.validationIssues.replaceChildren();
  for (const item of items) {
    const row = document.createElement("li");
    row.dataset.group = item.group;
    row.textContent = item.text;
    elements.validationIssues.append(row);
  }
}

function renderTranslateControls({ renderInputs = true } = {}) {
  const document = activeDocument();
  const mode = supportMode(state.activeDraft);
  const disabled = mode !== "compose" || targetLocaleFor() === SOURCE_LOCALE;
  const busy = state.translateLoading;
  const ready = state.phase === "success";
  const missingInputs = missingAuthorInputKeys();
  const providerReady = providerExecutionReady();
  const providerHint = providerBlockedHint();
  elements.composeWorkbench.hidden = mode === "manual_only";
  elements.translateButton.hidden = disabled;
  elements.reviewButton.hidden = disabled;
  elements.revalidateButton.hidden = mode === "manual_only";
  elements.revertButton.hidden = disabled;
  elements.translateButton.disabled = disabled || !ready || !providerReady || (busy && state.translateMode !== "one") || missingInputs.length > 0;
  elements.translateButton.textContent = busy && state.translateMode === "one" ? "중지" : "생성";
  elements.reviewButton.disabled = disabled || !ready || !providerReady || busy || !localeEntry(targetLocaleFor());
  elements.revalidateButton.disabled = mode === "manual_only" || !ready || busy;
  const target = targetLocaleFor();
  const previous = document?.internal?.previousCompositions?.[target]
    ?? (target === "en-US" ? document?.internal?.previousEnglish : null);
  elements.revertButton.disabled = disabled || !ready || busy || (!localeEntry(target) && !previous);
  const batchProviderReady = batchTranslateTargets().some((channel) => providerExecutionReady(channel));
  elements.translateAllButton.disabled = !ready || !batchProviderReady || (busy && state.translateMode !== "batch");
  elements.translateAllButton.textContent = busy && state.translateMode === "batch" ? "일괄 번역 중지" : "허용 채널 일괄 번역";
  elements.approvalActorLabel.hidden = mode !== "compose";
  elements.approvalActor.disabled = !ready || state.approvalLoading;
  elements.approvalActor.value = document?.internal?.approvalActor ?? "";
  elements.authorReadyLabel.hidden = mode !== "compose";
  elements.authorReady.disabled = !ready || state.approvalLoading;
  elements.authorReady.checked = currentApprovalAssessment().status === "approved";
  elements.translateButton.title = providerReady ? "" : providerHint;
  elements.reviewButton.title = providerReady ? "" : providerHint;
  elements.translateAllButton.title = batchProviderReady ? "" : providerHint;
  renderProviderControls();
  renderConstraintSummary();
  if (renderInputs) renderAuthorInputs();
}

function currentThreadsPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  const readiness = activePlatformReadinessRecord("threads");
  return createThreadsPreviewModel({
    posts: entry?.publishFields?.posts ?? [],
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    publicHandle: readiness?.account?.handle ?? "",
  });
}

function appendThreadsPreviewCard(cardModel, identity) {
  const item = document.createElement("li");
  item.className = "threads-preview-card";

  const axis = document.createElement("div");
  axis.className = "threads-preview-axis";
  const avatar = document.createElement("span");
  avatar.className = "threads-preview-avatar";
  avatar.textContent = identity.avatarText;
  avatar.setAttribute("aria-hidden", "true");
  axis.append(avatar);
  if (cardModel.index < cardModel.total) {
    const connector = document.createElement("span");
    connector.className = "threads-preview-connector";
    connector.setAttribute("aria-hidden", "true");
    axis.append(connector);
  }

  const content = document.createElement("article");
  content.className = "threads-preview-card-content";
  const byline = document.createElement("div");
  byline.className = "threads-preview-byline";
  const identityLabel = document.createElement("span");
  identityLabel.className = "threads-preview-identity-label";
  identityLabel.textContent = identity.label;
  const handle = document.createElement("strong");
  handle.textContent = identity.handle;
  const previewLabel = document.createElement("span");
  previewLabel.className = "threads-preview-time";
  previewLabel.textContent = "미리보기";
  byline.append(identityLabel, handle, previewLabel);

  const text = document.createElement("p");
  text.className = "threads-preview-post-text";
  text.dir = "auto";
  text.textContent = cardModel.text;

  const sequence = document.createElement("p");
  sequence.className = "threads-preview-sequence";
  sequence.textContent = cardModel.sequenceLabel;

  const actions = document.createElement("p");
  actions.className = "threads-preview-actions";
  actions.textContent = "Reply  ·  Repost  ·  Like  ·  Share";
  actions.setAttribute("aria-hidden", "true");
  content.append(byline, text, sequence, actions);
  item.append(axis, content);
  elements.threadsPreviewCards.append(item);
}

function renderThreadsPreview() {
  if (!elements.threadsPreviewWorkbench) return;
  const isThreads = state.phase === "success" && state.activeDraft === "threads";
  elements.threadsPreviewWorkbench.hidden = !isThreads;
  if (!isThreads) {
    elements.compareEditors.hidden = false;
    elements.editorHelp.hidden = false;
    elements.compareEditors.removeAttribute("role");
    elements.compareEditors.removeAttribute("aria-labelledby");
    elements.threadsPreviewPanel.hidden = true;
    return;
  }

  const previewMode = state.threadsPreviewMode === "preview";
  elements.threadsEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.threadsEditorView.tabIndex = previewMode ? -1 : 0;
  elements.threadsPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.threadsPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.threadsPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "threads-editor-view");

  const model = currentThreadsPreviewModel();
  elements.threadsPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.threadsPreviewStatus.dataset.state = model.status.key;
  elements.threadsPreviewNotice.textContent = `${model.notice} 외부 네트워크 write 0회.`;
  elements.threadsPreviewFrame.dataset.viewport = state.threadsPreviewViewport;
  elements.threadsPreviewDesktop.setAttribute("aria-pressed", String(state.threadsPreviewViewport === "desktop"));
  elements.threadsPreviewMobile.setAttribute("aria-pressed", String(state.threadsPreviewViewport === "mobile"));
  elements.threadsPreviewCards.replaceChildren();
  elements.threadsPreviewEmpty.hidden = model.cards.length > 0;
  elements.threadsPreviewEmpty.textContent = model.emptyMessage;
  for (const card of model.cards) appendThreadsPreviewCard(card, model.identity);
}

function selectThreadsPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "threads") return;
  state.threadsPreviewMode = mode === "preview" ? "preview" : "editor";
  renderThreadsPreview();
  if (focus) (state.threadsPreviewMode === "preview" ? elements.threadsPreviewView : elements.threadsEditorView).focus();
}

function renderActiveDraft({ focus = false } = {}) {
  const config = DRAFT_CONFIG[state.activeDraft];
  const source = localeEntry(SOURCE_LOCALE);
  const targetLocale = targetLocaleFor();
  const translation = targetLocale === SOURCE_LOCALE ? null : localeEntry(targetLocale);
  elements.editor.value = source ? serializePublish(state.activeDraft, source.publishFields) : "";
  elements.translationEditor.value = translation ? serializePublish(state.activeDraft, translation.publishFields) : "";
  elements.emptyTranslation.hidden = Boolean(translation) || state.activeDraft === "showHn" || targetLocale === SOURCE_LOCALE;
  elements.compareEditors.classList.toggle("is-empty-en", !translation);
  elements.compareEditors.classList.toggle("is-mobile-ko", state.activeLocale !== targetLocale);
  elements.compareEditors.classList.toggle("is-mobile-en", state.activeLocale === targetLocale);
  const allowedLocales = channelProfile(state.activeDraft)?.supportedLocales ?? [SOURCE_LOCALE];
  for (const option of elements.localeSelect.options) {
    option.disabled = !allowedLocales.includes(option.value);
    option.hidden = option.disabled;
  }
  if (!allowedLocales.includes(state.activeLocale)) state.activeLocale = SOURCE_LOCALE;
  elements.localeSelect.value = SUPPORTED_LOCALES.includes(state.activeLocale) ? state.activeLocale : SOURCE_LOCALE;
  elements.sourceLocaleLabel.textContent = `원문 ${localeLabel(SOURCE_LOCALE)}`;
  elements.targetLocaleLabel.textContent = `번역 ${localeLabel(targetLocale)}`;
  elements.draftLabel.textContent = config.label;
  elements.draftEvidence.textContent = config.evidence;
  elements.editorHelp.textContent = supportMode(state.activeDraft) === "reference_only"
    ? "참고 자료만 제공합니다. 최종 게시문은 작성자가 직접 작성해야 합니다."
    : state.activeDraft === "showHn"
    ? "생성 제목·본문을 제공하지 않습니다. 작성자가 처음부터 직접 써야 합니다."
    : targetLocale === SOURCE_LOCALE
      ? "이 채널의 기본 게시 언어는 한국어입니다. 기존 검증 원문을 검토하고 운영 조건을 확인하세요."
    : config.help;
  renderTranslateControls();
  renderDraftValidation();
  const stateForIssues = displayCompletionState(activeDocument(), {
    locale: state.activeLocale,
    validationOk: validatePublish(state.activeDraft, activePublishFields() ?? {}, {
      facts: translationFacts(), campaignBrief: currentCampaignBrief(),
    }).ok,
    authorInputs: currentAuthorInputs(),
    operationInputs: currentOperationInputs(),
    campaignBrief: currentCampaignBrief(),
    approvalStatus: currentApprovalStatus(),
  });
  renderValidationIssues([
    ...(translation?.validation?.issues ?? []),
    ...stateForIssues.contentInputIssues.map((issue) => ({ group: "policy", message: issue.message })),
    ...stateForIssues.operationIssues.map((issue) => ({ group: "prepublish", message: issue.message })),
  ]);

  for (const tab of elements.tabs) {
    const active = tab.dataset.draft === state.activeDraft;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) elements.draftPanel.setAttribute("aria-labelledby", tab.id);
  }
  renderThreadsPreview();
  if (focus) {
    if (state.activeLocale !== SOURCE_LOCALE) elements.translationEditor.focus();
    else elements.editor.focus();
  }
}

function selectDraft(key, options) {
  if (!DRAFT_CONFIG[key] || state.phase !== "success") return;
  if (key !== state.activeDraft) {
    // External vault references and the user interlock are session-only and
    // never follow the user to a different channel.
    state.dryRunCredentialHandle = "";
    state.dryRunKillSwitchLocked = false;
  }
  state.activeDraft = key;
  renderActiveDraft(options);
  renderPlatformReadiness();
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

function triggerDownload(filename, content, type = "text/markdown;charset=utf-8") {
  const blob = new Blob([content], { type });
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
    const fields = state.documents[key]?.locales?.[state.activeLocale]?.publishFields
      ?? state.documents[key]?.locales?.[SOURCE_LOCALE]?.publishFields
      ?? state.documents[key]?.publishFields
      ?? {};
    return `## ${title}\n\n${serializePublish(key, fields).trim()}`;
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

${serializePublish("geeknews", state.documents.geeknews?.locales?.[SOURCE_LOCALE]?.publishFields ?? state.documents.geeknews?.publishFields ?? {}).trim()}

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

async function fetchReadiness({ probe = false } = {}) {
  try {
    await ensureApiCapabilities();
    // GET is intentionally non-billable. OAuth authentication probes are a
    // separate protected POST action, never an implicit readiness refresh.
    const response = await fetch("/api/v1/providers/readiness");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "엔진 상태를 확인하지 못했습니다.");
    state.readiness = {
      grok: payload.grok ?? null,
      codex: payload.codex ?? null,
    };
  } catch (error) {
    state.readiness = { grok: { status: "unavailable" }, codex: { status: "unavailable" } };
    elements.providerReadiness.textContent = error.message || "엔진 상태를 확인하지 못했습니다.";
    elements.providerReadiness.dataset.tone = "error";
    return;
  }
  renderReadiness();
}

async function generateRepository(repoUrl) {
  setLoading(true);
  setFeedback("GitHub 저장소와 README를 확인하고 있습니다.");
  try {
    const payload = await requestGeneration(repoUrl);
    state.repository = payload.repository;
    state.facts = payload.facts;
    state.summary = payload.summary;
    state.documents = hydrateDocuments(payload.documents?.items ?? {});
    state.drafts = draftViewFromDocuments(state.documents);
    state.initialDrafts = { ...state.drafts };
    state.activeLocale = SOURCE_LOCALE;
    state.baseline = isBaseline(payload.baseline) ? { ...payload.baseline } : null;
    state.preflight = createDefaultPreflight();
    state.activeDraft = "x1";
    state.dryRunCredentialHandle = "";
    state.dryRunKillSwitchLocked = false;
    state.dryRunReceipt = null;
    state.dryRunEvidence = null;
    state.dirty = false;
    state.persisted = false;
    setLoading(false);
    // Readiness controls derive their disabled state from `state.phase`, so
    // leave loading before rendering the freshly generated workspace.
    renderRepository();
    setDraftActionsEnabled(true);
    renderActiveDraft();
    fetchReadiness();

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

elements.platformReadinessForm.addEventListener("submit", (event) => event.preventDefault());
elements.platformReadinessForm.addEventListener("change", () => {
  // Text fields update on input without stealing focus; a completed change
  // refreshes the five-axis status view and the dry-run block reason.
  window.requestAnimationFrame(() => renderPlatformReadiness());
});

elements.readinessReportButton.addEventListener("click", () => {
  if (state.phase !== "success") return;
  try {
    const assessment = currentPlatformReadinessAssessment();
    const report = readinessReportMarkdown({
      projectName: state.summary?.name,
      repositoryUrl: state.repository?.url,
      assessment,
    });
    triggerDownload(`${sanitizeFilename(state.summary?.name)}-${sanitizeFilename(assessment.platform)}-readiness.md`, report);
    showToast("비밀값과 원고 전문을 제외한 readiness 보고서를 저장했습니다.");
  } catch (error) {
    setTranslateStatus(error.message || "readiness 보고서를 만들지 못했습니다.", "error");
  }
});

elements.goLiveReportButton.addEventListener("click", () => {
  triggerDownload("social-automation-go-no-go.md", automationGoLiveReportMarkdown());
  showToast("계정 식별자·원고·credential을 제외한 Go/No-Go 보고서를 저장했습니다.");
});

elements.dryRunCredentialHandle.addEventListener("input", () => {
  // Deliberately session-only: never copied into the persisted workspace.
  state.dryRunCredentialHandle = elements.dryRunCredentialHandle.value.trim();
  state.dryRunReceipt = null;
  state.dryRunEvidence = null;
  renderPlatformReadiness();
});

elements.dryRunKillSwitch.addEventListener("change", () => {
  state.dryRunKillSwitchLocked = elements.dryRunKillSwitch.checked;
  state.dryRunReceipt = null;
  state.dryRunEvidence = null;
  renderPlatformReadiness();
});

elements.dryRunEvidenceButton.addEventListener("click", () => {
  if (!state.dryRunEvidence || elements.dryRunEvidenceButton.disabled) return;
  triggerDownload(
    `${sanitizeFilename(state.summary?.name)}-${sanitizeFilename(state.dryRunEvidence.channel)}-dry-run-evidence.json`,
    `${JSON.stringify(state.dryRunEvidence, null, 2)}\n`,
    "application/json;charset=utf-8",
  );
  showToast("원고 전문과 credential 값을 제외한 evidence JSON을 저장했습니다.");
});

elements.readinessDryRunButton.addEventListener("click", async () => {
  const assessment = currentPlatformReadinessAssessment();
  const eligibility = currentDryRunEligibility(assessment);
  if (!eligibility.ready) {
    setTranslateStatus(eligibility.reason || "local dry-run 사전조건을 확인하세요.", "error");
    return;
  }
  const revision = activeDocument()?.internal?.approvalRevision;
  if (!revision || !assessment.readiness) return;
  state.dryRunLoading = true;
  renderPlatformReadiness();
  try {
    await ensureApiCapabilities();
    const payload = await requestJson("/api/v1/dry-runs", {
      schemaVersion: "viral-dry-run-request/v1",
      requestId: newRequestId(),
      approvalRevision: revision,
      readiness: assessment.readiness,
      operationInputs: currentOperationInputs(),
      credentialHandle: state.dryRunCredentialHandle,
      safety: {
        schemaVersion: "viral-dry-run-safety/v1",
        execution: "dry_run",
        userKillSwitch: "live_write_locked",
        liveWriteLocked: state.dryRunKillSwitchLocked,
      },
    });
    if (payload?.dryRun?.receipt?.networkWriteCount !== 0
      || payload?.dryRun?.receipt?.execution !== "dry_run"
      || payload?.dryRun?.receipt?.safety?.liveWriteLocked !== true
      || payload?.evidenceManifest?.networkWriteCount !== 0) {
      throw new Error("안전하지 않은 dry-run 응답을 적용하지 않았습니다.");
    }
    state.dryRunReceipt = payload.dryRun.receipt;
    state.dryRunEvidence = payload.evidenceManifest;
    setTranslateStatus("local dry-run을 완료했습니다. 승인된 원고와 동일한 payload 계획만 만들었고 외부 플랫폼 write는 0회입니다.", "success");
    showToast("local dry-run receipt를 확인했습니다. 실제 게시 기능은 아직 없습니다.");
  } catch (error) {
    state.dryRunReceipt = null;
    state.dryRunEvidence = null;
    setTranslateStatus(error.message || "local dry-run을 만들지 못했습니다.", "error");
  } finally {
    state.dryRunLoading = false;
    renderPlatformReadiness();
  }
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

const threadsPreviewViewButtons = [elements.threadsEditorView, elements.threadsPreviewView];
for (const [index, button] of threadsPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectThreadsPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % threadsPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + threadsPreviewViewButtons.length) % threadsPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = threadsPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectThreadsPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.threadsPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "threads") return;
  state.threadsPreviewViewport = "desktop";
  renderThreadsPreview();
});

elements.threadsPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "threads") return;
  state.threadsPreviewViewport = "mobile";
  renderThreadsPreview();
});

function updateSourceFromEditor() {
  const document = activeDocument();
  if (!document.locales) document.locales = {};
  const publishFields = parsePublish(state.activeDraft, elements.editor.value);
  const sourceHash = hashPublishFields(publishFields);
  document.publishFields = publishFields;
  document.locales[SOURCE_LOCALE] = { publishFields, updatedAt: new Date().toISOString(), sourceHash };
  for (const [locale, entry] of Object.entries(document.locales)) {
    if (locale !== SOURCE_LOCALE && entry?.sourceHash !== sourceHash) {
      document.locales[locale] = { ...entry, stale: true };
    }
  }
}

function updateTranslationFromEditor() {
  const document = activeDocument();
  const target = targetLocaleFor();
  const existing = localeEntry(target);
  if (!existing || target === SOURCE_LOCALE) return;
  document.locales[target] = {
    ...existing,
    publishFields: parsePublish(state.activeDraft, elements.translationEditor.value),
    updatedAt: new Date().toISOString(),
  };
}

elements.editor.addEventListener("input", () => {
  updateSourceFromEditor();
  renderDraftValidation();
  renderPlatformReadiness();
  if (state.activeDraft === "geeknews" && state.preflight.finalCopyReviewed) {
    state.preflight.finalCopyReviewed = false;
    renderPreflight();
  }
  updateDirtyState();
  persistWorkspace();
});

elements.translationEditor.addEventListener("input", () => {
  updateTranslationFromEditor();
  renderDraftValidation();
  renderPlatformReadiness();
  updateDirtyState();
  persistWorkspace();
});

elements.localeSelect.addEventListener("change", () => {
  const nextLocale = SUPPORTED_LOCALES.includes(elements.localeSelect.value)
    ? elements.localeSelect.value
    : SOURCE_LOCALE;
  const allowedLocales = channelProfile(state.activeDraft)?.supportedLocales ?? [SOURCE_LOCALE];
  if (!allowedLocales.includes(nextLocale)) return;
  if (nextLocale !== SOURCE_LOCALE) {
    const document = activeDocument();
    document.internal = {
      ...document.internal,
      campaignBrief: { ...currentCampaignBrief(), targetLocale: nextLocale },
    };
  }
  state.activeLocale = nextLocale;
  renderActiveDraft();
  persistWorkspace();
});

elements.providerAuto.addEventListener("click", () => {
  if (state.translateLoading) return;
  setProvider("auto");
  persistWorkspace();
});

elements.providerGrok.addEventListener("click", () => {
  if (state.translateLoading) return;
  setProvider("grok");
  persistWorkspace();
});

elements.providerCodex.addEventListener("click", () => {
  if (state.translateLoading) return;
  setProvider("codex");
  persistWorkspace();
});

elements.approvalActor.addEventListener("input", () => {
  const document = activeDocument();
  document.internal = {
    ...document.internal,
    approvalActor: elements.approvalActor.value.trim(),
  };
  renderDraftValidation();
  renderPlatformReadiness();
  persistWorkspace();
});

elements.authorReady.addEventListener("change", async () => {
  const document = activeDocument();
  if (!elements.authorReady.checked) {
    document.internal = {
      ...document.internal,
      authorReady: false,
      approvalStatus: "unreviewed",
      approvalRevision: null,
    };
    renderDraftValidation();
    renderPlatformReadiness();
    persistWorkspace();
    return;
  }
  if (currentApprovalContext().approvedBy.length < 2) {
    elements.authorReady.checked = false;
    setTranslateStatus("승인자 이름 또는 역할을 2자 이상 입력하세요.", "error");
    elements.approvalActor.focus();
    return;
  }
  state.approvalLoading = true;
  renderTranslateControls({ renderInputs: false });
  try {
    const approvalRevision = await requestApprovalRevision();
    document.internal = {
      ...document.internal,
      authorReady: true,
      approvalStatus: "approved",
      approvalRevision,
      approvalActor: approvalRevision.approvedBy,
    };
    setTranslateStatus("현재 게시 필드를 불변 승인 snapshot으로 저장했습니다. 수정하면 자동으로 무효화됩니다.", "success");
    persistWorkspace();
  } catch (error) {
    elements.authorReady.checked = false;
    document.internal = { ...document.internal, authorReady: false, approvalStatus: "unreviewed" };
    setTranslateStatus(error.message || "승인 snapshot을 만들지 못했습니다.", "error");
  } finally {
    state.approvalLoading = false;
    renderTranslateControls({ renderInputs: false });
    renderDraftValidation();
    renderPlatformReadiness();
  }
});

elements.translateButton.addEventListener("click", async () => {
  if (state.phase !== "success") return;
  if (state.translateLoading && state.translateMode === "one") {
    translateAbort?.abort();
    return;
  }
  if (state.translateLoading) return;
  const document = activeDocument();
  if (!isTranslationAllowed(state.activeDraft)) return;
  if (missingAuthorInputKeys().length > 0) {
    setTranslateStatus(`작성자 입력이 필요합니다: ${missingAuthorInputKeys().join(", ")}`, "error");
    renderAuthorInputs();
    return;
  }
  const target = targetLocaleFor();
  const existingTranslation = localeEntry(target);
  const editedTranslation = Boolean(
    existingTranslation?.publishFields
    && existingTranslation.composedHash
    && hashPublishFields(existingTranslation.publishFields) !== existingTranslation.composedHash,
  );
  if (editedTranslation && !window.confirm(`수정 중인 ${localeLabel(target)} 원고를 새 완성본으로 바꿀까요? 이전 결과는 되돌리기로 복구할 수 있습니다.`)) {
    return;
  }
  state.translateLoading = true;
  state.translateMode = "one";
  translateAbort = new AbortController();
  const startedAt = Date.now();
  startTranslateClock(() => {
    const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    setTranslateStatus(seconds === 0
      ? `${providerLabel()} 엔진으로 완성 원고를 구성하고 있습니다.`
      : `${providerLabel()} 엔진으로 완성 원고를 구성하고 있습니다. ${seconds}초`);
  });
  renderTranslateControls();
  const previousTranslation = cloneLocale(localeEntry(target));
  try {
    await requestTranslation(state.activeDraft, { signal: translateAbort.signal });
    state.activeLocale = target;
    setTranslateStatus(`${localeLabel(target)} 완성 원고를 새 개정으로 저장했습니다. 원문과 비교해 수정하세요.`, "success");
    renderActiveDraft();
    persistWorkspace();
  } catch (error) {
    if (previousTranslation) document.locales[target] = previousTranslation;
    else delete document.locales[target];
    if (error.name === "AbortError") {
      setTranslateStatus("생성을 중지했습니다. 편집 중인 원고는 그대로입니다.", "error");
    } else {
      setTranslateStatus(error.message || "완성 원고 생성에 실패했습니다.", "error");
    }
    renderActiveDraft();
  } finally {
    stopTranslateClock();
    translateAbort = null;
    state.translateLoading = false;
    state.translateMode = null;
    renderTranslateControls();
  }
});

elements.reviewButton.addEventListener("click", async () => {
  if (state.phase !== "success" || state.translateLoading) return;
  const target = targetLocaleFor();
  const translation = localeEntry(target);
  if (!translation || target === SOURCE_LOCALE) {
    setTranslateStatus("검토할 선택 언어 원고가 없습니다. 먼저 생성하세요.", "error");
    return;
  }
  state.translateLoading = true;
  state.translateMode = "review";
  translateAbort = new AbortController();
  setTranslateStatus(`${providerLabel()} 엔진으로 비게시 검토를 요청하고 있습니다.`);
  renderTranslateControls();
  try {
    await ensureApiCapabilities();
    const payload = await requestJson("/api/v1/drafts/review", {
      requestId: newRequestId(),
      channel: state.activeDraft,
      provider: state.provider,
      sourceLocale: SOURCE_LOCALE,
      targetLocale: target,
      publishFields: translation.publishFields,
      facts: translationFacts(),
    }, { signal: translateAbort.signal });
    const document = activeDocument();
    document.internal = {
      ...document.internal,
      lastReview: {
        provider: payload.provider,
        issues: payload.issues ?? [],
        suggestions: payload.suggestions ?? [],
      },
    };
    setTranslateStatus("검토 이슈만 저장했습니다. 게시 필드는 바꾸지 않았습니다.", "success");
    renderActiveDraft();
    persistWorkspace();
  } catch (error) {
    if (error.name !== "AbortError") {
      setTranslateStatus(error.message || "검토 요청에 실패했습니다.", "error");
    }
    renderActiveDraft();
  } finally {
    translateAbort = null;
    state.translateLoading = false;
    state.translateMode = null;
    renderTranslateControls();
  }
});

elements.revalidateButton.addEventListener("click", async () => {
  if (state.phase !== "success" || state.translateLoading) return;
  if (state.activeDraft === "showHn") return;
  try {
    await ensureApiCapabilities();
    const attempt = createCompositionAttempt(state.activeDraft);
    const payload = await requestJson("/api/v1/drafts/validate", {
      channel: state.activeDraft,
      provider: state.provider,
      sourceLocale: SOURCE_LOCALE,
      targetLocale: targetLocaleFor(),
      requestFingerprint: attempt.requestFingerprint,
      facts: translationFacts(),
      sourceDraft: { publishFields: sourceFieldsFor(state.activeDraft) },
      publishFields: activePublishFields() ?? {},
      authorInputs: currentAuthorInputs(),
      operationInputs: currentOperationInputs(),
      campaignBrief: currentCampaignBrief(),
      approvalStatus: currentApprovalStatus(),
    });
    const document = activeDocument();
    const target = targetLocaleFor();
    const translation = localeEntry(target);
    if (translation && state.activeLocale === target) {
      document.locales[target] = {
        ...translation,
        validation: payload.validation,
        supportMode: payload.supportMode,
        contentStatus: payload.contentStatus,
        operationsStatus: payload.operationsStatus,
        approvalStatus: payload.approvalStatus,
        publishReady: payload.publishReady,
      };
    }
    document.internal = { ...document.internal, lastValidation: payload };
    setTranslateStatus(payload.validation.ok ? "재검증을 통과했습니다." : "재검증에서 이슈가 있습니다.", payload.validation.ok ? "success" : "error");
    renderActiveDraft();
    persistWorkspace();
  } catch (error) {
    setTranslateStatus(error.message || "재검증에 실패했습니다.", "error");
  }
});

elements.revertButton.addEventListener("click", () => {
  if (state.phase !== "success" || state.translateLoading) return;
  const document = activeDocument();
  const target = targetLocaleFor();
  const previous = document.internal?.previousCompositions?.[target]
    ?? (target === "en-US" ? document.internal?.previousEnglish : null);
  if (previous) {
    document.locales[target] = cloneLocale(previous);
    document.internal = {
      ...document.internal,
      previousEnglish: target === "en-US" ? null : document.internal?.previousEnglish,
      previousCompositions: { ...(document.internal?.previousCompositions ?? {}), [target]: null },
    };
    setTranslateStatus(`이전 ${localeLabel(target)} 개정으로 되돌렸습니다. 원문 한국어는 그대로입니다.`, "success");
  } else if (document.locales?.[target]) {
    delete document.locales[target];
    setTranslateStatus(`${localeLabel(target)} 완성본을 제거했습니다. 원문 한국어는 그대로입니다.`, "success");
  } else {
    setTranslateStatus("되돌릴 완성본이 없습니다.", "error");
    return;
  }
  renderActiveDraft();
  persistWorkspace();
});

elements.translateAllButton.addEventListener("click", async () => {
  if (state.phase !== "success") return;
  if (state.translateLoading && state.translateMode === "batch") {
    translateAbort?.abort();
    return;
  }
  if (state.translateLoading) return;
  const targets = batchTranslateTargets();
  if (targets.length === 0) {
    setTranslateStatus("다시 생성할 허용 채널이 없습니다. 없거나 오래된 선택 언어 원고만 일괄 대상입니다.", "success");
    return;
  }
  state.translateLoading = true;
  state.translateMode = "batch";
  translateAbort = new AbortController();
  const startedAt = Date.now();
  const elapsed = () => Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  let saved = 0;
  const failures = [];
  let aborted = false;
  renderTranslateControls();
  try {
    for (const [index, channel] of targets.entries()) {
      if (translateAbort.signal.aborted) {
        aborted = true;
        break;
      }
      startTranslateClock(() => {
        setTranslateStatus(`${index + 1}/${targets.length} · ${DRAFT_CONFIG[channel].label} · ${elapsed()}초`);
      });
      try {
        await requestTranslation(channel, { signal: translateAbort.signal });
        saved += 1;
        if (channel === state.activeDraft) {
          state.activeLocale = targetLocaleFor(channel);
          renderActiveDraft();
        }
        persistWorkspace();
      } catch (error) {
        if (error.name === "AbortError") {
          aborted = true;
          break;
        }
        failures.push(`${DRAFT_CONFIG[channel].label}: ${error.message || "실패"}`);
      }
    }
  } finally {
    stopTranslateClock();
    translateAbort = null;
    state.translateLoading = false;
    state.translateMode = null;
    renderTranslateControls();
  }
  if (saved > 0) state.activeLocale = targetLocaleFor();
  renderActiveDraft();
  persistWorkspace();
  if (aborted) {
    setTranslateStatus(`일괄 번역을 중지했습니다. 저장 ${saved}개, 실패 ${failures.length}개.`, saved > 0 ? "success" : "error");
    return;
  }
  if (failures.length === 0) {
    setTranslateStatus(`허용 채널 ${saved}개 선택 언어 원고를 저장했습니다. 원문과 비교해 수정하세요.`, "success");
    return;
  }
  setTranslateStatus(`저장 ${saved}개, 실패 ${failures.length}개. ${failures[0]}`, saved > 0 ? "success" : "error");
});

elements.copyButton.addEventListener("click", async () => {
  try {
    await copyText(currentCopyText());
    showToast("게시 필드만 복사했습니다. 내부 체크리스트는 포함되지 않습니다.");
  } catch {
    showToast("자동 복사에 실패했습니다. 원고를 직접 선택해 복사하세요.", "error");
    elements.editor.focus();
    elements.editor.select();
  }
});

elements.downloadButton.addEventListener("click", () => {
  const prefix = sanitizeFilename(state.repository?.name);
  const base = DRAFT_CONFIG[state.activeDraft].filename.replace(/\.md$/, "");
  const filename = state.activeLocale !== SOURCE_LOCALE
    ? `${prefix}-${base}.${state.activeLocale}.md`
    : `${prefix}-${DRAFT_CONFIG[state.activeDraft].filename}`;
  triggerDownload(filename, currentCopyText());
  showToast(state.activeLocale !== SOURCE_LOCALE ? `${localeLabel(state.activeLocale)} 게시 필드를 Markdown으로 저장했습니다.` : "현재 원고를 Markdown으로 저장했습니다.");
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

renderPlatformInventory();
renderAutomationGoLiveDecision();
if (!restoreWorkspace()) renderActiveDraft();
