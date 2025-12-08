import { useQuery } from '@tanstack/react-query';
import { usersService, User, UserStats } from '../services/users';
import { casesService } from '../services/cases';
import { auditService } from '../services/audit';

// User management hooks
export const useUsers = (skip = 0, limit = 100, role?: string, activeOnly = true) => {
  return useQuery({
    queryKey: ['users', skip, limit, role, activeOnly],
    queryFn: () => usersService.getUsers({ skip, limit, role, is_active: activeOnly }),
  });
};

export const useUserStats = () => {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersService.getUserStats(),
  });
};

// Case statistics
export const useCaseStats = () => {
  return useQuery({
    queryKey: ['case-stats'],
    queryFn: () => casesService.getCaseStats(),
  });
};

// Audit statistics
export const useAuditStats = () => {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditService.getAuditStats(),
  });
}