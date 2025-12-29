import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { 
  Breakthrough, 
  UserStreak, 
  Achievement, 
  AchievementId,
  UserPreferences,
  OnboardingReason,
  BreakthroughCategory
} from "@/lib/types";

// Achievement definitions
const ACHIEVEMENTS: Record<AchievementId, Omit<Achievement, "unlockedAt" | "progress">> = {
  first_breakthrough: {
    id: "first_breakthrough",
    name: "First Light",
    description: "Achieved your first breakthrough",
    icon: "✨",
    maxProgress: 1,
  },
  first_voice: {
    id: "first_voice",
    name: "Voice of Reason",
    description: "Used voice input for the first time",
    icon: "🎤",
    maxProgress: 1,
  },
  speed_run: {
    id: "speed_run",
    name: "Speed Demon",
    description: "Achieved breakthrough in under 3 minutes",
    icon: "⚡",
    maxProgress: 1,
  },
  shared_insight: {
    id: "shared_insight",
    name: "Wisdom Spreader",
    description: "Shared a breakthrough with others",
    icon: "🌟",
    maxProgress: 1,
  },
  invited_friend: {
    id: "invited_friend",
    name: "Circle Expander",
    description: "Invited a friend to aSpiral",
    icon: "💫",
    maxProgress: 1,
  },
  streak_7: {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day breakthrough streak",
    icon: "🔥",
    maxProgress: 7,
  },
  streak_30: {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintained a 30-day breakthrough streak",
    icon: "🏆",
    maxProgress: 30,
  },
  streak_100: {
    id: "streak_100",
    name: "Clarity Champion",
    description: "Maintained a 100-day breakthrough streak",
    icon: "👑",
    maxProgress: 100,
  },
  night_owl: {
    id: "night_owl",
    name: "Night Owl",
    description: "Achieved breakthrough between 12am-4am",
    icon: "🦉",
    maxProgress: 1,
  },
  early_bird: {
    id: "early_bird",
    name: "Early Bird",
    description: "Achieved breakthrough between 5am-7am",
    icon: "🌅",
    maxProgress: 1,
  },
  polyglot: {
    id: "polyglot",
    name: "Polyglot",
    description: "Used aSpiral in multiple languages",
    icon: "🌍",
    maxProgress: 3,
  },
  career_master: {
    id: "career_master",
    name: "Career Master",
    description: "Achieved 5 career-related breakthroughs",
    icon: "💼",
    maxProgress: 5,
  },
  relationship_guru: {
    id: "relationship_guru",
    name: "Relationship Guru",
    description: "Achieved 5 relationship breakthroughs",
    icon: "❤️",
    maxProgress: 5,
  },
  anxiety_slayer: {
    id: "anxiety_slayer",
    name: "Anxiety Slayer",
    description: "Achieved 5 anxiety breakthroughs",
    icon: "🧘",
    maxProgress: 5,
  },
};

interface EngagementState {
  // Breakthroughs
  breakthroughs: Breakthrough[];
  
  // Streaks
  streak: UserStreak | null;
  
  // Achievements
  achievements: Achievement[];
  
  // Preferences
  preferences: UserPreferences | null;
  
  // Actions - Breakthroughs
  addBreakthrough: (breakthrough: Omit<Breakthrough, "id" | "createdAt">) => Breakthrough;
  getBreakthroughs: () => Breakthrough[];
  getBreakthroughsByCategory: (category: BreakthroughCategory) => Breakthrough[];
  markBreakthroughShared: (id: string, platform: string) => void;
  
  // Actions - Streaks
  initializeStreak: (userId: string) => void;
  updateStreak: () => void;
  getStreakStatus: () => { isAtRisk: boolean; hoursRemaining: number };
  
  // Actions - Achievements
  checkAndUnlockAchievements: (context: AchievementContext) => Achievement[];
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
  getAchievementProgress: (id: AchievementId) => number;
  
  // Actions - Preferences
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  getPreferences: () => UserPreferences | null;
  completeOnboarding: () => void;
  
  // Reset
  reset: () => void;
}

interface AchievementContext {
  usedVoice?: boolean;
  sessionDuration?: number;
  sharedBreakthrough?: boolean;
  invitedFriend?: boolean;
  currentHour?: number;
  languagesUsed?: string[];
  category?: BreakthroughCategory;
}

const generateId = () => crypto.randomUUID();

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

