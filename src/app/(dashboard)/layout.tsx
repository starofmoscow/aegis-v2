'use client';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import StatusBar from '@/components/layout/StatusBar';
import AuthInitializer from '@/components/layout/AuthInitializer';
import { useChatStore } from '@/stores/chat';

function ProgressBar() {
  const { isLoading } = useChatStore();
  if (!isLoading) return null;
  return <div className="aegis-progress-bar" />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthInitializer>
      <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-secondary)' }}>
        <ProgressBar />
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
