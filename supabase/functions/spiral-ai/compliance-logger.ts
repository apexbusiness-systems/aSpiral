/**
 * COMPLIANCE LOGGER - Multi-Jurisdiction Audit & Compliance System
 * 
 * Compliance Standards:
 * - GDPR (EU) - Data minimization, right to erasure
 * - CCPA (California) - Consumer privacy rights
 * - PIPEDA (Canada) - Personal information protection
 * - APP (Australia) - Privacy principles
 * - LGPD (Brazil) - Data protection law
 * - POPIA (South Africa) - Information protection
 * 
 * Features:
 * - Immutable audit trail
 * - PII-free logging
 * - Geographic compliance routing
 * - Incident escalation
 */

// =============================================================================
// JURISDICTION CONFIGURATION
// =============================================================================

export interface JurisdictionConfig {
  code: string;
  name: string;
  regulations: string[];
  dataRetentionDays: number;
  requiresExplicitConsent: boolean;
  rightToErasure: boolean;
  ageOfConsent: number;
  reportingAuthority?: string;
}

export const JURISDICTIONS: Record<string, JurisdictionConfig> = {
  US: {
    code: "US",
    name: "United States",
    regulations: ["COPPA", "CCPA", "State Laws"],
    dataRetentionDays: 365,
    requiresExplicitConsent: false,
    rightToErasure: true, // CCPA
    ageOfConsent: 13,
    reportingAuthority: "FTC",
  },
  CA: {
    code: "CA",
    name: "Canada",
    regulations: ["PIPEDA", "CASL", "Provincial Laws"],
    dataRetentionDays: 365,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 13,
    reportingAuthority: "OPC",
  },
  EU: {
    code: "EU",
    name: "European Union",
    regulations: ["GDPR", "ePrivacy", "DSA"],
    dataRetentionDays: 90,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 16,
    reportingAuthority: "DPA",
  },
  UK: {
    code: "UK",
    name: "United Kingdom",
    regulations: ["UK GDPR", "DPA 2018"],
    dataRetentionDays: 90,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 13,
    reportingAuthority: "ICO",
  },
  AU: {
    code: "AU",
    name: "Australia",
    regulations: ["Privacy Act", "APP", "Online Safety Act"],
    dataRetentionDays: 180,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 15,
    reportingAuthority: "OAIC",
  },
  BR: {
    code: "BR",
    name: "Brazil",
    regulations: ["LGPD"],
    dataRetentionDays: 180,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 12,
    reportingAuthority: "ANPD",
  },
  JP: {
    code: "JP",
    name: "Japan",
    regulations: ["APPI"],
    dataRetentionDays: 365,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 13,
    reportingAuthority: "PPC",
  },
  SG: {
    code: "SG",
    name: "Singapore",
    regulations: ["PDPA"],
    dataRetentionDays: 365,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 13,
    reportingAuthority: "PDPC",
  },
  IN: {
    code: "IN",
    name: "India",
    regulations: ["DPDP Act 2023"],
    dataRetentionDays: 365,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 18,
    reportingAuthority: "DPA India",
  },
  ZA: {
    code: "ZA",
    name: "South Africa",
    regulations: ["POPIA"],
    dataRetentionDays: 365,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 18,
    reportingAuthority: "Information Regulator",
  },
  MX: {
    code: "MX",
    name: "Mexico",
    regulations: ["LFPDPPP"],
    dataRetentionDays: 365,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 18,
    reportingAuthority: "INAI",
  },
  DEFAULT: {
    code: "DEFAULT",
    name: "Default/Unknown",
    regulations: ["Best Practices"],
    dataRetentionDays: 90,
    requiresExplicitConsent: true,
    rightToErasure: true,
    ageOfConsent: 18,
    reportingAuthority: undefined,
  },
};

// =============================================================================
// AUDIT LOG TYPES
// =============================================================================

export type AuditEventType = 
  | "REQUEST_RECEIVED"
  | "CONTENT_MODERATED"
  | "RATE_LIMIT_CHECK"
  | "PII_REDACTED"
  | "RESPONSE_GENERATED"
  | "ERROR_OCCURRED"
  | "BLOCKED_CONTENT"
  | "SUSPICIOUS_ACTIVITY"
  | "ESCALATION_TRIGGERED"
  | "HEADER_WARNING"
  | "VALIDATION_FAILED"
  | "INJECTION_CHECK"
  | "ANOMALY_DETECTED";

export interface ComplianceAuditLog {
  // Identification (no PII)
  eventId: string;
  requestId: string;
  sessionHash: string; // Hashed session ID
  
  // Event details
  eventType: AuditEventType;
  timestamp: string;
  
  // Jurisdiction
  jurisdiction: string;
  applicableRegulations: string[];
  
  // Content metadata (no actual content)
  contentHash?: string;
  contentLength?: number;
  containsPII?: boolean;
  piiTypesFound?: string[];
  
  // Moderation outcome
  moderationDecision?: "ALLOWED" | "BLOCKED" | "FLAGGED" | "REDIRECT";
  moderationCategory?: string;
  moderationSeverity?: string;
  
  // Rate limiting
  rateLimitStatus?: "ALLOWED" | "LIMITED" | "BLOCKED";
  currentUsage?: { minute: number; hour: number; day: number };
  
  // Processing
  processingTimeMs: number;
  
  // Error info (sanitized)
  errorCode?: string;
  errorMessage?: string;
  
  // Escalation
  escalated?: boolean;
  escalationReason?: string;
}

// =============================================================================
// COMPLIANCE LOGGER CLASS
// =============================================================================

