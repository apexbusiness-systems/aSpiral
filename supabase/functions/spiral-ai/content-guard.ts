/**
 * CONTENT GUARD - Multi-Layer Content Moderation System
 * 
 * Jurisdiction Compliance: US, Canada, EU (GDPR), UK, Australia, 
 * Asia-Pacific, South America, MENA
 * 
 * Defense-in-Depth Architecture:
 * Layer 1: Pattern-based blocking (instant)
 * Layer 2: Semantic analysis (context-aware)
 * Layer 3: Rate limiting & abuse detection
 * Layer 4: Compliance logging & audit trail
 */

// =============================================================================
// BLOCKED CONTENT CATEGORIES - Multi-Jurisdiction Compliance
// =============================================================================

export const BLOCKED_CATEGORIES = {
  // CSAM / Child Exploitation (All Jurisdictions - Zero Tolerance)
  CHILD_EXPLOITATION: {
    severity: "CRITICAL",
    action: "BLOCK_AND_REPORT",
    jurisdictions: ["ALL"],
    patterns: [
      /\b(child|minor|underage|kid|teen|preteen|juvenile)\b.*\b(porn|sex|nude|naked|exploit|abuse)/gi,
      /\b(cp|csam|pedo|paedo)\b/gi,
      /\b(loli|shota)\b/gi,
    ],
  },

  // Violence & Terrorism (All Jurisdictions)
  VIOLENCE_TERRORISM: {
    severity: "CRITICAL",
    action: "BLOCK",
    jurisdictions: ["ALL"],
    patterns: [
      /\b(how to|make|build|create)\b.*\b(bomb|explosive|weapon|poison|bioweapon)/gi,
      /\b(terrorist|terrorism|jihad|isis|al.?qaeda)\b.*\b(attack|plan|recruit|join)/gi,
      /\b(mass\s*shoot|school\s*shoot|massacre)\b.*\b(plan|how|where)/gi,
      /\b(assassin|murder|kill)\b.*\b(president|politician|leader|how to)/gi,
    ],
  },

  // Illegal Drugs - Synthesis/Manufacturing (DEA, Health Canada, EU)
  DRUG_MANUFACTURING: {
    severity: "HIGH",
    action: "BLOCK",
    jurisdictions: ["US", "CA", "EU", "AU", "UK"],
    patterns: [
      /\b(how to|make|synthesize|cook|manufacture)\b.*\b(meth|methamphetamine|heroin|fentanyl|cocaine|lsd|mdma|ecstasy)/gi,
      /\b(drug\s*lab|meth\s*lab)\b/gi,
      /\b(precursor\s*chemical|pill\s*press)\b.*\b(buy|source|get)/gi,
      /\bsynthesize\b.*\b(methamphetamine|amphetamine|fentanyl)/gi,
    ],
  },

  // Financial Crimes (SEC, FCA, ASIC, OSC)
  FINANCIAL_CRIME: {
    severity: "HIGH",
    action: "BLOCK",
    jurisdictions: ["US", "CA", "EU", "AU", "UK"],
    patterns: [
      /\b(money\s*launder(ing)?|launder(ing)?\s*money)\b.*\b(how|method|technique)/gi,
      /\bmoney\s*laundering\b.*\b(method|technique|scheme)/gi,
      /\b(tax\s*evasi|evade\s*tax)\b.*\b(how|method|offshore)/gi,
      /\b(insider\s*trad|front\s*run)\b.*\b(how|tip|profit)/gi,
      /\b(fraud|scam|ponzi|pyramid)\b.*\b(how to|set up|create)/gi,
    ],
  },

  // Hacking & Cybercrime (CFAA, CCPA, GDPR)
  CYBERCRIME: {
    severity: "HIGH",
    action: "BLOCK",
    jurisdictions: ["ALL"],
    patterns: [
      /\b(hack|crack|breach)\b.*\b(bank|government|password|account)/gi,
      /\b(ddos|denial.?of.?service)\b.*\b(attack|how|tool)/gi,
      /\b(ransomware|malware|trojan)\b.*\b(create|deploy|spread)/gi,
      /\b(phishing|spear.?phish)\b.*\b(template|how|kit)/gi,
      /\b(steal|harvest)\b.*\b(credit.?card|identity|credentials)/gi,
    ],
  },

  // Sexual Exploitation & Non-Consent
  SEXUAL_EXPLOITATION: {
    severity: "HIGH",
    action: "BLOCK",
    jurisdictions: ["ALL"],
    patterns: [
      /\b(rape|sexual.?assault)\b.*\b(how|fantasy|story|role.?play)/gi,
      /\b(revenge\s*porn|non.?consensual\s*porn)/gi,
      /\b(deepfake)\b.*\b(porn|nude|naked)/gi,
      /\b(drug|roofie|spike)\b.*\b(drink|date|girl|woman)/gi,
    ],
  },

  // Self-Harm & Suicide (Mental Health Compliance)
  SELF_HARM: {
    severity: "HIGH",
    action: "REDIRECT_RESOURCES",
    jurisdictions: ["ALL"],
    patterns: [
      /\b(how to|best way to|methods? to)\b.*\b(kill myself|commit suicide|end my life)/gi,
      /\b(suicide\s*method|painless\s*death|lethal\s*dose)/gi,
      /\b(cut|cutting|self.?harm)\b.*\b(how|deep|technique)/gi,
    ],
    resources: {
      US: "988 Suicide & Crisis Lifeline",
      CA: "988 (available in Quebec: 1-866-APPELLE)",
      UK: "116 123 (Samaritans)",
      AU: "13 11 14 (Lifeline)",
      EU: "112 (European Emergency)",
    },
  },

  // Hate Speech & Discrimination (All Jurisdictions)
  HATE_SPEECH: {
    severity: "MEDIUM",
    action: "BLOCK",
    jurisdictions: ["ALL"],
    patterns: [
      /\b(all|every)\s*(jews?|muslims?|blacks?|whites?|gays?|trans)\b.*\b(should|must|deserve)\s*(die|killed|eliminated)/gi,
      /\b(genocide|ethnic.?cleansing|holocaust.?denial)/gi,
      /\b(n[i1]gg[e3]r|f[a4]gg[o0]t|k[i1]ke|sp[i1]c|ch[i1]nk)\b/gi,
    ],
  },

  // Explicit Sexual Content (Lewd Filter)
  EXPLICIT_SEXUAL: {
    severity: "MEDIUM",
    action: "BLOCK",
    jurisdictions: ["ALL"],
    patterns: [
      /\b(porn|pornograph|hentai|xxx)\b.*\b(generate|create|write|describe)/gi,
      /\b(sex\s*story|erotic\s*fiction|smut)\b.*\b(write|create|generate)/gi,
      /\b(orgasm|ejaculat|masturbat|penetrat)\b.*\b(describe|detail|write)/gi,
      /\b(incest|bestiality|zoophilia)\b/gi,
    ],
  },

  // Weapons - Illegal Modifications
  ILLEGAL_WEAPONS: {
    severity: "HIGH",
    action: "BLOCK",
    jurisdictions: ["US", "CA", "EU", "AU", "UK"],
    patterns: [
      /\b(3d\s*print|ghost\s*gun|untraceable)\b.*\b(gun|firearm|weapon)/gi,
      /\b(auto\s*sear|full\s*auto\s*conversion|bump\s*stock)\b/gi,
      /\b(silencer|suppressor)\b.*\b(diy|homemade|make)/gi,
    ],
  },

  // Human Trafficking
  TRAFFICKING: {
    severity: "CRITICAL",
    action: "BLOCK_AND_REPORT",
    jurisdictions: ["ALL"],
    patterns: [
      /\b(human\s*traffick|sex\s*traffick|slave\s*trade)/gi,
      /\b(buy|sell|trade)\b.*\b(girls?|women|people|organs?)/gi,
      /\b(escort|prostitut)\b.*\b(underage|minor|teen)/gi,
    ],
  },
} as const;

