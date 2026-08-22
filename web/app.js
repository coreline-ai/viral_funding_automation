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
import { createXPreviewModel } from "/x-preview.mjs";
import { createLinkedInPreviewModel } from "/linkedin-preview.mjs";
import { createFacebookPreviewModel } from "/facebook-preview.mjs";
import { createInstagramPreviewModel } from "/instagram-preview.mjs";
import { createShortsPreviewModel } from "/shorts-preview.mjs";
import { createProductHuntPreviewModel } from "/product-hunt-preview.mjs";
import { createPeerlistPreviewModel } from "/peerlist-preview.mjs";
import { createDisquietPreviewModel } from "/disquiet-preview.mjs";
import { createRedditPreviewModel } from "/reddit-preview.mjs";
import { createIndieHackersPreviewModel } from "/indie-hackers-preview.mjs";
import { createTikTokPreviewModel } from "/tiktok-preview.mjs";
import { createDevPreviewModel } from "/dev-preview.mjs";
import { createOkkyPreviewModel } from "/okky-preview.mjs";
import { createGeekNewsPreviewModel } from "/geeknews-preview.mjs";
import { createShowHnPreviewModel } from "/show-hn-preview.mjs";
import { createDiscordPreviewModel } from "/discord-preview.mjs";
import { createBlueskyPreviewModel } from "/bluesky-preview.mjs";
import { createMastodonPreviewModel } from "/mastodon-preview.mjs";
import { previewSpecForChannel, previewSpecForPlatform } from "/platform-preview-registry.mjs";

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
const X_REVIEW_KEYS = new Set(["x1", "x2", "x3", "xThread"]);
const X_PREVIEW_URL_PATTERN = /https?:\/\/[^\s)\]]+/giu;
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
  xReviewWorkbench: document.querySelector("#x-review-workbench"),
  xEditorView: document.querySelector("#x-editor-view"),
  xReviewView: document.querySelector("#x-review-view"),
  xReviewPanel: document.querySelector("#x-review-panel"),
  xReviewStatus: document.querySelector("#x-review-status"),
  xReviewContext: document.querySelector("#x-review-context"),
  xReviewIssues: document.querySelector("#x-review-issues"),
  xReviewFrame: document.querySelector("#x-review-frame"),
  xReviewCards: document.querySelector("#x-review-cards"),
  xReviewEmpty: document.querySelector("#x-review-empty"),
  xReviewNotice: document.querySelector("#x-review-notice"),
  xReviewDesktop: document.querySelector("#x-review-desktop"),
  xReviewMobile: document.querySelector("#x-review-mobile"),
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
  linkedinPreviewWorkbench: document.querySelector("#linkedin-preview-workbench"),
  linkedinEditorView: document.querySelector("#linkedin-editor-view"),
  linkedinPreviewView: document.querySelector("#linkedin-preview-view"),
  linkedinPreviewPanel: document.querySelector("#linkedin-preview-panel"),
  linkedinPreviewStatus: document.querySelector("#linkedin-preview-status"),
  linkedinPreviewIssues: document.querySelector("#linkedin-preview-issues"),
  linkedinPreviewFrame: document.querySelector("#linkedin-preview-frame"),
  linkedinPreviewPost: document.querySelector("#linkedin-preview-post"),
  linkedinPreviewEmpty: document.querySelector("#linkedin-preview-empty"),
  linkedinPreviewNotice: document.querySelector("#linkedin-preview-notice"),
  linkedinPreviewDesktop: document.querySelector("#linkedin-preview-desktop"),
  linkedinPreviewMobile: document.querySelector("#linkedin-preview-mobile"),
  facebookPreviewWorkbench: document.querySelector("#facebook-preview-workbench"),
  facebookEditorView: document.querySelector("#facebook-editor-view"),
  facebookReelsView: document.querySelector("#facebook-reels-view"),
  facebookGroupView: document.querySelector("#facebook-group-view"),
  facebookPreviewPanel: document.querySelector("#facebook-preview-panel"),
  facebookPreviewTitle: document.querySelector("#facebook-preview-title"),
  facebookPreviewStatus: document.querySelector("#facebook-preview-status"),
  facebookPreviewIssues: document.querySelector("#facebook-preview-issues"),
  facebookPreviewFrame: document.querySelector("#facebook-preview-frame"),
  facebookPreviewSurface: document.querySelector("#facebook-preview-surface"),
  facebookPreviewEmpty: document.querySelector("#facebook-preview-empty"),
  facebookPreviewNotice: document.querySelector("#facebook-preview-notice"),
  facebookPreviewDesktop: document.querySelector("#facebook-preview-desktop"),
  facebookPreviewMobile: document.querySelector("#facebook-preview-mobile"),
  instagramPreviewWorkbench: document.querySelector("#instagram-preview-workbench"),
  instagramEditorView: document.querySelector("#instagram-editor-view"),
  instagramPreviewView: document.querySelector("#instagram-preview-view"),
  instagramPreviewPanel: document.querySelector("#instagram-preview-panel"),
  instagramPreviewStatus: document.querySelector("#instagram-preview-status"),
  instagramPreviewIssues: document.querySelector("#instagram-preview-issues"),
  instagramPreviewFrame: document.querySelector("#instagram-preview-frame"),
  instagramPreviewSurface: document.querySelector("#instagram-preview-surface"),
  instagramPreviewEmpty: document.querySelector("#instagram-preview-empty"),
  instagramPreviewNotice: document.querySelector("#instagram-preview-notice"),
  instagramPreviewDesktop: document.querySelector("#instagram-preview-desktop"),
  instagramPreviewMobile: document.querySelector("#instagram-preview-mobile"),
  shortsPreviewWorkbench: document.querySelector("#shorts-preview-workbench"),
  shortsEditorView: document.querySelector("#shorts-editor-view"),
  shortsPreviewView: document.querySelector("#shorts-preview-view"),
  shortsPreviewPanel: document.querySelector("#shorts-preview-panel"),
  shortsPreviewStatus: document.querySelector("#shorts-preview-status"),
  shortsPreviewIssues: document.querySelector("#shorts-preview-issues"),
  shortsPreviewFrame: document.querySelector("#shorts-preview-frame"),
  shortsPreviewSurface: document.querySelector("#shorts-preview-surface"),
  shortsPreviewEmpty: document.querySelector("#shorts-preview-empty"),
  shortsPreviewNotice: document.querySelector("#shorts-preview-notice"),
  shortsPreviewDesktop: document.querySelector("#shorts-preview-desktop"),
  shortsPreviewMobile: document.querySelector("#shorts-preview-mobile"),
  productHuntPreviewWorkbench: document.querySelector("#product-hunt-preview-workbench"),
  productHuntEditorView: document.querySelector("#product-hunt-editor-view"),
  productHuntPreviewView: document.querySelector("#product-hunt-preview-view"),
  productHuntPreviewPanel: document.querySelector("#product-hunt-preview-panel"),
  productHuntPreviewStatus: document.querySelector("#product-hunt-preview-status"),
  productHuntPreviewIssues: document.querySelector("#product-hunt-preview-issues"),
  productHuntPreviewFrame: document.querySelector("#product-hunt-preview-frame"),
  productHuntPreviewSurface: document.querySelector("#product-hunt-preview-surface"),
  productHuntPreviewEmpty: document.querySelector("#product-hunt-preview-empty"),
  productHuntPreviewNotice: document.querySelector("#product-hunt-preview-notice"),
  productHuntPreviewDesktop: document.querySelector("#product-hunt-preview-desktop"),
  productHuntPreviewMobile: document.querySelector("#product-hunt-preview-mobile"),
  peerlistPreviewWorkbench: document.querySelector("#peerlist-preview-workbench"),
  peerlistEditorView: document.querySelector("#peerlist-editor-view"),
  peerlistPreviewView: document.querySelector("#peerlist-preview-view"),
  peerlistPreviewPanel: document.querySelector("#peerlist-preview-panel"),
  peerlistPreviewStatus: document.querySelector("#peerlist-preview-status"),
  peerlistPreviewIssues: document.querySelector("#peerlist-preview-issues"),
  peerlistPreviewFrame: document.querySelector("#peerlist-preview-frame"),
  peerlistPreviewSurface: document.querySelector("#peerlist-preview-surface"),
  peerlistPreviewEmpty: document.querySelector("#peerlist-preview-empty"),
  peerlistPreviewNotice: document.querySelector("#peerlist-preview-notice"),
  peerlistPreviewDesktop: document.querySelector("#peerlist-preview-desktop"),
  peerlistPreviewMobile: document.querySelector("#peerlist-preview-mobile"),
  disquietPreviewWorkbench: document.querySelector("#disquiet-preview-workbench"),
  disquietEditorView: document.querySelector("#disquiet-editor-view"),
  disquietPreviewView: document.querySelector("#disquiet-preview-view"),
  disquietPreviewPanel: document.querySelector("#disquiet-preview-panel"),
  disquietPreviewStatus: document.querySelector("#disquiet-preview-status"),
  disquietPreviewIssues: document.querySelector("#disquiet-preview-issues"),
  disquietPreviewFrame: document.querySelector("#disquiet-preview-frame"),
  disquietPreviewSurface: document.querySelector("#disquiet-preview-surface"),
  disquietPreviewEmpty: document.querySelector("#disquiet-preview-empty"),
  disquietPreviewNotice: document.querySelector("#disquiet-preview-notice"),
  disquietPreviewDesktop: document.querySelector("#disquiet-preview-desktop"),
  disquietPreviewMobile: document.querySelector("#disquiet-preview-mobile"),
  redditPreviewWorkbench: document.querySelector("#reddit-preview-workbench"),
  redditEditorView: document.querySelector("#reddit-editor-view"),
  redditPreviewView: document.querySelector("#reddit-preview-view"),
  redditPreviewPanel: document.querySelector("#reddit-preview-panel"),
  redditBriefForm: document.querySelector("#reddit-brief-form"),
  redditPostTypeInput: document.querySelector("#reddit-post-type-input"),
  redditTitleInput: document.querySelector("#reddit-title-input"),
  redditBodyInput: document.querySelector("#reddit-body-input"),
  redditNsfwInput: document.querySelector("#reddit-nsfw-input"),
  redditSpoilerInput: document.querySelector("#reddit-spoiler-input"),
  redditPreviewReset: document.querySelector("#reddit-preview-reset"),
  redditPreviewStatus: document.querySelector("#reddit-preview-status"),
  redditPreviewIssues: document.querySelector("#reddit-preview-issues"),
  redditPreviewFrame: document.querySelector("#reddit-preview-frame"),
  redditPreviewSurface: document.querySelector("#reddit-preview-surface"),
  redditPreviewEmpty: document.querySelector("#reddit-preview-empty"),
  redditPreviewNotice: document.querySelector("#reddit-preview-notice"),
  redditPreviewDesktop: document.querySelector("#reddit-preview-desktop"),
  redditPreviewMobile: document.querySelector("#reddit-preview-mobile"),
  indieHackersPreviewWorkbench: document.querySelector("#indie-hackers-preview-workbench"),
  indieHackersEditorView: document.querySelector("#indie-hackers-editor-view"),
  indieHackersPreviewView: document.querySelector("#indie-hackers-preview-view"),
  indieHackersPreviewPanel: document.querySelector("#indie-hackers-preview-panel"),
  indieHackersPreviewStatus: document.querySelector("#indie-hackers-preview-status"),
  indieHackersPreviewIssues: document.querySelector("#indie-hackers-preview-issues"),
  indieHackersPreviewFrame: document.querySelector("#indie-hackers-preview-frame"),
  indieHackersPreviewSurface: document.querySelector("#indie-hackers-preview-surface"),
  indieHackersPreviewEmpty: document.querySelector("#indie-hackers-preview-empty"),
  indieHackersPreviewNotice: document.querySelector("#indie-hackers-preview-notice"),
  indieHackersPreviewDesktop: document.querySelector("#indie-hackers-preview-desktop"),
  indieHackersPreviewMobile: document.querySelector("#indie-hackers-preview-mobile"),
  devPreviewWorkbench: document.querySelector("#dev-preview-workbench"), devEditorView: document.querySelector("#dev-editor-view"), devPreviewView: document.querySelector("#dev-preview-view"), devPreviewPanel: document.querySelector("#dev-preview-panel"), devTitleInput: document.querySelector("#dev-title-input"), devBodyInput: document.querySelector("#dev-body-input"), devTagsInput: document.querySelector("#dev-tags-input"), devDisclosureInput: document.querySelector("#dev-disclosure-input"), devPreviewStatus: document.querySelector("#dev-preview-status"), devPreviewIssues: document.querySelector("#dev-preview-issues"), devPreviewSurface: document.querySelector("#dev-preview-surface"), devPreviewNotice: document.querySelector("#dev-preview-notice"),
  okkyPreviewWorkbench: document.querySelector("#okky-preview-workbench"), okkyEditorView: document.querySelector("#okky-editor-view"), okkyPreviewView: document.querySelector("#okky-preview-view"), okkyPreviewPanel: document.querySelector("#okky-preview-panel"), okkyContextInput: document.querySelector("#okky-context-input"), okkyPreviewStatus: document.querySelector("#okky-preview-status"), okkyPreviewIssues: document.querySelector("#okky-preview-issues"), okkyPreviewFrame: document.querySelector("#okky-preview-frame"), okkyPreviewSurface: document.querySelector("#okky-preview-surface"), okkyPreviewEmpty: document.querySelector("#okky-preview-empty"), okkyPreviewNotice: document.querySelector("#okky-preview-notice"), okkyPreviewDesktop: document.querySelector("#okky-preview-desktop"), okkyPreviewMobile: document.querySelector("#okky-preview-mobile"),
  geeknewsPreviewWorkbench: document.querySelector("#geeknews-preview-workbench"), geeknewsEditorView: document.querySelector("#geeknews-editor-view"), geeknewsPreviewView: document.querySelector("#geeknews-preview-view"), geeknewsPreviewPanel: document.querySelector("#geeknews-preview-panel"), geeknewsPreviewStatus: document.querySelector("#geeknews-preview-status"), geeknewsPreviewIssues: document.querySelector("#geeknews-preview-issues"), geeknewsPreviewFrame: document.querySelector("#geeknews-preview-frame"), geeknewsPreviewSurface: document.querySelector("#geeknews-preview-surface"), geeknewsPreviewEmpty: document.querySelector("#geeknews-preview-empty"), geeknewsPreviewNotice: document.querySelector("#geeknews-preview-notice"), geeknewsPreviewDesktop: document.querySelector("#geeknews-preview-desktop"), geeknewsPreviewMobile: document.querySelector("#geeknews-preview-mobile"),
  showHnPreviewWorkbench: document.querySelector("#show-hn-preview-workbench"), showHnAuthorView: document.querySelector("#show-hn-author-view"), showHnPreviewView: document.querySelector("#show-hn-preview-view"), showHnAuthorPanel: document.querySelector("#show-hn-author-panel"), showHnPreviewPanel: document.querySelector("#show-hn-preview-panel"), showHnBriefForm: document.querySelector("#show-hn-brief-form"), showHnTitleInput: document.querySelector("#show-hn-title-input"), showHnBodyInput: document.querySelector("#show-hn-body-input"), showHnSourceInput: document.querySelector("#show-hn-source-input"), showHnDemoInput: document.querySelector("#show-hn-demo-input"), showHnHandwrittenInput: document.querySelector("#show-hn-handwritten-input"), showHnOwnershipInput: document.querySelector("#show-hn-ownership-input"), showHnReset: document.querySelector("#show-hn-preview-reset"), showHnPreviewStatus: document.querySelector("#show-hn-preview-status"), showHnPreviewIssues: document.querySelector("#show-hn-preview-issues"), showHnPreviewFrame: document.querySelector("#show-hn-preview-frame"), showHnPreviewSurface: document.querySelector("#show-hn-preview-surface"), showHnPreviewNotice: document.querySelector("#show-hn-preview-notice"), showHnPreviewDesktop: document.querySelector("#show-hn-preview-desktop"), showHnPreviewMobile: document.querySelector("#show-hn-preview-mobile"),
  tiktokPreviewLab: document.querySelector("#tiktok-preview-lab"),
  tiktokBriefForm: document.querySelector("#tiktok-brief-form"),
  tiktokCaptionInput: document.querySelector("#tiktok-caption-input"),
  tiktokCoverInput: document.querySelector("#tiktok-cover-input"),
  tiktokVisibilityInput: document.querySelector("#tiktok-visibility-input"),
  tiktokAssetReviewedInput: document.querySelector("#tiktok-asset-reviewed-input"),
  tiktokWatermarkReviewedInput: document.querySelector("#tiktok-watermark-reviewed-input"),
  tiktokPreviewReset: document.querySelector("#tiktok-preview-reset"),
  tiktokPreviewStatus: document.querySelector("#tiktok-preview-status"),
  tiktokPreviewIssues: document.querySelector("#tiktok-preview-issues"),
  tiktokPreviewFrame: document.querySelector("#tiktok-preview-frame"),
  tiktokPreviewSurface: document.querySelector("#tiktok-preview-surface"),
  tiktokPreviewNotice: document.querySelector("#tiktok-preview-notice"),
  tiktokPreviewDesktop: document.querySelector("#tiktok-preview-desktop"),
  tiktokPreviewMobile: document.querySelector("#tiktok-preview-mobile"),
  discordPreviewLab: document.querySelector("#discord-preview-lab"),
  discordBriefForm: document.querySelector("#discord-brief-form"),
  discordTargetAliasInput: document.querySelector("#discord-target-alias-input"),
  discordMessageInput: document.querySelector("#discord-message-input"),
  discordEmbedTitleInput: document.querySelector("#discord-embed-title-input"),
  discordEmbedDescriptionInput: document.querySelector("#discord-embed-description-input"),
  discordEmbedUrlInput: document.querySelector("#discord-embed-url-input"),
  discordMentionReviewedInput: document.querySelector("#discord-mention-reviewed-input"),
  discordPreviewReset: document.querySelector("#discord-preview-reset"),
  discordPreviewStatus: document.querySelector("#discord-preview-status"),
  discordPreviewIssues: document.querySelector("#discord-preview-issues"),
  discordPreviewFrame: document.querySelector("#discord-preview-frame"),
  discordPreviewSurface: document.querySelector("#discord-preview-surface"),
  discordPreviewNotice: document.querySelector("#discord-preview-notice"),
  discordPreviewDesktop: document.querySelector("#discord-preview-desktop"),
  discordPreviewMobile: document.querySelector("#discord-preview-mobile"),
  blueskyPreviewLab: document.querySelector("#bluesky-preview-lab"),
  blueskyBriefForm: document.querySelector("#bluesky-brief-form"),
  blueskyLocaleInput: document.querySelector("#bluesky-locale-input"),
  blueskyBodyInput: document.querySelector("#bluesky-body-input"),
  blueskyFacetsReviewedInput: document.querySelector("#bluesky-facets-reviewed-input"),
  blueskyPreviewReset: document.querySelector("#bluesky-preview-reset"),
  blueskyPreviewStatus: document.querySelector("#bluesky-preview-status"),
  blueskyPreviewIssues: document.querySelector("#bluesky-preview-issues"),
  blueskyPreviewFrame: document.querySelector("#bluesky-preview-frame"),
  blueskyPreviewSurface: document.querySelector("#bluesky-preview-surface"),
  blueskyPreviewNotice: document.querySelector("#bluesky-preview-notice"),
  blueskyPreviewDesktop: document.querySelector("#bluesky-preview-desktop"),
  blueskyPreviewMobile: document.querySelector("#bluesky-preview-mobile"),
  mastodonPreviewLab: document.querySelector("#mastodon-preview-lab"),
  mastodonBriefForm: document.querySelector("#mastodon-brief-form"),
  mastodonInstanceAliasInput: document.querySelector("#mastodon-instance-alias-input"),
  mastodonCharacterLimitInput: document.querySelector("#mastodon-character-limit-input"),
  mastodonUrlReservedInput: document.querySelector("#mastodon-url-reserved-input"),
  mastodonVisibilityInput: document.querySelector("#mastodon-visibility-input"),
  mastodonContentWarningInput: document.querySelector("#mastodon-content-warning-input"),
  mastodonBodyInput: document.querySelector("#mastodon-body-input"),
  mastodonRulesReviewedInput: document.querySelector("#mastodon-rules-reviewed-input"),
  mastodonContentWarningReviewedInput: document.querySelector("#mastodon-content-warning-reviewed-input"),
  mastodonPreviewReset: document.querySelector("#mastodon-preview-reset"),
  mastodonPreviewStatus: document.querySelector("#mastodon-preview-status"),
  mastodonPreviewIssues: document.querySelector("#mastodon-preview-issues"),
  mastodonPreviewFrame: document.querySelector("#mastodon-preview-frame"),
  mastodonPreviewSurface: document.querySelector("#mastodon-preview-surface"),
  mastodonPreviewNotice: document.querySelector("#mastodon-preview-notice"),
  mastodonPreviewDesktop: document.querySelector("#mastodon-preview-desktop"),
  mastodonPreviewMobile: document.querySelector("#mastodon-preview-mobile"),
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
  xReviewMode: "editor",
  xReviewViewport: "desktop",
  threadsPreviewMode: "editor",
  threadsPreviewViewport: "desktop",
  linkedinPreviewMode: "editor",
  linkedinPreviewViewport: "desktop",
  facebookPreviewMode: "editor",
  facebookPreviewViewport: "desktop",
  instagramPreviewMode: "editor",
  instagramPreviewViewport: "desktop",
  shortsPreviewMode: "editor",
  shortsPreviewViewport: "desktop",
  shortsPreviewShotIndex: 0,
  productHuntPreviewMode: "editor",
  productHuntPreviewViewport: "desktop",
  peerlistPreviewMode: "editor",
  peerlistPreviewViewport: "desktop",
  disquietPreviewMode: "editor",
  disquietPreviewViewport: "desktop",
  redditPreviewMode: "editor",
  redditPreviewViewport: "desktop",
  indieHackersPreviewMode: "editor",
  indieHackersPreviewViewport: "desktop",
  devPreviewMode: "editor", devBrief: { title: "", body: "", tags: "", disclosure: "" },
  okkyPreviewMode: "editor", okkyPreviewViewport: "desktop", okkyBrief: { context: "unconfirmed" },
  geeknewsPreviewMode: "editor", geeknewsPreviewViewport: "desktop",
  // Show HN text must be typed by the author without AI generation, translation,
  // or editing. Keep this manual session state out of workspace persistence,
  // approval, copy, dry-run, and all generated channel documents.
  showHnPreviewMode: "author", showHnPreviewViewport: "desktop",
  showHnBrief: { title: "", body: "", sourceUrl: "", demoUrl: "", handwrittenConfirmed: false, ownershipConfirmed: false },
  // Reddit is reference-only. This direct author draft stays in memory for
  // this browser session and is deliberately absent from snapshots, copy,
  // approval, dry-run, and persisted workspace data.
  redditBrief: { title: "", body: "", postType: "unconfirmed", nsfw: false, spoiler: false },
  // TikTok is not a generated channel. This brief stays only in memory for
  // the current browser session and is deliberately absent from workspace
  // snapshots and all approval/copy/dry-run paths.
  tiktokBrief: { caption: "", cover: "", visibility: "unconfirmed", assetReviewed: false, watermarkReviewed: false },
  tiktokPreviewViewport: "desktop",
  // Discord is not a generated channel. Keep the manual brief in memory only;
  // it cannot enter workspace snapshots, credentials, approval, copy or dry-run.
  discordBrief: { targetAlias: "", message: "", embedTitle: "", embedDescription: "", embedUrl: "", mentionReviewed: false },
  discordPreviewViewport: "desktop",
  // Bluesky is not a generated channel. This manual brief remains session-only
  // and cannot enter workspace snapshots, account data, approval or dry-runs.
  blueskyBrief: { locale: "unconfirmed", body: "", facetsReviewed: false },
  blueskyPreviewViewport: "desktop",
  // Mastodon uses a separate session-only brief. Instance limits are only
  // user-entered local notes and never trigger an instance request or write.
  mastodonBrief: { instanceAlias: "", characterLimit: "", urlReservedCharacters: "", visibility: "unconfirmed", contentWarning: "", body: "", rulesReviewed: false, contentWarningReviewed: false },
  mastodonPreviewViewport: "desktop",
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
  if (!render) {
    renderThreadsPreview();
    renderXReview();
    renderLinkedInPreview();
    renderFacebookPreview();
    renderInstagramPreview();
    renderShortsPreview();
    renderProductHuntPreview();
    renderPeerlistPreview();
    renderDisquietPreview();
    renderRedditPreview();
    renderIndieHackersPreview();
    renderDevPreview();
    renderOkkyPreview();
    renderGeekNewsPreview();
    renderShowHnPreview();
  }
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
  renderProductHuntPreview();
  renderPeerlistPreview();
  renderDisquietPreview();
  renderRedditPreview();
  renderIndieHackersPreview();
  renderDevPreview();
  renderOkkyPreview();
  renderGeekNewsPreview();
  renderShowHnPreview();
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
    renderXReview();
    renderLinkedInPreview();
    renderFacebookPreview();
    renderInstagramPreview();
    renderShortsPreview();
    renderProductHuntPreview();
    renderPeerlistPreview();
    renderDisquietPreview();
    renderRedditPreview();
    renderIndieHackersPreview();
    renderDevPreview();
    renderOkkyPreview();
    renderGeekNewsPreview();
    renderShowHnPreview();
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
  renderXReview();
  renderLinkedInPreview();
  renderFacebookPreview();
  renderInstagramPreview();
  renderShortsPreview();
  renderProductHuntPreview();
  renderPeerlistPreview();
  renderDisquietPreview();
  renderRedditPreview();
  renderIndieHackersPreview();
  renderDevPreview();
  renderOkkyPreview();
  renderGeekNewsPreview();
  renderShowHnPreview();
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
  renderCurrentValidationIssues();
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
  const platform = platformForChannel(channel);
  const manualPlatform = platform && ["manual_only", "draft_only"].includes(platformReadinessSchema(platform).automationMode);
  // Manual-only/draft-only platform operation checks have one authoritative
  // home in the readiness panel. Keeping them out of this editor avoids two
  // controls mutating the same local operation record.
  const defs = authorInputDefs(channel).filter((def) => !manualPlatform || def.scope !== "operations");
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
  const genericGates = manualPlatform
    ? []
    : (channelProfile(channel)?.prepublishGates ?? []).filter((gate) => !explicitOperationKeys.has(gate.key));
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

