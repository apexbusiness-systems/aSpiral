import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Clock,
  HelpCircle,
  Mic,
  Shield,
  Smartphone,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Zap,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import aspiralLogo from "@/assets/aspiral-logo.png";

const CONTACT_EMAIL = "info-outreach@aspiral.icu";

// ─── Data ───────────────────────────────────────────────────────────────────

const contactCards = [
  {
    icon: <Mail className="h-6 w-6" />,
    title: "Email us",
    description: "We read every message and reply within 48 hours.",
    cta: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    accent: true,
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Response time",
    description: "Monday – Friday, 9am–5pm MT. We're a small team, but we're real humans.",
    cta: "Edmonton, AB",
    href: null,
    accent: false,
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Privacy concerns",
    description: "Questions about your data? Our Privacy Policy covers everything.",
    cta: "Read Privacy Policy",
    href: "/privacy",
    internal: true,
    accent: false,
  },
];

const faqCategories = [
  {
    label: "Getting Started",
    icon: <Zap className="h-4 w-4" />,
    items: [
      {
        q: "How does aSpiral work?",
        a: "You voice your chaos — just speak freely. aSpiral transcribes your words, builds a live 3D visualization of your mental landscape, then asks 2–3 targeted questions. From that, it surfaces your core friction points and turns them into clear, actionable insights: a breakthrough.",
      },
      {
        q: "Is there a free plan?",
        a: "Yes. You get 5 breakthroughs per day, completely free, no credit card required. The app works entirely in your browser — no download needed.",
      },
      {
        q: "Do I need an account to use aSpiral?",
        a: "You need an account to save and revisit your sessions. You can start a session without one, but signing up (free) lets you build a history of breakthroughs over time.",
      },
      {
        q: "What's the difference between Friction and Grease?",
        a: "Friction is what's blocking you — the resistance, the loop, the problem. Grease is what moves you forward — the insight, the reframe, the action. Every breakthrough surfaces both so you know exactly what to tackle and how.",
      },
    ],
  },
  {
    label: "Voice & AI",
    icon: <Mic className="h-4 w-4" />,
    items: [
      {
        q: "What AI powers the breakthroughs?",
        a: "aSpiral uses large language models to process your transcribed input and generate insights. Raw audio is never stored — only the transcribed text is passed to the AI, and only for the duration of your session.",
      },
      {
        q: "Is my voice recording stored?",
        a: "No. Audio is transcribed in real time and immediately discarded. We never store raw recordings. Only the text output and your session insights are saved to your account.",
      },
      {
        q: "Why does the 3D visualization look different each time?",
        a: "The visualization is generated dynamically from your specific words and the relationships between your thoughts. Each session is unique because your mental landscape is unique.",
      },
      {
        q: "Can I re-run or edit a past session?",
        a: "You can revisit any saved session from the Sessions page. Re-running creates a new session — we don't overwrite previous breakthroughs so your history stays intact.",
      },
    ],
  },
  {
    label: "Your Data",
    icon: <Shield className="h-4 w-4" />,
    items: [
      {
        q: "Who can see my sessions?",
        a: "Only you. Sessions are private by default and never shared with other users, advertisers, or third parties. We use Supabase with row-level security so your data is only accessible to your account.",
      },
      {
        q: "How do I delete my account and data?",
        a: "Email us at info-outreach@aspiral.icu with the subject \"Delete my account\". We'll remove your account and all associated data within 7 days and confirm when it's done.",
      },
      {
        q: "Can I export my sessions?",
        a: "Yes — email us and request a data export. We'll send you a portable copy of all your session history in a readable format.",
      },
      {
        q: "Do you use my data to train AI models?",
        a: "No. Your session data is used only to deliver your breakthroughs. We do not use personal session content to train or fine-tune any AI model.",
      },
    ],
  },
  {
    label: "The App",
    icon: <Smartphone className="h-4 w-4" />,
    items: [
      {
        q: "What devices and browsers are supported?",
        a: "aSpiral works in any modern browser on desktop or mobile (Chrome, Safari, Firefox, Edge). There's also an iOS app available. The web app can be installed as a PWA directly from your browser for an app-like experience.",
      },
      {
        q: "Can I use aSpiral offline?",
        a: "The app shell and your saved sessions load offline thanks to our service worker caching. However, running a new breakthrough session requires an internet connection to process your voice and generate insights.",
      },
      {
        q: "Why is the microphone not working?",
        a: "Make sure you've granted microphone permission in your browser or device settings. On iOS Safari, you may need to go to Settings → Safari → Microphone and allow access. If the problem persists, try refreshing the page.",
      },
      {
        q: "The app updated and something looks broken — what should I do?",
        a: "Try a hard refresh (Ctrl+Shift+R on desktop, or clear the site data in your browser settings). If it persists, email us with a description of what you're seeing and your browser/device — we'll fix it fast.",
      },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ContactCardCta({ card }: { card: (typeof contactCards)[number] }) {
  const linkClass = `inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
    card.accent ? "text-secondary hover:text-secondary/80" : "text-primary hover:text-primary/80"
  }`;

  if (!card.href) {
    return <span className="text-sm text-muted-foreground/60">{card.cta}</span>;
  }

  if ("internal" in card && card.internal) {
    return (
      <Link to={card.href} className={linkClass}>
        {card.cta}
        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    );
  }

  return (
    <a href={card.href} className={linkClass}>
      {card.cta}
      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
    </a>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const Support = () => {
  const faqRef = useRef(null);
  const faqInView = useInView(faqRef, { once: true, margin: "-80px" });
  const [openCategory, setOpenCategory] = useState<string>(faqCategories[0].label);

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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-sm font-medium mb-6">
              <MessageSquare className="h-4 w-4" />
              We're here for you
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              How can we help?
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl font-question italic">
              From setup questions to account help — we've got answers.
            </p>
          </motion.div>
        </section>

        {/* ── Contact Cards ─────────────────────────────────────────────────── */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5">
            {contactCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 group
                  ${card.accent
                    ? "border-secondary/40 bg-secondary/5 hover:border-secondary/60 hover:bg-secondary/10"
                    : "border-border/30 bg-card/20 hover:border-primary/30 hover:bg-card/30"
                  }`}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:-translate-y-0.5
                    ${card.accent ? "bg-secondary/20 text-secondary" : "bg-primary/15 text-primary"}`}
                >
                  {card.icon}
                </div>

                <h3 className="font-display text-lg font-semibold mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {card.description}
                </p>

                {/* CTA */}
                <ContactCardCta card={card} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section
          ref={faqRef}
          className="px-6 pb-24 border-t border-border/20 pt-20"
        >
          <div className="mx-auto max-w-5xl">
            {/* Section header */}
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 16 }}
              animate={faqInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary text-sm font-medium mb-5">
                <HelpCircle className="h-4 w-4" />
                Frequently asked questions
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Quick answers
              </h2>
            </motion.div>

            {/* Category tabs + accordion layout */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sticky category sidebar */}
              <nav className="lg:w-52 flex-shrink-0">
                <ul className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-8">
                  {faqCategories.map((cat) => (
                    <li key={cat.label}>
                      <button
                        onClick={() => setOpenCategory(cat.label)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium w-full text-left whitespace-nowrap transition-all duration-200
                          ${openCategory === cat.label
                            ? "bg-secondary/15 border border-secondary/30 text-secondary"
                            : "text-muted-foreground hover:text-foreground hover:bg-card/30 border border-transparent"
                          }`}
                      >
                        <span className={openCategory === cat.label ? "text-secondary" : "text-muted-foreground"}>
                          {cat.icon}
                        </span>
                        {cat.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Accordion panel */}
              <div className="flex-1 min-w-0">
                {faqCategories.map((cat) =>
                  cat.label === openCategory ? (
                    <motion.div
                      key={cat.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Accordion type="single" collapsible className="space-y-3">
                        {cat.items.map((item) => (
                          <AccordionItem
                            key={item.q}
                            value={item.q}
                            className="border border-border/25 rounded-xl bg-card/20 backdrop-blur-sm px-5 data-[state=open]:border-primary/30 data-[state=open]:bg-card/30 transition-all duration-200"
                          >
                            <AccordionTrigger className="text-left text-base font-medium py-5 hover:no-underline hover:text-primary transition-colors [&[data-state=open]]:text-primary">
                              {item.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed pb-5 text-sm md:text-base">
                              {item.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </motion.div>
                  ) : null
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Still Stuck? CTA ──────────────────────────────────────────────── */}
        <section className="px-6 pb-20">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={faqInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative p-10 rounded-3xl border border-border/30 bg-card/20 backdrop-blur-sm overflow-hidden">
              {/* Glow accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5 pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/15 border border-secondary/25 mb-6">
                  <BookOpen className="h-7 w-7 text-secondary" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">
                  Still stuck?
                </h3>
                <p className="text-muted-foreground mb-8 text-base md:text-lg leading-relaxed">
                  We're a tiny team that genuinely cares. Drop us an email — a real
                  person will read it and write back.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=aSpiral Support`}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold text-base hover:bg-secondary/90 hover:shadow-lg hover:shadow-secondary/20 hover:scale-[1.02] transition-all duration-300"
                >
                  <Mail className="h-5 w-5" />
                  Email the team
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
                { label: "How it Works", to: "/how-it-works" },
                { label: "Our Story", to: "/story" },
                { label: "Privacy Policy", to: "/privacy" },
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
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <span className="text-muted-foreground/30">•</span>
              <Link to="/support" className="hover:text-foreground transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Support;
