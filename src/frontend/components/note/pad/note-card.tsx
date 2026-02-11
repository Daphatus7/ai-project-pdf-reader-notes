import { useState } from 'react'
import { FileText, MoreVertical, EditIcon, Trash2 } from 'lucide-react'
import { Button } from '@/frontend/components/ui/button'
import { Input } from '@/frontend/components/ui/input'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu'
import { cn } from '@/frontend/components/ui/utils'
import type { Note } from '@/frontend/api/types/note/note'

function formatRelativeDate(dateString: string): string {
	const date = new Date(dateString)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return 'Yesterday'
	if (diffDays < 7) return `${diffDays} days ago`
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
	return `${Math.floor(diffDays / 30)} months ago`
}

interface NoteCardProps {
	note: Note
	isSelected: boolean
	onClick: () => void
	onDelete: () => void
	onRename: (id: string, title: string) => void
}

export function NoteCard({ note, isSelected, onClick, onDelete, onRename }: NoteCardProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState(note.title)

	const handleStartEdit = () => {
		setEditValue(note.title)
		setIsEditing(true)
	}

	const handleSaveEdit = () => {
		if (editValue.trim() && editValue !== note.title) {
			onRename(note.id, editValue.trim())
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
			onClick={isEditing ? undefined : onClick}
			className={cn(
				'group relative cursor-pointer rounded-xl border p-3 transition-all duration-200 hover:shadow-md',
				isSelected && 'border-primary/50 bg-primary/5',
			)}
		>
			<div className="flex items-start gap-3">
				<div className="mt-0.5 p-2 rounded-lg bg-blue-100 text-blue-600 transition-colors">
					<FileText className="size-4" />
				</div>

				<div className="flex-1 min-w-0">
					{isEditing ? (
						<Input
							autoFocus
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							onBlur={handleSaveEdit}
							onKeyDown={handleKeyDown}
							onClick={(e) => e.stopPropagation()}
							className="h-7 text-sm px-1 py-0"
						/>
					) : (
						<p className="text-md truncate">{note.title}</p>
					)}

					{note.summary && (
						<p className="text-xs text-muted-foreground line-clamp-2 mt-1">
							{note.summary}
						</p>
					)}

					<span className="text-xs text-muted-foreground mt-2 block">
						{formatRelativeDate(note.updated_at)}
					</span>
				</div>

				<div className="opacity-0 group-hover:opacity-100 transition-opacity">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-7"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreVertical className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation()
									handleStartEdit()
								}}
							>
								<EditIcon className="size-4" />
								Rename
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={(e) => {
									e.stopPropagation()
									onDelete()
								}}
							>
								<Trash2 className="size-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	)
}
