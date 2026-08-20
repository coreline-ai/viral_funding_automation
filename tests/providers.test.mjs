import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FakeGrokTextRunner, resolveCliBinary } from "../src/grok-oauth-proxy.mjs";
import { classifyReadiness, createOAuthTextProvider, parseCodexStdout } from "../src/providers/oauth-text.mjs";

test("PATH에서 CLI 절대 경로를 찾고 상대 경로는 거절한다", async () => {
  const dir = await mkdtemp(join(tmpdir(), "viral-bin-"));
  const grok = join(dir, "grok");
  await writeFile(grok, "#!/bin/sh\n", { mode: 0o755 });
  assert.equal(resolveCliBinary({ names: ["grok"], pathValue: dir, fallbacks: [] }), grok);
  assert.throws(() => resolveCliBinary({ explicit: "grok" }), /절대 경로/);
});

test("readiness 상태와 fake provider compose/review 계약이 같다", async () => {
  assert.equal(classifyReadiness({}).status, "unavailable");
  assert.equal(classifyReadiness({ installed: true, resolvedBin: "/bin/grok" }).status, "installed");
  assert.equal(classifyReadiness({ installed: true, resolvedBin: "/bin/grok", auth: "ready" }).status, "ready");
  assert.equal(classifyReadiness({ installed: true, resolvedBin: "/bin/grok", auth: "login_required" }).status, "login_required");
  const handler = async (request) => ({ echoed: request.prompt, mode: request.mode ?? "compose" });
  const grok = createOAuthTextProvider("grok", new FakeGrokTextRunner(handler));
  const codex = createOAuthTextProvider("codex", new FakeGrokTextRunner(handler));
  const composed = await grok.compose({ prompt: "hello" });
  const reviewed = await codex.review({ prompt: "hello" });
  assert.equal(composed.payload.echoed, "hello");
  assert.equal(reviewed.payload.mode, "review");
  assert.equal((await grok.readiness()).status, "ready");
  assert.deepEqual(parseCodexStdout(`${JSON.stringify({ type: "event" })}\n${JSON.stringify({ text: JSON.stringify({ pong: "ok" }) })}`), { pong: "ok" });
});

test("실제 grok·codex --version이 있으면 readiness installed로 분류한다", async () => {
  const { CliCodexTextRunner, CliGrokTextRunner, loadCodexRuntimeConfig, loadGrokRuntimeConfig } = await import("../src/grok-oauth-proxy.mjs");
  const grokConfig = loadGrokRuntimeConfig({});
  const grok = await new CliGrokTextRunner(grokConfig).readiness();
  assert.ok(["installed", "unavailable"].includes(grok.status));
  assert.ok(grok.resolvedBin);
  if (grok.status === "installed") assert.match(grok.version, /grok/i);
  const codexConfig = loadCodexRuntimeConfig({});
  const codex = await new CliCodexTextRunner(codexConfig).readiness();
  assert.ok(["installed", "unavailable"].includes(codex.status));
  if (codex.status === "installed") assert.match(codex.version, /codex/i);
});
