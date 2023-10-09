const FILTERED_WORDS = ['the', 'me', 'I', 'a', 'an', 'is', 'how', 'what'];

export function toKeywords(query: string) {
  return query
    .replace(/!|\?/g, '')
    .split(/\s+/g)
    .filter((word) => !FILTERED_WORDS.includes(word))
    .map((word) => word.toLocaleLowerCase())
    .join(' ');
}
