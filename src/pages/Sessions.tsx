import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useSessionStore } from '@/stores/sessionStore';
import { Button } from '@/components/ui/button';
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
  ArrowLeft, 
  Clock, 
  Trash2, 
  Play, 
  Sparkles,
  Loader2,
  Calendar,
  Target,
  MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface SessionListItem {
  id: string;
  user_id: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

const Sessions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadSessions, loadSession, deleteSession, isLoading } = useSessionPersistence();
  const { reset: resetStore } = useSessionStore();
  
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    if (user) {
      loadSessions().then(setSessions);
    }
  }, [user, loadSessions]);

  const handleResumeSession = async (sessionId: string) => {
    const session = await loadSession(sessionId);
    if (session) {
      // Load session into store
      useSessionStore.setState({
        currentSession: session,
        messages: [], // Messages are loaded separately
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
    } catch (error) {
      console.error('Failed to delete session:', error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleNewSession = () => {
    resetStore();
    navigate('/app');
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
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

  return (
    <div className="app-container min-h-screen">
      {/* Ambient background */}
      <div className="ambient-orb w-96 h-96 bg-primary/30 top-0 left-0" />
      <div className="ambient-orb w-80 h-80 bg-secondary/20 bottom-20 right-10" style={{ animationDelay: '-5s' }} />
      
      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {t('sessions.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('sessions.subtitle')}
              </p>
            </div>
          </div>
          <Button onClick={handleNewSession} className="rounded-xl">
            <Sparkles className="w-4 h-4 mr-2" />
            {t('sessions.newSession')}
          </Button>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              {t('sessions.empty')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('sessions.emptyDescription')}
            </p>
            <Button onClick={handleNewSession}>
              <Sparkles className="w-4 h-4 mr-2" />
              {t('sessions.newSession')}
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="glass-card p-4 hover:bg-glass-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {getStatusIcon(session.status)}
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
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

                      {/* Session ID (truncated) */}
                      <p className="text-xs text-muted-foreground/60 mt-1 font-mono truncate">
                        ID: {session.id}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResumeSession(session.id)}
                        className="rounded-lg"
                      >
                        <Play className="w-4 h-4 mr-1.5" />
                        {t('sessions.resume')}
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
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('sessions.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sessions.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sessions;
