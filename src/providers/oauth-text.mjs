export const READINESS_STATES = Object.freeze(["installed", "auth_unknown", "ready", "login_required", "unavailable"]);
export const AUTH_PROBE_TTL_MS = 60_000;

const authCache = new Map();

export function parseCodexStdout(stdout) {
  const raw = String(stdout ?? "").trim();
  if (!raw) throw new SyntaxError("empty");
  try {
    return JSON.parse(raw);
  } catch {
    // continue to JSONL
  }
  const lines = raw.split(/\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const event = JSON.parse(lines[index]);
      if (event?.structuredOutput && typeof event.structuredOutput === "object") return event.structuredOutput;
      const text = event?.item?.text ?? event?.text ?? event?.message;
      if (typeof text === "string" && text.trim()) {
        const unfenced = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        return JSON.parse(unfenced);
      }
    } catch {
      // try earlier line
    }
  }
  throw new SyntaxError("codex json");
}

export function classifyReadiness({ installed = false, version = "", resolvedBin = "", auth = null } = {}) {
  if (!installed || !resolvedBin) {
    return { status: "unavailable", ready: false, version, resolvedBin };
  }
  if (auth === "ready") return { status: "ready", ready: true, version, resolvedBin };
  if (auth === "login_required") return { status: "login_required", ready: false, version, resolvedBin };
  if (auth === "unknown") return { status: "auth_unknown", ready: false, version, resolvedBin };
  return { status: "installed", ready: false, version, resolvedBin };
}

export async function cachedAuthProbe(id, probe, now = Date.now()) {
  const hit = authCache.get(id);
  if (hit && now - hit.at < AUTH_PROBE_TTL_MS) return hit.result;
  const result = await probe();
  authCache.set(id, { at: now, result });
  return result;
}

export function clearAuthProbeCache() {
  authCache.clear();
}

export function createOAuthTextProvider(id, runner) {
  const controllerFor = new WeakMap();
  return {
    id,
    async readiness(options = {}) {
      return runner.readiness(options);
    },
    async compose(request, signal) {
      return runner.run(request, signal);
    },
    async review(request, signal) {
      return runner.run({ ...request, mode: "review" }, signal);
    },
    cancel(signal) {
      signal?.abort();
    },
    _controllerFor: controllerFor,
  };
}
