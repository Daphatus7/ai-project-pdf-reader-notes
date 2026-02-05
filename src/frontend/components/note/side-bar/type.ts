/**
 * @file        type.ts
 * @description
 *
 * @author      [Peiyu Wang]
 * @created    Friday
 * @license     © 2026 . All rights reserved.
 */

import type {Note} from "@/frontend/api/types/note.ts";

export interface NoteSidebarProps {
	notes: Note[];
	setNotes: (notes: Note[]) => void;
	selectedNoteId: string;
	onSelectNote: (id: string) => void;
	onAddNote?: () => void;
	onDeleteNote?: (id: string) => void;
	onEditNoteName?: (id: string, newTitle: string) => void;
}

export const ITEM_TYPE = "NOTE";

export interface DragItem {
	index: number;
	id: string;
	type: string;
}


export interface NoteItemProps {
	note: Note;
	index: number;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
	moveNote: (dragIndex: number, hoverIndex: number) => void;
	onEditName?: (id: string, newTitle: string) => void;
}