import assert from "node:assert/strict";
import test from "node:test";

import { CHANNEL_KEYS } from "../src/drafts.mjs";
import {
  CHANNEL_PLATFORM,
  PLATFORM_KEYS,
  PLATFORM_REGISTRY,
  POLICY_REVIEW_WINDOW_MS,
  channelAutomationPolicy,
  platformReadiness,
  platformReadinessList,
} from "../src/platform-registry.mjs";

const FRESH_NOW = Date.parse("2026-08-21T12:00:00.000Z");

test("Phase 0 registry는 UI의 19개 외부 플랫폼 상태를 단일 정본으로 관리한다", () => {
  assert.equal(PLATFORM_KEYS.length, 19);
  assert.deepEqual(
    [...PLATFORM_KEYS].sort(),
    [
      "bluesky", "dev", "discord", "disquiet", "facebook", "geeknews", "indieHackers",
      "instagram", "linkedin", "mastodon", "okky", "peerlist", "productHunt", "reddit",
      "shorts", "showHn", "threads", "tiktok", "x",
    ].sort(),
  );
  assert.equal(platformReadinessList({ now: FRESH_NOW }).length, 19);
  assert.equal(PLATFORM_REGISTRY.threads.tier, "A1");
  assert.equal(PLATFORM_REGISTRY.threads.automationMode, "automation_candidate");
  assert.equal(PLATFORM_REGISTRY.x.tier, "A2");
  assert.equal(PLATFORM_REGISTRY.linkedin.tier, "A2");
  assert.ok(PLATFORM_REGISTRY.threads.policyUrl.startsWith("https://"));
  assert.ok(PLATFORM_REGISTRY.threads.readinessRequirements.includes("developer_app"));
});

test("manual-only 채널은 Phase 0에서 intent와 connector 선택이 불가능하다", () => {
  const manualPlatforms = ["productHunt", "peerlist", "indieHackers", "okky", "reddit", "showHn", "geeknews", "disquiet"];
  for (const platform of manualPlatforms) {
    const readiness = platformReadiness(platform, { now: FRESH_NOW });
    assert.equal(readiness.status, "manual_only", platform);
    assert.equal(readiness.canSelectConnector, false, platform);
    assert.equal(readiness.canCreatePublishIntent, false, platform);
    assert.equal("connector" in readiness, false, platform);
  }
  assert.equal(platformReadiness("dev", { now: FRESH_NOW }).status, "draft_only");
});

test("정책 확인일이 만료되거나 미래이면 자동화 후보를 needs_reverify로 낮춘다", () => {
  const expiredAt = FRESH_NOW - POLICY_REVIEW_WINDOW_MS - 1;
  const expired = platformReadiness("threads", {
    now: FRESH_NOW,
    policyVerifiedAt: new Date(expiredAt).toISOString(),
  });
  assert.equal(expired.status, "needs_reverify");
  assert.equal(expired.canSelectConnector, false);
  assert.ok(expired.policyExpiresAt);

  const future = platformReadiness("x", {
    now: FRESH_NOW,
    policyVerifiedAt: "2026-08-22T00:00:00.000Z",
  });
  assert.equal(future.status, "needs_reverify");
});

test("모든 원고 채널은 플랫폼과 publish target 언어 검토 상태에 연결된다", () => {
  assert.deepEqual(Object.keys(CHANNEL_PLATFORM).sort(), [...CHANNEL_KEYS].sort());
  for (const channel of CHANNEL_KEYS) {
    const policy = channelAutomationPolicy(channel, { now: FRESH_NOW });
    assert.ok(policy.platform, channel);
    assert.ok(policy.supportedLocales.includes(policy.targetLocale), channel);
    assert.equal(policy.localeStatus, "needs_locale_review", channel);
    assert.equal(policy.canSelectConnector, false, channel);
    assert.equal(policy.canCreatePublishIntent, false, channel);
    assert.ok(policy.blockedReasons.includes("PHASE_0_CONNECTOR_DISABLED"), channel);
  }

  const reviewed = channelAutomationPolicy("threads", {
    now: FRESH_NOW,
    targetLocale: "en-US",
    localeReviewed: true,
  });
  assert.equal(reviewed.localeStatus, "reviewed");

  const unsupported = channelAutomationPolicy("geeknews", {
    now: FRESH_NOW,
    targetLocale: "ja-JP",
    localeReviewed: true,
  });
  assert.equal(unsupported.localeStatus, "unsupported_locale");
  assert.ok(unsupported.blockedReasons.includes("UNSUPPORTED_LOCALE"));
});
