/**
 * Bilingual Language Detector
 * Detects whether the user is typing in:
 * - 'si': Native Sinhala Unicode script
 * - 'singlish': Romanized Sinhala phonetics
 * - 'en': Standard English
 * - 'mixed': Mixed Sinhala & English
 * - 'code': Source code or technical snippets
 */

import { hasSinhalaScript, sinhalaScriptRatio, normalizeSinhalaUnicode } from './unicode';
import { isLikelySinglish, singlishToSinhala } from './singlish';

export type DetectedLanguage = 'si' | 'singlish' | 'en' | 'mixed' | 'code';

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  confidence: number;
  hasSinhala: boolean;
  isSinglish: boolean;
  transliteration?: string;
  suggestedResponseLanguage: 'si' | 'en';
}

const CODE_INDICATORS = [
  /function\s*\w*\s*\(/,
  /const\s+\w+\s*=/,
  /let\s+\w+\s*=/,
  /import\s+.*\s+from/,
  /class\s+\w+/,
  /<[a-zA-Z0-9]+(\s+[^>]+)?>.*<\/[a-zA-Z0-9]+>/,
  /\{\s*[\w"']+\s*:\s*.+\}/,
  /public\s+class/,
  /def\s+\w+\(/
];

export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      language: 'en',
      confidence: 1.0,
      hasSinhala: false,
      isSinglish: false,
      suggestedResponseLanguage: 'en'
    };
  }

  const clean = text.trim();

  // 1. Check for programming code
  const isCode = CODE_INDICATORS.some(pattern => pattern.test(clean));
  if (isCode && clean.includes(';') && (clean.includes('{') || clean.includes('}'))) {
    return {
      language: 'code',
      confidence: 0.95,
      hasSinhala: hasSinhalaScript(clean),
      isSinglish: false,
      suggestedResponseLanguage: 'en'
    };
  }

  // 2. Check for native Sinhala script
  const ratio = sinhalaScriptRatio(clean);
  if (ratio > 0.4) {
    return {
      language: 'si',
      confidence: Math.min(1.0, ratio + 0.2),
      hasSinhala: true,
      isSinglish: false,
      suggestedResponseLanguage: 'si'
    };
  } else if (ratio > 0.1) {
    return {
      language: 'mixed',
      confidence: 0.8,
      hasSinhala: true,
      isSinglish: false,
      suggestedResponseLanguage: 'si' // Prefer Sinhala if any Sinhala is present
    };
  }

  // 3. Check for Singlish (Romanized Sinhala)
  if (isLikelySinglish(clean)) {
    const sinhalaConverted = normalizeSinhalaUnicode(singlishToSinhala(clean));
    return {
      language: 'singlish',
      confidence: 0.88,
      hasSinhala: false,
      isSinglish: true,
      transliteration: sinhalaConverted,
      suggestedResponseLanguage: 'si' // Reply in Sinhala for Singlish queries
    };
  }

  // 4. Default to English
  return {
    language: 'en',
    confidence: 0.92,
    hasSinhala: false,
    isSinglish: false,
    suggestedResponseLanguage: 'en'
  };
}
