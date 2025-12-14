import React, { useRef, useState } from "react";
import { ResizablePanel } from "@@/frontend/web/components/ui/resizable.tsx";
import { type ImperativePanelHandle } from "react-resizable-panels";
import { PanelRightOpen } from "lucide-react";
import NoteTaker from "./note-taker.tsx";
import type { Note } from "../../App.tsx";
import type { NoteTakerHandle } from "../types/content-insertion.ts";

interface NoteSectionProps {
	defaultSize?: number;
	minSize?: number;
	maxSize?: number;
	collapsedSize?: number;
	note: Note;
	/**
	 * Ref to the NoteTaker component for imperative operations.
	 */
	noteTakerRef?: React.RefObject<NoteTakerHandle | null>;
}

const SIDEBAR_COLLAPSE_THRESHOLD = 12;

/**
 * Note Section component.
 * 
 * Wraps NoteTaker in a resizable panel and forwards refs for imperative operations.
 * 
 * @param defaultSize - Default panel size percentage
 * @param minSize - Minimum panel size percentage
 * @param maxSize - Maximum panel size percentage
 * @param collapsedSize - Size when collapsed
 * @param note - Current note being edited
 * @param noteTakerRef - Ref to NoteTaker for imperative operations
 */
export function NoteSection({
	defaultSize = 30,
	minSize = 5,
	maxSize = 98,
	collapsedSize = 2,
	note,
	noteTakerRef,
}: NoteSectionProps) {
	const rightPanelRef = useRef<ImperativePanelHandle>(null);
	const [isRightCollapsed, setIsRightCollapsed] = useState(false);
	
	console.log("trying to ")
	console.log(noteTakerRef)
	
	const handleRightResize = (size: number) => {
		if (size < SIDEBAR_COLLAPSE_THRESHOLD && !isRightCollapsed) {
			rightPanelRef.current?.collapse();
		}
	};

	return (
		<ResizablePanel
			ref={rightPanelRef}
			defaultSize={defaultSize}
			minSize={minSize}
			maxSize={maxSize}
			collapsible
			collapsedSize={collapsedSize}
			onCollapse={() => setIsRightCollapsed(true)}
			onExpand={() => setIsRightCollapsed(false)}
			onResize={handleRightResize}
		>
			<div className="h-full w-full relative">
				{isRightCollapsed && (
					<div
						className="absolute inset-0 z-10 group border-l bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
						onClick={() => rightPanelRef.current?.resize(defaultSize)}
					>
						<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200">
							<PanelRightOpen className="w-4 h-4 text-muted-foreground" />
						</div>
					</div>
				)}
				<div className={isRightCollapsed ? "hidden" : "h-full"}>
					<NoteTaker note={note} ref={noteTakerRef} />
				</div>
			</div>
		</ResizablePanel>
	);
}

