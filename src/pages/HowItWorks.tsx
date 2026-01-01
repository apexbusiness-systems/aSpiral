import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import visualizeIcon from "@/assets/visualize-icon.png";
import voiceIcon from "@/assets/voice-icon.png";
import questionIcon from "@/assets/question-icon.png";
import breakthroughIcon from "@/assets/breakthrough-icon.png";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const, delay },
  }),
};

const scaleInVariant = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const, delay },
  }),
};

const steps = [
  {
    step: 1,
    customIcon: voiceIcon,
    title: "Voice your chaos",
    description: "Just talk. No typing. Let it all out. Your words become the raw material for clarity.",
    link: "/steps/voice",
    gradient: "from-primary/20 to-accent/10",
  },
  {
    step: 2,
    customIcon: visualizeIcon,
    title: "Watch it visualize",
    description: "Your thoughts become 3D objects you can see and understand. Patterns emerge from chaos.",
    link: "/steps/visualize",
    gradient: "from-accent/20 to-primary/10",
  },
  {
    step: 3,
    customIcon: questionIcon,
    title: "Answer 2-3 questions",
    description: "Not 20. Just what matters. AI finds the core issues and asks the right questions.",
    link: "/steps/questions",
    gradient: "from-primary/15 to-secondary/20",
  },
  {
    step: 4,
    customIcon: breakthroughIcon,
    title: "Get your breakthrough",
    description: "Friction → Grease → Insight. Transform from Spiraling to Aspiring with actionable clarity.",
    link: "/steps/breakthrough",
    gradient: "from-accent/15 to-primary/20",
  },
];

const HowItWorks = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-background/80 border-b border-border/30">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
            <Link to="/app">
              <Button variant="default" size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Try Now
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-24 pb-20 px-6">
          <div className="mx-auto max-w-6xl">
            {/* Hero Section */}
            <motion.div
              className="text-center mb-16"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              <motion.h1
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                variants={fadeUp}
                custom={0}
              >
                How <span className="text-gradient bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">aSpiral</span> Works
              </motion.h1>
              <motion.p
                className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto"
                variants={fadeUp}
                custom={0.1}
              >
                Four simple steps to transform mental chaos into breakthrough clarity
              </motion.p>
            </motion.div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {steps.map((item, index) => (
                <Link to={item.link} key={item.step}>
                  <motion.div
                    className={`relative p-8 lg:p-10 rounded-3xl border border-border/30 
                      bg-gradient-to-br ${item.gradient} backdrop-blur-sm 
                      hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 
                      transition-all duration-500 group cursor-pointer
                      hover:-translate-y-2 h-full min-h-[300px]`}
                    variants={scaleInVariant}
                    initial="hidden"
                    animate="visible"
                    custom={index * 0.15}
                  >
                    {/* Step Number Badge */}
                    <div className="absolute -top-4 left-8 w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center text-lg font-bold text-primary group-hover:bg-primary/40 group-hover:border-primary group-hover:scale-110 transition-all duration-300 shadow-lg shadow-primary/20">
                      {item.step}
                    </div>

                    {/* Icon with Effects */}
                    <motion.div
                      className="mb-6 pt-4 relative inline-block"
                      whileHover={{
                        scale: 1.15,
                        rotate: 5,
                        y: -6,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 12,
                      }}
                    >
                      {/* Glow Effect */}
                      <div className="absolute inset-0 -m-4 rounded-full bg-primary/0 group-hover:bg-primary/30 blur-2xl group-hover:animate-pulse transition-all duration-500" />
                      
                      {/* Particle Effects */}
                      <div className="particle-container absolute inset-0 flex items-center justify-center">
                        <span className="particle particle-1 bg-primary/80 left-1/2 top-1/2" />
                        <span className="particle particle-2 bg-accent/70 left-1/2 top-1/2" />
                        <span className="particle particle-3 bg-primary/60 left-1/2 top-1/2" />
                        <span className="particle particle-4 bg-accent/80 left-1/2 top-1/2" />
                        <span className="particle particle-5 bg-primary/70 left-1/2 top-1/2" />
                      </div>

                      <img
                        src={item.customIcon}
                        alt={item.title}
                        className="w-16 h-16 lg:w-20 lg:h-20 object-contain relative z-10 drop-shadow-lg"
                      />
                    </motion.div>

                    {/* Content */}
                    <h3 className="font-display text-2xl lg:text-3xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-base lg:text-lg leading-relaxed">
                      {item.description}
                    </p>

                    {/* Hover Arrow */}
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5 text-primary rotate-180" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* CTA Section */}
            <motion.div
              className="text-center mt-20"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0.6}
            >
              <p className="text-muted-foreground mb-6">Ready to transform your thinking?</p>
              <Link to="/app">
                <Button size="lg" className="gap-2 text-lg px-8 py-6 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                  <Sparkles className="w-5 h-5" />
                  Start Your Journey
                </Button>
              </Link>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
});

HowItWorks.displayName = "HowItWorks";

export default HowItWorks;
