import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionBubbleProps {
  question: string;
  isVisible: boolean;
  onAnswer?: () => void;
}

export function QuestionBubble({
  question,
  isVisible,
  onAnswer,
}: QuestionBubbleProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!question || !isVisible) {
      setDisplayedText("");
      return;
    }

    setIsTyping(true);
    setDisplayedText("");
    let index = 0;

    const interval = setInterval(() => {
      if (index < question.length) {
        setDisplayedText(question.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 30); // Speed of typewriter

    return () => clearInterval(interval);
  }, [question, isVisible]);

  if (!isVisible || !question) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-md w-full px-4">
      <div
        className={cn(
          "relative bg-card/95 backdrop-blur-md border border-primary/30 rounded-2xl p-5",
          "shadow-lg shadow-primary/20",
          "animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        )}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 blur-xl -z-10" />

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            Discovery Question
          </span>
        </div>

        {/* Question text with typewriter */}
        <p className="text-lg font-medium text-foreground leading-relaxed">
          {displayedText}
          {isTyping && (
            <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse" />
          )}
        </p>

        {/* Action hint */}
        {!isTyping && onAnswer && (
          <p className="mt-4 text-xs text-muted-foreground animate-in fade-in-0 duration-300">
            💬 Answer with your voice or type below
          </p>
        )}
      </div>
    </div>
  );
}
