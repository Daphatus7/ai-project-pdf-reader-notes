import { FileText, Plus } from 'lucide-react'
import { ScrollArea } from '@/frontend/components/ui/scroll-area'
import { Skeleton } from '@/frontend/components/ui/skeleton'
import { NoteCard } from './note-card'
import type { Note } from '@/frontend/api/types/note/note'

interface NoteListPanelProps {
	notes: Note[]
	selectedNoteId: string
	isLoading: boolean
	onSelectNote: (id: string) => void
	onAddNote: () => void
	onDeleteNote: (id: string) => void
	onRenameNote: (id: string, title: string) => void
}

export function NoteListPanel({
	notes,
	selectedNoteId,
	isLoading,
	onSelectNote,
	onAddNote,
	onDeleteNote,
	onRenameNote,
}: NoteListPanelProps) {
	if (isLoading) {
		return (
			<div className="h-full flex flex-col">
				<div className="p-3 flex items-center gap-2 border-b h-13">
					<FileText className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-medium">Notes</span>
				</div>
				<div className="p-4 space-y-3">
					<Skeleton className="h-16 w-full rounded-xl" />
					<Skeleton className="h-16 w-full rounded-xl" />
					<Skeleton className="h-16 w-full rounded-xl" />
				</div>
			</div>
		)
	}

	return (
		<div className="h-full flex flex-col">
			<div className="p-3 flex items-center gap-2 border-b h-13">
				<FileText className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-medium">Notes</span>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-3 flex flex-col gap-3">
					{notes.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
							<p className="text-sm font-medium">No notes yet</p>
							<p className="text-xs mt-1">Create a note to get started</p>
						</div>
					) : (
						notes.map((note) => (
							<NoteCard
								key={note.id}
								note={note}
								isSelected={selectedNoteId === note.id}
								onClick={() => onSelectNote(note.id)}
								onDelete={() => onDeleteNote(note.id)}
								onRename={onRenameNote}
							/>
						))
					)}

					<button
						type="button"
						onClick={onAddNote}
						className="cursor-pointer rounded-xl border border-dashed border-gray-300 hover:border-blue-400 p-4 transition-all duration-200 bg-white hover:bg-blue-50 group"
					>
						<div className="flex items-center justify-center gap-2">
							<div className="p-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
								<Plus className="size-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
							</div>
							<span className="text-[14px] text-gray-600 group-hover:text-blue-600 transition-colors">
								Add New Note
							</span>
						</div>
					</button>
				</div>
			</ScrollArea>
		</div>
	)
}
