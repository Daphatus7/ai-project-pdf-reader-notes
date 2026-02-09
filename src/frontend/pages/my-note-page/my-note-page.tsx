import { useState, useRef, useCallback, useEffect } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/frontend/components/ui/resizable.tsx";
import {PanelLeftOpen, PanelRightOpen} from "lucide-react";
import {type ImperativePanelHandle } from "react-resizable-panels";
import type { ContentInsertion, NotePadHandler } from "@/frontend/features/types/content-insertion.ts";
import NotePad from "@/frontend/components/note/pad/note-pad.tsx";
import {Header} from "@/frontend/components/header/header.tsx";
import {ManagementPanel} from "@/frontend/components/source/management-panel.tsx";
import {LLMChatFeature, type LLMChatFeatureHandle} from "@/frontend/features/llm-chat/llm-chat-feature.tsx";

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
	
	const [isCenterCollapsed, setIsCenterCollapsed] = useState(false);
	const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
	
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
		console.log(insertion);
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
	const notePadRef = useRef<NotePadHandler>(null);

	return (
		<div className="h-screen w-screen flex flex-col bg-background">
			<Header />
			<ResizablePanelGroup direction="horizontal">
				{/* Center Content - PDF Reader and AI Chat */}
				<ResizablePanel
					ref={centerPanelRef}
					defaultSize={33}
					collapsible
					onCollapse={() => setIsCenterCollapsed(true)}
					onExpand={() => setIsCenterCollapsed(false)}
					onResize={handleCenterResize}
				>
					{isCenterCollapsed ? (
						<div
							onClick={() => centerPanelRef.current?.resize(52)}
						>
							<div>
								<PanelLeftOpen />
							</div>
						</div>
					) : (
						<ManagementPanel
							onScreenshotCapture={handleAskAI}
							onSaveToNote={handleSaveToNote}
							onDownload={handleDownload}
							onSourceSelectionChange={setSelectedSourceIds}
						/>
					)}
				</ResizablePanel>
				
				<ResizableHandle  withHandle/>

				<ResizablePanel
					defaultSize={34}
					minSize={15}
				>
					<LLMChatFeature
						ref={chatRef}
						sourceIds={selectedSourceIds}
						onSelectContent={(content) => {
							handleContentInsert({
								content,
								sectionType: 'paragraph',
								source: 'markdown-renderer',
							});
						}}
					/>
				</ResizablePanel>

				<ResizableHandle  withHandle/>
				
				<ResizablePanel
					ref={rightPanelRef}
					collapsible
					defaultSize={33}
					onCollapse={() => setIsRightCollapsed(true)}
					onExpand={() => setIsRightCollapsed(false)}
					onResize={handleRightResize}
				>
					{isRightCollapsed && (
						<div
							onClick={() => rightPanelRef.current?.resize(50)}
						>
							<PanelRightOpen/>
						</div>
					)}
					<div className={isRightCollapsed ? "hidden" : "h-full"}>
						<NotePad ref={notePadRef} />
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
