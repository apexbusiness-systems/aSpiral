import { motion } from "framer-motion";
import { Target, Brain, Clock, Heart } from "lucide-react";
import questionIcon from "@/assets/question-icon.png";
import { StepLayout } from "@/components/layouts/StepLayout";

import { fadeUp } from "@/lib/animations";

const AnswerQuestions = () => {
  return (
    <StepLayout
      step={3}
      heroIcon={questionIcon}
      heroTitle="Answer 2-3 Questions"
      heroSubtitle="Not 20. Just what matters. AI finds the core."
      gradientStart="hsl(var(--secondary) / 0.15)"
      gradientMid="hsl(280 70% 50% / 0.1)"
      gradientPos="80% 30%"
      prevLink="/steps/visualize"
      prevText="Previous: Visualize"
      nextLink="/steps/breakthrough"
      nextText="Next: Breakthrough"
      iconFilter={["drop-shadow(0 0 20px hsl(280 70% 50% / 0.3))", "drop-shadow(0 0 40px hsl(280 70% 50% / 0.5))", "drop-shadow(0 0 20px hsl(280 70% 50% / 0.3))"]}
    >
      {/* The Anti-Assessment */}
      <motion.section initial="hidden" animate="visible" variants={fadeUp as any} custom={0.3}>
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
      <motion.section initial="hidden" animate="visible" variants={fadeUp as any} custom={0.4}>
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
        initial="hidden" animate="visible" variants={fadeUp as any} custom={0.5}
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
      <motion.section initial="hidden" animate="visible" variants={fadeUp as any} custom={0.6}>
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
      <motion.section initial="hidden" animate="visible" variants={fadeUp as any} custom={0.65}>
        <blockquote className="border-l-4 border-primary pl-6 py-4 text-xl md:text-2xl italic text-muted-foreground">
          "The question was so simple but it hit like a truck. 'What would it mean to let go of that?' I wasn't ready for that question. But I needed it."
        </blockquote>
        <p className="mt-4 text-sm text-muted-foreground/70">— aSpiral early access user</p>
      </motion.section>
    </StepLayout>
  );
};

export default AnswerQuestions;
