import {useEffect} from "react";
import {Button} from "../../ui/button.tsx";
import {Input} from "../../ui/input.tsx";
import {ScrollArea} from "../../ui/scroll-area.tsx";
import {Plus, Search} from "lucide-react";
import {type NoteSidebarProps} from "@/frontend/components/note/sidebar/type.ts";
import {SidebarItem} from "@/frontend/components/note/sidebar/item/sidebar-item.tsx";

export function NoteSidebar({ notes, setNotes, selectedNoteId, onSelectNote, onAddNote, onDeleteNote, onEditNoteName }: NoteSidebarProps) {
	const handleDelete = (id: string) => {
		if (onDeleteNote) {
			onDeleteNote(id);
		} else {
			const filtered = notes.filter((note) => note.id !== id);
			setNotes(filtered);
			if (selectedNoteId === id) {
				onSelectNote(filtered[0]?.id || "");
			}
		}
	};

	const handleEditName = (id: string, newTitle: string) => {
		if (onEditNoteName) {
			onEditNoteName(id, newTitle);
		} else {
			const updated = notes.map((note) =>
				note.id === id ? { ...note, title: newTitle } : note
			);
			setNotes(updated);
		}
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
						<SidebarItem
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
