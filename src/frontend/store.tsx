import { create } from 'zustand';
import type {MyNotePage} from "@/frontend/pages/my-note/my-note-page.tsx";
import initialNotesData from "@/frontend/test/hardcoed_data.tsx";

/***
 * use zustand to store global state
 */

interface StoreState {
  notes: MyNotePage[];
  setNotes: (notes: MyNotePage[]) => void;
  selectedNoteId: string;
  setSelectedNoteId: (id: string) => void;
}

export const useNotesStore = create<StoreState>((set) => ({
  notes: initialNotesData,
  setNotes: (notes: MyNotePage[]) => set({ notes }),
  selectedNoteId: '1',
  setSelectedNoteId: (id: string) => set({ selectedNoteId: id }),
}));