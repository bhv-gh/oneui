/**
 * Parses task input text to extract @project and #tag tokens.
 * Returns the cleaned text, extracted project, and extracted tags.
 *
 * Example: "Buy groceries @personal #errands #urgent"
 *  → { text: "Buy groceries", project: "personal", tags: ["errands", "urgent"] }
 */
export function parseTaskInput(text) {
  if (!text) return { text: '', project: null, tags: [] };

  let project = null;
  const tags = [];

  // Extract @project references (last one wins)
  const projectMatches = text.match(/@([\w][\w-]*)/g);
  if (projectMatches) {
    project = projectMatches[projectMatches.length - 1].slice(1);
  }

  // Extract #tag references
  const tagMatches = text.match(/#([\w][\w-]*)/g);
  if (tagMatches) {
    tagMatches.forEach(t => tags.push(t.slice(1)));
  }

  // Clean text: remove @project and #tag tokens, collapse whitespace
  const cleanText = text
    .replace(/@[\w][\w-]*/g, '')
    .replace(/#[\w][\w-]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    text: cleanText,
    project,
    tags: [...new Set(tags)],
  };
}
