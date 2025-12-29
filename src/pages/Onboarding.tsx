import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Briefcase, 
  Heart, 
  Brain, 
  Lightbulb,
  Compass,
  Sparkles,
  Bell,
  BellOff,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEngagementStore } from "@/stores/engagementStore";
import { useAuth } from "@/contexts/AuthContext";
import type { OnboardingReason } from "@/lib/types";
import aspiralLogo from "@/assets/aspiral-logo.png";

const reasons: { id: OnboardingReason; icon: React.ReactNode; label: string; description: string }[] = [
  { 
    id: "decision", 
    icon: <Compass className="w-6 h-6" />, 
    label: "Big Decision", 
    description: "I'm stuck on a major life choice" 
  },
  { 
    id: "anxiety", 
    icon: <Brain className="w-6 h-6" />, 
    label: "Anxiety/Overthinking", 
    description: "My mind won't stop spiraling" 
  },
  { 
    id: "relationship", 
    icon: <Heart className="w-6 h-6" />, 
    label: "Relationship Issue", 
    description: "I need clarity about someone" 
  },
  { 
    id: "career", 
    icon: <Briefcase className="w-6 h-6" />, 
    label: "Career/Work", 
    description: "Job, business, or professional growth" 
  },
  { 
    id: "creative", 
    icon: <Lightbulb className="w-6 h-6" />, 
    label: "Creative Block", 
    description: "I need to unlock new ideas" 
  },
  { 
    id: "curious", 
    icon: <Sparkles className="w-6 h-6" />, 
    label: "Just Curious", 
    description: "I want to explore what this can do" 
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setPreferences, initializeStreak, completeOnboarding } = useEngagementStore();
  
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState<OnboardingReason | null>(null);
  const [name, setName] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const totalSteps = 4;

  const handleReasonSelect = (reason: OnboardingReason) => {
    setSelectedReason(reason);
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      setPreferences({
        userId: user?.id || "anonymous",
        onboardingReason: selectedReason || undefined,
        notificationConsent: notificationsEnabled,
        theme: "dark",
        soundEnabled: true,
        hapticEnabled: true,
        onboardingCompleted: true,
        name: name || undefined,
      });
      
      initializeStreak(user?.id || "anonymous");
      completeOnboarding();
      
      navigate("/app");
    }
  };

  const handleSkip = () => {
    setPreferences({
      userId: user?.id || "anonymous",
      notificationConsent: false,
      theme: "dark",
      soundEnabled: true,
      hapticEnabled: true,
      onboardingCompleted: true,
    });
    
    initializeStreak(user?.id || "anonymous");
    completeOnboarding();
    
    navigate("/app");
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true; // Welcome - always can proceed
      case 2: return selectedReason !== null;
      case 3: return true; // Name is optional
      case 4: return true; // Notifications - always can proceed
      default: return true;
    }
  };

  return (
    <div className="min-h-screen app-container flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-1 flex-1 mx-1 rounded-full ${
                  i < step ? "bg-primary" : "bg-muted"
                }`}
                initial={false}
                animate={{ 
                  backgroundColor: i < step ? "hsl(280 85% 65%)" : "hsl(271 30% 20%)" 
                }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Step {step} of {totalSteps}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-6"
            >
              <motion.img 
                src={aspiralLogo} 
                alt="aSpiral" 
                className="h-16 w-auto mx-auto"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  Welcome to aSpiral
                </h1>
                <p className="text-lg text-muted-foreground">
                  Transform your spiraling thoughts into breakthrough clarity
                </p>
              </div>

              <div className="glass-card p-6 text-left space-y-4">
                <h2 className="font-semibold text-foreground">How it works:</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎤</span>
                    <span className="text-muted-foreground">Voice what's on your mind</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌀</span>
                    <span className="text-muted-foreground">Watch your thoughts visualized</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <span className="text-muted-foreground">Answer 2-3 targeted questions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <span className="text-muted-foreground">Get your breakthrough insight</span>
                  </div>
                </div>
                <p className="text-sm text-secondary font-medium">
                  Most people achieve clarity in under 5 minutes!
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Reason */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  What brings you here today?
                </h1>
                <p className="text-muted-foreground">
                  This helps us personalize your experience
                </p>
              </div>

              <div className="grid gap-3">
                {reasons.map((reason) => (
                  <motion.button
                    key={reason.id}
                    onClick={() => handleReasonSelect(reason.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                      selectedReason === reason.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedReason === reason.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {reason.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{reason.label}</p>
                      <p className="text-sm text-muted-foreground">{reason.description}</p>
                    </div>
                    {selectedReason === reason.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Name (optional) */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  What should we call you?
                </h1>
                <p className="text-muted-foreground">
                  Optional, but makes the experience more personal
                </p>
              </div>

              <div className="glass-card p-6 space-y-4">
                <Input
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg text-center"
                  autoFocus
                />
                {name && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-muted-foreground"
                  >
                    Nice to meet you, <span className="text-foreground font-medium">{name}</span>! ✨
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Notifications */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Stay on track?
                </h1>
                <p className="text-muted-foreground">
                  Get gentle reminders to maintain your streak
                </p>
              </div>

              <div className="grid gap-3">
                <motion.button
                  onClick={() => setNotificationsEnabled(true)}
                  className={`w-full p-6 rounded-xl border text-left transition-all ${
                    notificationsEnabled
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      notificationsEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Bell className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">Yes, remind me</p>
                      <p className="text-sm text-muted-foreground">
                        Streak alerts & weekly insights
                      </p>
                    </div>
                    {notificationsEnabled && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setNotificationsEnabled(false)}
                  className={`w-full p-6 rounded-xl border text-left transition-all ${
                    !notificationsEnabled
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      !notificationsEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <BellOff className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">No thanks</p>
                      <p className="text-sm text-muted-foreground">
                        I'll remember on my own
                      </p>
                    </div>
                    {!notificationsEnabled && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!canProceed()}
            className="gap-2"
          >
            {step === totalSteps ? "Get Started" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
