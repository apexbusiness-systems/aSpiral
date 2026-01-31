import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { normalizeError, type NormalizedError } from '@/lib/normalizeError';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { DailyStats, UsageStats, EntityTypeData } from '@/types/dashboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { EntityPieChart } from '@/components/dashboard/EntityPieChart';

interface SessionData {
  id: string;
  created_at: string;
  user_id: string;
}

interface BreakthroughData {
  id: string;
  created_at: string;
  session_id: string;
}

interface EntityData {
  id: string;
  type: string;
  created_at: string;
  session_id: string;
}

interface MessageData {
  id: string;
  session_id: string;
}

const EMPTY_USAGE_STATS: UsageStats = {
  totalSessions: 0,
  totalBreakthroughs: 0,
  totalEntities: 0,
  totalMessages: 0,
  activeUsers: 1,
};

const AdminDashboard = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats>(EMPTY_USAGE_STATS);
  const [entityTypes, setEntityTypes] = useState<EntityTypeData[]>([]);

  const loadStats = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsRetrying(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Use unknown casting to bypass potential missing table types in generated client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      // Get sessions
      const { data: sessionsData, error: sessionsError } = await db
        .from('sessions')
        .select('id, created_at, user_id')
        .eq('user_id', user!.id);

      // Handle sessions error - but empty is OK
      if (sessionsError) {
        const normalized = normalizeError(sessionsError);
        // Empty is success, not error
        if (normalized.kind !== 'empty') {
          throw sessionsError;
        }
      }

      const sessions = (sessionsData || []) as SessionData[];
      const sessionIds = sessions.map((s) => s.id);

      // Get other stats - use Promise.allSettled for partial rendering
      const [breakthroughsRes, entitiesRes, messagesRes] = await Promise.allSettled([
        db.from('breakthroughs').select('id, created_at, session_id'),
        db.from('entities').select('id, type, created_at, session_id'),
        db.from('messages').select('id, session_id'),
      ]);

      // Extract data, treating errors as empty arrays (partial rendering)
      const breakthroughsData = breakthroughsRes.status === 'fulfilled'
        ? (breakthroughsRes.value.data || []) as BreakthroughData[]
        : [];
      const entitiesData = entitiesRes.status === 'fulfilled'
        ? (entitiesRes.value.data || []) as EntityData[]
        : [];
      const messagesData = messagesRes.status === 'fulfilled'
        ? (messagesRes.value.data || []) as MessageData[]
        : [];

      // Filter to user's sessions
      const userBreakthroughs = breakthroughsData.filter((b) => sessionIds.includes(b.session_id));
      const userEntities = entitiesData.filter((e) => sessionIds.includes(e.session_id));
      const userMessages = messagesData.filter((m) => sessionIds.includes(m.session_id));

      // Calculate usage stats - zeros are valid for first-run
      setUsageStats({
        totalSessions: sessions.length,
        totalBreakthroughs: userBreakthroughs.length,
        totalEntities: userEntities.length,
        totalMessages: userMessages.length,
        activeUsers: 1, // Current user's dashboard
      });

      // Calculate entity types
      const typeCounts: Record<string, number> = {};
      userEntities.forEach((e) => {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      });
      setEntityTypes(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));

      // Calculate daily stats for last 7 days - zeros are fine
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = startOfDay(subDays(new Date(), 6 - i));
        return {
          date: format(date, 'MMM d'),
          dateObj: date,
          sessions: 0,
          breakthroughs: 0,
          entities: 0,
        };
      });

      sessions.forEach((s) => {
        const sessionDate = startOfDay(new Date(s.created_at));
        const dayEntry = last7Days.find(d => d.dateObj.getTime() === sessionDate.getTime());
        if (dayEntry) dayEntry.sessions++;
      });

      userBreakthroughs.forEach((b) => {
        const bDate = startOfDay(new Date(b.created_at));
        const dayEntry = last7Days.find(d => d.dateObj.getTime() === bDate.getTime());
        if (dayEntry) dayEntry.breakthroughs++;
      });

      userEntities.forEach((e) => {
        const eDate = startOfDay(new Date(e.created_at));
        const dayEntry = last7Days.find(d => d.dateObj.getTime() === eDate.getTime());
        if (dayEntry) dayEntry.entities++;
      });

      setDailyStats(last7Days.map(({ date, sessions, breakthroughs, entities }) => ({
        date,
        sessions,
        breakthroughs,
        entities,
      })));

      // Clear any previous error
      setError(null);

      // Check if any partial failures occurred (non-blocking warning)
      const partialFailures = [breakthroughsRes, entitiesRes, messagesRes]
        .filter(r => r.status === 'rejected');

      if (partialFailures.length > 0 && partialFailures.length < 3) {
        // Some data loaded, some failed - show non-blocking warning
        console.warn('Dashboard partial load failures:', partialFailures);
        toast({
          title: 'Some data may be incomplete',
          description: 'Retry to refresh all stats',
          variant: 'default', // Not destructive - non-blocking
        });
      }

    } catch (err) {
      console.error('Error loading stats:', err);
      const normalized = normalizeError(err);

      // Only show error for real failures, not empty data
      if (!normalized.isNonError) {
        setError(normalized);
        toast({
          title: 'Error loading dashboard',
          description: normalized.message,
          variant: 'destructive',
        });
      }
      // Even on error, keep default zeros displayed
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, loadStats]);

  const handleRetry = () => {
    loadStats(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="app-container min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen">
      <div className="ambient-orb w-96 h-96 bg-primary/30 top-0 left-0" />
      <div className="ambient-orb w-80 h-80 bg-secondary/20 bottom-20 right-10" style={{ animationDelay: '-5s' }} />

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Your usage analytics and insights
            </p>
          </div>
          {/* Retry button - always visible for manual refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Banner - Only for real errors, not empty states */}
        {error && !error.isNonError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Error loading dashboard</p>
              <p className="text-sm text-destructive/80">{error.message}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Retry'
              )}
            </Button>
          </div>
        )}

        {/* Stats Grid - Always render, zeros are valid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Calendar}
            label="Sessions"
            value={usageStats.totalSessions}
            color="bg-primary/20 text-primary"
          />
          <StatCard
            icon={Sparkles}
            label="Breakthroughs"
            value={usageStats.totalBreakthroughs}
            color="bg-accent/20 text-accent"
          />
          <StatCard
            icon={TrendingUp}
            label="Entities"
            value={usageStats.totalEntities}
            color="bg-secondary/20 text-secondary"
          />
          <StatCard
            icon={MessageSquare}
            label="Messages"
            value={usageStats.totalMessages}
            color="bg-muted text-muted-foreground"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ActivityChart data={dailyStats} />
          <EntityPieChart data={entityTypes} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
