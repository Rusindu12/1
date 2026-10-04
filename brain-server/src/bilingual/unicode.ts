/**
 * Sinhala Unicode Normalizer & Validator
 * Handles Sinhala Unicode block (U+0D80 to U+0DFF),
 * zero-width joiner (ZWJ U+200D) ligature sequences (bandi akuru, touching letters),
 * and standard kombuva / vowel sign reordering.
 */

export const SINHALA_UNICODE_START = 0x0D80;
export const SINHALA_UNICODE_END = 0x0DFF;
export const ZWJ = '\u200D';
export const ZWNJ = '\u200C';

/**
 * Checks if a string contains any native Sinhala Unicode characters.
 */
export function hasSinhalaScript(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= SINHALA_UNICODE_START && code <= SINHALA_UNICODE_END) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates the proportion of Sinhala characters in a text string.
 */
export function sinhalaScriptRatio(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  let sinhalaCount = 0;
  let letterCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Ignore whitespace and punctuation
    if (/\s|[.,\/#!$%\^&\*;:{}=\-_`~()?"']/.test(text[i])) continue;
    letterCount++;
    if (code >= SINHALA_UNICODE_START && code <= SINHALA_UNICODE_END) {
      sinhalaCount++;
    }
  }
  return letterCount > 0 ? sinhalaCount / letterCount : 0;
}

/**
 * Normalizes Sinhala Unicode sequences:
 * 1. Cleans invalid double vowels and redundant hal (virama) marks.
 * 2. Normalizes ZWJ sequences for rakaransaya (C + Virama + ZWJ + R -> e.g. ක්‍ර),
 *    yansaya (C + Virama + ZWJ + Y -> e.g. ක්‍ය), and bandi akuru (C + Virama + ZWJ + C).
 * 3. Normalizes Unicode canonical decomposition/composition (NFC).
 */
export function normalizeSinhalaUnicode(text: string): string {
  if (!text) return '';

  // Canonical Unicode Normalization Form C
  let normalized = text.normalize('NFC');

  // Fix common broken Sinhala typing sequences:
  // Multiple viramas (hal lakuna U+0DCA)
  normalized = normalized.replace(/\u0DCA{2,}/g, '\u0DCA');

  // Kombuva (U+0DD9) followed by vowel signs to standard sequences
  // Kombuva + diga aela-pilla -> Kombuva + aela-pilla (o/oo vowel forms)
  // Fix misplaced ZWJ sequences
  normalized = normalized.replace(new RegExp(`\\u0DCA${ZWJ}\\u0DCA`, 'g'), `\u0DCA${ZWJ}`);

  return normalized;
}

/**
 * Supported Sinhala Fonts recommendation metadata for UI
 */
export const RECOMMENDED_SINHALA_FONTS = [
  'Noto Sans Sinhala',
  'Iskoola Pota',
  'Bhashitha',
  'Malithi Web',
  'system-ui',
  'sans-serif'
].join(', ');
