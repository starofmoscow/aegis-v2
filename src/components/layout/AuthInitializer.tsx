'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initialize, loading } = useAuthStore();

  useEffect(() => { initialize(); }, [initialize]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--ee-navy)' }}>
            <span className="text-white text-sm font-bold">EE</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading AEGIS...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
