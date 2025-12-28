import { useRef, useEffect, useState } from "react";
import { Send, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/ChatMessage";
import { MicButton } from "@/components/MicButton";
import { SpiralScene } from "@/components/3d/SpiralScene";
import { useChat } from "@/hooks/useChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSessionStore } from "@/stores/sessionStore";
import type { EntityType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { OmniLinkAdapter } from "@/integrations/omnilink";

export function SpiralChat() {
  const [input, setInput] = useState("");
  const [is3DExpanded, setIs3DExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { createSession, currentSession, isProcessing, addEntity, addConnection } = useSessionStore();
  const { messages, sendMessage, isStreaming } = useChat({
    onError: (error) => {
      toast({
        title: "Connection Issue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { isRecording, isSupported, transcript, toggleRecording } = useVoiceInput({
    onTranscript: (text) => {
      if (text.trim()) {
        sendMessage(text);
      }
    },
  });

  // Initialize session on mount
  useEffect(() => {
    if (!currentSession) {
      const session = createSession("anonymous");
      
      // Publish to OMNiLiNK if enabled
      OmniLinkAdapter.publishSessionStarted(session.id, session.userId);
    }
  }, [currentSession, createSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      sendMessage(input);
      setInput("");
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

    // Add some connections after a brief delay to ensure entities exist
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

  return (
    <div className="flex h-[calc(100vh-73px)] flex-col lg:flex-row">
      {/* 3D Visualization Panel */}
      <div 
        className={`relative bg-background/50 border-b lg:border-b-0 lg:border-r border-border transition-all duration-300 ${
          is3DExpanded 
            ? "h-[60vh] lg:h-full lg:w-2/3" 
            : "h-48 lg:h-full lg:w-1/3"
        }`}
      >
        <SpiralScene />
        
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-background/50 backdrop-blur-sm"
          onClick={() => setIs3DExpanded(!is3DExpanded)}
        >
          {is3DExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
        
        {/* Entity Counter & Test Button */}
        <div className="absolute bottom-2 left-2 flex gap-2">
          {entityCount > 0 ? (
            <div className="rounded-md bg-background/80 backdrop-blur-sm px-3 py-1 text-xs text-muted-foreground">
              {entityCount} {entityCount === 1 ? "entity" : "entities"} discovered
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={addTestEntities}
              className="bg-background/80 backdrop-blur-sm text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Add Test Entities
            </Button>
          )}
        </div>
        
        {/* OMNiLiNK Status */}
        {OmniLinkAdapter.isEnabled() && (
          <div className="absolute bottom-2 right-2 rounded-md bg-emerald-500/20 backdrop-blur-sm px-2 py-1 text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
              <div className="py-12 text-center">
                <h2 className="text-2xl font-semibold text-gradient-spiral mb-2">
                  Welcome to aSpiral
                </h2>
                <p className="text-muted-foreground">
                  Share what's on your mind. I'll help you untangle it.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>

        {/* Voice Transcript Preview */}
        {isRecording && transcript && (
          <div className="border-t border-border bg-muted/50 px-4 py-2">
            <p className="text-sm text-muted-foreground animate-pulse">
              {transcript}...
            </p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border bg-card/50 p-4">
          <div className="mx-auto max-w-2xl">
            {/* Mic Button */}
            <div className="mb-4 flex justify-center">
              <MicButton
                isRecording={isRecording}
                isProcessing={isProcessing || isStreaming}
                isSupported={isSupported}
                onClick={toggleRecording}
              />
            </div>

            {/* Text Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Or type your thoughts here..."
                disabled={isProcessing || isRecording}
                className="bg-input"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="gradient-spiral"
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
