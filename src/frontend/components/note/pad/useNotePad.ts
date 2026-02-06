import { useState, useRef, useEffect } from 'react'
import type { Note } from '@/frontend/api/types/note.ts'
import type { ContentInsertion } from '@/frontend/features/types/content-insertion.ts'
import type { NoteRendererHandle } from './renderer/note-renderer'
import { notesService } from '@/frontend/api/services/notes.service.ts'

export type ViewMode = 'markdown' | 'editor'

export function useNotePad() {
	// --- Notes list ---
	const [notes, setNotes] = useState<Note[]>([])
	const [selectedNoteId, setSelectedNoteId] = useState('')
	const [isLoading, setIsLoading] = useState(true)

	// --- Current document ---
	const [markdownContent, setMarkdownContent] = useState('')
	const [activeView, setActiveView] = useState<ViewMode>('editor')
	const rendererRef = useRef<NoteRendererHandle>(null)
	const lastSavedContent = useRef('')

	// --- Init ---

	useEffect(() => {
		fetchNotes()
	}, [])

	async function fetchNotes() {
		try {
			setIsLoading(true)
			const fetched = await notesService.listNotes()
			setNotes(fetched)
			if (fetched.length > 0) {
				applyNote(fetched[0])
			}
		} catch (error) {
			console.error('[useNotePad] Failed to fetch notes:', error)
		} finally {
			setIsLoading(false)
		}
	}

	function applyNote(note: Note) {
		setSelectedNoteId(note.id)
		setMarkdownContent(note.content_markdown)
		lastSavedContent.current = note.content_markdown
	}

	function isDirty() {
		return markdownContent !== lastSavedContent.current
	}

	// --- Note selection ---

	async function selectNote(id: string) {
		if (id === selectedNoteId) return

		if (selectedNoteId && isDirty()) {
			await saveCurrentNote()
		}

		const note = notes.find(n => n.id === id)
		if (note) applyNote(note)
	}

	// --- Save ---

	async function saveCurrentNote() {
		if (!selectedNoteId || !isDirty()) return

		const note = notes.find(n => n.id === selectedNoteId)
		if (!note) return

		try {
			const updated = await notesService.updateNote(selectedNoteId, {
				content_markdown: markdownContent,
				version: note.version,
			})
			setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
			lastSavedContent.current = markdownContent
		} catch (error) {
			console.error('[useNotePad] Failed to save note:', error)
		}
	}

	// --- CRUD ---

	async function addNote() {
		try {
			if (selectedNoteId && isDirty()) {
				await saveCurrentNote()
			}
			const created = await notesService.createNote({ title: 'Untitled' })
			setNotes(prev => [created, ...prev])
			applyNote(created)
		} catch (error) {
			console.error('[useNotePad] Failed to create note:', error)
		}
	}

	async function deleteNote(id: string) {
		try {
			await notesService.deleteNote(id)
			const remaining = notes.filter(n => n.id !== id)
			setNotes(remaining)

			if (selectedNoteId === id) {
				if (remaining.length > 0) {
					applyNote(remaining[0])
				} else {
					setSelectedNoteId('')
					setMarkdownContent('')
					lastSavedContent.current = ''
				}
			}
		} catch (error) {
			console.error('[useNotePad] Failed to delete note:', error)
		}
	}

	async function renameNote(id: string, title: string) {
		const note = notes.find(n => n.id === id)
		if (!note) return

		try {
			const updated = await notesService.updateNote(id, {
				title,
				version: note.version,
			})
			setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
		} catch (error) {
			console.error('[useNotePad] Failed to rename note:', error)
		}
	}

	function reorderNotes(dragIndex: number, hoverIndex: number) {
		setNotes(prev => {
			const updated = [...prev]
			const [removed] = updated.splice(dragIndex, 1)
			updated.splice(hoverIndex, 0, removed)
			return updated
		})
	}

	// --- Imperative interface (exposed to parent via ref) ---

	function insertContent(content: ContentInsertion, position: 'cursor' | 'end' = 'cursor') {
		if (activeView === 'editor') {
			rendererRef.current?.insertContent(content, position)
		} else {
			setMarkdownContent(prev => prev + '\n' + content.content)
		}
	}

	function getContent() {
		return markdownContent
	}

	function focus() {
		rendererRef.current?.focus()
	}

	return {
		// State
		notes,
		setNotes,
		selectedNoteId,
		markdownContent,
		setMarkdownContent,
		activeView,
		setActiveView,
		rendererRef,
		isLoading,

		// Sidebar operations
		selectNote,
		addNote,
		deleteNote,
		renameNote,
		reorderNotes,

		// Imperative handle
		insertContent,
		getContent,
		focus,
	}
}
