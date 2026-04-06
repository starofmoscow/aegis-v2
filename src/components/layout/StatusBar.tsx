'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/ui';

export default function StatusBar() {
  const { activeModel } = useUIStore();
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="flex items-center justify-between px-5 py-1" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
      <div className="flex items-center gap-3">
        <span style={{ opacity: 0.7 }}>EE AEGIS V2.0</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span style={{ opacity: 0.7 }}>LLC Energy & Engineering</span>
      </div>
      {activeModel && (
        <div className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
          {activeModel}
        </div>
      )}
      <div className="flex items-center gap-3">
        {time && <span className="tabular-nums" style={{ opacity: 0.7 }}>{time}</span>}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
          <span style={{ opacity: 0.7 }}>Online</span>
        </div>
      </div>
    </div>
  );
}
