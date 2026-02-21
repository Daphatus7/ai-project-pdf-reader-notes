import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { Note } from '@/frontend/api/types/note/note.ts'
import type { ContentInsertion } from '@/frontend/features/types/content-insertion.ts'
import type { NoteRendererHandle } from './renderer/note-renderer'
import { notesService } from '@/frontend/api/services/notes.service.ts'
import { isQuotaError } from '@/frontend/features/quota/use-quota'

export type ViewMode = 'markdown' | 'editor'

export function useNotePad() {
	// --- Notes list ---
	const [notes, setNotes] = useState<Note[]>([])
	const [selectedNoteId, setSelectedNoteId] = useState('')
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)

	// --- Current document ---
	const contentRef = useRef('')
	const [documentContent, setDocumentContent] = useState('')
	const [activeView, setActiveViewRaw] = useState<ViewMode>('editor')
	const rendererRef = useRef<NoteRendererHandle>(null)
	const lastSavedContent = useRef('')

	// --- Auto-save ---
	const AUTOSAVE_DELAY = 2000
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	function scheduleAutoSave() {
		if (debounceTimer.current) clearTimeout(debounceTimer.current)
		debounceTimer.current = setTimeout(() => {
			saveCurrentNote({ silent: true })
		}, AUTOSAVE_DELAY)
	}

	function cancelAutoSave() {
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current)
			debounceTimer.current = null
		}
	}

	useEffect(() => () => cancelAutoSave(), [])

	// --- Init ---

	useEffect(() => {
		fetchNotes()
	}, [])

	async function fetchNotes() {
		try {
			setIsLoading(true)
			const fetched = await notesService.listNotes()
			if (fetched.length === 0) {
				const created = await notesService.createNote({ title: 'Untitled' })
				setNotes([created])
				applyNote(created)
			} else {
				setNotes(fetched)
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
		contentRef.current = note.content_markdown
		setDocumentContent(note.content_markdown)
		lastSavedContent.current = note.content_markdown
	}

	function handleContentChange(value: string) {
		contentRef.current = value
		scheduleAutoSave()
	}

	function setActiveView(view: ViewMode) {
		setDocumentContent(contentRef.current)
		setActiveViewRaw(view)
	}

	function isDirty() {
		return contentRef.current !== lastSavedContent.current
	}

	// --- Note selection ---

	async function selectNote(id: string) {
		if (id === selectedNoteId) return

		cancelAutoSave()
		if (selectedNoteId && isDirty()) {
			await saveCurrentNote()
		}

		const note = notes.find(n => n.id === id)
		if (note) applyNote(note)
	}

	// --- Save ---

	async function saveCurrentNote({ silent = false } = {}) {
		if (!selectedNoteId || !isDirty()) return

		const note = notes.find(n => n.id === selectedNoteId)
		if (!note) return

		setIsSaving(true)
		try {
			const updated = await notesService.updateNote(selectedNoteId, {
				content_markdown: contentRef.current,
				version: note.version,
			})
			setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
			lastSavedContent.current = contentRef.current
			if (!silent) toast.success('Note saved')
		} catch (error) {
			console.error('[useNotePad] Failed to save note:', error)
			if (!silent) toast.error('Failed to save note')
		} finally {
			setIsSaving(false)
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
			toast.success('Note created')
		} catch (error) {
			console.error('[useNotePad] Failed to create note:', error)
			if (isQuotaError(error)) {
				toast.error('Note limit reached. Upgrade your plan to create more.')
			} else {
				toast.error('Failed to create note')
			}
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
					contentRef.current = ''
					setDocumentContent('')
					lastSavedContent.current = ''
				}
			}
			toast.success('Note deleted')
		} catch (error) {
			console.error('[useNotePad] Failed to delete note:', error)
			toast.error('Failed to delete note')
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
			toast.success('Note renamed')
		} catch (error) {
			console.error('[useNotePad] Failed to rename note:', error)
			toast.error('Failed to rename note')
		}
	}

	// --- Export ---

	// Escape special HTML characters to prevent injection in the print window
	function escapeHtml(s: string) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
	}

	function exportNoteAsMarkdown(id: string) {
		const note = notes.find(n => n.id === id)
		if (!note) return

		const content = id === selectedNoteId ? contentRef.current : note.content_markdown
		const filename = `${note.title || 'Untitled'}.md`

		const blob = new Blob([content], { type: 'text/markdown' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}

	function exportNoteAsPdf(id: string) {
		const note = notes.find(n => n.id === id)
		if (!note) return

		const title = note.title || 'Untitled'

		// Use TipTap's rendered HTML for the active note, fall back to preformatted markdown
		let bodyHtml: string
		if (id === selectedNoteId && rendererRef.current) {
			bodyHtml = rendererRef.current.getHtml()
		} else {
			const escaped = escapeHtml(note.content_markdown)
			bodyHtml = `<pre style="white-space:pre-wrap;font-family:inherit">${escaped}</pre>`
		}

		const win = window.open('', '_blank')
		if (!win) return

		win.document.write(`<!DOCTYPE html>
<html><head>
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:40px 32px;line-height:1.6;color:#1a1a1a}
    h1{font-size:2em;border-bottom:1px solid #eee;padding-bottom:.3em;margin-top:0}
    h2{font-size:1.5em;border-bottom:1px solid #eee;padding-bottom:.3em}
    h3{font-size:1.25em}
    code{background:#f6f8fa;padding:2px 5px;border-radius:3px;font-size:87.5%}
    pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow:auto}
    pre code{background:transparent;padding:0}
    blockquote{border-left:4px solid #d0d7de;margin:0;padding:0 16px;color:#57606a}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #d0d7de;padding:6px 13px}
    th{background:#f6f8fa}
    img{max-width:100%}
    @media print{body{padding:0}}
  </style>
</head><body>
  <h1>${escapeHtml(title)}</h1>
  ${bodyHtml}
</body></html>`)
		win.document.close()
		win.focus()
		win.print()
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
		if (activeView === 'editor' && rendererRef.current) {
			rendererRef.current.insertContent(content, position)
		} else {
			const newContent = contentRef.current + '\n' + content.content
			contentRef.current = newContent
			setDocumentContent(newContent)
		}
	}

	function getContent() {
		return contentRef.current
	}

	function focus() {
		rendererRef.current?.focus()
	}

	return {
		// State
		notes,
		setNotes,
		selectedNoteId,
		documentContent,
		handleContentChange,
		activeView,
		setActiveView,
		rendererRef,
		isLoading,
		isSaving,

		// Note operations
		selectNote,
		addNote,
		saveCurrentNote,
		deleteNote,
		renameNote,
		reorderNotes,
		exportNoteAsMarkdown,
		exportNoteAsPdf,

		// Imperative handle
		insertContent,
		getContent,
		focus,
	}
}
