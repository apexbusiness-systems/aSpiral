import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Sparkles, ArrowRight } from "lucide-react";
import demoVideo from "@/assets/demo-video.mp4";
import aspiralLogo from "@/assets/aspiral-logo.png";
import visualizeIcon from "@/assets/visualize-icon.png";
import voiceIcon from "@/assets/voice-icon.png";

const Landing = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -top-40 -left-40 animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[100px] top-1/3 right-0 animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute w-[400px] h-[400px] bg-accent/10 rounded-full blur-[80px] bottom-0 left-1/3 animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={aspiralLogo} 
              alt="aSpiral" 
              className="h-[2.78rem] drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)] transition-all duration-300" 
            />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#story" className="hover:text-foreground transition-colors">Story</a>
            <Link to="/app">
              <Button variant="outline" size="sm" className="border-primary/50 hover:bg-primary/10">
                Open App
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-20 md:py-32 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            From{" "}
            <span className="text-primary relative">
              Spiraling
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none">
                <path d="M0,4 Q50,8 100,4 T200,4" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
              </svg>
            </span>{" "}
            to{" "}
            <span className="text-secondary">Aspiring</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-light">
            Voice your chaos. Visualize clarity. Get your breakthrough.
          </p>
          
          <p className="text-base md:text-lg text-muted-foreground/80 mb-10 max-w-2xl mx-auto">
            Turn mental spirals into visual breakthroughs in 5 minutes.
            <br />
            <span className="text-foreground/70">AI-powered. Voice-first. Built during a breakdown.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link to="/app">
              <Button size="lg" className="group text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                Start Your Breakthrough
                <Sparkles className="ml-2 h-5 w-5 group-hover:animate-pulse" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 border-border/50 hover:bg-muted/50"
              onClick={() => setIsDemoOpen(true)}
            >
              <Play className="mr-2 h-5 w-5" />
              Watch 60s Demo
            </Button>
          </div>

          <p className="text-sm text-muted-foreground/60">
            Free: 5 breakthroughs/day • No credit card • Works in browser
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-20 px-6 border-t border-border/20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16">
            How it works
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: 1,
                customIcon: voiceIcon,
                title: "Voice your chaos",
                description: "Just talk. No typing. Let it all out.",
              },
              {
                step: 2,
                customIcon: visualizeIcon,
                title: "Watch it visualize",
                description: "Your thoughts become 3D objects you can see and understand.",
              },
              {
                step: 3,
                emoji: "💬",
                title: "Answer 2-3 questions",
                description: "Not 20. Just what matters. AI finds the core.",
              },
              {
                step: 4,
                emoji: "✨",
                title: "Get your breakthrough",
                description: "Friction → Grease → Insight. From Spiraling to Aspiring.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-all group"
              >
                <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                  {item.step}
                </div>
                <div className="mb-4 pt-2">
                  {item.customIcon ? (
                    <img src={item.customIcon} alt={item.title} className="w-10 h-10" />
                  ) : (
                    <span className="text-4xl">{item.emoji}</span>
                  )}
                </div>
                <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section id="story" className="relative z-10 py-20 px-6 border-t border-border/20">
        <div className="mx-auto max-w-3xl">
          <div className="p-8 md:p-12 rounded-3xl border border-border/30 bg-gradient-to-br from-card/50 to-card/20 backdrop-blur-sm">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8 text-center">
              Built in 6 hours. During a breakdown.
            </h2>

            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p className="text-lg">
                I'm <span className="text-foreground font-medium">JR</span>. I was spiraling from trauma.
                <br />
                My coping mechanism? Building things.
              </p>
              
              <p className="text-lg">
                6 hours later, <span className="text-primary font-semibold">ASPIRAL</span> existed. I used it on myself.
                <br />
                <span className="text-secondary font-medium">It worked.</span> Now it's helping others do the same.
              </p>
              
              <p className="text-xl font-display text-foreground text-center pt-4 border-t border-border/20 mt-8">
                From Spiraling to Aspiring.
                <br />
                <span className="text-muted-foreground text-base font-normal">That's the journey. That's the proof.</span>
              </p>
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/story"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Read the full story
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-6 border-t border-border/20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Ready to break through?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Voice your chaos. Find your clarity. In 5 minutes or less.
          </p>
          <Link to="/app">
            <Button size="lg" className="text-lg px-10 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
              Start Your Breakthrough
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={aspiralLogo} 
              alt="aSpiral" 
              className="h-8 drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" 
            />
            <span className="text-muted-foreground text-sm">• aspiral.icu</span>
          </div>
          <div className="text-muted-foreground/60 text-sm text-center md:text-right">
            Built in 6 hours during a breakdown • Edmonton, AB
            <br />
            <a href="mailto:founders@aspiral.icu" className="hover:text-foreground transition-colors">
              founders@aspiral.icu
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
