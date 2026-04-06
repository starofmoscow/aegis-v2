'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '@/types';

const SEED_PROJECTS: Project[] = [
  {
    id: '1',
    code: 'AKO-2025',
    name: 'AKO Refinery',
    client: 'Sakha Republic Government',
    location: 'Sakha Republic, Russia',
    status: 'active',
    phase: 'feasibility',
    description: 'Modular crude oil refinery for remote Arctic operations, 15,000 BPD capacity',
    createdAt: '2025-06-15',
    updatedAt: '2026-03-20',
  },
  {
    id: '2',
    code: 'ANG-2025',
    name: 'Angola Assessment',
    client: 'Sonangol E.P.',
    location: 'Cabinda, Angola',
    status: 'planning',
    phase: 'concept',
    description: 'Downstream assessment for coastal refinery expansion project',
    createdAt: '2025-09-01',
    updatedAt: '2026-02-10',
  },
  {
    id: '3',
    code: 'IDN-2026',
    name: 'Indonesia Light Refinery',
    client: 'Pertamina',
    location: 'East Java, Indonesia',
    status: 'planning',
    phase: 'pre-feasibility',
    description: 'Light crude refinery with integrated petrochemical complex, 50,000 BPD',
    createdAt: '2026-01-10',
    updatedAt: '2026-04-01',
  },
];

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: SEED_PROJECTS,
      currentProject: SEED_PROJECTS[0],

      setCurrentProject: (project) => set({ currentProject: project }),

      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),
    }),
    { name: 'aegis-projects' },
  ),
);
