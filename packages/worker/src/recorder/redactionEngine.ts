/**
 * Redaction Engine for Veriship Interactive Screen Recorder
 * Handles multi-layer PII, credential, token, and sensitive field masking.
 */

// Calculate Shannon entropy in bits per character
export function calculateEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const map: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    map[c] = (map[c] || 0) + 1;
  }
  let entropy = 0;
  for (const c in map) {
    const p = map[c] / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// Luhn check algorithm for credit card numbers
export function isLuhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Safe allowlist patterns that should NOT trigger entropy-based redaction
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
const STANDARD_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Standard sensitive field patterns
const SENSITIVE_FIELD_NAMES = /(password|token|secret|cvv|cvc|card|ssn|auth|pin|key|credential|bearer|private_key|apikey)/i;
const SENSITIVE_INPUT_TYPES = ['password'];
const SENSITIVE_AUTOCOMPLETE = ['current-password', 'new-password', 'cc-number', 'cc-csc', 'cc-exp'];

export interface RedactionResult {
  isSensitive: boolean;
  value: string;
  placeholder?: string;
  reason?: string;
}

export class RedactionEngine {
  private customPatterns: RegExp[] = [];

  constructor(customFieldPatterns: string[] = []) {
    this.customPatterns = customFieldPatterns.map((p) => new RegExp(p, 'i'));
  }

  public checkAndRedact(
    fieldName: string = '',
    inputType: string = 'text',
    autocomplete: string = '',
    rawValue: string = ''
  ): RedactionResult {
    if (!rawValue) {
      return { isSensitive: false, value: rawValue };
    }

    // 1. Check Input Type
    if (SENSITIVE_INPUT_TYPES.includes(inputType.toLowerCase())) {
      return {
        isSensitive: true,
        value: '[REDACTED:PASSWORD]',
        placeholder: '{{SECRET_PASSWORD}}',
        reason: 'input_type_password',
      };
    }

    // 2. Check Autocomplete Attributes
    if (SENSITIVE_AUTOCOMPLETE.includes(autocomplete.toLowerCase())) {
      return {
        isSensitive: true,
        value: '[REDACTED:CREDENTIAL]',
        placeholder: '{{SECRET_CREDENTIAL}}',
        reason: 'autocomplete_sensitive',
      };
    }

    // 3. Check Field Name / Label Regex
    if (SENSITIVE_FIELD_NAMES.test(fieldName)) {
      const isCard = /card|cvv|cvc/i.test(fieldName);
      return {
        isSensitive: true,
        value: isCard ? '[REDACTED:PAYMENT_INFO]' : '[REDACTED:SECRET]',
        placeholder: isCard ? '{{SECRET_PAYMENT}}' : '{{SECRET_VALUE}}',
        reason: 'field_name_match',
      };
    }

    // 4. Check Custom Workspace Regex Patterns
    for (const pattern of this.customPatterns) {
      if (pattern.test(fieldName)) {
        return {
          isSensitive: true,
          value: '[REDACTED:CUSTOM_SENSITIVE]',
          placeholder: '{{SECRET_CUSTOM}}',
          reason: 'custom_workspace_pattern',
        };
      }
    }

    // 5. Value-level Heuristics (Luhn check for credit cards)
    const cleanDigits = rawValue.replace(/[\s-]/g, '');
    if (/^\d{13,19}$/.test(cleanDigits) && isLuhnValid(cleanDigits)) {
      return {
        isSensitive: true,
        value: '[REDACTED:CREDIT_CARD]',
        placeholder: '{{SECRET_CREDIT_CARD}}',
        reason: 'luhn_card_match',
      };
    }

    // 6. High-Entropy Token Check (Calibrated to ignore UUIDs, emails, slugs, and standard URLs)
    if (rawValue.length > 20) {
      const isExempt =
        UUID_REGEX.test(rawValue) ||
        EMAIL_REGEX.test(rawValue) ||
        URL_REGEX.test(rawValue) ||
        STANDARD_SLUG_REGEX.test(rawValue);

      if (!isExempt) {
        const entropy = calculateEntropy(rawValue);
        // Shannon entropy threshold calibrated: > 4.6 for long alphanumeric strings indicates raw keys / JWTs
        if (entropy > 4.6 && !rawValue.includes(' ')) {
          return {
            isSensitive: true,
            value: '[REDACTED:HIGH_ENTROPY_TOKEN]',
            placeholder: '{{SECRET_API_TOKEN}}',
            reason: `high_entropy_${entropy.toFixed(2)}`,
          };
        }
      }
    }

    return { isSensitive: false, value: rawValue };
  }

  // Locators to mask during Playwright screenshot captures
  public getScreenshotMaskSelectors(): string[] {
    return [
      'input[type="password"]',
      'input[autocomplete*="password"]',
      'input[autocomplete*="cc-"]',
      '[data-sensitive="true"]',
      '.sensitive-data',
    ];
  }
}
