const TAG_RE = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu;

export function parseTags(content: string): string[] {
  const seen = new Set<string>();
  for (const match of content.matchAll(TAG_RE)) {
    const tag = match[1].toLowerCase();
    if (tag) seen.add(tag);
  }
  return Array.from(seen);
}

export function tagsToString(tags: string[]): string | null {
  return tags.length > 0 ? tags.join(",") : null;
}

export function stringToTags(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
