import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Sparkles, ArrowRight } from "lucide-react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import demoVideo from "@/assets/demo-video.mp4";
import aspiralLogo from "@/assets/aspiral-logo.png";
import heromark from "@/assets/aspiral-heromark.svg";
import visualizeIcon from "@/assets/visualize-icon.png";
import voiceIcon from "@/assets/voice-icon.png";
import questionIcon from "@/assets/question-icon.png";
import breakthroughIcon from "@/assets/breakthrough-icon.png";

// Animation variants
const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const scaleInVariant = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const, delay },
  }),
};

const Landing = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  
  // Section refs for scroll animations
  const howItWorksRef = useRef(null);
  const storyRef = useRef(null);
  const ctaRef = useRef(null);
  
  // Parallax scroll effect for heromark
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 500], [0, -80]);
  
  const howItWorksInView = useInView(howItWorksRef, { once: true, margin: "-100px" });
  const storyInView = useInView(storyRef, { once: true, margin: "-100px" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-100px" });

  const steps = [
    {
      step: 1,
      customIcon: voiceIcon,
      title: "Voice your chaos",
      description: "Just talk. No typing. Let it all out.",
      link: "/steps/voice",
    },
    {
      step: 2,
      customIcon: visualizeIcon,
      title: "Watch it visualize",
      description: "Your thoughts become 3D objects you can see and understand.",
      link: "/steps/visualize",
    },
    {
      step: 3,
      customIcon: questionIcon,
      title: "Answer 2-3 questions",
      description: "Not 20. Just what matters. AI finds the core.",
      link: "/steps/questions",
    },
    {
      step: 4,
      customIcon: breakthroughIcon,
      title: "Get your breakthrough",
      description: "Friction → Grease → Insight. From Spiraling to Aspiring.",
      link: "/steps/breakthrough",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Aurora Borealis Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Base aurora layers - flowing curtains */}
        <motion.div 
          className="absolute inset-0 aurora-ambient"
          style={{
            background: `
              linear-gradient(135deg, 
                transparent 0%, 
                hsl(var(--primary) / 0.08) 20%, 
                hsl(160 80% 50% / 0.06) 40%, 
                hsl(var(--secondary) / 0.08) 60%, 
                transparent 80%
              )
            `,
          }}
        />
        
        {/* Primary aurora curtain - top */}
        <motion.div 
          className="absolute -top-20 left-0 right-0 h-[600px] aurora-flow"
          style={{
            background: `
              radial-gradient(ellipse 120% 60% at 30% 0%, 
                hsl(var(--primary) / 0.25) 0%, 
                hsl(160 70% 45% / 0.15) 30%, 
                transparent 70%
              )
            `,
            filter: 'blur(60px)',
          }}
          animate={{ 
            opacity: [0.6, 0.8, 0.6],
            scaleX: [1, 1.05, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Secondary aurora wave - flowing across */}
        <motion.div 
          className="absolute top-0 -left-20 w-[120%] h-[500px] aurora-ambient"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 70% 20%, 
                hsl(180 60% 50% / 0.12) 0%,
                hsl(var(--primary) / 0.18) 40%, 
                transparent 70%
              )
            `,
            filter: 'blur(80px)',
            transformOrigin: 'top right',
          }}
          animate={{ 
            opacity: [0.5, 0.7, 0.5],
            rotate: [-2, 2, -2],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        
        {/* Tertiary aurora shimmer - gold/secondary accent */}
        <motion.div 
          className="absolute top-[10%] right-0 w-[60%] h-[400px]"
          style={{
            background: `
              radial-gradient(ellipse 100% 80% at 80% 30%, 
                hsl(var(--secondary) / 0.15) 0%, 
                hsl(45 80% 55% / 0.08) 50%,
                transparent 80%
              )
            `,
            filter: 'blur(70px)',
          }}
          animate={{ 
            opacity: [0.4, 0.6, 0.4],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />

        {/* Deep aurora glow - bottom accent */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-[400px]"
          style={{
            background: `
              linear-gradient(0deg, 
                hsl(var(--primary) / 0.1) 0%, 
                hsl(200 70% 50% / 0.05) 50%,
                transparent 100%
              )
            `,
            filter: 'blur(50px)',
          }}
          animate={{ 
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        {/* Floating orb particles */}
        <motion.div 
          className="absolute w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] -top-40 -left-40"
          animate={{ 
            scale: [1, 1.15, 1],
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute w-[500px] h-[500px] bg-secondary/12 rounded-full blur-[100px] top-1/3 -right-40"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, -30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
        
        {/* Vignette overlay for focus */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_50%,hsl(var(--background))_100%)]" />
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
          }} 
        />
      </div>

      {/* Header */}
      <motion.header 
        className="relative z-10 border-b border-border/30 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={aspiralLogo} 
              alt="aSpiral" 
              className="h-[2.78rem] drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)] transition-all duration-300" 
            />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how-it-works" className="relative hover:text-foreground transition-colors group">
              How it works
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#story" className="relative hover:text-foreground transition-colors group">
              Story
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <Link to="/app">
              <Button variant="outline" size="sm" className="border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300">
                Open App
              </Button>
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero Section - Split Layout */}
      <section className="relative z-10 pt-8 md:pt-12 lg:pt-16 pb-24 md:pb-32 lg:pb-40 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text Content */}
            <motion.div 
              className="text-center lg:text-left"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {/* Main Headline */}
              <motion.h1 
                className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-bold leading-[0.9] tracking-tight mb-8"
                variants={fadeUpVariant}
                custom={0}
              >
                <span className="block">From</span>
                <span className="block text-primary relative inline-block">
                  Spiraling
                  <motion.svg 
                    className="absolute -bottom-1 md:-bottom-2 lg:-bottom-3 left-0 w-full h-3 md:h-4 lg:h-5" 
                    viewBox="0 0 200 16" 
                    preserveAspectRatio="none"
                    initial={{ pathLength: 0, opacity: 0, filter: "drop-shadow(0 0 6px hsl(var(--primary)/0.6))" }}
                    animate={{ 
                      pathLength: 1, 
                      opacity: 1,
                      filter: [
                        "drop-shadow(0 0 6px hsl(var(--primary)/0.6))",
                        "drop-shadow(0 0 14px hsl(var(--primary)/0.9))",
                        "drop-shadow(0 0 6px hsl(var(--primary)/0.6))"
                      ]
                    }}
                    transition={{ 
                      pathLength: { duration: 1.5, delay: 0.8, ease: "easeInOut" },
                      opacity: { duration: 1.5, delay: 0.8, ease: "easeInOut" },
                      filter: { duration: 2.5, delay: 2.3, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <motion.path 
                      d="M0,8 Q50,16 100,8 T200,8" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="5" 
                      className="text-primary"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
                    />
                  </motion.svg>
                </span>
                <span className="block mt-6 md:mt-8">to <span className="text-secondary">Aspiring</span></span>
              </motion.h1>
              
              {/* Tagline */}
              <motion.p 
                className="font-question text-xl sm:text-2xl md:text-2xl text-muted-foreground mb-6 italic"
                variants={fadeUpVariant}
                custom={0.2}
              >
                Voice your chaos. Visualize clarity. Get your breakthrough.
              </motion.p>
              
              {/* Subtext */}
              <motion.p 
                className="text-base md:text-lg text-muted-foreground/80 mb-10 max-w-xl mx-auto lg:mx-0"
                variants={fadeUpVariant}
                custom={0.3}
              >
                Turn mental spirals into visual breakthroughs in 5 minutes.
                <br />
                <span className="text-foreground/70">AI-powered. Voice-first. Built during a breakdown.</span>
              </motion.p>

              {/* CTAs */}
              <motion.div 
                className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-6"
                variants={fadeUpVariant}
                custom={0.4}
              >
                <Link to="/app">
                  <Button 
                    size="lg" 
                    className="group text-lg px-10 py-7 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
                  >
                    Start Your Breakthrough
                    <Sparkles className="ml-2 h-5 w-5 group-hover:animate-pulse" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-10 py-7 border-border/50 hover:bg-muted/50 hover:border-border transition-all duration-300"
                  onClick={() => setIsDemoOpen(true)}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch 60s Demo
                </Button>
              </motion.div>

              <motion.p 
                className="text-sm text-muted-foreground/60 tracking-wide"
                variants={fadeUpVariant}
                custom={0.5}
              >
                Free: 5 breakthroughs/day • No credit card • Works in browser
              </motion.p>
            </motion.div>

            {/* Right: Heromark with Parallax and Particles */}
            <motion.div 
              className="flex items-center justify-center lg:justify-end relative"
              initial={{ opacity: 0, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              style={{ y: heroParallax }}
            >
              {/* Floating Particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-primary/40"
                  style={{
                    width: Math.random() * 6 + 3,
                    height: Math.random() * 6 + 3,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    x: [0, Math.random() * 20 - 10, 0],
                    opacity: [0.3, 0.8, 0.3],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut",
                  }}
                />
              ))}
              {/* Secondary particles with different color */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`secondary-${i}`}
                  className="absolute rounded-full bg-secondary/50"
                  style={{
                    width: Math.random() * 4 + 2,
                    height: Math.random() * 4 + 2,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -25, 0],
                    opacity: [0.2, 0.6, 0.2],
                  }}
                  transition={{
                    duration: 4 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                    ease: "easeInOut",
                  }}
                />
              ))}
              <motion.img 
                src={heromark} 
                alt="aSpiral Heromark" 
                className="w-full max-w-[360px] sm:max-w-[450px] lg:max-w-[550px] xl:max-w-[620px] h-auto drop-shadow-[0_0_60px_hsl(var(--primary)/0.3)] relative z-10"
                animate={{ 
                  filter: [
                    "drop-shadow(0 0 40px hsl(var(--primary)/0.2))",
                    "drop-shadow(0 0 80px hsl(var(--primary)/0.4))",
                    "drop-shadow(0 0 40px hsl(var(--primary)/0.2))"
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - Bento Grid */}
      <section 
        id="how-it-works" 
        ref={howItWorksRef}
        className="relative z-10 py-24 md:py-32 px-6 border-t border-border/20"
      >
        <div className="mx-auto max-w-6xl">
          <motion.h2 
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={howItWorksInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            How it works
          </motion.h2>

          {/* 2x2 Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {steps.map((item, index) => (
              <Link to={item.link} key={item.step}>
                <motion.div
                  className="relative p-8 lg:p-10 rounded-3xl border border-border/30 bg-card/30 backdrop-blur-sm 
                    hover:border-primary/40 hover:bg-card/50 transition-all duration-500 group cursor-pointer
                    hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                  variants={scaleInVariant}
                  initial="hidden"
                  animate={howItWorksInView ? "visible" : "hidden"}
                  custom={index * 0.1}
                >
                  {/* Step Number */}
                  <div className="absolute -top-4 left-8 w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-base font-bold text-primary group-hover:bg-primary/30 group-hover:border-primary/60 transition-all duration-300">
                    {item.step}
                  </div>
                  
                  {/* Icon */}
                  <motion.div 
                    className="mb-6 pt-4"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <img 
                      src={item.customIcon} 
                      alt={item.title} 
                      className="w-14 h-14 lg:w-16 lg:h-16 opacity-90 group-hover:opacity-100 transition-opacity" 
                    />
                  </motion.div>
                  
                  {/* Content */}
                  <h3 className="font-display text-xl lg:text-2xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-base lg:text-lg leading-relaxed">
                    {item.description}
                  </p>
                  
                  {/* Learn more hint */}
                  <div className="mt-4 flex items-center text-sm text-primary/70 group-hover:text-primary transition-colors">
                    <span>Learn more</span>
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section - Full Bleed Cinematic */}
      <section 
        id="story" 
        ref={storyRef}
        className="relative z-10 py-32 md:py-48 px-6"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent" />
        
        <div className="relative mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={storyInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-12 text-center"
          >
            {/* Main Pull Quote */}
            <motion.h2 
              className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={storyInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Built{" "}
              <span className="text-primary">during a breakdown.</span>
              <br />
              <span className="text-muted-foreground">Now it's helping others.</span>
            </motion.h2>

            {/* Decorative Line */}
            <motion.div 
              className="w-24 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent mx-auto"
              initial={{ scaleX: 0 }}
              animate={storyInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
            />

            {/* Story Content */}
            <div className="space-y-8 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={storyInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                I'm <span className="text-foreground font-medium">JR</span>. I was spiraling from trauma.
                <br />
                My coping mechanism? <span className="italic">Building things.</span>
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={storyInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                So I built <span className="text-primary font-semibold">ASPIRAL</span>. I used it on myself.
                <br />
                <span className="text-secondary font-medium">It worked.</span> Now it's helping others do the same.
              </motion.p>
              
              <motion.div
                className="pt-8 border-t border-border/20"
                initial={{ opacity: 0, y: 20 }}
                animate={storyInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <p className="font-display text-2xl md:text-3xl text-foreground">
                  From Spiraling to Aspiring.
                </p>
                <p className="text-muted-foreground/80 mt-2">
                  That's the journey. That's the proof.
                </p>
              </motion.div>
            </div>

            {/* Read More Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={storyInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Link
                to="/story"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium text-lg group"
              >
                Read the full story
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section - Dark Intensity */}
      <section 
        ref={ctaRef}
        className="relative z-10 py-24 md:py-32 px-6 border-t border-border/20"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
        
        <motion.div 
          className="relative mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={ctaInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Ready to break through?
          </h2>
          <p className="text-muted-foreground mb-10 text-lg md:text-xl">
            Voice your chaos. Find your clarity. Just in time.
          </p>
          <Link to="/app">
            <Button 
              size="lg" 
              className="text-lg px-12 py-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.03] transition-all duration-300"
            >
              Start Your Breakthrough
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer - Refined */}
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
              href="mailto:info-outreach@aspiral.icu" 
              className="hover:text-foreground transition-colors inline-block"
            >
              info-outreach@aspiral.icu
            </a>
          </div>
        </div>
      </footer>

      {/* Demo Video Modal */}
      <Dialog open={isDemoOpen} onOpenChange={setIsDemoOpen}>
        <DialogContent className="sm:max-w-4xl p-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="font-display text-xl">aSpiral Demo</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            <video
              className="w-full h-full"
              src={demoVideo}
              controls
              autoPlay
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;
