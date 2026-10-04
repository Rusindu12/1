/**
 * Singlish (Romanized Sinhala) Engine
 * Transliterates phonetically between Latin characters and Sinhala Unicode.
 * Includes common vocabulary mappings, consonant clusters, and vowel modifiers.
 */

// Common Singlish word lookup for instantaneous, highly natural conversion
export const COMMON_SINGLISH_MAP: Record<string, string> = {
  // Greetings & basic
  'kohomada': 'කොහොමද',
  'oyaata': 'ඔයාට',
  'oyata': 'ඔයාට',
  'mata': 'මට',
  'api': 'අපි',
  'apita': 'අපිට',
  'oba': 'ඔබ',
  'obata': 'ඔබට',
  'subha': 'සුභ',
  'udasanak': 'උදෑසනක්',
  'udhaasanak': 'උදෑසනක්',
  'dhavasak': 'දවසක්',
  'sthuthiyi': 'ස්තූතියි',
  'sthuthi': 'ස්තූතියි',
  'bohoma': 'බොහෝම',
  'karunakarala': 'කරුණාකරලා',
  'karunawa': 'කරුණාව',

  // Questions & pronouns
  'mokakda': 'මොකක්ද',
  'mokada': 'මොකද',
  'moko': 'මොකෝ',
  'monawada': 'මොනවද',
  'kawda': 'කවුද',
  'koheda': 'කොහෙද',
  'kavadada': 'කවදද',
  'aeyi': 'ඇයි',
  'aai': 'ඇයි',
  'ehema': 'එහෙම',
  'mehema': 'මෙහෙම',
  'eka': 'එක',
  'meka': 'මේක',
  'araka': 'අරක',
  'oya': 'ඔයා',
  'mama': 'මම',

  // Verbs & helpers
  'karanna': 'කරන්න',
  'karanna puluwanda': 'කරන්න පුළුවන්ද',
  'puluwanda': 'පුළුවන්ද',
  'puluwan': 'පුළුවන්',
  'ba': 'බෑ',
  'bae': 'බෑ',
  'venne': 'වෙන්නේ',
  'wenne': 'වෙන්නේ',
  'danne': 'දන්නේ',
  'kiyanna': 'කියන්න',
  'kiyala': 'කියලා',
  'thiyenawa': 'තියෙනවා',
  'thiyenawada': 'තියෙනවද',
  'dhenna': 'දෙන්න',
  'denna': 'දෙන්න',
  'hithanawa': 'හිතනවා',
  'balanna': 'බලන්න',
  'hadanna': 'හදන්න',
  'loku': 'ලොකු',
  'podi': 'පොඩි',
  'hondai': 'හොඳයි',
  'hari': 'හරි',
  'waradi': 'වැරදි',
  'ow': 'ඔව්',
  'na': 'නෑ',
  'nehe': 'නැහැ',
  'nahe': 'නැහැ',
  'ne': 'නේ'
};

// Vowel signs mapping
const VOWELS: Record<string, string> = {
  'aa': 'ආ',
  'a': 'අ',
  'ae': 'ඇ',
  'aae': 'ඈ',
  'ii': 'ඊ',
  'i': 'ඉ',
  'ee': 'ඒ',
  'e': 'එ',
  'uu': 'ඌ',
  'u': 'උ',
  'oo': 'ඕ',
  'o': 'ඔ',
  'au': 'ඖ',
  'ai': 'ඓ'
};

// Consonant base mapping
const CONSONANTS: Record<string, string> = {
  'k': 'ක', 'kh': 'ඛ', 'g': 'ග', 'gh': 'ඝ', 'ng': 'ඞ',
  'ch': 'ච', 'chh': 'ඡ', 'j': 'ජ', 'jh': 'ඣ', 'gn': 'ඤ',
  't': 'ට', 'th': 'ත', 'd': 'ද', 'dh': 'ධ', 'n': 'න',
  'p': 'ප', 'ph': 'ඵ', 'b': 'බ', 'bh': 'භ', 'm': 'ම',
  'y': 'ය', 'r': 'ර', 'l': 'ල', 'v': 'ව', 'w': 'ව',
  'sh': 'ශ', 'shh': 'ෂ', 's': 'ස', 'h': 'හ', 'L': 'ළ', 'f': 'ෆ'
};