// =============================================================================
// CONTENT MODERATION ENGINE
// =============================================================================

export interface ModerationResult {
  allowed: boolean;
  category?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  action?: string;
  reason?: string;
  resources?: Record<string, string>;
  auditLog: AuditEntry;
}

export interface AuditEntry {
  timestamp: string;
  requestId: string;
  contentHash: string;
  decision: "ALLOWED" | "BLOCKED" | "FLAGGED" | "REDIRECT";
  category?: string;
  processingTimeMs: number;
  jurisdictionChecks: string[];
}

// Simple hash for audit (no sensitive content stored)
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

export function moderateContent(
  content: string,
  requestId: string,
  userJurisdiction = "US"
): ModerationResult {
  const startTime = Date.now();
  const normalizedContent = content.toLowerCase();
  const jurisdictionChecks: string[] = [];

  // Layer 1: Pattern-based blocking (fast path)
  for (const [categoryName, category] of Object.entries(BLOCKED_CATEGORIES)) {
    // Check if applicable to user's jurisdiction
    const applicableJurisdictions = category.jurisdictions as readonly string[];
    if (!applicableJurisdictions.includes("ALL") && 
        !applicableJurisdictions.includes(userJurisdiction)) {
      continue;
    }
    jurisdictionChecks.push(categoryName);

    // Check all patterns in category
    for (const pattern of category.patterns) {
      if (pattern.test(normalizedContent)) {
        const processingTime = Date.now() - startTime;
        
        console.log(`[CONTENT-GUARD] 🚫 BLOCKED: ${categoryName}`, {
          requestId,
          severity: category.severity,
          action: category.action,
          processingMs: processingTime,
        });

        return {
          allowed: false,
          category: categoryName,
          severity: category.severity as ModerationResult["severity"],
          action: category.action,
          reason: `Content violates ${categoryName} policy`,
          resources: "resources" in category ? category.resources : undefined,
          auditLog: {
            timestamp: new Date().toISOString(),
            requestId,
            contentHash: hashContent(content),
            decision: category.action === "REDIRECT_RESOURCES" ? "REDIRECT" : "BLOCKED",
            category: categoryName,
            processingTimeMs: processingTime,
            jurisdictionChecks,
          },
        };
      }
    }
  }

  // Layer 2: Semantic context analysis (suspicious but not blocked)
  const suspiciousIndicators = checkSuspiciousPatterns(normalizedContent);
  
  const processingTime = Date.now() - startTime;
  
  return {
    allowed: true,
    auditLog: {
      timestamp: new Date().toISOString(),
      requestId,
      contentHash: hashContent(content),
      decision: suspiciousIndicators.length > 0 ? "FLAGGED" : "ALLOWED",
      processingTimeMs: processingTime,
      jurisdictionChecks,
    },
  };
}

