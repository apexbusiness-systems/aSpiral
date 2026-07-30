import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useStreak } from '@/hooks/useStreak';
import { useSessionStore } from '@/stores/sessionStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AppPageLayout } from '@/components/layout/AppPageLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Clock, 
  Trash2, 
  Play, 
  Sparkles,
  Loader2,
  Calendar,
  Target,
  MessageSquare,
  Download,
  FileText,
  Layers,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

interface SessionListItem {
  id: string;
  user_id: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  entityCount?: number;
  hasBreakthrough?: boolean;
}

const logger = createLogger('SessionsPage');

const Sessions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadSessions, loadSession, deleteSession, isLoading } = useSessionPersistence();
  const { reset: resetStore } = useSessionStore();
  const { toast } = useToast();
  
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { streakDays } = useStreak(user?.id);
  // Load sessions with entity counts and breakthrough data
  const loadSessionsWithMetadata = useCallback(async () => {
    if (!user) return;
    
    const rawSessions = await loadSessions();
    if (!rawSessions.length) {
      setSessions([]);
      return;
    }

    const db = supabase as any;
    const sessionIds = rawSessions.map(s => s.id);

    // Load entity counts and breakthrough flags in parallel
    const [entityResult, breakthroughResult] = await Promise.all([
      db.from('session_entities').select('session_id').in('session_id', sessionIds),
      db.from('breakthroughs').select('session_id').in('session_id', sessionIds),
    ]);

    // Count entities per session
    const entityCounts: Record<string, number> = {};
    (entityResult.data || []).forEach((e: any) => {
      entityCounts[e.session_id] = (entityCounts[e.session_id] || 0) + 1;
    });

    // Track which sessions have breakthroughs
    const breakthroughSessions = new Set(
      (breakthroughResult.data || []).map((b: any) => b.session_id)
    );

    const enriched: SessionListItem[] = rawSessions.map(s => ({
      ...s,
      entityCount: entityCounts[s.id] || (s.metadata as any)?.entityCount || 0,
      hasBreakthrough: breakthroughSessions.has(s.id) || s.status === 'breakthrough',
    }));

    setSessions(enriched);
  }, [user, loadSessions]);

  useEffect(() => {
    loadSessionsWithMetadata();
  }, [loadSessionsWithMetadata]);

  const handleResumeSession = async (sessionId: string) => {
    const session = await loadSession(sessionId);
    if (session) {
      useSessionStore.setState({
        currentSession: session,
        messages: [],
      });
      navigate('/app');
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    try {
      await deleteSession(deleteTarget);
      setSessions(prev => prev.filter(s => s.id !== deleteTarget));
      toast({ title: 'Session deleted', description: 'Session and related data removed.' });
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleNewSession = () => {
    resetStore();
    navigate('/app');
  };

  const handleExportPDF = async (sessionId: string) => {
    setIsExporting(sessionId);
    try {
      const session = await loadSession(sessionId);
      if (session) {
        const { exportSessionToPDF } = await import("@/lib/pdfExport");
        await exportSessionToPDF({
          session,
          messages: [],
          breakthroughs: [],
        });
        toast({ title: 'PDF exported', description: 'Your session has been exported.' });
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCSV = async (sessionId: string) => {
    setIsExporting(sessionId);
    try {
      const session = await loadSession(sessionId);
      if (session) {
        const { exportSessionToCSV } = await import("@/lib/pdfExport");
        exportSessionToCSV({
          session,
          messages: [],
          breakthroughs: [],
        });
        toast({ title: 'CSV exported', description: 'Your session has been exported.' });
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const getStatusColor = (status: string, hasBreakthrough?: boolean) => {
    if (hasBreakthrough) return 'text-accent bg-accent/20';
    switch (status) {
      case 'breakthrough':
        return 'text-accent bg-accent/20';
      case 'active':
        return 'text-secondary bg-secondary/20';
      case 'friction':
        return 'text-primary bg-primary/20';
      case 'completed':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: string, hasBreakthrough?: boolean) => {
    if (hasBreakthrough) return <Sparkles className="w-3 h-3" />;
    switch (status) {
      case 'breakthrough':
        return <Sparkles className="w-3 h-3" />;
      case 'active':
        return <Play className="w-3 h-3" />;
      case 'friction':
        return <Target className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusLabel = (status: string, hasBreakthrough?: boolean) => {
    if (hasBreakthrough) return 'Breakthrough ✨';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <AppPageLayout
      title="Session History"
      subtitle="Your exploration journey"
      streakDays={streakDays}
      headerActions={
        <>
          <Button variant="outline" onClick={() => navigate('/breakthroughs')} className="rounded-xl">
            <Sparkles className="w-4 h-4 mr-2" />
            Breakthroughs
          </Button>
          <Button onClick={handleNewSession} className="rounded-xl">
            <Sparkles className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </>
      }
    >
        {/* Sessions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              No sessions yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Start your first session to begin exploring
            </p>
            <Button onClick={handleNewSession}>
              <Sparkles className="w-4 h-4 mr-2" />
              Start First Session
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="glass-card p-4 hover:bg-glass-hover transition-colors cursor-pointer group"
                  onClick={() => handleResumeSession(session.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status Badge + Entity Count */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status, session.hasBreakthrough)}`}>
                          {getStatusIcon(session.status, session.hasBreakthrough)}
                          {getStatusLabel(session.status, session.hasBreakthrough)}
                        </span>
                        {(session.entityCount ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-muted-foreground bg-muted">
                            <Layers className="w-3 h-3" />
                            {session.entityCount} entities
                          </span>
                        )}
                      </div>

                      {/* Session Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(session.created_at), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div 
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={(e) => e.stopPropagation()}
                      role="presentation"
                      onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResumeSession(session.id)}
                        className="rounded-lg"
                      >
                        <Play className="w-4 h-4 mr-1.5" />
                        Resume
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExportPDF(session.id)}
                        disabled={isExporting === session.id}
                        className="rounded-lg text-muted-foreground hover:text-primary"
                        title="Export as PDF"
                      >
                        {isExporting === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExportCSV(session.id)}
                        disabled={isExporting === session.id}
                        className="rounded-lg text-muted-foreground hover:text-secondary"
                        title="Export as CSV"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(session.id)}
                        className="rounded-lg text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session, all entities, connections, and breakthroughs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPageLayout>
  );
};

export default Sessions;
