import assert from "node:assert/strict";
import test from "node:test";

import { CliCodexTextRunner, FakeGrokTextRunner, GROK_TEXT_SYSTEM_PROMPT, childEnvironment, grokDisallowedTools, loadCodexRuntimeConfig, loadGrokRuntimeConfig, normalizeTranslationProvider } from "../src/grok-oauth-proxy.mjs";
import { CliGrokTextRunner } from "../src/grok-oauth-proxy.mjs";
import { buildGrokPrompt, englishOutputSchema, translatePublishFields, validateTranslateRequest } from "../src/translation.mjs";

test("자식 환경에서 XAI_API_KEY를 제거한다", () => {
  const previous = process.env.XAI_API_KEY;
  const previousOpenAi = process.env.OPENAI_API_KEY;
  process.env.XAI_API_KEY = "should-not-leak";
  process.env.OPENAI_API_KEY = "should-not-leak-openai";
  try {
    const env = childEnvironment();
    assert.equal(env.XAI_API_KEY, undefined);
    assert.equal(env.OPENAI_API_KEY, undefined);
    assert.ok(env.PATH);
  } finally {
    if (previous === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = previous;
    if (previousOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAi;
  }
});

test("GROK_BIN은 절대 경로만 허용한다", () => {
  assert.throws(() => loadGrokRuntimeConfig({ GROK_BIN: "grok" }), /절대 경로/);
  assert.throws(() => loadCodexRuntimeConfig({ CODEX_BIN: "codex" }), /절대 경로/);
  assert.equal(normalizeTranslationProvider(undefined), "grok");
  assert.equal(normalizeTranslationProvider("codex"), "codex");
  assert.throws(() => normalizeTranslationProvider("claude"), /grok 또는 codex/);
});

test("번역 runner는 기본 reasoning을 low로 두고 에이전트 경로를 끈다", () => {
  const config = loadGrokRuntimeConfig({ GROK_BIN: "/usr/bin/grok" });
  assert.equal(config.reasoningEffort, "low");
  assert.equal(config.permissionMode, "dontAsk");
  assert.throws(() => loadGrokRuntimeConfig({ GROK_BIN: "/usr/bin/grok", GROK_REASONING_EFFORT: "ultra" }), /GROK_REASONING_EFFORT/);
  assert.throws(() => loadGrokRuntimeConfig({ GROK_BIN: "/usr/bin/grok", GROK_PERMISSION_MODE: "bypassPermissions" }), /GROK_PERMISSION_MODE/);
});

test("CLI runner는 prompt-file과 disallowed-tools를 사용한다", async () => {
  const argsSeen = [];
  const runner = new CliGrokTextRunner({ cliCommand: "/usr/bin/grok", timeoutMs: 1000 }, async (_command, args) => {
    argsSeen.push(args);
    return { code: 0, stdout: JSON.stringify({ englishSummary: { oneSentence: "A", shortIntro: "B", features: [], demoBoundary: "C" }, publishFields: { body: "AI Systems Atlas https://example.com" } }), stderr: "" };
  });
  await runner.run({
    requestId: "req_1",
    prompt: "hello",
    schema: { type: "object" },
  });
  const args = argsSeen[0];
  assert.ok(args.includes("--prompt-file"));
  assert.ok(args.includes("--json-schema"));
  assert.ok(args.includes("--disallowed-tools"));
  assert.ok(args.includes("--verbatim"));
  assert.ok(args.includes("--no-plan"));
  assert.equal(args[args.indexOf("--reasoning-effort") + 1], "low");
  assert.equal(args[args.indexOf("--permission-mode") + 1], "dontAsk");
  assert.equal(args[args.indexOf("--system-prompt-override") + 1], GROK_TEXT_SYSTEM_PROMPT);
  assert.equal(args[args.indexOf("--disallowed-tools") + 1], grokDisallowedTools);
});

test("Codex runner는 exec와 output-schema를 사용한다", async () => {
  const argsSeen = [];
  let stdinSeen = "";
  const runner = new CliCodexTextRunner({ cliCommand: "/usr/bin/codex", timeoutMs: 1000 }, async (_command, args, options) => {
    argsSeen.push(args);
    stdinSeen = options.stdin;
    assert.match(args[args.indexOf("--output-schema") + 1], /schema\.json$/);
    return {
      code: 0,
      stdout: JSON.stringify({ englishSummary: { oneSentence: "A", shortIntro: "B", features: [], demoBoundary: "C" }, publishFields: { body: "ok" } }),
      stderr: "",
    };
  });
  const result = await runner.run({
    requestId: "req_codex",
    prompt: "hello",
    schema: { type: "object" },
  });
  assert.ok(argsSeen[0].includes("exec"));
  assert.ok(argsSeen[0].includes("--ephemeral"));
  assert.ok(argsSeen[0].includes("--output-schema"));
  assert.ok(argsSeen[0].includes("--skip-git-repo-check"));
  assert.ok(argsSeen[0].includes("--ignore-user-config"));
  assert.equal(argsSeen[0][argsSeen[0].indexOf("--sandbox") + 1], "read-only");
  assert.ok(!argsSeen[0].includes("workspace-write"));
  assert.ok(!argsSeen[0].includes("-o"));
  assert.match(stdinSeen, /hello/);
  assert.equal(result.payload.publishFields.body, "ok");
});

test("출력 한도를 넘기면 원문을 저장하지 않고 거절한다", async () => {
  const runner = new CliGrokTextRunner({ cliCommand: "/usr/bin/grok", timeoutMs: 1000, maxOutputChars: 64 }, async () => ({
    code: 0,
    stdout: "x".repeat(80),
    stderr: "",
  }));
  await assert.rejects(() => runner.run({ requestId: "req_limit", prompt: "hello", schema: { type: "object" } }), /출력 한도/);
});

test("fake runner로 허용 채널 영문 필드가 생성된다", async () => {
  const runner = new FakeGrokTextRunner(async () => ({
    englishSummary: { oneSentence: "Atlas explores notes.", shortIntro: "A graph explorer.", features: ["links"], demoBoundary: "read-only demo" },
    publishFields: { body: "AI Systems Atlas https://memory.example" },
  }));
  const result = await translatePublishFields({
    channel: "x1",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { body: "AI Systems Atlas 데모 https://memory.example" },
    facts: { name: "AI Systems Atlas", repositoryUrl: "https://github.com/a/b", demoUrl: "https://memory.example", license: "MIT", technologies: [] },
  }, { runner });
  assert.equal(result.schemaVersion, "viral-translation/v1");
  assert.match(result.publishFields.body, /AI Systems Atlas/);
});

test("Show HN과 없는 필드는 Grok 실행 전에 거부한다", async () => {
  const runner = new FakeGrokTextRunner(async () => {
    throw new Error("should not run");
  });
  assert.throws(() => validateTranslateRequest({
    channel: "showHn",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: {},
    facts: {},
  }), /영문 재구성/);
  await assert.rejects(() => translatePublishFields({
    channel: "x1",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { body: "hello" },
    facts: { name: "hello" },
  }, {
    runner: new FakeGrokTextRunner(async () => ({
      englishSummary: { oneSentence: "x", shortIntro: "y", features: [], demoBoundary: "z" },
      publishFields: { body: "hello", extra: "nope" },
    })),
  }), /body:string/);
  assert.equal(runner.calls.length, 0);
});

test("출력 스키마와 프롬프트는 레지스트리 필드 계약을 강제한다", () => {
  for (const [channel, field, kind] of [
    ["xThread", "segments", "array"],
    ["threads", "posts", "array"],
    ["shorts", "shots", "array"],
    ["x1", "body", "string"],
  ]) {
    const schema = englishOutputSchema(channel);
    assert.deepEqual(schema.properties.publishFields.required, channel === "shorts" ? ["title", "description", "shots"] : [field]);
    assert.equal(schema.properties.publishFields.additionalProperties, false);
    assert.equal(schema.properties.publishFields.properties[field].type, kind);
    if (kind === "array") assert.ok(!schema.properties.publishFields.properties.body);
  }
  const prompt = buildGrokPrompt({
    channel: "xThread",
    targetLocale: "en-US",
    publishFields: { segments: ["1/3 AI Systems Atlas", "2/3", "3/3 https://memory.example"] },
    facts: { name: "AI Systems Atlas", demoUrl: "https://memory.example" },
  });
  assert.match(prompt, /segments:string\[\]/);
  assert.match(prompt, /Do not collapse array fields/);
});

test("Grok 출력이 레지스트리 계약과 다르면 거절하고 변환하지 않는다", async () => {
  const facts = { name: "AI Systems Atlas", repositoryUrl: "https://github.com/a/b", demoUrl: "https://memory.example", license: "MIT", technologies: [] };
  const summary = { oneSentence: "AI Systems Atlas", shortIntro: "x", features: [], demoBoundary: "https://memory.example" };
  await assert.rejects(() => translatePublishFields({
    channel: "xThread",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { segments: ["1/3 AI Systems Atlas", "2/3 기능", "3/3 https://memory.example"] },
    facts,
  }, {
    runner: new FakeGrokTextRunner(async () => ({
      englishSummary: summary,
      publishFields: { body: "1/3 What we built\n\n---\n\n2/3\n\n---\n\n3/3 https://memory.example" },
    })),
  }), /segments:string\[\]/);
  await assert.rejects(() => translatePublishFields({
    channel: "threads",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { posts: ["문제 AI Systems Atlas", "해결 https://memory.example"] },
    facts,
  }, {
    runner: new FakeGrokTextRunner(async () => ({
      englishSummary: summary,
      publishFields: { body: "Problem\n\n---\n\nFix https://memory.example" },
    })),
  }), /posts:string\[\]/);
  const recovered = validateTranslateRequest({
    channel: "xThread",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { body: "1/3 AI Systems Atlas\n\n---\n\n2/3 https://memory.example" },
    facts,
  });
  assert.deepEqual(recovered.publishFields.segments, ["1/3 AI Systems Atlas", "2/3 https://memory.example"]);
  const result = await translatePublishFields({
    channel: "xThread",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { segments: ["1/3 AI Systems Atlas", "2/3 기능", "3/3 https://memory.example"] },
    facts,
  }, {
    runner: new FakeGrokTextRunner(async () => ({
      englishSummary: summary,
      publishFields: {
        segments: [
          "1/3 What we built\n\nAI Systems Atlas",
          "2/3 How to check",
          "3/3 Try it\n\nhttps://memory.example",
        ],
      },
    })),
  });
  assert.equal(result.publishFields.segments.length, 3);
});

test("원문에 없는 성과·평가와 X 길이 초과 결과는 거절한다", async () => {
  const facts = { name: "Atlas", repositoryUrl: "https://github.com/a/b", demoUrl: "", license: "MIT", technologies: [] };
  const summary = { oneSentence: "Atlas", shortIntro: "x", features: [], demoBoundary: "none" };
  await assert.rejects(() => translatePublishFields({
    channel: "x1",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { body: "Atlas 소개" },
    facts,
  }, {
    runner: new FakeGrokTextRunner(async () => ({
      englishSummary: summary,
      publishFields: { body: "Atlas is revolutionary with 999999 users" },
    })),
  }), /평가·단정|사용자·스타/);
  await assert.rejects(() => translatePublishFields({
    channel: "x1",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { body: "Atlas 소개" },
    facts,
  }, {
    runner: new FakeGrokTextRunner(async () => ({
      englishSummary: summary,
      publishFields: { body: `Atlas ${"한".repeat(141)}` },
    })),
  }), /280/);
});

test("internal과 README는 요청에서 거부한다", () => {
  assert.throws(() => validateTranslateRequest({
    channel: "x1",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { body: "a" },
    internal: { notes: ["x"] },
  }), /내부/);
});
