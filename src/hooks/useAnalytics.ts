import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/sessionStore';
import { 
  analytics, 
  startDurationTracking, 
  getSessionDuration,
  trackDurationMilestone,
  getDeviceType,
  type FeatureType,
} from '@/lib/analytics';

// Duration milestones to track (in seconds)
const DURATION_MILESTONES = [60, 180, 300, 600, 900, 1800]; // 1m, 3m, 5m, 10m, 15m, 30m

/**
 * Hook for comprehensive analytics tracking in ASPIRAL sessions
 */
export function useAnalytics() {
  const { user } = useAuth();
  const { currentSession } = useSessionStore();
  
  const trackedMilestones = useRef<Set<number>>(new Set());
  const sessionTracked = useRef<string | null>(null);
  const milestoneIntervalRef = useRef<NodeJS.Timeout>();

  // Identify user when authenticated
  useEffect(() => {
    if (user) {
      analytics.identify(user.id, {
        email: user.email,
        created_at: user.created_at,
        provider: user.app_metadata?.provider || 'email',
      });
    }
  }, [user]);

  // Track session start
  useEffect(() => {
    if (currentSession && sessionTracked.current !== currentSession.id) {
      sessionTracked.current = currentSession.id;
      trackedMilestones.current.clear();
      
      startDurationTracking();
      
      analytics.trackSessionStart({
        sessionId: currentSession.id,
        userId: currentSession.userId,
        isAuthenticated: !!user,
        deviceType: getDeviceType(),
        referrer: document.referrer || undefined,
      });

      // Start milestone tracking
      milestoneIntervalRef.current = setInterval(() => {
        const duration = getSessionDuration();
        
        for (const milestone of DURATION_MILESTONES) {
          if (duration >= milestone && !trackedMilestones.current.has(milestone)) {
            trackedMilestones.current.add(milestone);
            trackDurationMilestone(milestone, currentSession.id);
          }
        }
      }, 10000); // Check every 10 seconds
    }

    return () => {
      if (milestoneIntervalRef.current) {
        clearInterval(milestoneIntervalRef.current);
      }
    };
  }, [currentSession, user]);

  // Track session end on unmount or session change
  useEffect(() => {
    return () => {
      if (currentSession && sessionTracked.current === currentSession.id) {
        analytics.trackSessionEnd({
          sessionId: currentSession.id,
          duration: getSessionDuration(),
          entityCount: currentSession.entities.length,
          connectionCount: currentSession.connections.length,
          questionCount: 0, // Would need to track this
          hadBreakthrough: currentSession.status === 'breakthrough',
          status: currentSession.status,
        });
      }
    };
  }, [currentSession]);

  // Track feature usage
  const trackFeature = useCallback((feature: FeatureType, metadata?: Record<string, unknown>) => {
    analytics.trackFeatureUsed({
      feature,
      sessionId: currentSession?.id,
      metadata,
    });
  }, [currentSession]);

  // Track entity creation
  const trackEntity = useCallback((
    entityId: string, 
    entityType: string, 
    totalEntities: number,
    method: 'ai_extracted' | 'manual' | 'demo' = 'ai_extracted'
  ) => {
    if (!currentSession) return;
    
    analytics.trackEntityCreated({
      sessionId: currentSession.id,
      entityId,
      entityType,
      totalEntities,
      method,
    });
  }, [currentSession]);

  // Track breakthrough
  const trackBreakthroughEvent = useCallback((
    friction: string,
    grease: string,
    insight: string,
    questionCount: number,
    ultraFastMode: boolean
  ) => {
    if (!currentSession) return;
    
    analytics.trackBreakthrough({
      sessionId: currentSession.id,
      friction,
      grease,
      insight,
      timeToBreakthrough: getSessionDuration(),
      entityCount: currentSession.entities.length,
      questionCount,
      ultraFastMode,
    });
  }, [currentSession]);

  // Reset analytics on logout
  const resetAnalytics = useCallback(() => {
    analytics.reset();
    sessionTracked.current = null;
    trackedMilestones.current.clear();
  }, []);

  return {
    trackFeature,
    trackEntity,
    trackBreakthrough: trackBreakthroughEvent,
    resetAnalytics,
    getSessionDuration,
  };
}
