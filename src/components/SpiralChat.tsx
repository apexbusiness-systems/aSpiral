import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Maximize2, Minimize2, Sparkles, Cog, Droplets, Zap, SkipForward, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/ChatMessage";
import { MicButton } from "@/components/MicButton";
import { LiveTranscript } from "@/components/LiveTranscript";
import { QuestionBubble } from "@/components/QuestionBubble";
import { SpiralScene } from "@/components/3d/SpiralScene";
import { EnhancedSpiralScene } from "@/components/3d/EnhancedSpiralScene";
import { isRendererV2Enabled } from "@/lib/rendererFlags";
import { BreakthroughCard } from "@/components/BreakthroughCard";
import { UltraFastToggle } from "@/components/UltraFastToggle";
import { LoadingState } from "@/components/LoadingState";
import { FloatingMenuButton, MainMenu, QuickActionsBar, SettingsPanel, KeyboardShortcutsModal } from "@/components/menu";
import { CinematicPlayer } from "@/components/cinematics/CinematicPlayer";
import { FilmGrainCSS } from "@/components/effects/FilmGrainOverlay";
import { EntityCardList } from "@/components/EntityCard";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpiralAI } from "@/hooks/useSpiralAI";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSessionStore } from "@/stores/sessionStore";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyboardShortcuts, ASPIRAL_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import type { EntityType, Entity } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { OmniLinkAdapter } from "@/integrations/omnilink";
import { createUpdateGuard } from "@/lib/updateGuard";
import { addBreadcrumb } from "@/lib/debugOverlay";
import { useRenderStormDetector } from "@/hooks/useRenderStormDetector";

