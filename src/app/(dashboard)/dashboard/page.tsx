'use client';

import { useAuthStore } from '@/stores/auth';
import { useProjectStore } from '@/stores/project';
import { Calculator, TrendingUp, FileText, MessageSquare, FolderOpen, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const quickActions = [
  { icon: MessageSquare, label: 'AI Chat', desc: 'Talk to engineering AI', href: '/chat', color: 'var(--ee-crimson)' },
  { icon: Calculator, label: 'Engineering', desc: 'Run calculations', href: '/engineering', color: 'var(--info)' },
  { icon: TrendingUp, label: 'Finance', desc: 'Cost estimation', href: '/finance', color: 'var(--success)' },
  { icon: FileText, label: 'Documents', desc: 'Generate reports', href: '/documents', color: 'var(--warning)' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { projects, currentProject } = useProjectStore();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Dr. Schmidt';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Welcome back, {firstName}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {currentProject ? `Active project: ${currentProject.name} (${currentProject.code})` : 'No project selected'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div
              className="rounded-lg p-5 transition-all duration-150 cursor-pointer group"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = action.color; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <action.icon className="w-6 h-6 mb-3" style={{ color: action.color }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{action.label}</h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Active Projects</h2>
          <Link href="/projects" className="text-[12px] font-medium flex items-center gap-1" style={{ color: 'var(--ee-crimson)' }}>
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg p-5 relative overflow-hidden"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'var(--ee-crimson)' }} />
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-4 h-4" style={{ color: 'var(--ee-crimson)' }} />
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--ee-crimson-light)', color: 'var(--ee-crimson)' }}>
                  {project.code}
                </span>
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{project.name}</h3>
              <p className="text-[12px] mb-3 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{project.description}</p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded capitalize" style={{
                  background: project.status === 'active' ? 'var(--success-light)' : 'var(--warning-light)',
                  color: project.status === 'active' ? 'var(--success)' : 'var(--warning)',
                }}>
                  {project.status}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{project.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'AI Providers', value: '7', sub: 'Multi-model orchestration' },
          { label: 'Calculation Engines', value: '8', sub: 'ASME/API/TEMA standards' },
          { label: 'EPC Phases', value: '8', sub: 'Concept to commissioning' },
          { label: 'Platform Version', value: '2.0', sub: 'Bauhaus redesign' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg p-4" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