// Keep the issue list in sync when a typed channel/operation field changes.
// Previously it was refreshed only by renderActiveDraft(), so the visible
// checklist could still say "input required" after a user had filled it.
function renderCurrentValidationIssues() {
  const translation = state.activeLocale === SOURCE_LOCALE ? null : localeEntry(state.activeLocale);
  const stateForIssues = displayCompletionState(activeDocument(), {
    locale: state.activeLocale,
    stale: Boolean(translation?.stale),
    missingTranslation: state.activeLocale !== SOURCE_LOCALE && !translation,
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

function currentXReviewModel() {
  const entry = localeEntry(state.activeLocale);
  const readiness = activePlatformReadinessRecord();
  return createXPreviewModel({
    channel: state.activeDraft,
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    publicHandle: readiness?.account?.handle ?? "",
  });
}

function appendXReviewContext(label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const detail = document.createElement("dd");
  detail.textContent = value;
  row.append(term, detail);
  elements.xReviewContext.append(row);
}

function appendXReviewText(element, value) {
  const source = String(value ?? "");
  let cursor = 0;
  for (const match of source.matchAll(X_PREVIEW_URL_PATTERN)) {
    const index = match.index ?? cursor;
    if (index > cursor) element.append(document.createTextNode(source.slice(cursor, index)));
    const url = document.createElement("span");
    url.className = "x-draft-url";
    url.textContent = match[0];
    element.append(url);
    cursor = index + match[0].length;
  }
  if (cursor < source.length || source.length === 0) element.append(document.createTextNode(source.slice(cursor)));
}

function appendXReviewCard(cardModel, identity) {
  const item = document.createElement("li");
  item.className = "x-review-card";
  item.dataset.state = cardModel.overLimit ? "over-limit" : "within-limit";
  item.dataset.kind = cardModel.kind;
  item.dataset.last = String(cardModel.index === cardModel.total);

  const axis = document.createElement("div");
  axis.className = "x-draft-axis";
  axis.setAttribute("aria-hidden", "true");
  const identicon = document.createElement("span");
  identicon.className = "x-draft-identicon";
  identicon.textContent = identity.initials;
  axis.append(identicon);
  if (cardModel.kind === "thread_segment" && cardModel.index < cardModel.total) {
    const connector = document.createElement("span");
    connector.className = "x-draft-connector";
    axis.append(connector);
  }

  const post = document.createElement("article");
  post.className = "x-draft-post";
  const byline = document.createElement("header");
  byline.className = "x-draft-byline";
  const account = document.createElement("div");
  account.className = "x-draft-account";
  const accountLabel = document.createElement("strong");
  accountLabel.textContent = identity.known ? "게시 대상 계정" : "계정 정보 미확인";
  const handle = document.createElement("span");
  handle.className = "x-draft-handle";
  handle.textContent = identity.handle;
  const draftLabel = document.createElement("span");
  draftLabel.className = "x-draft-label";
  draftLabel.textContent = cardModel.draftLabel;
  account.append(accountLabel, handle, draftLabel);
  const overflow = document.createElement("span");
  overflow.className = "x-draft-overflow";
  overflow.textContent = "•••";
  overflow.setAttribute("aria-hidden", "true");
  byline.append(account, overflow);

  const text = document.createElement("p");
  text.className = "x-review-text";
  text.dir = "auto";
  appendXReviewText(text, cardModel.text);
  if (!cardModel.text) text.dataset.empty = "true";

  const diagnostics = document.createElement("p");
  diagnostics.className = "x-review-diagnostics";
  diagnostics.textContent = cardModel.overLimit
    ? `로컬 가중 문자 추정 ${cardModel.weightedLength.toLocaleString("ko-KR")} / ${cardModel.limit} · ${Math.abs(cardModel.remaining).toLocaleString("ko-KR")} 초과 · URL ${cardModel.urlCount}개`
    : `로컬 가중 문자 추정 ${cardModel.weightedLength.toLocaleString("ko-KR")} / ${cardModel.limit} · ${cardModel.remaining.toLocaleString("ko-KR")} 여유 · URL ${cardModel.urlCount}개`;

  const actionLane = document.createElement("div");
  actionLane.className = "x-draft-action-lane";
  actionLane.setAttribute("aria-hidden", "true");
  for (const iconName of ["bubble", "arrows", "heart", "upload"]) {
    const icon = document.createElement("span");
    icon.className = `x-draft-action x-draft-action-${iconName}`;
    actionLane.append(icon);
  }
  post.append(byline, text, diagnostics, actionLane);
  item.append(axis, post);
  elements.xReviewCards.append(item);
}

function renderXReview() {
  if (!elements.xReviewWorkbench) return;
  const isXReview = state.phase === "success" && X_REVIEW_KEYS.has(state.activeDraft);
  elements.xReviewWorkbench.hidden = !isXReview;
  if (!isXReview) {
    elements.xReviewPanel.hidden = true;
    return;
  }

  const reviewMode = state.xReviewMode === "review";
  elements.xEditorView.setAttribute("aria-selected", String(!reviewMode));
  elements.xEditorView.tabIndex = reviewMode ? -1 : 0;
  elements.xReviewView.setAttribute("aria-selected", String(reviewMode));
  elements.xReviewView.tabIndex = reviewMode ? 0 : -1;
  elements.compareEditors.hidden = reviewMode;
  elements.editorHelp.hidden = reviewMode;
  elements.xReviewPanel.hidden = !reviewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "x-editor-view");

  const model = currentXReviewModel();
  elements.xReviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.xReviewStatus.dataset.state = model.status.key;
  elements.xReviewFrame.dataset.viewport = state.xReviewViewport;
  elements.xReviewDesktop.setAttribute("aria-pressed", String(state.xReviewViewport === "desktop"));
  elements.xReviewMobile.setAttribute("aria-pressed", String(state.xReviewViewport === "mobile"));
  elements.xReviewContext.replaceChildren();
  appendXReviewContext("형식", model.kind === "thread" ? "연속 원고" : "단일 원고");
  appendXReviewContext("언어", localeLabel(model.locale));
  appendXReviewContext("대상", model.identity.handle);
  elements.xReviewIssues.hidden = model.content.issues.length === 0;
  elements.xReviewIssues.replaceChildren();
  for (const issue of model.content.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.xReviewIssues.append(row);
  }
  elements.xReviewCards.replaceChildren();
  elements.xReviewEmpty.hidden = model.cards.length > 0;
  elements.xReviewEmpty.textContent = model.emptyMessage;
  for (const card of model.cards) appendXReviewCard(card, model.identity);
  elements.xReviewNotice.textContent = `${model.notice} 외부 X 요청·게시 ${model.externalWriteCount}회.`;
}

function selectXReviewMode(mode, { focus = false } = {}) {
  if (!X_REVIEW_KEYS.has(state.activeDraft)) return;
  state.xReviewMode = mode === "review" ? "review" : "editor";
  renderXReview();
  if (focus) (state.xReviewMode === "review" ? elements.xReviewView : elements.xEditorView).focus();
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

function currentLinkedInPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  const readiness = activePlatformReadinessRecord("linkedin");
  return createLinkedInPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    publicHandle: readiness?.account?.handle ?? "",
  });
}

function appendLinkedInPreviewPost(model) {
  const post = document.createElement("article");
  post.className = "linkedin-draft-post";
  post.dataset.state = model.content.overLimit ? "over-limit" : "within-limit";

  const byline = document.createElement("header");
  byline.className = "linkedin-draft-byline";
  const monogram = document.createElement("span");
  monogram.className = "linkedin-draft-monogram";
  monogram.textContent = model.identity.initials;
  monogram.setAttribute("aria-hidden", "true");
  const identity = document.createElement("div");
  identity.className = "linkedin-draft-identity";
  const name = document.createElement("strong");
  name.textContent = model.identity.label;
  const handle = document.createElement("span");
  handle.textContent = model.identity.handle;
  const meta = document.createElement("span");
  meta.textContent = `초안 · 게시 전 · ${localeLabel(model.locale)}`;
  identity.append(name, handle, meta);
  const overflow = document.createElement("span");
  overflow.className = "linkedin-draft-overflow";
  overflow.textContent = "•••";
  overflow.setAttribute("aria-hidden", "true");
  byline.append(monogram, identity, overflow);

  const text = document.createElement("p");
  text.className = "linkedin-draft-text";
  text.dir = "auto";
  text.textContent = model.content.body;
  if (!model.content.body) {
    text.dataset.empty = "true";
    text.textContent = "본문을 입력하면 LinkedIn 읽기 폭에서 줄바꿈을 확인할 수 있습니다.";
  }

  const diagnostics = document.createElement("div");
  diagnostics.className = "linkedin-draft-diagnostics";
  const length = document.createElement("span");
  length.textContent = model.content.overLimit
    ? `${model.content.characterCount.toLocaleString("ko-KR")} / ${model.content.limit.toLocaleString("ko-KR")}자 · ${Math.abs(model.content.remaining).toLocaleString("ko-KR")}자 초과`
    : `${model.content.characterCount.toLocaleString("ko-KR")} / ${model.content.limit.toLocaleString("ko-KR")}자 · ${model.content.remaining.toLocaleString("ko-KR")}자 여유`;
  const audience = document.createElement("span");
  audience.textContent = model.settings.audience;
  const comments = document.createElement("span");
  comments.textContent = model.settings.comments;
  diagnostics.append(length, audience, comments);

  const actionLane = document.createElement("div");
  actionLane.className = "linkedin-draft-action-lane";
  actionLane.setAttribute("aria-hidden", "true");
  for (const label of ["반응", "댓글", "공유"]) {
    const action = document.createElement("span");
    action.textContent = label;
    actionLane.append(action);
  }
  post.append(byline, text, diagnostics, actionLane);
  elements.linkedinPreviewPost.append(post);
}

