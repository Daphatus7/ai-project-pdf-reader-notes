import { useState, useRef, useCallback, useEffect } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/frontend/components/ui/resizable.tsx";
import { PanelLeftOpen, PanelRightOpen, Files, MessageSquare, NotebookPen } from "lucide-react";
import {type ImperativePanelHandle } from "react-resizable-panels";
import type { ContentInsertion, NotePadHandler } from "@/frontend/features/types/content-insertion.ts";
import NotePad from "@/frontend/components/note/pad/note-pad.tsx";
import {Header} from "@/frontend/components/header/header.tsx";
import {LLMChatFeature, type LLMChatFeatureHandle} from "@/frontend/features/llm-chat/llm-chat-feature.tsx";
import {ManagementPanel} from "@/frontend/components/source/project-management.tsx";

type MobileTab = 'sources' | 'chat' | 'notes';

// Detect mobile breakpoint (< 768px) for responsive layout switching
const useIsMobile = () => {
	const [isMobile, setIsMobile] = useState(() =>
		typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
	);
	useEffect(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, []);
	return isMobile;
};

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
	const isMobile = useIsMobile();
	// Active tab for mobile layout
	const [activeTab, setActiveTab] = useState<MobileTab>('chat');

	const [isCenterCollapsed, setIsCenterCollapsed] = useState(false);
	const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
	const [selectedProjectId, setSelectedProjectId] = useState<string>('');
	
	const leftPanelRef = useRef<ImperativePanelHandle>(null);
	const centerPanelRef = useRef<ImperativePanelHandle>(null);

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

	const handleContentInsert = useCallback((insertion: ContentInsertion) => {
		// console.log(insertion);
		if (!notePadRef.current) return;
		notePadRef.current.insertContent(insertion, 'cursor');
		notePadRef.current.focus();
	}, []);

	const rightPanelRef = useRef<ImperativePanelHandle>(null);
	const [isRightCollapsed, setIsRightCollapsed] = useState(false);

	const handleRightResize = (size: number) => {
		if (size < SIDEBAR_COLLAPSE_THRESHOLD && !isRightCollapsed) {
			rightPanelRef.current?.collapse();
		}
	};
	
	const handleAskAI = (imageDataUrl: string, name: string, prompt?: string) => {
		// Extract base64 data and mime type from data URL
		const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
		if (!match) return;

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
				text: prompt || 'Please explain this screenshot.',
			},
		]);
		// On mobile, auto-switch to chat tab after injecting screenshot
		if (isMobile) setActiveTab('chat');
	}

	const handleSaveToNote = (_imageDataUrl: string, _name: string) => {}
	const handleDownload = (_imageDataUrl: string, _name: string) => {}

	const chatRef = useRef<LLMChatFeatureHandle>(null);
	const notePadRef = useRef<NotePadHandler>(null);

	// Bottom tab definitions for mobile nav
	const tabs = [
		{ id: 'sources' as MobileTab, label: 'Sources', icon: Files },
		{ id: 'chat' as MobileTab, label: 'Chat', icon: MessageSquare },
		{ id: 'notes' as MobileTab, label: 'Notes', icon: NotebookPen },
	];

	// Shared panel content — defined once, used by both layouts to keep refs valid
	const managementPanel = (
		<ManagementPanel
			onScreenshotCapture={handleAskAI}
			onSaveToNote={handleSaveToNote}
			onDownload={handleDownload}
			onSourceSelectionChange={setSelectedSourceIds}
			onProjectSelectionChange={setSelectedProjectId}
		/>
	);

	const chatPanel = (
		<LLMChatFeature
			ref={chatRef}
			sourceIds={selectedSourceIds}
			projectId={selectedProjectId}
			onSelectContent={(content) => {
				handleContentInsert({
					content,
					sectionType: 'paragraph',
					source: 'markdown-renderer',
				});
				// On mobile, auto-switch to notes tab after inserting content
				if (isMobile) setActiveTab('notes');
			}}
		/>
	);

	const notesPanel = <NotePad ref={notePadRef} />;

	return (
		<div className="h-screen w-screen flex flex-col bg-background">
			<Header />

			{/* ── Mobile Tab Layout (< 768px) ── */}
			{isMobile ? (
				<div className="flex-1 min-h-0 flex flex-col">
					{/* Tab content: use hidden instead of unmounting to keep refs alive */}
					<div className="flex-1 min-h-0 bg-panel">
						<div className={activeTab === 'sources' ? 'h-full' : 'hidden'}>{managementPanel}</div>
						<div className={activeTab === 'chat'    ? 'h-full' : 'hidden'}>{chatPanel}</div>
						<div className={activeTab === 'notes'   ? 'h-full' : 'hidden'}>{notesPanel}</div>
					</div>

					{/* Bottom navigation bar */}
					<nav className="flex border-t bg-background shrink-0">
						{tabs.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								onClick={() => setActiveTab(id)}
								className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
									activeTab === id
										? 'text-primary border-t-2 border-primary -mt-px'
										: 'text-muted-foreground'
								}`}
							>
								<Icon size={20} />
								{label}
							</button>
						))}
					</nav>
				</div>
			) : (
				/* ── Desktop Three-Panel Layout (≥ 768px) ── */
				<ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
					{/* Left Panel - Source / PDF management */}
					<ResizablePanel
						ref={centerPanelRef}
						defaultSize={33}
						collapsible
						onCollapse={() => setIsCenterCollapsed(true)}
						onExpand={() => setIsCenterCollapsed(false)}
						onResize={handleCenterResize}
						className="bg-panel border rounded-xl ml-2 mr-1 mb-2"
					>
						{isCenterCollapsed ? (
							<div onClick={() => centerPanelRef.current?.resize(52)}>
								<div><PanelLeftOpen /></div>
							</div>
						) : (
							managementPanel
						)}
					</ResizablePanel>

					<ResizableHandle withHandle />

					{/* Center Panel - AI Chat */}
					<ResizablePanel
						defaultSize={34}
						minSize={15}
						className="bg-panel border rounded-xl ml-1 mr-1 mb-2"
					>
						{chatPanel}
					</ResizablePanel>

					<ResizableHandle withHandle />

					{/* Right Panel - Notepad */}
					<ResizablePanel
						ref={rightPanelRef}
						collapsible
						defaultSize={33}
						onCollapse={() => setIsRightCollapsed(true)}
						onExpand={() => setIsRightCollapsed(false)}
						onResize={handleRightResize}
						className="bg-panel border rounded-xl ml-1 mr-2 mb-2"
					>
						{isRightCollapsed && (
							<div onClick={() => rightPanelRef.current?.resize(50)}>
								<PanelRightOpen />
							</div>
						)}
						<div className={isRightCollapsed ? "hidden" : "h-full"}>
							{notesPanel}
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			)}
		</div>
	);
}
