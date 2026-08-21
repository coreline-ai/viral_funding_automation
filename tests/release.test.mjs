import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { loadGrokRuntimeConfig } from "../src/grok-oauth-proxy.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const readme = readFileSync(join(root, "README.md"), "utf8");
const goLiveChecklist = readFileSync(join(root, "reviews/automation/AUTOMATION_GO_LIVE_CHECKLIST.md"), "utf8");
const SECRET = /sk-[a-zA-Z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|\/Users\/[A-Za-z0-9._-]+\/\.(grok|codex)\/|XAI_API_KEY\s*=\s*\S+|OPENAI_API_KEY\s*=\s*\S+/;

test("README가 Proxy 로그인 경계·상태·자동 게시 금지·로컬 API 경계와 맞다", () => {
  assert.match(readme, /proxy-codex/);
  assert.match(readme, /VIRAL_CODEX_PROXY_SECRET_FILE/);
  assert.doesNotMatch(readme, /^codex login$/m);
  assert.match(readme, /contentStatus|콘텐츠/);
  assert.match(readme, /operationsStatus|운영/);
  assert.match(readme, /approvalStatus|승인/);
  assert.match(readme, /reference_ready/);
  assert.match(readme, /앱은 게시하지 않습니다/);
  assert.match(readme, /openapi\/viral-api\.v1\.yaml/);
  assert.match(readme, /127\.0\.0\.1/);
  assert.match(readme, /TLS·pairing/);
  assert.match(readme, /queue 1/);
  assert.doesNotMatch(readme, /XAI_API_KEY=|OPENAI_API_KEY=/);
});

test("기본 provider queue는 1이다", () => {
  const config = loadGrokRuntimeConfig({ GROK_BIN: "/usr/bin/grok" });
  assert.equal(config.queueConcurrency, 1);
});

test("자동 게시 Go/No-Go 정본은 외부 입력 전 NO-GO와 live write 0을 유지한다", () => {
  assert.match(goLiveChecklist, /NO_GO_PENDING_EXTERNAL_INPUTS/);
  assert.match(goLiveChecklist, /live social write route: `0`/);
  assert.match(goLiveChecklist, /실제 게시·업로드·예약 capability: `false`/);
  assert.match(goLiveChecklist, /Threads만/);
  assert.doesNotMatch(goLiveChecklist, SECRET);
});

test("검증 출시팩 generated에 CLI 24개 파일이 있다", async () => {
  const dir = join(root, "campaigns/memory_node_graph/2026-08-first-launch/generated");
  const names = new Set(await readdir(dir));
  for (const name of [
    "project-summary.json", "project-summary.md", "viral-hooks.md",
    "x-single-1.md", "x-single-2.md", "x-single-3.md", "x-thread.md",
    "threads-series.md", "reddit-post.md", "linkedin-post.md", "disquiet-product.md",
    "facebook-post.md", "instagram-reels.md", "product-hunt-launch.md",
    "peerlist-launchpad.md", "indie-hackers-post.md", "okky-post.md",
    "geeknews-show.md", "dev-article.md", "youtube-shorts.md", "show-hn.md",
    "short-post.md", "community-post.md", "long-post.md",
  ]) {
    assert.ok(names.has(name), name);
  }
});

test("추적 파일에 토큰·홈 인증 경로가 없다", () => {
  const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((name) => !/\.(png|mp4|svg|jpg|jpeg|gif|webp)$/i.test(name))
    .filter((name) => !name.startsWith("tests/") || name.startsWith("tests/fixtures/"));
  for (const name of files) {
    const text = readFileSync(join(root, name), "utf8");
    assert.doesNotMatch(text, SECRET, name);
  }
});

test("제품 저장소는 .grok 스킬을 추적하지 않는다", () => {
  const tracked = execFileSync("git", ["ls-files", ".grok"], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(tracked, "");
});
