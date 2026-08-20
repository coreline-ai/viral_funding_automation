import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";

import { cachedAuthProbe, classifyReadiness, parseCodexStdout } from "./providers/oauth-text.mjs";

const OUTPUT_LIMIT = 32_768;
const DISALLOWED_TOOLS = "shell,file,edit,web,web_search,web_fetch,bash,read,write";
const REASONING_EFFORTS = new Set(["low", "medium", "high"]);
const PERMISSION_MODES = new Set(["dontAsk", "default"]);
export const GROK_TEXT_SYSTEM_PROMPT = "You rewrite social-channel publish fields into English. Do not use tools, browse, or write files. Output only JSON that matches the provided schema.";
export const TRANSLATION_PROVIDERS = Object.freeze(["grok", "codex"]);
export const CODEX_TEXT_SYSTEM_PROMPT = GROK_TEXT_SYSTEM_PROMPT;

export class GrokProxyError extends Error {
  constructor(code, message, { status = 400 } = {}) {
    super(message);
    this.name = "GrokProxyError";
    this.code = code;
    this.status = status;
  }
}

export class BoundedConversationQueue {
  #active = 0;
  #closed = false;
  #pending = [];

  constructor(maxConcurrency = 1, maxPending = 4) {
    if (maxConcurrency < 1 || maxPending < 1) throw new GrokProxyError("GROK_QUEUE_FULL", "queue 한도가 올바르지 않습니다.");
    this.maxConcurrency = maxConcurrency;
    this.maxPending = maxPending;
  }

