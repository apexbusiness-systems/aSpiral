import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Shield,
  Eye,
  Database,
  Lock,
  Mic,
  Cookie,
  UserX,
  Mail,
  Globe,
  Server,
  ChevronRight,
} from "lucide-react";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageFooter } from "@/components/layout/PageFooter";
import { QuickLinks } from "@/components/layout/QuickLinks";

const CONTACT_EMAIL = "info-outreach@aspiral.icu";
const EFFECTIVE_DATE = "March 22, 2026";

// ─── Section Data ────────────────────────────────────────────────────────────

const sections = [
  {
    id: "overview",
    icon: <Shield className="h-5 w-5" />,
    title: "Overview",
    content: [
      'aSpiral ("we", "us", "our") operates the aSpiral application at aspiral.icu. This Privacy Policy explains what data we collect, how we use it, and the choices you have.',
      "We are a small team based in Edmonton, Alberta, Canada. We believe your mental health data is deeply personal — our practices reflect that.",
      "By using aSpiral, you agree to the practices described in this policy. If you disagree, please discontinue use and contact us to delete your data.",
    ],
  },
  {
    id: "data-we-collect",
    icon: <Database className="h-5 w-5" />,
    title: "Data We Collect",
    subsections: [
      {
        heading: "Account Information",
        items: [
          "Email address — required for account creation and login",
          "Password — hashed and stored securely by Supabase Auth (we never see or store plaintext passwords)",
          "Display name — optional, set by you",
          "Google account identifier — if you sign in with Google OAuth",
        ],
      },
      {
        heading: "Session Content",
        items: [
          "Transcribed text from your voice input (see Audio Data below)",
          "Entities, connections, friction points, grease points, and insights generated during your sessions",
          "Breakthrough summaries produced by the AI",
        ],
      },
      {
        heading: "Audio Data",
        items: [
          "Voice recordings are transcribed in real time and immediately discarded",
          "We never store, retain, or transmit raw audio recordings",
          "Only the transcribed text is saved to your session",
        ],
      },
      {
        heading: "Device & Technical Data",
        items: [
          "A randomly generated device fingerprint (UUID) stored in your browser's localStorage — used for encryption key derivation, not for tracking",
          "Browser user agent and basic device information for compatibility",
        ],
      },
      {
        heading: "Usage Analytics (Opt-In)",
        items: [
          "Feature usage events (e.g. session started, breakthrough achieved)",
          "Performance metrics (e.g. load times, cinematic rendering)",
          "Analytics are powered by PostHog and can be fully disabled in Settings",
          "When opted out, no usage data is captured or transmitted",
        ],
      },
    ],
  },
  {
    id: "how-we-use-data",
    icon: <Eye className="h-5 w-5" />,
    title: "How We Use Your Data",
    content: [
      "We use your data exclusively to operate and improve the aSpiral service:",
    ],
    items: [
      "Deliver your breakthroughs — your session content is processed by AI to generate insights",
      "Authenticate your identity and secure your account",
      "Save your session history so you can revisit past breakthroughs",
      "Improve the product through aggregated, anonymized usage analytics (only when you've opted in)",
      "Respond to your support requests",
    ],
    footer:
      "We do not use your personal session content to train or fine-tune any AI model. Your breakthroughs are yours.",
  },
  {
    id: "data-sharing",
    icon: <Globe className="h-5 w-5" />,
    title: "Data Sharing & Third Parties",
    content: [
      "We do not sell, rent, or trade your personal data. We do not share your session content with advertisers or third parties for marketing purposes.",
      "We use the following third-party services to operate aSpiral:",
    ],
    services: [
      {
        name: "Supabase",
        purpose: "Authentication, database, and row-level security",
        data: "Account information, session content",
      },
      {
        name: "OpenAI",
        purpose: "AI-powered breakthrough generation",
        data: "Transcribed session text (processed per-request, not stored by us for training)",
      },
      {
        name: "PostHog",
        purpose: "Product analytics (opt-in only)",
        data: "Anonymized usage events and performance metrics",
      },
      {
        name: "Google OAuth",
        purpose: "Optional sign-in method",
        data: "Google account identifier (only if you choose Google sign-in)",
      },
      {
        name: "Vercel",
        purpose: "Hosting and deployment",
        data: "Standard web server logs (IP address, request metadata)",
      },
    ],
    footer:
      "Each third-party service is bound by their own privacy policy. We select services that align with strong data protection practices.",
  },
  {
    id: "data-security",
    icon: <Lock className="h-5 w-5" />,
    title: "Data Security",
    content: [
      "We implement multiple layers of security to protect your data:",
    ],
    items: [
      "Row-level security (RLS) in our database — your data is only accessible to your authenticated account",
      "Passwords are hashed using industry-standard algorithms (handled by Supabase Auth)",
      "Auth tokens are stored in sessionStorage (cleared when you close your browser tab)",
      "Device-bound encryption key derivation for sensitive local data",
      "All data transmitted over HTTPS/TLS encryption",
      "Prompt injection shields on AI processing endpoints",
    ],
    footer:
      "No system is 100% secure. If you discover a vulnerability, please report it to us immediately at " + CONTACT_EMAIL + ".",
  },
  {
    id: "audio-privacy",
    icon: <Mic className="h-5 w-5" />,
    title: "Voice & Audio Privacy",
    content: [
      "Your voice is the primary input for aSpiral. We treat it with the highest level of care:",
    ],
    items: [
      "Audio is captured by your browser's microphone API and transcribed in real time",
      "Raw audio data is immediately discarded after transcription — it is never stored, uploaded, or retained",
      "Only the resulting text transcript is saved to your session",
      "You control microphone access through your browser or device permissions at all times",
    ],
  },
  {
    id: "cookies-storage",
    icon: <Cookie className="h-5 w-5" />,
    title: "Cookies & Local Storage",
    content: [
      "aSpiral does not use traditional tracking cookies. We use browser storage for essential functionality only:",
    ],
    storageItems: [
      {
        key: "sessionStorage",
        purpose: "Supabase auth tokens — cleared when you close the browser tab",
      },
      {
        key: "localStorage: aspiral_settings_v1",
        purpose: "Your app preferences (voice settings, theme, animation toggles)",
      },
      {
        key: "localStorage: aspiral_analytics_enabled",
        purpose: "Your analytics opt-in/out preference",
      },
      {
        key: "localStorage: aspiral_device_fingerprint",
        purpose: "Randomly generated device UUID for encryption key derivation",
      },
      {
        key: "localStorage: PostHog data",
        purpose: "Analytics session data (only when opted in)",
      },
    ],
    footer:
      "You can clear all local data at any time through your browser settings. This will sign you out and reset your preferences.",
  },
  {
    id: "your-rights",
    icon: <UserX className="h-5 w-5" />,
    title: "Your Rights & Choices",
    content: ["You have full control over your data:"],
    rights: [
      {
        right: "Access & Export",
        description:
          "Request a portable copy of all your session data by emailing us.",
      },
      {
        right: "Deletion",
        description:
          'Request complete account and data deletion by emailing us with subject "Delete my account". We will remove all your data within 7 days and confirm when complete.',
      },
      {
        right: "Analytics Opt-Out",
        description:
          "Disable analytics at any time in your app Settings. When disabled, zero usage data is captured or sent.",
      },
      {
        right: "Microphone Control",
        description:
          "Revoke microphone access at any time through your browser or device settings.",
      },
      {
        right: "Correction",
        description:
          "Request correction of any inaccurate personal data by contacting us.",
      },
    ],
  },
  {
    id: "children",
    icon: <Shield className="h-5 w-5" />,
    title: "Children's Privacy",
    content: [
      "aSpiral is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.",
    ],
  },
  {
    id: "data-retention",
    icon: <Server className="h-5 w-5" />,
    title: "Data Retention",
    content: [
      "We retain your account and session data for as long as you maintain an active account. Upon account deletion request, all associated data is permanently removed within 7 days.",
      "Anonymized, aggregated analytics data (which cannot identify you) may be retained for product improvement purposes.",
    ],
  },
  {
    id: "changes",
    icon: <Globe className="h-5 w-5" />,
    title: "Changes to This Policy",
    content: [
      "We may update this Privacy Policy to reflect changes in our practices or for legal reasons. When we make material changes, we will update the effective date at the top of this page.",
      "We encourage you to review this policy periodically. Continued use of aSpiral after changes constitutes acceptance of the updated policy.",
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  section,
  index,
}: {
  section: (typeof sections)[number];
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.section
      ref={ref}
      id={section.id}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
      className="p-6 md:p-8 rounded-2xl border border-border/25 bg-card/20 backdrop-blur-sm scroll-mt-24"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
          {section.icon}
        </div>
        <h2 className="font-display text-xl md:text-2xl font-semibold">
          {section.title}
        </h2>
      </div>

      {/* Content paragraphs */}
      {section.content?.map((paragraph, i) => (
        <p
          key={i}
          className="text-muted-foreground leading-relaxed mb-4 text-sm md:text-base"
        >
          {paragraph}
        </p>
      ))}

      {/* Bullet items */}
      {section.items && (
        <ul className="space-y-2.5 mb-4">
          {section.items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-muted-foreground text-sm md:text-base"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Subsections (for Data We Collect) */}
      {"subsections" in section &&
        section.subsections?.map((sub, i) => (
          <div key={i} className="mb-6 last:mb-0">
            <h3 className="font-display text-base md:text-lg font-semibold mb-3 text-foreground/90">
              {sub.heading}
            </h3>
            <ul className="space-y-2">
              {sub.items.map((item, j) => (
                <li
                  key={j}
                  className="flex items-start gap-3 text-muted-foreground text-sm md:text-base"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

      {/* Services table (for Data Sharing) */}
      {"services" in section && section.services && (
        <div className="mt-4 mb-4 overflow-x-auto">
          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 pr-4 text-foreground/80 font-semibold">
                  Service
                </th>
                <th className="text-left py-3 pr-4 text-foreground/80 font-semibold">
                  Purpose
                </th>
                <th className="text-left py-3 text-foreground/80 font-semibold">
                  Data Shared
                </th>
              </tr>
            </thead>
            <tbody>
              {section.services.map((svc, i) => (
                <tr key={i} className="border-b border-border/15">
                  <td className="py-3 pr-4 text-primary font-medium whitespace-nowrap">
                    {svc.name}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {svc.purpose}
                  </td>
                  <td className="py-3 text-muted-foreground">{svc.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Storage items (for Cookies & Local Storage) */}
      {"storageItems" in section && section.storageItems && (
        <div className="space-y-3 mt-4 mb-4">
          {section.storageItems.map((item, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 p-3 rounded-xl bg-background/40 border border-border/15"
            >
              <code className="text-xs text-primary font-mono whitespace-nowrap flex-shrink-0">
                {item.key}
              </code>
              <span className="text-muted-foreground text-sm leading-relaxed">
                {item.purpose}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Rights list (for Your Rights) */}
      {"rights" in section && section.rights && (
        <div className="space-y-4 mt-4 mb-4">
          {section.rights.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ChevronRight className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <span className="font-semibold text-foreground/90 text-sm md:text-base">
                  {r.right}
                </span>
                <p className="text-muted-foreground text-sm leading-relaxed mt-0.5">
                  {r.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      {"footer" in section && section.footer && (
        <p className="text-sm text-muted-foreground/80 mt-4 pt-4 border-t border-border/15 leading-relaxed italic">
          {section.footer}
        </p>
      )}
    </motion.section>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const Privacy = () => {
  const tocRef = useRef(null);
  const tocInView = useInView(tocRef, { once: true, margin: "-40px" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AmbientBackground />
      <PageHeader />

      <main className="relative z-10">
        {/* Hero */}
        <section className="py-16 px-6 text-center">
          <motion.div
            className="mx-auto max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Your data, your control
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl font-question italic mb-2">
              How aSpiral handles, protects, and respects your data.
            </p>
            <p className="text-muted-foreground/60 text-sm">
              Effective: {EFFECTIVE_DATE}
            </p>
          </motion.div>
        </section>

        {/* Table of Contents */}
        <section ref={tocRef} className="px-6 pb-12">
          <motion.div
            className="mx-auto max-w-3xl"
            initial={{ opacity: 0, y: 16 }}
            animate={tocInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className="p-5 rounded-2xl border border-border/25 bg-card/20 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-medium mb-3">
                Contents
              </p>
              <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {sections.map((section, i) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-200"
                  >
                    <span className="text-primary/60 text-xs font-mono">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </motion.div>
        </section>

        {/* All Sections */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-3xl space-y-6">
            {sections.map((section, index) => (
              <SectionCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="px-6 pb-20">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative p-10 rounded-3xl border border-border/30 bg-card/20 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 mb-6">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">
                  Questions about your privacy?
                </h3>
                <p className="text-muted-foreground mb-8 text-base md:text-lg leading-relaxed">
                  We take your privacy seriously. If you have any questions,
                  concerns, or requests regarding your data, we're here to help.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Privacy Inquiry`}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-300"
                >
                  <Mail className="h-5 w-5" />
                  Contact us
                </a>
                <p className="text-muted-foreground/50 text-xs mt-4 tracking-wide">
                  {CONTACT_EMAIL} • Edmonton, AB, Canada
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <QuickLinks links={[
          { label: "Support", to: "/support" },
          { label: "How it Works", to: "/how-it-works" },
          { label: "Our Story", to: "/story" },
          { label: "Open App", to: "/app" },
        ]} />
      </main>

      <PageFooter />
    </div>
  );
};

export default Privacy;
