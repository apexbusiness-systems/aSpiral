
import { describe, it, expect, vi } from 'vitest';
import { saveSessionData } from '../../lib/sessionPersistence';

// Mock Supabase methods
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({
  upsert: mockUpsert,
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
}));

const mockSupabase = {
  from: mockFrom,
};

describe('saveSessionData Supabase Error Handling', () => {
  const mockUser = { id: 'user-123' };
  const mockSession = {
    id: 'session-456',
    userId: 'user-123',
    status: 'active' as const,
    entities: [],
    connections: [],
    frictionPoints: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should throw when Supabase returns an error during session upsert', async () => {
    // Setup mock to return an error
    const dbError = { message: 'Database connection failed' };
    mockUpsert.mockResolvedValueOnce({ error: dbError });

    // Test the ACTUAL imported function from lib
    await expect(saveSessionData(mockSupabase, mockUser, mockSession as any, [])).rejects.toEqual(dbError);

    expect(mockFrom).toHaveBeenCalledWith('sessions');
  });

  it('should succeed when no error is returned', async () => {
    // Setup mock to return success
    mockUpsert.mockResolvedValueOnce({ error: null });

    // Test the ACTUAL imported function from lib
    const result = await saveSessionData(mockSupabase, mockUser, mockSession as any, []);

    expect(result).toBeUndefined();
  });
});
