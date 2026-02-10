import { forwardRef, useImperativeHandle } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs.tsx'
import { NoteMarkdownRenderer } from './renderer/note-markdown-renderer'
import { NoteRenderer } from './renderer/note-renderer'
import { NoteButton } from './sidebar/note-button.tsx'
import { NoteSidebar } from './sidebar/note-sidebar.tsx'
import type { NotePadHandler } from '@/frontend/features/types/content-insertion.ts'
import { useNotePad, type ViewMode } from './useNotePad'
import {FolderOpen, Save} from 'lucide-react'
import { Button } from '@/frontend/components/ui/button.tsx'

export const NotePad = forwardRef<NotePadHandler>(
	function NotePad(_, ref) {
		const pad = useNotePad()

		useImperativeHandle(ref, () => ({
			insertContent: pad.insertContent,
			focus: pad.focus,
			getContent: pad.getContent,
		}), [pad.activeView])

		return (
			<div className="h-full flex flex-col">
				<Tabs
					value={pad.activeView}
					onValueChange={v => pad.setActiveView(v as ViewMode)}
					className="h-full flex flex-col"
				>
					<div className="p-3 flex items-center gap-2 border-b h-12 justify-between">
						<TabsList>
							<TabsTrigger value="markdown">Markdown</TabsTrigger>
							<TabsTrigger value="editor">Editor</TabsTrigger>
						</TabsList>
						<div className="flex">
							<Button variant="ghost" size="icon" onClick={pad.saveCurrentNote}>
								<Save className="h-4 w-4" />
							</Button>

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
