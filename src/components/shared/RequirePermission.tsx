import { useRBAC } from '@/hooks/useRBAC';
import type { Permission } from '@/lib/roles';
import { Shield } from 'lucide-react';

interface RequirePermissionProps {
  /** Single permission required to view this route */
  permission?: Permission;
  /** Any one of these permissions is sufficient */
  anyOf?: Permission[];
  /** What to render — typically <Outlet /> or a page component */
  children: React.ReactNode;
}

/**
 * Route guard component.
 * Wraps a route or <Outlet /> and blocks access if the current role
 * lacks the required permission(s).
 */
export function RequirePermission({ permission, anyOf, children }: RequirePermissionProps) {
  const { can, canAny, roleLabel } = useRBAC();

  const allowed = permission
    ? can(permission)
    : anyOf
      ? canAny(anyOf)
      : true; // no restriction specified

  if (!allowed) {
    return <AccessDenied roleLabel={roleLabel} />;
  }

  return <>{children}</>;
}

function AccessDenied({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 flex items-center justify-center">
          <Shield size={36} className="text-red-400" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-display text-white">Access Restricted</h2>
          <p className="text-sm font-body text-steel leading-relaxed">
            Your current role <span className="font-semibold text-white">({roleLabel})</span> does
            not have permission to access this page.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-gradient-to-r from-gold/20 to-gold/10 text-gold border border-gold/20 hover:border-gold/40 transition-all"
          >
            Go to Dashboard
          </a>
        </div>

        <p className="text-[11px] text-steel/50 font-body">
          Contact your administrator if you believe you should have access.
        </p>
      </div>
    </div>
  );
}
