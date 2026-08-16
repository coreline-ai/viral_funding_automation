const URL_PATTERN = /https?:\/\/[^\s]+/giu;

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

export function countXWeightedCharacters(value) {
  const text = String(value ?? "");
  let weightedLength = 0;
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? cursor;
    for (const character of text.slice(cursor, index)) weightedLength += codePointWeight(character);
    weightedLength += 23;
    cursor = index + match[0].length;
  }
  for (const character of text.slice(cursor)) weightedLength += codePointWeight(character);
  return weightedLength;
}

export function truncateXWeightedText(value, maximum) {
  const text = String(value ?? "").trim();
  if (countXWeightedCharacters(text) <= maximum) return text;

  const ellipsis = "…";
  const contentLimit = Math.max(0, maximum - countXWeightedCharacters(ellipsis));
  let result = "";
  let weightedLength = 0;
  for (const character of text) {
    const nextWeight = codePointWeight(character);
    if (weightedLength + nextWeight > contentLimit) break;
    result += character;
    weightedLength += nextWeight;
  }
  return `${result.trimEnd()}${ellipsis}`;
}
