import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, type Easing } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import aspiralLogo from "@/assets/aspiral-logo.png";
import React from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as Easing, delay },
  }),
};

interface StepLayoutProps {
  step: number;
  totalSteps?: number;
  backLink?: string;
  backText?: string;
  heroIcon: string;
  heroTitle: string;
  heroSubtitle: string;
  gradientStart: string;
  gradientMid: string;
  gradientPos: string;
  children: React.ReactNode;
  prevLink: string;
  prevText: string;
  nextLink: string;
  nextText: string;
  iconFilter?: string[];
  iconScale?: number[];
}

export const StepLayout = ({
  step,
  totalSteps = 4,
  backLink = "/#how-it-works",
  backText = "Back to How It Works",
  heroIcon,
  heroTitle,
  heroSubtitle,
  gradientStart,
  gradientMid,
  gradientPos,
  children,
  prevLink,
  prevText,
  nextLink,
  nextText,
  iconFilter = ["drop-shadow(0 0 20px hsl(var(--primary)/0.3))", "drop-shadow(0 0 40px hsl(var(--primary)/0.5))", "drop-shadow(0 0 20px hsl(var(--primary)/0.3))"],
  iconScale = [1, 1.05, 1],
}: StepLayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-[10%] right-0 w-[60%] h-[400px]"
          style={{
            background: `radial-gradient(ellipse 100% 80% at ${gradientPos}, ${gradientStart} 0%, ${gradientMid} 50%, transparent 80%)`,
            filter: 'blur(70px)',
          }}
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_50%,hsl(var(--background))_100%)]" />
      </div>

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

      <main className="relative z-10 py-16 md:py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Link to={backLink} className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-8 group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              {backText}
            </Link>
          </motion.div>

          <motion.div 
            className="flex items-center gap-4 mb-8"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.1}
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-xl font-bold text-primary">
              {step}
            </div>
            <span className="text-muted-foreground text-lg">Step {step} of {totalSteps}</span>
          </motion.div>

          <motion.div 
            className="flex flex-col md:flex-row items-start gap-8 mb-16"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.2}
          >
            <motion.img 
              src={heroIcon} 
              alt="Icon" 
              className="w-24 h-24 md:w-32 md:h-32"
              animate={{ 
                scale: iconScale,
                filter: iconFilter
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                {heroTitle}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                {heroSubtitle}
              </p>
            </div>
          </motion.div>

          <div className="space-y-16">
            {children}
          </div>

          <motion.div 
            className="mt-20 pt-10 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={0.7}
          >
            <Link to={prevLink}>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {prevText}
              </Button>
            </Link>
            <div className="flex gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
                  Start Your Breakthrough
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to={nextLink}>
                <Button variant="outline" size="lg" className="border-primary/50 hover:bg-primary/10">
                  {nextText}
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
