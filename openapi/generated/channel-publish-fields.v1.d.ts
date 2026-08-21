// Generated from src/drafts.mjs by scripts/generate-openapi-field-contract.mjs. Do not edit manually.
export type ViralChannel = "x1" | "x2" | "x3" | "xThread" | "threads" | "reddit" | "linkedin" | "disquiet" | "facebook" | "instagram" | "productHunt" | "peerlist" | "indieHackers" | "okky" | "geeknews" | "dev" | "shorts" | "showHn";
export interface PublishFieldsByChannel {
  "x1": { "body": string };
  "x2": { "body": string };
  "x3": { "body": string };
  "xThread": { "segments": string[] };
  "threads": { "posts": string[] };
  "reddit": { "facts": Record<string, unknown> };
  "linkedin": { "body": string };
  "disquiet": { "productName": string; "tagline": string; "productLink": string; "postBody": string };
  "facebook": { "reelsCaption": string; "groupBody": string };
  "instagram": { "cover": string; "caption": string };
  "productHunt": { "name": string; "tagline": string; "description": string; "firstComment": string };
  "peerlist": { "name": string; "tagline": string; "comment": string };
  "indieHackers": { "title": string; "body": string };
  "okky": { "title": string; "body": string };
  "geeknews": { "title": string; "body": string };
  "dev": { "facts": Record<string, unknown> };
  "shorts": { "title": string; "description": string; "shots": string[] };
  "showHn": Record<string, never>;
}
export type ComposeRequest<C extends ViralChannel = ViralChannel> = {
  schemaVersion: "viral-compose-request/v1"; requestId: string; idempotencyKey: string; requestFingerprint: string;
  channel: C; provider: "auto" | "grok" | "codex"; sourceLocale: "ko-KR"; targetLocale: string;
  facts: Record<string, unknown>; publishFields: PublishFieldsByChannel[C];
};
