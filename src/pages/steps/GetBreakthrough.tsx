import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, type Easing } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, Lightbulb, RefreshCw, Gift } from "lucide-react";
import aspiralLogo from "@/assets/aspiral-logo.png";
import breakthroughIcon from "@/assets/breakthrough-icon.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as Easing, delay },
  }),
};

const GetBreakthrough = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Aurora Background - More dramatic for breakthrough */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute -top-20 left-0 right-0 h-[600px]"
          style={{
            background: `radial-gradient(ellipse 120% 60% at 50% 0%, hsl(var(--primary) / 0.3) 0%, hsl(var(--secondary) / 0.2) 30%, transparent 70%)`,
            filter: 'blur(60px)',
          }}
          animate={{ opacity: [0.6, 0.9, 0.6], scale: [1, 1.02, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-[400px]"
          style={{
            background: `linear-gradient(0deg, hsl(var(--secondary) / 0.15) 0%, transparent 100%)`,
            filter: 'blur(50px)',
          }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.3)_50%,hsl(var(--background))_100%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={aspiralLogo} alt="aSpiral" className="h-10 drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              Get Started
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 py-16 md:py-24 px-6">
        <div className="mx-auto max-w-4xl">
          {/* Back Navigation */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Link to="/#how-it-works" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-8 group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to How It Works
            </Link>
          </motion.div>

          {/* Step Badge */}
          <motion.div 
            className="flex items-center gap-4 mb-8"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.1}
          >
            <div className="w-12 h-12 rounded-full bg-secondary/30 border-2 border-secondary/50 flex items-center justify-center text-xl font-bold text-secondary">
              4
            </div>
            <span className="text-muted-foreground text-lg">Step 4 of 4 — The Moment</span>
          </motion.div>

          {/* Hero */}
          <motion.div 
            className="flex flex-col md:flex-row items-start gap-8 mb-16"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.2}
          >
            <motion.img 
              src={breakthroughIcon} 
              alt="Breakthrough Icon" 
              className="w-24 h-24 md:w-32 md:h-32"
              animate={{ 
                scale: [1, 1.1, 1],
                filter: [
                  "drop-shadow(0 0 20px hsl(var(--secondary) / 0.5))",
                  "drop-shadow(0 0 50px hsl(var(--secondary) / 0.8))",
                  "drop-shadow(0 0 20px hsl(var(--secondary) / 0.5))"
                ]
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                Get Your Breakthrough
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Friction → Grease → Insight. From Spiraling to Aspiring.
              </p>
            </div>
          </motion.div>

          {/* Content Sections */}
          <div className="space-y-16">
            {/* The Framework */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.3}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-primary">
                The Friction → Grease → Insight framework
              </h2>
              <div className="space-y-8">
                <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/5">
                  <h3 className="text-xl font-semibold text-red-400 mb-3">Friction</h3>
                  <p className="text-muted-foreground">
                    This is where you're stuck. The point of resistance. The thing that keeps looping in your mind, the pattern that won't break. 
                    <span className="text-foreground"> aSpiral names it clearly.</span> Not in clinical jargon—in your own words, reflected back.
                  </p>
                </div>
                <div className="p-6 rounded-2xl border border-secondary/30 bg-secondary/5">
                  <h3 className="text-xl font-semibold text-secondary mb-3">Grease</h3>
                  <p className="text-muted-foreground">
                    This is what helps it move. The reframe. The perspective shift. The thing you couldn't see when you were in the middle of it.
                    <span className="text-foreground"> It's not advice. It's insight drawn from YOUR story.</span>
                  </p>
                </div>
                <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5">
                  <h3 className="text-xl font-semibold text-primary mb-3">Insight</h3>
                  <p className="text-muted-foreground">
                    The synthesis. A single, powerful statement that captures what you just discovered about yourself.
                    <span className="text-foreground"> Something you can carry with you. Something that changes how you see the situation.</span>
                  </p>
                </div>
              </div>
            </motion.section>

            {/* The Experience */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.4}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-secondary">
                What the breakthrough feels like
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Zap, title: "Cinematic moment", desc: "A 5-second visual experience that marks the transition. Particles explode. The spiral transforms. It's not just information—it's a felt moment." },
                  { icon: Lightbulb, title: "Clarity arrives", desc: "Your breakthrough appears in the center. Friction, Grease, Insight—laid out clearly. The chaos has a name now. The path has a direction." },
                  { icon: RefreshCw, title: "Pattern interrupt", desc: "The visual drama isn't just pretty—it helps your brain register that something changed. This isn't a normal moment. This is a breakthrough." },
                  { icon: Gift, title: "Something to keep", desc: "Export your breakthrough. Save it. Screenshot it. Come back to it when the old patterns try to creep back in." },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    className="p-6 rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm"
                    whileHover={{ scale: 1.02, borderColor: "hsl(var(--secondary)/0.4)" }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <item.icon className="w-8 h-8 text-secondary mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Not A Cure */}
            <motion.section 
              className="p-8 md:p-12 rounded-3xl border border-muted/30 bg-card/40"
              initial="hidden" animate="visible" variants={fadeUp} custom={0.5}
            >
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">
                What aSpiral is—and isn't
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Let's be real: <span className="text-foreground font-medium">aSpiral is not therapy.</span> It's not a replacement for professional help if you need it.
                </p>
                <p>
                  What it IS: a tool for clarity. A way to externalize the chaos. A framework for finding your own answers faster.
                </p>
                <p>
                  Think of it as a <span className="text-primary">thinking partner</span>—one that listens without judgment, helps you see patterns, 
                  and guides you to your own insights. The breakthrough doesn't come from us. It comes from <span className="text-secondary">you</span>.
                </p>
                <p className="text-foreground font-medium">
                  We just help you find it.
                </p>
              </div>
            </motion.section>

            {/* The Promise */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.6}>
              <div className="text-center space-y-6">
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
                  Ready to go from <span className="text-primary">spiraling</span> to <span className="text-secondary">aspiring</span>?
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Your first 5 breakthroughs are free. No credit card. Just you, your voice, and 5 minutes.
                </p>
              </div>
            </motion.section>

            {/* Quote */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.65}>
              <blockquote className="border-l-4 border-secondary pl-6 py-4 text-xl md:text-2xl italic text-muted-foreground">
                "I came in feeling like my life was falling apart. Five minutes later, I had a breakthrough that changed how I saw my entire relationship with control. It wasn't magic—it was just finally seeing clearly."
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground/70">— JR, aSpiral creator (yes, I use my own product)</p>
            </motion.section>
          </div>

          {/* Final CTA */}
          <motion.div 
            className="mt-20 pt-10 border-t border-border/30"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.7}
          >
            <div className="text-center space-y-8">
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="text-xl px-12 py-8 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-xl shadow-primary/30"
                >
                  Start Your Breakthrough Now
                  <Sparkles className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <p className="text-muted-foreground">
                Free to start • No credit card required • Works in your browser
              </p>
              <Link to="/steps/voice" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Start from the beginning: Voice Your Chaos
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default GetBreakthrough;
