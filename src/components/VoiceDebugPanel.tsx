/**
 * Voice Debug Panel
 * 
 * Minimal on-screen debug overlay to verify STT fixes.
 * Shows real-time voice pipeline events for debugging.
 * 
 * Toggle with ?voiceDebug=1 in URL or by pressing Ctrl+Shift+V
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  subscribeToVoiceDebug, 
  clearVoiceDebugBuffer 
} from "@/hooks/useVoiceInput";

interface DebugEvent {
  type: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export function VoiceDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState<DebugEvent[]>([]);

  // Check URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('voiceDebug') === '1') {
      setIsVisible(true);
    }
  }, []);

  // Keyboard shortcut: Ctrl+Shift+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to voice debug events
  useEffect(() => {
    if (!isVisible) return;
    
    const unsubscribe = subscribeToVoiceDebug((newEvents) => {
      setEvents([...newEvents]);
    });
    return () => { unsubscribe(); };
  }, [isVisible]);

  const handleClear = useCallback(() => {
    clearVoiceDebugBuffer();
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  const getEventColor = (type: string) => {
    if (type.includes('start')) return 'text-green-400';
    if (type.includes('stop')) return 'text-red-400';
    if (type.includes('final')) return 'text-blue-400';
    if (type.includes('partial')) return 'text-yellow-400';
    if (type.includes('error')) return 'text-red-500';
    if (type.includes('attach')) return 'text-purple-400';
    if (type.includes('detach')) return 'text-orange-400';
    return 'text-gray-400';
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-[9999] font-mono text-xs"
      >
        {!isExpanded ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="bg-black/90 border-green-500/50 text-green-400 hover:bg-black hover:text-green-300"
          >
            <Bug className="h-4 w-4 mr-1" />
            Voice Debug ({events.length})
          </Button>
        ) : (
          <div className="w-96 max-h-80 bg-black/95 border border-green-500/50 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-green-500/30 bg-green-500/10">
              <span className="text-green-400 font-semibold flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Voice Pipeline Debug
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClear}
                  className="h-6 w-6 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Event Log */}
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {events.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No events yet. Start recording to see events.
                </div>
              ) : (
                events.slice().reverse().map((event, i) => (
                  <div 
                    key={`${event.timestamp}-${i}`}
                    className="flex gap-2 text-[10px] leading-tight"
                  >
                    <span className="text-gray-600 shrink-0">
                      {formatTime(event.timestamp)}
                    </span>
                    <span className={`${getEventColor(event.type)} shrink-0`}>
                      {event.type}
                    </span>
                    {event.data && (
                      <span className="text-gray-400 truncate">
                        {JSON.stringify(event.data)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Stats Footer */}
            <div className="px-3 py-1.5 border-t border-green-500/30 bg-green-500/5 text-[10px] text-gray-500">
              Press Ctrl+Shift+V to toggle • {events.length} events buffered
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
