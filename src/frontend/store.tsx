import { create } from 'zustand';
import type {Note} from "@@/frontend/note.tsx";
import initialNotesData from "@@/frontend/hardcoed_data.tsx";

/***
 * use zustand to store global state
 */

interface StoreState {
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  selectedNoteId: string;
  setSelectedNoteId: (id: string) => void;
}

export const useNotesStore = create<StoreState>((set) => ({
  notes: initialNotesData,
  setNotes: (notes: Note[]) => set({ notes }),
  selectedNoteId: '1',
  setSelectedNoteId: (id: string) => set({ selectedNoteId: id }),
}));