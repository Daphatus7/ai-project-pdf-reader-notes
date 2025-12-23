import { create } from 'zustand';
import type {Note} from "@@/frontend/note.tsx";
/***
 * use zustand to store global state
 */

interface StoreState {
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  selectedNoteId: string;
  setSelectedNoteId: (id: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  notes: [],
  setNotes: (notes: Note[]) => set({ notes }),
  selectedNoteId: '',
  setSelectedNoteId: (id: string) => set({ selectedNoteId: id }),
}));

