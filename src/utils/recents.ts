const SELECTED_TAG_COLOR = '#1f7a5a';

export const MAX_RECENTS = 12;

export const getTagColor = (value: string) => {
  return SELECTED_TAG_COLOR;
};

export const sanitizeRecents = (items: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
    if (result.length >= MAX_RECENTS) break;
  }
  return result;
};