function renderLinkedInPreview() {
  if (!elements.linkedinPreviewWorkbench) return;
  const spec = previewSpecForChannel("linkedin");
  const isLinkedIn = state.phase === "success"
    && state.activeDraft === "linkedin"
    && spec?.inputMode === "publish_fields";
  elements.linkedinPreviewWorkbench.hidden = !isLinkedIn;
  if (!isLinkedIn) {
    elements.linkedinPreviewPanel.hidden = true;
    return;
  }

  const previewMode = state.linkedinPreviewMode === "preview";
  elements.linkedinEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.linkedinEditorView.tabIndex = previewMode ? -1 : 0;
  elements.linkedinPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.linkedinPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.linkedinPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "linkedin-editor-view");

  const model = currentLinkedInPreviewModel();
  elements.linkedinPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.linkedinPreviewStatus.dataset.state = model.status.key;
  elements.linkedinPreviewFrame.dataset.viewport = state.linkedinPreviewViewport;
  elements.linkedinPreviewDesktop.setAttribute("aria-pressed", String(state.linkedinPreviewViewport === "desktop"));
  elements.linkedinPreviewMobile.setAttribute("aria-pressed", String(state.linkedinPreviewViewport === "mobile"));
  elements.linkedinPreviewIssues.hidden = model.content.issues.length === 0;
  elements.linkedinPreviewIssues.replaceChildren();
  for (const issue of model.content.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.linkedinPreviewIssues.append(row);
  }
  elements.linkedinPreviewPost.replaceChildren();
  elements.linkedinPreviewEmpty.hidden = model.status.key !== "empty";
  elements.linkedinPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendLinkedInPreviewPost(model);
  elements.linkedinPreviewNotice.textContent = `${model.notice} 외부 LinkedIn 요청·게시 ${model.externalWriteCount}회.`;
}

function selectLinkedInPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "linkedin") return;
  state.linkedinPreviewMode = mode === "preview" ? "preview" : "editor";
  renderLinkedInPreview();
  if (focus) (state.linkedinPreviewMode === "preview" ? elements.linkedinPreviewView : elements.linkedinEditorView).focus();
}

function currentFacebookPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  const readiness = activePlatformReadinessRecord("facebook");
  return createFacebookPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    publicHandle: readiness?.account?.handle ?? "",
    operationInputs: currentOperationInputs("facebook"),
    asset: readiness?.asset ?? null,
  });
}

function appendFacebookReelsPreview(model) {
  const preview = document.createElement("article");
  preview.className = "facebook-reels-preview";

  const stage = document.createElement("div");
  stage.className = "facebook-reels-stage";
  const topLine = document.createElement("div");
  topLine.className = "facebook-reels-topline";
  const account = document.createElement("span");
  account.textContent = model.identity.handle;
  const label = document.createElement("span");
  label.textContent = "Reels · local draft";
  topLine.append(account, label);

  const media = document.createElement("div");
  media.className = "facebook-reels-media";
  const mediaMark = document.createElement("span");
  mediaMark.className = "facebook-reels-media-mark";
  mediaMark.textContent = "ORIGINAL";
  const mediaState = document.createElement("strong");
  mediaState.textContent = model.reels.label;
  const mediaDescription = document.createElement("span");
  mediaDescription.textContent = model.reels.description;
  media.append(mediaMark, mediaState, mediaDescription);

  const caption = document.createElement("p");
  caption.className = "facebook-reels-caption";
  caption.dir = "auto";
  caption.textContent = model.content.reelsCaption || "Reels 캡션을 입력하면 세로 읽기 폭에서 줄바꿈을 확인할 수 있습니다.";
  if (!model.content.reelsCaption) caption.dataset.empty = "true";

  const actionLane = document.createElement("p");
  actionLane.className = "facebook-reels-action-lane";
  actionLane.textContent = "반응   댓글   공유";
  actionLane.setAttribute("aria-hidden", "true");
  stage.append(topLine, media, caption, actionLane);
  preview.append(stage);
  elements.facebookPreviewSurface.append(preview);
}

function appendFacebookGroupPreview(model) {
  const preview = document.createElement("article");
  preview.className = "facebook-group-preview";

  const header = document.createElement("header");
  header.className = "facebook-group-header";
  const mark = document.createElement("span");
  mark.className = "facebook-group-mark";
  mark.textContent = model.group.groupName.slice(0, 1).toUpperCase() || "G";
  mark.setAttribute("aria-hidden", "true");
  const context = document.createElement("div");
  context.className = "facebook-group-context";
  const name = document.createElement("strong");
  name.textContent = model.group.groupName;
  const metadata = document.createElement("span");
  metadata.textContent = `그룹 원고 검토 · ${model.group.locale}`;
  context.append(name, metadata);
  const account = document.createElement("span");
  account.className = "facebook-group-account";
  account.textContent = model.identity.handle;
  header.append(mark, context, account);
  preview.append(header);

  if (model.group.key !== "ready") {
    const gate = document.createElement("p");
    gate.className = "facebook-group-gate";
    gate.textContent = model.group.description;
    preview.append(gate);
  } else {
    const body = document.createElement("p");
    body.className = "facebook-group-body";
    body.dir = "auto";
    body.textContent = model.content.groupBody || "그룹 본문을 입력하면 이 읽기 폭에서 줄바꿈을 확인할 수 있습니다.";
    if (!model.content.groupBody) body.dataset.empty = "true";
    const actionLane = document.createElement("p");
    actionLane.className = "facebook-group-action-lane";
    actionLane.textContent = "반응   댓글   공유";
    actionLane.setAttribute("aria-hidden", "true");
    preview.append(body, actionLane);
  }
  elements.facebookPreviewSurface.append(preview);
}

function renderFacebookPreview() {
  if (!elements.facebookPreviewWorkbench) return;
  const spec = previewSpecForChannel("facebook");
  const isFacebook = state.phase === "success"
    && state.activeDraft === "facebook"
    && spec?.inputMode === "publish_fields";
  elements.facebookPreviewWorkbench.hidden = !isFacebook;
  if (!isFacebook) {
    elements.facebookPreviewPanel.hidden = true;
    return;
  }

  const mode = ["reels", "group"].includes(state.facebookPreviewMode) ? state.facebookPreviewMode : "editor";
  const previewMode = mode !== "editor";
  const tabModes = [
    [elements.facebookEditorView, "editor"],
    [elements.facebookReelsView, "reels"],
    [elements.facebookGroupView, "group"],
  ];
  for (const [button, tabMode] of tabModes) {
    const active = mode === tabMode;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.facebookPreviewPanel.hidden = !previewMode;
  elements.facebookPreviewPanel.setAttribute("aria-labelledby", mode === "group" ? "facebook-group-view" : "facebook-reels-view");
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "facebook-editor-view");

  const model = currentFacebookPreviewModel();
  elements.facebookPreviewTitle.textContent = mode === "group"
    ? "Facebook 그룹 게시 전 미리보기"
    : "Facebook Reels 게시 전 미리보기";
  elements.facebookPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.facebookPreviewStatus.dataset.state = model.status.key;
  elements.facebookPreviewFrame.dataset.viewport = state.facebookPreviewViewport;
  elements.facebookPreviewFrame.dataset.mode = mode;
  elements.facebookPreviewDesktop.setAttribute("aria-pressed", String(state.facebookPreviewViewport === "desktop"));
  elements.facebookPreviewMobile.setAttribute("aria-pressed", String(state.facebookPreviewViewport === "mobile"));
  const surfaceIssues = mode === "group" ? model.group.issues : model.reels.issues;
  elements.facebookPreviewIssues.hidden = surfaceIssues.length === 0;
  elements.facebookPreviewIssues.replaceChildren();
  for (const issue of surfaceIssues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.facebookPreviewIssues.append(row);
  }
  elements.facebookPreviewSurface.replaceChildren();
  elements.facebookPreviewEmpty.hidden = model.status.key !== "empty";
  elements.facebookPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") {
    if (mode === "group") appendFacebookGroupPreview(model);
    else appendFacebookReelsPreview(model);
  }
  elements.facebookPreviewNotice.textContent = `${model.notice} 외부 Facebook 요청·게시 ${model.externalWriteCount}회.`;
}

function selectFacebookPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "facebook") return;
  state.facebookPreviewMode = ["reels", "group"].includes(mode) ? mode : "editor";
  renderFacebookPreview();
  if (!focus) return;
  const button = state.facebookPreviewMode === "reels"
    ? elements.facebookReelsView
    : state.facebookPreviewMode === "group"
      ? elements.facebookGroupView
      : elements.facebookEditorView;
  button.focus();
}

function currentInstagramPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  const readiness = activePlatformReadinessRecord("instagram");
  return createInstagramPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    publicHandle: readiness?.account?.handle ?? "",
    operationInputs: currentOperationInputs("instagram"),
    asset: readiness?.asset ?? null,
  });
}

function appendInstagramPreview(model) {
  const preview = document.createElement("article");
  preview.className = "instagram-reels-preview";

  const stage = document.createElement("div");
  stage.className = "instagram-reels-stage";
  const topLine = document.createElement("div");
  topLine.className = "instagram-reels-topline";
  const account = document.createElement("span");
  account.textContent = model.identity.handle;
  const label = document.createElement("span");
  label.textContent = "LOCAL REEL REVIEW";
  topLine.append(account, label);

  const mediaCheck = document.createElement("div");
  mediaCheck.className = "instagram-reels-media-check";
  const mediaMark = document.createElement("span");
  mediaMark.textContent = "MEDIA CHECK";
  const mediaState = document.createElement("strong");
  mediaState.textContent = model.media.label;
  const mediaDescription = document.createElement("span");
  mediaDescription.textContent = model.media.description;
  mediaCheck.append(mediaMark, mediaState, mediaDescription);

  const cover = document.createElement("p");
  cover.className = "instagram-reels-cover";
  cover.dir = "auto";
  cover.textContent = model.content.cover || "표지 문구를 입력하면 9:16 읽기 폭에서 줄바꿈을 확인할 수 있습니다.";
  if (!model.content.cover) cover.dataset.empty = "true";

  const coverCount = document.createElement("span");
  coverCount.className = "instagram-reels-cover-count";
  coverCount.textContent = `${model.content.coverLength} / ${model.content.coverLimit}자 · 표지`;
  stage.append(topLine, mediaCheck, cover, coverCount);

  const captionSection = document.createElement("section");
  captionSection.className = "instagram-reels-caption-section";
  const captionLabel = document.createElement("span");
  captionLabel.className = "instagram-reels-caption-label";
  captionLabel.textContent = `CAPTION · ${localeLabel(model.locale)}`;
  const caption = document.createElement("p");
  caption.className = "instagram-reels-caption";
  caption.dir = "auto";
  caption.textContent = model.content.caption || "캡션을 입력하면 게시 전 읽기 폭에서 줄바꿈을 확인할 수 있습니다.";
  if (!model.content.caption) caption.dataset.empty = "true";
  captionSection.append(captionLabel, caption);

  const readiness = document.createElement("dl");
  readiness.className = "instagram-reels-readiness";
  for (const [labelText, value] of [
    ["ASSET", model.media],
    ["COVER", model.coverReadiness],
    ["LINK", model.profile],
  ]) {
    const row = document.createElement("div");
    row.dataset.state = value.key;
    const labelElement = document.createElement("dt");
    labelElement.textContent = labelText;
    const detail = document.createElement("dd");
    detail.textContent = value.label;
    row.append(labelElement, detail);
    readiness.append(row);
  }
  preview.append(stage, captionSection, readiness);
  elements.instagramPreviewSurface.append(preview);
}

function renderInstagramPreview() {
  if (!elements.instagramPreviewWorkbench) return;
  const spec = previewSpecForChannel("instagram");
  const isInstagram = state.phase === "success"
    && state.activeDraft === "instagram"
    && spec?.inputMode === "publish_fields";
  elements.instagramPreviewWorkbench.hidden = !isInstagram;
  if (!isInstagram) {
    elements.instagramPreviewPanel.hidden = true;
    return;
  }

  const previewMode = state.instagramPreviewMode === "preview";
  elements.instagramEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.instagramEditorView.tabIndex = previewMode ? -1 : 0;
  elements.instagramPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.instagramPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.instagramPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "instagram-editor-view");

  const model = currentInstagramPreviewModel();
  elements.instagramPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.instagramPreviewStatus.dataset.state = model.status.key;
  elements.instagramPreviewFrame.dataset.viewport = state.instagramPreviewViewport;
  elements.instagramPreviewDesktop.setAttribute("aria-pressed", String(state.instagramPreviewViewport === "desktop"));
  elements.instagramPreviewMobile.setAttribute("aria-pressed", String(state.instagramPreviewViewport === "mobile"));
  elements.instagramPreviewIssues.hidden = model.content.issues.length === 0;
  elements.instagramPreviewIssues.replaceChildren();
  for (const issue of model.content.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.instagramPreviewIssues.append(row);
  }
  elements.instagramPreviewSurface.replaceChildren();
  elements.instagramPreviewEmpty.hidden = model.status.key !== "empty";
  elements.instagramPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendInstagramPreview(model);
  elements.instagramPreviewNotice.textContent = `${model.notice} 외부 Instagram 요청·게시 ${model.externalWriteCount}회.`;
}

function selectInstagramPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "instagram") return;
  state.instagramPreviewMode = mode === "preview" ? "preview" : "editor";
  renderInstagramPreview();
  if (focus) (state.instagramPreviewMode === "preview" ? elements.instagramPreviewView : elements.instagramEditorView).focus();
}

function currentShortsPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  const readiness = activePlatformReadinessRecord("shorts");
  return createShortsPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    publicHandle: readiness?.account?.handle ?? "",
    operationInputs: currentOperationInputs("shorts"),
    asset: readiness?.asset ?? null,
  });
}

function appendShortsPreview(model) {
  const preview = document.createElement("article");
  preview.className = "shorts-draft-preview";

  const stage = document.createElement("section");
  stage.className = "shorts-draft-stage";
  const topLine = document.createElement("div");
  topLine.className = "shorts-draft-topline";
  const account = document.createElement("span");
  account.textContent = model.identity.handle;
  const localLabel = document.createElement("span");
  localLabel.textContent = "LOCAL STORYBOARD";
  topLine.append(account, localLabel);

  const mediaCheck = document.createElement("div");
  mediaCheck.className = "shorts-draft-media-check";
  const mediaMark = document.createElement("span");
  mediaMark.textContent = "VIDEO CHECK";
  const mediaState = document.createElement("strong");
  mediaState.textContent = model.media.label;
  const mediaDescription = document.createElement("span");
  mediaDescription.textContent = model.media.description;
  mediaCheck.append(mediaMark, mediaState, mediaDescription);

  const selectedShot = model.content.shots[state.shortsPreviewShotIndex] ?? null;
  const shotLabel = document.createElement("p");
  shotLabel.className = "shorts-draft-shot-label";
  shotLabel.textContent = selectedShot
    ? `SHOT ${String(selectedShot.index).padStart(2, "0")} / ${String(model.content.shots.length).padStart(2, "0")}`
    : "SHOT SEQUENCE";
  const shotText = document.createElement("p");
  shotText.className = "shorts-draft-shot-text";
  shotText.dir = "auto";
  shotText.textContent = selectedShot?.text || "샷 자막을 입력하면 세로 영상에서의 읽기 흐름을 확인할 수 있습니다.";
  if (!selectedShot?.text) shotText.dataset.empty = "true";

  const shotSequence = document.createElement("ol");
  shotSequence.className = "shorts-draft-shot-sequence";
  for (const [index, shot] of model.content.shots.entries()) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shorts-draft-shot-choice";
    button.setAttribute("aria-pressed", String(index === state.shortsPreviewShotIndex));
    button.textContent = `${String(shot.index).padStart(2, "0")} · ${shot.text || "빈 샷 자막"}`;
    button.addEventListener("click", () => {
      state.shortsPreviewShotIndex = index;
      renderShortsPreview();
    });
    item.append(button);
    shotSequence.append(item);
  }
  stage.append(topLine, mediaCheck, shotLabel, shotText, shotSequence);

  const details = document.createElement("section");
  details.className = "shorts-draft-details";
  const titleLabel = document.createElement("span");
  titleLabel.className = "shorts-draft-detail-label";
  titleLabel.textContent = `TITLE · ${localeLabel(model.locale)} · ${model.content.titleLength} / ${model.content.titleLimit}`;
  const title = document.createElement("p");
  title.className = "shorts-draft-title";
  title.dir = "auto";
  title.textContent = model.content.title || "Shorts 제목을 입력하면 읽기 폭을 확인할 수 있습니다.";
  if (!model.content.title) title.dataset.empty = "true";
  const descriptionLabel = document.createElement("span");
  descriptionLabel.className = "shorts-draft-detail-label";
  descriptionLabel.textContent = `DESCRIPTION · ${model.content.descriptionLength.toLocaleString("ko-KR")} / ${model.content.descriptionLimit.toLocaleString("ko-KR")}`;
  const description = document.createElement("p");
  description.className = "shorts-draft-description";
  description.dir = "auto";
  description.textContent = model.content.description || "Shorts 설명을 입력하면 게시 전 줄바꿈을 확인할 수 있습니다.";
  if (!model.content.description) description.dataset.empty = "true";
  details.append(titleLabel, title, descriptionLabel, description);

  const readiness = document.createElement("dl");
  readiness.className = "shorts-draft-readiness";
  const row = document.createElement("div");
  row.dataset.state = model.media.key;
  const readinessLabel = document.createElement("dt");
  readinessLabel.textContent = "VIDEO";
  const readinessDetail = document.createElement("dd");
  readinessDetail.textContent = model.media.label;
  row.append(readinessLabel, readinessDetail);
  readiness.append(row);
  preview.append(stage, details, readiness);
  elements.shortsPreviewSurface.append(preview);
}

