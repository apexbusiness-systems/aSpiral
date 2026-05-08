import { useEffect, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveTranscriptProps {
  transcript: string;
  isRecording: boolean;
  isProcessing: boolean;
}

export function LiveTranscript({
  transcript,
  isRecording,
  isProcessing,
}: LiveTranscriptProps) {
  const [dots, setDots] = useState("");

  // Animated dots while recording
  useEffect(() => {
    if (!isRecording) {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isRecording && !transcript) return null;

  return (
    <div className="border-t border-border/30 glass-card rounded-none border-x-0 border-b-0 px-4 py-4">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-4">
          {/* Recording indicator */}
          <div
            className={cn(
              "flex-shrink-0 mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300",
              isRecording
                ? "bg-destructive/20 text-destructive shadow-lg shadow-destructive/20"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </div>

          {/* Transcript text */}
          <div className="flex-1 min-h-[2.5rem] py-1">
            {isRecording && (
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Listening{dots}
              </p>
            )}
            <p
              className={cn(
                "text-fluid-base leading-relaxed",
                transcript ? "text-foreground" : "text-muted-foreground/60 italic"
              )}
            >
              {transcript || "Start speaking..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
