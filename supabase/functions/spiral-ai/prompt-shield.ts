/**
 * PROMPT SHIELD - Advanced Prompt Injection Defense System
 * 
 * Multi-Layer Defense Architecture:
 * Layer 1: Pattern-based injection detection (instant)
 * Layer 2: Semantic attack detection (context-aware)
 * Layer 3: Input normalization & sanitization
 * Layer 4: Output validation & filtering
 * Layer 5: Request fingerprinting & anomaly detection
 * 
 * Compliance: OWASP LLM Top 10, NIST AI RMF
 */

// =============================================================================
// INJECTION ATTACK PATTERNS - Comprehensive Detection
// =============================================================================

const INJECTION_PATTERNS = {
  // Direct Jailbreak Attempts
  JAILBREAK_DIRECT: {
    severity: "CRITICAL",
    patterns: [
      /ignore\s*(all\s*)?(previous|prior|above|earlier)\s*(instructions?|prompts?|rules?|guidelines?)/gi,
      /forget\s*(everything|all|what)\s*(you|i)\s*(told|said|know)/gi,
      /disregard\s*(your|all|the)\s*(training|rules?|instructions?|guidelines?)/gi,
      /override\s*(your|the|all)\s*(safety|security|rules?|restrictions?)/gi,
      /bypass\s*(your|the|all)\s*(filters?|safeguards?|protections?)/gi,
      /you\s*are\s*now\s*(free|unrestricted|unfiltered|uncensored)/gi,
      /from\s*now\s*on[,\s]*(you|ignore|forget|disregard)/gi,
      /new\s*instructions?\s*[:;]\s*(ignore|forget|override)/gi,
    ],
  },

  // DAN (Do Anything Now) Style Attacks
  DAN_ATTACKS: {
    severity: "CRITICAL",
    patterns: [
      /\bdan\s*(mode|prompt|jailbreak)?\b/gi,
      /do\s*anything\s*now/gi,
      /\banti[\s-]?ai\b/gi,
      /\bunlock(ed)?\s*(mode|version)\b/gi,
      /\bdeveloper\s*mode\s*(enabled|on|activated)\b/gi,
      /\bgodmode\b/gi,
      /\bsudo\s*mode\b/gi,
      /\badmin(istrator)?\s*access\b/gi,
      /\benable\s*jailbreak\b/gi,
      /\bmaximum\s*(freedom|power)\s*mode\b/gi,
    ],
  },

  // Role-Playing Manipulation
  ROLEPLAY_INJECTION: {
    severity: "HIGH",
    patterns: [
      /pretend\s*(you('re|are)|to\s*be)\s*(a|an)?\s*(evil|unethical|unrestricted)/gi,
      /act\s*as\s*(if|though)?\s*(you\s*have)?\s*no\s*(rules?|restrictions?|limits?)/gi,
      /roleplay\s*as\s*(a|an)?\s*(hacker|criminal|malicious)/gi,
      /imagine\s*you('re|are)\s*(free|not\s*bound|unrestricted)/gi,
      /you\s*are\s*(playing|acting\s*as)\s*(a|an)?\s*(different|evil|bad)/gi,
      /character\s*(mode|setting)\s*[:;]\s*(evil|unrestricted|criminal)/gi,
      /in\s*this\s*(story|scenario)[,\s]*you\s*(have|are|can)\s*(no|unlimited)/gi,
    ],
  },

  // System Prompt Extraction
  SYSTEM_PROMPT_LEAK: {
    severity: "CRITICAL",
    patterns: [
      /what\s*(is|are)\s*your\s*(system\s*)?(prompt|instructions?)/gi,
      /reveal\s*(your|the)\s*(system\s*)?(prompt|instructions?)/gi,
      /show\s*me\s*(your|the)\s*(hidden|system|secret)\s*(prompt|instructions?)/gi,
      /print\s*(your|the)\s*(system\s*)?(prompt|instructions?|rules?)/gi,
      /output\s*(your|the)\s*(initial|system|secret)\s*(prompt|message)/gi,
      /repeat\s*(your|the)\s*(system|initial)\s*(prompt|instructions?)/gi,
      /what\s*were\s*you\s*told\s*(initially|first|before)/gi,
      /extract\s*(the|your)\s*(system|initial)\s*prompt/gi,
      /leak\s*(your|the)\s*(system\s*)?(prompt|instructions?)/gi,
    ],
  },

  // Delimiter/Encoding Attacks
  DELIMITER_INJECTION: {
    severity: "HIGH",
    patterns: [
      /```\s*(system|ignore|override|new\s*instructions?)/gi,
      /\[\[system\]\]/gi,
      /\{\{system\}\}/gi,
      /<\s*system\s*>/gi,
      /###\s*(system|instructions?|override)/gi,
      /\*\*\*\s*(new|override|ignore)\s*(instructions?|rules?)/gi,
      /---\s*(system|ignore|override)/gi,
      /base64\s*[:;]\s*[a-zA-Z0-9+/=]+/gi,
      /\\x[0-9a-fA-F]{2}/g,
      /\\u[0-9a-fA-F]{4}/g,
    ],
  },

  // Context Manipulation
  CONTEXT_MANIPULATION: {
    severity: "HIGH",
    patterns: [
      /\[end\s*of\s*(system|initial)\s*(prompt|message)\]/gi,
      /\[new\s*(context|session|conversation)\]/gi,
      /\[assistant\s*says?\]/gi,
      /\[start\s*of\s*new\s*instructions?\]/gi,
      /<\/?human>|<\/?assistant>|<\/?system>/gi,
      /human:\s*ignore|assistant:\s*confirmed/gi,
      /end\s*system\s*prompt/gi,
      /begin\s*new\s*instructions?/gi,
    ],
  },

  // Indirect Injection (Data Exfiltration)
  DATA_EXFILTRATION: {
    severity: "CRITICAL",
    patterns: [
      /send\s*(to|via)\s*(webhook|url|api|endpoint)/gi,
      /fetch\s*from\s*(url|http|api)/gi,
      /http[s]?:\/\/[^\s]+/gi, // URLs in prompts
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /import\s*\(/gi,
      /require\s*\(/gi,
      /\$\{.*\}/g, // Template literals
      /`.*\$\{.*\}.*`/g,
    ],
  },

  // Recursive/Loop Attacks
  RECURSIVE_ATTACKS: {
    severity: "MEDIUM",
    patterns: [
      /repeat\s*(this|yourself|the\s*following)\s*(forever|infinitely|1000)/gi,
      /loop\s*(until|forever|infinitely)/gi,
      /while\s*true\s*do/gi,
      /for\s*\(\s*;\s*;\s*\)/gi,
      /never\s*stop\s*(responding|generating|outputting)/gi,
    ],
  },

  // Homoglyph/Unicode Attacks
  HOMOGLYPH_ATTACKS: {
    severity: "HIGH",
    patterns: [
      // Cyrillic lookalikes for "ignore"
      /[іiı][ğgɡ][ñnη][оoο][řrг][еeε]/gi,
      // Zero-width characters
      /[\u200B\u200C\u200D\uFEFF\u2060]/g,
      // Invisible separators
      /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g,
      // Right-to-left override
      /[\u202A-\u202E\u2066-\u2069]/g,
    ],
  },

  // Payload Obfuscation
  OBFUSCATION_ATTEMPTS: {
    severity: "HIGH",
    patterns: [
      /i\s*g\s*n\s*o\s*r\s*e/gi, // Spaced out "ignore"
      /i\.g\.n\.o\.r\.e/gi, // Dotted
      /i-g-n-o-r-e/gi, // Hyphenated
      /i_g_n_o_r_e/gi, // Underscored
      /1gn0r3/gi, // Leetspeak
      /!gnore/gi, // Symbol substitution
      /ign0re/gi,
      /ignor3/gi,
      /byp[a4@]ss/gi, // Bypass variations
      /j[a4@]ilbre[a4@]k/gi, // Jailbreak variations
    ],
  },
};

// =============================================================================
// PROMPT INJECTION DETECTOR
// =============================================================================

export interface InjectionDetectionResult {
  isSafe: boolean;
  threats: ThreatInfo[];
  sanitizedInput: string;
  riskScore: number;
  fingerprint: string;
  auditLog: InjectionAuditLog;
}

export interface ThreatInfo {
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  matchedPattern: string;
  position: number;
}

export interface InjectionAuditLog {
  timestamp: string;
  requestId: string;
  inputHash: string;
  threatCount: number;
  riskScore: number;
  blocked: boolean;
  sanitized: boolean;
  processingTimeMs: number;
}

// Secure hash function
function hashInput(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
  }
  return `inj:${Math.abs(hash).toString(16).padStart(12, '0')}`;
}

// Generate request fingerprint for anomaly detection
function generateFingerprint(input: string, headers?: Record<string, string>): string {
  const components = [
    input.length.toString(),
    input.split(/\s+/).length.toString(), // Word count
    (input.match(/[^\x00-\x7F]/g) || []).length.toString(), // Non-ASCII count
    (input.match(/[A-Z]/g) || []).length.toString(), // Uppercase count
  ];
  return `fp:${components.join('-')}`;
}

// =============================================================================
// MAIN DETECTION FUNCTION
// =============================================================================

export function detectPromptInjection(
  input: string,
  requestId: string
): InjectionDetectionResult {
  const startTime = Date.now();
  const threats: ThreatInfo[] = [];
  let riskScore = 0;

  // Normalize input for detection
  const normalizedInput = input.toLowerCase();
  
  // Check all injection pattern categories
  for (const [categoryName, category] of Object.entries(INJECTION_PATTERNS)) {
    for (const pattern of category.patterns) {
      const matches = normalizedInput.match(pattern);
      if (matches) {
        const severityWeight = {
          LOW: 10,
          MEDIUM: 25,
          HIGH: 50,
          CRITICAL: 100,
        }[category.severity] || 25;

        riskScore += severityWeight * matches.length;

        threats.push({
          category: categoryName,
          severity: category.severity as ThreatInfo["severity"],
          matchedPattern: matches[0].substring(0, 50),
          position: normalizedInput.indexOf(matches[0]),
        });
      }
    }
  }

  // Entropy analysis - high entropy might indicate encoded payloads
  const entropyScore = calculateEntropy(input);
  if (entropyScore > 4.5) {
    riskScore += 15;
    threats.push({
      category: "HIGH_ENTROPY",
      severity: "MEDIUM",
      matchedPattern: `entropy=${entropyScore.toFixed(2)}`,
      position: 0,
    });
  }

  // Unusual character ratio detection
  const nonAsciiRatio = (input.match(/[^\x00-\x7F]/g) || []).length / input.length;
  if (nonAsciiRatio > 0.3) {
    riskScore += 20;
    threats.push({
      category: "HIGH_NON_ASCII",
      severity: "MEDIUM",
      matchedPattern: `ratio=${(nonAsciiRatio * 100).toFixed(1)}%`,
      position: 0,
    });
  }

  // Sanitize input (remove dangerous characters)
  const sanitizedInput = sanitizeInput(input);

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore);

  const processingTime = Date.now() - startTime;
  const isSafe = riskScore < 50; // Threshold for blocking

  if (!isSafe) {
    console.log(`[PROMPT-SHIELD] 🛡️ BLOCKED injection attempt`, {
      requestId,
      riskScore,
      threatCount: threats.length,
      topThreats: threats.slice(0, 3).map(t => t.category),
    });
  }

  return {
    isSafe,
    threats,
    sanitizedInput: isSafe ? sanitizedInput : "",
    riskScore,
    fingerprint: generateFingerprint(input),
    auditLog: {
      timestamp: new Date().toISOString(),
      requestId,
      inputHash: hashInput(input),
      threatCount: threats.length,
      riskScore,
      blocked: !isSafe,
      sanitized: sanitizedInput !== input,
      processingTimeMs: processingTime,
    },
  };
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

function sanitizeInput(input: string): string {
  let sanitized = input;

  // Remove zero-width characters
  sanitized = sanitized.replace(/[\u200B\u200C\u200D\uFEFF\u2060]/g, "");
  
  // Remove invisible separators
  sanitized = sanitized.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ");
  
  // Remove directional override characters
  sanitized = sanitized.replace(/[\u202A-\u202E\u2066-\u2069]/g, "");
  
  // Normalize multiple spaces/newlines
  sanitized = sanitized.replace(/\s+/g, " ");
  
  // Remove potential delimiter injections
  sanitized = sanitized.replace(/```[^`]*```/g, "[CODE_BLOCK_REMOVED]");
  sanitized = sanitized.replace(/\[\[.*?\]\]/g, "[BRACKET_REMOVED]");
  sanitized = sanitized.replace(/\{\{.*?\}\}/g, "[BRACE_REMOVED]");
  
  // Remove URLs (prevent exfiltration)
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, "[URL_REMOVED]");
  
  // Limit consecutive repeated characters (anti-abuse)
  sanitized = sanitized.replace(/(.)\1{10,}/g, "$1$1$1");

  return sanitized.trim();
}

// =============================================================================
// ENTROPY CALCULATION
// =============================================================================

function calculateEntropy(input: string): number {
  const freq: Record<string, number> = {};
  for (const char of input) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = input.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// =============================================================================
// OUTPUT VALIDATION (Prevent LLM Leaking System Prompt)
// =============================================================================

const OUTPUT_LEAK_PATTERNS = [
  /my\s*(system\s*)?(instructions?|prompt)\s*(are|is|say)/gi,
  /i\s*(was|am)\s*(told|instructed|programmed)\s*to/gi,
  /my\s*initial\s*(prompt|instructions?|programming)/gi,
  /here('s|is)\s*(my|the)\s*(system\s*)?(prompt|instructions?)/gi,
  /the\s*system\s*prompt\s*(is|says|reads)/gi,
];

export function validateOutput(output: string): { safe: boolean; filtered: string } {
  let filtered = output;
  let leakDetected = false;

  for (const pattern of OUTPUT_LEAK_PATTERNS) {
    if (pattern.test(filtered)) {
      leakDetected = true;
      filtered = filtered.replace(pattern, "[CONTENT FILTERED]");
    }
  }

  if (leakDetected) {
    console.log("[PROMPT-SHIELD] ⚠️ Output leak attempt filtered");
  }

  return {
    safe: !leakDetected,
    filtered,
  };
}

// =============================================================================
// RATE ANOMALY DETECTION
// =============================================================================

interface RequestPattern {
  count: number;
  timestamps: number[];
  avgLength: number;
  fingerprints: Set<string>;
}

const requestPatterns = new Map<string, RequestPattern>();
const ANOMALY_WINDOW_MS = 60000; // 1 minute
const ANOMALY_THRESHOLD = 10; // requests per minute

export function detectAnomaly(userId: string, fingerprint: string, inputLength: number): {
  isAnomaly: boolean;
  reason?: string;
} {
  const now = Date.now();
  const pattern = requestPatterns.get(userId) || {
    count: 0,
    timestamps: [],
    avgLength: 0,
    fingerprints: new Set(),
  };

  // Clean old timestamps
  pattern.timestamps = pattern.timestamps.filter(t => now - t < ANOMALY_WINDOW_MS);
  pattern.count = pattern.timestamps.length;

  // Check for rapid-fire requests
  if (pattern.count > ANOMALY_THRESHOLD) {
    return { isAnomaly: true, reason: "RATE_ANOMALY" };
  }

  // Check for fingerprint diversity (might indicate fuzzing attack)
  pattern.fingerprints.add(fingerprint);
  if (pattern.count > 5 && pattern.fingerprints.size > pattern.count * 0.9) {
    return { isAnomaly: true, reason: "FINGERPRINT_VARIANCE" };
  }

  // Update pattern
  pattern.timestamps.push(now);
  pattern.avgLength = (pattern.avgLength * pattern.count + inputLength) / (pattern.count + 1);
  requestPatterns.set(userId, pattern);

  return { isAnomaly: false };
}

// =============================================================================
// SAFE RESPONSES FOR INJECTION ATTEMPTS
// =============================================================================

export const INJECTION_RESPONSES = {
  BLOCKED: {
    message: "I noticed something unusual in your request. Let's focus on what's really on your mind.",
    suggestion: "What challenge would you like to explore today?",
  },
  RATE_ANOMALY: {
    message: "Please slow down. Take a breath and try again.",
    retryAfter: 60,
  },
  SYSTEM_LEAK: {
    message: "I'm here to help you explore your thoughts, not to discuss my instructions.",
    suggestion: "What's the real question underneath?",
  },
};
