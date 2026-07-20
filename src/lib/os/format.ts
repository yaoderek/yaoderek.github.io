/**
 * Format an ISO date string (YYYY-MM-DD) as "Mar 1, 2026".
 * Parses parts manually to avoid timezone shift.
 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Count words in a text string (whitespace-delimited tokens).
 */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Strip HTML tags from a string, decode common HTML entities,
 * and collapse all whitespace to single spaces (trimmed).
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Return the first sentence from text (ending at . ? !).
 * Truncates to 140 characters with ellipsis if over limit.
 */
export function firstSentence(text: string): string {
  const match = text.match(/^.*?[.?!]/);
  const sentence = match ? match[0] : text;
  if (sentence.length <= 140) return sentence;
  return sentence.slice(0, 137) + '...';
}
