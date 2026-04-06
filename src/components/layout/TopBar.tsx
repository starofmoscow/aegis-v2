'use client';

import { usePathname } from 'next/navigation';
import { useProjectStore } from '@/stores/project';
import { useUIStore } from '@/stores/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

const providerColors: Record<AIProvider, string> = {
  claude: 'var(--ee-crimson)',
  openai: 'var(--success)',
  gemini: 'var(--warning)',
  grok: 'var(--info)',
  groq: '#7C3AED',
  deepseek: '#0EA5E9',
  yandex: 'var(--ee-navy)',
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
    <div className="flex items-center justify-between px-6 py-2.5" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]">
        {crumbs.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
            <span style={{ color: c.href ? 'var(--text-tertiary)' : 'var(--text-primary)', fontWeight: c.href ? 500 : 600, cursor: c.href ? 'pointer' : 'default' }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {/* Project Selector */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <span className="font-medium">{currentProject?.name || 'Select Project'}</span>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        {isOpen && (
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-56 rounded-lg overflow-hidden z-50" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { setCurrentProject(p); setIsOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-[13px] transition"
                style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.code}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {(Object.keys(AI_PROVIDERS) as AIProvider[]).slice(0, 5).map((key) => (
            <div key={key} className="relative group">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: AI_PROVIDERS[key].available ? providerColors[key] : 'var(--text-muted)',
                  opacity: AI_PROVIDERS[key].available ? 1 : 0.3,
                }}
                title={AI_PROVIDERS[key].name}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 rounded-md text-[11px] whitespace-nowrap z-50"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-md)' }}>
                {AI_PROVIDERS[key].name}
              </div>
            </div>
          ))}
        </div>
        {activeModel && (
          <div className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: 'var(--ee-crimson-light)', color: 'var(--ee-crimson)' }}>
            {activeModel}
          </div>
        )}
      </div>
    </div>
  );
}
