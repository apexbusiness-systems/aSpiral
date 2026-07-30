import { motion } from "framer-motion";
import { Mic, Volume2, MessageCircle } from "lucide-react";
import voiceIcon from "@/assets/voice-icon.png";
import { StepLayout } from "@/components/layouts/StepLayout";

import { fadeUp } from "@/lib/animations";

const VoiceYourChaos = () => {
  return (
    <StepLayout
      step={1}
      heroIcon={voiceIcon}
      heroTitle="Voice Your Chaos"
      heroSubtitle="Just talk. No typing. Let it all out."
      gradientStart="hsl(var(--primary) / 0.25)"
      gradientMid="hsl(280 70% 50% / 0.15)"
      gradientPos="30% 0%"
      prevLink="/#how-it-works"
      prevText="Back to Home"
      nextLink="/steps/visualize"
      nextText="Next: Visualize"
    >
      {/* The Problem */}
      <motion.section initial="hidden" animate="visible" variants={fadeUp as any} custom={0.3}>
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
      <motion.section initial="hidden" animate="visible" variants={fadeUp as any} custom={0.4}>
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
        initial="hidden" animate="visible" variants={fadeUp as any} custom={0.5}
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
      <motion.section initial="hidden" animate="visible" variants={fadeUp as any} custom={0.6}>
        <blockquote className="border-l-4 border-primary pl-6 py-4 text-xl md:text-2xl italic text-muted-foreground">
          "I started talking about work stress and ended up crying about my dad. I didn't even know that was connected until I said it out loud."
        </blockquote>
        <p className="mt-4 text-sm text-muted-foreground/70">— Early aSpiral user</p>
      </motion.section>
    </StepLayout>
  );
};

export default VoiceYourChaos;
