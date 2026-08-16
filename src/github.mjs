const GITHUB_HOST = "github.com";
const DEFAULT_API_BASE = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(message, { status = 0, url = "" } = {}) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.url = url;
  }
}

export function parseGitHubRepoUrl(value) {
  if (!value || typeof value !== "string") {
    throw new TypeError("--repo에 공개 GitHub 저장소 URL이 필요합니다.");
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new TypeError("GitHub 저장소 URL 형식이 아닙니다.");
  }

  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== GITHUB_HOST) {
    throw new TypeError("https://github.com/<owner>/<repo> 형식만 지원합니다.");
  }

  const segments = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new TypeError("저장소 루트 URL만 지원합니다.");
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  const validSegment = /^[A-Za-z0-9_.-]+$/;
  if (!validSegment.test(owner) || !validSegment.test(repo)) {
    throw new TypeError("owner 또는 repository 이름이 올바르지 않습니다.");
  }

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    url: `https://${GITHUB_HOST}/${owner}/${repo}`,
  };
}

function requestHeaders(token, accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    "User-Agent": "viral-funding-automation-mvp",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(fetchImpl, url, { token, accept, optional = false } = {}) {
  const response = await fetchImpl(url, { headers: requestHeaders(token, accept) });
  if (optional && response.status === 404) return null;
  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const suffix = remaining === "0" ? " GitHub API rate limit을 확인하세요." : "";
    throw new GitHubApiError(`GitHub API 요청 실패: HTTP ${response.status}.${suffix}`, {
      status: response.status,
      url,
    });
  }
  return response;
}

async function readOptionalJson(fetchImpl, url, options) {
  const response = await request(fetchImpl, url, { ...options, optional: true });
  if (!response) return null;
  try {
    return JSON.parse(await response.text());
  } catch {
    return null;
  }
}

function publicCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

async function readRepositoryMetadata(parsed, { fetchImpl, apiBase, token }) {
  const repoApi = `${apiBase}/repos/${parsed.owner}/${parsed.repo}`;
  const metadataResponse = await request(fetchImpl, repoApi, { token });
  const metadata = await metadataResponse.json();
  if (metadata.private) throw new GitHubApiError("비공개 저장소는 MVP 범위에서 지원하지 않습니다.", {
    status: 400,
    url: repoApi,
  });
  return { metadata, repoApi };
}

export async function fetchRepositoryBaseline(repoUrl, options = {}) {
  const parsed = parseGitHubRepoUrl(repoUrl);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const apiBase = (options.apiBase ?? DEFAULT_API_BASE).replace(/\/$/, "");
  const token = options.token;
  if (typeof fetchImpl !== "function") throw new TypeError("fetch 구현이 필요합니다.");

  const { metadata } = await readRepositoryMetadata(parsed, { fetchImpl, apiBase, token });
  return {
    repository: metadata.full_name ?? parsed.fullName,
    repositoryUrl: metadata.html_url ?? parsed.url,
    stars: publicCount(metadata.stargazers_count),
    forks: publicCount(metadata.forks_count),
    openIssues: publicCount(metadata.open_issues_count),
  };
}

export async function fetchRepositorySource(repoUrl, options = {}) {
  const parsed = parseGitHubRepoUrl(repoUrl);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const apiBase = (options.apiBase ?? DEFAULT_API_BASE).replace(/\/$/, "");
  const token = options.token;
  if (typeof fetchImpl !== "function") throw new TypeError("fetch 구현이 필요합니다.");

  const { metadata, repoApi } = await readRepositoryMetadata(parsed, { fetchImpl, apiBase, token });

  const [readmeResponse, licenseResponse, packageJson] = await Promise.all([
    request(fetchImpl, `${repoApi}/readme`, {
      token,
      accept: "application/vnd.github.raw+json",
      optional: true,
    }),
    request(fetchImpl, `${repoApi}/license`, { token, optional: true }),
    readOptionalJson(fetchImpl, `${repoApi}/contents/package.json`, {
      token,
      accept: "application/vnd.github.raw+json",
    }),
  ]);

  const readme = readmeResponse ? await readmeResponse.text() : "";
  const licensePayload = licenseResponse ? await licenseResponse.json() : null;

  return {
    input: parsed,
    repository: {
      name: metadata.name ?? parsed.repo,
      fullName: metadata.full_name ?? parsed.fullName,
      description: metadata.description ?? "",
      url: metadata.html_url ?? parsed.url,
      homepage: metadata.homepage ?? "",
      language: metadata.language ?? "",
      topics: Array.isArray(metadata.topics) ? metadata.topics : [],
      defaultBranch: metadata.default_branch ?? "main",
      readmeUrl: `${parsed.url}/blob/${metadata.default_branch ?? "main"}/README.md`,
      license: metadata.license?.spdx_id ?? licensePayload?.license?.spdx_id ?? "UNKNOWN",
      stars: publicCount(metadata.stargazers_count),
      forks: publicCount(metadata.forks_count),
      openIssues: publicCount(metadata.open_issues_count),
    },
    readme,
    packageJson,
  };
}
