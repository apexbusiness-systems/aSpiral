import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Calendar as CalendarIcon,
  Search,
  Share2,
  Flame,
  Zap,
  Target,
  Lightbulb,
  X,
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { exportBreakthroughCard } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { fetchUserStreakDays } from '@/lib/profileStreak';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/normalizeError';

interface BreakthroughItem {
  id: string;
  friction: string;
  grease: string;
  insight: string;
  achieved_at: string;
  session_id: string;
}

const logger = createLogger('BreakthroughsPage');

const Breakthroughs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [breakthroughs, setBreakthroughs] = useState<BreakthroughItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(0);

  const loadBreakthroughs = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const db = supabase as any;
      const { data, error } = await db
        .from('breakthroughs')
        .select('id, friction, grease, insight, achieved_at, session_id')
        .eq('user_id', user.id)
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      setBreakthroughs(data || []);
    } catch (err) {
      console.error('Failed to load breakthroughs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadStreak = useCallback(async () => {
    if (!user) return;
    try {
      const db = supabase as any;
      const { data } = await db
        .from('profiles')
        .select('streak_days')
        .eq('id', user.id)
        .single();
      if (data) setStreakDays(data.streak_days || 0);
    } catch (error) {
      logger.warn('Failed to load streak', { error: getErrorMessage(error) });
    }
  }, [user]);

  useEffect(() => {
    loadBreakthroughs();
    loadStreak();
  }, [loadBreakthroughs, loadStreak]);

  const filtered = useMemo(() => {
    return breakthroughs.filter((b) => {
      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.friction.toLowerCase().includes(q) ||
          b.grease.toLowerCase().includes(q) ||
          b.insight.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Date range
      const date = new Date(b.achieved_at);
      if (dateFrom && isBefore(date, startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(date, endOfDay(dateTo))) return false;
      return true;
    });
  }, [breakthroughs, searchQuery, dateFrom, dateTo]);

  const handleShare = async (b: BreakthroughItem) => {
    setExportingId(b.id);
    try {
      await exportBreakthroughCard({
        friction: b.friction,
        grease: b.grease,
        insight: b.insight,
        achievedAt: new Date(b.achieved_at),
      });
      toast({ title: 'Card exported', description: 'Breakthrough card saved as image.' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExportingId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = searchQuery || dateFrom || dateTo;

  return (
    <div className="app-container min-h-screen">
      <div className="ambient-orb w-96 h-96 bg-accent/20 top-0 right-0" />
      <div className="ambient-orb w-80 h-80 bg-primary/20 bottom-20 left-10" style={{ animationDelay: '-5s' }} />

      <div className="relative z-10 container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/sessions')} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Breakthrough Gallery
              </h1>
              <p className="text-sm text-muted-foreground">
                {breakthroughs.length} breakthrough{breakthroughs.length !== 1 ? 's' : ''} achieved
              </p>
            </div>
            {streakDays > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/15 border border-warning/30 text-warning">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-semibold">{streakDays}</span>
                <span className="text-xs text-warning/80">day{streakDays !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search breakthroughs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl bg-muted/50 border-border"
            />
          </div>

          {[
            { value: dateFrom, onChange: setDateFrom, label: 'From' },
            { value: dateTo, onChange: setDateTo, label: 'To' },
          ].map(({ value, onChange, label }) => (
            <Popover key={label}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("rounded-xl gap-2", value && "text-foreground")}>
                  <CalendarIcon className="w-4 h-4" />
                  {value ? format(value, 'MMM d') : label}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value}
                  onSelect={onChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          ))}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl gap-1 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              {hasFilters ? 'No matching breakthroughs' : 'No breakthroughs yet'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {hasFilters
                ? 'Try adjusting your filters to find what you\'re looking for.'
                : 'Start a session and work through your friction to achieve your first breakthrough.'}
            </p>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            ) : (
              <Button onClick={() => navigate('/app')}>
                <Sparkles className="w-4 h-4 mr-2" />
                Start a Session
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((b) => (
                <div key={b.id} className="glass-card p-5 flex flex-col gap-3 hover:bg-glass-hover transition-colors">
                  {/* Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(b.achieved_at), 'MMM d, yyyy')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-accent bg-accent/20">
                      <Sparkles className="w-3 h-3" />
                      Breakthrough
                    </span>
                  </div>

                  {/* Friction */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Target className="w-3.5 h-3.5" />
                      Friction
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{b.friction}</p>
                  </div>

                  {/* Grease */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                      <Zap className="w-3.5 h-3.5" />
                      Grease
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{b.grease}</p>
                  </div>

                  {/* Insight */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Insight
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">{b.insight}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => handleShare(b)}
                      disabled={exportingId === b.id}
                    >
                      {exportingId === b.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      Share Card
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default Breakthroughs;
