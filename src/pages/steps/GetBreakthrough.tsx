import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, Lightbulb, RefreshCw, Gift } from "lucide-react";
import breakthroughIcon from "@/assets/breakthrough-icon.png";
import { StepLayout } from "@/components/layouts/StepLayout";
import { fadeUp } from "@/lib/animations";
import { FeatureGrid } from "@/components/ui/FeatureGrid";

const GetBreakthrough = () => {
  return (
    <StepLayout
      step={4}
      totalSteps={4}
      heroTitle="Get Your Breakthrough"
      heroSubtitle="Friction → Grease → Insight. From Spiraling to Aspiring."
      heroIcon={breakthroughIcon}
      prevLink="/steps/questions"
      prevText="Previous: Questions"
      nextLink="/auth"
      nextText="Start Now"
      gradientStart="hsl(var(--primary) / 0.3)"
      gradientMid="hsl(var(--secondary) / 0.2)"
      gradientPos="50% 0%"
      iconFilter={[
        "drop-shadow(0 0 20px hsl(var(--secondary) / 0.5))",
        "drop-shadow(0 0 50px hsl(var(--secondary) / 0.8))",
        "drop-shadow(0 0 20px hsl(var(--secondary) / 0.5))"
      ]}
      iconScale={[1, 1.1, 1]}
    >
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

            <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0.4}>
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6 text-secondary">
          What the breakthrough feels like
        </h2>
        <FeatureGrid
          cols={2}
          items={[
            { icon: Zap, title: "Cinematic moment", desc: "A 5-second visual experience that marks the transition. Particles explode. The spiral transforms. It's not just information—it's a felt moment." },
            { icon: Lightbulb, title: "Clarity arrives", desc: "Your breakthrough appears in the center. Friction, Grease, Insight—laid out clearly. The chaos has a name now. The path has a direction." },
            { icon: RefreshCw, title: "Pattern interrupt", desc: "The visual drama isn't just pretty—it helps your brain register that something changed. This isn't a normal moment. This is a breakthrough." },
            { icon: Gift, title: "Something to keep", desc: "Export your breakthrough. Save it. Screenshot it. Come back to it when the old patterns try to creep back in." },
          ]}
        />
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
    </StepLayout>
  );
};

export default GetBreakthrough;