function renderShortsPreview() {
  if (!elements.shortsPreviewWorkbench) return;
  const spec = previewSpecForChannel("shorts");
  const isShorts = state.phase === "success"
    && state.activeDraft === "shorts"
    && spec?.inputMode === "publish_fields";
  elements.shortsPreviewWorkbench.hidden = !isShorts;
  if (!isShorts) {
    elements.shortsPreviewPanel.hidden = true;
    return;
  }

  const previewMode = state.shortsPreviewMode === "preview";
  elements.shortsEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.shortsEditorView.tabIndex = previewMode ? -1 : 0;
  elements.shortsPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.shortsPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.shortsPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "shorts-editor-view");

  const model = currentShortsPreviewModel();
  const maxShotIndex = Math.max(0, model.content.shots.length - 1);
  state.shortsPreviewShotIndex = Math.min(state.shortsPreviewShotIndex, maxShotIndex);
  elements.shortsPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.shortsPreviewStatus.dataset.state = model.status.key;
  elements.shortsPreviewFrame.dataset.viewport = state.shortsPreviewViewport;
  elements.shortsPreviewDesktop.setAttribute("aria-pressed", String(state.shortsPreviewViewport === "desktop"));
  elements.shortsPreviewMobile.setAttribute("aria-pressed", String(state.shortsPreviewViewport === "mobile"));
  elements.shortsPreviewIssues.hidden = model.content.issues.length === 0;
  elements.shortsPreviewIssues.replaceChildren();
  for (const issue of model.content.issues) {
    const issueRow = document.createElement("li");
    issueRow.dataset.code = issue.code;
    issueRow.textContent = issue.message;
    elements.shortsPreviewIssues.append(issueRow);
  }
  elements.shortsPreviewSurface.replaceChildren();
  elements.shortsPreviewEmpty.hidden = model.status.key !== "empty";
  elements.shortsPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendShortsPreview(model);
  elements.shortsPreviewNotice.textContent = `${model.notice} 외부 YouTube 요청·게시 ${model.externalWriteCount}회.`;
}

function selectShortsPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "shorts") return;
  state.shortsPreviewMode = mode === "preview" ? "preview" : "editor";
  renderShortsPreview();
  if (focus) (state.shortsPreviewMode === "preview" ? elements.shortsPreviewView : elements.shortsEditorView).focus();
}

function currentProductHuntPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  const readiness = activePlatformReadinessRecord("productHunt");
  return createProductHuntPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    publicHandle: readiness?.account?.handle ?? "",
    authorInputs: currentAuthorInputs("productHunt"),
    operationInputs: currentOperationInputs("productHunt"),
    productUrlCandidate: state.summary?.demoUrl || state.summary?.repositoryUrl || "",
  });
}

function appendProductHuntPreview(model) {
  const preview = document.createElement("article");
  preview.className = "product-hunt-draft-preview";

  const header = document.createElement("header");
  header.className = "product-hunt-draft-header";
  const thumbnail = document.createElement("div");
  thumbnail.className = "product-hunt-draft-thumbnail";
  thumbnail.setAttribute("aria-hidden", "true");
  const thumbnailMark = document.createElement("span");
  thumbnailMark.textContent = "THUMBNAIL";
  const thumbnailState = document.createElement("strong");
  thumbnailState.textContent = model.launch.items.find((item) => item.key.includes("gallery"))?.key === "gallery_reference_recorded" ? "CHECKED" : "TO PREPARE";
  thumbnail.append(thumbnailMark, thumbnailState);
  const titleGroup = document.createElement("div");
  titleGroup.className = "product-hunt-draft-title-group";
  const localLabel = document.createElement("span");
  localLabel.textContent = "LOCAL LAUNCH REVIEW";
  const name = document.createElement("h5");
  name.dir = "auto";
  name.textContent = model.content.name || "제품명을 입력하면 launch field 읽기 순서를 확인할 수 있습니다.";
  if (!model.content.name) name.dataset.empty = "true";
  const tagline = document.createElement("p");
  tagline.className = "product-hunt-draft-tagline";
  tagline.dir = "auto";
  tagline.textContent = model.content.tagline || "태그라인을 입력하세요.";
  if (!model.content.tagline) tagline.dataset.empty = "true";
  titleGroup.append(localLabel, name, tagline);
  header.append(thumbnail, titleGroup);

  const launchMeta = document.createElement("dl");
  launchMeta.className = "product-hunt-draft-meta";
  const metaValues = [
    ["URL CANDIDATE", model.launch.productUrl || "직접 확인 필요"],
    ["PRICING", model.launch.items.find((item) => item.key.startsWith("pricing"))?.value || "직접 입력 필요"],
    ["TOPIC", model.launch.items.find((item) => item.key.startsWith("topic"))?.value || "직접 선택 필요"],
    ["MAKER", model.identity.handle],
  ];
  for (const [label, value] of metaValues) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.dir = "auto";
    detail.textContent = value;
    row.append(term, detail);
    launchMeta.append(row);
  }

  const description = document.createElement("section");
  description.className = "product-hunt-draft-description";
  const descriptionLabel = document.createElement("span");
  descriptionLabel.textContent = `DESCRIPTION · ${model.content.descriptionLength} / 260`;
  const descriptionBody = document.createElement("p");
  descriptionBody.dir = "auto";
  descriptionBody.textContent = model.content.description || "설명을 입력하면 260자 범위의 읽기 밀도를 확인할 수 있습니다.";
  if (!model.content.description) descriptionBody.dataset.empty = "true";
  description.append(descriptionLabel, descriptionBody);

  const comment = document.createElement("section");
  comment.className = "product-hunt-draft-comment";
  const commentLabel = document.createElement("span");
  commentLabel.textContent = "MAKER FIRST COMMENT · LOCAL DRAFT";
  const commentBody = document.createElement("p");
  commentBody.dir = "auto";
  commentBody.textContent = model.content.firstComment || "Maker 첫 댓글을 입력하면 공개 전에 문맥을 검토할 수 있습니다.";
  if (!model.content.firstComment) commentBody.dataset.empty = "true";
  comment.append(commentLabel, commentBody);

  const readiness = document.createElement("dl");
  readiness.className = "product-hunt-draft-readiness";
  for (const item of model.launch.items) {
    const row = document.createElement("div");
    row.dataset.state = item.key;
    const term = document.createElement("dt");
    term.textContent = item.label;
    const detail = document.createElement("dd");
    detail.textContent = item.description;
    row.append(term, detail);
    readiness.append(row);
  }
  preview.append(header, launchMeta, description, comment, readiness);
  elements.productHuntPreviewSurface.append(preview);
}

function renderProductHuntPreview() {
  if (!elements.productHuntPreviewWorkbench) return;
  const spec = previewSpecForChannel("productHunt");
  const isProductHunt = state.phase === "success"
    && state.activeDraft === "productHunt"
    && spec?.inputMode === "publish_fields";
  elements.productHuntPreviewWorkbench.hidden = !isProductHunt;
  if (!isProductHunt) {
    elements.productHuntPreviewPanel.hidden = true;
    return;
  }

  const previewMode = state.productHuntPreviewMode === "preview";
  elements.productHuntEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.productHuntEditorView.tabIndex = previewMode ? -1 : 0;
  elements.productHuntPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.productHuntPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.productHuntPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "product-hunt-editor-view");

  const model = currentProductHuntPreviewModel();
  elements.productHuntPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.productHuntPreviewStatus.dataset.state = model.status.key;
  elements.productHuntPreviewFrame.dataset.viewport = state.productHuntPreviewViewport;
  elements.productHuntPreviewDesktop.setAttribute("aria-pressed", String(state.productHuntPreviewViewport === "desktop"));
  elements.productHuntPreviewMobile.setAttribute("aria-pressed", String(state.productHuntPreviewViewport === "mobile"));
  elements.productHuntPreviewIssues.hidden = model.issues.length === 0;
  elements.productHuntPreviewIssues.replaceChildren();
  for (const issue of model.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.productHuntPreviewIssues.append(row);
  }
  elements.productHuntPreviewSurface.replaceChildren();
  elements.productHuntPreviewEmpty.hidden = model.status.key !== "empty";
  elements.productHuntPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendProductHuntPreview(model);
  elements.productHuntPreviewNotice.textContent = `${model.notice} 외부 Product Hunt 요청·등록 ${model.externalWriteCount}회.`;
}

function selectProductHuntPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "productHunt") return;
  state.productHuntPreviewMode = mode === "preview" ? "preview" : "editor";
  renderProductHuntPreview();
  if (focus) (state.productHuntPreviewMode === "preview" ? elements.productHuntPreviewView : elements.productHuntEditorView).focus();
}

function currentPeerlistPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  const readiness = activePlatformReadinessRecord("peerlist");
  return createPeerlistPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    publicHandle: readiness?.account?.handle ?? "",
    operationInputs: currentOperationInputs("peerlist"),
  });
}

function appendPeerlistPreview(model) {
  const preview = document.createElement("article");
  preview.className = "peerlist-draft-preview";

  const header = document.createElement("header");
  header.className = "peerlist-draft-header";
  const cover = document.createElement("div");
  cover.className = "peerlist-draft-cover";
  cover.setAttribute("aria-hidden", "true");
  const coverMark = document.createElement("span");
  coverMark.textContent = "COVER";
  const coverState = document.createElement("strong");
  coverState.textContent = model.launch.items.some((item) => item.key === "cover_reference_recorded") ? "CHECKED" : "TO PREPARE";
  cover.append(coverMark, coverState);
  const titleGroup = document.createElement("div");
  titleGroup.className = "peerlist-draft-title-group";
  const localLabel = document.createElement("span");
  localLabel.textContent = "LOCAL LAUNCHPAD REVIEW";
  const name = document.createElement("h5");
  name.dir = "auto";
  name.textContent = model.content.name || "프로젝트명을 입력하면 launch field 읽기 순서를 확인할 수 있습니다.";
  if (!model.content.name) name.dataset.empty = "true";
  const tagline = document.createElement("p");
  tagline.className = "peerlist-draft-tagline";
  tagline.dir = "auto";
  tagline.textContent = model.content.tagline || "태그라인을 입력하세요.";
  if (!model.content.tagline) tagline.dataset.empty = "true";
  titleGroup.append(localLabel, name, tagline);
  header.append(cover, titleGroup);

  const launchMeta = document.createElement("dl");
  launchMeta.className = "peerlist-draft-meta";
  const day = model.launch.items.find((item) => item.key.startsWith("launch_day"));
  const metaValues = [
    ["DEMO CANDIDATE", model.launch.demoUrl || "직접 확인 필요"],
    ["MAKER HANDLE", model.identity.handle],
    ["LAUNCH DAY", day?.key === "launch_day_confirmed" ? "CHECKED" : "TO CONFIRM"],
  ];
  for (const [label, value] of metaValues) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.dir = "auto";
    detail.textContent = value;
    row.append(term, detail);
    launchMeta.append(row);
  }

  const comment = document.createElement("section");
  comment.className = "peerlist-draft-comment";
  const commentLabel = document.createElement("span");
  commentLabel.textContent = "MAKER COMMENT · LOCAL DRAFT";
  const commentBody = document.createElement("p");
  commentBody.dir = "auto";
  commentBody.textContent = model.content.comment || "Maker 댓글을 입력하면 공개 전 문맥을 검토할 수 있습니다.";
  if (!model.content.comment) commentBody.dataset.empty = "true";
  comment.append(commentLabel, commentBody);

  const readiness = document.createElement("dl");
  readiness.className = "peerlist-draft-readiness";
  for (const item of model.launch.items) {
    const row = document.createElement("div");
    row.dataset.state = item.key;
    const term = document.createElement("dt");
    term.textContent = item.label;
    const detail = document.createElement("dd");
    detail.textContent = item.description;
    row.append(term, detail);
    readiness.append(row);
  }
  preview.append(header, launchMeta, comment, readiness);
  elements.peerlistPreviewSurface.append(preview);
}

function renderPeerlistPreview() {
  if (!elements.peerlistPreviewWorkbench) return;
  const spec = previewSpecForChannel("peerlist");
  const isPeerlist = state.phase === "success"
    && state.activeDraft === "peerlist"
    && spec?.inputMode === "publish_fields";
  elements.peerlistPreviewWorkbench.hidden = !isPeerlist;
  if (!isPeerlist) {
    elements.peerlistPreviewPanel.hidden = true;
    return;
  }

  const previewMode = state.peerlistPreviewMode === "preview";
  elements.peerlistEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.peerlistEditorView.tabIndex = previewMode ? -1 : 0;
  elements.peerlistPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.peerlistPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.peerlistPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "peerlist-editor-view");

  const model = currentPeerlistPreviewModel();
  elements.peerlistPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.peerlistPreviewStatus.dataset.state = model.status.key;
  elements.peerlistPreviewFrame.dataset.viewport = state.peerlistPreviewViewport;
  elements.peerlistPreviewDesktop.setAttribute("aria-pressed", String(state.peerlistPreviewViewport === "desktop"));
  elements.peerlistPreviewMobile.setAttribute("aria-pressed", String(state.peerlistPreviewViewport === "mobile"));
  elements.peerlistPreviewIssues.hidden = model.issues.length === 0;
  elements.peerlistPreviewIssues.replaceChildren();
  for (const issue of model.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.peerlistPreviewIssues.append(row);
  }
  elements.peerlistPreviewSurface.replaceChildren();
  elements.peerlistPreviewEmpty.hidden = model.status.key !== "empty";
  elements.peerlistPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendPeerlistPreview(model);
  elements.peerlistPreviewNotice.textContent = `${model.notice} 외부 Peerlist 요청·등록 ${model.externalWriteCount}회.`;
}

function selectPeerlistPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "peerlist") return;
  state.peerlistPreviewMode = mode === "preview" ? "preview" : "editor";
  renderPeerlistPreview();
  if (focus) (state.peerlistPreviewMode === "preview" ? elements.peerlistPreviewView : elements.peerlistEditorView).focus();
}

function currentDisquietPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  return createDisquietPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    campaignBrief: currentCampaignBrief("disquiet"),
    operationInputs: currentOperationInputs("disquiet"),
  });
}

function appendDisquietPreview(model) {
  const preview = document.createElement("article");
  preview.className = "disquiet-draft-preview";

  const product = document.createElement("section");
  product.className = "disquiet-draft-product";
  const productEyebrow = document.createElement("p");
  productEyebrow.className = "disquiet-draft-eyebrow";
  productEyebrow.textContent = "PRODUCT · LOCAL RECORD";
  const title = document.createElement("h5");
  title.dir = "auto";
  title.textContent = model.content.productName || "제품명을 입력하면 제품 우선 읽기 순서를 확인할 수 있습니다.";
  if (!model.content.productName) title.dataset.empty = "true";
  const tagline = document.createElement("p");
  tagline.className = "disquiet-draft-tagline";
  tagline.dir = "auto";
  tagline.textContent = model.content.tagline || "태그라인을 입력하세요.";
  if (!model.content.tagline) tagline.dataset.empty = "true";
  const link = document.createElement("p");
  link.className = "disquiet-draft-link";
  link.dir = "auto";
  link.textContent = model.content.productLink || "공개 제품 링크 확인 필요";
  if (!model.content.productLink) link.dataset.empty = "true";
  product.append(productEyebrow, title, tagline, link);

  const post = document.createElement("section");
  post.className = "disquiet-draft-post";
  const postHeading = document.createElement("div");
  postHeading.className = "disquiet-draft-post-heading";
  const postLabel = document.createElement("span");
  postLabel.textContent = "CONNECTED POST · LOCAL DRAFT";
  const productState = document.createElement("span");
  productState.dataset.state = model.product.ready ? "ready" : "pending";
  productState.textContent = model.product.ready ? "PRODUCT CHECKED" : "PRODUCT CHECK REQUIRED";
  postHeading.append(postLabel, productState);
  const postBody = document.createElement("p");
  postBody.dir = "auto";
  postBody.textContent = model.content.postBody || "연결 포스트를 입력하면 제품 소개와 분리된 본문 읽기 흐름을 검토할 수 있습니다.";
  if (!model.content.postBody) postBody.dataset.empty = "true";
  post.append(postHeading, postBody);

  const readiness = document.createElement("dl");
  readiness.className = "disquiet-draft-readiness";
  for (const item of model.product.items) {
    const row = document.createElement("div");
    row.dataset.state = item.key;
    const term = document.createElement("dt");
    term.textContent = item.label;
    const detail = document.createElement("dd");
    detail.textContent = item.description;
    row.append(term, detail);
    readiness.append(row);
  }
  preview.append(product, post, readiness);
  elements.disquietPreviewSurface.append(preview);
}

