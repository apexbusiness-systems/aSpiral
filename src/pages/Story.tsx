import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Heart, Zap, Target } from "lucide-react";

const Story = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-primary/15 rounded-full blur-[100px] top-0 right-0 animate-pulse" />
        <div className="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] bottom-1/4 left-0 animate-pulse" style={{ animationDelay: "3s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </Link>
          <Link to="/">
            <span className="font-display text-xl font-bold">
              <span className="text-primary">a</span>SPIRAL
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 py-16 px-6">
        <article className="mx-auto max-w-2xl">
          {/* Title */}
          <header className="mb-12 text-center">
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              The Story Behind ASPIRAL
            </h1>
            <p className="text-muted-foreground text-lg">
              Built in 6 hours. During a breakdown. Here's why.
            </p>
          </header>

          {/* Story Content */}
          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            {/* The Spiral */}
            <section className="p-6 rounded-2xl border border-border/30 bg-card/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-destructive" />
                </div>
                <h2 className="font-display text-xl font-semibold m-0">The Spiral</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed m-0">
                I'm JR. I was spiraling. Not the casual kind, but the kind where your thoughts 
                loop endlessly, where every solution creates three new problems, where clarity 
                feels impossible.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4 m-0">
                Trauma does that. It takes your mind and turns it into a maze with no exit. 
                You know there's a way out, but you can't see it. You can't think your way 
                through because thinking is the problem.
              </p>
            </section>

            {/* The Coping Mechanism */}
            <section className="p-6 rounded-2xl border border-border/30 bg-card/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold m-0">The Coping Mechanism</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed m-0">
                My coping mechanism? Building things. When my mind spirals, my hands build. 
                It's how I've always processed chaos, by creating order somewhere else.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4 m-0">
                So I asked myself: what if I could build something that does what I need right now? 
                Something that takes the chaos in my head and makes it visible. Something that 
                helps me see what I can't think through.
              </p>
            </section>

            {/* The Build */}
            <section className="p-6 rounded-2xl border border-border/30 bg-card/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-secondary" />
                </div>
                <h2 className="font-display text-xl font-semibold m-0">6 Hours Later</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed m-0">
                Six hours of hyperfocus. Voice input because typing felt impossible. 
                3D visualization because I needed to see my thoughts, not read them. 
                AI that asks questions instead of giving answers.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4 m-0">
                ASPIRAL was born. And the first person I used it on was myself.
              </p>
              <p className="text-foreground leading-relaxed mt-4 font-medium m-0">
                It worked.
              </p>
            </section>

            {/* The Insight */}
            <section className="p-6 rounded-2xl border border-border/30 bg-card/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-accent" />
                </div>
                <h2 className="font-display text-xl font-semibold m-0">The Insight</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed m-0">
                What I learned: the breakthrough isn't about finding the right answer. 
                It's about asking the right question. And sometimes you need something 
                outside your head to help you find it.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4 m-0">
                <span className="text-primary">Friction</span> is what's blocking you. {" "}
                <span className="text-secondary">Grease</span> is what unblocks it. {" "}
                <span className="text-accent">Insight</span> is what emerges when you stop spiraling 
                and start aspiring.
              </p>
            </section>

            {/* The Mission */}
            <section className="p-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent text-center">
              <h2 className="font-display text-2xl font-bold mb-4">From Spiraling to Aspiring</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                That's not just a tagline. It's the journey I went through. 
                It's the proof that this works. And now it's available to anyone 
                who needs it.
              </p>
              <p className="text-foreground font-medium">
                If you're spiraling right now, I see you. I was you. 
                Let's find your breakthrough together.
              </p>
            </section>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link to="/app">
              <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                Start Your Breakthrough
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground/60 mt-4">
              Free: 5 breakthroughs/day • No credit card required
            </p>
          </div>

          {/* Signature */}
          <footer className="mt-16 pt-8 border-t border-border/20 text-center">
            <p className="text-muted-foreground">
              JR
              <br />
              <span className="text-sm">Founder & CEO, ASPIRAL</span>
              <br />
              <span className="text-sm text-muted-foreground/60">Edmonton, AB</span>
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
};

export default Story;
