import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Maximize2, Minimize2, Sparkles, Cog, Droplets, Zap, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/ChatMessage";
import { MicButton } from "@/components/MicButton";
import { LiveTranscript } from "@/components/LiveTranscript";
import { QuestionBubble } from "@/components/QuestionBubble";
import { SpiralScene } from "@/components/3d/SpiralScene";
import { BreakthroughCard } from "@/components/BreakthroughCard";
import { UltraFastToggle } from "@/components/UltraFastToggle";
import { LoadingState } from "@/components/LoadingState";
import { FloatingMenuButton, MainMenu, QuickActionsBar, SettingsPanel, KeyboardShortcutsModal } from "@/components/menu";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpiralAI } from "@/hooks/useSpiralAI";
import { useSessionStore } from "@/stores/sessionStore";
import { useKeyboardShortcuts, ASPIRAL_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import type { EntityType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { OmniLinkAdapter } from "@/integrations/omnilink";

export function SpiralChat() {
  const [input, setInput] = useState("");
  const [is3DExpanded, setIs3DExpanded] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    createSession, 
    currentSession, 
    messages, 
    addMessage, 
    addEntity, 
    addConnection,
    showFriction,
    applyGrease,
    triggerBreakthrough,
    activeFriction,
  } = useSessionStore();

  const {
    isProcessing: isAIProcessing,
    processingStage,
    currentQuestion,
    currentStage,
    questionCount,
    maxQuestions,
    breakthroughData,
    showBreakthroughCard,
    ultraFastMode,
    processTranscript,
    accumulateTranscript,
    sendBuffer,
    dismissQuestion,
    skipToBreakthrough,
    dismissBreakthroughCard,
    toggleUltraFastMode,
    resetSession,
  } = useSpiralAI({
    onEntitiesExtracted: (entities) => {
      toast({
        title: "Entities Discovered",
        description: `Found ${entities.length} new ${entities.length === 1 ? 'element' : 'elements'} in your story`,
      });
    },
    onQuestion: (question, stage) => {
      console.log(`[SpiralChat] Question (${stage}):`, question);
    },
    onPatternDetected: (patterns) => {
      if (patterns.length > 0 && patterns[0].confidence > 0.7) {
        toast({
          title: "Pattern Detected",
          description: `I see a "${patterns[0].name.replace(/-/g, ' ')}" pattern...`,
        });
      }
    },
    onBreakthrough: (data) => {
      toast({
        title: "✨ BREAKTHROUGH",
        description: data?.insight || "You've reached clarity!",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Issue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [liveTranscript, setLiveTranscript] = useState("");

  const { 
    isRecording, 
    isSupported, 
    isPaused: isRecordingPaused,
    transcript, 
    toggleRecording, 
    stopRecording,
    togglePause: toggleRecordingPause,
  } = useVoiceInput({
    onTranscript: (text) => {
      accumulateTranscript(text);
    },
  });

  // Update live transcript display
  useEffect(() => {
    setLiveTranscript(transcript);
  }, [transcript]);

  // Initialize session on mount
  useEffect(() => {
    if (!currentSession) {
      const session = createSession("anonymous");
      OmniLinkAdapter.publishSessionStarted(session.id, session.userId);
    }
  }, [currentSession, createSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // When recording stops, send buffer
  useEffect(() => {
    if (!isRecording && !isRecordingPaused && liveTranscript) {
      sendBuffer();
      setLiveTranscript("");
    }
  }, [isRecording, isRecordingPaused, liveTranscript, sendBuffer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isAIProcessing) {
      addMessage({
        role: "user",
        content: input.trim(),
      });
      processTranscript(input.trim());
      setInput("");
      dismissQuestion();
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      dismissQuestion();
      toggleRecording();
    }
  };


  const addTestEntities = () => {
    const testEntities: Array<{ type: EntityType; label: string }> = [
      { type: "problem", label: "Should I take the job offer?" },
      { type: "emotion", label: "Anxiety about change" },
      { type: "emotion", label: "Excitement for growth" },
      { type: "value", label: "Financial security" },
      { type: "value", label: "Work-life balance" },
      { type: "problem", label: "Moving to new city" },
      { type: "action", label: "Research the company" },
      { type: "friction", label: "Fear of leaving comfort zone" },
      { type: "grease", label: "Partner is supportive" },
    ];

    const createdEntities: string[] = [];
    
    testEntities.forEach((e) => {
      const entity = addEntity({ type: e.type, label: e.label });
      createdEntities.push(entity.id);
    });

    setTimeout(() => {
      if (createdEntities.length >= 4) {
        addConnection({ fromEntityId: createdEntities[0], toEntityId: createdEntities[1], type: "causes", strength: 0.8 });
        addConnection({ fromEntityId: createdEntities[0], toEntityId: createdEntities[2], type: "causes", strength: 0.6 });
        addConnection({ fromEntityId: createdEntities[3], toEntityId: createdEntities[0], type: "enables", strength: 0.7 });
        addConnection({ fromEntityId: createdEntities[7], toEntityId: createdEntities[0], type: "blocks", strength: 0.9 });
        addConnection({ fromEntityId: createdEntities[8], toEntityId: createdEntities[7], type: "resolves", strength: 0.85 });
      }
    }, 100);
  };

  // Demo: Trigger friction visualization
  const demoFriction = () => {
    showFriction(
      "Fear of losing control",
      "Need to talk to her",
      0.8,
      ["entity1", "entity2"]
    );
    toast({
      title: "Friction Detected",
      description: "Two values are grinding against each other...",
    });
  };

  // Demo: Apply grease (correct)
  const demoGreaseCorrect = () => {
    applyGrease(true);
    toast({
      title: "Grease Applied",
      description: "The right solution is smoothing things out...",
    });
  };

  // Demo: Trigger breakthrough
  const demoBreakthrough = () => {
    triggerBreakthrough();
    toast({
      title: "🎉 BREAKTHROUGH!",
      description: "You've found your answer!",
    });
  };

  const handleNewSession = useCallback(() => {
    resetSession();
    useSessionStore.getState().reset();
    dismissBreakthroughCard();
    setSessionElapsed(0);
    if (isRecording) {
      stopRecording();
    }
  }, [resetSession, dismissBreakthroughCard, isRecording, stopRecording]);

  // Session timer - pauses when recording is paused or during breakthrough
  useEffect(() => {
    if (currentSession && !isRecordingPaused && currentStage !== "breakthrough") {
      const interval = setInterval(() => {
        setSessionElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentSession, isRecordingPaused, currentStage]);

  // Derive session state for menu
  const sessionState = !currentSession
    ? "idle"
    : currentStage === "breakthrough" || showBreakthroughCard
    ? "breakthrough"
    : isRecordingPaused
    ? "paused"
    : "active";

  // Menu handlers - now tied to recording pause
  const handlePause = useCallback(() => {
    if (isRecording && !isRecordingPaused) {
      toggleRecordingPause();
    }
  }, [isRecording, isRecordingPaused, toggleRecordingPause]);
  
  const handleResume = useCallback(() => {
    if (isRecordingPaused) {
      toggleRecordingPause();
    }
  }, [isRecordingPaused, toggleRecordingPause]);
  
  const handleStop = useCallback(() => {
    handleNewSession();
    toast({ title: "Session Stopped", description: "Your session has been ended." });
  }, [handleNewSession, toast]);

  const handleSave = useCallback(() => {
    toast({ title: "Progress Saved", description: "Your session has been saved." });
  }, [toast]);

  const handleExport = useCallback(() => {
    if (breakthroughData) {
      const content = `# ASPIRAL Breakthrough\n\n## Friction\n${breakthroughData.friction}\n\n## Grease\n${breakthroughData.grease}\n\n## Insight\n${breakthroughData.insight}`;
      navigator.clipboard.writeText(content);
      toast({ title: "Exported", description: "Breakthrough copied to clipboard!" });
    }
  }, [breakthroughData, toast]);

  const handleViewHistory = useCallback(() => {
    toast({ title: "Coming Soon", description: "Session history will be available soon." });
  }, [toast]);

  const handleSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleHelp = useCallback(() => {
    toast({
      title: "How ASPIRAL Works",
      description: "Speak your thoughts, answer 2 questions, get your breakthrough insight.",
    });
  }, [toast]);

  const handleShowShortcuts = useCallback(() => {
    setIsShortcutsOpen(true);
  }, []);

  // Keyboard shortcuts
  const shortcuts = [
    { ...ASPIRAL_SHORTCUTS.toggleMenu, action: () => setIsMenuOpen((prev) => !prev), enabled: true },
    { ...ASPIRAL_SHORTCUTS.pauseResume, action: () => (isRecordingPaused ? handleResume() : handlePause()), enabled: sessionState === "active" || sessionState === "paused" },
    { ...ASPIRAL_SHORTCUTS.skipBreakthrough, action: skipToBreakthrough, enabled: sessionState === "active" },
    { ...ASPIRAL_SHORTCUTS.save, action: handleSave, enabled: sessionState !== "idle" },
    { ...ASPIRAL_SHORTCUTS.stop, action: handleStop, enabled: sessionState !== "idle" },
    { ...ASPIRAL_SHORTCUTS.restart, action: handleNewSession, enabled: sessionState !== "idle" },
    { ...ASPIRAL_SHORTCUTS.export, action: handleExport, enabled: sessionState === "breakthrough" },
    { ...ASPIRAL_SHORTCUTS.history, action: handleViewHistory, enabled: true },
    { ...ASPIRAL_SHORTCUTS.settings, action: handleSettings, enabled: true },
    { ...ASPIRAL_SHORTCUTS.help, action: handleShowShortcuts, enabled: true },
  ];

  useKeyboardShortcuts(shortcuts);

  const entityCount = currentSession?.entities?.length || 0;

  const hasActiveHeader = sessionState !== "idle";

  return (
    <div className={cn("flex flex-col lg:flex-row", hasActiveHeader ? "h-[calc(100vh-73px-52px)] mt-[52px]" : "h-[calc(100vh-73px)]")}>
      {/* Floating Menu Button */}
      <FloatingMenuButton
        sessionState={sessionState}
        onMenuOpen={() => setIsMenuOpen(true)}
      />

      {/* Main Menu Panel */}
      <MainMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        sessionState={sessionState}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onRestart={handleNewSession}
        onSkipToBreakthrough={skipToBreakthrough}
        onSave={handleSave}
        onExport={handleExport}
        onViewHistory={handleViewHistory}
        onSettings={handleSettings}
        onHelp={handleHelp}
        sessionProgress={
          sessionState !== "idle"
            ? {
                questionCount,
                entityCount,
                timeElapsed: sessionElapsed,
              }
            : undefined
        }
      />

      {/* Quick Actions Header Bar */}
      <QuickActionsBar
        sessionState={sessionState}
        questionCount={questionCount}
        maxQuestions={maxQuestions}
        timeElapsed={sessionElapsed}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onSkip={skipToBreakthrough}
        onSave={handleSave}
      />

      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Loading State Overlay */}
      <AnimatePresence>
        {processingStage && <LoadingState stage={processingStage} />}
      </AnimatePresence>

      {/* Breakthrough Overlay Card */}
      <BreakthroughCard
        data={breakthroughData}
        isVisible={showBreakthroughCard}
        onDismiss={dismissBreakthroughCard}
        onNewSession={handleNewSession}
      />

      {/* 3D Visualization Panel */}
      <div
        className={`relative border-b lg:border-b-0 lg:border-r border-border/30 transition-all duration-500 ${
          is3DExpanded 
            ? "h-[60vh] lg:h-full lg:w-2/3" 
            : "h-48 lg:h-full lg:w-1/3"
        }`}
      >
        <SpiralScene />
        
        {/* Question Bubble - positioned in 3D area */}
        <QuestionBubble
          question={currentQuestion || ""}
          isVisible={!!currentQuestion && !isRecording}
          onAnswer={() => dismissQuestion()}
        />
        
        {/* Skip to Breakthrough Button - shows when there's a question */}
        {currentQuestion && !isRecording && currentStage !== "breakthrough" && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipToBreakthrough}
              className="glass-card rounded-xl text-xs text-secondary hover:text-secondary hover:bg-secondary/10 animate-in fade-in-0 slide-in-from-bottom-2"
            >
              <SkipForward className="h-3 w-3 mr-1.5" />
              Skip to breakthrough ({questionCount + 1}/{maxQuestions})
            </Button>
          </div>
        )}
        
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 glass-card rounded-xl"
          onClick={() => setIs3DExpanded(!is3DExpanded)}
        >
          {is3DExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
        
        {/* Entity Counter & Demo Controls */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          {/* Ultra-fast mode toggle */}
          <UltraFastToggle
            isEnabled={ultraFastMode}
            onToggle={toggleUltraFastMode}
          />
          
          {entityCount > 0 ? (
            <div className="glass-card rounded-xl px-3 py-1.5 text-xs text-muted-foreground">
              {entityCount} {entityCount === 1 ? "entity" : "entities"}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={addTestEntities}
              className="glass-card rounded-xl text-xs hover:bg-glass-hover"
            >
              <Sparkles className="h-3 w-3 mr-1.5" />
              Add Entities
            </Button>
          )}
          
          {/* Demo buttons for friction/grease/breakthrough */}
          {!activeFriction ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={demoFriction}
              className="glass-card rounded-xl text-xs text-warning hover:text-warning"
            >
              <Cog className="h-3 w-3 mr-1.5" />
              Friction
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={demoGreaseCorrect}
                className="glass-card rounded-xl text-xs text-accent hover:text-accent"
              >
                <Droplets className="h-3 w-3 mr-1.5" />
                Grease
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={demoBreakthrough}
                className="glass-card rounded-xl text-xs text-secondary hover:text-secondary"
              >
                <Zap className="h-3 w-3 mr-1.5" />
                Breakthrough
              </Button>
            </>
          )}
        </div>
        
        {/* OMNiLiNK Status */}
        {OmniLinkAdapter.isEnabled() && (
          <div className="absolute bottom-3 right-3 glass-card rounded-xl px-3 py-1.5 text-xs text-accent flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            OMNiLiNK
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.length === 0 && (
              <div className="py-16 text-center">
                <h2 className="font-display text-fluid-2xl font-bold text-gradient-spiral mb-3">
                  Welcome to aSpiral
                </h2>
                <p className="text-muted-foreground text-fluid-base mb-6 max-w-md mx-auto">
                  Share what's on your mind. I'll help you untangle it.
                </p>
                <p className="text-sm text-muted-foreground/60 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Tap the mic and start speaking
                </p>
              </div>
            )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>

        {/* Live Transcript Preview */}
        <LiveTranscript
          transcript={liveTranscript}
          isRecording={isRecording}
          isProcessing={isAIProcessing}
        />

        {/* Input Area */}
        <div className="border-t border-border/30 glass-card rounded-none border-x-0 border-b-0 p-4">
          <div className="mx-auto max-w-2xl">
            {/* Mic Button with Stop/Pause controls */}
            <div className="mb-5 flex justify-center">
              <MicButton
                isRecording={isRecording}
                isProcessing={isAIProcessing}
                isSupported={isSupported}
                isPaused={isRecordingPaused}
                onClick={handleMicToggle}
                onPause={isRecording ? toggleRecordingPause : undefined}
                onStop={isRecording ? stopRecording : undefined}
              />
            </div>

            {/* Text Input */}
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Or type your thoughts here..."
                disabled={isAIProcessing || isRecording}
                className="bg-input/50 border-border/50 rounded-xl h-12 text-fluid-base placeholder:text-muted-foreground/50"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isAIProcessing}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 rounded-xl h-12 px-5"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
