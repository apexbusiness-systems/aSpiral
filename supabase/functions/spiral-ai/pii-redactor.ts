/**
 * PII REDACTOR - Enhanced PII Detection and Redaction
 * 
 * Features:
 * - Standard PII patterns: email, phone, SSN, credit card, IP
 * - Obfuscated email detection (best-effort DLP)
 * - Robust counting even with non-global regex
 */

// =============================================================================
// PII PATTERN DEFINITIONS
// =============================================================================

export const PII_PATTERNS: Record<string, RegExp> = {
  // Standard email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (various formats) - Fixed: use \d, require at least one separator char
  phone: /(?:\+1[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g,
  
  // Social Security Numbers - Fixed: use \d, simplified hyphen class
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  
  // Credit card numbers
  creditCard: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
  
  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

// =============================================================================
// OBFUSCATED EMAIL PATTERNS
// =============================================================================

/**
 * Patterns for detecting obfuscated email addresses:
 * - "j dot doe at gmail dot com"
 * - "j[dot]doe(at)gmail[dot]com"
 * - "j (dot) doe (at) gmail (dot) com"
 */
// Simplified obfuscated email patterns to reduce complexity (SonarQube S5852)
// Each pattern targets a specific obfuscation style
export const OBFUSCATED_EMAIL_PATTERNS: RegExp[] = [
  // Pattern 1: "user dot name at domain dot com" (word boundaries, simple)
  /\b\w+\s+dot\s+\w+\s+at\s+\w+\s+dot\s+\w{2,}\b/gi,
  
  // Pattern 2: "user[dot]name[at]domain[dot]com" (bracket style)
  /\b\w+\[dot\]\w+\[at\]\w+\[dot\]\w{2,}\b/gi,
  
  // Pattern 3: "user(dot)name(at)domain(dot)com" (parentheses style)  
  /\b\w+\(dot\)\w+\(at\)\w+\(dot\)\w{2,}\b/gi,
];

// =============================================================================
// REDACTION FUNCTION
// =============================================================================

export interface RedactionResult {
  redacted: string;
  piiFound: string[];
}

/**
 * Redact PII from text, including obfuscated emails
 * 
 * @param text - Input text potentially containing PII
 * @returns Object with redacted text and list of PII types found
 */
export function redactPII(text: string): RedactionResult {
  const piiFound: string[] = [];
  let redacted = text;

  // Standard PII patterns
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    // Ensure we have a global regex for matching
    const globalPattern = pattern.global 
      ? pattern 
      : new RegExp(pattern.source, pattern.flags + 'g');
    
    const matches = text.match(globalPattern);
    if (matches && matches.length > 0) {
      piiFound.push(`${type}: ${matches.length} instance(s)`);
      redacted = redacted.replace(globalPattern, `[REDACTED_${type.toUpperCase()}]`);
    }
  }

  // Obfuscated email patterns
  let obfuscatedCount = 0;
  for (const pattern of OBFUSCATED_EMAIL_PATTERNS) {
    // Ensure global flag for proper matching
    const globalPattern = pattern.global 
      ? pattern 
      : new RegExp(pattern.source, pattern.flags + 'g');
    
    const matches = redacted.match(globalPattern);
    if (matches && matches.length > 0) {
      obfuscatedCount += matches.length;
      redacted = redacted.replace(globalPattern, "[REDACTED_OBFUSCATED_EMAIL]");
    }
  }
  
  if (obfuscatedCount > 0) {
    piiFound.push(`obfuscatedEmail: ${obfuscatedCount} instance(s)`);
  }

  return { redacted, piiFound };
}

// =============================================================================
// DETECTION ONLY (no redaction)
// =============================================================================

/**
 * Check if text contains any PII without modifying it
 */
export function containsPII(text: string): boolean {
  // Check standard patterns
  for (const pattern of Object.values(PII_PATTERNS)) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check obfuscated patterns
  for (const pattern of OBFUSCATED_EMAIL_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Get list of PII types found without redacting
 */
export function detectPIITypes(text: string): string[] {
  const types: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const globalPattern = pattern.global 
      ? pattern 
      : new RegExp(pattern.source, pattern.flags + 'g');
    
    if (globalPattern.test(text)) {
      types.push(type);
    }
    // Reset lastIndex for reuse
    globalPattern.lastIndex = 0;
  }

  for (const pattern of OBFUSCATED_EMAIL_PATTERNS) {
    if (pattern.test(text)) {
      types.push("obfuscatedEmail");
      break; // Only add once
    }
    pattern.lastIndex = 0;
  }

  return types;
}
