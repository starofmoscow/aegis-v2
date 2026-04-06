'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chat';
import {
  CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp,
  Sparkles, Clock, Zap,
} from 'lucide-react';

export interface TaskStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  duration?: number; // ms
}

/* ── Task Step Row ───────────────────────────────────── */
function StepRow({ step, index }: { step: TaskStep; index: number }) {
  const statusIcon = {
    pending: <Circle className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />,
    in_progress: <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--ee-crimson)' }} />,
    completed: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />,
    error: <Circle className="w-3.5 h-3.5" style={{ color: 'var(--error)' }} />,
  };

  return (
    <div className="flex items-center gap-2.5 py-1.5" style={{
      opacity: step.status === 'pending' ? 0.5 : 1,
      transition: 'all var(--transition-base)',
    }}>
      {statusIcon[step.status]}
      <span className="text-[12px] flex-1" style={{
        color: step.status === 'in_progress' ? 'var(--text-primary)' : step.status === 'completed' ? 'var(--text-secondary)' : 'var(--text-muted)',
        fontWeight: step.status === 'in_progress' ? 500 : 400,
      }}>
        {step.label}
      </span>
      {step.duration && step.status === 'completed' && (
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {(step.duration / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

/* ── Main Task Tracker ───────────────────────────────── */
export default function TaskTracker() {
  const { isLoading, messages } = useChatStore();
  const [expanded, setExpanded] = useState(true);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Generate task steps when loading starts
  useEffect(() => {
    if (isLoading) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      const query = lastUserMsg?.content?.toLowerCase() || '';

      // Determine steps based on query context
      const newSteps: TaskStep[] = [
        { id: 'analyze', label: 'Analyzing query', status: 'in_progress' },
        { id: 'route', label: 'Selecting optimal AI provider', status: 'pending' },
      ];

      if (query.includes('calculat') || query.includes('design') || query.includes('size')) {
        newSteps.push({ id: 'compute', label: 'Running engineering calculations', status: 'pending' });
      }
      if (query.includes('cost') || query.includes('capex') || query.includes('estimat')) {
        newSteps.push({ id: 'finance', label: 'Performing cost analysis', status: 'pending' });
      }

      newSteps.push(
        { id: 'generate', label: 'Generating response', status: 'pending' },
        { id: 'format', label: 'Formatting output', status: 'pending' },
      );

      setSteps(newSteps);
      setStartTime(Date.now());
      setExpanded(true);

      // Simulate step progression
      const timers: NodeJS.Timeout[] = [];

      timers.push(setTimeout(() => {
        setSteps(prev => prev.map(s =>
          s.id === 'analyze' ? { ...s, status: 'completed', duration: 800 } :
          s.id === 'route' ? { ...s, status: 'in_progress' } : s
        ));
      }, 800));

      timers.push(setTimeout(() => {
        setSteps(prev => prev.map(s =>
          s.id === 'route' ? { ...s, status: 'completed', duration: 600 } :
          s.status === 'pending' && prev.findIndex(p => p.id === s.id) === prev.findIndex(p => p.status === 'pending')
            ? { ...s, status: 'in_progress' } : s
        ));
      }, 1400));

      timers.push(setTimeout(() => {
        setSteps(prev => {
          const updated = [...prev];
          // Complete all except last two, set next pending to in_progress
          let foundPending = false;
          for (let i = 0; i < updated.length; i++) {
            if (updated[i].status === 'in_progress') {
              updated[i] = { ...updated[i], status: 'completed', duration: 1200 };
            } else if (updated[i].status === 'pending' && !foundPending) {
              updated[i] = { ...updated[i], status: 'in_progress' };
              foundPending = true;
            }
          }
          return updated;
        });
      }, 2600));

      return () => timers.forEach(clearTimeout);
    } else {
      // Mark all remaining as completed
      if (steps.length > 0) {
        setSteps(prev => prev.map(s => ({
          ...s,
          status: 'completed' as const,
          duration: s.duration || 500,
        })));
        // Auto-collapse after completion
        setTimeout(() => setExpanded(false), 2000);
      }
    }
  }, [isLoading]);

  // Elapsed timer
  useEffect(() => {
    if (!isLoading || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  // Don't render if no steps
  if (steps.length === 0 && !isLoading) return null;

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  // Hide after all done + delay
  if (allDone && !isLoading && elapsed > 0) {
    const timeSinceComplete = Date.now() - (startTime || 0) - elapsed;
    // Will be auto-hidden by the fade effect
  }

  return (
    <div className="aegis-fade-in" style={{
      transition: 'all var(--transition-base)',
      opacity: allDone && !isLoading ? 0.6 : 1,
    }}>
      <div className="aegis-card overflow-hidden">
        {/* Progress bar */}
        <div className="h-[2px]" style={{ background: 'var(--bg-tertiary)' }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: allDone ? 'var(--success)' : 'linear-gradient(90deg, var(--ee-crimson), var(--accent))',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: 2,
          }} />
        </div>

        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2"
          style={{ transition: 'all var(--transition-fast)' }}
        >
          {isLoading ? (
            <Sparkles className="w-3.5 h-3.5 aegis-pulse" style={{ color: 'var(--ee-crimson)' }} />
          ) : allDone ? (
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
          ) : (
            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          )}

          <span className="text-[12px] font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
            {isLoading ? 'Processing...' : allDone ? 'Complete' : 'Task Progress'}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {completedCount}/{totalCount}
            </span>
            {isLoading && (
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-3 h-3 inline mr-0.5" />
                {(elapsed / 1000).toFixed(1)}s
              </span>
            )}
            {expanded ? (
              <ChevronUp className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
        </button>

        {/* Steps list */}
        {expanded && (
          <div className="px-3.5 pb-3 aegis-fade-in">
            <div className="pl-1.5" style={{ borderLeft: '2px solid var(--border-light)' }}>
              {steps.map((step, i) => (
                <StepRow key={step.id} step={step} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
