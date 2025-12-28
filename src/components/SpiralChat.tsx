import { useRef, useEffect, useState } from "react";
import { Send, Maximize2, Minimize2, Sparkles, Cog, Droplets, Zap, SkipForward } from "lucide-react";
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
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpiralAI } from "@/hooks/useSpiralAI";
import { useSessionStore } from "@/stores/sessionStore";
import type { EntityType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { OmniLinkAdapter } from "@/integrations/omnilink";

export function SpiralChat() {
  const [input, setInput] = useState("");
  const [is3DExpanded, setIs3DExpanded] = useState(true);
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

  const { isRecording, isSupported, transcript, toggleRecording, stopRecording } = useVoiceInput({
    onTranscript: (text) => {
      // Accumulate transcript for AI processing
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
    if (!isRecording && liveTranscript) {
      sendBuffer();
      setLiveTranscript("");
    }
  }, [isRecording, liveTranscript, sendBuffer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isAIProcessing) {
      // Add user message
      addMessage({
        role: "user",
        content: input.trim(),
      });
      
      // Process through AI
      processTranscript(input.trim());
      setInput("");
      dismissQuestion(); // Clear current question when user responds
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      dismissQuestion(); // Clear question when starting new input
      toggleRecording();
    }
  };

  const entityCount = currentSession?.entities?.length || 0;

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

  const handleNewSession = () => {
    resetSession();
    useSessionStore.getState().reset();
    dismissBreakthroughCard();
  };

  return (
    <div className="flex h-[calc(100vh-73px)] flex-col lg:flex-row">
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
            {/* Mic Button */}
            <div className="mb-5 flex justify-center">
              <MicButton
                isRecording={isRecording}
                isProcessing={isAIProcessing}
                isSupported={isSupported}
                onClick={handleMicToggle}
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
