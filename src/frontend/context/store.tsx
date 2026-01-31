import { create } from 'zustand';
import type {MyNotePage} from "@/frontend/pages/my-note/my-note-page.tsx";

/***
 * use zustand to store global state
 * Only used for state management, and do not write logic here
 */

interface StoreState {
  notes: MyNotePage[];
  setNotes: (notes: MyNotePage[]) => void;
  selectedNoteId: string;
  setSelectedNoteId: (id: string) => void;
}

export const useNotesStore = create<StoreState>((set) => ({
  notes: [],
  setNotes: (notes: MyNotePage[]) => set({ notes }),
  selectedNoteId: '1',
  setSelectedNoteId: (id: string) => set({ selectedNoteId: id }),
}));