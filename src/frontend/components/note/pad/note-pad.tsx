import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs.tsx'
import { NoteMarkdownRenderer } from './renderer/note-markdown-renderer'
import { NoteRenderer, type NoteRendererHandle } from './renderer/note-renderer'
import type { NotePadHandler } from '@/frontend/features/types/content-insertion.ts'
import type { Note } from '@/frontend/api/types/note.ts'

type ViewMode = 'markdown' | 'editor'

interface NotePadProps {
	note?: Note
}

export const NotePad = forwardRef<NotePadHandler, NotePadProps>(
	function NotePad({ note }, ref) {
		const [markdownContent, setMarkdownContent] = useState('')
		const [activeView, setActiveView] = useState<ViewMode>('editor')
		const rendererRef = useRef<NoteRendererHandle>(null)

		useEffect(() => {
			if (note) {
				setMarkdownContent(note.content_markdown)
			}
		}, [note])

		useImperativeHandle(ref, () => ({
			insertContent: (content, position = 'cursor') => {
				if (activeView === 'editor') {
					rendererRef.current?.insertContent(content, position)
				} else {
					// In markdown view, append content as raw markdown
					setMarkdownContent(prev => prev + '\n' + content.content)
				}
			},
			focus: () => {
				rendererRef.current?.focus()
			},
			getEditor: () => null,
			getContent: () => markdownContent,
		}), [activeView, markdownContent])

		return (
			<div className="h-full flex flex-col bg-background">
				<Tabs
					value={activeView}
					onValueChange={v => setActiveView(v as ViewMode)}
					className="h-full flex flex-col"
				>
					<div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
						<TabsList>
							<TabsTrigger value="markdown">Markdown</TabsTrigger>
							<TabsTrigger value="editor">Editor</TabsTrigger>
						</TabsList>
					</div>

					<div className="flex-1 overflow-hidden relative text-base">
						<TabsContent value="markdown" className="h-full m-0 p-0 flex flex-col">
							<NoteMarkdownRenderer
								value={markdownContent}
								onChange={setMarkdownContent}
							/>
						</TabsContent>

						<TabsContent value="editor" className="h-full m-0">
							<NoteRenderer
								ref={rendererRef}
								value={markdownContent}
								onChange={setMarkdownContent}
							/>
						</TabsContent>
					</div>
				</Tabs>
			</div>
		)
	},
)

export default NotePad
