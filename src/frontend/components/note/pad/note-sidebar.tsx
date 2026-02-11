import { useState } from 'react'
import { Button } from '@/frontend/components/ui/button.tsx'
import { ScrollArea } from '@/frontend/components/ui/scroll-area.tsx'
import { Input } from '@/frontend/components/ui/input.tsx'
import { Sidebar as LucideSidebar, Plus, MoreVertical, EditIcon, Trash2 } from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu.tsx'
import { cn } from '@/frontend/components/ui/utils.ts'
import type { Note } from '@/frontend/api/types/note/note.ts'

interface NoteSidebarProps {
	notes: Note[]
	selectedNoteId: string
	onSelectNote: (id: string) => void
	onAddNote: () => void
	onDeleteNote: (id: string) => void
	onRenameNote: (id: string, title: string) => void
	onClose: () => void
}

export function NoteSidebar({
	notes,
	selectedNoteId,
	onSelectNote,
	onAddNote,
	onDeleteNote,
	onRenameNote,
	onClose,
}: NoteSidebarProps) {
	return (
		<div className="w-1/2 border-l flex flex-col h-full bg-panel">
			<div className="p-3 border-b flex items-center justify-between h-13">
				<span className="text-sm font-medium">Notes</span>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
					<LucideSidebar className="h-4 w-4" />
				</Button>
			</div>

			<div className="p-3 border-b">
				<Button className="w-full" size="sm" onClick={onAddNote}>
					<Plus className="w-4 h-4 mr-2" />
					New Note
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2 flex flex-col gap-1">
					{notes.map((note) => (
						<NoteItem
							key={note.id}
							note={note}
							isActive={selectedNoteId === note.id}
							onSelect={() => onSelectNote(note.id)}
							onDelete={() => onDeleteNote(note.id)}
							onRename={(title) => onRenameNote(note.id, title)}
						/>
					))}
				</div>
			</ScrollArea>
		</div>
	)
}

interface NoteItemProps {
	note: Note
	isActive: boolean
	onSelect: () => void
	onDelete: () => void
	onRename: (title: string) => void
}

function NoteItem({ note, isActive, onSelect, onDelete, onRename }: NoteItemProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState(note.title)

	const handleStartEdit = () => {
		setEditValue(note.title)
		setIsEditing(true)
	}

	const handleSaveEdit = () => {
		if (editValue.trim() && editValue !== note.title) {
			onRename(editValue.trim())
		}
		setIsEditing(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') handleSaveEdit()
		else if (e.key === 'Escape') {
			setEditValue(note.title)
			setIsEditing(false)
		}
	}

	return (
		<div
			className={cn(
				'flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors group',
				isActive
					? 'bg-accent'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground',
			)}
			onClick={isEditing ? undefined : onSelect}
		>
			{isEditing ? (
				<Input
					autoFocus
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onBlur={handleSaveEdit}
					onKeyDown={handleKeyDown}
					onClick={(e) => e.stopPropagation()}
					className="h-6 text-sm px-1 py-0 flex-1"
				/>
			) : (
				<span className="truncate flex-1">{note.title || 'Untitled'}</span>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
						onClick={(e) => e.stopPropagation()}
					>
						<MoreVertical className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation()
							handleStartEdit()
						}}
					>
						<EditIcon className="w-4 h-4 mr-2" />
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onClick={(e) => {
							e.stopPropagation()
							onDelete()
						}}
					>
						<Trash2 className="w-4 h-4 mr-2" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
