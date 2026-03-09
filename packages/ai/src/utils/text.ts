export function smartTruncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  const sample = text.slice(0, 100);
  const cjkMatch = sample.match(/[\u4e00-\u9fa5]/g);
  const isCjk = Boolean(cjkMatch && cjkMatch.length > 30);
  const truncated = text.slice(0, maxLength);

  if (isCjk) {
    const punctuation = /[，。！？；,!?;]/;
    for (let index = truncated.length - 1; index >= maxLength - 50; index -= 1) {
      if (punctuation.test(truncated[index])) {
        return truncated.slice(0, index + 1);
      }
    }
    return truncated;
  }

  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace);
  }

  return truncated;
}

export function cleanTags(tags: string[]): string[] {
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag) {
        return false;
      }

      let length = 0;
      for (const char of tag) {
        length += /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
      }

      return length >= 2 && length <= 20;
    })
    .filter((tag, index, list) => list.indexOf(tag) === index)
    .slice(0, 5);
}
