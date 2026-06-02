import { useQuery } from '@tanstack/react-query';
import { supabase, isDemoMode, isPlatformAdmin } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

/**
 * Server-verified platform-admin check.
 * The client-side email match (isPlatformAdmin) is only a UX hint; the
 * source of truth is the SECURITY DEFINER `is_platform_admin()` RPC which
 * reads the platform_admins allowlist using the caller's JWT.
 */
export function usePlatformAdmin() {
  const user = useAppStore((s) => s.user);

  const query = useQuery({
    queryKey: ['is-platform-admin', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (isDemoMode) return isPlatformAdmin(user?.email);
      const { data, error } = await supabase.rpc('is_platform_admin');
      if (error) return false;
      return data === true;
    },
    enabled: !!user?.id || isDemoMode,
    staleTime: 1000 * 60 * 5,
  });

  return {
    isAdmin: query.data === true,
    isLoading: query.isLoading,
  };
}
