export interface DailyStats {
  date: string;
  sessions: number;
  breakthroughs: number;
  entities: number;
}

export interface UsageStats {
  totalSessions: number;
  totalBreakthroughs: number;
  totalEntities: number;
  totalMessages: number;
  activeUsers: number;
}

export interface EntityTypeData {
  name: string;
  value: number;
}
