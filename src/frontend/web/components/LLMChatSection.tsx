import { useRef, useState } from "react";
import { ResizablePanel } from "@@/frontend/web/components/ui/resizable.tsx";
import { type ImperativePanelHandle } from "react-resizable-panels";
import { ChevronUp } from "lucide-react";
import { LLMChat } from "./LLMChat.tsx";
import type { Note } from "../../App.tsx";
import type { ContentInsertion } from "../types/content-insertion.ts";

export interface ExternalContextItem {
	id: string;
	type: "image" | "text";
	content: string;
	name: string;
	preview?: string;
}

interface LLMChatSectionProps {
	defaultSize?: number;
	minSize?: number;
	collapsedSize?: number;
	note: Note;
	externalContextItems?: ExternalContextItem[];
	pendingImageAnalysis?: {
		id: string;
		imageDataUrl: string;
		name: string;
	} | null;
	onPendingImageAnalysisHandled?: (id: string) => void;
	/**
	 * Callback when content should be inserted into the note editor.
	 * 
	 * @param insertion - Content insertion payload with formatted markdown
	 */
	onContentInsert?: (insertion: ContentInsertion) => void;
}

const VERTICAL_COLLAPSE_THRESHOLD = 18;

/**
 * LLM Chat Section component.
 * 
 * Wraps LLMChat in a resizable panel and passes through content insertion callbacks.
 * 
 * @param defaultSize - Default panel size percentage
 * @param minSize - Minimum panel size percentage
 * @param collapsedSize - Size when collapsed
 * @param note - Current note being edited
 * @param externalContextItems - External context items (e.g., screenshots)
 * @param onContentInsert - Callback when content should be inserted into notes
 */
export function LLMChatSection({
	defaultSize = 50,
	minSize = 15,
	collapsedSize = 1,
	note,
	externalContextItems = [],
	pendingImageAnalysis = null,
	onPendingImageAnalysisHandled,
	onContentInsert,
}: LLMChatSectionProps) {
	const editorPanelRef = useRef<ImperativePanelHandle>(null);
	const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);

	const handleEditorResize = (size: number) => {
		if (size < VERTICAL_COLLAPSE_THRESHOLD && !isEditorCollapsed) {
			editorPanelRef.current?.collapse();
		}
	};

	return (
		<ResizablePanel
			ref={editorPanelRef}
			defaultSize={defaultSize}
			minSize={minSize}
			collapsible
			collapsedSize={collapsedSize}
			onCollapse={() => setIsEditorCollapsed(true)}
			onExpand={() => setIsEditorCollapsed(false)}
			onResize={handleEditorResize}
		>
			<div className="h-full w-full relative min-h-0">
				{isEditorCollapsed && (
					<div
						className="absolute inset-0 z-10 group border-t bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
						onClick={() => editorPanelRef.current?.resize(defaultSize)}
					>
						<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5">
							<ChevronUp className="w-4 h-4 text-muted-foreground" />
							<span className="text-xs text-muted-foreground">AI Chat</span>
						</div>
					</div>
				)}
				<div className={isEditorCollapsed ? "hidden" : "h-full min-h-0"}>
					<LLMChat 
						note={note} 
						externalContextItems={externalContextItems}
						pendingImageAnalysis={pendingImageAnalysis}
						onPendingImageAnalysisHandled={onPendingImageAnalysisHandled}
						onContentInsert={onContentInsert}
					/>
				</div>
			</div>
		</ResizablePanel>
	);
}