// Vowel modifier strokes (pili)
const VOWEL_MODIFIERS: Record<string, string> = {
  'aa': 'ා',
  'ae': 'ැ',
  'aae': 'ෑ',
  'i': 'ි',
  'ii': 'ී',
  'u': 'ු',
  'uu': 'ූ',
  'e': 'ෙ',
  'ee': 'ේ',
  'ai': 'ෛ',
  'o': 'ො',
  'oo': 'ෝ',
  'au': 'ෞ'
};

const VIRAMA = '\u0DCA'; // Hal lakuna (්)

/**
 * Converts a single Singlish word or phrase to Sinhala script.
 */
export function singlishToSinhala(input: string): string {
  if (!input) return '';

  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct dictionary match
  if (COMMON_SINGLISH_MAP[lower]) {
    return COMMON_SINGLISH_MAP[lower];
  }

  // 2. Tokenize by words to preserve structure
  const tokens = input.split(/(\s+|[.,!?;:'"()\[\]{}]+)/);
  const convertedTokens = tokens.map(token => {
    const tLower = token.toLowerCase();
    if (COMMON_SINGLISH_MAP[tLower]) {
      return COMMON_SINGLISH_MAP[tLower];
    }
    // If it's pure whitespace or punctuation, return as-is
    if (/^[\s.,!?;:'"()\[\]{}]+$/.test(token)) {
      return token;
    }
    return transliterateWord(tLower);
  });

  return convertedTokens.join('');
}

/**
 * Phonetic transliterator for arbitrary Singlish words
 */
function transliterateWord(word: string): string {
  let result = '';
  let i = 0;

  while (i < word.length) {
    // Check 3-letter consonant clusters
    const three = word.substring(i, i + 3);
    const two = word.substring(i, i + 2);
    const one = word.substring(i, i + 1);

    // Initial standalone vowel check
    if (i === 0 || !CONSONANTS[word[i - 1]]) {
      if (VOWELS[two]) {
        result += VOWELS[two];
        i += 2;
        continue;
      } else if (VOWELS[one]) {
        result += VOWELS[one];
        i += 1;
        continue;
      }
    }

    let cons = '';
    let consLen = 0;

    if (CONSONANTS[three]) {
      cons = CONSONANTS[three];
      consLen = 3;
    } else if (CONSONANTS[two]) {
      cons = CONSONANTS[two];
      consLen = 2;
    } else if (CONSONANTS[one]) {
      cons = CONSONANTS[one];
      consLen = 1;
    }

    if (cons) {
      i += consLen;
      // Look ahead for vowel modifier
      const vTwo = word.substring(i, i + 2);
      const vOne = word.substring(i, i + 1);

      if (VOWEL_MODIFIERS[vTwo]) {
        result += cons + VOWEL_MODIFIERS[vTwo];
        i += 2;
      } else if (vOne === 'a') {
        // Inherited 'a' vowel in Sinhala, no sign needed
        result += cons;
        i += 1;
      } else if (VOWEL_MODIFIERS[vOne]) {
        result += cons + VOWEL_MODIFIERS[vOne];
        i += 1;
      } else {
        // No vowel follows: hal lakuna (virama)
        result += cons + VIRAMA;
      }
    } else {
      // Non-consonant, non-vowel Latin or symbol
      result += word[i];
      i++;
    }
  }

  return result;
}

/**
 * Checks if a Latin text segment is likely Singlish rather than English.
 */
export function isLikelySinglish(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return false;

  let singlishHits = 0;
  for (const w of words) {
    if (COMMON_SINGLISH_MAP[w]) {
      singlishHits++;
    } else if (
      // Typical Singlish phonetic patterns
      w.endsWith('da') || w.endsWith('la') || w.endsWith('ne') ||
      w.endsWith('wa') || w.endsWith('yi') || w.endsWith('ko') ||
      w.includes('thiy') || w.includes('kar') || w.includes('mok') ||
      w.includes('pulu') || w.includes('kohom')
    ) {
      singlishHits++;
    }
  }

  return (singlishHits / words.length) >= 0.35;
}