  run(task) {
    if (this.#closed) return Promise.reject(new GrokProxyError("GROK_QUEUE_FULL", "번역 대기열이 닫혀 있습니다.", { status: 503 }));
    if (this.#active + this.#pending.length >= this.maxConcurrency + this.maxPending) {
      return Promise.reject(new GrokProxyError("GROK_QUEUE_FULL", "번역 요청이 많아 잠시 후 다시 시도하세요.", { status: 429 }));
    }
    return new Promise((resolvePromise, reject) => {
      this.#pending.push({ run: task, resolve: resolvePromise, reject });
      this.#kick();
    });
  }

  close() {
    this.#closed = true;
    for (const item of this.#pending.splice(0)) item.reject(new GrokProxyError("GROK_QUEUE_FULL", "번역 대기열이 닫혀 있습니다.", { status: 503 }));
  }

  snapshot() {
    return { active: this.#active, pending: this.#pending.length, maxConcurrency: this.maxConcurrency, maxPending: this.maxPending };
  }

  #kick() {
    while (!this.#closed && this.#active < this.maxConcurrency && this.#pending.length > 0) {
      const item = this.#pending.shift();
      this.#active += 1;
      void item.run().then(item.resolve, item.reject).finally(() => {
        this.#active -= 1;
        this.#kick();
      });
    }
  }
}

function integer(env, name, fallback, min, max) {
  const raw = env[name];
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw.trim())) throw new GrokProxyError("GROK_INVALID_OUTPUT", `${name}은 정수여야 합니다.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new GrokProxyError("GROK_INVALID_OUTPUT", `${name} 범위가 올바르지 않습니다.`);
  return value;
}

export function resolveCliBinary({
  explicit,
  names = [],
  pathValue = process.env.PATH,
  fallbacks = [],
  notFoundCode = "GROK_CLI_NOT_FOUND",
  relativeMessage = "CLI 경로는 절대 경로여야 합니다.",
} = {}) {
  const trimmed = String(explicit ?? "").trim();
  if (trimmed) {
    if (!isAbsolute(trimmed)) throw new GrokProxyError(notFoundCode, relativeMessage, { status: 503 });
    return trimmed;
  }
  const dirs = String(pathValue ?? "").split(delimiter).filter(Boolean);
  for (const name of names) {
    if (isAbsolute(name) && existsSync(name)) return name;
    for (const dir of dirs) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  for (const fallback of fallbacks) {
    if (isAbsolute(fallback) && existsSync(fallback)) return fallback;
  }
  return fallbacks.find((item) => isAbsolute(item)) ?? "";
}

function choice(env, name, fallback, allowed) {
  const raw = (env[name] ?? "").trim();
  if (!raw) return fallback;
  if (!allowed.has(raw)) throw new GrokProxyError("GROK_INVALID_OUTPUT", `${name} 값이 올바르지 않습니다.`);
  return raw;
}

export function loadGrokRuntimeConfig(env = process.env) {
  const cliCommand = resolveCliBinary({
    explicit: env.GROK_BIN,
    names: ["grok"],
    pathValue: env.PATH ?? process.env.PATH,
    fallbacks: [join(homedir(), ".grok", "bin", "grok")],
    notFoundCode: "GROK_CLI_NOT_FOUND",
    relativeMessage: "GROK_BIN은 절대 경로여야 합니다.",
  });
  if (!cliCommand || !isAbsolute(cliCommand)) throw new GrokProxyError("GROK_CLI_NOT_FOUND", "GROK_BIN은 절대 경로여야 합니다.", { status: 503 });
  return {
    cliCommand,
    timeoutMs: integer(env, "GROK_TEXT_TIMEOUT_MS", 90_000, 5_000, 300_000),
    maxOutputChars: integer(env, "GROK_TEXT_MAX_OUTPUT_CHARS", 8_000, 64, 32_000),
    queueConcurrency: integer(env, "GROK_TEXT_QUEUE_CONCURRENCY", 1, 1, 4),
    queueMaxPending: integer(env, "GROK_TEXT_QUEUE_MAX_PENDING", 4, 1, 32),
    reasoningEffort: choice(env, "GROK_REASONING_EFFORT", "low", REASONING_EFFORTS),
    permissionMode: choice(env, "GROK_PERMISSION_MODE", "dontAsk", PERMISSION_MODES),
  };
}

export function loadCodexRuntimeConfig(env = process.env) {
  const cliCommand = resolveCliBinary({
    explicit: env.CODEX_BIN,
    names: ["codex"],
    pathValue: env.PATH ?? process.env.PATH,
    fallbacks: [join(homedir(), "bin", "codex")],
    notFoundCode: "CODEX_CLI_NOT_FOUND",
    relativeMessage: "CODEX_BIN은 절대 경로여야 합니다.",
  });
  if (!cliCommand || !isAbsolute(cliCommand)) throw new GrokProxyError("CODEX_CLI_NOT_FOUND", "CODEX_BIN은 절대 경로여야 합니다.", { status: 503 });
  return {
    cliCommand,
    timeoutMs: integer(env, "CODEX_TEXT_TIMEOUT_MS", 90_000, 5_000, 300_000),
    maxOutputChars: integer(env, "CODEX_TEXT_MAX_OUTPUT_CHARS", 8_000, 64, 32_000),
  };
}

export function normalizeTranslationProvider(value) {
  const provider = value == null || value === "" ? "grok" : value;
  if (!TRANSLATION_PROVIDERS.includes(provider)) {
    throw new GrokProxyError("INVALID_PROVIDER", "번역 엔진은 grok 또는 codex만 지원합니다.");
  }
  return provider;
}

export function childEnvironment() {
  const env = {};
  for (const key of ["PATH", "HOME", "USER", "LOGNAME", "TMPDIR", "LANG", "LC_ALL"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  env.TERM = "dumb";
  env.NO_COLOR = "1";
  delete env.XAI_API_KEY;
  delete env.OPENAI_API_KEY;
  return env;
}

function looksLikeLoginRequired(text) {
  return /not logged|please (run )?(grok|codex) login|unauthoriz|sign in|로그인/i.test(String(text ?? ""));
}

function mapSpawnError(error, stdout = "", stderr = "", engine = "grok") {
  const isCodex = engine === "codex";
  if (error?.code === "ENOENT") {
    return new GrokProxyError(
      isCodex ? "CODEX_CLI_NOT_FOUND" : "GROK_CLI_NOT_FOUND",
      isCodex ? "Codex CLI를 찾을 수 없습니다. codex가 설치되어 있는지 확인하세요." : "Grok CLI를 찾을 수 없습니다. grok가 설치되어 있는지 확인하세요.",
      { status: 503 },
    );
  }
  const combined = `${stdout}\n${stderr}\n${error?.message ?? ""}`;
  if (looksLikeLoginRequired(combined)) {
    return new GrokProxyError(
      isCodex ? "CODEX_LOGIN_REQUIRED" : "GROK_LOGIN_REQUIRED",
      isCodex ? "Codex 로그인이 필요합니다. 터미널에서 codex login을 실행하세요." : "Grok 로그인이 필요합니다. 터미널에서 grok login을 실행하세요.",
      { status: 401 },
    );
  }
  if (/rate limit|too many requests/i.test(combined)) {
    return new GrokProxyError(
      isCodex ? "CODEX_RATE_LIMITED" : "GROK_RATE_LIMITED",
      isCodex ? "Codex 요청 한도에 도달했습니다. 잠시 후 다시 시도하세요." : "Grok 요청 한도에 도달했습니다. 잠시 후 다시 시도하세요.",
      { status: 429 },
    );
  }
  return new GrokProxyError(
    isCodex ? "CODEX_INVALID_OUTPUT" : "GROK_INVALID_OUTPUT",
    isCodex ? "Codex 실행 결과를 확인하지 못했습니다." : "Grok 실행 결과를 확인하지 못했습니다.",
    { status: 502 },
  );
}

export function parseStructuredPayload(text) {
  const raw = String(text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(raw);
}

function runChild(command, args, { cwd, env, timeoutMs, signal, stdin, engine = "grok", maxOutputChars = OUTPUT_LIMIT }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      detached: true,
      shell: false,
      stdio: [stdin == null ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let truncated = false;
    const limit = Math.min(OUTPUT_LIMIT, maxOutputChars);
    const terminate = (name) => {
      if (!child.pid) return;
      try { process.kill(-child.pid, name); } catch { child.kill(name); }
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      terminate("SIGTERM");
      setTimeout(() => terminate("SIGKILL"), 2000).unref();
    }, timeoutMs);
    const onAbort = () => terminate("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk) => {
      const next = chunk.toString("utf8");
      if (stdout.length + next.length > limit) {
        truncated = true;
        stdout += next.slice(0, Math.max(0, limit - stdout.length));
        return;
      }
      stdout += next;
    });
    child.stderr.on("data", (chunk) => {
      const next = chunk.toString("utf8");
      if (stderr.length <= OUTPUT_LIMIT) stderr += next.slice(0, Math.max(0, OUTPUT_LIMIT - stderr.length));
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(mapSpawnError(error, stdout, stderr, engine));
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) return reject(new GrokProxyError("GROK_TIMEOUT", "번역 요청이 취소되었습니다.", { status: 499 }));
      if (timedOut) return reject(new GrokProxyError("GROK_TIMEOUT", "Grok 요청 시간이 초과되었습니다.", { status: 504 }));
      if (truncated) return reject(new GrokProxyError(engine === "codex" ? "CODEX_INVALID_OUTPUT" : "GROK_INVALID_OUTPUT", "출력 한도를 초과했습니다.", { status: 502 }));
      resolvePromise({ code, stdout, stderr });
    });
    if (stdin != null) child.stdin.end(stdin);
  });
}

export class CliGrokTextRunner {
  constructor(config, spawnImpl = runChild) {
    this.config = config;
    this.spawnImpl = spawnImpl;
  }

  async readiness({ probeAuth = false } = {}) {
    const resolvedBin = this.config.cliCommand;
    try {
      const result = await this.spawnImpl(this.config.cliCommand, ["--version"], {
        cwd: tmpdir(),
        env: childEnvironment(),
        timeoutMs: 10_000,
        signal: new AbortController().signal,
        engine: "grok",
      });
      if (result.code !== 0) {
        return classifyReadiness({ installed: false, resolvedBin, version: result.stderr || result.stdout });
      }
      const version = result.stdout.trim();
      if (!probeAuth) return classifyReadiness({ installed: true, version, resolvedBin });
      const auth = await cachedAuthProbe(`grok:${resolvedBin}`, async () => {
        try {
          await this.run({
            requestId: "probe_grok",
            prompt: "Return {\"pong\":\"ok\"}",
            schema: { type: "object", additionalProperties: false, required: ["pong"], properties: { pong: { type: "string" } } },
          });
          return "ready";
        } catch (error) {
          return error?.code === "GROK_LOGIN_REQUIRED" ? "login_required" : "unknown";
        }
      });
      return classifyReadiness({ installed: true, version, resolvedBin, auth });
    } catch (error) {
      if (error instanceof GrokProxyError && error.code === "GROK_LOGIN_REQUIRED") {
        return classifyReadiness({ installed: true, resolvedBin, auth: "login_required" });
      }
      return classifyReadiness({ installed: false, resolvedBin, version: error.message });
    }
  }

  async run(request, signal = new AbortController().signal) {
    const workspace = mkdtempSync(join(tmpdir(), "viral-grok-"));
    mkdirSync(workspace, { recursive: true, mode: 0o700 });
    const promptPath = join(workspace, "prompt.txt");
    writeFileSync(promptPath, request.prompt, { encoding: "utf8", mode: 0o600 });
    const env = childEnvironment();
    if ("XAI_API_KEY" in env) delete env.XAI_API_KEY;
    try {
      const result = await this.spawnImpl(this.config.cliCommand, [
        "--prompt-file", promptPath,
        "--json-schema", JSON.stringify(request.schema),
        "--output-format", "json",
        "--disable-web-search",
        "--no-memory",
        "--no-subagents",
        "--no-plan",
        "--verbatim",
        "--reasoning-effort", this.config.reasoningEffort ?? "low",
        "--permission-mode", this.config.permissionMode ?? "dontAsk",
        "--max-turns", "1",
        "--disallowed-tools", DISALLOWED_TOOLS,
        "--system-prompt-override", GROK_TEXT_SYSTEM_PROMPT,
        "--cwd", workspace,
      ], {
        cwd: workspace,
        env,
        timeoutMs: this.config.timeoutMs,
        signal,
        engine: "grok",
        maxOutputChars: this.config.maxOutputChars ?? OUTPUT_LIMIT,
      });
      if (result.code !== 0) throw mapSpawnError(new Error(result.stderr || result.stdout), result.stdout, result.stderr, "grok");
      if ((result.stdout ?? "").length > (this.config.maxOutputChars ?? OUTPUT_LIMIT)) {
        throw new GrokProxyError("GROK_INVALID_OUTPUT", "출력 한도를 초과했습니다.", { status: 502 });
      }
      let parsed;
      try {
        parsed = JSON.parse(result.stdout);
      } catch {
        throw new GrokProxyError("GROK_INVALID_OUTPUT", "Grok 응답이 JSON이 아닙니다.", { status: 502 });
      }
      const payload = parsed?.structuredOutput
        ?? (typeof parsed?.text === "string" ? parseStructuredPayload(parsed.text) : parsed);
      return { requestId: request.requestId, payload, stdout: result.stdout, env };
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }
}

export class CliCodexTextRunner {
  constructor(config, spawnImpl = runChild) {
    this.config = config;
    this.spawnImpl = spawnImpl;
  }

  async readiness({ probeAuth = false } = {}) {
    const resolvedBin = this.config.cliCommand;
    try {
      const result = await this.spawnImpl(this.config.cliCommand, ["--version"], {
        cwd: tmpdir(),
        env: childEnvironment(),
        timeoutMs: 10_000,
        signal: new AbortController().signal,
        engine: "codex",
      });
      if (result.code !== 0 || !String(result.stdout).includes("codex")) {
        return classifyReadiness({ installed: false, resolvedBin, version: result.stderr || result.stdout });
      }
      const version = result.stdout.trim();
      if (!probeAuth) return classifyReadiness({ installed: true, version, resolvedBin });
      const auth = await cachedAuthProbe(`codex:${resolvedBin}`, async () => {
        try {
          await this.run({
            requestId: "probe_codex",
            prompt: "Return {\"pong\":\"ok\"}",
            schema: { type: "object", additionalProperties: false, required: ["pong"], properties: { pong: { type: "string" } } },
          });
          return "ready";
        } catch (error) {
          return error?.code === "CODEX_LOGIN_REQUIRED" ? "login_required" : "unknown";
        }
      });
      return classifyReadiness({ installed: true, version, resolvedBin, auth });
    } catch (error) {
      if (error instanceof GrokProxyError && error.code === "CODEX_LOGIN_REQUIRED") {
        return classifyReadiness({ installed: true, resolvedBin, auth: "login_required" });
      }
      return classifyReadiness({ installed: false, resolvedBin, version: error.message });
    }
  }

  async run(request, signal = new AbortController().signal) {
    const workspace = mkdtempSync(join(tmpdir(), "viral-codex-"));
    mkdirSync(workspace, { recursive: true, mode: 0o700 });
    const schemaPath = join(workspace, "schema.json");
    writeFileSync(schemaPath, JSON.stringify(request.schema), { encoding: "utf8", mode: 0o600 });
    const env = childEnvironment();
    delete env.XAI_API_KEY;
    delete env.OPENAI_API_KEY;
    try {
      const result = await this.spawnImpl(this.config.cliCommand, [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--ignore-rules",
        "--ignore-user-config",
        "--sandbox", "read-only",
        "--json",
        "-C", workspace,
        "--output-schema", schemaPath,
        "-",
      ], {
        cwd: workspace,
        env,
        timeoutMs: this.config.timeoutMs,
        signal,
        engine: "codex",
        maxOutputChars: this.config.maxOutputChars ?? OUTPUT_LIMIT,
        stdin: `${CODEX_TEXT_SYSTEM_PROMPT}\n${request.prompt}`,
      });
      if (result.code !== 0) throw mapSpawnError(new Error(result.stderr || result.stdout), result.stdout, result.stderr, "codex");
      if ((result.stdout ?? "").length > (this.config.maxOutputChars ?? OUTPUT_LIMIT)) {
        throw new GrokProxyError("CODEX_INVALID_OUTPUT", "출력 한도를 초과했습니다.", { status: 502 });
      }
      let payload;
      try {
        payload = parseCodexStdout(result.stdout);
      } catch {
        throw new GrokProxyError("CODEX_INVALID_OUTPUT", "Codex 응답이 JSON이 아닙니다.", { status: 502 });
      }
      return { requestId: request.requestId, payload, stdout: result.stdout, env };
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }
}

export class FakeGrokTextRunner {
  constructor(handler) {
    this.handler = handler;
    this.calls = [];
  }

  async readiness() {
    return { status: "ready", ready: true, version: "fake", resolvedBin: "fake" };
  }

  async run(request) {
    this.calls.push(request);
    if (this.handler) return { requestId: request.requestId, payload: await this.handler(request), env: childEnvironment() };
    throw new GrokProxyError("GROK_INVALID_OUTPUT", "Fake runner handler가 필요합니다.", { status: 502 });
  }
}

export const grokDisallowedTools = DISALLOWED_TOOLS;
