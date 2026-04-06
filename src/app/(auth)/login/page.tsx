'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight, Zap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) setError(error.message);
      else setError('Check your email for the login link.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
      <div className="w-full max-w-[400px] mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--ee-navy)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold ee-gradient-text">EE AEGIS</h1>
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>V2.0 — Engineering Intelligence</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-lg p-8"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sign In</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>Access the EPC platform</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bernd.moscow@gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-md text-sm transition"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {mode === 'password' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-md text-sm transition"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs px-3 py-2 rounded-md" style={{ color: 'var(--error)', background: 'var(--error-light)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--ee-crimson)' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
            className="w-full mt-4 py-2 text-xs font-medium text-center transition"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {mode === 'password' ? 'Sign in with magic link instead' : 'Sign in with password instead'}
          </button>
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: 'var(--text-muted)' }}>
          LLC Energy & Engineering
        </p>
      </div>
    </div>
  );
}
