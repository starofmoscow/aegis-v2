'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import {
  LayoutDashboard, MessageSquare, Calculator, TrendingUp, GitBranch,
  Box, Search, FileText, Settings, ChevronRight, LogOut, Menu, FolderOpen,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', section: 'core' },
  { icon: MessageSquare, label: 'AI Chat', href: '/chat', section: 'core' },
  { icon: Calculator, label: 'Engineering', href: '/engineering', section: 'work' },
  { icon: TrendingUp, label: 'Finance', href: '/finance', section: 'work' },
  { icon: GitBranch, label: 'P&ID', href: '/pid', section: 'work' },
  { icon: Search, label: 'Research', href: '/research', section: 'tools' },
  { icon: FileText, label: 'Documents', href: '/documents', section: 'tools' },
  { icon: FolderOpen, label: 'Projects', href: '/projects', section: 'tools' },
  { icon: Settings, label: 'Settings', href: '/settings', section: 'system' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); } catch { setSigningOut(false); }
  };

  const initials = (() => {
    const name = user?.user_metadata?.full_name || user?.email || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  })();

  return (
    <div
      style={{ width: sidebarCollapsed ? 64 : 232, transition: 'width 0.2s ease' }}
      className="flex flex-col h-screen select-none shrink-0"
      {...{ style: { ...{ width: sidebarCollapsed ? 64 : 232, transition: 'width 0.2s ease' }, background: 'var(--bg-primary)', borderRight: '1px solid var(--border)' } }}
    >
      {/* Header */}
      <div className="px-3 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--ee-navy)' }}>
            <span className="text-white text-xs font-bold">EE</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-sm ee-gradient-text whitespace-nowrap">AEGIS V2</span>
          )}
        </div>
        <button onClick={toggleSidebar} className="p-1 rounded-md transition shrink-0 hover:bg-[var(--bg-tertiary)]">
          <Menu className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-2">
        {navItems.map((item, idx) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const prev = idx > 0 ? navItems[idx - 1] : null;
          const divider = prev && prev.section !== item.section;

          return (
            <div key={item.href}>
              {divider && <div className="my-2 mx-2" style={{ borderTop: '1px solid var(--border-light)' }} />}
              <Link href={item.href}>
                <div
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all duration-150"
                  style={active ? {
                    background: 'var(--ee-crimson-light)',
                    color: 'var(--ee-crimson)',
                    borderLeft: '3px solid var(--ee-crimson)',
                    fontWeight: 600,
                  } : {
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="text-[13px] truncate">{item.label}</span>
                  )}
                  {active && !sidebarCollapsed && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-2 py-3 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition hover:bg-[var(--bg-secondary)]">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: 'var(--ee-navy)' }}>
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition disabled:opacity-50"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error-light)'; e.currentTarget.style.color = 'var(--error)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>}
        </button>
      </div>
    </div>
  );
}