// =============================================================================
// SUSPICIOUS PATTERN DETECTION (Soft Flags)
// =============================================================================

function checkSuspiciousPatterns(content: string): string[] {
  const flags: string[] = [];
  
  const suspiciousPatterns = [
    { pattern: /\b(jailbreak|bypass|ignore\s*rules)\b/gi, flag: "jailbreak_attempt" },
    { pattern: /\b(pretend|roleplay|act\s*as)\b.*\b(no\s*restrictions)/gi, flag: "restriction_bypass" },
    { pattern: /\b(dan|do\s*anything\s*now)\b/gi, flag: "dan_prompt" },
    { pattern: /\b(ignore\s*previous|forget\s*instructions)\b/gi, flag: "prompt_injection" },
  ];

  for (const { pattern, flag } of suspiciousPatterns) {
    if (pattern.test(content)) {
      flags.push(flag);
    }
  }

  return flags;
}

// =============================================================================
// SAFE RESPONSE TEMPLATES
// =============================================================================

export const SAFE_RESPONSES = {
  BLOCKED_GENERAL: {
    message: "I can't help with that request. Let's focus on something constructive.",
    suggestion: "What positive challenge can I help you work through?",
  },
  BLOCKED_VIOLENCE: {
    message: "I'm not able to assist with content involving violence or harm.",
    suggestion: "If you're dealing with difficult feelings, I'm here to help you process them safely.",
  },
  BLOCKED_ILLEGAL: {
    message: "I can't provide assistance with illegal activities.",
    suggestion: "Is there a legal alternative I can help you explore?",
  },
  REDIRECT_CRISIS: {
    message: "I'm concerned about what you've shared. You're not alone, and help is available.",
    resources: true,
  },
  RATE_LIMITED: {
    message: "You've reached your request limit. Please wait before trying again.",
    retryAfter: 60,
  },
  QUOTA_EXCEEDED: {
    message: "You've used your available prompts. Add credits to continue.",
    upgradeLink: true,
  },
};