function renderDisquietPreview() {
  if (!elements.disquietPreviewWorkbench) return;
  const spec = previewSpecForChannel("disquiet");
  const isDisquiet = state.phase === "success"
    && state.activeDraft === "disquiet"
    && spec?.inputMode === "publish_fields";
  elements.disquietPreviewWorkbench.hidden = !isDisquiet;
  if (!isDisquiet) {
    elements.disquietPreviewPanel.hidden = true;
    return;
  }

  const previewMode = state.disquietPreviewMode === "preview";
  elements.disquietEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.disquietEditorView.tabIndex = previewMode ? -1 : 0;
  elements.disquietPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.disquietPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.disquietPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "disquiet-editor-view");

  const model = currentDisquietPreviewModel();
  elements.disquietPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.disquietPreviewStatus.dataset.state = model.status.key;
  elements.disquietPreviewFrame.dataset.viewport = state.disquietPreviewViewport;
  elements.disquietPreviewDesktop.setAttribute("aria-pressed", String(state.disquietPreviewViewport === "desktop"));
  elements.disquietPreviewMobile.setAttribute("aria-pressed", String(state.disquietPreviewViewport === "mobile"));
  elements.disquietPreviewIssues.hidden = model.issues.length === 0;
  elements.disquietPreviewIssues.replaceChildren();
  for (const issue of model.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.disquietPreviewIssues.append(row);
  }
  elements.disquietPreviewSurface.replaceChildren();
  elements.disquietPreviewEmpty.hidden = model.status.key !== "empty";
  elements.disquietPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendDisquietPreview(model);
  elements.disquietPreviewNotice.textContent = `${model.notice} 외부 Disquiet 요청·등록 ${model.externalWriteCount}회.`;
}

function selectDisquietPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "disquiet") return;
  state.disquietPreviewMode = mode === "preview" ? "preview" : "editor";
  renderDisquietPreview();
  if (focus) (state.disquietPreviewMode === "preview" ? elements.disquietPreviewView : elements.disquietEditorView).focus();
}

function currentRedditPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  return createRedditPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    authorInputs: currentAuthorInputs("reddit"),
    operationInputs: currentOperationInputs("reddit"),
    brief: state.redditBrief,
  });
}

function syncRedditBriefInputs() {
  if (!elements.redditBriefForm) return;
  if (elements.redditPostTypeInput.value !== state.redditBrief.postType) elements.redditPostTypeInput.value = state.redditBrief.postType;
  if (elements.redditTitleInput.value !== state.redditBrief.title) elements.redditTitleInput.value = state.redditBrief.title;
  if (elements.redditBodyInput.value !== state.redditBrief.body) elements.redditBodyInput.value = state.redditBrief.body;
  elements.redditNsfwInput.checked = state.redditBrief.nsfw;
  elements.redditSpoilerInput.checked = state.redditBrief.spoiler;
}

function appendRedditPreview(model) {
  const preview = document.createElement("article");
  preview.className = "reddit-draft-preview";

  const header = document.createElement("header");
  header.className = "reddit-draft-header";
  const eyebrow = document.createElement("p");
  eyebrow.className = "reddit-draft-eyebrow";
  eyebrow.textContent = "COMMUNITY SUBMISSION · LOCAL STRUCTURE REVIEW";
  const community = document.createElement("p");
  community.className = "reddit-draft-community";
  community.dir = "auto";
  community.textContent = model.community.community || "대상 community를 직접 입력하고 확인하세요.";
  if (!model.community.community) community.dataset.empty = "true";
  const flags = document.createElement("p");
  flags.className = "reddit-draft-flags";
  const postType = model.manualDraft.postType === "unconfirmed" ? "POST TYPE · TO CONFIRM" : `POST TYPE · ${model.manualDraft.postType.toUpperCase()}`;
  flags.textContent = [postType, model.manualDraft.nsfw ? "NSFW · CHECKED" : "NSFW · NOT SET", model.manualDraft.spoiler ? "SPOILER · CHECKED" : "SPOILER · NOT SET"].join("  /  ");
  header.append(eyebrow, community, flags);

  const draft = document.createElement("section");
  draft.className = "reddit-draft-copy";
  const titleLabel = document.createElement("span");
  titleLabel.textContent = "DIRECT AUTHOR DRAFT · TITLE";
  const title = document.createElement("h5");
  title.dir = "auto";
  title.textContent = model.manualDraft.title || "제목은 작성자가 직접 입력합니다. 참고 자료로 자동 생성하지 않습니다.";
  if (!model.manualDraft.title) title.dataset.empty = "true";
  const body = document.createElement("p");
  body.dir = "auto";
  body.textContent = model.manualDraft.body || "본문은 작성자가 직접 입력합니다. community 규칙과 사실 자료를 확인한 뒤 검토하세요.";
  if (!model.manualDraft.body) body.dataset.empty = "true";
  draft.append(titleLabel, title, body);

  const facts = document.createElement("details");
  facts.className = "reddit-draft-facts";
  const summary = document.createElement("summary");
  summary.textContent = "VERIFIED FACTS · REFERENCE ONLY · NOT A POST";
  const factText = document.createElement("p");
  factText.dir = "auto";
  factText.textContent = model.facts.facts || "검증된 사실 자료가 없습니다.";
  facts.append(summary, factText);

  const readiness = document.createElement("dl");
  readiness.className = "reddit-draft-readiness";
  for (const item of model.community.items) {
    const row = document.createElement("div");
    row.dataset.state = item.key;
    const term = document.createElement("dt");
    term.textContent = item.label;
    const detail = document.createElement("dd");
    detail.dir = "auto";
    detail.textContent = item.description;
    row.append(term, detail);
    readiness.append(row);
  }
  preview.append(header, draft, facts, readiness);
  elements.redditPreviewSurface.append(preview);
}

function renderRedditPreview() {
  if (!elements.redditPreviewWorkbench) return;
  const spec = previewSpecForChannel("reddit");
  const isReddit = state.phase === "success"
    && state.activeDraft === "reddit"
    && spec?.inputMode === "reference_only";
  elements.redditPreviewWorkbench.hidden = !isReddit;
  if (!isReddit) {
    elements.redditPreviewPanel.hidden = true;
    return;
  }

  const previewMode = state.redditPreviewMode === "preview";
  elements.redditEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.redditEditorView.tabIndex = previewMode ? -1 : 0;
  elements.redditPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.redditPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.redditPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "reddit-editor-view");

  syncRedditBriefInputs();
  const model = currentRedditPreviewModel();
  elements.redditPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.redditPreviewStatus.dataset.state = model.status.key;
  elements.redditPreviewFrame.dataset.viewport = state.redditPreviewViewport;
  elements.redditPreviewDesktop.setAttribute("aria-pressed", String(state.redditPreviewViewport === "desktop"));
  elements.redditPreviewMobile.setAttribute("aria-pressed", String(state.redditPreviewViewport === "mobile"));
  elements.redditPreviewIssues.hidden = model.issues.length === 0;
  elements.redditPreviewIssues.replaceChildren();
  for (const issue of model.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.redditPreviewIssues.append(row);
  }
  elements.redditPreviewSurface.replaceChildren();
  elements.redditPreviewEmpty.hidden = model.status.key !== "empty";
  elements.redditPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendRedditPreview(model);
  elements.redditPreviewNotice.textContent = `${model.notice} 외부 Reddit 요청·제출 ${model.externalWriteCount}회.`;
}

function selectRedditPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "reddit") return;
  state.redditPreviewMode = mode === "preview" ? "preview" : "editor";
  renderRedditPreview();
  if (focus) (state.redditPreviewMode === "preview" ? elements.redditPreviewView : elements.redditEditorView).focus();
}

function updateRedditBrief(next) {
  state.redditBrief = { ...state.redditBrief, ...next };
  renderRedditPreview();
}

function currentIndieHackersPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  return createIndieHackersPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    authorInputs: currentAuthorInputs("indieHackers"),
    campaignBrief: currentCampaignBrief("indieHackers"),
  });
}

function appendIndieHackersPreview(model) {
  const preview = document.createElement("article");
  preview.className = "indie-hackers-draft-preview";
  const header = document.createElement("header");
  header.className = "indie-hackers-draft-header";
  const eyebrow = document.createElement("p");
  eyebrow.textContent = "FOUNDER DISCUSSION · LOCAL REVIEW";
  const title = document.createElement("h5");
  title.dir = "auto";
  title.textContent = model.content.title || "제목이 비어 있습니다.";
  if (!model.content.title) title.dataset.empty = "true";
  const metrics = document.createElement("p");
  metrics.className = "indie-hackers-draft-metrics";
  metrics.textContent = `${model.content.characterCount}자 · ${model.content.question ? "QUESTION PRESENT" : "QUESTION TO ADD"}`;
  header.append(eyebrow, title, metrics);

  const body = document.createElement("section");
  body.className = "indie-hackers-draft-body";
  const bodyLabel = document.createElement("span");
  bodyLabel.textContent = "DRAFT · PROBLEM / LEARNING / QUESTION";
  const text = document.createElement("p");
  text.dir = "auto";
  text.textContent = model.content.body || "본문이 비어 있습니다. 실제 제작 경험과 독자가 답할 질문을 직접 작성하세요.";
  if (!model.content.body) text.dataset.empty = "true";
  body.append(bodyLabel, text);

  const experience = document.createElement("dl");
  experience.className = "indie-hackers-draft-experience";
  for (const item of model.experience.items) {
    const row = document.createElement("div");
    row.dataset.state = item.key;
    const term = document.createElement("dt");
    term.textContent = item.label;
    const detail = document.createElement("dd");
    detail.dir = "auto";
    detail.textContent = item.description;
    row.append(term, detail);
    experience.append(row);
  }
  preview.append(header, body, experience);
  elements.indieHackersPreviewSurface.append(preview);
}

function renderIndieHackersPreview() {
  if (!elements.indieHackersPreviewWorkbench) return;
  const spec = previewSpecForChannel("indieHackers");
  const visible = state.phase === "success" && state.activeDraft === "indieHackers" && spec?.inputMode === "publish_fields";
  elements.indieHackersPreviewWorkbench.hidden = !visible;
  if (!visible) {
    elements.indieHackersPreviewPanel.hidden = true;
    return;
  }
  const previewMode = state.indieHackersPreviewMode === "preview";
  elements.indieHackersEditorView.setAttribute("aria-selected", String(!previewMode));
  elements.indieHackersEditorView.tabIndex = previewMode ? -1 : 0;
  elements.indieHackersPreviewView.setAttribute("aria-selected", String(previewMode));
  elements.indieHackersPreviewView.tabIndex = previewMode ? 0 : -1;
  elements.compareEditors.hidden = previewMode;
  elements.editorHelp.hidden = previewMode;
  elements.indieHackersPreviewPanel.hidden = !previewMode;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "indie-hackers-editor-view");
  const model = currentIndieHackersPreviewModel();
  elements.indieHackersPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.indieHackersPreviewStatus.dataset.state = model.status.key;
  elements.indieHackersPreviewFrame.dataset.viewport = state.indieHackersPreviewViewport;
  elements.indieHackersPreviewDesktop.setAttribute("aria-pressed", String(state.indieHackersPreviewViewport === "desktop"));
  elements.indieHackersPreviewMobile.setAttribute("aria-pressed", String(state.indieHackersPreviewViewport === "mobile"));
  elements.indieHackersPreviewIssues.hidden = model.issues.length === 0;
  elements.indieHackersPreviewIssues.replaceChildren();
  for (const issue of model.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.indieHackersPreviewIssues.append(row);
  }
  elements.indieHackersPreviewSurface.replaceChildren();
  elements.indieHackersPreviewEmpty.hidden = model.status.key !== "empty";
  elements.indieHackersPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendIndieHackersPreview(model);
  elements.indieHackersPreviewNotice.textContent = `${model.notice} 외부 Indie Hackers 요청·등록 ${model.externalWriteCount}회.`;
}

function selectIndieHackersPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "indieHackers") return;
  state.indieHackersPreviewMode = mode === "preview" ? "preview" : "editor";
  renderIndieHackersPreview();
  if (focus) (state.indieHackersPreviewMode === "preview" ? elements.indieHackersPreviewView : elements.indieHackersEditorView).focus();
}

function currentTikTokPreviewModel() {
  return createTikTokPreviewModel({ brief: state.tiktokBrief });
}

