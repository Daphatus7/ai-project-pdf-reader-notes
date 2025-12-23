import {useEffect, useRef, useState } from "react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
	Plus,
	FileText,
	Trash2,
	Download,
	MoreVertical,
	GripVertical,
	Search, Edit, EditIcon
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import { cn } from "../ui/utils.ts";
import { useDrag, useDrop } from "react-dnd";
import type { Identifier, XYCoord } from "dnd-core";
import type { Note } from "../../App.tsx";

interface NoteSidebarProps {
	notes: Note[];
	setNotes: (notes: Note[]) => void;
	selectedNoteId: string;
	onSelectNote: (id: string) => void;
	onAddNote?: () => void;
}

const ITEM_TYPE = "NOTE";

interface DragItem {
	index: number;
	id: string;
	type: string;
}

interface NoteItemProps {
	note: Note;
	index: number;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
	moveNote: (dragIndex: number, hoverIndex: number) => void;
	onEditName?: (id: string, newTitle: string) => void;
}

function NoteItem({ note, index, isSelected, onSelect, onDelete, moveNote, onEditName }: NoteItemProps) {
	const ref = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(note.title);

	const handleStartEdit = () => {
		setEditValue(note.title);
		setIsEditing(true);
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	const handleSaveEdit = () => {
		if (editValue.trim() && editValue !== note.title && onEditName) {
			onEditName(note.id, editValue.trim());
		}
		setIsEditing(false);
	};

	const handleCancelEdit = () => {
		setEditValue(note.title);
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSaveEdit();
		} else if (e.key === "Escape") {
			handleCancelEdit();
		}
	};

	const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
		accept: ITEM_TYPE,
		collect(monitor) {
			return {
				handlerId: monitor.getHandlerId(),
			};
		},
		hover(item: DragItem, monitor) {
			if (!ref.current) {
				return;
			}
			const dragIndex = item.index;
			const hoverIndex = index;

			if (dragIndex === hoverIndex) {
				return;
			}

			const hoverBoundingRect = ref.current?.getBoundingClientRect();
			const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
			const clientOffset = monitor.getClientOffset();
			const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

			if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
				return;
			}

			if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
				return;
			}

			moveNote(dragIndex, hoverIndex);
			item.index = hoverIndex;
		},
	});

	const [{ isDragging }, drag, preview] = useDrag({
		type: ITEM_TYPE,
		item: () => {
			return { id: note.id, index };
		},
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});

	preview(drop(ref));

	return (
		<div
			ref={ref}
			data-handler-id={handlerId}
			className={cn(
				"p-3 rounded-lg mb-2 cursor-pointer transition-colors group hover:bg-muted",
				isSelected && "bg-muted",
				isDragging && "opacity-50"
			)}
			onClick={() => {
				onSelect(note.id);
			}}
		>
			<div className="flex items-start justify-between gap-2 mb-1">
				<div className="flex items-start gap-2 flex-1 min-w-0">
					<div
						ref={drag}
						className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
					>
						<GripVertical className="w-4 h-4 text-muted-foreground" />
					</div>
					<FileText className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
					{isEditing ? (
						<Input
							ref={inputRef}
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							onBlur={handleSaveEdit}
							onKeyDown={handleKeyDown}
							onClick={(e) => e.stopPropagation()}
							className="h-6 text-sm px-1 py-0"
						/>
					) : (
						<h3
							className="text-sm truncate"
							onDoubleClick={(e) => {
								e.stopPropagation();
								handleStartEdit();
							}}
						>
							{note.title}
						</h3>
					)}
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
							onClick={(e) => e.stopPropagation()}
						>
							<MoreVertical className="w-3 h-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>
							<Download className="w-4 h-4 mr-2" />
							Export to Markdown
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleStartEdit();
							}}
						>
							<EditIcon className="w-4 h-4 mr-2" />
							Rename
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-destructive"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(note.id);
							}}
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Delete Note
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<p className="text-xs text-muted-foreground pl-10 line-clamp-2 mb-1">
				{note.preview}
			</p>

			<p className="text-xs text-muted-foreground pl-10">
				{note.updatedAt}
			</p>
		</div>
	);
}

export function NoteSidebar({ notes, setNotes, selectedNoteId, onSelectNote, onAddNote }: NoteSidebarProps) {
	const handleDelete = (id: string) => {
		const filtered = notes.filter((note) => note.id !== id);
		setNotes(filtered);
		if (selectedNoteId === id) {
			onSelectNote(filtered[0]?.id || "");
		}
	};

	const handleEditName = (id: string, newTitle: string) => {
		const updated = notes.map((note) =>
			note.id === id ? { ...note, title: newTitle } : note
		);
		setNotes(updated);
	};

	const moveNote = (dragIndex: number, hoverIndex: number) => {
		const updated = [...notes];
		const [removed] = updated.splice(dragIndex, 1);
		updated.splice(hoverIndex, 0, removed);
		setNotes(updated);
	};

	const handleNewNote = () => {
		if (onAddNote) {
			onAddNote();
		}
	};

	useEffect(() => {
		
	}, []);
	
	return (
		<div className="h-full flex flex-col border-r bg-muted/30">
			<div className="p-4 border-b">
				<Button className="w-full" size="sm"
						onClick={handleNewNote}
				>
					<Plus className="w-4 h-4 mr-2" />
					New Note
				</Button>
			</div>

			<div className="px-4 py-3 border-b space-y-3">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search notes..."
						className="pl-10 h-8"
					/>
				</div>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2">
					{notes.map((note, index) => (
						<NoteItem
							key={note.id}
							note={note}
							index={index}
							isSelected={selectedNoteId === note.id}
							onSelect={onSelectNote}
							onDelete={handleDelete}
							moveNote={moveNote}
							onEditName={handleEditName}
						/>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}
