import { useState } from 'react'
import { useLanguage } from '@/frontend/i18n/language-context'
import { Button } from '@/frontend/components/ui/button.tsx'
import { ScrollArea } from '@/frontend/components/ui/scroll-area.tsx'
import { Input } from '@/frontend/components/ui/input.tsx'
import {
	Sidebar as LucideSidebar,
	Plus,
	Crown,
	MoreVertical,
	EditIcon,
	Trash2,
	FileDown,
	Printer,
	ChevronDown,
	ChevronRight,
	BookOpen,
	BookPlus,
	FolderSymlink,
} from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu.tsx'
import { cn } from '@/frontend/components/ui/utils.ts'
import { PricingDialog } from '@/frontend/features/pricing/PricingDialog'
import type { Note, Notebook } from '@/frontend/api/types/note/note.ts'
import { useDrag, useDrop } from 'react-dnd'

// Drag item type for moving notes between notebooks
const DRAG_TYPE = 'NOTE'

interface DragItem {
	noteId: string
	currentNotebookId: string | null
}

interface NoteSidebarProps {
	notes: Note[]
	notebooks: Notebook[]
	selectedNoteId: string
	canCreateNote?: boolean
	onSelectNote: (id: string) => void
	onAddNote: (notebookId?: string) => void
	onDeleteNote: (id: string) => void
	onRenameNote: (id: string, title: string) => void
	onExportMarkdown: (id: string) => void
	onExportPdf: (id: string) => void
	onAddNotebook: () => void
	onRenameNotebook: (id: string, name: string) => void
	onDeleteNotebook: (id: string) => void
	onMoveNoteToNotebook: (noteId: string, notebookId: string | null) => void
	onClose: () => void
}

export function NoteSidebar({
	notes,
	notebooks,
	selectedNoteId,
	canCreateNote = true,
	onSelectNote,
	onAddNote,
	onDeleteNote,
	onRenameNote,
	onExportMarkdown,
	onExportPdf,
	onAddNotebook,
	onRenameNotebook,
	onDeleteNotebook,
	onMoveNoteToNotebook,
	onClose,
}: NoteSidebarProps) {
	const [pricingOpen, setPricingOpen] = useState(false)
	const { t } = useLanguage()

	// Drop zone for uncategorised area — dragging a note here removes its notebook
	const [{ isOver: isOverUncategorized }, uncategorizedDropRef] = useDrop<DragItem, void, { isOver: boolean }>({
		accept: DRAG_TYPE,
		canDrop: item => item.currentNotebookId !== null,
		drop: item => onMoveNoteToNotebook(item.noteId, null),
		collect: monitor => ({ isOver: monitor.isOver() && monitor.canDrop() }),
	})

	const handleNewNote = (notebookId?: string) => {
		if (canCreateNote) {
			onAddNote(notebookId)
		} else {
			setPricingOpen(true)
		}
	}

	// Notes without a notebook appear at root level
	const uncategorisedNotes = notes.filter(n => !n.notebook_id)

	return (
		<div className="w-1/2 border-l flex flex-col h-full bg-panel">
			{/* Header */}
			<div className="p-3 border-b flex items-center justify-between h-13">
				<span className="text-sm font-medium">{t.notes.sidebarTitle}</span>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
					<LucideSidebar className="h-4 w-4" />
				</Button>
			</div>

			{/* Action bar: New Note + New Notebook */}
			<div className="p-3 border-b flex gap-2">
				<Button className="flex-1" size="sm" onClick={() => handleNewNote()}>
					{canCreateNote
						? <Plus className="w-4 h-4 mr-2" />
						: <Crown className="w-4 h-4 mr-2 text-amber-500" />
					}
					{canCreateNote ? t.notes.newNote : t.notes.upgrade}
				</Button>
				<Button variant="outline" size="sm" onClick={onAddNotebook} title={t.notes.newNotebook}>
					<BookPlus className="w-4 h-4" />
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2 flex flex-col gap-1">
					{/* Uncategorised notes at root level — drop here to remove notebook assignment */}
					<div
						ref={uncategorizedDropRef}
						className={cn(
							'rounded-md transition-colors',
							isOverUncategorized && 'bg-accent/20 ring-1 ring-accent',
						)}
					>
						{uncategorisedNotes.map(note => (
							<NoteItem
								key={note.id}
								note={note}
								notebooks={notebooks}
								isActive={selectedNoteId === note.id}
								onSelect={() => onSelectNote(note.id)}
								onDelete={() => onDeleteNote(note.id)}
								onRename={title => onRenameNote(note.id, title)}
								onExportMarkdown={() => onExportMarkdown(note.id)}
								onExportPdf={() => onExportPdf(note.id)}
								onMoveToNotebook={notebookId => onMoveNoteToNotebook(note.id, notebookId)}
							/>
						))}
					</div>

					{/* Notebook sections below */}
					{notebooks.map(notebook => (
						<NotebookSection
							key={notebook.id}
							notebook={notebook}
							notes={notes.filter(n => n.notebook_id === notebook.id)}
							allNotebooks={notebooks}
							selectedNoteId={selectedNoteId}
							canCreateNote={canCreateNote}
							onSelectNote={onSelectNote}
							onAddNote={() => handleNewNote(notebook.id)}
							onDeleteNote={onDeleteNote}
							onRenameNote={onRenameNote}
							onExportMarkdown={onExportMarkdown}
							onExportPdf={onExportPdf}
							onRenameNotebook={name => onRenameNotebook(notebook.id, name)}
							onDeleteNotebook={() => onDeleteNotebook(notebook.id)}
							onMoveNoteToNotebook={onMoveNoteToNotebook}
						/>
					))}
				</div>
			</ScrollArea>

			<PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
		</div>
	)
}

