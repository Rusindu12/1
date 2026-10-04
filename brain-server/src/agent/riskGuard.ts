/**
 * Risk Assessment & User Confirmation Guard
 * Intercepts risky operations:
 * - Permanent data / file deletion
 * - Financial transactions & payment triggers
 * - Pushing directly to production / main git branch
 */

import crypto from 'crypto';

export interface RiskCheckResult {
  isRisky: boolean;
  category?: 'deletion' | 'payment' | 'git_push_main' | 'system_config';
  reasonEn?: string;
  reasonSi?: string;
  confirmationToken?: string;
}

export class RiskGuard {
  /**
   * Evaluates if a planned action requires explicit user confirmation
   */
  public static evaluateRisk(action: {
    toolName: string;
    params: Record<string, any>;
    promptText?: string;
  }): RiskCheckResult {
    const text = `${action.toolName} ${JSON.stringify(action.params)} ${action.promptText || ''}`.toLowerCase();

    // 1. Git push to main / master
    if (
      action.toolName === 'github_push' ||
      text.includes('push to main') ||
      text.includes('push to master') ||
      (action.params.branch && (action.params.branch === 'main' || action.params.branch === 'master'))
    ) {
      return {
        isRisky: true,
        category: 'git_push_main',
        reasonEn: `Action requests pushing directly to the 'main' production branch. Please confirm.`,
        reasonSi: `'main' ප්‍රධාන ශාඛාවට සෘජුවම කේතය push කිරීමට ඉල්ලීමක් ඇත. කරුණාකර තහවුරු කරන්න.`,
        confirmationToken: crypto.randomBytes(16).toString('hex')
      };
    }

    // 2. Data or file deletion
    if (
      action.toolName === 'delete_file' ||
      action.toolName === 'delete_memory' ||
      /delete|remove|purge|drop\s+table|rm\s+-rf|මකන්න|ඉවත් කරන්න/.test(text)
    ) {
      return {
        isRisky: true,
        category: 'deletion',
        reasonEn: `Action will permanently delete files or memory records. Do you wish to proceed?`,
        reasonSi: `මෙම ක්‍රියාව මඟින් ගොනු හෝ මතක සටහන් ස්ථිරවම මකා දමනු ඇත. ඉදිරියට යාමට අවශ්‍යද?`,
        confirmationToken: crypto.randomBytes(16).toString('hex')
      };
    }

    // 3. Payment or financial authorization
    if (/payment|pay|transfer|checkout|charge|මුදල්|ගෙවීම/.test(text)) {
      return {
        isRisky: true,
        category: 'payment',
        reasonEn: `Action involves financial payment or funds transfer. User approval required.`,
        reasonSi: `මෙම ක්‍රියාව මඟින් මුදල් ගෙවීමක් සිදු වේ. ඔබගේ අනුමැතිය අවශ්‍යයි.`,
        confirmationToken: crypto.randomBytes(16).toString('hex')
      };
    }

    return { isRisky: false };
  }
}
