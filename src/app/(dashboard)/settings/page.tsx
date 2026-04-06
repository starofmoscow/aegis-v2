'use client';

import { useEffect, useState } from 'react';
import { AI_PROVIDERS } from '@/lib/ai/providers';
import type { AIProvider } from '@/types';

export default function SettingsPage() {
  const [providers, setProviders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => setProviders(data.aiProviders?.details || {}))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Platform configuration and AI provider status</p>
      </div>

      <div className="rounded-lg p-6" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>AI Provider Status</h2>
        <div className="space-y-3">
          {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((key) => {
            const config = AI_PROVIDERS[key];
            const active = providers[key];
            return (
              <div key={key} className="flex items-center justify-between py-2 px-3 rounded-md" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: active ? 'var(--success)' : 'var(--text-muted)', opacity: active ? 1 : 0.3 }} />
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{config.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{config.model} — {config.costTier} tier</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{
                    background: active ? 'var(--success-light)' : 'var(--error-light)',
                    color: active ? 'var(--success)' : 'var(--error)',
                  }}>
                    {active ? 'Connected' : 'No API Key'}
                  </span>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    ${config.inputCostPer1M}/${config.outputCostPer1M} per 1M tokens
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg p-6" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Platform Info</h2>
        <div className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <p>Version: <strong>EE AEGIS V2.0</strong></p>
          <p>Company: <strong>LLC Energy & Engineering</strong></p>
          <p>Stack: Next.js 16 + React 19 + Supabase + Multi-AI</p>
          <p>Design: Bauhaus White Theme (Geist typography)</p>
        </div>
      </div>
    </div>
  );
}
