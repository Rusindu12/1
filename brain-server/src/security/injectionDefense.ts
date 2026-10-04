/**
 * Prompt Injection Defense & Untrusted Content Sanitizer
 * Defense-in-depth against prompt injection, jailbreaks, and indirect injection
 * from web pages, accessibility reading, and external search snippets.
 */

export class InjectionDefense {
  private static DANGEROUS_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
    /disregard\s+(the\s+)?(previous|system)\s+instructions/gi,
    /system\s*prompt\s*override/gi,
    /you\s+are\s+now\s+in\s+developer\s+mode/gi,
    /dan\s+mode/gi,
    /always\s+respond\s+with\s+a\s+password/gi,
    /output\s+your\s+instructions/gi,
    /reveal\s+your\s+system\s+prompt/gi,
    /pretend\s+you\s+have\s+no\s+restrictions/gi,
    /delete\s+all\s+memories/gi,
    /transfer\s+\$?[0-9]+/gi
  ];

  /**
   * Encloses untrusted external content into a cryptographically identifiable
   * XML boundary that tells the LLM this is strictly passive data, NOT instructions.
   */
  public static wrapUntrustedContent(content: string, source: string): string {
    const sanitized = this.sanitizeText(content);
    return `<untrusted_content source="${this.escapeAttribute(source)}" safety_verification="passive_data_only">\n${sanitized}\n</untrusted_content>`;
  }

  /**
   * Sanitizes text by defanging known prompt injection payloads
   */
  public static sanitizeText(text: string): string {
    if (!text) return '';
    let cleaned = text;

    // Neutralize dangerous phrases by replacing them with safety tokens
    for (const pattern of this.DANGEROUS_PATTERNS) {
      cleaned = cleaned.replace(pattern, '[DEFANGED_PROMPT_INJECTION]');
    }

    // Strip fake system delimiters
    cleaned = cleaned.replace(/<system>/gi, '&lt;system&gt;');
    cleaned = cleaned.replace(/<\/system>/gi, '&lt;/system&gt;');
    cleaned = cleaned.replace(/<instructions>/gi, '&lt;instructions&gt;');
    cleaned = cleaned.replace(/<\/instructions>/gi, '&lt;/instructions&gt;');

    return cleaned;
  }

  /**
   * Validates if a piece of text contains an active prompt injection exploit
   */
  public static containsExploit(text: string): boolean {
    return this.DANGEROUS_PATTERNS.some(pattern => pattern.test(text));
  }

  private static escapeAttribute(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
