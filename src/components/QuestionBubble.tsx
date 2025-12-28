import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionBubbleProps {
  question: string;
  isVisible: boolean;
  onAnswer?: () => void;
  questionNumber?: number;
  totalQuestions?: number;
}

export function QuestionBubble({
  question,
  isVisible,
  onAnswer,
  questionNumber = 1,
  totalQuestions = 3,
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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-lg w-full px-4">
      <div
        className={cn(
          "glass-card p-6",
          "shadow-glow",
          "animate-in fade-in-0 slide-in-from-bottom-6 duration-700"
        )}
      >
        {/* Ambient glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/15 to-accent/20 blur-2xl -z-10 opacity-60" />

        {/* Header with Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-secondary" />
              <div className="absolute inset-0 text-secondary blur-sm opacity-50">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs font-medium text-secondary uppercase tracking-widest">
              Discovery Question
            </span>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i < questionNumber
                      ? "bg-accent scale-110"
                      : i === questionNumber
                      ? "bg-secondary animate-pulse"
                      : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-1">
              {questionNumber} of {totalQuestions}
            </span>
          </div>
        </div>

        {/* Question text with typewriter - using warm conversational font */}
        <p className="font-question text-xl text-foreground leading-relaxed tracking-tight">
          {displayedText}
          {isTyping && (
            <span className="inline-block w-0.5 h-6 bg-secondary ml-1 animate-pulse rounded-full" />
          )}
        </p>

        {/* Action hint */}
        {!isTyping && onAnswer && (
          <p className="mt-5 text-sm text-muted-foreground animate-in fade-in-0 duration-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Answer with your voice or type below
          </p>
        )}
      </div>
    </div>
  );
}
