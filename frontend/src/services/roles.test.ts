import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@lib/supabase';
import {
  getCurrentUserRole,
  updateUserStatus,
  assignAdminRole,
  approveUserRegistration,
  rejectUserRegistration,
} from '@services/roles';

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Roles Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUserRole', () => {
    it('should return null if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null } as any,
        error: null,
      });

      const result = await getCurrentUserRole();
      expect(result).toBeNull();
    });

    it('should return user role when authenticated', async () => {
      const mockUser = { id: 'user-123' };
      const mockRole = { id: 'role-123', name: 'admin', description: 'Admin' };

      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: mockUser } as any,
        error: null,
      });

      // Primera query: obtener role_id del perfil
      const mockSelectProfile = vi.fn().mockReturnThis();
      const mockEqProfile = vi.fn().mockResolvedValueOnce({
        data: [{ role_id: 'role-123', status: 'active', updated_at: '2026-06-23T00:00:00.000Z' }],
        error: null,
      });

      // Segunda query: obtener el rol por id
      const mockSelectRole = vi.fn().mockReturnThis();
      const mockEqRole = vi.fn().mockReturnThis();
      const mockSingleRole = vi.fn().mockResolvedValueOnce({
        data: mockRole,
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: mockSelectProfile,
        } as any)
        .mockReturnValueOnce({
          select: mockSelectRole,
        } as any);

      mockSelectProfile.mockReturnValueOnce({ eq: mockEqProfile });

      mockSelectRole.mockReturnValueOnce({ eq: mockEqRole });
      mockEqRole.mockReturnValueOnce({ single: mockSingleRole });

      const result = await getCurrentUserRole();
      expect(result).toEqual(mockRole);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      });

      await updateUserStatus('user-123', 'active');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should throw error on failure', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({
        error: new Error('Database error'),
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      });

      await expect(updateUserStatus('user-123', 'active')).rejects.toThrow();
    });
  });

  describe('approveUserRegistration', () => {
    it('should approve user registration by setting status to active', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      });

      await approveUserRegistration('user-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });
  });

  describe('rejectUserRegistration', () => {
    it('should reject user registration by setting status to inactive', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      });

      await rejectUserRegistration('user-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inactive' })
      );
    });
  });

  describe('assignAdminRole', () => {
    it('should assign admin role to user', async () => {
      const mockAdminRole = { id: 'admin-role-id' };

      const mockSelectRoles = vi.fn().mockReturnThis();
      const mockEqRole = vi.fn().mockReturnThis();
      const mockSingleRole = vi
        .fn()
        .mockResolvedValueOnce({
          data: mockAdminRole,
          error: null,
        });

      const mockUpdateUser = vi.fn().mockReturnThis();
      const mockEqUser = vi.fn().mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: mockSelectRoles,
        } as any)
        .mockReturnValueOnce({
          update: mockUpdateUser,
        } as any);

      mockSelectRoles.mockReturnValueOnce({
        eq: mockEqRole,
      });

      mockEqRole.mockReturnValueOnce({
        single: mockSingleRole,
      });

      mockUpdateUser.mockReturnValueOnce({
        eq: mockEqUser,
      });

      await assignAdminRole('user-123');

      expect(mockUpdateUser).toHaveBeenCalledWith(
        expect.objectContaining({ role_id: 'admin-role-id' })
      );
      expect(mockEqUser).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
