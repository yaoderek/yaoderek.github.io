import { describe, it, expect } from 'vitest';
import { formatDate, wordCount, firstSentence, stripHtml } from './format';

describe('formatDate', () => {
  it('formats a date ISO string to "Mar 1, 2026"', () => {
    expect(formatDate('2026-03-01')).toBe('Mar 1, 2026');
  });

  it('formats another date correctly', () => {
    expect(formatDate('2024-12-25')).toBe('Dec 25, 2024');
  });

  it('handles single-digit day without padding', () => {
    expect(formatDate('2024-01-07')).toBe('Jan 7, 2024');
  });
});

describe('wordCount', () => {
  it('counts words separated by spaces', () => {
    expect(wordCount('a b  c\n d')).toBe(4);
  });

  it('returns 0 for empty string', () => {
    expect(wordCount('')).toBe(0);
  });

  it('counts a single word', () => {
    expect(wordCount('hello')).toBe(1);
  });

  it('handles leading/trailing whitespace', () => {
    expect(wordCount('  hello world  ')).toBe(2);
  });
});

describe('firstSentence', () => {
  it('returns first sentence ending with period', () => {
    expect(firstSentence('One. Two.')).toBe('One.');
  });

  it('returns first sentence ending with question mark', () => {
    expect(firstSentence('What is this? Something else.')).toBe('What is this?');
  });

  it('returns first sentence ending with exclamation mark', () => {
    expect(firstSentence('Great! Not great.')).toBe('Great!');
  });

  it('truncates to 140 chars with ellipsis if sentence is too long', () => {
    const long = 'A'.repeat(150) + '. Second sentence.';
    const result = firstSentence(long);
    expect(result.length).toBeLessThanOrEqual(140);
    expect(result.endsWith('...')).toBe(true);
  });

  it('returns full text with ellipsis if no sentence boundary and over 140 chars', () => {
    const long = 'A'.repeat(150);
    const result = firstSentence(long);
    expect(result.length).toBeLessThanOrEqual(140);
    expect(result.endsWith('...')).toBe(true);
  });

  it('returns full text if no sentence boundary and under 140 chars', () => {
    expect(firstSentence('No period here')).toBe('No period here');
  });
});

describe('stripHtml', () => {
  it('strips HTML tags and collapses whitespace', () => {
    const result = stripHtml('<p>Hi, I\'m Derek.</p><p>I study art &amp; CS.</p>');
    expect(result).toContain("Hi, I'm Derek.");
    expect(result).toContain('I study art & CS.');
  });

  it('decodes &amp; entity', () => {
    expect(stripHtml('<p>art &amp; code</p>')).toBe('art & code');
  });

  it('decodes &lt; and &gt; entities', () => {
    expect(stripHtml('<p>a &lt; b &gt; c</p>')).toBe('a < b > c');
  });

  it('collapses multiple spaces/newlines to a single space', () => {
    expect(stripHtml('<p>foo</p>   <p>bar</p>')).toBe('foo bar');
  });

  it('trims leading and trailing whitespace', () => {
    expect(stripHtml('  <b>hello</b>  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});
