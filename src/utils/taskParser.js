const VALID_PRIORITIES = ['urgent', 'high', 'medium', 'low'];

/**
 * Parses task input text to extract @project, #tag, and !priority tokens.
 * Returns the cleaned text, extracted project, tags, and priority.
 *
 * Example: "Buy groceries @personal #errands !high"
 *  → { text: "Buy groceries", project: "personal", tags: ["errands"], priority: "high" }
 */
export function parseTaskInput(text) {
  if (!text) return { text: '', project: null, tags: [], priority: null };

  let project = null;
  const tags = [];
  let priority = null;

  const projectMatches = text.match(/@([\w][\w-]*)/g);
  if (projectMatches) {
    project = projectMatches[projectMatches.length - 1].slice(1);
  }

  const tagMatches = text.match(/#([\w][\w-]*)/g);
  if (tagMatches) {
    tagMatches.forEach(t => {
      const val = t.slice(1);
      if (VALID_PRIORITIES.includes(val.toLowerCase())) {
        priority = val.toLowerCase();
      } else {
        tags.push(val);
      }
    });
  }

  const cleanText = text
    .replace(/@[\w][\w-]*/g, '')
    .replace(/#[\w][\w-]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    text: cleanText,
    project,
    tags: [...new Set(tags)],
    priority,
  };
}
