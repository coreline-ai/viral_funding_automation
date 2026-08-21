import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTERNAL_CREDENTIAL_VAULT_STATUS,
  PlatformReadinessError,
  accountTargetFromReadiness,
  assessPlatformReadiness,
  normalizePlatformReadiness,
  readinessReportMarkdown,
} from "../src/platform-readiness.mjs";

const now = Date.parse("2026-08-21T00:00:00.000Z");

function today() {
  return "2026-08-21";
}

function threadsReadiness(overrides = {}) {
  return {
    platform: "threads",
    account: {
      accountType: "threads_profile",
      profileId: "threads-123",
      targetId: "threads-123",
      targetType: "profile",
      handle: "coreline",
      profileUrl: "https://www.threads.net/@coreline",
      owner: "Coreline AI",
      timezone: "Asia/Seoul",
      targetLocale: "en-US",
    },
    developerApp: {
      configured: true,
      appId: "meta-app-123",
      approvedScopes: ["threads_basic", "threads_content_publish"],
      redirectUri: "http://127.0.0.1:4310/oauth/callback",
      credentialVaultConfirmed: true,
    },
    policy: { url: "https://developers.facebook.com/docs/threads", verifiedAt: today() },
    asset: null,
    ...overrides,
  };
}

function instagramReadiness(overrides = {}) {
  return {
    ...threadsReadiness({
      platform: "instagram",
      account: {
        accountType: "professional",
        profileId: "ig-123",
        targetId: "ig-123",
        targetType: "profile",
        handle: "coreline",
        profileUrl: "https://www.instagram.com/coreline/",
        owner: "Coreline AI",
        timezone: "Asia/Seoul",
        targetLocale: "en-US",
      },
      developerApp: {
        configured: true,
        appId: "meta-app-123",
        approvedScopes: ["instagram_content_publish"],
        redirectUri: "http://127.0.0.1:4310/oauth/callback",
        credentialVaultConfirmed: true,
      },
      policy: { url: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing", verifiedAt: today() },
    }),
    ...overrides,
  };
}

test("Threads 텍스트 readiness는 검증된 account/app/policy만으로 asset 없이 사전조건을 충족한다", () => {
  const assessment = assessPlatformReadiness({ channel: "threads", readiness: threadsReadiness(), now });
  assert.equal(assessment.status, "ready_for_phase_3");
  assert.equal(assessment.dryRunEligible, true);
  assert.equal(assessment.canStartDryRun, false);
  assert.equal(assessment.assetHash, null);
  assert.deepEqual(assessment.accountTarget, {
    platform: "threads",
    accountId: "threads-123",
    targetId: "threads-123",
    targetType: "profile",
    handle: "coreline",
  });
});

test("계정 owner·scope·정책 확인일이 빠지면 Phase 3 dry-run 사전조건을 통과하지 못한다", () => {
  const missingOwner = threadsReadiness();
  missingOwner.account.owner = "";
  missingOwner.developerApp.approvedScopes = ["threads_basic"];
  missingOwner.policy.verifiedAt = "";
  const assessment = assessPlatformReadiness({ channel: "threads", readiness: missingOwner, now });
  assert.equal(assessment.dryRunEligible, false);
  assert.equal(assessment.canStartDryRun, false);
  assert.ok(assessment.issues.some((issue) => issue.code === "ACCOUNT_OWNER_REQUIRED"));
  assert.ok(assessment.issues.some((issue) => issue.code === "SCOPE_REQUIRED"));
  assert.ok(assessment.issues.some((issue) => issue.code === "POLICY_REVERIFY_REQUIRED"));
});

test("선택 원고 언어와 account target locale이 다르면 dry-run 후보로 만들지 않는다", () => {
  const assessment = assessPlatformReadiness({ channel: "threads", readiness: threadsReadiness(), targetLocale: "ko-KR", now });
  assert.equal(assessment.dryRunEligible, false);
  assert.ok(assessment.issues.some((issue) => issue.code === "ACCOUNT_LOCALE_MISMATCH"));
});

test("Instagram/Shorts 계열은 asset·권리·공개 URL이 없으면 blocked이며 텍스트-only 예외가 없다", () => {
  const missingAsset = assessPlatformReadiness({ channel: "instagram", readiness: instagramReadiness(), now });
  assert.equal(missingAsset.status, "blocked");
  assert.ok(missingAsset.issues.some((issue) => issue.code === "ASSET_REQUIRED"));

  const missingRights = assessPlatformReadiness({
    channel: "instagram",
    readiness: instagramReadiness({
      asset: {
        hash: "a".repeat(64), fileName: "reel.mp4", mimeType: "video/mp4", sizeBytes: 1024,
        width: 1080, height: 1920, altText: "제품 그래프 화면", rightsConfirmed: false, publicUrl: "",
      },
    }),
    now,
  });
  assert.ok(missingRights.issues.some((issue) => issue.code === "ASSET_RIGHTS_REQUIRED"));
  assert.ok(missingRights.issues.some((issue) => issue.code === "ASSET_PUBLIC_URL_REQUIRED"));
});

test("readiness 입력과 내보내기는 credential-like 값·개인 경로를 거부하고 raw post copy를 포함하지 않는다", () => {
  assert.throws(
    () => normalizePlatformReadiness({ ...threadsReadiness(), developerApp: { accessToken: "never-store-this" } }),
    (error) => error instanceof PlatformReadinessError && error.code === "SENSITIVE_READINESS_INPUT",
  );
  assert.throws(
    () => normalizePlatformReadiness({ ...threadsReadiness(), developerApp: { sessionCookie: "never-store-this" } }),
    (error) => error instanceof PlatformReadinessError && error.code === "SENSITIVE_READINESS_INPUT",
  );
  assert.throws(
    () => normalizePlatformReadiness({ ...threadsReadiness(), account: { ...threadsReadiness().account, profileUrl: "/Users/example/private" } }),
    (error) => error instanceof PlatformReadinessError && error.code === "SENSITIVE_READINESS_INPUT",
  );
  const assessment = assessPlatformReadiness({ channel: "threads", readiness: threadsReadiness(), now });
  const report = readinessReportMarkdown({ projectName: "AI Systems Atlas", repositoryUrl: "https://github.com/coreline-ai/memory_node_graph", assessment, generatedAt: "2026-08-21T10:00:00.000Z" });
  assert.match(report, /external_vault_required/);
  assert.doesNotMatch(report, /never-store-this|private|accessToken|refreshToken|clientSecret|게시 본문/i);
});

test("manual-only 채널은 기존 operation gate를 기록해도 connector/dry-run 후보로 승격되지 않는다", () => {
  const assessment = assessPlatformReadiness({
    channel: "geeknews",
    readiness: { platform: "geeknews" },
    operationInputs: { accountAge: true, showCategory: true },
    now,
  });
  assert.equal(assessment.status, "blocked");
  assert.equal(assessment.dryRunEligible, false);
  assert.equal(assessment.canStartDryRun, false);
  assert.ok(assessment.issues.some((issue) => issue.code === "MANUAL_OR_DRAFT_ONLY"));
  assert.equal(accountTargetFromReadiness(threadsReadiness()).handle, "coreline");
  assert.equal(EXTERNAL_CREDENTIAL_VAULT_STATUS, "external_vault_required");
});
