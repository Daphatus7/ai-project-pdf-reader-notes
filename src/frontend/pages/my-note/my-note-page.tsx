import { useState, useRef, useCallback, useEffect } from "react";
import {NoteSidebar} from "@/frontend/components/note-sidebar/note-sidebar.tsx";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/frontend/components/ui/resizable.tsx";
import {PanelLeftOpen, Menu, PanelRightOpen} from "lucide-react";
import {type ImperativePanelHandle } from "react-resizable-panels";
import type { ContentInsertion, NoteTakerHandle } from "@/frontend/features/types/content-insertion.ts";
import { Button } from "@/frontend/components/ui/button.tsx";
import NoteTaker from "@/frontend/components/note/note-taker.tsx";
import {useNotesStore} from "@/frontend/context/store.tsx";
import {Header} from "@/frontend/components/header/header.tsx";
import {PdfReader} from "@/frontend/components/reader/pdf-reader.tsx";
import {LLMChatFeature, type LLMChatFeatureHandle} from "@/frontend/features/llm-chat/llm-chat-feature.tsx";
import type {Note} from "@/frontend/components/note/type.ts";
import * as crypto from "node:crypto";



/**
 * NotePage component - Main note-taking interface.
 *
 * Coordinates the entire application including:
 * - Note management (sidebar)
 * - PDF reading (center left)
 * - LLM chat with click-to-insert functionality (center right)
 * - Note editing with TipTap editor (right sidebar)
 *
 * Handles content insertion flow:
 * MarkdownRenderer (click) → LLMChat → NotePage → NoteTaker (insert)
 */
