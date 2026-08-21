import { DryRunConnectorError } from "./connector.mjs";

// The product's current Threads draft is a sequence of separate text beats.
// Dry-run records each planned text payload independently but never creates a
// platform container or submits any one of them.
export function buildThreadsTextDryRunPayload(revision) {
  const posts = Array.isArray(revision?.publishFields?.posts) ? revision.publishFields.posts : [];
  if (posts.length === 0 || posts.some((post) => typeof post !== "string" || !post.trim())) {
    throw new DryRunConnectorError("THREADS_TEXT_REQUIRED", "Threads dry-run에는 승인된 텍스트 게시물이 필요합니다.", { status: 400 });
  }
  return Object.freeze({
    endpointClass: "threads_text_post",
    payloads: Object.freeze(posts.map((text, index) => Object.freeze({
      sequence: index + 1,
      mediaType: "TEXT",
      text,
    }))),
  });
}
