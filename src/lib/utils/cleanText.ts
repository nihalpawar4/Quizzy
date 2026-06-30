/**
 * Clean Question Text Utility
 * Strips AI annotation artifacts, HTML tags, and normalizes whitespace
 * from question text that may come from AI-generated JSON data.
 */

/**
 * Patterns to strip from question text:
 * - [span_0](start_span), [span_0](end_span), [/span_0], etc.
 * - [span], [/span], [span_N] style markdown annotations
 * - Generic bracket annotations like (start_span), (end_span)
 * - HTML span/br/p tags
 * - Excessive whitespace
 */
const ANNOTATION_PATTERNS: RegExp[] = [
  // [span_0](start_span), [span_0](end_span), [span_1](start_span), etc.
  /\[span_\d+\]\((?:start|end)_span\)/gi,
  // [/span_0], [span_0], [/span_1], etc.
  /\[\/?span_\d+\]/gi,
  // (start_span), (end_span)
  /\((?:start|end)_span\)/gi,
  // [span], [/span]
  /\[\/?span\]/gi,
  // [highlight], [/highlight]
  /\[\/?highlight\]/gi,
  // [bold], [/bold], [italic], [/italic]
  /\[\/?(?:bold|italic|underline|strikethrough)\]/gi,
  // HTML tags: <span>, </span>, <br>, <br/>, <p>, </p>, <b>, </b>, <i>, </i>
  /<\/?(?:span|br|p|b|i|u|em|strong|mark|del|ins|sub|sup|small|big)(?:\s[^>]*)?\/?>/gi,
  // **text** markdown bold (preserve the text inside)
  // We won't strip markdown bold/italic as it may be intentional
];

/**
 * Cleans question text by removing AI annotation artifacts and normalizing whitespace.
 * 
 * @param text - Raw question text that may contain annotation artifacts
 * @returns Cleaned text with artifacts removed
 * 
 * @example
 * cleanQuestionText('What is the capital? [span_0](start_span)[span_0](end_span)')
 * // Returns: 'What is the capital?'
 */
export function cleanQuestionText(text: string): string {
  if (!text || typeof text !== 'string') return text || '';

  let cleaned = text;

  // Apply all annotation pattern removals
  for (const pattern of ANNOTATION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Normalize whitespace: collapse multiple spaces/newlines into single space
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Cleans an array of option strings
 */
export function cleanOptionText(option: string): string {
  if (!option || typeof option !== 'string') return option || '';
  return cleanQuestionText(option);
}