// ==================== NotebookSection ====================

interface NotebookSectionProps {
	notebook: Notebook
	notes: Note[]
	allNotebooks: Notebook[]
	selectedNoteId: string
	canCreateNote: boolean
	onSelectNote: (id: string) => void
	onAddNote: () => void
	onDeleteNote: (id: string) => void
	onRenameNote: (id: string, title: string) => void
	onExportMarkdown: (id: string) => void
	onExportPdf: (id: string) => void
	onRenameNotebook: (name: string) => void
	onDeleteNotebook: () => void
	onMoveNoteToNotebook: (noteId: string, notebookId: string | null) => void
}

function NotebookSection({
	notebook,
	notes,
	allNotebooks,
	selectedNoteId,
	onSelectNote,
	onAddNote,
	onDeleteNote,
	onRenameNote,
	onExportMarkdown,
	onExportPdf,
	onRenameNotebook,
	onDeleteNotebook,
	onMoveNoteToNotebook,
}: NotebookSectionProps) {
	const { t } = useLanguage()
	// Persist expanded state per notebook in localStorage so it survives sidebar close/reopen
	const storageKey = `notebook-expanded-${notebook.id}`
	const [isExpanded, setIsExpanded] = useState(() => {
		const saved = localStorage.getItem(storageKey)
		return saved === null ? true : saved === 'true'
	})
	const toggleExpanded = () => {
		setIsExpanded(prev => {
			const next = !prev
			localStorage.setItem(storageKey, String(next))
			return next
		})
	}
	const [isEditing, setIsEditing] = useState(false)
	const [editName, setEditName] = useState(notebook.name)

	// Drop target — dragging a note onto this notebook header moves it here
	const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
		accept: DRAG_TYPE,
		canDrop: item => item.currentNotebookId !== notebook.id,
		drop: item => onMoveNoteToNotebook(item.noteId, notebook.id),
		collect: monitor => ({
			isOver: monitor.isOver(),
			canDrop: monitor.canDrop(),
		}),
	})

	const handleSaveEdit = () => {
		if (editName.trim() && editName !== notebook.name) {
			onRenameNotebook(editName.trim())
		}
		setIsEditing(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') handleSaveEdit()
		else if (e.key === 'Escape') {
			setEditName(notebook.name)
			setIsEditing(false)
		}
	}

	return (
		<div>
			{/* Notebook header row */}
			<div
				ref={dropRef}
				className={cn(
					'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group hover:bg-muted/50 transition-colors',
					isOver && canDrop && 'bg-accent/30 ring-1 ring-accent',
				)}
				onClick={() => !isEditing && toggleExpanded()}
			>
				{/* Expand / collapse chevron */}
				{isExpanded
					? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
					: <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
				}

				<BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

				{/* Notebook name — inline edit on rename */}
				{isEditing ? (
					<Input
						autoFocus
						value={editName}
						onChange={e => setEditName(e.target.value)}
						onBlur={handleSaveEdit}
						onKeyDown={handleKeyDown}
						onClick={e => e.stopPropagation()}
						className="h-5 text-xs px-1 py-0 flex-1"
					/>
				) : (
					<span className="flex-1 text-xs font-medium text-muted-foreground truncate">
						{notebook.name}
					</span>
				)}

				{/* Note count */}
				{notes.length > 0 && (
					<span className="text-xs text-muted-foreground/60">{notes.length}</span>
				)}

				{/* Add note inside this notebook */}
				<Button
					variant="ghost"
					size="icon"
					className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
					title={t.notes.newNoteInNotebook}
					onClick={e => { e.stopPropagation(); onAddNote() }}
				>
					<Plus className="h-3 w-3" />
				</Button>

				{/* Notebook actions dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
							onClick={e => e.stopPropagation()}
						>
							<MoreVertical className="h-3 w-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={e => { e.stopPropagation(); setIsEditing(true) }}>
							<EditIcon className="w-4 h-4 mr-2" />
							{t.notes.rename}
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onClick={e => { e.stopPropagation(); onDeleteNotebook() }}
						>
							<Trash2 className="w-4 h-4 mr-2" />
							{t.notes.delete}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Notes inside notebook (indented) */}
			{isExpanded && (
				<div className="pl-3">
					{notes.map(note => (
						<NoteItem
							key={note.id}
							note={note}
							notebooks={allNotebooks}
							isActive={selectedNoteId === note.id}
							onSelect={() => onSelectNote(note.id)}
							onDelete={() => onDeleteNote(note.id)}
							onRename={title => onRenameNote(note.id, title)}
							onExportMarkdown={() => onExportMarkdown(note.id)}
							onExportPdf={() => onExportPdf(note.id)}
							onMoveToNotebook={notebookId => onMoveNoteToNotebook(note.id, notebookId)}
						/>
					))}
				</div>
			)}
		</div>
	)
}