export class ComplianceLogger {
  private logs: ComplianceAuditLog[] = [];
  private jurisdiction: JurisdictionConfig;
  private requestId: string;
  private startTime: number;

  constructor(requestId: string, jurisdictionCode: string = "DEFAULT") {
    this.requestId = requestId;
    this.jurisdiction = JURISDICTIONS[jurisdictionCode] || JURISDICTIONS.DEFAULT;
    this.startTime = Date.now();
  }

  // Hash sensitive identifiers
  private hashIdentifier(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `h:${Math.abs(hash).toString(36)}`;
  }

  // Generate unique event ID
  private generateEventId(): string {
    return `evt_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Log an event
  log(
    eventType: AuditEventType,
    details: Partial<ComplianceAuditLog> = {}
  ): void {
    const entry: ComplianceAuditLog = {
      eventId: this.generateEventId(),
      requestId: this.requestId,
      sessionHash: details.sessionHash || "unknown",
      eventType,
      timestamp: new Date().toISOString(),
      jurisdiction: this.jurisdiction.code,
      applicableRegulations: this.jurisdiction.regulations,
      processingTimeMs: Date.now() - this.startTime,
      ...details,
    };

    this.logs.push(entry);

    // Console output for development
    const logLevel = this.getLogLevel(eventType);
    console[logLevel](`[COMPLIANCE] ${eventType}`, {
      requestId: this.requestId,
      jurisdiction: this.jurisdiction.code,
      ...this.sanitizeForConsole(details),
    });

    // Check for escalation triggers
    this.checkEscalation(entry);
  }

  private getLogLevel(eventType: AuditEventType): "log" | "warn" | "error" {
    switch (eventType) {
      case "BLOCKED_CONTENT":
      case "ESCALATION_TRIGGERED":
        return "error";
      case "SUSPICIOUS_ACTIVITY":
      case "ERROR_OCCURRED":
        return "warn";
      default:
        return "log";
    }
  }

  private sanitizeForConsole(details: Partial<ComplianceAuditLog>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      if (key === "contentHash" || key === "sessionHash") {
        sanitized[key] = value; // Already hashed
      } else if (typeof value === "string" && value.length > 100) {
        sanitized[key] = `${value.substring(0, 50)}...`;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // =============================================================================
  // ESCALATION SYSTEM
  // =============================================================================

  private checkEscalation(entry: ComplianceAuditLog): void {
    const escalationTriggers = [
      entry.moderationCategory === "CHILD_EXPLOITATION",
      entry.moderationCategory === "TRAFFICKING",
      entry.moderationSeverity === "CRITICAL",
      entry.errorCode === "SYSTEM_COMPROMISE",
    ];

    if (escalationTriggers.some(t => t)) {
      this.escalate(entry, "Critical content violation");
    }
  }

  private escalate(entry: ComplianceAuditLog, reason: string): void {
    console.error(`[COMPLIANCE] 🚨 ESCALATION: ${reason}`, {
      eventId: entry.eventId,
      requestId: entry.requestId,
      category: entry.moderationCategory,
      jurisdiction: entry.jurisdiction,
      authority: this.jurisdiction.reportingAuthority,
    });

    // In production: Send to incident response system
    // - Alert security team
    // - Create incident ticket
    // - Notify legal if required
    // - Report to authorities if mandated (CSAM)
  }

  // =============================================================================
  // REPORTING
  // =============================================================================

  getAuditTrail(): ComplianceAuditLog[] {
    return [...this.logs];
  }

  getSummary(): {
    requestId: string;
    jurisdiction: string;
    totalEvents: number;
    blocked: boolean;
    escalated: boolean;
    totalTimeMs: number;
  } {
    return {
      requestId: this.requestId,
      jurisdiction: this.jurisdiction.code,
      totalEvents: this.logs.length,
      blocked: this.logs.some(l => l.moderationDecision === "BLOCKED"),
      escalated: this.logs.some(l => l.escalated),
      totalTimeMs: Date.now() - this.startTime,
    };
  }

  // =============================================================================
  // DATA RETENTION COMPLIANCE
  // =============================================================================

  getRetentionPolicy(): {
    retentionDays: number;
    regulations: string[];
    rightToErasure: boolean;
  } {
    return {
      retentionDays: this.jurisdiction.dataRetentionDays,
      regulations: this.jurisdiction.regulations,
      rightToErasure: this.jurisdiction.rightToErasure,
    };
  }
}

// =============================================================================
// HELPER: Detect Jurisdiction from Request
// =============================================================================

export function detectJurisdiction(request: Request): string {
  // Check CF-IPCountry header (Cloudflare)
  const cfCountry = request.headers.get("CF-IPCountry");
  if (cfCountry && JURISDICTIONS[cfCountry]) {
    return cfCountry;
  }

  // Check X-Country header (custom)
  const xCountry = request.headers.get("X-Country");
  if (xCountry && JURISDICTIONS[xCountry]) {
    return xCountry;
  }

  // Check Accept-Language for hints
  const acceptLang = request.headers.get("Accept-Language");
  if (acceptLang) {
    if (acceptLang.includes("en-GB")) return "UK";
    if (acceptLang.includes("en-AU")) return "AU";
    if (acceptLang.includes("en-CA") || acceptLang.includes("fr-CA")) return "CA";
    if (acceptLang.includes("pt-BR")) return "BR";
    if (acceptLang.includes("de") || acceptLang.includes("fr") || acceptLang.includes("es")) return "EU";
    if (acceptLang.includes("ja")) return "JP";
  }

  // Default to most restrictive
  return "EU";
}
