export const SOURCE_LOCALE = "ko-KR";
// Korean is the editable source. These are the five launch languages exposed
// by the local compose contract; a channel can still narrow this set.
export const TARGET_LOCALE = "en-US";
export const SUPPORTED_LOCALES = Object.freeze([
  SOURCE_LOCALE,
  TARGET_LOCALE,
  "ja-JP",
  "zh-CN",
  "es-ES",
]);

export const LOCALE_LABELS = Object.freeze({
  "ko-KR": "한국어 (ko-KR)",
  "en-US": "English (en-US)",
  "ja-JP": "日本語 (ja-JP)",
  "zh-CN": "简体中文 (zh-CN)",
  "es-ES": "Español (es-ES)",
});

export function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(value);
}

export function localeLabel(value) {
  return LOCALE_LABELS[value] ?? String(value ?? "");
}