export default function NotePage() {
	
	const initialNotes: Note[] = useNotesStore.getState().notes;
	
	const [notes, setNotes] = useState<Note[]>(initialNotes);
	const [selectedNoteId, setSelectedNoteId] = useState<string>("1");
	// const [screenshots, setScreenshots] = useState<ImageContextItem[]>([]);
	// const [pendingImageAnalysis, setPendingImageAnalysis] = useState<ImageContextItem>();

	const [isCenterCollapsed, setIsCenterCollapsed] = useState(false);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const selectedNote = notes.find(note => note.id === selectedNoteId) || notes[0];

	// const handleScreenshotCapture = (imageDataUrl: string, name: string) => {
	// 	const newScreenshot: ImageContextItem = {
	// 		id: crypto.randomUUID(),
	// 		type: "image",
	// 		name: name,
	// 		userPrompt: "Explain the image",
	// 		imageUrls:[imageDataUrl]
	// 	};
	//
	// 	// Make the screenshot available as context immediately
	// 	setScreenshots(prev => [...prev, newScreenshot]);
	// 	// Trigger one-shot auto analysis inside LLMChat (which owns chat history UI)
	// 	setPendingImageAnalysis(newScreenshot);
	// }

	const handleAddNewNote = () => {
		const newNote: Note = {
			created_at: "", 
			metadata: {}, 
			user_id: "", 
			version: 0,
			id: crypto.randomUUID(),
			title: "New Note",
			summary: "",
			updated_at: "Just now",
			content_markdown: ""
		};
		setNotes(prevNotes => [newNote, ...prevNotes]);
		setSelectedNoteId(newNote.id);
	}


	const leftPanelRef = useRef<ImperativePanelHandle>(null);
	const centerPanelRef = useRef<ImperativePanelHandle>(null);
	const noteTakerRef = useRef<NoteTakerHandle | null>(null);

	useEffect(() => {
		leftPanelRef.current?.collapse();
	}, []);

	// Collapse thresholds (based on UI/UX standards like Overleaf)
	const SIDEBAR_COLLAPSE_THRESHOLD = 12; // 12% for sidebars

	const handleCenterResize = (size: number) => {
		if (size < SIDEBAR_COLLAPSE_THRESHOLD && !isCenterCollapsed) {
			centerPanelRef.current?.collapse();
		}
	};

	/**
	 * Handles content insertion from LLMChat into NoteTaker.
	 *
	 * Called when user clicks on a section in MarkdownRenderer.
	 * Inserts the formatted markdown content into the note editor.
	 *
	 * @param insertion - Content insertion payload with formatted markdown
	 */
	const handleContentInsert = useCallback((insertion: ContentInsertion) => {
		if (!noteTakerRef.current) {
			console.warn('[NotePage] NoteTaker ref not available, cannot insert content');
			return;
		}

		// Insert content at cursor position
		noteTakerRef.current.insertContent(insertion, 'cursor');

		// Focus the editor after insertion
		noteTakerRef.current.focus();
	}, []);

	const rightPanelRef = useRef<ImperativePanelHandle>(null);
	const [isRightCollapsed, setIsRightCollapsed] = useState(false);

	const handleRightResize = (size: number) => {
		if (size < SIDEBAR_COLLAPSE_THRESHOLD && !isRightCollapsed) {
			rightPanelRef.current?.collapse();
		}
	};

	const handleSaveNote = () => {
		if (noteTakerRef.current && selectedNote) {
			const updatedContent = noteTakerRef.current.getContent();
			setNotes(prevNotes =>
				prevNotes.map(note =>
					note.id === selectedNote.id ? { ...note, content: updatedContent } : note
				)
			);
		}
	}
	
	const handleAskAI = (imageDataUrl: string, name: string) => {
		// Extract base64 data and mime type from data URL
		const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
		if (!match) {
			console.error('[NotePage] Invalid image data URL format');
			return;
		}

		const mimeType = match[1] as 'image/png' | 'image/jpeg' | 'image/webp';
		const base64Data = match[2];

		chatRef.current?.injectMessage([
			{
				type: 'image',
				data: base64Data,
				mime_type: mimeType,
				name: name,
			},
			{
				type: 'text',
				text: 'Please explain this screenshot.',
			},
		]);
		console.log('[NotePage] Ask AI:', name, imageDataUrl.slice(0, 50) + '...');
	}

	const handleSaveToNote = (imageDataUrl: string, name: string) => {
		console.log('[NotePage] Save to Note:', name);
	}

	const handleDownload = (imageDataUrl: string, name: string) => {
		console.log('[NotePage] Download:', name);
	}

	const chatRef = useRef<LLMChatFeatureHandle>(null);

	return (
		<div className="h-screen w-screen flex flex-col bg-background">
			<Header />
			
			{/* Floating Sidebar */}
			{isSidebarOpen ? (
				<div className="fixed top-0 left-0 h-20 bg-background shadow-2xl z-50">
					{/* Toggle button attached to sidebar */}
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-4 -right-10 shadow-md bg-background"
						onClick={() => setIsSidebarOpen(false)}
					>
						<Menu className="w-5 h-5" />
					</Button>

					<NoteSidebar
						notes={notes}
						setNotes={setNotes}
						selectedNoteId={selectedNoteId}
						onAddNote={handleAddNewNote}
						onSelectNote={(id) => {
							//Save previous note before switching
							handleSaveNote();
							setSelectedNoteId(id);
						}}
					/>
				</div>
			) : (
				<Button
					variant="ghost"
					size="icon"
					className="fixed top-16 left-4 z-40 shadow-md"
					onClick={() => setIsSidebarOpen(true)}
				>
					<Menu className="w-5 h-5" />
				</Button>
			)}


			<ResizablePanelGroup direction="horizontal">
				{/* Left Sidebar - Note Management */}

				{/* Center Content - PDF Reader and AI Chat */}
				<ResizablePanel
					ref={centerPanelRef}
					defaultSize={33}
					minSize={10}
					collapsible
					collapsedSize={2}
					onCollapse={() => setIsCenterCollapsed(true)}
					onExpand={() => setIsCenterCollapsed(false)}
					onResize={handleCenterResize}
				>
					{isCenterCollapsed ? (
						<div
							className="h-full w-full group border-r bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
							onClick={() => centerPanelRef.current?.resize(52)}
						>
							<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200">
								<PanelLeftOpen className="w-4 h-4 text-muted-foreground rotate-180" />
							</div>
						</div>
					) : (
						<ResizablePanelGroup direction="vertical">
							<PdfReader
								onScreenshotCapture={handleAskAI}
								onSaveToNote={handleSaveToNote}
								onDownload={handleDownload}
							/>
						</ResizablePanelGroup>
					)}
				</ResizablePanel>
				
				<ResizableHandle  />

				<ResizablePanel
					defaultSize={34}
					minSize={15}
				>
					<LLMChatFeature
						ref={chatRef}
						onSelectContent={(content) => {
							console.log('[NotePage] Content selected:', content);
							handleContentInsert({
								content,
								sectionType: 'paragraph',
								source: 'markdown-renderer',
							});
						}}
					/>
				</ResizablePanel>

				<ResizableHandle  />

				{/* Right Sidebar - Markdown Editor */}

				<ResizablePanel
					ref={rightPanelRef}
					collapsible
					defaultSize={33}
					onCollapse={() => setIsRightCollapsed(true)}
					onExpand={() => setIsRightCollapsed(false)}
					onResize={handleRightResize}
				>
					<div className="h-full w-full relative">
						{isRightCollapsed && (
							<div
								className="absolute inset-0 z-10 group border-l bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
								onClick={() => rightPanelRef.current?.resize(50)}
							>
								<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200">
									<PanelRightOpen className="w-4 h-4 text-muted-foreground" />
								</div>
							</div>
						)}
						<div className={isRightCollapsed ? "hidden" : "h-full"}>
							<NoteTaker

								note={selectedNote}
								ref={noteTakerRef} />
						</div>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
