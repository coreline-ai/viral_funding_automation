// Preview metadata is deliberately separate from PLATFORM_REGISTRY and the
// 18 generated draft channels. It describes only local draft-review surfaces;
// it cannot create a social payload, authenticate, or make a network request.
export const PLATFORM_PREVIEW_SCHEMA_VERSION = "viral-platform-preview-registry/v1";

export const PREVIEW_TEMPLATE_TYPES = Object.freeze([
  "feed",
  "vertical-media",
  "launch",
  "community",
  "manual-form",
]);

function previewSpec({
  id,
  label,
  channel = "",
  template,
  inputMode,
  fields = [],
  noGo = [],
}) {
  if (!PREVIEW_TEMPLATE_TYPES.includes(template)) throw new TypeError(`지원하지 않는 preview template입니다: ${template}`);
  return Object.freeze({
    id,
    label,
    channel,
    template,
    inputMode,
    fields: Object.freeze([...fields]),
    noGo: Object.freeze([...noGo]),
    localOnly: true,
    externalWriteCount: 0,
  });
}

// The order matches implement_20260822_083934.md. No entry here changes the
// generator's existing 18-channel count; platforms without a channel are
// marked manual_brief and will only receive session-local input in later work.
export const PLATFORM_PREVIEW_REGISTRY = Object.freeze({
  linkedin: previewSpec({ id: "linkedin", label: "LinkedIn", channel: "linkedin", template: "feed", inputMode: "publish_fields", fields: ["body"], noGo: ["actual_profile", "engagement", "social_write"] }),
  facebook: previewSpec({ id: "facebook", label: "Facebook", channel: "facebook", template: "vertical-media", inputMode: "publish_fields", fields: ["reelsCaption", "groupBody"], noGo: ["actual_page", "engagement", "social_write"] }),
  instagram: previewSpec({ id: "instagram", label: "Instagram", channel: "instagram", template: "vertical-media", inputMode: "publish_fields", fields: ["cover", "caption"], noGo: ["actual_profile", "music", "engagement", "social_write"] }),
  shorts: previewSpec({ id: "shorts", label: "YouTube Shorts", channel: "shorts", template: "vertical-media", inputMode: "publish_fields", fields: ["title", "description", "shots"], noGo: ["actual_channel", "engagement", "embed", "social_write"] }),
  tiktok: previewSpec({ id: "tiktok", label: "TikTok", template: "vertical-media", inputMode: "manual_brief", fields: ["caption", "cover", "visibility"], noGo: ["generated_copy", "watermark", "actual_profile", "social_write"] }),
  productHunt: previewSpec({ id: "productHunt", label: "Product Hunt", channel: "productHunt", template: "launch", inputMode: "publish_fields", fields: ["name", "tagline", "description", "firstComment"], noGo: ["rank", "votes", "reviews", "social_write"] }),
  peerlist: previewSpec({ id: "peerlist", label: "Peerlist", channel: "peerlist", template: "launch", inputMode: "publish_fields", fields: ["name", "tagline", "comment"], noGo: ["rank", "upvote_request", "social_write"] }),
  disquiet: previewSpec({ id: "disquiet", label: "Disquiet", channel: "disquiet", template: "launch", inputMode: "publish_fields", fields: ["productName", "tagline", "productLink", "postBody"], noGo: ["unlinked_maker_log", "engagement", "social_write"] }),
  reddit: previewSpec({ id: "reddit", label: "Reddit", channel: "reddit", template: "community", inputMode: "reference_only", fields: ["facts"], noGo: ["generated_title", "generated_body", "engagement", "social_write"] }),
  indieHackers: previewSpec({ id: "indieHackers", label: "Indie Hackers", channel: "indieHackers", template: "community", inputMode: "publish_fields", fields: ["title", "body"], noGo: ["invented_ownership", "engagement", "social_write"] }),
  dev: previewSpec({ id: "dev", label: "DEV", channel: "dev", template: "community", inputMode: "reference_only", fields: ["facts"], noGo: ["generated_article", "promotion_article", "social_write"] }),
  okky: previewSpec({ id: "okky", label: "OKKY", channel: "okky", template: "community", inputMode: "publish_fields", fields: ["title", "body"], noGo: ["engagement", "social_write"] }),
  geeknews: previewSpec({ id: "geeknews", label: "GeekNews", channel: "geeknews", template: "community", inputMode: "publish_fields", fields: ["title", "body"], noGo: ["news_show_mixup", "engagement", "social_write"] }),
  showHn: previewSpec({ id: "showHn", label: "Show HN", channel: "showHn", template: "community", inputMode: "manual_only", fields: [], noGo: ["generated_copy", "ai_rewrite", "engagement", "social_write"] }),
  discord: previewSpec({ id: "discord", label: "Discord", template: "manual-form", inputMode: "manual_brief", fields: ["message", "embed"], noGo: ["webhook_url", "token", "mentions", "social_write"] }),
  bluesky: previewSpec({ id: "bluesky", label: "Bluesky", template: "manual-form", inputMode: "manual_brief", fields: ["body", "locale"], noGo: ["actual_profile", "facet_resolution", "social_write"] }),
  mastodon: previewSpec({ id: "mastodon", label: "Mastodon", template: "manual-form", inputMode: "manual_brief", fields: ["body", "server", "visibility", "contentWarning"], noGo: ["instance_auth", "timeline", "social_write"] }),
});

export const REMAINING_PREVIEW_KEYS = Object.freeze(Object.keys(PLATFORM_PREVIEW_REGISTRY));

export function previewSpecForPlatform(platform) {
  return PLATFORM_PREVIEW_REGISTRY[String(platform ?? "")] ?? null;
}

export function previewSpecForChannel(channel) {
  const key = String(channel ?? "");
  return Object.values(PLATFORM_PREVIEW_REGISTRY).find((spec) => spec.channel === key) ?? null;
}
