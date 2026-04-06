'use client';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import StatusBar from '@/components/layout/StatusBar';
import AuthInitializer from '@/components/layout/AuthInitializer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthInitializer>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
          <StatusBar />
        </div>
      </div>
    </AuthInitializer>
  );
}
