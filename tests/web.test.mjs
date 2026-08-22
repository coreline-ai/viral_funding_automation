import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, css, app, packageJson] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../web/app.js", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);

test("GUI에 입력·요약·탭·편집·복사·다운로드 의미 구조가 있다", () => {
  assert.match(html, /id="repository-form"/);
  assert.match(html, /id="repository-url"/);
  assert.match(html, /id="example-button"/);
  assert.match(html, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(html, /memory_node_graph 예제로 1턴 실행/);
  assert.match(html, /role="tablist"/);
  assert.equal((html.match(/role="tab"[^>]*data-draft=/g) ?? []).length, 18);
  for (const label of ["X 1안", "X 스레드", "Threads", "Reddit", "LinkedIn", "Disquiet", "GeekNews", "DEV", "Shorts", "Show HN", "Facebook", "Instagram", "Product Hunt", "Peerlist", "Indie Hackers", "OKKY"]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.match(html, /전체 바이럴 채널 상태/);
  assert.equal((html.match(/class="channel-grid"/g) ?? []).length, 1);
  assert.match(html, /id="channel-grid"/);
  assert.equal((html.match(/<article data-state=/g) ?? []).length, 0);
  assert.match(html, /Facebook·Instagram·Product Hunt·Peerlist·Indie Hackers·OKKY/);
  assert.match(html, /id="draft-editor"/);
  assert.match(html, /id="translation-editor"/);
  assert.match(html, /id="locale-select"/);
  for (const locale of ["ko-KR", "en-US", "ja-JP", "zh-CN", "es-ES"]) assert.match(html, new RegExp(`value="${locale}"`));
  assert.match(html, /id="provider-auto"/);
  assert.match(html, /id="provider-grok"/);
  assert.match(html, /id="provider-codex"/);
  assert.match(html, /자동 추천/);
  assert.match(html, /Grok OAuth/);
  assert.match(html, /Codex OAuth/);
  assert.match(html, /id="provider-readiness"/);
  assert.match(html, /id="translate-button"/);
  assert.match(html, />생성</);
  assert.match(html, /id="review-button"/);
  assert.match(html, /id="revalidate-button"/);
  assert.match(html, /id="revert-button"/);
  assert.match(html, /id="author-inputs"/);
  assert.match(html, /id="validation-issues"/);
  assert.match(html, /id="completion-badge"/);
  assert.match(html, /id="translate-all-button"/);
  assert.match(html, />허용 채널 일괄 번역</);
  assert.match(html, /id="author-ready"/);
  assert.match(html, /id="copy-button"/);
  assert.match(html, />작업본 복사<\/button>/);
  assert.match(html, /id="download-button"/);
  assert.match(html, /id="download-all-button"/);
  assert.match(html, /id="publish-preflight"/);
  assert.match(html, /id="baseline-stars"/);
  assert.match(html, /id="baseline-forks"/);
  assert.match(html, /id="baseline-open-issues"/);
  assert.match(html, /id="baseline-refresh-button"/);
  assert.match(html, /id="preflight-download-button"/);
  assert.equal((html.match(/data-preflight=/g) ?? []).length, 5);
  assert.match(html, /https:\/\/news\.hada\.io\/guidelines/);
  assert.match(html, /https:\/\/news\.hada\.io\/show/);
  assert.match(html, /aria-live="polite"/);
});

test("실제 예제 1턴과 마지막 작업 저장·복원 안전장치를 포함한다", () => {
  assert.match(app, /https:\/\/github\.com\/coreline-ai\/memory_node_graph/);
  assert.match(app, /form\.requestSubmit\(\)/);
  assert.match(app, /coreline-launch:workspace:v1/);
  assert.match(app, /STORAGE_VERSION = 7/);
  assert.match(app, /migrateStoredWorkspace/);
  assert.match(app, /workspace\.version === 1/);
  assert.match(app, /workspace\.version !== 2/);
  assert.match(app, /upgradeWorkspaceToV4/);
  assert.match(app, /upgradeWorkspaceToV5/);
  assert.match(app, /upgradeWorkspaceToV6/);
  assert.match(app, /upgradeWorkspaceToV7/);
  assert.match(app, /workspace-migration\.mjs/);
  assert.match(app, /parsePublish\(key, text\)/);
  assert.match(app, /구조화 초안은 콘텐츠 생성을 다시 눌러 만드세요/);
  assert.match(app, /localStorage\.setItem/);
  assert.match(app, /localStorage\.getItem/);
  assert.match(app, /localStorage\.removeItem/);
  assert.match(app, /isStoredWorkspace/);
  assert.match(app, /restoreWorkspace/);
  assert.match(app, /baseline/);
  assert.match(app, /preflight/);
  assert.match(app, /countXWeightedCharacters/);
  assert.match(app, /280 가중자/);
  assert.match(app, /X 스레드/);
  assert.match(app, /서브레딧과 계정·규칙 확인 전 게시 금지/);
  assert.match(app, /DEV 기술 글/);
  assert.match(app, /Show HN/);
  assert.match(app, /Product Hunt/);
  assert.match(app, /Indie Hackers/);
  assert.match(app, /이전 작업을 복원했습니다/);
  assert.doesNotMatch(app, /GITHUB_TOKEN|GH_TOKEN|Authorization/);
});

test("memory_node_graph의 테마 토큰만 사용하고 이미지·그래프 에셋은 포함하지 않는다", () => {
  const requiredTokens = [
    "--bg: #07090b",
    "--surface: rgba(13, 16, 20, 0.88)",
    "--text: #f3efe6",
    "--text-2: #b9b5ad",
    "--text-3: #777a80",
    "--blue: #65b5ff",
    "--violet: #9f7aea",
    "--amber: #f3b35b",
    "--mint: #79d5c0",
  ];
  for (const token of requiredTokens) assert.ok(css.includes(token), `missing ${token}`);

  const visualSources = `${html}\n${css}`;
  assert.doesNotMatch(visualSources, /<img\b|<canvas\b|url\s*\(|og\.png|screenshot|three\.js/i);
  assert.doesNotMatch(css, /background-image\s*:/i);
  assert.doesNotMatch(app, /innerHTML/);
});

test("본문 가독성·반응형·reduced motion 계약을 포함한다", () => {
  assert.match(css, /body\s*\{[^}]*font-size:\s*14px/s);
  assert.match(css, /#draft-editor,\s*#translation-editor\s*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /@media \(max-width: 1180px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.draft-tabs\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.channel-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /focus-visible/);
});

test("웹 실행 명령은 외부 프레임워크 없이 서버를 시작한다", () => {
  assert.equal(packageJson.scripts.web, "node src/server.mjs");
  assert.match(packageJson.scripts["web:proxy"], /VIRAL_CODEX_PROXY_CALLER_ID=viral/);
  assert.match(packageJson.scripts["web:proxy"], /runtime\/secrets\/codex-proxy\.secret/);
  assert.equal(packageJson.dependencies, undefined);
});

test("수정·탭 유지·복사 fallback·Markdown 다운로드 안전장치를 포함한다", () => {
  assert.match(app, /state\.documents/);
  assert.match(app, /\/api\/v1\/drafts\/compose/);
  assert.match(app, /\/api\/v1\/drafts\/review/);
  assert.match(app, /\/api\/v1\/drafts\/validate/);
  assert.match(app, /\/api\/v1\/providers\/readiness/);
  assert.match(app, /\/api\/v1\/drafts\/compose/);
  assert.match(app, /중지/);
  assert.match(app, /provider: state\.provider/);
  assert.match(app, /setProvider\("codex"\)/);
  assert.match(app, /aria-pressed/);
  assert.match(app, /draftViewFromDocuments/);
  assert.match(app, /syncDraftsFromDocuments/);
  assert.match(app, /batchTranslateTargets/);
  assert.match(app, /requestTranslation/);
  assert.match(app, /missingAuthorInputKeys/);
  assert.match(app, /displayCompletionStatus/);
  assert.match(app, /previousEnglish/);
  assert.match(app, /for \(const \[index, channel\] of targets\.entries\(\)\)/);
  assert.match(app, /일괄 번역 중지/);
  assert.match(app, /isTranslationAllowed/);
  assert.match(app, /SUPPORTED_LOCALES/);
  assert.match(app, /previousCompositions/);
  assert.match(app, /localeLabel/);
  assert.doesNotMatch(app, /Promise\.all\([^)]*requestTranslation|Promise\.all\([^)]*\/api\/translate/);
  assert.match(app, /navigator\.clipboard/);
  assert.match(app, /copyBlockReason/);
  assert.match(app, /authorReady/);
  assert.match(app, /게시 필드만 복사했습니다/);
  assert.match(app, /document\.execCommand\("copy"\)/);
  assert.match(app, /new Blob\(/);
  assert.match(app, /viral-content-pack\.md/);
  assert.match(app, /sanitizeFilename/);
  assert.match(app, /\/api\/baseline/);
  assert.match(app, /buildPreflightReport/);
  assert.match(app, /게시 준비 문서/);
  assert.match(app, /beforeunload/);
  assert.match(app, /window\.confirm/);
  assert.match(app, /textContent/);
  assert.doesNotMatch(app, /innerHTML|insertAdjacentHTML|document\.write|news\.hada\.io\/submit/);
});

test("R0 GUI는 Locale·campaign brief·3축 상태·reference/manual 경계를 반영한다", () => {
  assert.match(app, /CAMPAIGN_BRIEF_DEFS/);
  assert.match(app, /currentCampaignBrief/);
  assert.match(app, /currentOperationInputs/);
  assert.match(app, /contentStatus/);
  assert.match(app, /operationsStatus/);
  assert.match(app, /approvalStatus/);
  assert.match(app, /publishReady/);
  assert.match(app, /supportMode\(state\.activeDraft\)/);
  assert.match(app, /needsTargetLocale/);
  assert.match(app, /reference_only/);
  assert.match(html, /현재 결과를 확인하고 승인합니다/);
});

test("R1 GUI는 격리 미검증 OAuth provider를 준비된 엔진으로 표시하지 않는다", () => {
  assert.match(app, /securityStatus === "disabled"/);
  assert.match(app, /보안 격리 미검증/);
  assert.match(app, /securityStatus === "experimental"/);
});

test("R2·R3 GUI는 fingerprint 응답 적용과 loopback nonce를 사용한다", () => {
  assert.match(app, /from "\/request-fingerprint\.mjs"/);
  assert.match(app, /compositionRequestFingerprint/);
  assert.match(app, /createCompositionAttempt/);
  assert.match(app, /assertCurrentCompositionAttempt/);
  assert.match(app, /원문 또는 작성자 입력이 생성 중 변경되어 결과를 적용하지 않았습니다/);
  assert.match(app, /X-Viral-Nonce/);
  assert.match(app, /ensureApiCapabilities/);
  assert.doesNotMatch(app, /providers\/readiness\?probe=1/);
});

test("Phase 0 GUI는 단일 플랫폼 registry를 렌더링하며 connector·intent 제어를 노출하지 않는다", () => {
  assert.match(app, /from "\/platform-registry\.mjs"/);
  assert.match(app, /platformReadinessList\(\)/);
  assert.match(app, /function renderPlatformInventory/);
  assert.match(app, /channelGrid\.replaceChildren\(\)/);
  assert.match(app, /A1 · 첫 dry-run pilot/);
  assert.match(app, /A2 · 후속 검증군/);
  assert.match(app, /manual-only · 자동화 없음/);
  assert.doesNotMatch(html, /id="(?:connector|publish-intent|social-oauth)/i);
});

test("Phase 1 GUI는 승인자 입력과 불변 snapshot만 복사 경로로 사용한다", () => {
  assert.match(html, /id="approval-actor"/);
  assert.match(html, /id="approval-snapshot-status"/);
  assert.match(html, /snapshot으로 동결합니다/);
  assert.match(app, /from "\/publish-intent\.mjs"/);
  assert.match(app, /assessApprovalRevision/);
  assert.match(app, /\/api\/v1\/approval-revisions/);
  assert.match(app, /approvalRevision/);
  assert.match(app, /function currentApprovalContext/);
  assert.match(app, /revision\.copyText/);
  assert.match(app, /PUBLISH_FIELDS_CHANGED/);
  assert.match(app, /approvalStatus: "unreviewed"/);
  assert.doesNotMatch(html, /type="password"|accessToken|refreshToken|clientSecret/);
});

test("Phase 4 GUI는 non-secret readiness·승인 snapshot·session-only interlock으로 local rehearsal만 제공한다", () => {
  assert.match(html, /id="automation-readiness"/);
  assert.match(html, /id="readiness-status-grid"/);
  assert.match(html, /id="platform-readiness-form"/);
  assert.match(html, /id="platform-readiness-fields"/);
  assert.match(html, /id="readiness-report-button"/);
  assert.match(html, /id="readiness-dry-run-button"/);
  assert.match(html, /PHASE 4 · REHEARSAL/);
  assert.match(html, /id="readiness-dry-run-result"/);
  assert.match(html, /id="dry-run-credential-handle"/);
  assert.match(html, /id="dry-run-kill-switch"/);
  assert.match(html, /id="dry-run-evidence-button"/);
  assert.match(app, /from "\/platform-readiness\.mjs"/);
  assert.match(app, /assessPlatformReadiness/);
  assert.match(app, /readinessReportMarkdown/);
  assert.match(app, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(`${app}\n${html}`, /실제 플랫폼 요청을 보내지 않습니다/);
  assert.match(app, /CONNECTION/);
  assert.match(app, /INTENT/);
  assert.match(app, /upgradeWorkspacePlatformReadiness/);
  assert.match(app, /from "\/platforms\/registry\.mjs"/);
  assert.match(app, /function currentDryRunEligibility/);
  assert.match(app, /\/api\/v1\/dry-runs/);
  assert.match(app, /networkWriteCount !== 0/);
  assert.match(app, /userKillSwitch: "live_write_locked"/);
  assert.match(app, /Deliberately session-only/);
  assert.match(app, /state\.dryRunEvidence/);
  assert.doesNotMatch(html, /type="password"|accessToken|refreshToken|clientSecret/);
  assert.doesNotMatch(app, /fetch\([^)]*(?:threads\.net|twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com)/i);
  assert.doesNotMatch(app, /platformReadiness:[^\n]*dryRunCredentialHandle|localStorage[^\n]*dryRunCredentialHandle/i);
});

test("Phase 5 GUI는 외부 입력을 후순위로 표시하고 실제 게시 capability를 계속 차단한다", () => {
  assert.match(html, /id="automation-decision"/);
  assert.match(html, /PHASE 5 · NO-GO/);
  assert.match(html, /id="go-live-decision"/);
  assert.match(html, /id="go-live-publish-capability"/);
  assert.match(html, /id="go-live-deferred-inputs"/);
  assert.match(html, /id="go-live-report-button"/);
  assert.match(app, /from "\/automation-go-live\.mjs"/);
  assert.match(app, /automationGoLiveAssessment/);
  assert.match(app, /automationGoLiveReportMarkdown/);
  assert.match(app, /actualPublishCapability \? "활성" : "차단"/);
  assert.match(app, /social-automation-go-no-go\.md/);
  assert.doesNotMatch(html, /id="(?:publish|upload|schedule)-button"/i);
  assert.doesNotMatch(app, /fetch\([^)]*(?:threads\.net|twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com)/i);
});

test("보안 격리 미검증 OAuth provider는 GUI에서 실행 요청 자체를 막는다", () => {
  assert.match(app, /function providerExecutionReady/);
  assert.match(app, /readiness\?\.securityStatus !== "disabled"/);
  assert.match(app, /OAuth provider는 보안 격리 검증 전에는 실행할 수 없습니다/);
  assert.match(app, /elements\.translateButton\.disabled = disabled \|\| !ready \|\| !providerReady/);
});

test("Threads 탭은 안전한 읽기 전용 게시물 미리보기와 접근성 제어를 제공한다", () => {
  assert.match(html, /id="threads-preview-workbench"/);
  assert.match(html, /id="threads-editor-view"[^>]*role="tab"/);
  assert.match(html, /id="threads-preview-view"[^>]*role="tab"/);
  assert.match(html, /id="threads-preview-panel"[^>]*role="tabpanel"/);
  assert.match(html, /id="threads-preview-desktop"[^>]*aria-pressed="true"/);
  assert.match(html, /id="threads-preview-mobile"[^>]*aria-pressed="false"/);
  assert.match(html, /id="threads-preview-cards"/);
  assert.match(html, /<ol class="threads-preview-cards"/);
  assert.match(html, /Threads 스타일 미리보기/);
  assert.match(app, /model\.notice/);

  assert.match(app, /from "\/threads-preview\.mjs"/);
  assert.match(app, /function currentThreadsPreviewModel/);
  assert.match(app, /posts: entry\?\.publishFields\?\.posts \?\? \[\]/);
  assert.match(app, /function renderThreadsPreview/);
  assert.match(app, /text\.textContent = cardModel\.text/);
  assert.match(app, /actions\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(app, /event\.key === "ArrowRight"/);
  assert.match(app, /event\.key === "Home"/);
  assert.match(app, /event\.key === "End"/);
  assert.match(app, /threadsPreviewViewport/);
  const previewRenderer = app.slice(app.indexOf("function currentThreadsPreviewModel"), app.indexOf("function renderActiveDraft"));
  assert.doesNotMatch(previewRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /threadsPreview/);

  assert.match(css, /\.threads-preview-simulation\s*\{/);
  assert.match(css, /\.threads-preview-post-text\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.threads-preview-post-text\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /\.threads-preview-simulation\[data-viewport="mobile"\]/);
});

test("X 탭은 X UI mock-up이 아닌 안전한 게시 전 원고 검토와 접근성 제어를 제공한다", () => {
  assert.match(html, /id="x-review-workbench"/);
  assert.match(html, /id="x-editor-view"[^>]*role="tab"/);
  assert.match(html, /id="x-review-view"[^>]*role="tab"/);
  assert.match(html, /id="x-review-panel"[^>]*role="tabpanel"/);
  assert.match(html, /id="x-review-desktop"[^>]*aria-pressed="true"/);
  assert.match(html, /id="x-review-mobile"[^>]*aria-pressed="false"/);
  assert.match(html, /id="x-review-cards"/);
  assert.match(html, /<ol class="x-review-cards"/);
  assert.match(html, /X 게시 전 원고 검토/);
  assert.match(html, /id="x-review-notice"/);

  assert.match(app, /from "\/x-preview\.mjs"/);
  assert.match(app, /function currentXReviewModel/);
  assert.match(app, /function renderXReview/);
  assert.match(app, /X_REVIEW_KEYS/);
  assert.match(app, /text\.dir = "auto"/);
  assert.match(app, /function appendXReviewText/);
  assert.match(app, /url\.textContent = match\[0\]/);
  assert.match(app, /x-draft-identicon/);
  assert.match(app, /x-draft-action-lane/);
  assert.match(app, /연속 원고/);
  assert.match(app, /로컬 가중 문자 추정/);
  assert.match(app, /xReviewViewport/);
  const xReviewRenderer = app.slice(app.indexOf("function currentXReviewModel"), app.indexOf("function currentThreadsPreviewModel"));
  assert.doesNotMatch(xReviewRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /xReview/);
  const xReviewMarkup = html.slice(html.indexOf('id="x-review-workbench"'), html.indexOf('id="threads-preview-workbench"'));
  assert.doesNotMatch(`${xReviewMarkup}\n${xReviewRenderer}`, /View on X|Reply|Repost|Like|verified|avatar|twitter\.com|x\.com|platform\.twitter\.com/i);

  assert.match(css, /\.x-review-proof\s*\{/);
  assert.match(css, /\.x-draft-identicon\s*\{/);
  assert.match(css, /\.x-draft-connector\s*\{/);
  assert.match(css, /\.x-draft-action-lane\s*\{/);
  assert.match(css, /\.x-draft-url\s*\{/);
  assert.match(css, /grid-template-columns:\s*40px minmax\(0, 1fr\)/);
  assert.match(css, /\.x-review-text\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.x-review-text\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.x-review-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("LinkedIn 탭은 현재 원고를 local-only 전문 피드 미리보기로 검토한다", () => {
  assert.match(html, /id="linkedin-preview-workbench"/);
  assert.match(html, /id="linkedin-editor-view"[^>]*role="tab"/);
  assert.match(html, /id="linkedin-preview-view"[^>]*role="tab"/);
  assert.match(html, /id="linkedin-preview-panel"[^>]*role="tabpanel"/);
  assert.match(html, /id="linkedin-preview-desktop"[^>]*aria-pressed="true"/);
  assert.match(html, /id="linkedin-preview-mobile"[^>]*aria-pressed="false"/);
  assert.match(html, /id="linkedin-preview-post"/);
  assert.match(html, /LinkedIn 게시 전 미리보기/);
  assert.match(html, /id="linkedin-preview-notice"/);

  assert.match(app, /from "\/linkedin-preview\.mjs"/);
  assert.match(app, /from "\/platform-preview-registry\.mjs"/);
  assert.match(app, /function currentLinkedInPreviewModel/);
  assert.match(app, /function renderLinkedInPreview/);
  assert.match(app, /function appendLinkedInPreviewPost/);
  assert.match(app, /text\.textContent = model\.content\.body/);
  assert.match(app, /linkedinPreviewViewport/);
  const linkedinRenderer = app.slice(app.indexOf("function currentLinkedInPreviewModel"), app.indexOf("function currentFacebookPreviewModel"));
  assert.doesNotMatch(linkedinRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /linkedinPreview/);
  const linkedinMarkup = html.slice(html.indexOf('id="linkedin-preview-workbench"'), html.indexOf('id="facebook-preview-workbench"'));
  assert.doesNotMatch(`${linkedinMarkup}\n${linkedinRenderer}`, /View on LinkedIn|verified|followers|reactions|linkedin\.com/i);

  assert.match(css, /\.linkedin-preview-proof\s*\{/);
  assert.match(css, /\.linkedin-draft-post\s*\{/);
  assert.match(css, /\.linkedin-draft-text\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.linkedin-draft-text\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.linkedin-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Facebook 탭은 Reels와 그룹 원고를 분리한 local-only 미리보기를 제공한다", () => {
  assert.match(html, /id="facebook-preview-workbench"/);
  assert.match(html, /id="facebook-editor-view"[^>]*role="tab"/);
  assert.match(html, /id="facebook-reels-view"[^>]*role="tab"/);
  assert.match(html, /id="facebook-group-view"[^>]*role="tab"/);
  assert.match(html, /id="facebook-preview-panel"[^>]*role="tabpanel"/);
  assert.match(html, /id="facebook-preview-desktop"[^>]*aria-pressed="true"/);
  assert.match(html, /id="facebook-preview-mobile"[^>]*aria-pressed="false"/);
  assert.match(html, /id="facebook-preview-surface"/);
  assert.match(html, /Facebook Reels 게시 전 미리보기/);
  assert.match(html, /그룹 미리보기/);
  assert.match(html, /id="facebook-preview-notice"/);

  assert.match(app, /from "\/facebook-preview\.mjs"/);
  assert.match(app, /function currentFacebookPreviewModel/);
  assert.match(app, /function appendFacebookReelsPreview/);
  assert.match(app, /function appendFacebookGroupPreview/);
  assert.match(app, /function renderFacebookPreview/);
  assert.match(app, /caption\.textContent = model\.content\.reelsCaption/);
  assert.match(app, /body\.textContent = model\.content\.groupBody/);
  assert.match(app, /facebookPreviewViewport/);
  const facebookRenderer = app.slice(app.indexOf("function currentFacebookPreviewModel"), app.indexOf("function currentInstagramPreviewModel"));
  assert.doesNotMatch(facebookRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /facebookPreview/);
  const facebookMarkup = html.slice(html.indexOf('id="facebook-preview-workbench"'), html.indexOf('id="instagram-preview-workbench"'));
  assert.doesNotMatch(`${facebookMarkup}\n${facebookRenderer}`, /verified|followers|reactions|facebook\.com|iframe|<img\b/i);

  assert.match(css, /\.facebook-preview-proof\s*\{/);
  assert.match(css, /\.facebook-reels-stage\s*\{/);
  assert.match(css, /\.facebook-reels-caption\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.facebook-reels-caption\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.facebook-group-body\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.facebook-preview-proof\[data-viewport="mobile"\]\[data-mode="reels"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Instagram 탭은 표지·캡션·세로 자산 readiness를 local-only 미리보기로 제공한다", () => {
  assert.match(html, /id="instagram-preview-workbench"/);
  assert.match(html, /id="instagram-editor-view"[^>]*role="tab"/);
  assert.match(html, /id="instagram-preview-view"[^>]*role="tab"/);
  assert.match(html, /id="instagram-preview-panel"[^>]*role="tabpanel"/);
  assert.match(html, /id="instagram-preview-desktop"[^>]*aria-pressed="true"/);
  assert.match(html, /id="instagram-preview-mobile"[^>]*aria-pressed="false"/);
  assert.match(html, /id="instagram-preview-surface"/);
  assert.match(html, /Instagram Reels 게시 전 미리보기/);
  assert.match(html, /id="instagram-preview-notice"/);

  assert.match(app, /from "\/instagram-preview\.mjs"/);
  assert.match(app, /function currentInstagramPreviewModel/);
  assert.match(app, /function appendInstagramPreview/);
  assert.match(app, /function renderInstagramPreview/);
  assert.match(app, /cover\.textContent = model\.content\.cover/);
  assert.match(app, /caption\.textContent = model\.content\.caption/);
  assert.match(app, /instagramPreviewViewport/);
  const instagramRenderer = app.slice(app.indexOf("function currentInstagramPreviewModel"), app.indexOf("function currentShortsPreviewModel"));
  assert.doesNotMatch(instagramRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /instagramPreview/);
  const instagramMarkup = html.slice(html.indexOf('id="instagram-preview-workbench"'), html.indexOf('id="shorts-preview-workbench"'));
  assert.doesNotMatch(`${instagramMarkup}\n${instagramRenderer}`, /verified|followers|reactions|instagram\.com|iframe|<img\b/i);

  assert.match(css, /\.instagram-preview-proof\s*\{/);
  assert.match(css, /\.instagram-reels-stage\s*\{/);
  assert.match(css, /\.instagram-reels-cover\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.instagram-reels-caption\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.instagram-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("YouTube Shorts 탭은 title·description·shot 순서를 local-only storyboard로 검토한다", () => {
  assert.match(html, /id="shorts-preview-workbench"/);
  assert.match(html, /id="shorts-editor-view"[^>]*role="tab"/);
  assert.match(html, /id="shorts-preview-view"[^>]*role="tab"/);
  assert.match(html, /id="shorts-preview-panel"[^>]*role="tabpanel"/);
  assert.match(html, /id="shorts-preview-desktop"[^>]*aria-pressed="true"/);
  assert.match(html, /id="shorts-preview-mobile"[^>]*aria-pressed="false"/);
  assert.match(html, /id="shorts-preview-surface"/);
  assert.match(html, /YouTube Shorts 게시 전 미리보기/);
  assert.match(html, /id="shorts-preview-notice"/);

  assert.match(app, /from "\/shorts-preview\.mjs"/);
  assert.match(app, /function currentShortsPreviewModel/);
  assert.match(app, /function appendShortsPreview/);
  assert.match(app, /function renderShortsPreview/);
  assert.match(app, /shotText\.textContent = selectedShot\?\.text/);
  assert.match(app, /title\.textContent = model\.content\.title/);
  assert.match(app, /description\.textContent = model\.content\.description/);
  assert.match(app, /shortsPreviewShotIndex/);
  assert.match(app, /shortsPreviewViewport/);
  const shortsRenderer = app.slice(app.indexOf("function currentShortsPreviewModel"), app.indexOf("function currentProductHuntPreviewModel"));
  assert.doesNotMatch(shortsRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /shortsPreview/);
  const shortsMarkup = html.slice(html.indexOf('id="shorts-preview-workbench"'), html.indexOf('id="product-hunt-preview-workbench"'));
  assert.doesNotMatch(`${shortsMarkup}\n${shortsRenderer}`, /youtube\.com|<video\b|<iframe\b|<img\b|verified|followers|view count|upload|schedule/i);

  assert.match(css, /\.shorts-preview-proof\s*\{/);
  assert.match(css, /\.shorts-draft-stage\s*\{/);
  assert.match(css, /\.shorts-draft-shot-text\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.shorts-draft-shot-text\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.shorts-draft-description\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.shorts-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("TikTok Preview Lab은 생성 채널을 늘리지 않는 session-only 수동 초안 미리보기다", () => {
  assert.match(html, /id="tiktok-preview-lab"/);
  assert.match(html, /id="tiktok-brief-form"/);
  assert.match(html, /id="tiktok-caption-input"/);
  assert.match(html, /id="tiktok-cover-input"/);
  assert.match(html, /id="tiktok-visibility-input"/);
  assert.match(html, /id="tiktok-asset-reviewed-input"/);
  assert.match(html, /id="tiktok-watermark-reviewed-input"/);
  assert.match(html, /id="tiktok-preview-reset"/);
  assert.match(html, /TikTok 게시 전 미리보기/);
  assert.match(html, /외부 API·업로드·게시 0회/);

  assert.match(app, /from "\/tiktok-preview\.mjs"/);
  assert.match(app, /previewSpecForPlatform\("tiktok"\)/);
  assert.match(app, /tiktokBrief:/);
  assert.match(app, /function currentTikTokPreviewModel/);
  assert.match(app, /function renderTikTokPreview/);
  assert.match(app, /function updateTikTokBrief/);
  assert.match(app, /caption\.textContent = model\.content\.caption/);
  assert.match(app, /cover\.textContent = model\.content\.cover/);
  assert.match(app, /tiktokPreviewViewport/);
  const tiktokRenderer = app.slice(app.indexOf("function currentTikTokPreviewModel"), app.indexOf("function renderActiveDraft"));
  assert.doesNotMatch(tiktokRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const tiktokInputEvents = app.slice(app.indexOf("elements.tiktokCaptionInput?.addEventListener"), app.indexOf("function updateSourceFromEditor"));
  assert.doesNotMatch(tiktokInputEvents, /persistWorkspace|localStorage|fetch\s*\(/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /tiktokBrief|tiktokPreview/);
  const tiktokMarkup = html.slice(html.indexOf('id="tiktok-preview-lab"'), html.indexOf('id="discord-preview-lab"'));
  assert.doesNotMatch(`${tiktokMarkup}\n${tiktokRenderer}`, /tiktok\.com|<video\b|<iframe\b|<img\b|verified|followers|reactions|actual post/i);
  assert.doesNotMatch(tiktokMarkup, /type="password"|webhook/i);

  assert.match(css, /\.tiktok-preview-lab\s*\{/);
  assert.match(css, /\.tiktok-draft-stage\s*\{/);
  assert.match(css, /\.tiktok-draft-cover\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.tiktok-draft-caption\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.tiktok-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Discord Preview Lab은 로컬 수동 메시지와 알림 후보만 검토하며 전송 경로를 만들지 않는다", () => {
  assert.match(html, /id="discord-preview-lab"/);
  assert.match(html, /id="discord-brief-form"/);
  assert.match(html, /id="discord-target-alias-input"/);
  assert.match(html, /id="discord-message-input"/);
  assert.match(html, /id="discord-embed-title-input"/);
  assert.match(html, /id="discord-embed-description-input"/);
  assert.match(html, /id="discord-embed-url-input"/);
  assert.match(html, /id="discord-mention-reviewed-input"/);
  assert.match(html, /id="discord-preview-reset"/);
  assert.match(html, /Discord 메시지 미리보기/);
  assert.match(html, /외부 API·전송·예약 0회/);

  assert.match(app, /from "\/discord-preview\.mjs"/);
  assert.match(app, /previewSpecForPlatform\("discord"\)/);
  assert.match(app, /discordBrief:/);
  assert.match(app, /function currentDiscordPreviewModel/);
  assert.match(app, /function renderDiscordPreview/);
  assert.match(app, /function updateDiscordBrief/);
  assert.match(app, /text\.textContent = model\.content\.message/);
  assert.match(app, /discordPreviewViewport/);
  const discordRenderer = app.slice(app.indexOf("function currentDiscordPreviewModel"), app.indexOf("function renderActiveDraft"));
  assert.doesNotMatch(discordRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const discordInputEvents = app.slice(app.indexOf("elements.discordBriefForm?.addEventListener"), app.indexOf("function updateSourceFromEditor"));
  assert.doesNotMatch(discordInputEvents, /persistWorkspace|localStorage|fetch\s*\(/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /discordBrief|discordPreview/);
  const discordMarkup = html.slice(html.indexOf('id="discord-preview-lab"'), html.indexOf('id="bluesky-preview-lab"'));
  assert.doesNotMatch(`${discordMarkup}\n${discordRenderer}`, /discord\.com|<iframe\b|<img\b|verified|followers|reactions|actual message/i);
  assert.doesNotMatch(discordMarkup, /type="password"|webhook/i);

  assert.match(css, /\.discord-preview-lab\s*\{/);
  assert.match(css, /\.discord-draft-proof\s*\{/);
  assert.match(css, /\.discord-draft-message-text\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.discord-draft-message-text\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.discord-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Bluesky Preview Lab은 로컬 짧은 게시문과 URL/@handle 후보만 검토하며 facet 해석·게시 경로를 만들지 않는다", () => {
  assert.match(html, /id="bluesky-preview-lab"/);
  assert.match(html, /id="bluesky-brief-form"/);
  assert.match(html, /id="bluesky-locale-input"/);
  assert.match(html, /id="bluesky-body-input"/);
  assert.match(html, /id="bluesky-facets-reviewed-input"/);
  assert.match(html, /id="bluesky-preview-reset"/);
  assert.match(html, /Bluesky 짧은 게시문 미리보기/);
  assert.match(html, /외부 API·게시·facet 해석 0회/);

  assert.match(app, /from "\/bluesky-preview\.mjs"/);
  assert.match(app, /previewSpecForPlatform\("bluesky"\)/);
  assert.match(app, /blueskyBrief:/);
  assert.match(app, /function currentBlueskyPreviewModel/);
  assert.match(app, /function renderBlueskyPreview/);
  assert.match(app, /function updateBlueskyBrief/);
  assert.match(app, /body\.textContent = model\.content\.body/);
  assert.match(app, /blueskyPreviewViewport/);
  const blueskyRenderer = app.slice(app.indexOf("function currentBlueskyPreviewModel"), app.indexOf("function renderActiveDraft"));
  assert.doesNotMatch(blueskyRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const blueskyInputEvents = app.slice(app.indexOf("elements.blueskyBriefForm?.addEventListener"), app.indexOf("function updateSourceFromEditor"));
  assert.doesNotMatch(blueskyInputEvents, /persistWorkspace|localStorage|fetch\s*\(/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /blueskyBrief|blueskyPreview/);
  const blueskyMarkup = html.slice(html.indexOf('id="bluesky-preview-lab"'), html.indexOf('id="mastodon-preview-lab"'));
  assert.doesNotMatch(`${blueskyMarkup}\n${blueskyRenderer}`, /bsky\.app|bsky\.social|<iframe\b|<img\b|butterfly|verified|followers|reactions|actual post/i);
  assert.doesNotMatch(blueskyMarkup, /type="password"|access[_-]?token|client[_-]?secret/i);

  assert.match(css, /\.bluesky-preview-lab\s*\{/);
  assert.match(css, /\.bluesky-draft-proof\s*\{/);
  assert.match(css, /\.bluesky-draft-body\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.bluesky-draft-body\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.bluesky-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Mastodon Preview Lab은 수동 status와 인스턴스별 local limit만 검토하며 인스턴스 연결·게시 경로를 만들지 않는다", () => {
  assert.match(html, /id="mastodon-preview-lab"/);
  assert.match(html, /id="mastodon-brief-form"/);
  assert.match(html, /id="mastodon-instance-alias-input"/);
  assert.match(html, /id="mastodon-character-limit-input"/);
  assert.match(html, /id="mastodon-url-reserved-input"/);
  assert.match(html, /id="mastodon-visibility-input"/);
  assert.match(html, /id="mastodon-content-warning-input"/);
  assert.match(html, /id="mastodon-body-input"/);
  assert.match(html, /id="mastodon-preview-reset"/);
  assert.match(html, /Mastodon status 미리보기/);
  assert.match(html, /외부 API·게시·계정 조회 0회/);

  assert.match(app, /from "\/mastodon-preview\.mjs"/);
  assert.match(app, /previewSpecForPlatform\("mastodon"\)/);
  assert.match(app, /mastodonBrief:/);
  assert.match(app, /function currentMastodonPreviewModel/);
  assert.match(app, /function renderMastodonPreview/);
  assert.match(app, /function updateMastodonBrief/);
  assert.match(app, /body\.textContent = model\.content\.body/);
  assert.match(app, /mastodonPreviewViewport/);
  const mastodonRenderer = app.slice(app.indexOf("function currentMastodonPreviewModel"), app.indexOf("function renderActiveDraft"));
  assert.doesNotMatch(mastodonRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const mastodonInputEvents = app.slice(app.indexOf("elements.mastodonBriefForm?.addEventListener"), app.indexOf("function updateSourceFromEditor"));
  assert.doesNotMatch(mastodonInputEvents, /persistWorkspace|localStorage|fetch\s*\(/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /mastodonBrief|mastodonPreview/);
  const mastodonMarkup = html.slice(html.indexOf('id="mastodon-preview-lab"'), html.indexOf('id="publish-preflight"'));
  assert.doesNotMatch(`${mastodonMarkup}\n${mastodonRenderer}`, /mastodon\.social|<iframe\b|<img\b|verified|followers_count|reaction|timeline|actual status/i);
  assert.doesNotMatch(mastodonMarkup, /type="password"|access[_-]?token|client[_-]?secret/i);

  assert.match(css, /\.mastodon-preview-lab\s*\{/);
  assert.match(css, /\.mastodon-draft-proof\s*\{/);
  assert.match(css, /\.mastodon-draft-body\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.mastodon-draft-body\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.mastodon-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Product Hunt launch 미리보기는 현재 원고와 수동 readiness만 local surface에 투영한다", () => {
  assert.match(html, /id="product-hunt-preview-workbench"/);
  assert.match(html, /id="product-hunt-editor-view"/);
  assert.match(html, /id="product-hunt-preview-view"/);
  assert.match(html, /id="product-hunt-preview-panel"/);
  assert.match(html, /Product Hunt 게시 전 미리보기/);
  assert.match(html, /Desktop · 640px/);
  assert.match(html, /모바일 · 390px/);

  assert.match(app, /from "\/product-hunt-preview\.mjs"/);
  assert.match(app, /function currentProductHuntPreviewModel/);
  assert.match(app, /function renderProductHuntPreview/);
  assert.match(app, /function selectProductHuntPreviewMode/);
  assert.match(app, /previewSpecForChannel\("productHunt"\)/);
  const productHuntRenderer = app.slice(app.indexOf("function currentProductHuntPreviewModel"), app.indexOf("function currentPeerlistPreviewModel"));
  assert.match(productHuntRenderer, /textContent = model\.content\.name/);
  assert.match(productHuntRenderer, /textContent = model\.content\.firstComment/);
  assert.doesNotMatch(productHuntRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /productHuntPreviewMode|productHuntPreviewViewport/);
  const productHuntMarkup = html.slice(html.indexOf('id="product-hunt-preview-workbench"'), html.indexOf('id="peerlist-preview-workbench"'));
  assert.doesNotMatch(`${productHuntMarkup}\n${productHuntRenderer}`, /producthunt\.com|<video\b|<iframe\b|<img\b|upvote|rank|review count|scheduled/i);

  assert.match(css, /\.product-hunt-preview-workbench\s*\{/);
  assert.match(css, /\.product-hunt-draft-preview\s*\{/);
  assert.match(css, /\.product-hunt-draft-description p,[\s\S]*?white-space:\s*pre-wrap/s);
  assert.match(css, /\.product-hunt-draft-meta dd\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.product-hunt-preview-proof\[data-viewport="mobile"\]/);
});

test("Peerlist Launchpad 미리보기는 원고와 수동 eligibility만 local surface에 투영한다", () => {
  assert.match(html, /id="peerlist-preview-workbench"/);
  assert.match(html, /id="peerlist-editor-view"/);
  assert.match(html, /id="peerlist-preview-view"/);
  assert.match(html, /id="peerlist-preview-panel"/);
  assert.match(html, /Peerlist 게시 전 미리보기/);
  assert.match(html, /Desktop · 640px/);
  assert.match(html, /모바일 · 390px/);

  assert.match(app, /from "\/peerlist-preview\.mjs"/);
  assert.match(app, /function currentPeerlistPreviewModel/);
  assert.match(app, /function renderPeerlistPreview/);
  assert.match(app, /function selectPeerlistPreviewMode/);
  assert.match(app, /previewSpecForChannel\("peerlist"\)/);
  const peerlistRenderer = app.slice(app.indexOf("function currentPeerlistPreviewModel"), app.indexOf("function currentDisquietPreviewModel"));
  assert.match(peerlistRenderer, /textContent = model\.content\.name/);
  assert.match(peerlistRenderer, /textContent = model\.content\.comment/);
  assert.doesNotMatch(peerlistRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /peerlistPreviewMode|peerlistPreviewViewport/);
  const peerlistMarkup = html.slice(html.indexOf('id="peerlist-preview-workbench"'), html.indexOf('id="disquiet-preview-workbench"'));
  assert.doesNotMatch(`${peerlistMarkup}\n${peerlistRenderer}`, /peerlist\.io|<video\b|<iframe\b|<img\b|upvote|rank|reaction|schedule/i);

  assert.match(css, /\.peerlist-preview-workbench\s*\{/);
  assert.match(css, /\.peerlist-draft-preview\s*\{/);
  assert.match(css, /\.peerlist-draft-comment p\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.peerlist-draft-meta dd\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.peerlist-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Disquiet 탭은 제품 우선·연결 포스트를 분리한 local-only 미리보기를 제공한다", () => {
  assert.match(html, /id="disquiet-preview-workbench"/);
  assert.match(html, /id="disquiet-editor-view"/);
  assert.match(html, /id="disquiet-preview-view"/);
  assert.match(html, /id="disquiet-preview-panel"/);
  assert.match(html, /Disquiet 게시 전 미리보기/);
  assert.match(html, /제품·포스트 미리보기/);
  assert.match(html, /Desktop · 640px/);
  assert.match(html, /모바일 · 390px/);

  assert.match(app, /from "\/disquiet-preview\.mjs"/);
  assert.match(app, /function currentDisquietPreviewModel/);
  assert.match(app, /function appendDisquietPreview/);
  assert.match(app, /function renderDisquietPreview/);
  assert.match(app, /function selectDisquietPreviewMode/);
  assert.match(app, /previewSpecForChannel\("disquiet"\)/);
  const disquietRenderer = app.slice(app.indexOf("function currentDisquietPreviewModel"), app.indexOf("function currentRedditPreviewModel"));
  assert.match(disquietRenderer, /textContent = model\.content\.productName/);
  assert.match(disquietRenderer, /textContent = model\.content\.postBody/);
  assert.doesNotMatch(disquietRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /disquietPreviewMode|disquietPreviewViewport/);
  const disquietMarkup = html.slice(html.indexOf('id="disquiet-preview-workbench"'), html.indexOf('id="reddit-preview-workbench"'));
  assert.doesNotMatch(`${disquietMarkup}\n${disquietRenderer}`, /disquiet\.io|<video\b|<iframe\b|<img\b|upvote|reaction|actual product|schedule/i);

  assert.match(css, /\.disquiet-preview-workbench\s*\{/);
  assert.match(css, /\.disquiet-draft-preview\s*\{/);
  assert.match(css, /\.disquiet-draft-post p\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.disquiet-draft-link\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.disquiet-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Reddit 탭은 facts와 사람이 직접 작성한 session-only 초안을 분리한다", () => {
  assert.match(html, /id="reddit-preview-workbench"/);
  assert.match(html, /id="reddit-editor-view"/);
  assert.match(html, /id="reddit-preview-view"/);
  assert.match(html, /id="reddit-preview-panel"/);
  assert.match(html, /id="reddit-brief-form"/);
  assert.match(html, /id="reddit-title-input"/);
  assert.match(html, /id="reddit-body-input"/);
  assert.match(html, /Reddit 게시 전 미리보기/);
  assert.match(html, /직접 작성 미리보기/);
  assert.match(html, /Desktop · 640px/);
  assert.match(html, /모바일 · 390px/);

  assert.match(app, /from "\/reddit-preview\.mjs"/);
  assert.match(app, /function currentRedditPreviewModel/);
  assert.match(app, /function appendRedditPreview/);
  assert.match(app, /function renderRedditPreview/);
  assert.match(app, /function selectRedditPreviewMode/);
  assert.match(app, /previewSpecForChannel\("reddit"\)/);
  const redditRenderer = app.slice(app.indexOf("function currentRedditPreviewModel"), app.indexOf("function currentTikTokPreviewModel"));
  assert.match(redditRenderer, /textContent = model\.manualDraft\.title/);
  assert.match(redditRenderer, /textContent = model\.manualDraft\.body/);
  assert.match(redditRenderer, /textContent = model\.facts\.facts/);
  assert.doesNotMatch(redditRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /redditPreviewMode|redditPreviewViewport|redditBrief/);
  const redditMarkup = html.slice(html.indexOf('id="reddit-preview-workbench"'), html.indexOf('id="compare-editors"'));
  assert.doesNotMatch(`${redditMarkup}\n${redditRenderer}`, /reddit\.com|<video\b|<iframe\b|<img\b|avatar|vote|reaction|comment count|actual account|schedule/i);

  assert.match(css, /\.reddit-preview-workbench\s*\{/);
  assert.match(css, /\.reddit-draft-preview\s*\{/);
  assert.match(css, /\.reddit-draft-copy p\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.reddit-draft-facts p\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.reddit-draft-readiness dd\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.reddit-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Indie Hackers 탭은 작성자 경험과 원고를 분리한 local-only 토론 초안 미리보기를 제공한다", () => {
  assert.match(html, /id="indie-hackers-preview-workbench"/);
  assert.match(html, /id="indie-hackers-editor-view"/);
  assert.match(html, /id="indie-hackers-preview-view"/);
  assert.match(html, /id="indie-hackers-preview-panel"/);
  assert.match(html, /Indie Hackers 토론 초안 미리보기/);
  assert.match(html, /Desktop · 640px/);
  assert.match(html, /모바일 · 390px/);

  assert.match(app, /from "\/indie-hackers-preview\.mjs"/);
  assert.match(app, /function currentIndieHackersPreviewModel/);
  assert.match(app, /function appendIndieHackersPreview/);
  assert.match(app, /function renderIndieHackersPreview/);
  assert.match(app, /previewSpecForChannel\("indieHackers"\)/);
  const indieRenderer = app.slice(app.indexOf("function currentIndieHackersPreviewModel"), app.indexOf("function currentTikTokPreviewModel"));
  assert.match(indieRenderer, /textContent = model\.content\.title/);
  assert.match(indieRenderer, /textContent = model\.content\.body/);
  assert.doesNotMatch(indieRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /indieHackersPreviewMode|indieHackersPreviewViewport/);
  const indieMarkup = html.slice(html.indexOf('id="indie-hackers-preview-workbench"'), html.indexOf('id="compare-editors"'));
  assert.doesNotMatch(`${indieMarkup}\n${indieRenderer}`, /indiehackers\.com|<video\b|<iframe\b|<img\b|avatar|reaction|comment count|actual thread|schedule/i);

  assert.match(css, /\.indie-hackers-preview-workbench\s*\{/);
  assert.match(css, /\.indie-hackers-draft-preview\s*\{/);
  assert.match(css, /\.indie-hackers-draft-body p\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.indie-hackers-draft-experience dd\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.indie-hackers-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("DEV 탭은 facts와 session-only 사람이 작성한 article 준비 화면을 분리한다", () => {
  assert.match(html, /id="dev-preview-workbench"/);
  assert.match(html, /id="dev-editor-view"/);
  assert.match(html, /id="dev-preview-view"/);
  assert.match(html, /id="dev-preview-panel"/);
  assert.match(html, /id="dev-title-input"/);
  assert.match(html, /id="dev-body-input"/);
  assert.match(html, /DEV article 준비 미리보기/);

  assert.match(app, /from "\/dev-preview\.mjs"/);
  assert.match(app, /function renderDevPreview/);
  assert.match(app, /function selectDevPreview/);
  assert.match(app, /previewSpecForChannel\("dev"\)/);
  const devRenderer = app.slice(app.indexOf("function renderDevPreview"), app.indexOf("function appendTikTokPreview"));
  assert.match(devRenderer, /textContent=model\.article\.title/);
  assert.match(devRenderer, /textContent=model\.article\.body/);
  assert.doesNotMatch(devRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /devPreviewMode|devBrief/);
  const devMarkup = html.slice(html.indexOf('id="dev-preview-workbench"'), html.indexOf('id="compare-editors"'));
  assert.doesNotMatch(`${devMarkup}\n${devRenderer}`, /dev\.to|<video\b|<iframe\b|<img\b|avatar|reaction|comment count|actual account|schedule/i);

  assert.match(css, /\.dev-preview-workbench\s*\{/);
  assert.match(css, /\.dev-article-proof\s*\{/);
  assert.match(css, /\.dev-article-proof p,\.dev-article-proof dd\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.dev-article-proof p,\.dev-article-proof dd\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

test("OKKY 탭은 기존 원고와 session-only 게시 문맥·규칙 확인을 분리한다", () => {
  assert.match(html, /id="okky-preview-workbench"/);
  assert.match(html, /id="okky-editor-view"/);
  assert.match(html, /id="okky-preview-view"/);
  assert.match(html, /id="okky-preview-panel"/);
  assert.match(html, /id="okky-context-input"/);
  assert.match(html, /OKKY 커뮤니티 글 미리보기/);
  assert.match(html, /Desktop · 640px/);
  assert.match(html, /모바일 · 390px/);

  assert.match(app, /from "\/okky-preview\.mjs"/);
  assert.match(app, /function currentOkkyPreviewModel/);
  assert.match(app, /function appendOkkyPreview/);
  assert.match(app, /function renderOkkyPreview/);
  assert.match(app, /function selectOkkyPreviewMode/);
  assert.match(app, /previewSpecForChannel\("okky"\)/);
  const okkyRenderer = app.slice(app.indexOf("function currentOkkyPreviewModel"), app.indexOf("function appendTikTokPreview"));
  assert.match(okkyRenderer, /textContent = model\.content\.title/);
  assert.match(okkyRenderer, /textContent = model\.content\.body/);
  assert.doesNotMatch(okkyRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /okkyPreviewMode|okkyPreviewViewport|okkyBrief/);
  const okkyMarkup = html.slice(html.indexOf('id="okky-preview-workbench"'), html.indexOf('id="compare-editors"'));
  assert.doesNotMatch(`${okkyMarkup}\n${okkyRenderer}`, /okky\.kr|<video\b|<iframe\b|<img\b|avatar|recommendation|comment count|actual account|schedule/i);

  assert.match(css, /\.okky-preview-workbench\s*\{/);
  assert.match(css, /\.okky-draft-preview\s*\{/);
  assert.match(css, /\.okky-draft-copy > p:last-child\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.okky-draft-gates dd\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.okky-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("GeekNews 탭은 Show 고정 원고와 source/demo·수동 readiness를 로컬에서만 검토한다", () => {
  assert.match(html, /id="geeknews-preview-workbench"/);
  assert.match(html, /id="geeknews-editor-view"/);
  assert.match(html, /id="geeknews-preview-view"/);
  assert.match(html, /id="geeknews-preview-panel"/);
  assert.match(html, /GeekNews Show 원고 미리보기/);
  assert.match(html, /Desktop · 640px/);
  assert.match(html, /모바일 · 390px/);

  assert.match(app, /from "\/geeknews-preview\.mjs"/);
  assert.match(app, /function currentGeekNewsPreviewModel/);
  assert.match(app, /function appendGeekNewsPreview/);
  assert.match(app, /function renderGeekNewsPreview/);
  assert.match(app, /function selectGeekNewsPreviewMode/);
  assert.match(app, /previewSpecForChannel\("geeknews"\)/);
  const geeknewsRenderer = app.slice(app.indexOf("function currentGeekNewsPreviewModel"), app.indexOf("function appendTikTokPreview"));
  assert.match(geeknewsRenderer, /textContent = model\.content\.title/);
  assert.match(geeknewsRenderer, /textContent = model\.content\.body/);
  assert.match(geeknewsRenderer, /등록 유형 · SHOW/);
  assert.doesNotMatch(geeknewsRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /geeknewsPreviewMode|geeknewsPreviewViewport/);
  const geeknewsMarkup = html.slice(html.indexOf('id="geeknews-preview-workbench"'), html.indexOf('id="compare-editors"'));
  assert.doesNotMatch(`${geeknewsMarkup}\n${geeknewsRenderer}`, /news\.hada\.io|<video\b|<iframe\b|<img\b|avatar|score|comment|actual account|schedule/i);

  assert.match(css, /\.geeknews-preview-workbench\s*\{/);
  assert.match(css, /\.geeknews-show-proof\s*\{/);
  assert.match(css, /\.geeknews-show-copy > p:last-child\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.geeknews-show-readiness dd\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.geeknews-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("Show HN 탭은 생성 원고와 분리된 session-only 직접 작성 미리보기만 제공한다", () => {
  assert.match(html, /id="show-hn-preview-workbench"/);
  assert.match(html, /id="show-hn-author-view"/);
  assert.match(html, /id="show-hn-preview-view"/);
  assert.match(html, /id="show-hn-title-input"/);
  assert.match(html, /id="show-hn-body-input"/);
  assert.match(html, /id="show-hn-handwritten-input"/);
  assert.match(html, /AI 생성·번역·교정을 사용하지 않았습니다/);
  assert.match(html, /Desktop · 640px/);
  assert.match(html, /모바일 · 390px/);

  assert.match(app, /from "\/show-hn-preview\.mjs"/);
  assert.match(app, /function currentShowHnPreviewModel/);
  assert.match(app, /function appendShowHnPreview/);
  assert.match(app, /function renderShowHnPreview/);
  assert.match(app, /function selectShowHnPreviewMode/);
  assert.match(app, /previewSpecForChannel\("showHn"\)/);
  const showHnRenderer = app.slice(app.indexOf("function currentShowHnPreviewModel"), app.indexOf("function appendTikTokPreview"));
  assert.match(showHnRenderer, /textContent = model\.content\.title/);
  assert.match(showHnRenderer, /textContent = model\.content\.body/);
  assert.doesNotMatch(showHnRenderer, /fetch\s*\(|innerHTML|insertAdjacentHTML|state\.documents|approval-revisions|publish-intents|dry-runs|credentialHandle|appId|profileId/);
  const workspaceSnapshot = app.slice(app.indexOf("function createWorkspaceSnapshot"), app.indexOf("function persistWorkspace"));
  assert.doesNotMatch(workspaceSnapshot, /showHnPreviewMode|showHnPreviewViewport|showHnBrief/);
  const showHnMarkup = html.slice(html.indexOf('id="show-hn-preview-workbench"'), html.indexOf('id="compare-editors"'));
  assert.doesNotMatch(`${showHnMarkup}\n${showHnRenderer}`, /news\.ycombinator\.com|<video\b|<iframe\b|<img\b|avatar|vote|comment count|actual account|submit|schedule/i);

  assert.match(css, /\.show-hn-preview-workbench\s*\{/);
  assert.match(css, /\.show-hn-author-proof\s*\{/);
  assert.match(css, /\.show-hn-author-copy > p:last-child\s*\{[^}]*white-space:\s*pre-wrap/s);
  assert.match(css, /\.show-hn-author-gates dd\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.show-hn-preview-proof\[data-viewport="mobile"\]/);
  assert.match(css, /@media \(forced-colors: active\)/);
});
