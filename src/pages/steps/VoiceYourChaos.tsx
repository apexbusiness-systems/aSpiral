import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, type Easing } from "framer-motion";
import { ArrowLeft, ArrowRight, Mic, Sparkles, Volume2, MessageCircle } from "lucide-react";
import aspiralLogo from "@/assets/aspiral-logo.png";
import voiceIcon from "@/assets/voice-icon.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as Easing, delay },
  }),
};

const VoiceYourChaos = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute -top-20 left-0 right-0 h-[600px]"
          style={{
            background: `radial-gradient(ellipse 120% 60% at 30% 0%, hsl(var(--primary) / 0.25) 0%, hsl(280 70% 50% / 0.15) 30%, transparent 70%)`,
            filter: 'blur(60px)',
          }}
          animate={{ opacity: [0.6, 0.8, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_50%,hsl(var(--background))_100%)]" />
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
            <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-xl font-bold text-primary">
              1
            </div>
            <span className="text-muted-foreground text-lg">Step 1 of 4</span>
          </motion.div>

          {/* Hero */}
          <motion.div 
            className="flex flex-col md:flex-row items-start gap-8 mb-16"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.2}
          >
            <motion.img 
              src={voiceIcon} 
              alt="Voice Icon" 
              className="w-24 h-24 md:w-32 md:h-32"
              animate={{ 
                filter: ["drop-shadow(0 0 20px hsl(var(--primary)/0.3))", "drop-shadow(0 0 40px hsl(var(--primary)/0.5))", "drop-shadow(0 0 20px hsl(var(--primary)/0.3))"]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                Voice Your Chaos
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Just talk. No typing. Let it all out.
              </p>
            </div>
          </motion.div>

          {/* Content Sections */}
          <div className="space-y-16">
            {/* The Problem */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.3}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-primary">
                We get it. Your mind is a storm right now.
              </h2>
              <div className="prose prose-lg prose-invert max-w-none space-y-4 text-muted-foreground">
                <p>
                  Thoughts are crashing into each other. That thing from three years ago just collided with something someone said yesterday. 
                  You're trying to make sense of it all, but every time you try to write it down, the words freeze. The cursor blinks. Nothing comes out.
                </p>
                <p className="text-foreground font-medium">
                  That's because writing forces you to organize before you're ready to organize.
                </p>
                <p>
                  Your brain is still in storm mode. It needs to <span className="italic">dump</span> before it can <span className="italic">sort</span>. 
                  And that's exactly what voice is for.
                </p>
              </div>
            </motion.section>

            {/* The Solution */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.4}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-secondary">
                Just hit the mic and talk.
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: Mic, title: "No structure needed", desc: "Ramble. Jump topics. Contradict yourself. It's all valid." },
                  { icon: Volume2, title: "Real-time transcription", desc: "Watch your words appear as you speak. Nothing gets lost." },
                  { icon: MessageCircle, title: "No judgment", desc: "It's just you and the mic. Say what you actually feel." },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    className="p-6 rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm"
                    whileHover={{ scale: 1.02, borderColor: "hsl(var(--primary)/0.4)" }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <item.icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Why It Works */}
            <motion.section 
              className="p-8 md:p-12 rounded-3xl border border-primary/20 bg-primary/5"
              initial="hidden" animate="visible" variants={fadeUp} custom={0.5}
            >
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">
                Why voice works when nothing else does
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Speaking is older than writing. It's more natural. When you're overwhelmed, your prefrontal cortex (the "thinking" part) is 
                  overloaded. But your voice? That comes from a different place. It bypasses the overthinking.
                </p>
                <p>
                  There's a reason therapists don't hand you a worksheet when you walk in crying. They say, <span className="text-foreground italic">"Tell me what's going on."</span>
                </p>
                <p className="text-foreground font-medium">
                  aSpiral starts the same way. Talk first. Structure comes later—automatically.
                </p>
              </div>
            </motion.section>

            {/* Real Talk */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.6}>
              <blockquote className="border-l-4 border-primary pl-6 py-4 text-xl md:text-2xl italic text-muted-foreground">
                "I started talking about work stress and ended up crying about my dad. I didn't even know that was connected until I said it out loud."
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground/70">— Early aSpiral user</p>
            </motion.section>
          </div>

          {/* Navigation */}
          <motion.div 
            className="mt-20 pt-10 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.7}
          >
            <Link to="/">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="flex gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
                  Start Your Breakthrough
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/steps/visualize">
                <Button variant="outline" size="lg" className="border-primary/50 hover:bg-primary/10">
                  Next: Visualize
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default VoiceYourChaos;