export const useEngagementStore = create<EngagementState>()(
  persist(
    (set, get) => ({
      breakthroughs: [],
      streak: null,
      achievements: Object.values(ACHIEVEMENTS).map(a => ({ ...a, progress: 0 })),
      preferences: null,

      // Breakthrough actions
      addBreakthrough: (breakthroughInput) => {
        const breakthrough: Breakthrough = {
          ...breakthroughInput,
          id: generateId(),
          createdAt: new Date(),
        };

        set((state) => ({
          breakthroughs: [breakthrough, ...state.breakthroughs],
        }));

        // Update streak
        get().updateStreak();

        return breakthrough;
      },

      getBreakthroughs: () => get().breakthroughs,

      getBreakthroughsByCategory: (category) => 
        get().breakthroughs.filter((b) => b.category === category),

      markBreakthroughShared: (id, platform) => {
        set((state) => ({
          breakthroughs: state.breakthroughs.map((b) =>
            b.id === id
              ? {
                  ...b,
                  sharedAt: b.sharedAt || new Date(),
                  sharedPlatforms: [...(b.sharedPlatforms || []), platform],
                }
              : b
          ),
        }));
      },

      // Streak actions
      initializeStreak: (userId) => {
        const existing = get().streak;
        if (existing && existing.userId === userId) return;

        set({
          streak: {
            userId,
            currentStreak: 0,
            longestStreak: 0,
            lastBreakthroughAt: new Date(0),
            streakStartedAt: new Date(),
            totalBreakthroughs: 0,
          },
        });
      },

      updateStreak: () => {
        const { streak } = get();
        if (!streak) return;

        const now = new Date();
        const lastBreakthrough = new Date(streak.lastBreakthroughAt);

        let newStreak = streak.currentStreak;
        let streakStart = new Date(streak.streakStartedAt);

        if (isSameDay(lastBreakthrough, now)) {
          // Already had a breakthrough today - don't increment
        } else if (isYesterday(lastBreakthrough) || streak.currentStreak === 0) {
          // Continuing streak from yesterday or first breakthrough
          newStreak = streak.currentStreak + 1;
          if (streak.currentStreak === 0) {
            streakStart = now;
          }
        } else {
          // Streak broken - reset to 1
          newStreak = 1;
          streakStart = now;
        }

        const longestStreak = Math.max(streak.longestStreak, newStreak);

        set({
          streak: {
            ...streak,
            currentStreak: newStreak,
            longestStreak,
            lastBreakthroughAt: now,
            streakStartedAt: streakStart,
            totalBreakthroughs: streak.totalBreakthroughs + 1,
          },
        });
      },

      getStreakStatus: () => {
        const { streak } = get();
        if (!streak || streak.currentStreak === 0) {
          return { isAtRisk: false, hoursRemaining: 24 };
        }

        const now = new Date();
        const lastBreakthrough = new Date(streak.lastBreakthroughAt);
        
        // Calculate end of day for last breakthrough
        const endOfDay = new Date(lastBreakthrough);
        endOfDay.setDate(endOfDay.getDate() + 1);
        endOfDay.setHours(23, 59, 59, 999);

        const hoursRemaining = Math.max(0, (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60));
        const isAtRisk = hoursRemaining < 6 && !isSameDay(lastBreakthrough, now);

        return { isAtRisk, hoursRemaining };
      },

      // Achievement actions
      checkAndUnlockAchievements: (context) => {
        const state = get();
        const { streak, breakthroughs, achievements } = state;
        const unlocked: Achievement[] = [];

        const updateAchievement = (id: AchievementId, progress: number) => {
          const achievement = achievements.find((a) => a.id === id);
          if (!achievement || achievement.unlockedAt) return;

          const newProgress = Math.min(progress, achievement.maxProgress || 1);
          const isUnlocked = newProgress >= (achievement.maxProgress || 1);

          set((s) => ({
            achievements: s.achievements.map((a) =>
              a.id === id
                ? {
                    ...a,
                    progress: newProgress,
                    unlockedAt: isUnlocked ? new Date() : undefined,
                  }
                : a
            ),
          }));

          if (isUnlocked) {
            unlocked.push({ ...achievement, progress: newProgress, unlockedAt: new Date() });
          }
        };

        // Check various achievements
        if (breakthroughs.length >= 1) {
          updateAchievement("first_breakthrough", 1);
        }

        if (context.usedVoice) {
          updateAchievement("first_voice", 1);
        }

        if (context.sessionDuration && context.sessionDuration < 180) {
          updateAchievement("speed_run", 1);
        }

        if (context.sharedBreakthrough) {
          updateAchievement("shared_insight", 1);
        }

        if (context.invitedFriend) {
          updateAchievement("invited_friend", 1);
        }

        // Time-based achievements
        const hour = context.currentHour ?? new Date().getHours();
        if (hour >= 0 && hour < 4) {
          updateAchievement("night_owl", 1);
        }
        if (hour >= 5 && hour < 7) {
          updateAchievement("early_bird", 1);
        }

        // Streak achievements
        if (streak) {
          updateAchievement("streak_7", streak.currentStreak);
          updateAchievement("streak_30", streak.currentStreak);
          updateAchievement("streak_100", streak.currentStreak);
        }

        // Category achievements
        if (context.category) {
          const categoryCount = breakthroughs.filter((b) => b.category === context.category).length;
          if (context.category === "career") {
            updateAchievement("career_master", categoryCount);
          } else if (context.category === "relationship") {
            updateAchievement("relationship_guru", categoryCount);
          } else if (context.category === "anxiety") {
            updateAchievement("anxiety_slayer", categoryCount);
          }
        }

        // Language achievements
        if (context.languagesUsed && context.languagesUsed.length >= 3) {
          updateAchievement("polyglot", context.languagesUsed.length);
        }

        return unlocked;
      },

      getUnlockedAchievements: () => 
        get().achievements.filter((a) => a.unlockedAt),

      getLockedAchievements: () => 
        get().achievements.filter((a) => !a.unlockedAt),

      getAchievementProgress: (id) => {
        const achievement = get().achievements.find((a) => a.id === id);
        return achievement?.progress || 0;
      },

      // Preferences actions
      setPreferences: (prefs) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...prefs,
          } as UserPreferences,
        }));
      },

      getPreferences: () => get().preferences,

      completeOnboarding: () => {
        set((state) => ({
          preferences: state.preferences
            ? { ...state.preferences, onboardingCompleted: true }
            : null,
        }));
      },

      reset: () => {
        set({
          breakthroughs: [],
          streak: null,
          achievements: Object.values(ACHIEVEMENTS).map(a => ({ ...a, progress: 0 })),
          preferences: null,
        });
      },
    }),
    {
      name: "aspiral-engagement",
      partialize: (state) => ({
        breakthroughs: state.breakthroughs,
        streak: state.streak,
        achievements: state.achievements,
        preferences: state.preferences,
      }),
    }
  )
);
