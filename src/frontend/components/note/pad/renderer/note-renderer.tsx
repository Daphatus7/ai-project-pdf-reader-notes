import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useEditor } from '@tiptap/react'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import { Highlight } from '@tiptap/extension-highlight'
import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Math, { migrateMathStrings } from '@tiptap/extension-mathematics'
import { TableKit } from '@tiptap/extension-table'
import { Youtube } from '@tiptap/extension-youtube'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { ImageUploadNode } from '@/frontend/@/components/tiptap-node/image-upload-node'
import { SimpleEditor } from '@/frontend/@/components/tiptap-templates/simple/simple-editor.tsx'
import type { ContentInsertion } from '@/frontend/features/types/content-insertion.ts'
import { notesService } from '@/frontend/api/services/notes.service'
import 'katex/dist/katex.min.css'

// --- Types ---

export interface NoteRendererHandle {
	insertContent: (content: ContentInsertion, position: 'cursor' | 'end') => void
	getMarkdown: () => string
	focus: () => void
}

interface NoteRendererProps {
	value: string
	noteId: string
	onChange: (value: string) => void
}

// --- Utils ---

function normalizeMathHtml(htmlContent?: string): string | undefined {
	if (!htmlContent) return htmlContent

	try {
		const parser = new DOMParser()
		const doc = parser.parseFromString(
			`<div data-root="math-wrapper">${htmlContent}</div>`,
			'text/html',
		)
		const wrapper = doc.body.firstElementChild as HTMLElement | null
		if (!wrapper) return htmlContent

		const replaceKatex = (element: Element, isDisplay: boolean) => {
			const annotation = element.querySelector('annotation[encoding="application/x-tex"]')
			const latex = annotation?.textContent?.trim()
			if (!latex) return

			const replacement = doc.createElement(isDisplay ? 'div' : 'span')
			replacement.setAttribute('data-type', isDisplay ? 'block-math' : 'inline-math')
			replacement.setAttribute('data-latex', latex)
			replacement.textContent = latex
			element.replaceWith(replacement)
		}

		wrapper.querySelectorAll('.katex-display').forEach(el => replaceKatex(el, true))
		wrapper.querySelectorAll('.katex').forEach(el => {
			if (el.classList.contains('katex-display')) return
			replaceKatex(el, false)
		})

		return wrapper.innerHTML
	} catch {
		return htmlContent
	}
}

// --- Extensions ---

function createExtensions(noteId: string) {
	return [
		Markdown,
		Details,
		TextAlign,
		FontSize,
		TextStyle,
		StarterKit,
		ImageUploadNode.configure({
			maxSize: 10 * 1024 * 1024,
			upload: async (file: File, onProgress) => {
				onProgress?.({ progress: 30 })
				const url = await notesService.uploadImage(file, noteId)
				onProgress?.({ progress: 100 })
				return url
			},
		}),
		DetailsSummary,
		DetailsContent,
		TaskList,
		TaskItem.configure({ nested: true }),
		Youtube.configure({ inline: false, width: 480, height: 320 }),
		Image,
		TableKit.configure({ table: { resizable: true } }),
		Highlight,
		Math,
	]
}

// --- Component ---

export const NoteRenderer = forwardRef<NoteRendererHandle, NoteRendererProps>(
	function NoteRenderer({ value, noteId, onChange }, ref) {
		const isPushing = useRef(false)
		const prevValue = useRef(value)

		const editor = useEditor({
			extensions: createExtensions(noteId),
			content: value,
			contentType: 'markdown',
			editorProps: {
				handlePaste(view, event) {
					const items = event.clipboardData?.items
					if (!items) return false

					for (const item of Array.from(items)) {
						if (!item.type.startsWith('image/')) continue
						const file = item.getAsFile()
						if (!file) continue

						event.preventDefault()
						notesService
							.uploadImage(file, noteId)
							.then((src) => {
								const node = view.state.schema.nodes.image.create({ src, alt: file.name })
								const tr = view.state.tr.replaceSelectionWith(node)
								view.dispatch(tr)
							})
							.catch((error) => {
								// Prevent unhandled promise rejection and inform the user
								// eslint-disable-next-line no-console
								console.error('Image upload failed during paste:', error)
								if (typeof window !== 'undefined') {
									window.alert('Image upload failed. Please try again.')
								}
							})
						return true
					}
					return false
				},
			},
			onUpdate: ({ editor: currentEditor }) => {
				if (isPushing.current) return
				onChange(currentEditor.getMarkdown())
			},
			onCreate: ({ editor: currentEditor }) => {
				migrateMathStrings(currentEditor)
			},
		})

		// Sync external markdown changes into the editor (note switch or tab switch)
		useEffect(() => {
			if (!editor) return
			if (prevValue.current === value) return

			prevValue.current = value
			isPushing.current = true
			editor.commands.setContent(value, { contentType: 'markdown' })
			requestAnimationFrame(() => {
				isPushing.current = false
			})
		}, [editor, value])

		useImperativeHandle(ref, () => ({
			insertContent: (content, position) => {
				if (!editor) return

				if (position === 'end') {
					editor.commands.setTextSelection(editor.state.doc.content.size)
				}

				if (content.htmlContent) {
					const normalized = normalizeMathHtml(content.htmlContent)
					editor.commands.insertContent(normalized || content.htmlContent)
				} else {
					editor.commands.insertContent(content.content, {
						contentType: 'markdown',
						parseOptions: { preserveWhitespace: 'full' },
					})
				}
			},
			getMarkdown: () => editor?.getMarkdown() ?? '',
			focus: () => {
				editor?.commands.focus()
			},
		}), [editor])

		if (!editor) return null

		return <SimpleEditor editor={editor} />
	},
)
