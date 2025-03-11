import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({ children, redirectTo = '/admin' }: ProtectedRouteProps) {
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth-check'],
    queryFn: async () => {
      try {
        return await apiRequest('GET', '/api/admin/auth-check');
      } catch (error) {
        throw error;
      }
    },
  });

  useEffect(() => {
    if (!isLoading && (isError || !data)) {
      navigate(redirectTo);
    }
  }, [isLoading, isError, data, navigate, redirectTo]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isError || !data ? null : <>{children}</>;
} 