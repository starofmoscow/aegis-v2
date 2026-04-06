'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useProjectStore } from '@/stores/project';
import { useUIStore } from '@/stores/ui';
import { ChevronDown, ChevronRight, Search, Command } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { AI_PROVIDERS } from '@/lib/ai/providers';
import type { AIProvider } from '@/types';

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Dashboard', href: '/dashboard' }];
  if (segments.length > 1) {
    crumbs.push({
      label: segments[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      href: undefined as any,
    });
  }
  return crumbs;
}

const providerMeta: Record<AIProvider, { color: string; abbr: string }> = {
  claude: { color: 'var(--ee-crimson)', abbr: 'CL' },
  openai: { color: '#10A37F', abbr: 'OA' },
  gemini: { color: '#4285F4', abbr: 'GE' },
  grok: { color: '#1DA1F2', abbr: 'GK' },
  groq: { color: '#7C3AED', abbr: 'GQ' },
  deepseek: { color: '#0EA5E9', abbr: 'DS' },
  yandex: { color: '#FF0000', abbr: 'YA' },
};

export default function TopBar() {
  const pathname = usePathname();
  const { projects, currentProject, setCurrentProject } = useProjectStore();
  const { activeProvider, activeModel } = useUIStore();
  const [crumbs, setCrumbs] = useState<{ label: string; href?: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setCrumbs(generateBreadcrumbs(pathname)); }, [pathname]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div className="flex items-center justify-between px-5 h-11 shrink-0"
      style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>

      {/* ── Breadcrumb ─────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-[13px]">
        {crumbs.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
            {c.href ? (
              <Link href={c.href} className="transition-colors"
                style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                {c.label}
              </Link>
            ) : (
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Center: Project Selector ───────────────── */}
      <div className="absolute left-1/2 -translate-x-1/2" ref={ref}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1 rounded-lg text-[12px]"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <span className="font-medium">{currentProject?.name || 'Select Project'}</span>
          <ChevronDown className="w-3 h-3" style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--transition-fast)',
          }} />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-64 rounded-xl overflow-hidden z-50 aegis-slide-in"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
            <div className="p-1.5">
              {projects.map((p) => {
                const active = currentProject?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setCurrentProject(p); setIsOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg"
                    style={{
                      background: active ? 'var(--ee-crimson-light)' : 'transparent',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--ee-crimson-light)' : 'transparent'; }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-tertiary)', color: active ? 'var(--ee-crimson)' : 'var(--text-muted)' }}>
                        {p.code}
                      </span>
                      <span className="text-[12px] font-medium"
                        style={{ color: active ? 'var(--ee-crimson)' : 'var(--text-primary)' }}>
                        {p.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: AI Status + Quick Search ─────────── */}
      <div className="flex items-center gap-3">
        {/* AI Provider Status Dots */}
        <div className="flex items-center gap-1">
          {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((key) => {
            const meta = providerMeta[key];
            const available = AI_PROVIDERS[key].available;
            return (
              <div key={key} className="relative group">
                <div className="w-2 h-2 rounded-full" style={{
                  background: available ? meta.color : 'var(--text-muted)',
                  opacity: available ? 1 : 0.2,
                  transition: 'all var(--transition-fast)',
                }} />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 rounded-md text-[10px] whitespace-nowrap z-50"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    boxShadow: 'var(--shadow-md)',
                  }}>
                  {AI_PROVIDERS[key].name}
                  <span className="ml-1" style={{ color: available ? 'var(--success)' : 'var(--error)' }}>
                    {available ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active model badge */}
        {activeModel && (
          <div className="aegis-badge" style={{ background: 'var(--ee-crimson-light)', color: 'var(--ee-crimson)' }}>
            {activeModel}
          </div>
        )}

        {/* Quick search hint */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Search className="w-3 h-3" />
          <span className="hidden md:inline">Search</span>
          <kbd className="px-1 py-0.5 rounded text-[9px] font-mono"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            /
          </kbd>
        </button>
      </div>
    </div>
  );
}
