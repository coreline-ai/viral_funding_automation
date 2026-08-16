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
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
  assert.match(html, /id="draft-editor"/);
  assert.match(html, /id="copy-button"/);
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
  assert.match(app, /localStorage\.setItem/);
  assert.match(app, /localStorage\.getItem/);
  assert.match(app, /localStorage\.removeItem/);
  assert.match(app, /isStoredWorkspace/);
  assert.match(app, /restoreWorkspace/);
  assert.match(app, /baseline/);
  assert.match(app, /preflight/);
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
  assert.match(css, /#draft-editor\s*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /@media \(max-width: 1180px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.draft-tabs\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.draft-tabs button\s*\{[^}]*flex:\s*1 1 0/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /focus-visible/);
});

test("웹 실행 명령은 외부 프레임워크 없이 서버를 시작한다", () => {
  assert.equal(packageJson.scripts.web, "node src/server.mjs");
  assert.equal(packageJson.dependencies, undefined);
});

test("수정·탭 유지·복사 fallback·Markdown 다운로드 안전장치를 포함한다", () => {
  assert.match(app, /state\.drafts\[state\.activeDraft\]/);
  assert.match(app, /navigator\.clipboard/);
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
