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
  assert.equal((html.match(/role="tab"/g) ?? []).length, 18);
  for (const label of ["X 1안", "X 스레드", "Threads", "Reddit", "LinkedIn", "Disquiet", "GeekNews", "DEV", "Shorts", "Show HN", "Facebook", "Instagram", "Product Hunt", "Peerlist", "Indie Hackers", "OKKY"]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.match(html, /전체 바이럴 채널 상태/);
  assert.equal((html.match(/class="channel-grid"/g) ?? []).length, 1);
  assert.equal((html.match(/<article data-state=/g) ?? []).length, 19);
  assert.match(html, /Facebook·Instagram·Product Hunt·Peerlist·Indie Hackers·OKKY/);
  assert.match(html, /id="draft-editor"/);
  assert.match(html, /id="translation-editor"/);
  assert.match(html, /id="locale-select"/);
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
  assert.match(app, /STORAGE_VERSION = 4/);
  assert.match(app, /migrateStoredWorkspace/);
  assert.match(app, /workspace\.version === 1/);
  assert.match(app, /workspace\.version !== 2/);
  assert.match(app, /upgradeWorkspaceToV4/);
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
  assert.equal(packageJson.dependencies, undefined);
});

test("수정·탭 유지·복사 fallback·Markdown 다운로드 안전장치를 포함한다", () => {
  assert.match(app, /state\.documents/);
  assert.match(app, /\/api\/v1\/drafts\/compose/);
  assert.match(app, /\/api\/v1\/drafts\/review/);
  assert.match(app, /\/api\/v1\/drafts\/validate/);
  assert.match(app, /\/api\/v1\/providers\/readiness/);
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
