import {useRef, useState, forwardRef, useImperativeHandle} from 'react'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import type { Note } from '../../App.tsx'
import type { NoteTakerHandle } from '../types/content-insertion.ts'
import { createBlockMarkdownSpec, Node } from '@tiptap/core'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import { Highlight } from '@tiptap/extension-highlight'
import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { migrateMathStrings } from '@tiptap/extension-mathematics'
import { Mathematics } from '@tiptap/extension-mathematics'

import { Mention } from '@tiptap/extension-mention'
import { TableKit } from '@tiptap/extension-table'
import { Youtube } from '@tiptap/extension-youtube'
import { Gapcursor } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'


import {Tabs, TabsContent, TabsList, TabsTrigger} from "@@/frontend/web/components/ui/tabs.tsx";

import {SimpleEditor} from "@@/frontend/@/components/tiptap-templates/simple/simple-editor.tsx";

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


/**
 * Note Taker component with TipTap editor.
 * 
 * Provides a markdown editor with multiple view modes:
 * - Markdown: Raw markdown text editing
 * - Editor: WYSIWYG editor with markdown support
 * 
 * Exposes imperative handle for programmatic content insertion.
 * 
 * @param note - Optional note to load
 */
export const NoteTaker = 
	forwardRef<NoteTakerHandle, NoteTakerProps>(function NoteTaker({ note }, ref) {
	const editor = useEditor({
		extensions: [
			Markdown,
			StarterKit,
			Details,
			DetailsSummary,
			DetailsContent,
			TaskList,
			Gapcursor,
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
			Mathematics,
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
			migrateMathStrings(currentEditor);
		},
		
	})

	const toggleEditable = () => {
		editor.setEditable(!editor.isEditable)
		editor.view.dispatch(editor.view.state.tr)
	}
	
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

	/**
	 * Exposes imperative handle for parent components to insert content programmatically.
	 */
	useImperativeHandle(ref, () => ({
		/**
		 * Inserts markdown content into the editor at the specified position.
		 * 
		 * @param content - Markdown content to insert
		 * @param position - Where to insert: 'cursor' (current cursor position) or 'end' (end of document)
		 */
		insertContent: (content: any, position: 'cursor' | 'end' = 'cursor') => {
			if (!editor) {
				console.warn('[NoteTaker] Editor not ready, cannot insert content');
				return;
			}
			
			try {
				// Ensure we're in editor view for insertion
				if (activeView !== 'editor') {
					// // setActiveView('editor');
					// // Wait for view to switch before inserting
					setTimeout(() => {
						insertContentInternal(content, position);
					}, 100);
				} else {
					insertContentInternal(content, position);
				}
			} catch (error) {
				console.error('[NoteTaker] Failed to insert content:', error);
			}
		},

		/**
		 * Focuses the editor.
		 */
		focus: () => {
			return
			// if (!editor) return;
			//
			// // Switch to editor view if not already
			// if (activeView !== 'editor') {
			// 	setActiveView('editor');
			// 	setTimeout(() => {
			// 		editor.commands.focus();
			// 	}, 100);
			// } else {
			// 	editor.commands.focus();
			// }
		},

		/**
		 * Gets the underlying TipTap editor instance.
		 * 
		 * @returns Editor instance or null if not initialized
		 */
		getEditor: () => editor,
	}), [editor, activeView]);

	/**
	 * Internal helper to insert content into the editor.
	 * 
	 * @param content - Content insertion payload with HTML or markdown
	 * @param position - Where to insert
	 */
	const insertContentInternal = (content: any, position: 'cursor' | 'end') => {
		if (!editor) return;
		console.log("The content ------>", content);

		// Prefer HTML content if available, otherwise fall back to markdown
		const contentToInsert = content.htmlContent || content.content;
		console.log("inserting ------->>>>", contentToInsert);

		if (content.htmlContent) {
			// Insert HTML content
			if (position === 'cursor') {
				// Insert HTML at cursor position
				editor.commands.insertContent(content.htmlContent);
			} else {
				// Move to end and insert HTML
				editor.commands.setTextSelection(editor.state.doc.content.size);
				editor.commands.insertContent(content.htmlContent);
			}
		} else {
			// Fall back to markdown insertion
			if (position === 'cursor') {
				editor.commands.insertContent(content.content, {
					contentType: 'markdown',
					parseOptions: { preserveWhitespace: "full" }
				});
			} else {
				editor.commands.setTextSelection(editor.state.doc.content.size);
				editor.commands.insertContent(content.content, {
					contentType: 'markdown',
					parseOptions: { preserveWhitespace: "full" }
				});
			}
		}
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
						{/*<TabsTrigger value="preview">Preview</TabsTrigger>*/}
					</TabsList>
				</div>

				<div className="flex-1 overflow-hidden relative">
					{/* Markdown view */}
					<TabsContent value="markdown" className="h-full m-0 p-0 flex flex-col">
						<textarea
							className="markdown-input w-full h-full font-mono p-4 text-sm"
							value={serializedContent}
							onChange={e => setSerializedContent(e.target.value)}
						/>
					</TabsContent>

					{/* Editor view */}
					<TabsContent value="editor" className="h-full m-0">
						{/*<ScrollArea className="h-full">*/}
						{/*	{editor && <EditorContent editor={editor} />}*/}
						{/*</ScrollArea>*/}
						<SimpleEditor editor={editor} />
					</TabsContent>

					{/*/!* Preview view *!/*/}
					{/*<TabsContent value="preview" className="h-full m-0">*/}
					{/*	<ScrollArea className="h-full">*/}
					{/*		/!*<div className="p-4 prose prose-sm max-w-none">*!/*/}
					{/*		/!*	<ReactMarkdown>{editor.getMarkdown()}</ReactMarkdown>*!/*/}
					{/*		/!*</div>*!/*/}
					{/*	/!*	the preview should be readonly while preserve the original content, including visual representation *!/*/}
					{/*		*/}
					{/*	</ScrollArea>*/}
					{/*</TabsContent>*/}
				</div>
			</Tabs>
		</div>
	)
});

export default NoteTaker
