import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeOff } from "lucide-react";
import brandAnthemSrc from "@/assets/aSpiral_Brand_Anthem.mp3";

const MUTE_KEY = "brand-anthem-muted";

/**
 * Persistent play/pause FAB for the aSpiral Brand Anthem.
 * Autoplays on landing (after first user gesture if browser blocks autoplay).
 * Renders as a fixed button in the bottom-right corner.
 */
const BrandAnthemPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Check if user previously muted
  const wasMuted = useRef(localStorage.getItem(MUTE_KEY) === "true");

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio(brandAnthemSrc);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = "auto";
    audioRef.current = audio;

    // Sync state on play/pause events
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    // Attempt autoplay if user hasn't previously muted
    if (!wasMuted.current) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setHasInteracted(true);
          })
          .catch(() => {
            // Autoplay blocked — wait for user gesture
            setIsPlaying(false);
          });
      }
    }

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // First-gesture autoplay fallback: if autoplay was blocked and user hasn't muted,
  // start playing on first interaction with the page
  useEffect(() => {
    if (hasInteracted || wasMuted.current) return;

    const startOnGesture = () => {
      const audio = audioRef.current;
      if (audio && audio.paused) {
        audio.play().catch(() => { /* still blocked, ignore */ });
      }
      setHasInteracted(true);
      cleanup();
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown"];
    events.forEach((e) => window.addEventListener(e, startOnGesture, { once: true, passive: true }));

    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, startOnGesture));
    };

    return cleanup;
  }, [hasInteracted]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => { /* ignore */ });
      localStorage.removeItem(MUTE_KEY);
      wasMuted.current = false;
    } else {
      audio.pause();
      localStorage.setItem(MUTE_KEY, "true");
      wasMuted.current = true;
    }
    setHasInteracted(true);
  }, []);

  return (
    <button
      id="brand-anthem-toggle"
      type="button"
      onClick={togglePlayback}
      aria-label={isPlaying ? "Pause brand anthem" : "Play brand anthem"}
      className={`
        fixed bottom-20 right-4 z-40
        w-12 h-12 rounded-full
        flex items-center justify-center
        bg-black/70 backdrop-blur-md
        border border-white/20
        text-white
        shadow-lg
        transition-all duration-300
        hover:scale-110 hover:bg-black/80 hover:border-white/30
        active:scale-95
        cursor-pointer
        ${isPlaying ? "shadow-primary/40 border-primary/40" : ""}
      `}
    >
      {/* Pulse ring when playing */}
      {isPlaying && (
        <span
          className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping"
          style={{ animationDuration: "2s" }}
        />
      )}
      {isPlaying ? (
        <Volume2 className="h-5 w-5 relative z-10" />
      ) : (
        <VolumeOff className="h-5 w-5 relative z-10 opacity-70" />
      )}
    </button>
  );
};

export default BrandAnthemPlayer;
