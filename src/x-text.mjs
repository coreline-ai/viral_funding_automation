const URL_PATTERN = /https?:\/\/[^\s]+/giu;
const EMOJI_GRAPHEME = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;
const GRAPHEME_SEGMENTER = new Intl.Segmenter("en", { granularity: "grapheme" });

function codePointWeight(character) {
  const codePoint = character.codePointAt(0);
  if (
    codePoint <= 4351
    || (codePoint >= 8192 && codePoint <= 8205)
    || (codePoint >= 8208 && codePoint <= 8223)
    || (codePoint >= 8242 && codePoint <= 8247)
  ) {
    return 1;
  }
  return 2;
}

function textWeight(value) {
  let weightedLength = 0;
  for (const { segment } of GRAPHEME_SEGMENTER.segment(value)) {
    if (EMOJI_GRAPHEME.test(segment)) {
      weightedLength += 2;
      continue;
    }
    for (const character of segment) weightedLength += codePointWeight(character);
  }
  return weightedLength;
}

export function countXWeightedCharacters(value) {
  const text = String(value ?? "").normalize("NFC");
  let weightedLength = 0;
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? cursor;
    weightedLength += textWeight(text.slice(cursor, index));
    weightedLength += 23;
    cursor = index + match[0].length;
  }
  weightedLength += textWeight(text.slice(cursor));
  return weightedLength;
}

export function truncateXWeightedText(value, maximum) {
  const text = String(value ?? "").normalize("NFC").trim();
  if (countXWeightedCharacters(text) <= maximum) return text;

  const ellipsis = "…";
  const contentLimit = Math.max(0, maximum - countXWeightedCharacters(ellipsis));
  let result = "";
  let weightedLength = 0;
  for (const { segment } of GRAPHEME_SEGMENTER.segment(text)) {
    const nextWeight = textWeight(segment);
    if (weightedLength + nextWeight > contentLimit) break;
    result += segment;
    weightedLength += nextWeight;
  }
  return `${result.trimEnd()}${ellipsis}`;
}
