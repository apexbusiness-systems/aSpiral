import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, type Easing } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Eye, Layers, Zap, Move3D } from "lucide-react";
import aspiralLogo from "@/assets/aspiral-logo.png";
import visualizeIcon from "@/assets/visualize-icon.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as Easing, delay },
  }),
};

const WatchItVisualize = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-0 -left-20 w-[120%] h-[500px]"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 70% 20%, hsl(180 60% 50% / 0.12) 0%, hsl(var(--primary) / 0.18) 40%, transparent 70%)`,
            filter: 'blur(80px)',
          }}
          animate={{ opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
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
              2
            </div>
            <span className="text-muted-foreground text-lg">Step 2 of 4</span>
          </motion.div>

          {/* Hero */}
          <motion.div 
            className="flex flex-col md:flex-row items-start gap-8 mb-16"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.2}
          >
            <motion.img 
              src={visualizeIcon} 
              alt="Visualize Icon" 
              className="w-24 h-24 md:w-32 md:h-32"
              animate={{ 
                rotate: [0, 5, -5, 0],
                filter: ["drop-shadow(0 0 20px hsl(180 60% 50% / 0.3))", "drop-shadow(0 0 40px hsl(180 60% 50% / 0.5))", "drop-shadow(0 0 20px hsl(180 60% 50% / 0.3))"]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                Watch It Visualize
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Your thoughts become 3D objects you can see and understand.
              </p>
            </div>
          </motion.div>

          {/* Content Sections */}
          <div className="space-y-16">
            {/* The Magic */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.3}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-primary">
                See your mind, literally.
              </h2>
              <div className="prose prose-lg prose-invert max-w-none space-y-4 text-muted-foreground">
                <p>
                  As you talk, something magical happens. Your words transform into floating orbs, each one representing a piece of what you're feeling. 
                  <span className="text-foreground"> People. Emotions. Memories. Fears.</span> They all become visible.
                </p>
                <p>
                  It's like watching your thoughts materialize in space. Suddenly, that overwhelming mess in your head? You can <span className="italic">see it</span>. 
                  You can point at it. You can say, "That. That's the thing."
                </p>
              </div>
            </motion.section>

            {/* How It Works */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.4}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-secondary">
                Powered by AI, felt by you.
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Eye, title: "Entity extraction", desc: "AI listens to your words and identifies the key players—people, emotions, concepts, events." },
                  { icon: Layers, title: "3D representation", desc: "Each entity becomes a glowing orb in a spiral space. Related things cluster. Opposites separate." },
                  { icon: Zap, title: "Real-time updates", desc: "As you keep talking, new entities appear. The visualization grows with your story." },
                  { icon: Move3D, title: "Interactive exploration", desc: "Click, drag, zoom. Explore your own mind like you're navigating a map." },
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

            {/* The Why */}
            <motion.section 
              className="p-8 md:p-12 rounded-3xl border border-secondary/20 bg-secondary/5"
              initial="hidden" animate="visible" variants={fadeUp} custom={0.5}
            >
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">
                Why visualization changes everything
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  When thoughts stay invisible, they feel infinite. Unmanageable. Like trying to count stars in a black hole.
                </p>
                <p>
                  But the moment you <span className="text-foreground">see</span> them? Something shifts. Your brain goes from "I'm drowning in chaos" to 
                  "Oh, there are actually only seven things here. And those two are connected."
                </p>
                <p className="text-foreground font-medium">
                  Externalization is therapeutic. It's why journaling works. Why talking helps. aSpiral just makes it instant—and visual.
                </p>
              </div>
            </motion.section>

            {/* The Experience */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.6}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">
                What it feels like
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Imagine watching your anxiety float in front of you as a purple orb. Your mom as a warm golden one. 
                  That project deadline as a sharp red triangle.
                </p>
                <p>
                  And then seeing them <span className="italic">connect</span>. The line between "anxiety" and "mom" lights up. 
                  You didn't consciously connect them—but there it is.
                </p>
                <p className="text-foreground">
                  That's the moment you start to understand.
                </p>
              </div>
            </motion.section>

            {/* Quote */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.65}>
              <blockquote className="border-l-4 border-secondary pl-6 py-4 text-xl md:text-2xl italic text-muted-foreground">
                "Seeing my thoughts floating in 3D made me realize my 'work problem' was actually a 'self-worth problem' wearing a work costume."
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground/70">— Beta user feedback</p>
            </motion.section>
          </div>

          {/* Navigation */}
          <motion.div 
            className="mt-20 pt-10 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.7}
          >
            <Link to="/steps/voice">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous: Voice
              </Button>
            </Link>
            <div className="flex gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
                  Start Your Breakthrough
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/steps/questions">
                <Button variant="outline" size="lg" className="border-primary/50 hover:bg-primary/10">
                  Next: Questions
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

export default WatchItVisualize;