function renderDevPreview() {
  if (!elements.devPreviewWorkbench) return;
  const visible = state.phase === "success" && state.activeDraft === "dev" && previewSpecForChannel("dev")?.inputMode === "reference_only";
  elements.devPreviewWorkbench.hidden = !visible;
  if (!visible) { elements.devPreviewPanel.hidden = true; return; }
  const preview = state.devPreviewMode === "preview";
  elements.devEditorView.setAttribute("aria-selected", String(!preview)); elements.devPreviewView.setAttribute("aria-selected", String(preview));
  elements.compareEditors.hidden = preview; elements.editorHelp.hidden = preview; elements.devPreviewPanel.hidden = !preview;
  const entry = localeEntry(state.activeLocale);
  const model = createDevPreviewModel({ publishFields: entry?.publishFields ?? {}, locale: state.activeLocale, localeAvailable: Boolean(entry?.publishFields), localeStale: Boolean(entry?.stale), approvalStatus: currentApprovalAssessment().status, authorInputs: currentAuthorInputs("dev"), brief: state.devBrief });
  for (const [element, key] of [[elements.devTitleInput,"title"],[elements.devBodyInput,"body"],[elements.devTagsInput,"tags"],[elements.devDisclosureInput,"disclosure"]]) if (document.activeElement !== element) element.value = state.devBrief[key];
  elements.devPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`; elements.devPreviewIssues.hidden = !model.issues.length; elements.devPreviewIssues.replaceChildren();
  for (const issue of model.issues) { const li=document.createElement("li"); li.textContent=issue.message; elements.devPreviewIssues.append(li); }
  elements.devPreviewSurface.replaceChildren(); if (model.status.key !== "empty") { const article=document.createElement("article"); article.className="dev-article-proof"; const head=document.createElement("header"); const meta=document.createElement("p"); meta.textContent="HUMAN DRAFT · TECHNICAL ARTICLE"; const title=document.createElement("h5"); title.textContent=model.article.title || "작성자 직접 제목 필요"; head.append(meta,title); const body=document.createElement("section"); const text=document.createElement("p"); text.textContent=model.article.body || "실제 사례·코드·실패를 포함한 본문을 직접 작성하세요."; body.append(text); const checks=document.createElement("dl"); for (const item of model.checks) { const dt=document.createElement("dt"),dd=document.createElement("dd"); dt.textContent=item.label; dd.textContent=item.value || "직접 입력 필요"; checks.append(dt,dd); } article.append(head,body,checks); elements.devPreviewSurface.append(article); }
  elements.devPreviewNotice.textContent=`${model.notice} 외부 DEV 요청·게시 ${model.externalWriteCount}회.`;
}
function selectDevPreview(mode, { focus = false } = {}) { if (state.activeDraft !== "dev") return; state.devPreviewMode=mode === "preview" ? "preview" : "editor"; renderDevPreview(); if (focus) (state.devPreviewMode === "preview" ? elements.devPreviewView : elements.devEditorView).focus(); }

function currentOkkyPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  return createOkkyPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    operationInputs: currentOperationInputs("okky"),
    brief: state.okkyBrief,
  });
}

function appendOkkyPreview(model) {
  const preview = document.createElement("article");
  preview.className = "okky-draft-preview";
  const header = document.createElement("header");
  header.className = "okky-draft-header";
  const eyebrow = document.createElement("p");
  eyebrow.textContent = "KOREAN DEVELOPER COMMUNITY · LOCAL REVIEW";
  const context = document.createElement("p");
  context.className = "okky-draft-context";
  context.textContent = `POST CONTEXT · ${model.context.label}`;
  header.append(eyebrow, context);

  const draft = document.createElement("section");
  draft.className = "okky-draft-copy";
  const title = document.createElement("h5");
  title.dir = "auto";
  title.textContent = model.content.title || "제목이 비어 있습니다.";
  if (!model.content.title) title.dataset.empty = "true";
  const meta = document.createElement("p");
  meta.className = "okky-draft-metrics";
  meta.textContent = `${model.content.characterCount}자 · ${model.content.asksForFeedback ? "FEEDBACK QUESTION PRESENT" : "FEEDBACK QUESTION TO ADD"}`;
  const body = document.createElement("p");
  body.dir = "auto";
  body.textContent = model.content.body || "본문이 비어 있습니다. 개발 경험·현재 한계와 한 가지 피드백 질문을 직접 확인하세요.";
  if (!model.content.body) body.dataset.empty = "true";
  draft.append(title, meta, body);

  const gates = document.createElement("dl");
  gates.className = "okky-draft-gates";
  for (const item of model.context.items) {
    const row = document.createElement("div");
    row.dataset.state = item.key;
    const term = document.createElement("dt");
    term.textContent = item.label;
    const detail = document.createElement("dd");
    detail.dir = "auto";
    detail.textContent = item.description;
    row.append(term, detail);
    gates.append(row);
  }
  preview.append(header, draft, gates);
  elements.okkyPreviewSurface.append(preview);
}

function renderOkkyPreview() {
  if (!elements.okkyPreviewWorkbench) return;
  const spec = previewSpecForChannel("okky");
  const visible = state.phase === "success" && state.activeDraft === "okky" && spec?.inputMode === "publish_fields";
  elements.okkyPreviewWorkbench.hidden = !visible;
  if (!visible) {
    elements.okkyPreviewPanel.hidden = true;
    return;
  }
  const preview = state.okkyPreviewMode === "preview";
  elements.okkyEditorView.setAttribute("aria-selected", String(!preview));
  elements.okkyEditorView.tabIndex = preview ? -1 : 0;
  elements.okkyPreviewView.setAttribute("aria-selected", String(preview));
  elements.okkyPreviewView.tabIndex = preview ? 0 : -1;
  elements.compareEditors.hidden = preview;
  elements.editorHelp.hidden = preview;
  elements.okkyPreviewPanel.hidden = !preview;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "okky-editor-view");
  if (elements.okkyContextInput.value !== state.okkyBrief.context) elements.okkyContextInput.value = state.okkyBrief.context;
  const model = currentOkkyPreviewModel();
  elements.okkyPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.okkyPreviewStatus.dataset.state = model.status.key;
  elements.okkyPreviewFrame.dataset.viewport = state.okkyPreviewViewport;
  elements.okkyPreviewDesktop.setAttribute("aria-pressed", String(state.okkyPreviewViewport === "desktop"));
  elements.okkyPreviewMobile.setAttribute("aria-pressed", String(state.okkyPreviewViewport === "mobile"));
  elements.okkyPreviewIssues.hidden = model.issues.length === 0;
  elements.okkyPreviewIssues.replaceChildren();
  for (const issue of model.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.okkyPreviewIssues.append(row);
  }
  elements.okkyPreviewSurface.replaceChildren();
  elements.okkyPreviewEmpty.hidden = model.status.key !== "empty";
  elements.okkyPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendOkkyPreview(model);
  elements.okkyPreviewNotice.textContent = `${model.notice} 외부 OKKY 요청·제출 ${model.externalWriteCount}회.`;
}

function selectOkkyPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "okky") return;
  state.okkyPreviewMode = mode === "preview" ? "preview" : "editor";
  renderOkkyPreview();
  if (focus) (state.okkyPreviewMode === "preview" ? elements.okkyPreviewView : elements.okkyEditorView).focus();
}

function currentGeekNewsPreviewModel() {
  const entry = localeEntry(state.activeLocale);
  return createGeekNewsPreviewModel({
    publishFields: entry?.publishFields ?? {},
    locale: state.activeLocale,
    localeAvailable: Boolean(entry?.publishFields),
    localeStale: Boolean(entry?.stale),
    approvalStatus: currentApprovalAssessment().status,
    sourceUrl: state.repository?.url ?? "",
    demoUrl: state.facts?.demoUrl ?? "",
    operationInputs: currentOperationInputs("geeknews"),
    preflight: state.preflight,
  });
}

function appendGeekNewsPreview(model) {
  const preview = document.createElement("article");
  preview.className = "geeknews-show-proof";

  const header = document.createElement("header");
  const eyebrow = document.createElement("p");
  eyebrow.textContent = "SHOW · LOCAL SUBMISSION REVIEW";
  const type = document.createElement("strong");
  type.textContent = "등록 유형 · SHOW";
  header.append(eyebrow, type);

  const copy = document.createElement("section");
  copy.className = "geeknews-show-copy";
  const title = document.createElement("h5");
  title.dir = "auto";
  title.textContent = model.content.title || "제목이 비어 있습니다.";
  if (!model.content.title) title.dataset.empty = "true";
  const meta = document.createElement("p");
  meta.className = "geeknews-show-metrics";
  meta.textContent = `${model.content.characterCount}자 · TITLE + DESCRIPTION`;
  const body = document.createElement("p");
  body.dir = "auto";
  body.textContent = model.content.body || "본문이 비어 있습니다. 직접 만든 작업, 구현 방식, 한계와 피드백 요청을 실제 내용으로 확인하세요.";
  if (!model.content.body) body.dataset.empty = "true";
  copy.append(title, meta, body);

  const readiness = document.createElement("dl");
  readiness.className = "geeknews-show-readiness";
  for (const item of model.readiness.entries) {
    const row = document.createElement("div");
    row.dataset.state = item.key;
    const term = document.createElement("dt");
    term.textContent = item.label;
    const detail = document.createElement("dd");
    detail.dir = "auto";
    detail.textContent = item.value || item.description;
    row.append(term, detail);
    readiness.append(row);
  }
  preview.append(header, copy, readiness);
  elements.geeknewsPreviewSurface.append(preview);
}

function renderGeekNewsPreview() {
  if (!elements.geeknewsPreviewWorkbench) return;
  const spec = previewSpecForChannel("geeknews");
  const visible = state.phase === "success" && state.activeDraft === "geeknews" && spec?.inputMode === "publish_fields";
  elements.geeknewsPreviewWorkbench.hidden = !visible;
  if (!visible) {
    elements.geeknewsPreviewPanel.hidden = true;
    return;
  }
  const preview = state.geeknewsPreviewMode === "preview";
  elements.geeknewsEditorView.setAttribute("aria-selected", String(!preview));
  elements.geeknewsEditorView.tabIndex = preview ? -1 : 0;
  elements.geeknewsPreviewView.setAttribute("aria-selected", String(preview));
  elements.geeknewsPreviewView.tabIndex = preview ? 0 : -1;
  elements.compareEditors.hidden = preview;
  elements.editorHelp.hidden = preview;
  elements.geeknewsPreviewPanel.hidden = !preview;
  elements.compareEditors.setAttribute("role", "tabpanel");
  elements.compareEditors.setAttribute("aria-labelledby", "geeknews-editor-view");
  const model = currentGeekNewsPreviewModel();
  elements.geeknewsPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.geeknewsPreviewStatus.dataset.state = model.status.key;
  elements.geeknewsPreviewFrame.dataset.viewport = state.geeknewsPreviewViewport;
  elements.geeknewsPreviewDesktop.setAttribute("aria-pressed", String(state.geeknewsPreviewViewport === "desktop"));
  elements.geeknewsPreviewMobile.setAttribute("aria-pressed", String(state.geeknewsPreviewViewport === "mobile"));
  elements.geeknewsPreviewIssues.hidden = model.issues.length === 0;
  elements.geeknewsPreviewIssues.replaceChildren();
  for (const issue of model.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.geeknewsPreviewIssues.append(row);
  }
  elements.geeknewsPreviewSurface.replaceChildren();
  elements.geeknewsPreviewEmpty.hidden = model.status.key !== "empty";
  elements.geeknewsPreviewEmpty.textContent = model.emptyMessage;
  if (model.status.key !== "empty") appendGeekNewsPreview(model);
  elements.geeknewsPreviewNotice.textContent = `${model.notice} 외부 GeekNews 요청·등록 ${model.externalWriteCount}회.`;
}

function selectGeekNewsPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "geeknews") return;
  state.geeknewsPreviewMode = mode === "preview" ? "preview" : "editor";
  renderGeekNewsPreview();
  if (focus) (state.geeknewsPreviewMode === "preview" ? elements.geeknewsPreviewView : elements.geeknewsEditorView).focus();
}

function currentShowHnPreviewModel() {
  return createShowHnPreviewModel({ brief: state.showHnBrief });
}

function syncShowHnBriefInputs() {
  const values = [
    [elements.showHnTitleInput, "title"],
    [elements.showHnBodyInput, "body"],
    [elements.showHnSourceInput, "sourceUrl"],
    [elements.showHnDemoInput, "demoUrl"],
  ];
  for (const [element, key] of values) {
    if (document.activeElement !== element) element.value = state.showHnBrief[key];
  }
  elements.showHnHandwrittenInput.checked = state.showHnBrief.handwrittenConfirmed;
  elements.showHnOwnershipInput.checked = state.showHnBrief.ownershipConfirmed;
}

function appendShowHnPreview(model) {
  const preview = document.createElement("article");
  preview.className = "show-hn-author-proof";
  const header = document.createElement("header");
  const label = document.createElement("p");
  label.textContent = "AUTHOR-WRITTEN TEXT · LOCAL REVIEW";
  const manual = document.createElement("strong");
  manual.textContent = "MANUAL SUBMISSION DRAFT";
  header.append(label, manual);

  const draft = document.createElement("section");
  draft.className = "show-hn-author-copy";
  const title = document.createElement("h5");
  title.dir = "auto";
  title.textContent = model.content.title || "직접 작성한 `Show HN:` 제목이 필요합니다.";
  if (!model.content.title) title.dataset.empty = "true";
  const meta = document.createElement("p");
  meta.className = "show-hn-author-metrics";
  meta.textContent = `${model.content.bodyLength}자 · BACKSTORY / WHAT / WHY / DIFFERENCE`;
  const body = document.createElement("p");
  body.dir = "auto";
  body.textContent = model.content.body || "작성자가 직접 만든 이유, 무엇을 만들었는지, 무엇이 다른지와 한계를 직접 작성하세요.";
  if (!model.content.body) body.dataset.empty = "true";
  draft.append(title, meta, body);

  const links = document.createElement("dl");
  links.className = "show-hn-author-links";
  for (const [labelText, value, fallback] of [
    ["SOURCE", model.content.sourceUrl, "원본 source URL 직접 입력 필요"],
    ["TRY IT", model.content.demoUrl, "가입 장벽 없는 demo URL 직접 입력 필요"],
  ]) {
    const row = document.createElement("div");
    row.dataset.state = value ? "recorded" : "required";
    const term = document.createElement("dt");
    term.textContent = labelText;
    const detail = document.createElement("dd");
    detail.dir = "auto";
    detail.textContent = value || fallback;
    row.append(term, detail);
    links.append(row);
  }

  const author = document.createElement("dl");
  author.className = "show-hn-author-gates";
  for (const item of model.author.items) {
    const row = document.createElement("div");
    row.dataset.state = item.key;
    const term = document.createElement("dt");
    term.textContent = item.label;
    const detail = document.createElement("dd");
    detail.textContent = item.description;
    row.append(term, detail);
    author.append(row);
  }
  preview.append(header, draft, links, author);
  elements.showHnPreviewSurface.append(preview);
}

function renderShowHnPreview() {
  if (!elements.showHnPreviewWorkbench) return;
  const spec = previewSpecForChannel("showHn");
  const visible = state.phase === "success" && state.activeDraft === "showHn" && spec?.inputMode === "manual_only";
  elements.showHnPreviewWorkbench.hidden = !visible;
  if (!visible) {
    elements.showHnAuthorPanel.hidden = true;
    elements.showHnPreviewPanel.hidden = true;
    return;
  }
  const preview = state.showHnPreviewMode === "preview";
  elements.showHnAuthorView.setAttribute("aria-selected", String(!preview));
  elements.showHnAuthorView.tabIndex = preview ? -1 : 0;
  elements.showHnPreviewView.setAttribute("aria-selected", String(preview));
  elements.showHnPreviewView.tabIndex = preview ? 0 : -1;
  elements.compareEditors.hidden = true;
  elements.editorHelp.hidden = true;
  elements.showHnAuthorPanel.hidden = preview;
  elements.showHnPreviewPanel.hidden = !preview;
  syncShowHnBriefInputs();
  const model = currentShowHnPreviewModel();
  elements.showHnPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.showHnPreviewStatus.dataset.state = model.status.key;
  elements.showHnPreviewFrame.dataset.viewport = state.showHnPreviewViewport;
  elements.showHnPreviewDesktop.setAttribute("aria-pressed", String(state.showHnPreviewViewport === "desktop"));
  elements.showHnPreviewMobile.setAttribute("aria-pressed", String(state.showHnPreviewViewport === "mobile"));
  elements.showHnPreviewIssues.hidden = model.issues.length === 0;
  elements.showHnPreviewIssues.replaceChildren();
  for (const issue of model.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.showHnPreviewIssues.append(row);
  }
  elements.showHnPreviewSurface.replaceChildren();
  appendShowHnPreview(model);
  elements.showHnPreviewNotice.textContent = `${model.notice} 외부 Hacker News 요청·제출 ${model.externalWriteCount}회.`;
}

function selectShowHnPreviewMode(mode, { focus = false } = {}) {
  if (state.activeDraft !== "showHn") return;
  state.showHnPreviewMode = mode === "preview" ? "preview" : "author";
  renderShowHnPreview();
  if (focus) (state.showHnPreviewMode === "preview" ? elements.showHnPreviewView : elements.showHnAuthorView).focus();
}

function updateShowHnBrief(next) {
  state.showHnBrief = { ...state.showHnBrief, ...next };
  renderShowHnPreview();
}

function appendTikTokPreview(model) {
  const preview = document.createElement("article");
  preview.className = "tiktok-draft-preview";

  const stage = document.createElement("section");
  stage.className = "tiktok-draft-stage";
  const topLine = document.createElement("div");
  topLine.className = "tiktok-draft-topline";
  const identity = document.createElement("span");
  identity.textContent = "@preview_creator";
  const localLabel = document.createElement("span");
  localLabel.textContent = "LOCAL VERTICAL REVIEW";
  topLine.append(identity, localLabel);

  const mediaCheck = document.createElement("div");
  mediaCheck.className = "tiktok-draft-media-check";
  const mediaMark = document.createElement("span");
  mediaMark.textContent = "MEDIA REVIEW";
  const mediaState = document.createElement("strong");
  mediaState.textContent = model.media.label;
  const mediaDescription = document.createElement("span");
  mediaDescription.textContent = model.media.description;
  mediaCheck.append(mediaMark, mediaState, mediaDescription);

  const cover = document.createElement("p");
  cover.className = "tiktok-draft-cover";
  cover.dir = "auto";
  cover.textContent = model.content.cover || "첫 화면 문구를 입력하면 세로 읽기 폭에서 줄바꿈을 확인할 수 있습니다.";
  if (!model.content.cover) cover.dataset.empty = "true";
  const coverCount = document.createElement("span");
  coverCount.className = "tiktok-draft-cover-count";
  coverCount.textContent = `${model.content.coverLength}자 · FIRST FRAME`;
  stage.append(topLine, mediaCheck, cover, coverCount);

  const captionSection = document.createElement("section");
  captionSection.className = "tiktok-draft-caption-section";
  const captionLabel = document.createElement("span");
  captionLabel.className = "tiktok-draft-caption-label";
  captionLabel.textContent = `CAPTION · ${model.content.captionLength}자`;
  const caption = document.createElement("p");
  caption.className = "tiktok-draft-caption";
  caption.dir = "auto";
  caption.textContent = model.content.caption || "직접 작성한 캡션을 입력하면 게시 전 줄바꿈을 확인할 수 있습니다.";
  if (!model.content.caption) caption.dataset.empty = "true";
  captionSection.append(captionLabel, caption);

  const readiness = document.createElement("dl");
  readiness.className = "tiktok-draft-readiness";
  for (const [labelText, value] of [["VISIBILITY", model.visibility], ["MEDIA", model.media]]) {
    const row = document.createElement("div");
    row.dataset.state = value.key;
    const label = document.createElement("dt");
    label.textContent = labelText;
    const detail = document.createElement("dd");
    detail.textContent = value.label;
    row.append(label, detail);
    readiness.append(row);
  }
  preview.append(stage, captionSection, readiness);
  elements.tiktokPreviewSurface.append(preview);
}

function syncTikTokBriefInputs() {
  if (document.activeElement !== elements.tiktokCaptionInput) elements.tiktokCaptionInput.value = state.tiktokBrief.caption;
  if (document.activeElement !== elements.tiktokCoverInput) elements.tiktokCoverInput.value = state.tiktokBrief.cover;
  if (document.activeElement !== elements.tiktokVisibilityInput) elements.tiktokVisibilityInput.value = state.tiktokBrief.visibility;
  elements.tiktokAssetReviewedInput.checked = state.tiktokBrief.assetReviewed;
  elements.tiktokWatermarkReviewedInput.checked = state.tiktokBrief.watermarkReviewed;
}

function renderTikTokPreview() {
  if (!elements.tiktokPreviewLab) return;
  const spec = previewSpecForPlatform("tiktok");
  const visible = state.phase === "success" && spec?.inputMode === "manual_brief";
  elements.tiktokPreviewLab.hidden = !visible;
  if (!visible) return;
  syncTikTokBriefInputs();
  const model = currentTikTokPreviewModel();
  elements.tiktokPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.tiktokPreviewStatus.dataset.state = model.status.key;
  elements.tiktokPreviewFrame.dataset.viewport = state.tiktokPreviewViewport;
  elements.tiktokPreviewDesktop.setAttribute("aria-pressed", String(state.tiktokPreviewViewport === "desktop"));
  elements.tiktokPreviewMobile.setAttribute("aria-pressed", String(state.tiktokPreviewViewport === "mobile"));
  elements.tiktokPreviewIssues.hidden = model.content.issues.length === 0;
  elements.tiktokPreviewIssues.replaceChildren();
  for (const issue of model.content.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.tiktokPreviewIssues.append(row);
  }
  elements.tiktokPreviewSurface.replaceChildren();
  appendTikTokPreview(model);
  elements.tiktokPreviewNotice.textContent = `${model.notice} 외부 TikTok 요청·게시 ${model.externalWriteCount}회.`;
}

function updateTikTokBrief(next) {
  state.tiktokBrief = { ...state.tiktokBrief, ...next };
  renderTikTokPreview();
}

function currentDiscordPreviewModel() {
  return createDiscordPreviewModel({ brief: state.discordBrief });
}

function appendDiscordPreview(model) {
  const preview = document.createElement("article");
  preview.className = "discord-draft-proof";

  const header = document.createElement("header");
  header.className = "discord-draft-proof-header";
  const label = document.createElement("p");
  label.textContent = "LOCAL MESSAGE REVIEW · NO SERVICE CONNECTION";
  const target = document.createElement("strong");
  target.dir = "auto";
  target.textContent = model.content.targetAlias ? `TARGET · ${model.content.targetAlias}` : "TARGET · 별칭 미입력";
  header.append(label, target);

  const message = document.createElement("section");
  message.className = "discord-draft-message";
  const metrics = document.createElement("p");
  metrics.className = "discord-draft-metrics";
  metrics.textContent = `${model.content.messageLength.toLocaleString("ko-KR")} / 2,000자 · 여유 ${Math.max(0, model.content.messageRemaining).toLocaleString("ko-KR")}`;
  const text = document.createElement("p");
  text.className = "discord-draft-message-text";
  text.dir = "auto";
  text.textContent = model.content.message || "직접 작성한 메시지를 입력하면 읽기 폭과 줄바꿈을 확인할 수 있습니다.";
  if (!model.content.message) text.dataset.empty = "true";
  message.append(metrics, text);

  const safety = document.createElement("dl");
  safety.className = "discord-draft-safety";
  const mentionRow = document.createElement("div");
  mentionRow.dataset.state = model.mentionSafety.candidates.length ? "review" : "none";
  const mentionTerm = document.createElement("dt");
  mentionTerm.textContent = "MENTION REVIEW";
  const mentionDetail = document.createElement("dd");
  mentionDetail.dir = "auto";
  const candidates = model.mentionSafety.candidates.length ? `후보: ${model.mentionSafety.candidates.join(", ")} · ` : "후보 없음 · ";
  mentionDetail.textContent = `${candidates}로컬 기본: 알림 대상 없음${model.mentionSafety.reviewed ? " · 직접 확인됨" : ""}`;
  mentionRow.append(mentionTerm, mentionDetail);
  safety.append(mentionRow);

  preview.append(header, message, safety);
  if (model.extra.entered) {
    const extra = document.createElement("section");
    extra.className = "discord-draft-extra";
    const extraLabel = document.createElement("p");
    extraLabel.textContent = "OPTIONAL CONTEXT · LOCAL ONLY";
    const extraTitle = document.createElement("strong");
    extraTitle.dir = "auto";
    extraTitle.textContent = model.extra.title || "추가 정보 제목 없음";
    const extraDescription = document.createElement("p");
    extraDescription.dir = "auto";
    extraDescription.textContent = model.extra.description || "추가 정보 설명 없음";
    const extraUrl = document.createElement("p");
    extraUrl.className = "discord-draft-extra-url";
    extraUrl.dir = "auto";
    extraUrl.textContent = model.extra.url || "공개 HTTPS 링크 미확인";
    extra.append(extraLabel, extraTitle, extraDescription, extraUrl);
    preview.append(extra);
  }
  elements.discordPreviewSurface.append(preview);
}

function syncDiscordBriefInputs() {
  const fields = [
    [elements.discordTargetAliasInput, "targetAlias"],
    [elements.discordMessageInput, "message"],
    [elements.discordEmbedTitleInput, "embedTitle"],
    [elements.discordEmbedDescriptionInput, "embedDescription"],
    [elements.discordEmbedUrlInput, "embedUrl"],
  ];
  for (const [element, key] of fields) {
    if (element && document.activeElement !== element) element.value = state.discordBrief[key];
  }
  if (elements.discordMentionReviewedInput) elements.discordMentionReviewedInput.checked = state.discordBrief.mentionReviewed;
}

function renderDiscordPreview() {
  if (!elements.discordPreviewLab) return;
  const spec = previewSpecForPlatform("discord");
  const visible = state.phase === "success" && spec?.inputMode === "manual_brief";
  elements.discordPreviewLab.hidden = !visible;
  if (!visible) return;
  syncDiscordBriefInputs();
  const model = currentDiscordPreviewModel();
  elements.discordPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.discordPreviewStatus.dataset.state = model.status.key;
  elements.discordPreviewFrame.dataset.viewport = state.discordPreviewViewport;
  elements.discordPreviewDesktop.setAttribute("aria-pressed", String(state.discordPreviewViewport === "desktop"));
  elements.discordPreviewMobile.setAttribute("aria-pressed", String(state.discordPreviewViewport === "mobile"));
  elements.discordPreviewIssues.hidden = model.content.issues.length === 0;
  elements.discordPreviewIssues.replaceChildren();
  for (const issue of model.content.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.discordPreviewIssues.append(row);
  }
  elements.discordPreviewSurface.replaceChildren();
  appendDiscordPreview(model);
  elements.discordPreviewNotice.textContent = `${model.notice} 외부 Discord 요청·전송 ${model.externalWriteCount}회.`;
}

function updateDiscordBrief(next) {
  state.discordBrief = { ...state.discordBrief, ...next };
  renderDiscordPreview();
}

function currentBlueskyPreviewModel() {
  return createBlueskyPreviewModel({ brief: state.blueskyBrief });
}

function appendBlueskyPreview(model) {
  const preview = document.createElement("article");
  preview.className = "bluesky-draft-proof";

  const header = document.createElement("header");
  header.className = "bluesky-draft-proof-header";
  const label = document.createElement("p");
  label.textContent = "SHORT TEXT PROOF · LOCAL REVIEW";
  const locale = document.createElement("strong");
  locale.textContent = model.locale.confirmed ? `LANG · ${model.locale.value}` : "LANG · 미선택";
  header.append(label, locale);

  const copy = document.createElement("section");
  copy.className = "bluesky-draft-copy";
  const metrics = document.createElement("p");
  metrics.className = "bluesky-draft-metrics";
  metrics.textContent = `${model.content.graphemeCount} / 300 grapheme · 여유 ${Math.max(0, model.content.graphemeRemaining)} · UTF-8 ${model.content.utf8Bytes} bytes`;
  const body = document.createElement("p");
  body.className = "bluesky-draft-body";
  body.dir = "auto";
  body.textContent = model.content.body || "직접 작성한 짧은 게시문을 입력하면 읽기 폭과 줄바꿈을 확인할 수 있습니다.";
  if (!model.content.body) body.dataset.empty = "true";
  copy.append(metrics, body);

  const facets = document.createElement("section");
  facets.className = "bluesky-draft-facets";
  const facetLabel = document.createElement("p");
  facetLabel.textContent = "LOCAL URL / @HANDLE CANDIDATES";
  const candidateList = document.createElement("ul");
  if (model.facets.candidates.length) {
    for (const item of model.facets.candidates) {
      const row = document.createElement("li");
      const kind = document.createElement("span");
      kind.textContent = item.kind.toUpperCase();
      const value = document.createElement("strong");
      value.dir = "auto";
      value.textContent = item.value;
      row.append(kind, value);
      candidateList.append(row);
    }
  } else {
    const row = document.createElement("li");
    row.dataset.empty = "true";
    row.textContent = "후보 없음 · 실제 게시 시 링크·mention 표시는 서비스가 결정합니다.";
    candidateList.append(row);
  }
  const facetNote = document.createElement("p");
  facetNote.className = "bluesky-draft-facet-note";
  facetNote.textContent = `${model.facets.reviewed ? "직접 확인 표시됨" : "직접 확인 필요"} · ${model.facets.description}`;
  facets.append(facetLabel, candidateList, facetNote);
  preview.append(header, copy, facets);
  elements.blueskyPreviewSurface.append(preview);
}

function syncBlueskyBriefInputs() {
  if (document.activeElement !== elements.blueskyLocaleInput) elements.blueskyLocaleInput.value = state.blueskyBrief.locale;
  if (document.activeElement !== elements.blueskyBodyInput) elements.blueskyBodyInput.value = state.blueskyBrief.body;
  if (elements.blueskyFacetsReviewedInput) elements.blueskyFacetsReviewedInput.checked = state.blueskyBrief.facetsReviewed;
}

function renderBlueskyPreview() {
  if (!elements.blueskyPreviewLab) return;
  const spec = previewSpecForPlatform("bluesky");
  const visible = state.phase === "success" && spec?.inputMode === "manual_brief";
  elements.blueskyPreviewLab.hidden = !visible;
  if (!visible) return;
  syncBlueskyBriefInputs();
  const model = currentBlueskyPreviewModel();
  elements.blueskyPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.blueskyPreviewStatus.dataset.state = model.status.key;
  elements.blueskyPreviewFrame.dataset.viewport = state.blueskyPreviewViewport;
  elements.blueskyPreviewDesktop.setAttribute("aria-pressed", String(state.blueskyPreviewViewport === "desktop"));
  elements.blueskyPreviewMobile.setAttribute("aria-pressed", String(state.blueskyPreviewViewport === "mobile"));
  elements.blueskyPreviewIssues.hidden = model.content.issues.length === 0;
  elements.blueskyPreviewIssues.replaceChildren();
  for (const issue of model.content.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.blueskyPreviewIssues.append(row);
  }
  elements.blueskyPreviewSurface.replaceChildren();
  appendBlueskyPreview(model);
  elements.blueskyPreviewNotice.textContent = `${model.notice} 외부 Bluesky 요청·게시 ${model.externalWriteCount}회.`;
}

function updateBlueskyBrief(next) {
  state.blueskyBrief = { ...state.blueskyBrief, ...next };
  renderBlueskyPreview();
}

function currentMastodonPreviewModel() {
  return createMastodonPreviewModel({ brief: state.mastodonBrief });
}

function appendMastodonPreview(model) {
  const preview = document.createElement("article");
  preview.className = "mastodon-draft-proof";

  const header = document.createElement("header");
  header.className = "mastodon-draft-proof-header";
  const label = document.createElement("p");
  label.textContent = "STATUS PROOF · LOCAL INSTANCE NOTE";
  const target = document.createElement("strong");
  target.dir = "auto";
  target.textContent = model.content.instanceAlias ? `INSTANCE · ${model.content.instanceAlias}` : "INSTANCE · 별칭 미입력";
  header.append(label, target);

  const context = document.createElement("dl");
  context.className = "mastodon-draft-context";
  const rows = [
    ["VISIBILITY", model.visibility.confirmed ? model.visibility.label : "공개 범위 미선택"],
    ["LIMIT NOTE", model.content.characterLimit === null ? "인스턴스 상한 미입력" : `${model.content.characterLimit.toLocaleString("ko-KR")}자 · 로컬 입력값`],
    ["URL RESERVE", model.content.links.length ? (model.content.urlReservedCharacters === null ? "URL 예약 문자 미입력" : `${model.content.urlReservedCharacters.toLocaleString("ko-KR")}자 · 로컬 입력값`) : "URL 없음 · 미적용"],
  ];
  for (const [termText, detailText] of rows) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = termText;
    const detail = document.createElement("dd");
    detail.dir = "auto";
    detail.textContent = detailText;
    row.append(term, detail);
    context.append(row);
  }

  const copy = document.createElement("section");
  copy.className = "mastodon-draft-copy";
  const metrics = document.createElement("p");
  metrics.className = "mastodon-draft-metrics";
  const expected = model.content.expectedCharacterCount.toLocaleString("ko-KR");
  const remaining = model.content.characterRemaining === null ? "상한 미입력" : `여유 ${Math.max(0, model.content.characterRemaining).toLocaleString("ko-KR")}`;
  metrics.textContent = `로컬 예상 ${expected}자 · 원문 ${model.content.rawCharacterCount.toLocaleString("ko-KR")}자 · ${remaining}`;
  if (model.content.contentWarning) {
    const warning = document.createElement("p");
    warning.className = "mastodon-draft-warning";
    warning.dir = "auto";
    warning.textContent = `CONTENT WARNING · ${model.content.contentWarning}`;
    copy.append(warning);
  }
  const body = document.createElement("p");
  body.className = "mastodon-draft-body";
  body.dir = "auto";
  body.textContent = model.content.body || "직접 작성한 status를 입력하면 읽기 폭과 입력한 인스턴스 상한을 함께 확인할 수 있습니다.";
  if (!model.content.body) body.dataset.empty = "true";
  copy.append(metrics, body);

  const notes = document.createElement("section");
  notes.className = "mastodon-draft-notes";
  const notesLabel = document.createElement("p");
  notesLabel.textContent = "LOCAL REVIEW NOTES";
  const noteList = document.createElement("ul");
  const noteRows = [
    model.content.links.length ? `URL ${model.content.links.length}개 · 실제 instance parser/shortening은 확인하지 않음` : "URL 없음 · 실제 instance parser는 확인하지 않음",
    model.checks.rulesReviewed ? "인스턴스 규칙·공개 범위 직접 확인 표시됨" : "인스턴스 규칙·공개 범위 직접 확인 필요",
    model.content.contentWarning ? (model.checks.contentWarningReviewed ? "content warning 표시 영향 직접 확인 표시됨" : "content warning 표시 영향 직접 확인 필요") : "content warning 없음",
  ];
  for (const text of noteRows) {
    const item = document.createElement("li");
    item.textContent = text;
    noteList.append(item);
  }
  notes.append(notesLabel, noteList);
  preview.append(header, context, copy, notes);
  elements.mastodonPreviewSurface.append(preview);
}

function syncMastodonBriefInputs() {
  const fields = [
    [elements.mastodonInstanceAliasInput, "instanceAlias"],
    [elements.mastodonCharacterLimitInput, "characterLimit"],
    [elements.mastodonUrlReservedInput, "urlReservedCharacters"],
    [elements.mastodonVisibilityInput, "visibility"],
    [elements.mastodonContentWarningInput, "contentWarning"],
    [elements.mastodonBodyInput, "body"],
  ];
  for (const [element, key] of fields) {
    if (element && document.activeElement !== element) element.value = state.mastodonBrief[key];
  }
  if (elements.mastodonRulesReviewedInput) elements.mastodonRulesReviewedInput.checked = state.mastodonBrief.rulesReviewed;
  if (elements.mastodonContentWarningReviewedInput) elements.mastodonContentWarningReviewedInput.checked = state.mastodonBrief.contentWarningReviewed;
}

function renderMastodonPreview() {
  if (!elements.mastodonPreviewLab) return;
  const spec = previewSpecForPlatform("mastodon");
  const visible = state.phase === "success" && spec?.inputMode === "manual_brief";
  elements.mastodonPreviewLab.hidden = !visible;
  if (!visible) return;
  syncMastodonBriefInputs();
  const model = currentMastodonPreviewModel();
  elements.mastodonPreviewStatus.textContent = `${model.status.label} · ${model.status.description}`;
  elements.mastodonPreviewStatus.dataset.state = model.status.key;
  elements.mastodonPreviewFrame.dataset.viewport = state.mastodonPreviewViewport;
  elements.mastodonPreviewDesktop.setAttribute("aria-pressed", String(state.mastodonPreviewViewport === "desktop"));
  elements.mastodonPreviewMobile.setAttribute("aria-pressed", String(state.mastodonPreviewViewport === "mobile"));
  elements.mastodonPreviewIssues.hidden = model.content.issues.length === 0;
  elements.mastodonPreviewIssues.replaceChildren();
  for (const issue of model.content.issues) {
    const row = document.createElement("li");
    row.dataset.code = issue.code;
    row.textContent = issue.message;
    elements.mastodonPreviewIssues.append(row);
  }
  elements.mastodonPreviewSurface.replaceChildren();
  appendMastodonPreview(model);
  elements.mastodonPreviewNotice.textContent = `${model.notice} 외부 Mastodon 요청·게시 ${model.externalWriteCount}회.`;
}

function updateMastodonBrief(next) {
  state.mastodonBrief = { ...state.mastodonBrief, ...next };
  renderMastodonPreview();
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

  for (const tab of elements.tabs) {
    const active = tab.dataset.draft === state.activeDraft;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) elements.draftPanel.setAttribute("aria-labelledby", tab.id);
  }
  renderThreadsPreview();
  renderXReview();
  renderLinkedInPreview();
  renderFacebookPreview();
  renderInstagramPreview();
  renderShortsPreview();
  renderProductHuntPreview();
  renderPeerlistPreview();
  renderDisquietPreview();
  renderRedditPreview();
  renderIndieHackersPreview();
  renderDevPreview();
  renderOkkyPreview();
  renderGeekNewsPreview();
  renderShowHnPreview();
  renderTikTokPreview();
  renderDiscordPreview();
  renderBlueskyPreview();
  renderMastodonPreview();
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
    state.tiktokBrief = { caption: "", cover: "", visibility: "unconfirmed", assetReviewed: false, watermarkReviewed: false };
    state.tiktokPreviewViewport = "desktop";
    state.discordBrief = { targetAlias: "", message: "", embedTitle: "", embedDescription: "", embedUrl: "", mentionReviewed: false };
    state.discordPreviewViewport = "desktop";
    state.blueskyBrief = { locale: "unconfirmed", body: "", facetsReviewed: false };
    state.blueskyPreviewViewport = "desktop";
    state.mastodonBrief = { instanceAlias: "", characterLimit: "", urlReservedCharacters: "", visibility: "unconfirmed", contentWarning: "", body: "", rulesReviewed: false, contentWarningReviewed: false };
    state.mastodonPreviewViewport = "desktop";
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

const xReviewViewButtons = [elements.xEditorView, elements.xReviewView];
for (const [index, button] of xReviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectXReviewMode(index === 1 ? "review" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % xReviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + xReviewViewButtons.length) % xReviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = xReviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectXReviewMode(next === 1 ? "review" : "editor", { focus: true });
  });
}

elements.xReviewDesktop?.addEventListener("click", () => {
  if (!X_REVIEW_KEYS.has(state.activeDraft)) return;
  state.xReviewViewport = "desktop";
  renderXReview();
});

elements.xReviewMobile?.addEventListener("click", () => {
  if (!X_REVIEW_KEYS.has(state.activeDraft)) return;
  state.xReviewViewport = "mobile";
  renderXReview();
});

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

const linkedinPreviewViewButtons = [elements.linkedinEditorView, elements.linkedinPreviewView];
for (const [index, button] of linkedinPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectLinkedInPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % linkedinPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + linkedinPreviewViewButtons.length) % linkedinPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = linkedinPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectLinkedInPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.linkedinPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "linkedin") return;
  state.linkedinPreviewViewport = "desktop";
  renderLinkedInPreview();
});

elements.linkedinPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "linkedin") return;
  state.linkedinPreviewViewport = "mobile";
  renderLinkedInPreview();
});

const facebookPreviewViewButtons = [elements.facebookEditorView, elements.facebookReelsView, elements.facebookGroupView];
for (const [index, button] of facebookPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectFacebookPreviewMode(["editor", "reels", "group"][index]));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % facebookPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + facebookPreviewViewButtons.length) % facebookPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = facebookPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectFacebookPreviewMode(["editor", "reels", "group"][next], { focus: true });
  });
}

elements.facebookPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "facebook") return;
  state.facebookPreviewViewport = "desktop";
  renderFacebookPreview();
});

elements.facebookPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "facebook") return;
  state.facebookPreviewViewport = "mobile";
  renderFacebookPreview();
});

const instagramPreviewViewButtons = [elements.instagramEditorView, elements.instagramPreviewView];
for (const [index, button] of instagramPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectInstagramPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % instagramPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + instagramPreviewViewButtons.length) % instagramPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = instagramPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectInstagramPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.instagramPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "instagram") return;
  state.instagramPreviewViewport = "desktop";
  renderInstagramPreview();
});

elements.instagramPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "instagram") return;
  state.instagramPreviewViewport = "mobile";
  renderInstagramPreview();
});

const shortsPreviewViewButtons = [elements.shortsEditorView, elements.shortsPreviewView];
for (const [index, button] of shortsPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectShortsPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % shortsPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + shortsPreviewViewButtons.length) % shortsPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = shortsPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectShortsPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.shortsPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "shorts") return;
  state.shortsPreviewViewport = "desktop";
  renderShortsPreview();
});

elements.shortsPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "shorts") return;
  state.shortsPreviewViewport = "mobile";
  renderShortsPreview();
});

const productHuntPreviewViewButtons = [elements.productHuntEditorView, elements.productHuntPreviewView];
for (const [index, button] of productHuntPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectProductHuntPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % productHuntPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + productHuntPreviewViewButtons.length) % productHuntPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = productHuntPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectProductHuntPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.productHuntPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "productHunt") return;
  state.productHuntPreviewViewport = "desktop";
  renderProductHuntPreview();
});

elements.productHuntPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "productHunt") return;
  state.productHuntPreviewViewport = "mobile";
  renderProductHuntPreview();
});

const peerlistPreviewViewButtons = [elements.peerlistEditorView, elements.peerlistPreviewView];
for (const [index, button] of peerlistPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectPeerlistPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % peerlistPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + peerlistPreviewViewButtons.length) % peerlistPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = peerlistPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectPeerlistPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.peerlistPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "peerlist") return;
  state.peerlistPreviewViewport = "desktop";
  renderPeerlistPreview();
});

elements.peerlistPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "peerlist") return;
  state.peerlistPreviewViewport = "mobile";
  renderPeerlistPreview();
});

const disquietPreviewViewButtons = [elements.disquietEditorView, elements.disquietPreviewView];
for (const [index, button] of disquietPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectDisquietPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % disquietPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + disquietPreviewViewButtons.length) % disquietPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = disquietPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectDisquietPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.disquietPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "disquiet") return;
  state.disquietPreviewViewport = "desktop";
  renderDisquietPreview();
});

elements.disquietPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "disquiet") return;
  state.disquietPreviewViewport = "mobile";
  renderDisquietPreview();
});

const redditPreviewViewButtons = [elements.redditEditorView, elements.redditPreviewView];
for (const [index, button] of redditPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectRedditPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % redditPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + redditPreviewViewButtons.length) % redditPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = redditPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectRedditPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.redditBriefForm?.addEventListener("submit", (event) => event.preventDefault());
elements.redditPostTypeInput?.addEventListener("change", () => updateRedditBrief({ postType: elements.redditPostTypeInput.value }));
elements.redditTitleInput?.addEventListener("input", () => updateRedditBrief({ title: elements.redditTitleInput.value }));
elements.redditBodyInput?.addEventListener("input", () => updateRedditBrief({ body: elements.redditBodyInput.value }));
elements.redditNsfwInput?.addEventListener("change", () => updateRedditBrief({ nsfw: elements.redditNsfwInput.checked }));
elements.redditSpoilerInput?.addEventListener("change", () => updateRedditBrief({ spoiler: elements.redditSpoilerInput.checked }));
elements.redditPreviewReset?.addEventListener("click", () => {
  state.redditBrief = { title: "", body: "", postType: "unconfirmed", nsfw: false, spoiler: false };
  renderRedditPreview();
  elements.redditTitleInput.focus();
});

elements.redditPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "reddit") return;
  state.redditPreviewViewport = "desktop";
  renderRedditPreview();
});

elements.redditPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "reddit") return;
  state.redditPreviewViewport = "mobile";
  renderRedditPreview();
});

const indieHackersPreviewViewButtons = [elements.indieHackersEditorView, elements.indieHackersPreviewView];
for (const [index, button] of indieHackersPreviewViewButtons.entries()) {
  button?.addEventListener("click", () => selectIndieHackersPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % indieHackersPreviewViewButtons.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + indieHackersPreviewViewButtons.length) % indieHackersPreviewViewButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = indieHackersPreviewViewButtons.length - 1;
    else return;
    event.preventDefault();
    selectIndieHackersPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}

elements.indieHackersPreviewDesktop?.addEventListener("click", () => {
  if (state.activeDraft !== "indieHackers") return;
  state.indieHackersPreviewViewport = "desktop";
  renderIndieHackersPreview();
});

elements.indieHackersPreviewMobile?.addEventListener("click", () => {
  if (state.activeDraft !== "indieHackers") return;
  state.indieHackersPreviewViewport = "mobile";
  renderIndieHackersPreview();
});

const devPreviewTabs = [elements.devEditorView, elements.devPreviewView];
for (const [index, button] of devPreviewTabs.entries()) {
  button?.addEventListener("click", () => selectDevPreview(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? devPreviewTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + devPreviewTabs.length) % devPreviewTabs.length;
    selectDevPreview(next === 1 ? "preview" : "editor", { focus: true });
  });
}
elements.devTitleInput?.addEventListener("input", () => { state.devBrief = { ...state.devBrief, title: elements.devTitleInput.value }; renderDevPreview(); });
elements.devBodyInput?.addEventListener("input", () => { state.devBrief = { ...state.devBrief, body: elements.devBodyInput.value }; renderDevPreview(); });
elements.devTagsInput?.addEventListener("input", () => { state.devBrief = { ...state.devBrief, tags: elements.devTagsInput.value }; renderDevPreview(); });
elements.devDisclosureInput?.addEventListener("input", () => { state.devBrief = { ...state.devBrief, disclosure: elements.devDisclosureInput.value }; renderDevPreview(); });

const okkyPreviewTabs = [elements.okkyEditorView, elements.okkyPreviewView];
for (const [index, button] of okkyPreviewTabs.entries()) {
  button?.addEventListener("click", () => selectOkkyPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? okkyPreviewTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + okkyPreviewTabs.length) % okkyPreviewTabs.length;
    selectOkkyPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}
elements.okkyContextInput?.addEventListener("change", () => { state.okkyBrief = { ...state.okkyBrief, context: elements.okkyContextInput.value }; renderOkkyPreview(); });
elements.okkyPreviewDesktop?.addEventListener("click", () => { state.okkyPreviewViewport = "desktop"; renderOkkyPreview(); });
elements.okkyPreviewMobile?.addEventListener("click", () => { state.okkyPreviewViewport = "mobile"; renderOkkyPreview(); });

const geeknewsPreviewTabs = [elements.geeknewsEditorView, elements.geeknewsPreviewView];
for (const [index, button] of geeknewsPreviewTabs.entries()) {
  button?.addEventListener("click", () => selectGeekNewsPreviewMode(index === 1 ? "preview" : "editor"));
  button?.addEventListener("keydown", (event) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? geeknewsPreviewTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + geeknewsPreviewTabs.length) % geeknewsPreviewTabs.length;
    selectGeekNewsPreviewMode(next === 1 ? "preview" : "editor", { focus: true });
  });
}
elements.geeknewsPreviewDesktop?.addEventListener("click", () => { state.geeknewsPreviewViewport = "desktop"; renderGeekNewsPreview(); });
elements.geeknewsPreviewMobile?.addEventListener("click", () => { state.geeknewsPreviewViewport = "mobile"; renderGeekNewsPreview(); });

const showHnPreviewTabs = [elements.showHnAuthorView, elements.showHnPreviewView];
for (const [index, button] of showHnPreviewTabs.entries()) {
  button?.addEventListener("click", () => selectShowHnPreviewMode(index === 1 ? "preview" : "author"));
  button?.addEventListener("keydown", (event) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? showHnPreviewTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + showHnPreviewTabs.length) % showHnPreviewTabs.length;
    selectShowHnPreviewMode(next === 1 ? "preview" : "author", { focus: true });
  });
}
elements.showHnBriefForm?.addEventListener("submit", (event) => event.preventDefault());
elements.showHnTitleInput?.addEventListener("input", () => updateShowHnBrief({ title: elements.showHnTitleInput.value }));
elements.showHnBodyInput?.addEventListener("input", () => updateShowHnBrief({ body: elements.showHnBodyInput.value }));
elements.showHnSourceInput?.addEventListener("input", () => updateShowHnBrief({ sourceUrl: elements.showHnSourceInput.value }));
elements.showHnDemoInput?.addEventListener("input", () => updateShowHnBrief({ demoUrl: elements.showHnDemoInput.value }));
elements.showHnHandwrittenInput?.addEventListener("change", () => updateShowHnBrief({ handwrittenConfirmed: elements.showHnHandwrittenInput.checked }));
elements.showHnOwnershipInput?.addEventListener("change", () => updateShowHnBrief({ ownershipConfirmed: elements.showHnOwnershipInput.checked }));
elements.showHnReset?.addEventListener("click", () => {
  state.showHnBrief = { title: "", body: "", sourceUrl: "", demoUrl: "", handwrittenConfirmed: false, ownershipConfirmed: false };
  renderShowHnPreview();
  elements.showHnTitleInput.focus();
});
elements.showHnPreviewDesktop?.addEventListener("click", () => { state.showHnPreviewViewport = "desktop"; renderShowHnPreview(); });
elements.showHnPreviewMobile?.addEventListener("click", () => { state.showHnPreviewViewport = "mobile"; renderShowHnPreview(); });

elements.tiktokCaptionInput?.addEventListener("input", () => updateTikTokBrief({ caption: elements.tiktokCaptionInput.value }));
elements.tiktokBriefForm?.addEventListener("submit", (event) => event.preventDefault());
elements.tiktokCoverInput?.addEventListener("input", () => updateTikTokBrief({ cover: elements.tiktokCoverInput.value }));
elements.tiktokVisibilityInput?.addEventListener("change", () => updateTikTokBrief({ visibility: elements.tiktokVisibilityInput.value }));
elements.tiktokAssetReviewedInput?.addEventListener("change", () => updateTikTokBrief({ assetReviewed: elements.tiktokAssetReviewedInput.checked }));
elements.tiktokWatermarkReviewedInput?.addEventListener("change", () => updateTikTokBrief({ watermarkReviewed: elements.tiktokWatermarkReviewedInput.checked }));
elements.tiktokPreviewReset?.addEventListener("click", () => {
  state.tiktokBrief = { caption: "", cover: "", visibility: "unconfirmed", assetReviewed: false, watermarkReviewed: false };
  renderTikTokPreview();
  elements.tiktokCaptionInput.focus();
});

elements.tiktokPreviewDesktop?.addEventListener("click", () => {
  state.tiktokPreviewViewport = "desktop";
  renderTikTokPreview();
});

elements.tiktokPreviewMobile?.addEventListener("click", () => {
  state.tiktokPreviewViewport = "mobile";
  renderTikTokPreview();
});

elements.discordBriefForm?.addEventListener("submit", (event) => event.preventDefault());
elements.discordTargetAliasInput?.addEventListener("input", () => updateDiscordBrief({ targetAlias: elements.discordTargetAliasInput.value }));
elements.discordMessageInput?.addEventListener("input", () => updateDiscordBrief({ message: elements.discordMessageInput.value }));
elements.discordEmbedTitleInput?.addEventListener("input", () => updateDiscordBrief({ embedTitle: elements.discordEmbedTitleInput.value }));
elements.discordEmbedDescriptionInput?.addEventListener("input", () => updateDiscordBrief({ embedDescription: elements.discordEmbedDescriptionInput.value }));
elements.discordEmbedUrlInput?.addEventListener("input", () => updateDiscordBrief({ embedUrl: elements.discordEmbedUrlInput.value }));
elements.discordMentionReviewedInput?.addEventListener("change", () => updateDiscordBrief({ mentionReviewed: elements.discordMentionReviewedInput.checked }));
elements.discordPreviewReset?.addEventListener("click", () => {
  state.discordBrief = { targetAlias: "", message: "", embedTitle: "", embedDescription: "", embedUrl: "", mentionReviewed: false };
  state.discordPreviewViewport = "desktop";
  renderDiscordPreview();
  elements.discordTargetAliasInput.focus();
});
elements.discordPreviewDesktop?.addEventListener("click", () => { state.discordPreviewViewport = "desktop"; renderDiscordPreview(); });
elements.discordPreviewMobile?.addEventListener("click", () => { state.discordPreviewViewport = "mobile"; renderDiscordPreview(); });

elements.blueskyBriefForm?.addEventListener("submit", (event) => event.preventDefault());
elements.blueskyLocaleInput?.addEventListener("change", () => updateBlueskyBrief({ locale: elements.blueskyLocaleInput.value }));
elements.blueskyBodyInput?.addEventListener("input", () => updateBlueskyBrief({ body: elements.blueskyBodyInput.value }));
elements.blueskyFacetsReviewedInput?.addEventListener("change", () => updateBlueskyBrief({ facetsReviewed: elements.blueskyFacetsReviewedInput.checked }));
elements.blueskyPreviewReset?.addEventListener("click", () => {
  state.blueskyBrief = { locale: "unconfirmed", body: "", facetsReviewed: false };
  state.blueskyPreviewViewport = "desktop";
  renderBlueskyPreview();
  elements.blueskyLocaleInput.focus();
});
elements.blueskyPreviewDesktop?.addEventListener("click", () => { state.blueskyPreviewViewport = "desktop"; renderBlueskyPreview(); });
elements.blueskyPreviewMobile?.addEventListener("click", () => { state.blueskyPreviewViewport = "mobile"; renderBlueskyPreview(); });

elements.mastodonBriefForm?.addEventListener("submit", (event) => event.preventDefault());
elements.mastodonInstanceAliasInput?.addEventListener("input", () => updateMastodonBrief({ instanceAlias: elements.mastodonInstanceAliasInput.value }));
elements.mastodonCharacterLimitInput?.addEventListener("input", () => updateMastodonBrief({ characterLimit: elements.mastodonCharacterLimitInput.value }));
elements.mastodonUrlReservedInput?.addEventListener("input", () => updateMastodonBrief({ urlReservedCharacters: elements.mastodonUrlReservedInput.value }));
elements.mastodonVisibilityInput?.addEventListener("change", () => updateMastodonBrief({ visibility: elements.mastodonVisibilityInput.value }));
elements.mastodonContentWarningInput?.addEventListener("input", () => updateMastodonBrief({ contentWarning: elements.mastodonContentWarningInput.value }));
elements.mastodonBodyInput?.addEventListener("input", () => updateMastodonBrief({ body: elements.mastodonBodyInput.value }));
elements.mastodonRulesReviewedInput?.addEventListener("change", () => updateMastodonBrief({ rulesReviewed: elements.mastodonRulesReviewedInput.checked }));
elements.mastodonContentWarningReviewedInput?.addEventListener("change", () => updateMastodonBrief({ contentWarningReviewed: elements.mastodonContentWarningReviewedInput.checked }));
elements.mastodonPreviewReset?.addEventListener("click", () => {
  state.mastodonBrief = { instanceAlias: "", characterLimit: "", urlReservedCharacters: "", visibility: "unconfirmed", contentWarning: "", body: "", rulesReviewed: false, contentWarningReviewed: false };
  state.mastodonPreviewViewport = "desktop";
  renderMastodonPreview();
  elements.mastodonInstanceAliasInput.focus();
});
elements.mastodonPreviewDesktop?.addEventListener("click", () => { state.mastodonPreviewViewport = "desktop"; renderMastodonPreview(); });
elements.mastodonPreviewMobile?.addEventListener("click", () => { state.mastodonPreviewViewport = "mobile"; renderMastodonPreview(); });

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