export interface SpiralChatHandle {
  toggleRecording: () => void;
  openSettings: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SpiralChatProps {}

export const SpiralChat = forwardRef<SpiralChatHandle, SpiralChatProps>((_, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [is3DExpanded, setIs3DExpanded] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  // CRITICAL FIX: Ref to track last spoken question to prevent TTS loops
  const lastSpokenQuestionRef = useRef<string | null>(null);
  const { toast } = useToast();

  useRenderStormDetector('SpiralChat');

  // Session persistence
  const { 
    save: saveSession, 
    saveBreakthrough,
    isSaving, 
    lastSaved 
  } = useSessionPersistence();

  // Analytics tracking
  const { 
    trackFeature, 
    trackEntity, 
    trackBreakthrough: trackBreakthroughEvent 
  } = useAnalytics();

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
    dismissQuestion,
    skipToBreakthrough,
    dismissBreakthroughCard,
    toggleUltraFastMode,
    resetSession,
    showCinematic,
    cinematicComplete,
    handleCinematicComplete,
    setShowCinematic,
    setCinematicComplete,
    flushTranscript,
  } = useSpiralAI({
    onEntitiesExtracted: (entities) => {
      // Track each entity creation
      entities.forEach((entity, index) => {
        trackEntity(
          `entity_${Date.now()}_${index}`,
          entity.type,
          currentSession?.entities.length || 0 + index + 1,
          'ai_extracted'
        );
      });
      
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
      // Track breakthrough event
      if (data) {
        trackBreakthroughEvent(
          data.friction,
          data.grease,
          data.insight,
          questionCount,
          ultraFastMode
        );
      }
      
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
  const liveTranscriptGuard = useMemo(
    () => createUpdateGuard({ name: "SpiralChat.setLiveTranscript" }),
    []
  );
  const [ttsEnabled, setTtsEnabled] = useState(true); // User can toggle TTS

  // Text-to-Speech for AI responses
  const { 
    speak: speakText, 
    stop: stopSpeaking, 
    isSpeaking: isTTSSpeaking,
    isLoading: isTTSLoading,
  } = useTextToSpeech({
    voice: 'nova', // Warm, friendly voice
    speed: 1.0,
    fallbackToWebSpeech: true,
    onError: (error) => {
      console.warn('[TTS] Error:', error.message);
    },
  });

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

  // CRITICAL FIX: Prevent TTS loop by tracking last spoken question
  // Only speak if the question has actually CHANGED since the last time we spoke
  useEffect(() => {
    if (
      currentQuestion && 
      ttsEnabled && 
      !isTTSSpeaking && 
      !isTTSLoading &&
      currentQuestion !== lastSpokenQuestionRef.current
    ) {
      lastSpokenQuestionRef.current = currentQuestion;
      speakText(currentQuestion);
    }
  }, [currentQuestion, ttsEnabled, isTTSSpeaking, isTTSLoading, speakText]);

  // Reset tracking when question is dismissed or cleared
  useEffect(() => {
    if (!currentQuestion) {
      lastSpokenQuestionRef.current = null;
    }
  }, [currentQuestion]);

  // Update live transcript display
  useEffect(() => {
    liveTranscriptGuard();
    setLiveTranscript(transcript);
  }, [transcript, liveTranscriptGuard]);

  // Initialize session on mount with user ID if authenticated
  useEffect(() => {
    if (!currentSession) {
      const userId = user?.id || "anonymous";
      const session = createSession(userId);
      OmniLinkAdapter.publishSessionStarted(session.id, session.userId);
    }
  }, [currentSession, createSession, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // When recording stops, send buffer
  useEffect(() => {
    if (!isRecording && !isRecordingPaused && liveTranscript) {
      flushTranscript(liveTranscript);
      setLiveTranscript("");
    }
  }, [isRecording, isRecordingPaused, liveTranscript, flushTranscript]);

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

  const handleMicToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      trackFeature('voice_input');
      dismissQuestion();
      toggleRecording();
    }
  }, [isRecording, stopRecording, trackFeature, dismissQuestion, toggleRecording]);

  useImperativeHandle(ref, () => ({
    toggleRecording: handleMicToggle,
    openSettings: () => {
      trackFeature('settings_opened');
      addBreadcrumb({ type: 'settings', message: 'open' });
      setIsSettingsOpen(true);
    },
  }), [handleMicToggle, trackFeature]);

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

    // Reset cinematic state
    setShowCinematic(false);
    setCinematicComplete(false);
  }, [resetSession, dismissBreakthroughCard, isRecording, stopRecording]);

  // Wrapped handlers with analytics
  const handleSkipToBreakthrough = useCallback(() => {
    trackFeature('skip_to_breakthrough');
    skipToBreakthrough();
  }, [skipToBreakthrough, trackFeature]);

  const handleToggleUltraFast = useCallback((enabled: boolean) => {
    trackFeature('ultra_fast_mode', { enabled });
    toggleUltraFastMode(enabled);
  }, [toggleUltraFastMode, trackFeature]);

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

  const handleSave = useCallback(async () => {
    trackFeature('session_saved');
    await saveSession();
    toast({ 
      title: "Progress Saved", 
      description: isSaving ? "Saving..." : "Your session has been saved." 
    });
  }, [saveSession, isSaving, toast, trackFeature]);

  const handleExport = useCallback(() => {
    if (breakthroughData) {
      trackFeature('session_exported');
      const content = `# ASPIRAL Breakthrough\n\n## Friction\n${breakthroughData.friction}\n\n## Grease\n${breakthroughData.grease}\n\n## Insight\n${breakthroughData.insight}`;
      navigator.clipboard.writeText(content);
      toast({ title: "Exported", description: "Breakthrough copied to clipboard!" });
    }
  }, [breakthroughData, toast, trackFeature]);

  const handleViewHistory = useCallback(() => {
    navigate('/sessions');
  }, [navigate]);

  const handleSettings = useCallback(() => {
    trackFeature('settings_opened');
    addBreadcrumb({ type: 'settings', message: 'open' });
    setIsSettingsOpen(true);
  }, [trackFeature]);

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
    { ...ASPIRAL_SHORTCUTS.skipBreakthrough, action: handleSkipToBreakthrough, enabled: sessionState === "active" },
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
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();

  const handleEntityClick = useCallback((entity: Entity) => {
    setSelectedEntityId((prev) => prev === entity.id ? undefined : entity.id);
  }, []);

  const hasActiveHeader = sessionState !== "idle";

  return (
    <LayoutGroup>
    <div className={cn("flex flex-col lg:flex-row relative", hasActiveHeader ? "h-[calc(100vh-73px-52px)] mt-[52px]" : "h-[calc(100vh-73px)]")}>
      {/* Phase 4: Film Grain Overlay for Cinematic Polish */}
      <FilmGrainCSS intensity={0.08} />
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
        onSkipToBreakthrough={handleSkipToBreakthrough}
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
        onSkip={handleSkipToBreakthrough}
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

      {/* Cinematic Player - plays before breakthrough card shows */}
      {showCinematic && !cinematicComplete && (
        <CinematicPlayer
          variant={undefined} // Random variant selection
          onComplete={handleCinematicComplete}
          onSkip={handleCinematicComplete}
          allowSkip={true}
          autoPlay={true}
          enableAnalytics={true}
          className="z-[200]"
        />
      )}

      {/* Breakthrough Overlay Card */}
      <BreakthroughCard
        data={breakthroughData}
        isVisible={showBreakthroughCard && cinematicComplete}
        onDismiss={() => {
          dismissBreakthroughCard();
          setShowCinematic(false);
          setCinematicComplete(false);
        }}
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
        {isRendererV2Enabled() ? <EnhancedSpiralScene /> : <SpiralScene />}
        
        {/* Question Bubble - positioned in 3D area */}
        <QuestionBubble
          question={currentQuestion || ""}
          isVisible={!!currentQuestion && !isRecording}
          onAnswer={() => dismissQuestion()}
          questionNumber={questionCount + 1}
          totalQuestions={maxQuestions}
        />
        
        {/* Skip to Breakthrough Button - shows when there's a question */}
        {currentQuestion && !isRecording && currentStage !== "breakthrough" && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipToBreakthrough}
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
            onToggle={handleToggleUltraFast}
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
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-background/50 backdrop-blur-md">
        {/* Chat Header */}
        {hasActiveHeader && (
          <div className="border-b border-border/30 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Session in progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTtsEnabled(!ttsEnabled);
                }}
                className="text-xs"
              >
                {ttsEnabled ? (
                  <Volume2 className="h-4 w-4 mr-1" />
                ) : (
                  <VolumeX className="h-4 w-4 mr-1" />
                )}
                {ttsEnabled ? 'TTS On' : 'TTS Off'}
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>

        {/* Live Transcript */}
        {isRecording && (
          <LiveTranscript transcript={liveTranscript} isRecording={isRecording} />
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border/30">
          <div className="flex gap-2 items-center">
            <MicButton
              isRecording={isRecording}
              isPaused={isRecordingPaused}
              isProcessing={isAIProcessing}
              isSupported={isSupported}
              onClick={handleMicToggle}
              onPause={isRecording ? toggleRecordingPause : undefined}
              onStop={isRecording ? stopRecording : undefined}
            />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your thoughts..."
              className="flex-1"
              disabled={isAIProcessing}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isAIProcessing}
              className="bg-primary text-primary-foreground"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Entity Cards */}
        {currentSession?.entities?.length ? (
          <EntityCardList
            entities={currentSession.entities}
            selectedEntityId={selectedEntityId}
            onEntityClick={handleEntityClick}
          />
        ) : null}
      </div>
    </div>
    </LayoutGroup>
  );
});

SpiralChat.displayName = "SpiralChat";
