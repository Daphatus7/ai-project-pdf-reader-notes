import { useState } from 'react'
import { EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import type { Note } from '../App'
import { createBlockMarkdownSpec, Node } from '@tiptap/core'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import { Highlight } from '@tiptap/extension-highlight'
import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Mention } from '@tiptap/extension-mention'
import { TableKit } from '@tiptap/extension-table'
import { Youtube } from '@tiptap/extension-youtube'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

import { mdContent } from './content.js'
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@@/components/ui/tabs.tsx";
import {ScrollArea} from "@@/components/ui/scroll-area.tsx";
import ReactMarkdown from "react-markdown";

interface NoteTakerProps {
	note?: Note
}

type ViewMode = 'markdown' | 'preview' | 'editor'

const CustomReactComponent = ({ node }: any) => {
	return (
		<NodeViewWrapper className="custom-react-node">
			<div
				style={{
					border: '2px solid #3b82f6',
					borderRadius: '8px',
					padding: '16px',
					margin: '8px 0',
					backgroundColor: '#eff6ff',
				}}
			>
				<h4 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>Custom React Component</h4>
				<p style={{ margin: 0, color: '#374151' }}>{node.attrs.content || 'This is a custom React node view!'}</p>
				<div>
					<NodeViewContent />
				</div>
			</div>
		</NodeViewWrapper>
	)
}

// Custom node extension with React node view
const CustomReactNode = Node.create({
	name: 'customReactNode',

	group: 'block',

	content: 'block+',

	addAttributes() {
		return {
			content: {
				default: 'This is a custom React node view!',
			},
		}
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="custom-react-node"]',
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', { 'data-type': 'custom-react-node', ...HTMLAttributes }, 0]
	},

	addNodeView() {
		return ReactNodeViewRenderer(CustomReactComponent)
	},

	markdownTokenName: 'customReactNode',

	...createBlockMarkdownSpec({
		nodeName: 'customReactNode',
		name: 'react',
	}),
})


export function NoteTaker({ note }: NoteTakerProps) {
	const [markdownInput, setMarkdownInput] = useState(mdContent)
	const [error, setError] = useState<string | null>(null)

	const editor = useEditor({
		extensions: [
			Markdown,
			StarterKit,
			Details,
			DetailsSummary,
			DetailsContent,
			TaskList,
			TaskItem.configure({
				nested: true,
			}),
			Youtube.configure({
				inline: false,
				width: 480,
				height: 320,
			}),
			Image,
			TableKit,
			Highlight,
			Mention.configure({
				HTMLAttributes: {
					class: 'mention',
				},
				suggestion: {
					items: ({ query }) => {
						return [
							'Lea Thompson',
							'Cyndi Lauper',
							'Tom Cruise',
							'Madonna',
							'Jerry Hall',
							'Joan Collins',
							'Winona Ryder',
							'Christina Applegate',
						]
							.filter(item => item.toLowerCase().startsWith(query.toLowerCase()))
							.slice(0, 5)
					},
				},
			}),
			Mathematics,
			CustomReactNode,
		],
		content: '# Markdown Test\n\nClick **"Parse Markdown"** to load content from the left panel.',
		contentType: 'markdown',
		onUpdate: ({ editor: currentEditor }) => {
			setSerializedContent(currentEditor.getMarkdown())
		},
		onCreate: ({ editor: currentEditor }) => {
			setSerializedContent(currentEditor.getMarkdown())
		},
	})

	
	// A function to parse the markdown input and update the editor content
	const parseMarkdown = () => {
		if (!editor || !editor.markdown) {
			setError('Editor or MarkdownManager not available')
			return
		}

		try {
			setError(null)
			editor.commands.setContent(markdownInput, { contentType: 'markdown' })
		} catch (err) {
			console.error(err)
			setError(`Error parsing markdown: ${err instanceof Error ? err.message : String(err)}`)
		}
	}
	
	// A function to extract the markdown content from the editor and update the input field
	const getEditorAsMarkdown = () => {
		if (!editor) {
			return 'error: editor not available'
		}
		try {
			return editor.getMarkdown()
		} catch {
			return "error: could not extract markdown from editor"
		}
	}
	const [activeView, setActiveView] = useState<ViewMode>('editor');
	const [serializedContent, setSerializedContent] = useState('')
	
	const applyMarkdownToEditor = () => {}
	
	const getPreviewMarkdown = () => {}
	
	return (
		<div className="h-full flex flex-col bg-background">
			<Tabs value={activeView} onValueChange={(v: string) => setActiveView(v as ViewMode)} className="h-full flex flex-col">
				<div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
					<TabsList>
						<TabsTrigger 
							value="markdown"
							onChange = {parseMarkdown}
						>Markdown</TabsTrigger>
						<TabsTrigger value="editor">Editor</TabsTrigger>
						<TabsTrigger value="preview">Preview</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 overflow-hidden relative">
					{/* Markdown view */}
					<TabsContent value="markdown" className="h-full m-0">
						<ScrollArea className="h-full">
							<textarea
								className="markdown-input"
								value={getEditorAsMarkdown()}
								onChange={e => setMarkdownInput(e.target.value)}
								placeholder="Enter markdown here..."
							/>
						</ScrollArea>
					</TabsContent>

					{/* Editor view */}
					<TabsContent value="editor" className="h-full m-0">
						<ScrollArea className="h-full">
							{editor && <EditorContent editor={editor} />}
						</ScrollArea>
					</TabsContent>

					{/* Preview view */}
					<TabsContent value="preview" className="h-full m-0">
						<ScrollArea className="h-full">
							<div className="p-4 prose prose-sm max-w-none">
								<ReactMarkdown>{getEditorAsMarkdown()}</ReactMarkdown>
							</div>
						</ScrollArea>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	)
}

export default NoteTaker
