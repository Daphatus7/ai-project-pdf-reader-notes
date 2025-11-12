import {useRef, useState} from 'react'
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
			if (!isPushing.current) {
				setSerializedContent(currentEditor.getMarkdown());
			}
		},
		onCreate: ({ editor: currentEditor }) => {
			setSerializedContent(currentEditor.getMarkdown());
		},
	})
	
	const [activeView, setActiveView] = useState<ViewMode>('editor');
	const [serializedContent, setSerializedContent] = useState('')

	const isPushing = useRef(false);
	
	const applySerializedToEditor = () => {
		if (!editor) return;
		const current = editor.getMarkdown();
		if (serializedContent === current) return;

		isPushing.current = true;
		editor.commands.setContent(serializedContent, { contentType: 'markdown' });
		isPushing.current = false;
	};
	
	return (
		<div className="h-full flex flex-col bg-background">
			<Tabs value={activeView} onValueChange={(v: string) => setActiveView(v as ViewMode)} className="h-full flex flex-col">
				<div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
					<TabsList>
						<TabsTrigger 
							value="markdown"
							// onChange = {parseMarkdown}
						>Markdown</TabsTrigger>
						<TabsTrigger value="editor"
						onClick ={applySerializedToEditor}
						>Editor</TabsTrigger>
						<TabsTrigger value="preview">Preview</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 overflow-hidden relative">
					{/* Markdown view */}
					<TabsContent value="markdown" className="h-full m-0">
						<ScrollArea className="h-full">
							<textarea
								className="markdown-input"
								value={serializedContent}
								onChange={e => setSerializedContent(e.target.value)}
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
								<ReactMarkdown>{serializedContent}</ReactMarkdown>
							</div>
						</ScrollArea>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	)
}

export default NoteTaker
