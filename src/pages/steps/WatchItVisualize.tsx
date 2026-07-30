import { motion } from "framer-motion";
import { Eye, Layers, Zap, Move3D } from "lucide-react";
import visualizeIcon from "@/assets/visualize-icon.png";
import { fadeUp } from "@/lib/animations";
import { StepLayout } from "@/components/layouts/StepLayout";

const WatchItVisualize = () => {
  return (
    <StepLayout
      step={2}
      totalSteps={4}
      heroTitle="Watch It Visualize"
      heroSubtitle="Your thoughts become 3D objects you can see and understand."
      heroIcon={visualizeIcon}
      prevLink="/steps/voice"
      prevText="Previous: Voice"
      nextLink="/steps/questions"
      nextText="Next: Questions"
      gradientStart="hsl(180 60% 50% / 0.12)"
      gradientMid="hsl(var(--primary) / 0.18)"
      gradientPos="70% 20%"
    >
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
    </StepLayout>
  );
};

export default WatchItVisualize;
