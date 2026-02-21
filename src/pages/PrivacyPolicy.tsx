import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Lock, Trash2, Mail, Database, Mic, BarChart2 } from "lucide-react";
import aspiralLogo from "@/assets/aspiral-logo.png";

const LAST_UPDATED = "February 2025";
const CONTACT_EMAIL = "info-outreach@aspiral.icu";

interface Section {
  icon: React.ReactNode;
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}

function PolicySection({ icon, title, accent = false, children }: Section) {
  return (
    <section className="p-6 rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accent ? "bg-secondary/20" : "bg-primary/20"}`}>
          <span className={accent ? "text-secondary" : "text-primary"}>{icon}</span>
        </div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
      </div>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient Background — matches site wide pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-primary/15 rounded-full blur-[100px] top-0 right-0 animate-pulse" />
        <div
          className="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] bottom-1/4 left-0 animate-pulse"
          style={{ animationDelay: "3s" }}
        />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_50%,hsl(var(--background))_100%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
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

      {/* Main Content */}
      <main className="relative z-10 py-16 px-6">
        <article className="mx-auto max-w-2xl">
          {/* Page Title */}
          <header className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Your data, your trust
            </div>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg">
              We built aSpiral during a breakdown — the last thing we'd ever do is
              betray your trust with your most vulnerable moments.
            </p>
            <p className="text-muted-foreground/50 text-sm mt-4">
              Last updated: {LAST_UPDATED}
            </p>
          </header>

          {/* Sections */}
          <div className="space-y-6">
            {/* Who We Are */}
            <PolicySection icon={<Shield className="h-5 w-5" />} title="Who We Are" accent>
              <p>
                aSpiral is developed and operated by{" "}
                <span className="text-foreground font-medium">APEX Business Systems Ltd.</span>,
                based in Edmonton, AB, Canada. We run aSpiral at{" "}
                <span className="text-foreground">aspiral.icu</span>.
              </p>
              <p>
                For any privacy concerns, reach us at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-secondary hover:text-secondary/80 transition-colors underline underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </PolicySection>

            {/* Voice Data */}
            <PolicySection icon={<Mic className="h-5 w-5" />} title="Voice & Session Data">
              <p>
                When you use aSpiral, you may record voice input. Here's exactly how
                that data is handled:
              </p>
              <ul className="list-none space-y-2 mt-2">
                {[
                  "Voice recordings are transcribed and immediately discarded — we do not store raw audio.",
                  "Transcribed text is processed by our AI to generate your breakthrough session.",
                  "Session outputs (insights, friction/grease maps) are stored securely in your account.",
                  "We never share your session content with third parties for advertising.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </PolicySection>

            {/* What We Collect */}
            <PolicySection icon={<Database className="h-5 w-5" />} title="What We Collect">
              <p>We collect only what's necessary to run the service:</p>
              <div className="mt-3 space-y-3">
                {[
                  {
                    label: "Account data",
                    desc: "Email address and authentication credentials when you sign up.",
                  },
                  {
                    label: "Session data",
                    desc: "Your breakthrough sessions, including transcribed inputs and AI-generated insights.",
                  },
                  {
                    label: "Usage data",
                    desc: "Anonymous analytics (page views, feature usage) to understand how people use the app.",
                  },
                  {
                    label: "Device & technical data",
                    desc: "Browser type, OS, and IP address for security and performance purposes.",
                  },
                ].map(({ label, desc }) => (
                  <div key={label} className="pl-4 border-l-2 border-secondary/30">
                    <span className="text-foreground font-medium">{label}</span>
                    <span className="text-muted-foreground"> — {desc}</span>
                  </div>
                ))}
              </div>
            </PolicySection>

            {/* How We Use It */}
            <PolicySection icon={<Eye className="h-5 w-5" />} title="How We Use Your Data" accent>
              <p>Your data is used to:</p>
              <ul className="list-none space-y-2 mt-2">
                {[
                  "Deliver and improve the aSpiral breakthrough experience.",
                  "Authenticate your account and keep it secure.",
                  "Send important service emails (account, security, product updates).",
                  "Understand product usage to improve the app — anonymised and aggregated.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                We{" "}
                <span className="text-foreground font-semibold">do not</span>{" "}
                sell, rent, or trade your personal data to any third party — ever.
              </p>
            </PolicySection>

            {/* Third-Party Services */}
            <PolicySection icon={<BarChart2 className="h-5 w-5" />} title="Third-Party Services">
              <p>
                aSpiral uses a small number of trusted third-party services to
                operate:
              </p>
              <div className="mt-3 space-y-3">
                {[
                  {
                    name: "Supabase",
                    role: "Database & authentication — your account and session data are stored here.",
                    link: "https://supabase.com/privacy",
                  },
                  {
                    name: "PostHog",
                    role: "Product analytics — anonymous usage data to understand feature adoption.",
                    link: "https://posthog.com/privacy",
                  },
                  {
                    name: "Vercel",
                    role: "Hosting & edge delivery — the platform that serves aspiral.icu.",
                    link: "https://vercel.com/legal/privacy-policy",
                  },
                ].map(({ name, role, link }) => (
                  <div key={name} className="pl-4 border-l-2 border-primary/30">
                    <span className="text-foreground font-medium">{name}</span>
                    <span className="text-muted-foreground"> — {role} </span>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary/80 hover:text-secondary transition-colors text-sm underline underline-offset-4"
                    >
                      Privacy policy ↗
                    </a>
                  </div>
                ))}
              </div>
            </PolicySection>

            {/* Data Security */}
            <PolicySection icon={<Lock className="h-5 w-5" />} title="Data Security" accent>
              <p>
                All data is encrypted in transit (TLS) and at rest. Authentication is
                handled through Supabase with industry-standard security practices.
              </p>
              <p>
                We apply the principle of least privilege — only systems and people
                that absolutely need access to your data have it.
              </p>
              <p>
                If we ever become aware of a breach that affects your data, we will
                notify you promptly.
              </p>
            </PolicySection>

            {/* Your Rights */}
            <PolicySection icon={<Trash2 className="h-5 w-5" />} title="Your Rights">
              <p>You have full control over your data:</p>
              <ul className="list-none space-y-2 mt-2">
                {[
                  "Access — request a copy of all data we hold about you.",
                  "Correction — update inaccurate information at any time.",
                  "Deletion — request complete removal of your account and all associated data.",
                  "Export — request a portable export of your session history.",
                  "Opt-out — disable analytics tracking at any time from your account settings.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email us at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-secondary hover:text-secondary/80 transition-colors underline underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
                . We'll respond within 30 days.
              </p>
            </PolicySection>

            {/* Cookies */}
            <PolicySection icon={<Eye className="h-5 w-5" />} title="Cookies & Local Storage">
              <p>
                aSpiral uses minimal cookies strictly necessary for the app to
                function (session tokens and auth state). We do not use advertising
                or tracking cookies.
              </p>
              <p>
                As a Progressive Web App, we also use browser local storage and
                service workers to enable offline functionality and performance
                caching.
              </p>
            </PolicySection>

            {/* Changes */}
            <PolicySection icon={<Mail className="h-5 w-5" />} title="Changes to This Policy" accent>
              <p>
                If we make material changes to this policy, we'll notify you by
                email and update the "Last updated" date at the top of this page.
                Continued use of aSpiral after changes means you accept the updated
                policy.
              </p>
              <p>
                Questions or concerns? We're always reachable at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-secondary hover:text-secondary/80 transition-colors underline underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </PolicySection>
          </div>
        </article>
      </main>

      {/* Footer — matches Landing page footer exactly */}
      <footer className="relative z-10 border-t border-border/20 py-12 px-6 mt-16">
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
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
