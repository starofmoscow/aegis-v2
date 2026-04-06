'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import {
  LayoutDashboard, MessageSquare, Calculator, TrendingUp, GitBranch,
  Search, FileText, Settings, ChevronRight, LogOut, Menu, FolderOpen,
  Sun, Moon, Monitor,
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

const sectionLabels: Record<string, string> = {
  core: 'Core',
  work: 'Engineering',
  tools: 'Tools',
  system: 'System',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, theme, setTheme } = useUIStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); } catch { setSigningOut(false); }
  };

  const initials = (() => {
    const name = user?.user_metadata?.full_name || user?.email || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  })();

  const width = sidebarCollapsed ? 60 : 240;

  return (
    <div
      className="flex flex-col h-screen select-none shrink-0"
      style={{
        width,
        minWidth: width,
        transition: 'width var(--transition-base), min-width var(--transition-base)',
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div className="px-3 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--ee-crimson), var(--ee-navy))' }}>
            <span className="text-white text-[10px] font-extrabold tracking-wide">EE</span>
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-[13px] tracking-tight ee-gradient-text whitespace-nowrap">
                AEGIS V2
              </span>
              <span className="text-[9px] font-medium tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
                Engineering Intelligence
              </span>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md shrink-0"
          style={{ color: 'var(--text-muted)', transition: 'all var(--transition-fast)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 px-2 overflow-y-auto pb-2">
        {navItems.map((item, idx) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const prev = idx > 0 ? navItems[idx - 1] : null;
          const newSection = prev && prev.section !== item.section;

          return (
            <div key={item.href}>
              {newSection && (
                <div className="mt-3 mb-1.5 mx-2">
                  {!sidebarCollapsed ? (
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {sectionLabels[item.section]}
                    </span>
                  ) : (
                    <div className="h-px" style={{ background: 'var(--border)' }} />
                  )}
                </div>
              )}
              <Link href={item.href}>
                <div
                  className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg mb-0.5"
                  style={{
                    transition: 'all var(--transition-fast)',
                    ...(active ? {
                      background: 'var(--ee-crimson-light)',
                      color: 'var(--ee-crimson)',
                    } : {
                      color: 'var(--text-secondary)',
                    }),
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" style={{ strokeWidth: active ? 2.2 : 1.8 }} />
                  {!sidebarCollapsed && (
                    <span className="text-[13px] truncate" style={{ fontWeight: active ? 600 : 400 }}>
                      {item.label}
                    </span>
                  )}
                  {active && !sidebarCollapsed && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ── Theme Toggle ───────────────────────────── */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2">
          <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg-secondary)' }}>
            {([
              { value: 'light' as const, icon: Sun, label: 'Light' },
              { value: 'dark' as const, icon: Moon, label: 'Dark' },
              { value: 'system' as const, icon: Monitor, label: 'Auto' },
            ]).map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className="flex-1 flex items-center justify-center py-1.5 rounded-md"
                style={{
                  transition: 'all var(--transition-fast)',
                  background: theme === value ? 'var(--bg-primary)' : 'transparent',
                  boxShadow: theme === value ? 'var(--shadow-xs)' : 'none',
                  color: theme === value ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── User Section ───────────────────────────── */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
          style={{ transition: 'background var(--transition-fast)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--ee-crimson), var(--ee-navy))' }}>
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                {user?.email}
              </p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="p-1 rounded-md shrink-0"
              style={{ color: 'var(--text-muted)', transition: 'all var(--transition-fast)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
