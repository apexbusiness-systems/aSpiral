import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, type Easing } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Target, Brain, Clock, Heart } from "lucide-react";
import aspiralLogo from "@/assets/aspiral-logo.png";
import questionIcon from "@/assets/question-icon.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as Easing, delay },
  }),
};

const AnswerQuestions = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-[10%] right-0 w-[60%] h-[400px]"
          style={{
            background: `radial-gradient(ellipse 100% 80% at 80% 30%, hsl(var(--secondary) / 0.15) 0%, hsl(280 70% 50% / 0.1) 50%, transparent 80%)`,
            filter: 'blur(70px)',
          }}
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
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
              3
            </div>
            <span className="text-muted-foreground text-lg">Step 3 of 4</span>
          </motion.div>

          {/* Hero */}
          <motion.div 
            className="flex flex-col md:flex-row items-start gap-8 mb-16"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.2}
          >
            <motion.img 
              src={questionIcon} 
              alt="Question Icon" 
              className="w-24 h-24 md:w-32 md:h-32"
              animate={{ 
                scale: [1, 1.05, 1],
                filter: ["drop-shadow(0 0 20px hsl(280 70% 50% / 0.3))", "drop-shadow(0 0 40px hsl(280 70% 50% / 0.5))", "drop-shadow(0 0 20px hsl(280 70% 50% / 0.3))"]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                Answer 2-3 Questions
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Not 20. Just what matters. AI finds the core.
              </p>
            </div>
          </motion.div>

          {/* Content Sections */}
          <div className="space-y-16">
            {/* The Anti-Assessment */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.3}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-primary">
                This isn't a personality quiz.
              </h2>
              <div className="prose prose-lg prose-invert max-w-none space-y-4 text-muted-foreground">
                <p>
                  You know those endless questionnaires? "On a scale of 1-10, how often do you feel anxious?" 
                  <span className="text-foreground"> Yeah, we hate those too.</span>
                </p>
                <p>
                  Traditional assessments assume you already know what's wrong. They ask you to categorize feelings you haven't even named yet. 
                  They're exhausting. And by question 47, you're just clicking random buttons.
                </p>
                <p className="text-foreground font-medium">
                  aSpiral takes a different approach. It listened to you. It saw your visualization. Now it asks only what it needs to know.
                </p>
              </div>
            </motion.section>

            {/* How It Works */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.4}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-secondary">
                Smart questions, not more questions.
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Brain, title: "AI-generated", desc: "Based on what YOU said, not some generic template. Each question is tailored to your specific chaos." },
                  { icon: Target, title: "Precision focus", desc: "Questions aim at the friction point—the thing that's actually stuck, not the symptoms around it." },
                  { icon: Clock, title: "2-3 max", desc: "Most people need 2 questions. Sometimes 3. Never 20. We respect your time and energy." },
                  { icon: Heart, title: "Gently probing", desc: "Questions feel like a good therapist's follow-up, not an interrogation or a corporate survey." },
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

            {/* Examples */}
            <motion.section 
              className="p-8 md:p-12 rounded-3xl border border-primary/20 bg-card/40"
              initial="hidden" animate="visible" variants={fadeUp} custom={0.5}
            >
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">
                Questions that actually mean something
              </h2>
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm text-primary mb-2">Example question after someone talked about work stress:</p>
                  <p className="text-lg text-foreground italic">"You mentioned feeling 'invisible' at work. When's the last time you felt truly seen—at work or anywhere?"</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
                  <p className="text-sm text-secondary mb-2">Example after someone talked about relationship anxiety:</p>
                  <p className="text-lg text-foreground italic">"You said you're scared of 'being too much.' Who first made you feel like you were too much?"</p>
                </div>
              </div>
              <p className="mt-6 text-muted-foreground">
                These aren't random. They're precision-guided by everything you've already shared.
              </p>
            </motion.section>

            {/* The Point */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.6}>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">
                Why bother with questions at all?
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Because your voice dump is raw material. It's everything. But breakthroughs need <span className="text-foreground">focus</span>.
                </p>
                <p>
                  The questions help the AI—and you—zoom in on the exact spot where you're stuck. Think of it like this:
                </p>
                <p className="text-foreground font-medium pl-4 border-l-2 border-primary/50">
                  Your voice tells us the whole forest. The questions help us find the specific tree that's blocking your path.
                </p>
              </div>
            </motion.section>

            {/* Quote */}
            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.65}>
              <blockquote className="border-l-4 border-primary pl-6 py-4 text-xl md:text-2xl italic text-muted-foreground">
                "The question was so simple but it hit like a truck. 'What would it mean to let go of that?' I wasn't ready for that question. But I needed it."
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground/70">— aSpiral early access user</p>
            </motion.section>
          </div>

          {/* Navigation */}
          <motion.div 
            className="mt-20 pt-10 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.7}
          >
            <Link to="/steps/visualize">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous: Visualize
              </Button>
            </Link>
            <div className="flex gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
                  Start Your Breakthrough
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/steps/breakthrough">
                <Button variant="outline" size="lg" className="border-primary/50 hover:bg-primary/10">
                  Next: Breakthrough
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

export default AnswerQuestions;
