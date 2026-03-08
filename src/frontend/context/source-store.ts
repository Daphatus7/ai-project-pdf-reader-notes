import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persists selected document IDs per project.
 * Shape: { [projectId]: string[] }
 * Stored in localStorage so selection survives page refresh.
 */
interface SourceStoreState {
  selectionByProject: Record<string, string[]>;
  setSelection: (projectId: string, ids: string[]) => void;
  clearSelection: (projectId: string) => void;
}

export const useSourceStore = create<SourceStoreState>()(
  persist(
    (set) => ({
      selectionByProject: {},

      setSelection: (projectId, ids) =>
        set((state) => ({
          selectionByProject: { ...state.selectionByProject, [projectId]: ids },
        })),

      clearSelection: (projectId) =>
        set((state) => {
          const next = { ...state.selectionByProject };
          delete next[projectId];
          return { selectionByProject: next };
        }),
    }),
    { name: 'source-selection' }, // localStorage key
  ),
);
