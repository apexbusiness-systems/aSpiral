import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Database,
  Eye,
  Lock,
  Trash2,
  Download,
  Mail,
  Globe,
  Mic,
  BarChart3,
  Server,
  ChevronRight,
} from "lucide-react";
import aspiralLogo from "@/assets/aspiral-logo.png";

const CONTACT_EMAIL = "info-outreach@aspiral.icu";
const EFFECTIVE_DATE = "March 22, 2026";

// ─── Data ───────────────────────────────────────────────────────────────────

const sections = [
  {
    id: "overview",
    icon: <Shield className="h-5 w-5" />,
    title: "Overview",
    content: [
      'aSpiral ("we", "us", "our") is operated by ASPIRAL, based in Edmonton, Alberta, Canada. This Privacy Policy explains what data we collect, how we use it, how we protect it, and what rights you have.',
      "We built aSpiral during a personal crisis. Privacy isn't a checkbox for us — it's foundational. We collect only what's necessary to deliver your breakthroughs, and we never sell your data.",
    ],
  },
  {
    id: "data-collection",
    icon: <Database className="h-5 w-5" />,
    title: "What We Collect",
    content: [],
    subsections: [
      {
        title: "Account Information",
        items: [
          "Email address (required for signup)",
          "Display name (optional, defaults to your email prefix)",
          "Authentication data via Supabase Auth (email/password or Google OAuth)",
        ],
      },
      {
        title: "Session Data",
        items: [
          "Transcribed text from your voice input (text only — audio is never stored)",
          "Entities and connections extracted from your sessions",
          "Breakthrough insights: friction points, grease, and insights",
          "Session metadata (timestamps, status, duration)",
        ],
      },
      {
        title: "Technical Data",
        items: [
          "Device fingerprint (a locally-generated UUID stored in your browser for encryption key derivation)",
          "Voice settings preferences (sound effects, reduced motion)",
          "Analytics opt-in/out preference",
        ],
      },
    ],
  },
  {
    id: "voice-data",
    icon: <Mic className="h-5 w-5" />,
    title: "Voice & Audio Data",
    content: [
      "Your voice is processed using your browser's built-in Web Speech API for speech-to-text conversion. Audio is transcribed in real time and immediately discarded. We never store, transmit, or retain raw audio recordings.",
      "Only the transcribed text is used — and only for the duration of your session to generate your breakthrough insights. Text-to-speech responses use OpenAI's TTS API, which processes text to generate audio output played back to you.",
    ],
  },
  {
    id: "data-usage",
    icon: <Eye className="h-5 w-5" />,
    title: "How We Use Your Data",
    content: [],
    subsections: [
      {
        title: "We use your data to:",
        items: [
          "Deliver your breakthrough sessions (entity extraction, visualization, insights)",
          "Save your session history so you can revisit past breakthroughs",
          "Authenticate your account and secure your data",
          "Improve the product through aggregated, anonymized analytics",
          "Respond to support requests",
        ],
      },
      {
        title: "We never use your data to:",
        items: [
          "Train or fine-tune any AI model",
          "Sell to advertisers or third parties",
          "Build advertising profiles",
          "Share your session content with other users",
        ],
      },
    ],
  },
  {
    id: "third-parties",
    icon: <Server className="h-5 w-5" />,
    title: "Third-Party Services",
    content: [
      "We use the following third-party services to operate aSpiral. Each processes data only as needed to deliver our service:",
    ],
    subsections: [
      {
        title: "Infrastructure & Data",
        items: [
          "Supabase — database hosting, authentication, and edge functions (row-level security enforced)",
          "Vercel — web hosting and deployment analytics",
        ],
      },
      {
        title: "AI & Voice",
        items: [
          "AI language model via secure gateway — processes transcribed text to generate breakthrough insights (no data retained by the provider for training)",
          "OpenAI TTS API — converts text responses to speech audio (text processed, not stored)",
        ],
      },
      {
        title: "Analytics",
        items: [
          "PostHog — product analytics with autocapture disabled, session recording disabled by default, and all inputs masked; you can opt out at any time",
          "Vercel Analytics — basic page-level performance metrics",
        ],
      },
    ],
  },
  {
    id: "data-security",
    icon: <Lock className="h-5 w-5" />,
    title: "Data Security",
    content: [
      "Your sessions are private by default. We use Supabase with row-level security (RLS), meaning your data is only accessible to your authenticated account — not other users, not our team in bulk.",
    ],
    subsections: [
      {
        title: "Security measures include:",
        items: [
          "Row-level security on all user data tables",
          "Encryption key derivation from user ID + device fingerprint + app salt (SHA-256 → PBKDF2)",
          "API key hashing (plaintext keys are never stored)",
          "Content moderation and prompt injection detection on AI inputs",
          "PII redaction on data processed through AI services",
          "Input validation and sanitization on all user inputs",
          "Rate limiting per user and per session",
          "Compliance audit logging for regulatory requirements",
        ],
      },
    ],
  },
  {
    id: "data-storage",
    icon: <Globe className="h-5 w-5" />,
    title: "Data Storage & Retention",
    content: [],
    subsections: [
      {
        title: "Where your data lives:",
        items: [
          "Account and session data is stored in Supabase-hosted databases",
          "Authentication sessions are stored in your browser's sessionStorage (cleared when you close the tab)",
          "Preferences (analytics opt-in, voice settings) are stored in your browser's localStorage",
          "Device fingerprint is stored locally in your browser — never sent to our servers",
        ],
      },
      {
        title: "How long we keep it:",
        items: [
          "Account data: retained until you request deletion",
          "Session and breakthrough data: retained until you delete individual sessions or request full account deletion",
          "Voice audio: never stored (real-time processing only)",
          "Analytics events: retained per PostHog's data retention policy",
          "Compliance audit logs: retained as required by applicable regulations",
        ],
      },
    ],
  },
  {
    id: "cookies",
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Cookies & Local Storage",
    content: [
      "aSpiral does not set first-party cookies. We use browser sessionStorage for authentication persistence and localStorage for your preferences. Third-party services (PostHog, Vercel Analytics) may set their own cookies for analytics purposes.",
      "You can opt out of analytics tracking at any time through the app. You can also clear all locally stored data by clearing your browser's site data for aspiral.icu.",
    ],
  },
  {
    id: "your-rights",
    icon: <Download className="h-5 w-5" />,
    title: "Your Rights",
    content: [
      "You have full control over your data:",
    ],
    subsections: [
      {
        title: "Actions you can take:",
        items: [
          "Export your sessions — download your data as PDF or CSV directly from the Sessions page, or request a full data export via email",
          "Delete individual sessions — remove any session and all its associated entities, connections, and breakthroughs from the Sessions page",
          "Delete your account — email us at info-outreach@aspiral.icu with the subject \"Delete my account\" and we'll remove your account and all associated data within 7 days",
          "Opt out of analytics — disable PostHog tracking through the app at any time",
          "Revoke API keys — manage and delete your API keys from the API Keys page",
        ],
      },
      {
        title: "If you're in Canada, the EU, or other jurisdictions with data protection laws, you also have the right to:",
        items: [
          "Access all personal data we hold about you",
          "Request correction of inaccurate data",
          "Request restriction of processing",
          "Object to processing",
          "Data portability (receive your data in a machine-readable format)",
          "Lodge a complaint with your local data protection authority",
        ],
      },
    ],
  },
  {
    id: "account-deletion",
    icon: <Trash2 className="h-5 w-5" />,
    title: "Account Deletion",
    content: [
      'To delete your account and all associated data, email us at info-outreach@aspiral.icu with the subject line "Delete my account". We will remove your account, profile, all sessions, breakthroughs, entities, connections, and API keys within 7 business days and send you confirmation when complete.',
      "Deleting your account is permanent and cannot be undone. We recommend exporting your data before requesting deletion.",
    ],
  },
  {
    id: "children",
    icon: <Shield className="h-5 w-5" />,
    title: "Children's Privacy",
    content: [
      "aSpiral is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal data, please contact us and we will delete it promptly.",
    ],
  },
  {
    id: "changes",
    icon: <Globe className="h-5 w-5" />,
    title: "Changes to This Policy",
    content: [
      "We may update this Privacy Policy from time to time. When we make changes, we'll update the effective date at the top of this page. For significant changes, we'll notify you through the app or via email.",
      "Your continued use of aSpiral after changes are posted constitutes your acceptance of the updated policy.",
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
      className="p-6 md:p-8 rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
          {section.icon}
        </div>
        <h2 className="font-display text-xl md:text-2xl font-semibold">
          {section.title}
        </h2>
      </div>

      {section.content.map((paragraph, i) => (
        <p
          key={i}
          className="text-muted-foreground leading-relaxed text-sm md:text-base mb-4 last:mb-0"
        >
          {paragraph}
        </p>
      ))}

      {section.subsections?.map((sub, i) => (
        <div key={i} className="mt-5">
          <h3 className="text-foreground font-medium text-sm md:text-base mb-3">
            {sub.title}
          </h3>
          <ul className="space-y-2">
            {sub.items.map((item, j) => (
              <li
                key={j}
                className="flex items-start gap-2.5 text-muted-foreground text-sm md:text-base leading-relaxed"
              >
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </motion.section>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] bg-primary/12 rounded-full blur-[120px] -top-40 -right-40 animate-pulse" />
        <div
          className="absolute w-[500px] h-[500px] bg-secondary/8 rounded-full blur-[100px] bottom-0 -left-40 animate-pulse"
          style={{ animationDelay: "4s" }}
        />
        <div
          className="absolute w-[400px] h-[400px] bg-primary/8 rounded-full blur-[80px] top-1/2 right-1/4 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_50%,hsl(var(--background))_100%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </Link>
          <Link to="/">
            <img
              src={aspiralLogo}
              alt="aSpiral"
              className="h-[2.78rem] drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)] transition-all duration-300"
            />
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
            <p className="text-muted-foreground text-lg md:text-xl font-question italic mb-6">
              Transparency isn't optional — it's how we're built.
            </p>
            <p className="text-muted-foreground/60 text-sm">
              Effective: {EFFECTIVE_DATE}
            </p>
          </motion.div>
        </section>

        {/* ── Table of Contents ────────────────────────────────────────────── */}
        <section className="px-6 pb-12">
          <motion.div
            className="mx-auto max-w-3xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="p-6 rounded-2xl border border-border/25 bg-card/15 backdrop-blur-sm">
              <h2 className="font-display text-lg font-semibold mb-4 text-foreground/80">
                In this policy
              </h2>
              <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card/30 transition-all duration-200"
                  >
                    <span className="text-primary/60">{section.icon}</span>
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </motion.div>
        </section>

        {/* ── Policy Sections ──────────────────────────────────────────────── */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-3xl space-y-6">
            {sections.map((section, index) => (
              <SectionCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </section>

        {/* ── Contact CTA ──────────────────────────────────────────────────── */}
        <section className="px-6 pb-20">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative p-10 rounded-3xl border border-border/30 bg-card/20 backdrop-blur-sm overflow-hidden">
              {/* Glow accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 mb-6">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">
                  Questions about your privacy?
                </h3>
                <p className="text-muted-foreground mb-8 text-base md:text-lg leading-relaxed">
                  We're a small team that takes privacy seriously. If you have
                  questions, concerns, or requests about your data, reach out.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Privacy Inquiry`}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-300"
                >
                  <Mail className="h-5 w-5" />
                  Contact us
                </a>
                <p className="text-muted-foreground/50 text-xs mt-4 tracking-wide">
                  {CONTACT_EMAIL}
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Quick links ───────────────────────────────────────────────────── */}
        <section className="px-6 pb-20 border-t border-border/15 pt-12">
          <div className="mx-auto max-w-5xl">
            <p className="text-muted-foreground/50 text-xs uppercase tracking-widest text-center mb-6 font-medium">
              Explore
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "Support", to: "/support" },
                { label: "Our Story", to: "/story" },
                { label: "How it Works", to: "/how-it-works" },
                { label: "Open App", to: "/app" },
              ].map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/30 bg-card/20 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-card/40 transition-all duration-200"
                >
                  {label}
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-12 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src={aspiralLogo}
              alt="aSpiral"
              className="h-8 drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
            />
            <span className="text-muted-foreground text-sm">• aspiral.icu</span>
          </div>
          <div className="text-muted-foreground/60 text-sm text-center md:text-right space-y-1">
            <p>Built during a breakdown • Edmonton, AB</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="hover:text-foreground transition-colors inline-block"
            >
              {CONTACT_EMAIL}
            </a>
            <div className="flex items-center justify-center md:justify-end gap-3 pt-1">
              <Link
                to="/support"
                className="hover:text-foreground transition-colors"
              >
                Support
              </Link>
              <span className="text-muted-foreground/30">•</span>
              <Link
                to="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
