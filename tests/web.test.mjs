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
