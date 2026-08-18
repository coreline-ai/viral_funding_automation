export const SOURCE_LOCALE = "ko-KR";
export const TARGET_LOCALE = "en-US";
export const SUPPORTED_LOCALES = Object.freeze([SOURCE_LOCALE, TARGET_LOCALE]);

export function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(value);
}
