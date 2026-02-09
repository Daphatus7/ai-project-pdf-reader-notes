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
import 'katex/dist/katex.min.css'

// --- Types ---

export interface NoteRendererHandle {
	insertContent: (content: ContentInsertion, position: 'cursor' | 'end') => void
	getMarkdown: () => string
	focus: () => void
}

interface NoteRendererProps {
	value: string
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

function createExtensions() {
	return [
		Markdown,
		Details,
		TextAlign,
		FontSize,
		TextStyle,
		StarterKit,
		ImageUploadNode,
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
	function NoteRenderer({ value, onChange }, ref) {
		const isPushing = useRef(false)

		const editor = useEditor({
			extensions: createExtensions(),
			content: value,
			contentType: 'markdown',
			onUpdate: ({ editor: currentEditor }) => {
				if (isPushing.current) return
				onChange(currentEditor.getMarkdown())
			},
			onCreate: ({ editor: currentEditor }) => {
				migrateMathStrings(currentEditor)
			},
		})

		// Sync external markdown changes into the editor
		useEffect(() => {
			if (!editor) return
			if (editor.getMarkdown() === value) return

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
