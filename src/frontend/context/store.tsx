import { create } from 'zustand';
import type {Note} from "@/frontend/api/types/note.ts";

/***
 * use zustand to store global state
 * Only used for state management, and do not write logic here
 */

interface StoreState {
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  selectedNoteId: string;
  setSelectedNoteId: (id: string) => void;
}

export const useNotesStore = create<StoreState>((set) => ({
  notes: [],
  setNotes: (notes: Note[]) => set({ notes }),
  selectedNoteId: '1',
  setSelectedNoteId: (id: string) => set({ selectedNoteId: id }),
}));