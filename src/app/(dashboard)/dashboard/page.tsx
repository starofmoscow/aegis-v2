'use client';

import { useAuthStore } from '@/stores/auth';
import { useProjectStore } from '@/stores/project';
import {
  Calculator, TrendingUp, FileText, MessageSquare, FolderOpen, ArrowRight,
  ArrowUpRight, ArrowDownRight, Zap, Globe, Shield, Clock, Activity,
  BarChart3, DollarSign, Users, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

/* ── KPI Card ──────────────────────────────────────── */
function KPICard({ label, value, change, changeType, icon: Icon, color }: {
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="aegis-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}12`, color }}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        {change && (
          <div className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: changeType === 'up' ? 'var(--success)' : changeType === 'down' ? 'var(--error)' : 'var(--text-muted)' }}>
            {changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : changeType === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
    </div>
  );
}

/* ── Quick Action ──────────────────────────────────── */
function QuickAction({ icon: Icon, label, desc, href, color }: {
  icon: React.ElementType;
  label: string;
  desc: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <div className="aegis-card aegis-card-interactive p-4 cursor-pointer group h-full">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}12`, color, transition: 'all var(--transition-base)' }}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</h3>
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Activity Item ─────────────────────────────────── */
function ActivityItem({ label, time, status }: {
  label: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}) {
  const statusColors = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    info: 'var(--info)',
  };

  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColors[status] }} />
      <p className="flex-1 text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>{time}</span>
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const { projects, currentProject } = useProjectStore();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Dr. Schmidt';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 aegis-slide-in">
      {/* ── Welcome Header ───────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {greeting}, {firstName}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {currentProject
              ? <>Active project: <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{currentProject.name}</span> ({currentProject.code})</>
              : 'Select a project to get started'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
            style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
            All systems operational
          </div>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard icon={FolderOpen} label="Active Projects" value={String(projects.length || 3)} change="+1 this month" changeType="up" color="var(--ee-crimson)" />
        <KPICard icon={DollarSign} label="Total CAPEX" value="$47.2M" change="+12.3%" changeType="up" color="var(--success)" />
        <KPICard icon={Activity} label="AI Queries Today" value="142" change="vs 98 yesterday" changeType="up" color="var(--info)" />
        <KPICard icon={AlertTriangle} label="Open Issues" value="7" change="-3 resolved" changeType="down" color="var(--warning)" />
      </div>

      {/* ── Main Content Grid ────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Quick Actions — Left 2 cols */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction icon={MessageSquare} label="AI Chat" desc="Multi-provider engineering AI assistant" href="/chat" color="var(--ee-crimson)" />
            <QuickAction icon={Calculator} label="Engineering" desc="Pressure vessels, heat exchangers, pipes" href="/engineering" color="var(--info)" />
            <QuickAction icon={TrendingUp} label="Finance" desc="CAPEX/OPEX estimation & feasibility" href="/finance" color="var(--success)" />
            <QuickAction icon={FileText} label="Documents" desc="Technical specs & datasheets" href="/documents" color="var(--warning)" />
          </div>

          {/* Projects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Projects</h2>
              <Link href="/projects" className="text-[12px] font-medium flex items-center gap-1"
                style={{ color: 'var(--ee-crimson)' }}>
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {projects.map((project) => (
                <div key={project.id} className="aegis-card p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: 'linear-gradient(90deg, var(--ee-crimson), var(--ee-navy))' }} />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="aegis-badge" style={{ background: 'var(--ee-crimson-light)', color: 'var(--ee-crimson)' }}>
                      {project.code}
                    </span>
                    <span className="aegis-badge" style={{
                      background: project.status === 'active' ? 'var(--success-light)' : 'var(--warning-light)',
                      color: project.status === 'active' ? 'var(--success)' : 'var(--warning)',
                    }}>
                      {project.status}
                    </span>
                  </div>
                  <h3 className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{project.name}</h3>
                  <p className="text-[11px] line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{project.description}</p>
                  {project.location && (
                    <div className="flex items-center gap-1 mt-2">
                      <Globe className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{project.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar — Activity & Stats */}
        <div className="space-y-4">
          {/* AI Providers Status */}
          <div className="aegis-card p-4">
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                AI Providers
              </div>
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Claude Opus 4.6', status: true, tier: 'Premium' },
                { name: 'GPT-5.2', status: true, tier: 'Premium' },
                { name: 'Gemini Flash', status: true, tier: 'Budget' },
                { name: 'Grok', status: true, tier: 'Budget' },
                { name: 'YandexGPT 5', status: false, tier: 'Standard' },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`aegis-status ${p.status ? 'aegis-status-active' : 'aegis-status-inactive'}`} />
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                    {p.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="aegis-card p-4">
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                Recent Activity
              </div>
            </h3>
            <div>
              <ActivityItem label="Heat exchanger sizing completed" time="2m ago" status="success" />
              <ActivityItem label="Uganda refinery CAPEX updated" time="18m ago" status="info" />
              <ActivityItem label="Pressure vessel alert: review needed" time="1h ago" status="warning" />
              <ActivityItem label="P&ID diagram generated" time="3h ago" status="success" />
              <ActivityItem label="FEED Sohar documents exported" time="5h ago" status="info" />
            </div>
          </div>

          {/* Platform Stats */}
          <div className="aegis-card p-4">
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                Platform
              </div>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'AI Models', value: '7' },
                { label: 'Calc Engines', value: '8' },
                { label: 'EPC Phases', value: '8' },
                { label: 'Standards', value: '5' },
              ].map((stat) => (
                <div key={stat.label} className="text-center py-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