// ==================== NoteItem ====================

interface NoteItemProps {
	note: Note
	notebooks: Notebook[]
	isActive: boolean
	onSelect: () => void
	onDelete: () => void
	onRename: (title: string) => void
	onExportMarkdown: () => void
	onExportPdf: () => void
	onMoveToNotebook: (notebookId: string | null) => void
}

function NoteItem({
	note,
	notebooks,
	isActive,
	onSelect,
	onDelete,
	onRename,
	onExportMarkdown,
	onExportPdf,
	onMoveToNotebook,
}: NoteItemProps) {
	const { t } = useLanguage()
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState(note.title)

	// Drag source — note can be dragged to any notebook or uncategorized area
	const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
		type: DRAG_TYPE,
		item: { noteId: note.id, currentNotebookId: note.notebook_id },
		canDrag: !isEditing,
		collect: monitor => ({ isDragging: monitor.isDragging() }),
	})

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
			ref={dragRef}
			className={cn(
				'flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-grab transition-colors group',
				isActive
					? 'bg-accent'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground',
				isDragging && 'opacity-40 cursor-grabbing',
			)}
			onClick={isEditing ? undefined : onSelect}
		>
			{isEditing ? (
				<Input
					autoFocus
					value={editValue}
					onChange={e => setEditValue(e.target.value)}
					onBlur={handleSaveEdit}
					onKeyDown={handleKeyDown}
					onClick={e => e.stopPropagation()}
					className="h-6 text-sm px-1 py-0 flex-1"
				/>
			) : (
				<span className="truncate flex-1">{note.title || t.notes.untitled}</span>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
						onClick={e => e.stopPropagation()}
					>
						<MoreVertical className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={e => { e.stopPropagation(); handleStartEdit() }}>
						<EditIcon className="w-4 h-4 mr-2" />
						{t.notes.rename}
					</DropdownMenuItem>

					{/* Move to notebook sub-menu */}
					<DropdownMenuSub>
						<DropdownMenuSubTrigger onClick={e => e.stopPropagation()}>
							<FolderSymlink className="w-4 h-4 mr-2" />
							{t.notes.moveToNotebook}
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{note.notebook_id && (
								<>
									<DropdownMenuItem onClick={() => onMoveToNotebook(null)}>
										{t.notes.removeFromNotebook}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
								</>
							)}
							{notebooks.map(nb => (
								<DropdownMenuItem
									key={nb.id}
									disabled={note.notebook_id === nb.id}
									onClick={() => onMoveToNotebook(nb.id)}
								>
									<BookOpen className="w-4 h-4 mr-2" />
									{nb.name}
								</DropdownMenuItem>
							))}
							{notebooks.length === 0 && (
								<DropdownMenuItem disabled>{t.notes.noNotebooksYet}</DropdownMenuItem>
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuSeparator />

					{/* Export actions */}
					<DropdownMenuItem onClick={e => { e.stopPropagation(); onExportMarkdown() }}>
						<FileDown className="w-4 h-4 mr-2" />
						{t.notes.exportMarkdown}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={e => { e.stopPropagation(); onExportPdf() }}>
						<Printer className="w-4 h-4 mr-2" />
						{t.notes.exportPdf}
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						variant="destructive"
						onClick={e => { e.stopPropagation(); onDelete() }}
					>
						<Trash2 className="w-4 h-4 mr-2" />
						{t.notes.delete}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
