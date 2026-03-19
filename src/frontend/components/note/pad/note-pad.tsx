import { forwardRef, useImperativeHandle, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs.tsx'
import { NoteMarkdownRenderer } from './renderer/note-markdown-renderer'
import { NoteRenderer } from './renderer/note-renderer'
import { NoteSidebar } from './note-sidebar'
import type { NotePadHandler } from '@/frontend/features/types/content-insertion.ts'
import { useNotePad, type ViewMode } from './useNotePad'
import { useQuota } from '@/frontend/features/quota/use-quota'
import { Save, Sidebar, Loader2 } from 'lucide-react'
import { Button } from '@/frontend/components/ui/button.tsx'
import { Skeleton } from '@/frontend/components/ui/skeleton.tsx'
import { useLanguage } from '@/frontend/i18n/language-context'

export const NotePad = forwardRef<NotePadHandler>(
	function NotePad(_, ref) {
		const pad = useNotePad()
		const quota = useQuota()
		const { t } = useLanguage()
		const [showSidebar, setShowSidebar] = useState(false)

useImperativeHandle(ref, () => ({
			insertContent: pad.insertContent,
			focus: pad.focus,
			getContent: pad.getContent,
		}), [pad.activeView])

		if (pad.isLoading) {
			return (
				<div className="flex flex-col h-full p-4 gap-3">
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-48" />
						<div className="flex-1" />
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
					</div>
					<Skeleton className="flex-1 w-full" />
				</div>
			)
		}

		return (
			<div className="flex flex-row h-full">
				<div className="flex flex-col flex-1 min-w-0">
					<Tabs
						value={pad.activeView}
						onValueChange={v => pad.setActiveView(v as ViewMode)}
						className="h-full flex flex-col"
					>
						<div className="p-3 flex items-center border-b h-13 justify-between">
							<div className="flex items-center gap-2">
								<TabsList>
									<TabsTrigger value="markdown">{t.notes.tabMarkdown}</TabsTrigger>
									<TabsTrigger value="editor">{t.notes.tabEditor}</TabsTrigger>
								</TabsList>
							</div>
							<div className="flex items-center gap-1">
								<Button variant="ghost" size="icon" onClick={pad.saveCurrentNote} disabled={pad.isSaving}>
									{pad.isSaving
										? <Loader2 className="h-4 w-4 animate-spin" />
										: <Save className="h-4 w-4" />
									}
								</Button>
								<Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
									<Sidebar className="h-4 w-4" />
								</Button>
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
									noteId={pad.selectedNoteId}
									onChange={pad.handleContentChange}
								/>
							</TabsContent>
						</div>
					</Tabs>
				</div>

				{showSidebar && (
					<NoteSidebar
						notes={pad.notes}
						notebooks={pad.notebooks}
						selectedNoteId={pad.selectedNoteId}
						canCreateNote={quota.canCreate('notes')}
						onSelectNote={pad.selectNote}
						onAddNote={pad.addNote}
						onDeleteNote={pad.deleteNote}
						onRenameNote={pad.renameNote}
						onExportMarkdown={pad.exportNoteAsMarkdown}
						onExportPdf={pad.exportNoteAsPdf}
						onAddNotebook={pad.addNotebook}
						onRenameNotebook={pad.renameNotebook}
						onDeleteNotebook={pad.deleteNotebook}
						onMoveNoteToNotebook={pad.moveNoteToNotebook}
						onClose={() => setShowSidebar(false)}
					/>
				)}
			</div>
		)
	},
)

export default NotePad
