import { useState, useRef, useCallback, useEffect } from "react";
import { Header } from "@@/frontend/components/Header.tsx";
import { NoteSidebar } from "@@/frontend/components/NoteSidebar/NoteSidebar.tsx";
import { PDFSection } from "@@/frontend/components/PDFSection.tsx";
import {type ImageContextItem, LLMChat} from "@@/frontend/components/Chat/LLMChat.tsx";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@@/frontend/components/ui/resizable.tsx";
import {PanelLeftOpen, Menu, PanelRightOpen} from "lucide-react";
import {type ImperativePanelHandle } from "react-resizable-panels";
import type { ContentInsertion, NoteTakerHandle } from "@@/frontend/features/types/content-insertion.ts";
import { Button } from "@@/frontend/components/ui/button.tsx";
import NoteTaker from "@@/frontend/components/note-taker.tsx";
import {useNotesStore} from "@@/frontend/store.tsx";

export interface Note {
	id: string;
	title: string;
	preview: string;
	updatedAt: string;
	content: string;
}

export interface imageContext {
	id: string;
	name: string;
	imageUrl: string;
	userMessage: string
}



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
	const [screenshots, setScreenshots] = useState<ImageContextItem[]>([]);
	const [pendingImageAnalysis, setPendingImageAnalysis] = useState<ImageContextItem>();

	const [isCenterCollapsed, setIsCenterCollapsed] = useState(false);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const selectedNote = notes.find(note => note.id === selectedNoteId) || notes[0];

	const handleScreenshotCapture = (imageDataUrl: string, name: string) => {
		const newScreenshot: ImageContextItem = {
			id: Date.now().toString() + Math.random(),
			type: "image",
			name: name,
			userPrompt: "Explain the image",
			imageUrls:[imageDataUrl]
		};

		// Make the screenshot available as context immediately
		setScreenshots(prev => [...prev, newScreenshot]);
		// Trigger one-shot auto analysis inside LLMChat (which owns chat history UI)
		setPendingImageAnalysis(newScreenshot);
	}

	const handleAddNewNote = () => {
		const newNote: Note = {
			id: Date.now().toString(),
			title: "New Note",
			preview: "",
			updatedAt: "Just now",
			content: "",
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
							<PDFSection onScreenshotCapture={handleScreenshotCapture} />
						</ResizablePanelGroup>
					)}
				</ResizablePanel>
				<ResizableHandle withHandle />

				<LLMChat
					note={selectedNote}
					externalContextItems={screenshots}
					imageContextItem={pendingImageAnalysis}
					onContentInsert={handleContentInsert}
				/>
				
				<ResizableHandle withHandle />

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
