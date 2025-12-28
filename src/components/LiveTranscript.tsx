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
    <div className="border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-3">
          {/* Recording indicator */}
          <div
            className={cn(
              "flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center",
              isRecording
                ? "bg-destructive/20 text-destructive"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </div>

          {/* Transcript text */}
          <div className="flex-1 min-h-[2rem]">
            {isRecording && (
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Listening{dots}
              </p>
            )}
            <p
              className={cn(
                "text-sm leading-relaxed",
                transcript ? "text-foreground" : "text-muted-foreground italic"
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
