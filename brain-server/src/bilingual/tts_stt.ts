/**
 * Bilingual Voice Input & Output (STT / TTS) Bridge
 * Manages Speech-to-Text and Text-to-Speech configurations,
 * locales, phonetic pronunciation adjustments, and Android/Web interfaces.
 */

export interface VoiceConfig {
  locale: 'si-LK' | 'en-US';
  sttLanguageTag: string;
  ttsLanguageTag: string;
  preferredVoices: string[];
  pitch: number;
  rate: number;
}

export const SINHALA_VOICE_CONFIG: VoiceConfig = {
  locale: 'si-LK',
  sttLanguageTag: 'si-LK',
  ttsLanguageTag: 'si-LK',
  preferredVoices: [
    'si-LK-language',
    'si-lk-x-sif-local',
    'si_LK',
    'Google sinhala'
  ],
  pitch: 1.0,
  rate: 0.95 // slightly slower for clearer Sinhala enunciation
};

export const ENGLISH_VOICE_CONFIG: VoiceConfig = {
  locale: 'en-US',
  sttLanguageTag: 'en-US',
  ttsLanguageTag: 'en-US',
  preferredVoices: [
    'en-US-Neural2-F',
    'en-US-Standard-C',
    'en-US',
    'Google US English'
  ],
  pitch: 1.0,
  rate: 1.0
};

export function getVoiceConfigForLanguage(lang: 'si' | 'en' | 'singlish' | 'mixed'): VoiceConfig {
  if (lang === 'si' || lang === 'singlish' || lang === 'mixed') {
    return SINHALA_VOICE_CONFIG;
  }
  return ENGLISH_VOICE_CONFIG;
}

/**
 * Android Intent actions and extras for Voice Bridge
 */
export const ANDROID_VOICE_CONSTANTS = {
  ACTION_RECOGNIZE_SPEECH: 'android.speech.action.RECOGNIZE_SPEECH',
  EXTRA_LANGUAGE: 'android.speech.extra.LANGUAGE',
  EXTRA_LANGUAGE_MODEL: 'android.speech.extra.LANGUAGE_MODEL',
  LANGUAGE_MODEL_FREE_FORM: 'free_form',
  EXTRA_PARTIAL_RESULTS: 'android.speech.extra.PARTIAL_RESULTS',
  EXTRA_PREFER_OFFLINE: 'android.speech.extra.PREFER_OFFLINE'
};

/**
 * Prepares text for optimal TTS vocalization (expands acronyms, cleans markdown)
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // remove markdown links [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // remove code blocks
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    // remove inline backticks
    .replace(/`([^`]+)`/g, '$1')
    // remove bold/italic asterisks
    .replace(/[*_#~]/g, '')
    // normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
