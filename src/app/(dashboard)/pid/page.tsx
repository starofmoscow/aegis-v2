'use client';

import { Construction } from 'lucide-react';

export default function PIDPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'var(--ee-navy-light)' }}>
        <Construction className="w-7 h-7" style={{ color: 'var(--ee-navy)' }} />
      </div>
      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>P&amp;ID Module</h1>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        P&amp;ID generation and analysis module is under development.
      </p>
    </div>
  );
}
