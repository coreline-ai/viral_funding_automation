import { CHANNEL_KEYS } from "./drafts.mjs";
import { defaultLocale, supportedLocales } from "./channel-profiles.mjs";

// This registry deliberately contains policy metadata only. It does not hold
// OAuth credentials, build requests, or make any external network call.
export const PLATFORM_AUTOMATION_MODES = Object.freeze([
  "manual_only",
  "draft_only",
  "dry_run_ready",
  "automation_candidate",
]);

export const PLATFORM_POLICY_STATUS = Object.freeze([
  "manual_only",
  "draft_only",
  "dry_run_ready",
  "automation_candidate",
  "needs_reverify",
]);

export const POLICY_REVIEW_WINDOW_DAYS = 30;
export const POLICY_REVIEW_WINDOW_MS = POLICY_REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function platform({
  id,
  label,
  tier,
  automationMode,
  policyUrl,
  summary,
  policyVerifiedAt = "2026-08-17",
  readinessRequirements = [],
}) {
  return Object.freeze({
    id,
    label,
    tier,
    automationMode,
    policyUrl,
    summary,
    policyVerifiedAt,
    readinessRequirements: Object.freeze([...readinessRequirements]),
  });
}

// Exactly the 19 platform cards shown by the product. Facebook stays a future
// candidate only; its current combined Reels/Group draft must not select a
// write connector until Page and Group targets are split in a later phase.
export const PLATFORM_REGISTRY = Object.freeze({
  x: platform({ id: "x", label: "X", tier: "A2", automationMode: "automation_candidate", policyUrl: "https://docs.x.com/x-api/posts/create-post", summary: "후속 · 단일 텍스트 dry-run", readinessRequirements: ["account_target", "developer_app", "write_scope", "text_payload"] }),
  threads: platform({ id: "threads", label: "Threads", tier: "A1", automationMode: "automation_candidate", policyUrl: "https://developers.facebook.com/docs/threads", summary: "첫 dry-run pilot · 텍스트 1건", readinessRequirements: ["account_target", "developer_app", "write_scope", "text_payload"] }),
  linkedin: platform({ id: "linkedin", label: "LinkedIn", tier: "A2", automationMode: "automation_candidate", policyUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api", summary: "후속 · 개인 텍스트 dry-run", readinessRequirements: ["account_target", "developer_app", "write_scope", "text_payload"] }),
  facebook: platform({ id: "facebook", label: "Facebook", tier: "A3", automationMode: "automation_candidate", policyUrl: "https://developers.facebook.com/docs/graph-api", summary: "Page/Group 분리 전 connector 차단", readinessRequirements: ["page_target", "developer_app", "write_scope", "page_group_split", "media_policy"] }),
  instagram: platform({ id: "instagram", label: "Instagram", tier: "A3", automationMode: "automation_candidate", policyUrl: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing", summary: "자산·Professional 계정 준비 필요", readinessRequirements: ["professional_account", "developer_app", "write_scope", "media_asset"] }),
  productHunt: platform({ id: "productHunt", label: "Product Hunt", tier: "C", automationMode: "manual_only", policyUrl: "https://help.producthunt.com/", summary: "수동 Create Draft" }),
  peerlist: platform({ id: "peerlist", label: "Peerlist", tier: "C", automationMode: "manual_only", policyUrl: "https://help.peerlist.io/", summary: "수동 Launchpad" }),
  indieHackers: platform({ id: "indieHackers", label: "Indie Hackers", tier: "C", automationMode: "manual_only", policyUrl: "https://www.indiehackers.com/", summary: "수동 게시" }),
  okky: platform({ id: "okky", label: "OKKY", tier: "C", automationMode: "manual_only", policyUrl: "https://okky.kr/", summary: "수동 게시" }),
  reddit: platform({ id: "reddit", label: "Reddit", tier: "C", automationMode: "manual_only", policyUrl: "https://support.reddithelp.com/", summary: "커뮤니티별 수동 작성" }),
  showHn: platform({ id: "showHn", label: "Show HN", tier: "C", automationMode: "manual_only", policyUrl: "https://news.ycombinator.com/showhn.html", summary: "작성자 직접 작성" }),
  geeknews: platform({ id: "geeknews", label: "GeekNews", tier: "C", automationMode: "manual_only", policyUrl: "https://news.hada.io/guidelines", summary: "수동 Show 등록" }),
  disquiet: platform({ id: "disquiet", label: "Disquiet", tier: "C", automationMode: "manual_only", policyUrl: "https://disquiet.io/", summary: "수동 제품 연결 포스트" }),
  dev: platform({ id: "dev", label: "DEV", tier: "B", automationMode: "draft_only", policyUrl: "https://developers.forem.com/api", summary: "사람 검토용 자료·비공개 초안 검토", readinessRequirements: ["human_authorship", "ai_disclosure", "substantial_article"] }),
  shorts: platform({ id: "shorts", label: "YouTube Shorts", tier: "A3", automationMode: "automation_candidate", policyUrl: "https://developers.google.com/youtube/v3", summary: "자산·처리 상태 준비 필요", readinessRequirements: ["channel_target", "developer_app", "upload_scope", "vertical_asset"] }),
  tiktok: platform({ id: "tiktok", label: "TikTok", tier: "A3", automationMode: "automation_candidate", policyUrl: "https://developers.tiktok.com/", summary: "세로 영상·앱 승인 준비 필요", readinessRequirements: ["account_target", "developer_app", "content_posting_scope", "vertical_asset"] }),
  discord: platform({ id: "discord", label: "Discord", tier: "A3", automationMode: "automation_candidate", policyUrl: "https://discord.com/developers/docs/resources/webhook", summary: "서버 관리자 허가 필요", readinessRequirements: ["server_target", "administrator_consent", "webhook_or_bot_scope"] }),
  bluesky: platform({ id: "bluesky", label: "Bluesky", tier: "A3", automationMode: "automation_candidate", policyUrl: "https://docs.bsky.app/", summary: "후순위 · 계정 연결 전 차단", readinessRequirements: ["account_target", "official_auth", "write_scope"] }),
  mastodon: platform({ id: "mastodon", label: "Mastodon", tier: "A3", automationMode: "automation_candidate", policyUrl: "https://docs.joinmastodon.org/api/", summary: "후순위 · 인스턴스 확인 필요", readinessRequirements: ["instance_target", "official_auth", "write_scope"] }),
});

export const PLATFORM_KEYS = Object.freeze(Object.keys(PLATFORM_REGISTRY));

export const CHANNEL_PLATFORM = Object.freeze({
  x1: "x",
  x2: "x",
  x3: "x",
  xThread: "x",
  threads: "threads",
  reddit: "reddit",
  linkedin: "linkedin",
  disquiet: "disquiet",
  facebook: "facebook",
  instagram: "instagram",
  productHunt: "productHunt",
  peerlist: "peerlist",
  indieHackers: "indieHackers",
  okky: "okky",
  geeknews: "geeknews",
  dev: "dev",
  shorts: "shorts",
  showHn: "showHn",
});

function validDate(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function platformProfile(platformKey) {
  return PLATFORM_REGISTRY[platformKey] ?? null;
}

export function platformForChannel(channel) {
  return CHANNEL_PLATFORM[channel] ?? null;
}

export function policyStatus(platformKey, { now = Date.now(), policyVerifiedAt } = {}) {
  const profile = platformProfile(platformKey);
  if (!profile) return "needs_reverify";
  if (profile.automationMode === "manual_only") return "manual_only";
  if (profile.automationMode === "draft_only") return "draft_only";
  const checkedAt = validDate(policyVerifiedAt ?? profile.policyVerifiedAt);
  if (!Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt > POLICY_REVIEW_WINDOW_MS) return "needs_reverify";
  return profile.automationMode;
}

function policyExpiresAt(policyVerifiedAt) {
  const checkedAt = validDate(policyVerifiedAt);
  return Number.isFinite(checkedAt) ? new Date(checkedAt + POLICY_REVIEW_WINDOW_MS).toISOString() : null;
}

export function platformReadiness(platformKey, options = {}) {
  const profile = platformProfile(platformKey);
  if (!profile) {
    return Object.freeze({ platform: platformKey, status: "needs_reverify", canSelectConnector: false, canCreatePublishIntent: false });
  }
  const status = policyStatus(platformKey, options);
  const policyVerifiedAt = options.policyVerifiedAt ?? profile.policyVerifiedAt;
  // Phase 0 never exposes a connector or publish intent. Later phases must
  // explicitly raise a platform to dry_run_ready after account checks.
  const canSelectConnector = false;
  const canCreatePublishIntent = false;
  return Object.freeze({
    ...profile,
    status,
    policyVerifiedAt,
    policyExpiresAt: policyExpiresAt(policyVerifiedAt),
    canSelectConnector,
    canCreatePublishIntent,
  });
}

export function platformReadinessList(options = {}) {
  return Object.freeze(PLATFORM_KEYS.map((platformKey) => platformReadiness(platformKey, options)));
}

export function channelAutomationPolicy(channel, options = {}) {
  if (!CHANNEL_KEYS.includes(channel)) {
    return Object.freeze({ channel, platform: null, status: "needs_reverify", canSelectConnector: false, canCreatePublishIntent: false });
  }
  const platform = platformForChannel(channel);
  const readiness = platformReadiness(platform, options);
  const targetLocale = options.targetLocale ?? defaultLocale(channel);
  const localeSupported = supportedLocales(channel).includes(targetLocale);
  const localeReviewed = options.localeReviewed === true;
  const localeStatus = !localeSupported
    ? "unsupported_locale"
    : (localeReviewed ? "reviewed" : "needs_locale_review");
  return Object.freeze({
    channel,
    platform,
    ...readiness,
    targetLocale,
    supportedLocales: Object.freeze([...supportedLocales(channel)]),
    localeStatus,
    localeReviewed,
    blockedReasons: Object.freeze([
      ...(readiness.status === "needs_reverify" ? ["POLICY_REVERIFY_REQUIRED"] : []),
      ...(localeStatus === "unsupported_locale" ? ["UNSUPPORTED_LOCALE"] : []),
      ...(localeStatus === "needs_locale_review" ? ["LOCALE_REVIEW_REQUIRED"] : []),
      "PHASE_0_CONNECTOR_DISABLED",
    ]),
  });
}
