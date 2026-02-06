import { forwardRef, useImperativeHandle } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs.tsx'
import { NoteMarkdownRenderer } from './renderer/note-markdown-renderer'
import { NoteRenderer } from './renderer/note-renderer'
import { NoteButton } from './sidebar/note-button.tsx'
import { NoteSidebar } from './sidebar/note-sidebar.tsx'
import type { NotePadHandler } from '@/frontend/features/types/content-insertion.ts'
import { useNotePad, type ViewMode } from './useNotePad'

export const NotePad = forwardRef<NotePadHandler>(
	function NotePad(_, ref) {
		const pad = useNotePad()

		useImperativeHandle(ref, () => ({
			insertContent: pad.insertContent,
			focus: pad.focus,
			getContent: pad.getContent,
		}), [pad.activeView])

		return (
			<div className="h-full flex flex-col bg-background">
				<Tabs
					value={pad.activeView}
					onValueChange={v => pad.setActiveView(v as ViewMode)}
					className="h-full flex flex-col"
				>
					<div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
						<TabsList>
							<TabsTrigger value="markdown">Markdown</TabsTrigger>
							<TabsTrigger value="editor">Editor</TabsTrigger>
						</TabsList>
						<NoteButton>
							<NoteSidebar
								notes={pad.notes}
								setNotes={pad.setNotes}
								selectedNoteId={pad.selectedNoteId}
								onSelectNote={pad.selectNote}
								onAddNote={pad.addNote}
								onDeleteNote={pad.deleteNote}
								onEditNoteName={pad.renameNote}
							/>
						</NoteButton>
					</div>

					<div className="flex-1 overflow-hidden relative text-base">
						<TabsContent value="markdown" className="h-full m-0 p-0 flex flex-col">
							<NoteMarkdownRenderer
								value={pad.documentContent}
								onChange={pad.handleContentChange}
							/>
						</TabsContent>

						<TabsContent value="editor" className="h-full m-0">
							<NoteRenderer
								ref={pad.rendererRef}
								value={pad.documentContent}
								onChange={pad.handleContentChange}
							/>
						</TabsContent>
					</div>
				</Tabs>
			</div>
		)
	},
)

export default NotePad
