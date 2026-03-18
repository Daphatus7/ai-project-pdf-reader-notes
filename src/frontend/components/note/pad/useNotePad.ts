import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { Note, Notebook } from '@/frontend/api/types/note/note.ts'
import type { ContentInsertion } from '@/frontend/features/types/content-insertion.ts'
import type { NoteRendererHandle } from './renderer/note-renderer'
import { notesService } from '@/frontend/api/services/notes.service.ts'
import { notebooksService } from '@/frontend/api/services/notebooks.service.ts'
import { isQuotaError } from '@/frontend/features/quota/use-quota'

// --- PDF export pipeline (unified + remark/rehype) ---
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import katexCss from 'katex/dist/katex.min.css?raw'

// Convert markdown to HTML using the unified pipeline; rehype-katex handles math equations
async function markdownToHtml(markdown: string): Promise<string> {
	const file = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkMath)
		.use(remarkRehype)
		.use(rehypeKatex)
		.use(rehypeStringify)
		.process(markdown)
	return String(file)
}

export type ViewMode = 'markdown' | 'editor'

export function useNotePad() {
	// --- Notes list ---
	const [notes, setNotes] = useState<Note[]>([])
	const [selectedNoteId, setSelectedNoteId] = useState('')
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)

	// --- Notebooks ---
	const [notebooks, setNotebooks] = useState<Notebook[]>([])

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
		fetchNotesAndNotebooks()
	}, [])

	// Fetch notes and notebooks in parallel on init
	async function fetchNotesAndNotebooks() {
		try {
			setIsLoading(true)
			const [fetched, fetchedNotebooks] = await Promise.all([
				notesService.listNotes(),
				notebooksService.listNotebooks(),
			])
			setNotebooks(fetchedNotebooks)
			if (fetched.length === 0) {
				const created = await notesService.createNote({ title: 'Untitled' })
				setNotes([created])
				applyNote(created)
			} else {
				setNotes(fetched)
				applyNote(fetched[0])
			}
		} catch (error) {
			console.error('[useNotePad] Failed to initialise:', error)
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

	async function addNote(notebookId?: string) {
		try {
			if (selectedNoteId && isDirty()) {
				await saveCurrentNote()
			}
			const created = await notesService.createNote({ title: 'Untitled', notebook_id: notebookId })
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

	// --- Notebook CRUD ---

	async function addNotebook() {
		try {
			const created = await notebooksService.createNotebook({ name: 'Untitled Notebook' })
			setNotebooks(prev => [...prev, created])
			toast.success('Notebook created')
		} catch (error) {
			console.error('[useNotePad] Failed to create notebook:', error)
			toast.error('Failed to create notebook')
		}
	}

	async function renameNotebook(id: string, name: string) {
		try {
			const updated = await notebooksService.updateNotebook(id, { name })
			setNotebooks(prev => prev.map(nb => nb.id === updated.id ? updated : nb))
		} catch (error) {
			console.error('[useNotePad] Failed to rename notebook:', error)
			toast.error('Failed to rename notebook')
		}
	}

	async function deleteNotebook(id: string) {
		try {
			await notebooksService.deleteNotebook(id)
			setNotebooks(prev => prev.filter(nb => nb.id !== id))
			// Reflect ON DELETE SET NULL — uncategorise notes that were in this notebook
			setNotes(prev => prev.map(n => n.notebook_id === id ? { ...n, notebook_id: null } : n))
			toast.success('Notebook deleted')
		} catch (error) {
			console.error('[useNotePad] Failed to delete notebook:', error)
			toast.error('Failed to delete notebook')
		}
	}

	async function moveNoteToNotebook(noteId: string, notebookId: string | null) {
		const note = notes.find(n => n.id === noteId)
		if (!note) return
		try {
			const updated = await notesService.updateNote(noteId, {
				version: note.version,
				notebook_id: notebookId,
			})
			setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
		} catch (error) {
			console.error('[useNotePad] Failed to move note:', error)
			toast.error('Failed to move note')
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

	async function exportNoteAsPdf(id: string) {
		const note = notes.find(n => n.id === id)
		if (!note) return

		const title = note.title || 'Untitled'
		const exportDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

		// Always use the markdown source for a clean, library-rendered HTML (handles math, tables, GFM)
		const content = id === selectedNoteId ? contentRef.current : note.content_markdown
		const bodyHtml = await markdownToHtml(content)

		const win = window.open('', '_blank')
		if (!win) return

		win.document.write(`<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    /* KaTeX math styles (inlined from katex package) */
    ${katexCss}

    @page { size: A4; margin: 2.5cm 2cm 3cm; }

    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.65;
      color: #1a1a1a;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }

    /* Document title */
    .doc-title {
      font-size: 22pt;
      font-weight: 700;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 0.3em;
      margin-bottom: 0.2em;
    }
    .doc-meta { font-size: 8.5pt; color: #6e7781; margin-bottom: 2em; }

    /* Headings */
    h1 { font-size: 17pt; font-weight: 700; margin: 1.4em 0 0.4em; break-after: avoid; }
    h2 { font-size: 14pt; font-weight: 700; margin: 1.2em 0 0.35em; border-bottom: 1px solid #e8eaed; padding-bottom: 0.2em; break-after: avoid; }
    h3 { font-size: 12pt; font-weight: 600; margin: 1em 0 0.3em; break-after: avoid; }
    h4 { font-size: 10.5pt; font-weight: 600; margin: 0.8em 0 0.25em; break-after: avoid; }

    p { margin: 0 0 0.8em; orphans: 3; widows: 3; }

    /* Inline code */
    code {
      font-family: ui-monospace, 'Cascadia Code', 'Courier New', monospace;
      font-size: 8.5pt;
      background: #f3f4f6;
      border: 1px solid #e2e4e7;
      border-radius: 3px;
      padding: 1px 5px;
    }

    /* Code blocks */
    pre {
      font-family: ui-monospace, 'Cascadia Code', 'Courier New', monospace;
      font-size: 8.5pt;
      line-height: 1.5;
      background: #f3f4f6;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 12px 16px;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 1em 0;
      break-inside: avoid;
    }
    pre code { background: transparent; border: none; padding: 0; }

    blockquote {
      border-left: 4px solid #d0d7de;
      padding: 0.4em 1em;
      margin: 1em 0;
      color: #57606a;
      break-inside: avoid;
    }

    ul, ol { margin: 0.6em 0; padding-left: 1.5em; }
    li { margin: 0.2em 0; }
    li > ul, li > ol { margin: 0.2em 0; }

    /* GFM task lists (remark-gfm outputs .contains-task-list / .task-list-item) */
    ul.contains-task-list { list-style: none; padding-left: 0.25em; }
    li.task-list-item { display: flex; align-items: flex-start; gap: 0.5em; }
    li.task-list-item input[type="checkbox"] { margin-top: 3px; flex-shrink: 0; }
    li.task-list-item:has(input:checked) { color: #6e7781; text-decoration: line-through; }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      font-size: 9.5pt;
      break-inside: avoid;
    }
    th, td { border: 1px solid #d0d7de; padding: 7px 12px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(even) td { background: #fafbfc; }

    img { max-width: 100%; height: auto; break-inside: avoid; display: block; margin: 0.75em 0; }

    hr { border: none; border-top: 1px solid #d0d7de; margin: 1.5em 0; }

    a { color: #0969da; text-decoration: underline; }

    mark { background: #fff3b0; padding: 1px 2px; border-radius: 2px; }

    /* KaTeX block math centering */
    .math-display { text-align: center; margin: 1em 0; overflow-x: auto; }
  </style>
</head><body>
  <p class="doc-title">${escapeHtml(title)}</p>
  <p class="doc-meta">Exported on ${exportDate}</p>
  ${bodyHtml}
  <script>window.onload = function () { window.print(); }<\/script>
</body></html>`)
		win.document.close()
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

		// Notebook state
		notebooks,

		// Notebook operations
		addNotebook,
		renameNotebook,
		deleteNotebook,
		moveNoteToNotebook,

		// Imperative handle
		insertContent,
		getContent,
		focus,
	}
}
