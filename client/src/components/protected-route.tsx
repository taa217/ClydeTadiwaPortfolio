import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { getToken, apiRequest } from '@/lib/queryClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({ children, redirectTo = '/admin' }: ProtectedRouteProps) {
  const [, navigate] = useLocation();
  const token = getToken();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/admin/auth-check'],
    queryFn: async () => {
      if (!token) {
        throw new Error('No token available');
      }
      return await apiRequest('GET', '/api/admin/auth-check');
    },
    enabled: !!token, // Only run query if we have a token
    retry: false,
  });

  useEffect(() => {
    if (!token || (!isLoading && (isError || !data?.authenticated))) {
      navigate(redirectTo);
    }
  }, [token, isLoading, isError, data, navigate, redirectTo]);

  if (!token) {
    return null;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (isError || !data?.authenticated) ? null : <>{children}</>;
} 